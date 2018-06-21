<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Audio chat</title>
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
  Server limits: clip size <input type="text" id="maxSizeInp" style="width : 4em; border:none;" />, lifetime <input type="text" id="lifetimeInp" style="width : 8em; border:none;" />, folder size <input type="text" id="folderSizeInp" style="width : 8em; border:none;" />
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
  <input type="text" id="decriptionInput" placeholder="You may type here a decription BEFORE recording" style="width : 40em;" />
  <br />
  <button id="recordBtn">Wait...</button>
  <button id="uploadIndBtn">&nbsp;</button>
  <input type="text" id="timerInd" style="width : 4em;"  value="0" />s&nbsp;
  <span id="localPlayS">
    <span id="blobSizeS"></span>
    <span id="downloadLink"></span>
    <input type="button" id="playHereBtn" value="Play" />
    <input type="button" id="uploadStoredBtn" value="Upload" />
  </span>
  <br />
  
  <p id="recorderAlertP"></p>
</fieldset>

<fieldset id="playerPanel">
  <div id="playerControlsDiv">
    Refresh <input type="radio" name="refreshRad" value="4" />0.4s&nbsp;<input type="radio" name="refreshRad" value="10" checked="checked" />1s&nbsp;<input type="radio" name="refreshRad" value="300" />30s
    &nbsp;&nbsp;
    Play new clips<input type="checkbox" id="playNewChkb" checked="checked" />,
    only from others<input type="checkbox" id="skipMineChkb" checked="checked" />
  </div>
  <table id="medialistT">
  </table>
  <p>
    Free:<span id="folderFreeS" style="width : 10em;"></span><!--, net downloaded:<span id="downloadCountS" style="width : 10em;"></span>-->
  </p>
  <input type="button" id="stopAfterBtn" value="Stop after current" />
  <input type="button" id="clearBtn" value="Clear" />
  <p id="playerAlertP">Javascript required</p>
</fieldset>

<fieldset id="techPanel">
</fieldset>

<div id="playerRoom" style="position: fixed; bottom:5px; right:5px">
</div>

<script src="scripts/client.js"></script>
<script src="scripts/RecorderBox.js"></script>
<script src="scripts/PlayerBox.js"></script>
<script>

//Utils.dumpArray("a string");
//console.log(Utils.dumpArray({qwerty:"qwerty",f:false,arr:["a",2,3],emptyArr:[],notEmpty:![]}));
var serverParams='<?php print(json_encode($serverParams)) ?>';
serverParams=JSON.parse(serverParams);

if(serverParams.title) document.title=serverParams.title;
if(serverParams.state == "zero") {
  recorderPanel.style.display="none";
  playerPanel.style.display="none";
  accountTopAlertP.innerHTML="Please introduce yourself and choose your thread";
}
else {
  userInput.value=serverParams.user;
  realmInput.value=serverParams.realm;
  
  var found=Utils.checkBrowser();
  console.log(Utils.dumpArray(found));
  if(found.outcome !== true) {
    //console.log(Utils.dumpArray(found));
    accountBottomAlertP.innerHTML=found.outcome;
    throw new Error(found.outcome);
  }

  var recorderBox=new RecorderBox();
  recorderBox.init(serverParams);

  var playerBox=new PlayerBox();
  playerBox.init(serverParams);
}

</script>

</body>
</html>