<?php
$pathBias="../";
require_once($pathBias."scripts/AssocArrayWrapper.php");
require_once($pathBias."scripts/MyExceptions.php");
require_once($pathBias."scripts/registries.php");
require_once($pathBias."scripts/Inventory.php");
$input=["user"=>"Test1","realm"=>"test0"];//$_REQUEST;
$mimeDictionary=[];
$cssLink=$pathBias."blue.css";
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
  "maxBlobBytes", "maxMediaFolderBytes", "clipLifetimeSec", "title", "allowVideo", "videoOn", "maxClipSizeSec", "allowStream", "onRecorded", "pollFactor", "playNew", "skipMine", "mediaFolder", "pathBias", "userStatusFadeS"
] , $serverParams);
$serverParams["mediaFolder"]=Inventory::checkMediaFolderName($serverParams["mediaFolder"]);
$mimeDictionary=MimeDecoder::getDictionary();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Test media chat 0</title>
  <link rel="stylesheet" type="text/css" href="<?php print($cssLink); ?>" media="all" />
</head>
<body>

<form action="?" method="GET">
<fieldset id="accountPanel">
  <p id="accountTopAlertP"></p>
  <input type="text" id="userInput" placeholder="Your name" name="user" value="TestUser1" />
  <input type="text" id="realmInput" placeholder="Thread" name="realm" value="test0" />
  <input type="submit" id="exitBtn" value="Register" />
  <a href="?">Exit</a>
  <p id="accountBottomAlertP"></p>
</fieldset>
</form>

<fieldset id="recorderPanel">
  Server limits: clip size <input type="text" id="maxSizeInp" class="inline" style="width : 4em; border:none;" />, lifetime <input type="text" id="lifetimeInp" class="inline" style="width : 5em; border:none;" />, folder size <input type="text" id="folderSizeInp" class="inline" style="width : 8em; border:none;" />
  <br />
  <span id="audioOrVideoS">
    audio<input type="radio" id="audioOrVideoRad1" name="audioOrVideoRad" value="audio" checked="checked" />
    or video<input type="radio" id="audioOrVideoRad2" name="audioOrVideoRad" value="video" />
  </span>  
  &nbsp;
  Chunk:
  <input type="radio" name="chunkRad" value="1" />1s&nbsp;
  <input type="radio" name="chunkRad" value="2" checked="checked" />2s&nbsp;
  <input type="radio" name="chunkRad" value="10" />10s&nbsp;
  <input type="radio" name="chunkRad" value="custom" />custom
  <input type="text" id="chunkInp" style="width : 4em;" />s,
  &nbsp;&nbsp;&nbsp;
  <span id="onrecordedS">
    then: upload<input type="radio" name="onrecordedRad" value="upload" checked="checked" />&nbsp;
    stop<input type="radio" name="onrecordedRad" value="stop" />
  </span>
  <br />
  <input type="text" id="decriptionInput" placeholder="You may type here a decription before recording" style="width : 40em;" />
  <br />
  <button id="recordBtn">Wait...</button>
  <input type="text" id="timerInd" style="width : 4em;" class="inline" value="0" />s&nbsp;
  <span id="localPlayS">
    <span id="blobSizeS"></span>
    <span id="downloadLink"></span>
    <input type="button" id="playHereBtn" value="Play" />
    <input type="button" id="uploadStoredBtn" value="Upload" />
  </span>
  <button id="uploadIndBtn" title="uplink indicator" >&nbsp;</button>
  <br />
  
  <p id="recorderAlertP"></p>
</fieldset>

<fieldset id="playerPanel">
  <input type="button" id="clearBtn" value="Stop" />
  <input type="button" id="stopAfterBtn" value="Stop after current" />
  &nbsp;&nbsp;
  <span id="playerControlsDiv">
    Refresh <input type="radio" name="refreshRad" value="4" />0.4s&nbsp;<input type="radio" name="refreshRad" value="10" checked="checked" />1s&nbsp;<input type="radio" name="refreshRad" value="100" />10s
    &nbsp;&nbsp;
    Play new clips<input type="checkbox" id="playNewChkb" checked="checked" />,
    only from others<input type="checkbox" id="skipMineChkb" checked="checked" />
  </span>
  <p>
    Online: <span id="usersS" ></span>
  </p>
  <table id="medialistT">
  </table>
  <p>
    Free:<input type="text" id="folderFreeInp" class="inline" style="width : 6em;" />
  </p>
  <p id="playerAlertP">
    Something is wrong if you see this
  </p>  
</fieldset>

<!--<fieldset id="techPanel">
</fieldset>-->

<div id="playerRoom" style="position: fixed; bottom:5px; right:5px">
</div>

<script>
  var mc={};// namespace root
</script>
<script src="../scripts/utils.js"></script>
<script src="../scripts/RecorderBox.js"></script>
<script src="../scripts/PlayerBox.js"></script>
<script src="testUtils.js"></script>
<script>
// slightly modified templates/client.php
mc.mimeDictionary='<?php print(json_encode($mimeDictionary)); ?>';
mc.mimeDictionary=JSON.parse(mc.mimeDictionary);

mc.serverParams='<?php print(json_encode($serverParams)); ?>';
mc.serverParams=JSON.parse(mc.serverParams);

mc.TopManager=function() {
  var recorderBox={}, playerBox={}, sp=mc.serverParams;
  
  this.go=function() {
    if(sp.title) document.title=sp.title;
    if(sp.state == "zero") {
      initZero();
    }
    else {
      initFull();
    }
  };
  
  function initZero() {
    recorderPanel.style.display="none";
    playerPanel.style.display="none";
    accountTopAlertP.innerHTML="Please introduce yourself and choose your thread";    
  }
  
  function initFull() {
    userInput.value=sp.user;
    realmInput.value=sp.realm;
    accountBottomAlertP.innerHTML="Press and hold SPACE to start recording, release SPACE to finish it";
    
    var found=mc.utils.checkBrowser();
    console.log(mc.utils.dumpArray(found));
    if(found.outcome !== true) {
      //console.log(Utils.dumpArray(found));
      accountBottomAlertP.innerHTML=found.outcome;
      throw new Error(found.outcome);
    }

    recorderBox=new mc.rb.RecorderBox();
    recorderBox.init(mc.serverParams);

    playerBox=new mc.pb.PlayerBox();
    playerBox.init(mc.serverParams);
    
    //var kbm=new mc.utils.KeyboardMonitor(recorderBox.recorderOn, recorderBox.recorderOff, playerBox.clear);    
  }
  
  this.getRB=function() { return recorderBox; };
  this.getPB=function() { return playerBox; };
};

mc.tm=new mc.TopManager();
mc.tm.go();

function Shadow() {
  var serverParams={user:"Shadow",realm:"test0",pathBias:"../",playNew:1,skipMine:1};
  var userParams=serverParams;
  var response={},changesMap={};
  var catalogBytes=0, catalogTime=0;
  
  var ajaxerP=new mc.utils.Ajaxer(serverParams.pathBias+"download.php", takeResponseSh, {});
  var inventory=new mc.pb.Inventory();
  
  function takeResponseSh(resp) {
    if(resp.catalogBytes) catalogBytes=resp.catalogBytes;
    if(resp.timestamp) catalogTime=resp.timestamp;
    if(resp.list) { changesMap=inventory.consumeNewCatalog(resp.list, userParams); }     
    if(resp.alert) { resp.alert+=" fulfiled in "+resp.lag+"ms"; }
    response=resp;
  }
  
  this.getResponce=function() { return response; };
  this.getChangesMap=function() { return changesMap; };
  this.getUser=function() { return userParams.user; };
  
  this.sendDir=function() {
    var qs="";
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=dir&since="+catalogTime+"&catBytes="+catalogBytes;
    //qs+="&pollFactor="+userParams.pollFactor;
    console.log("Shadow's request : "+qs);
    ajaxerP.getRequest(qs);    
  };

}

var recorderBox=mc.tm.getRB(), playerBox=mc.tm.getPB(), sp=mc.serverParams;
var shadow=new Shadow();

var ok,err,blobKb,clip1,clip2,clip3,free,i,toSend,storedTime1, storedTime2, elapsed;
var shResp, shUser=shadow.getUser(), shChangesMap;

print(">page");
var testScript=[
'println("Clearing files and reading the catalog");',
'recorderBox.sendClear();',
'',
'ok=recorderAlertP.innerHTML.indexOf("cleared") >= 0; \
 assertTrue(ok, "wrong message="+recorderAlertP.innerHTML, "server agreed");',
'playerBox.sendDir();',
'',
'ok= ! medialistT.hasChildren; \
 assertTrue(ok,"Some data are present in the catalog","catalog cleared"); \
 free=parseInt(folderFreeInp.value); \
 assertEqualsPrim(sp.maxMediaFolderBytes/1000, free, "Wrong free space", "All space is free");',
'var ok=usersS.innerHTML.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Missing my username", "My username is listed")',

'println("Testing max size limit");',
'chunkInp.value=4; \
 mc.utils.setRadio("chunkRad","custom"); \
 mc.utils.setRadio("onrecordedRad","stop");',
'ci.loop();',
'if(recordBtn.innerHTML.charAt(0) != "W") ci.inc();',
'recordBtn.click(); ci.inc();',
'if(localPlayS.style.display == "") ci.inc();',
'ci.noLoop();',
'blobKb=parseInt(blobSizeS.innerHTML); \
 assertTrue( blobKb > sp.maxBlobBytes/1000, "wrong blob size","blob size="+blobKb+" is over limit" );',
'uploadStoredBtn.click()',
'err=recorderAlertP.innerHTML.indexOf("server allows only") >= 0; \
 assertTrue(err, "no error on uploading oversized record","error shown" );',
 
'println("Testing simple send");',
'mc.utils.setRadio("chunkRad",1);',
'ci.loop();',
'if(recordBtn.innerHTML.charAt(0) != "W") ci.inc();',
'recordBtn.click(); ci.inc();',
'if(localPlayS.style.display == "") ci.inc();',
'ci.noLoop();',
'blobKb=parseInt(blobSizeS.innerHTML); \
 assertTrue( blobKb < sp.maxBlobBytes/1000, "wrong blob size","blob size="+blobKb+" is ok" );',
'clip1="Clip Number One"; \
 decriptionInput.value=clip1; \
 uploadStoredBtn.click();',
'',
'ok=recorderAlertP.innerHTML.indexOf("Server got ") >= 0; \
 assertTrue(ok, "wrong upload message","message ok" );',
'playerBox.sendDir();',
'',
'assertTrue(medialistT.firstChild, "Empty catalog","catalog got some data");', 
'var tr=medialistT.firstChild.innerHTML; \
 var me=tr.indexOf(sp.user) >= 0; \
 assertTrue(me,"My good name is absent","My username is present"); \
 var descr=tr.indexOf(clip1) >= 0; \
 assertTrue(descr,"My description absent","My description is present"); ',

'println("Testing repeated send");',
'clip2="clips salvo 1"; \
 decriptionInput.value=clip2; \
 free=parseInt(folderFreeInp.value); \
 toSend=Math.ceil(free/blobKb)+1;\
 storedTime1=Date.now()/1000; \
 i=0;',
'ci.loop();',
'uploadStoredBtn.click(); i+=1; print(" "+i+" "); if(i >= toSend) { ci.inc(); };',
'ci.noLoop();',
'storedTime2=Date.now()/1000; \
 playerBox.sendDir();',
'',
'elapsed=Date.now()/1000-storedTime1; \
 assertTrue(elapsed <= sp.clipLifetimeSec, "Increase the lifetime", "No new files have expired yet")',
'free=parseInt(folderFreeInp.value); \
 assertTrue(free <= blobKb, "Wrong FREE after salvo", "Free space is less than clip size"); \
 var tr=medialistT.firstChild.innerHTML; \
 var descr=tr.indexOf(clip1) >= 0; \
 assertTrue( ! descr,"My first clip is still present","My first clip is removed"); \
 descr=tr.indexOf(clip2) >= 0; \
 assertTrue(descr,"My next clips are missing","My next clips are there"); \
',

'println("Testing clip expiration");',
'ci.loop();',
'elapsed=Date.now()/1000-storedTime1; \
 if(elapsed > (1+parseInt(sp.clipLifetimeSec)) ) { ci.inc(); };',
'ci.noLoop();', 
'playerBox.sendDir();',
'',
'var freeAfterOneLifetime=parseInt(folderFreeInp.value); \
 assertTrue(freeAfterOneLifetime > free, "Wrong FREE after expiration="+freeAfterOneLifetime, "Some clips have expired");',
'ci.loop();',
'elapsed=Date.now()/1000-storedTime2; \
 if(elapsed > sp.clipLifetimeSec) { ci.inc(); };',
'ci.noLoop();', 
'playerBox.sendDir();',
'',
'var freeFinally=parseInt(folderFreeInp.value); \
 assertEqualsPrim(sp.maxMediaFolderBytes/1000, freeFinally, "Wrong free space", "All space is eventually free"); \
 ok= ! medialistT.hasChildren; \
 assertTrue(ok,"Some data are present un the catalog","Catalog is empty"); ',
 
'println("Testing users list basic operations");',
'storedTime1=Date.now()/1000; \
 playerBox.sendDir();',
'',
'shadow.sendDir();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 ok=shResp.users.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Failed to get my username", "My username is visible to Shadow"); \
 ok=shResp.users.indexOf(shUser) >= 0; \
 assertTrue(ok, "Failed to get Shadow username", "Shadow username is visible to Shadow");',
'',// fine tune of delay: the responder shoul be open to me without expiring Shadow's record
'elapsed=Date.now()/1000-storedTime1; \
 assertTrue(elapsed > sp.userStatusFadeS, "Increase delay, elapsed="+elapsed+" of "+sp.userStatusFadeS, "Delay has passed"); \
 playerBox.sendDir();',
'',
//'console.log(mc.utils.dumpArray(playerBox.getResponse()));',
'ok=usersS.innerHTML.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Missing my username", "My username is listed"); \
 ok=usersS.innerHTML.indexOf(shUser) >= 0; \
 assertTrue(ok, "Missing Shadow username", "Shadow username is listed"); ',
'','',// another tune: waiting for Shadow's record to expire
'playerBox.sendDir();',
'',
//'console.log(mc.utils.dumpArray(playerBox.getResponse()));',
'ok=usersS.innerHTML.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Missing my username", "My username is listed"); \
 ok=usersS.innerHTML.indexOf(shUser) < 0; \
 assertTrue(ok, "Shadow username not expired", "Shadow username is expired"); ',
 
'println("Testing passing a clip to another user");',
'clip3="Clips salvo Two"; \
 decriptionInput.value=clip3; \
 mc.utils.setRadio("onrecordedRad","upload"); \
 mc.utils.setRadio("chunkRad",1); \
 storedTime1=Date.now()/1000; \
 recordBtn.click(); \
 ci.loop();\
',
'elapsed=Date.now()/1000-storedTime1; \
 if(elapsed >= 2) { recordBtn.click(); ci.inc();}',
'ci.noLoop();',
'shadow.sendDir();',
'playerBox.sendDir();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 shChangesMap=shadow.getChangesMap(); \
 /*console.log(mc.utils.dumpArray(shChangesMap)); */\
 assertTrue(shResp.list && (shResp.list.length >= 1), "Missing clips list", "New clips are visible" ); \
 ok=shChangesMap.added && (shChangesMap.added.length == shResp.list.length); \
 ok=ok && (shChangesMap.removed.length == 0); \
 assertTrue(ok, "Wrong changesMap", "ChangesMap ok"); \
 ok=shChangesMap.toPlay && (shChangesMap.toPlay[1] == sp.user) && (shChangesMap.toPlay[7] == clip3); \
 assertTrue(ok, "Wrong changesMap.toPlay", "ChangesMap.toPlay ok"); \
',

 
'println("Tests finished successfully");',
];

var ci=new CommandIterator(testScript);
commandsRun(ci);

</script>

</body>
</html>