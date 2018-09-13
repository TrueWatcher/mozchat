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

$serverParams=[
  "state"=>"operational", "user"=>$input["user"], "realm"=>$input["realm"]
];
$serverParams=$pr->exportByList( [
  "maxBlobBytes", "maxMediaFolderBytes", "clipLifetimeSec", "title", "allowVideo", "videoOn", "maxClipSizeSec", "allowStream", "onRecorded", "pollFactor", "playNew", "skipMine", "mediaFolder", "pathBias", "longPollPeriodS", "userStatusFadeS"
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
  var catalogBytes=0, catalogTime=0, usersListTime=0, myUsersList="";
  
  var ajaxerP=new mc.utils.Ajaxer(serverParams.pathBias+"download.php", takeResponseSh, {});
  var inventory=new mc.pb.Inventory();
  
  function takeResponseSh(resp) {
    if(resp.catalogBytes) catalogBytes=resp.catalogBytes;
    if(resp.timestamp) catalogTime=resp.timestamp;
    if (resp.users) { 
      usersListTime=resp.timestamp;
      myUsersList=resp.users;
    }
    if(resp.list) { changesMap=inventory.consumeNewCatalog(resp.list, userParams); }     
    if(resp.alert) { resp.alert+=" fulfiled in "+resp.lag+"ms"; }
    response=resp;
  }
  
  this.getResponce=function() { return response; };
  this.getChangesMap=function() { return changesMap; };
  this.getUser=function() { return userParams.user; };
  
  this.sendPoll=function(moreParams) {
    var qs="";
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=poll&catSince="+catalogTime+"&catBytes="+catalogBytes+"&usersSince="+usersListTime;
    //qs+="&pollFactor="+userParams.pollFactor;
    if (!!moreParams) qs+="&"+moreParams;
    console.log("Shadow's request : "+qs);
    ajaxerP.getRequest(qs);    
  };
  
  this.sendLongPoll=function() {
    var qs="";
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=longPoll&catSince="+catalogTime+"&catBytes="+catalogBytes+"&usersSince="+usersListTime;
    qs+="&myUsersList="+encodeURIComponent(myUsersList);
    var longPollFactor=serverParams.longPollPeriodS+1;
    //qs+="&pollFactor="+longPollFactor;
    console.log("Shadow's request : "+qs);
    ajaxerP.getRequest(qs);     
  };
  
  this.linkIsBusy=function() { return ajaxerP.isBusy(); };

}

var recorderBox=mc.tm.getRB(), playerBox=mc.tm.getPB(), sp=mc.serverParams;
var shadow=new Shadow();

var ok,err,blobKb,clip1,clip2,clip3,free,i,toSend,storedTime1, storedTime2, elapsed;
var tr,me,descr,descr2;
var shResp, shUser=shadow.getUser(), shChangesMap;
var ul,delBtn;

print(">page");
var testScript1=<?php print file_get_contents("test1.js"); ?>;
var testScript2=<?php print file_get_contents("test2.js"); ?>;
var testScript=testScript1.concat(testScript2);
var ci=new CommandIterator(testScript);
commandsRun(ci);

</script>

</body>
</html>