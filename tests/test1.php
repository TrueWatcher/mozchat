<?php
$pathBias="../";
require_once($pathBias."scripts/AssocArrayWrapper.php");
require_once($pathBias."scripts/MyExceptions.php");
require_once($pathBias."scripts/registries.php");
require_once($pathBias."scripts/Inventory.php");
require_once($pathBias."scripts/AssetsVersionMonitor.php");
$input=["user"=>"Test1","realm"=>"test0"];//$_REQUEST;
$mimeDictionary=[];
$cssLink="blue.css";
$targetPath=$pathBias.$input["realm"]."/";
$iniParams=IniParams::read($targetPath);
$pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsClient() );
//$pr->overrideValuesBy($pageEntryParams["PageRegistry"]);
$pr->overrideValuesBy($iniParams["common"]);
$pr->overrideValuesBy($iniParams["client"]);
$wsParams=parse_ini_file($pathBias."wshub/ws.ini", true, INI_SCANNER_RAW);
//var_dump($wsParams);
$pr->addFreshPairsFrom($wsParams["common"]);
$wsOn=$pr->g("wsOn");

$serverParams=[
  "state"=>"operational", "user"=>$input["user"], "realm"=>$input["realm"]
];
$serverParams=$pr->exportByList( [
  "maxBlobBytes", "maxMediaFolderBytes", "clipLifetimeSec", "title", "allowVideo", "videoOn", "maxClipSizeSec", "maxClipCount", "allowStream", "onRecorded", "pollFactor", "playNew", "skipMine", "mediaFolder", "pathBias", "longPollPeriodS", "userStatusFadeS", "wsOn", "wsServerUri"
] , $serverParams);
$serverParams["mediaFolder"]=Inventory::checkMediaFolderName($serverParams["mediaFolder"]);
$mimeDictionary=MimeDecoder::getDictionary();

function version($fn,$pathBias) {
  if ( ! class_exists("AssetsVersionMonitor")) return $fn;
  else return AssetsVersionMonitor::addVersion($fn,$pathBias);
}

$disableTail=1;
include($pathBias."scripts/templates/client.php");
?>
<script src="testUtils.js"></script>
<script>
function Shadow() {
  var serverParams={
    user:"Shadow", realm:"test0", pathBias:"../", playNew:1, skipMine:1, longPollPeriodS:5
  };
  var userParams=serverParams;
  var response={},changesMap={};
  var catalogBytes=0, catalogTime=0, usersListTime=0, myUsersList="", catCrc="1234";
  
  var ajaxerP=new mc.utils.Ajaxer(serverParams.pathBias+"download.php", takeResponseSh, {});
  var inventory=new mc.pb.Inventory();
  
  function takeResponseSh(resp) {
    if (resp.catalogBytes) catalogBytes=resp.catalogBytes;
    if (resp.timestamp) catalogTime=resp.timestamp;
    if (resp.catCrc) catCrc=resp.catCrc;
    if (resp.users) { 
      usersListTime=resp.timestamp;
      myUsersList=resp.users;
    }
    if (resp.list) { changesMap=inventory.consumeNewCatalog(resp.list, userParams); }     
    if (resp.alert) { resp.alert+=" fulfiled in "+resp.lag+"ms"; }
    response=resp;
  }
  
  this.getResponce=function() { return response; };
  this.getChangesMap=function() { return changesMap; };
  this.getUser=function() { return userParams.user; };
  
  function addUpdatedMarks(qs) {
    qs+="&catSince="+catalogTime+"&catBytes="+catalogBytes+"&usersSince="+usersListTime;
    if (catCrc !== false) qs+="&catCrc="+catCrc;
    return qs;
  }
  
  this.sendPoll=function(moreParams) {
    var qs="";
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=poll";
    qs=addUpdatedMarks(qs);
    qs+="&pollFactor="+userParams.pollFactor;
    if (moreParams) qs+="&"+moreParams;
    console.log("Shadow's request : "+qs);
    ajaxerP.getRequest(qs);   
  };
  
  this.sendLongPoll=function(moreParams) {
    var qs="";
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=longPoll";
    qs=addUpdatedMarks(qs);
    qs+="&myUsersList="+encodeURIComponent(myUsersList);
    if (moreParams) qs+="&"+moreParams;
    console.log("Shadow's request : "+qs);
    ajaxerP.getRequest(qs); 
  };
  
  this.linkIsBusy=function() { return ajaxerP.isBusy(); };

}

var playerBox=mc.tm.getPB().getDebugApi(), 
    sp=mc.serverParams;
var shadow=new Shadow(), 
    shUser=shadow.getUser();

var ok,err,blobKb,clip1,clip2,clip3,free,i,toSend,storedTime1, storedTime2, elapsed;
var tr,me,descr,descr2;
var shResp, shChangesMap;
var ul,delBtn,dels,id;

print(">page");
var testScript1=<?php print file_get_contents("test1.js"); ?>;
var testScript2=<?php print file_get_contents("test2.js"); ?>;
var testScript=testScript1.concat(testScript2);
var ci=new CommandIterator(testScript);
commandsRun(ci);

</script>

</body>
</html>