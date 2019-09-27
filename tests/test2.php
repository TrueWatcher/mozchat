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
if ($wsOn) checkWsCommandLink($pr->g("wsCommandUri"));

$serverParams=[
  "state"=>"operational", "user"=>$input["user"], "realm"=>$input["realm"]
];
$serverParams=$pr->exportByList( [
  "serverPath", "serverName", "maxBlobBytes", "maxMediaFolderBytes", "clipLifetimeSec", "title", "allowVideo", "videoOn", "maxClipSizeSec", "maxClipCount", "allowStream", "onRecorded", "pollFactor", "playNew", "skipMine", "showMore", "mediaFolder", "pathBias", "longPollPeriodS", "userStatusFadeS", "wsOn", "wsServerUri"
] , $serverParams);
$serverParams["mediaFolder"]=Inventory::checkMediaFolderName($serverParams["mediaFolder"]);
$mimeDictionary=MimeDecoder::getDictionary();

function version($fn,$pathBias) {
  if ( ! class_exists("AssetsVersionMonitor")) return $fn;
  else return AssetsVersionMonitor::addVersion($fn,$pathBias);
}

function checkWsCommandLink($uri) {
  $q=$uri."/?act=echo";
  $ctx=stream_context_create(['http'=>['method'=>'get','header'=>'Content-type: text/plain']]);
  $reply=@file_get_contents($q,false,$ctx);
  if ( ! is_string($reply)) exit("Error! System is misconfigured, required websockets server does not respond");
}

$disableTail=1;
include($pathBias."scripts/templateClient.php");
?>
<script src="testUtils.js"></script>
<script>
"use strict";
function Shadow() {
  var serverParams={
    user:"Shadow", realm:"test0", serverPath:"", pathBias:"../", playNew:1, skipMine:1, longPollPeriodS:5, pollFactor: "off", wsOn: 1, wsServerUri: "<?php print($serverParams['wsServerUri']); ?>"
  };
  var userParams=serverParams; userParams.pb=serverParams;
  var response={},changesMap={};
  var catalogBytes=0, catalogTime=0, usersListTime=0, myUsersList="", catCrc="1234";
  
  var wsSource=new mc.utils.WsClient(empty, takeResponseSh, empty, userParams, serverParams, empty, false);
  //onConnect, onData, onHang, userParams, serverParams, upConnection, connectAtOnce
  var inventory=new mc.pb.Inventory(userParams);

  function empty() {}

  function takeResponseSh(resp) {
    if (resp.catalogBytes) catalogBytes=resp.catalogBytes;
    if (resp.timestamp) catalogTime=resp.timestamp;
    if (resp.catCrc) catCrc=resp.catCrc;
    if (resp.users) { 
      usersListTime=resp.timestamp;
      myUsersList=resp.users;
    }
    if (resp.list) { changesMap=inventory.consumeNewCatalog(resp.list); }
    if (resp.alert) { if (resp.lag) resp.alert+=" fulfiled in "+resp.lag+"ms"; }
    response=resp;
  }
  
  this.getResponce=function() { return response; };
  this.getChangesMap=function() { return changesMap; };
  this.getUser=function() { return serverParams.user; };
  
  this.connect=function() { return wsSource.connect(); };
  this.disconnect=function() { return wsSource.disconnect(); };
}// end Shadow

function tr0() { return $("medialistT").getElementsByTagName("TR")[0]; }

var recorderBox=mc.tm.getRB(),
    playerBox=mc.tm.getPB().getDebugApi(), 
    sp=mc.serverParams,
    shadow=new Shadow(), 
    shUser=shadow.getUser();

var ok,err,resp,blobKb,clip1,clip2,clip3,free,i,toSend,toSend2,span,storedTime1, storedTime2, elapsed;
var tr,me,descr,descr2;
var shResp, shChangesMap;
var ul,delBtn,dels,id;

print(">page");
var testScript1=<?php print file_get_contents("testWS1_chat.js"); ?>;;
var testScript2=<?php print file_get_contents("testWS2_recorder.js"); ?>;;
//var testScript=testScript1;
var testScript=testScript1.concat(testScript2);
var ci=new CommandIterator(testScript);
commandsRun(ci);

</script>

</body>
</html>
