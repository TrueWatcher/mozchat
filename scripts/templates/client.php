<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Audio chat</title>
  <link rel="stylesheet" type="text/css" href="<?php print($cssLink); ?>" media="all" />
</head>
<body>

<form action="?" method="GET">
<fieldset id="accountPanel">
  <p id="accountTopAlertP"></p>
  <input type="text" id="userInput" placeholder="Your name" name="user" value="Me" />
  <input type="text" id="realmInput" placeholder="Thread" name="realm" />
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
    Refresh <input type="radio" name="refreshRad" value="4" />0.4s&nbsp;<input type="radio" name="refreshRad" value="10" />1s&nbsp;<input type="radio" name="refreshRad" value="30" checked="checked" />3s&nbsp;<input type="radio" name="refreshRad" value="100" />10s
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
<script src="scripts/utils.js"></script>
<script src="scripts/RecorderBox.js"></script>
<script src="scripts/PlayerBox.js"></script>
<script>
"use strict";
mc.mimeDictionary='<?php print(json_encode($mimeDictionary)); ?>';
mc.mimeDictionary=JSON.parse(mc.mimeDictionary);

mc.serverParams='<?php print(json_encode($serverParams)); ?>';
mc.serverParams=JSON.parse(mc.serverParams);

mc.TopManager=function() {
  var sp=mc.serverParams;
  
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
    if(sp.realm) realmInput.value=sp.realm;
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

    var recorderBox=new mc.rb.RecorderBox();
    recorderBox.init(mc.serverParams);

    var playerBox=new mc.pb.PlayerBox();
    playerBox.init(mc.serverParams);
    
    var kbm=new mc.utils.KeyboardMonitor(recorderBox.recorderOn, recorderBox.recorderOff, playerBox.clear);    
  }
};

mc.tm=new mc.TopManager();
mc.tm.go();

</script>

</body>
</html>