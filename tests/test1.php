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
if ($wsOn) exit("Turn WS off for this test (wshub/ws.ini wsOn=0)"); //checkWsCommandLink($pr->g("wsCommandUri"));

$serverParams=[
  "state"=>"operational", "user"=>$input["user"], "realm"=>$input["realm"]
];
$serverParams=$pr->exportByList( [
  "serverPath", "serverName", "maxBlobBytes", "maxMediaFolderBytes", "clipLifetimeSec", "title", "allowVideo", "videoOn", "maxClipSizeSec", "maxClipCount", "allowStream", "onRecorded", "pollFactor", "playNew", "skipMine", "showMore", "reportErrors", "mediaFolder", "pathBias", "longPollPeriodS", "userStatusFadeS", "wsOn", "wsServerUri"
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
    user:"Shadow", realm:"test0", serverPath:"", pathBias:"../", playNew:1, skipMine:1, longPollPeriodS:5
  };
  var userParams=serverParams;
  var response={},changesMap={};
  var catalogBytes=0, catalogTime=0, usersListTime=0, myUsersList="", catCrc="1234";
  
  var ajaxerP=new mc.utils.Ajaxer(serverParams.pathBias+"download.php", takeResponseSh, {});
  ajaxerP.setQueueMax(0);// queue and long poll cannot go together
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
}// end Shadow

var recorderBox=mc.tm.getRB(),
    playerBox=mc.tm.getPB().getDebugApi(), 
    sp=mc.serverParams,
    shadow=new Shadow(), 
    shUser=shadow.getUser();

var state,ok,err,blobKb,clip1,clip2,clip3,free,i,toSend,toSend2,storedTime1, storedTime2, elapsed;
var tr,trs,span,me,descr,descr2;
var shResp, shChangesMap;
var ul,delBtn,dels,id;
var resp,chm,pse,clipId,nextId,oldId,oldId2,playFrom,count,removedCount,targetRemovedCount;

function watchState(current, next, onChange, onSame) {
  var isCurrent;
  
  pse=playerBox.getPlayerStateExt();
  print(pse.state+" ");
  
  if (current instanceof Array) {
    isCurrent=(current.indexOf(pse.state) >= 0);
  }
  else { isCurrent=(current == pse.state); }
  if (isCurrent) {
    if (typeof onSame == "function") onSame();
  }
  else {
    assertEqualsPrim(next, pse.state, "Wrong player state", "New player state="+next);
    onChange();
    ci.inc();
  }
}

function tr0() { return $("medialistT").getElementsByTagName("TR")[0]; }

//playerBox.setUpConnQueueMax(0);// disable queue of uplink

print(">page");
var testScript1=<?php print file_get_contents("test1_chat.js"); ?>;
var testScript2=<?php print file_get_contents("test2_recorder.js"); ?>;
var testScript3=<?php print file_get_contents("test3_longPoll.js"); ?>;
var testScript4=<?php print file_get_contents("test4_player.js"); ?>;
//var testScript=testScript1;
//var testScript=testScript2;
//var testScript=testScript2.concat(testScript3);
//var testScript=testScript4;
var testScript=testScript1.concat(testScript2).concat(testScript3).concat(testScript4);
var ci=new CommandIterator(testScript, 500);
commandsRun(ci);

</script>

</body>
</html>
