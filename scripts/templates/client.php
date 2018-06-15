<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Audio chat</title>
</head>
<body>

<form action="?" method="GET">
<fieldset id="accountPanel">
  <p id="accountTopAlertP"></p>
  <input type="text" id="userInput" placeholder="Your name" name="user" value="Me" />
  <input type="text" id="realmInput" placeholder="Thread" name="realm" value="thr0" />
  <input type="submit" id="exitBtn" value="Register" />
  <p id="accountBottomAlertP"></p>
</fieldset>
</form>

<fieldset id="recorderPanel">
  Server limits: clip size <input type="text" id="maxSizeInp" style="width : 4em; border:none;" />, lifetime <input type="text" id="lifetimeInp" style="width : 8em; border:none;" />, folder size <input type="text" id="folderSizeInp" style="width : 8em; border:none;" />
  <br />
  audio<input type="radio" name="audioOrVideoRad" value="a" checked="checked" /> or video<input type="radio" name="audioOrVideoRad" value="v" />&nbsp;
  Chunk:
  <input type="radio" name="chunkRad" value="1" />1s&nbsp;
  <input type="radio" name="chunkRad" value="2" checked="checked" />2s&nbsp;
  <input type="radio" name="chunkRad" value="10" />10s&nbsp;
  <input type="radio" name="chunkRad" value="custom" />custom
  <input type="text" id="chunkInp" style="width : 4em;" />s,
  &nbsp;&nbsp;&nbsp;
  then: upload<input type="radio" name="onrecordedRad" value="upload" checked="checked" />&nbsp;
  stop<input type="radio" name="onrecordedRad" value="stop" />
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
    &nbsp;&nbsp;
    <input type="button" id="stopAfterBtn" value="Stop after current" />
  </div>
  <table id="medialistT">
  </table>
  <p id="playerAlertP">Javascript required</p>
</fieldset>

<fieldset id="techPanel">
</fieldset>

<div id="playerRoom">
</div>

<script src="scripts/client.js" type="text/javascript"></script>
<script src="scripts/RecorderBox.js" type="text/javascript"></script>
<script src="scripts/PlayerBox.js" type="text/javascript"></script>
<script type="text/javascript">

//Utils.dumpArray("a string");
//console.log(Utils.dumpArray({qwerty:"qwerty",f:false,arr:["a",2,3],emptyArr:[],notEmpty:![]}));
var serverParams='<?php print(json_encode($serverParams)) ?>';
serverParams=JSON.parse(serverParams);

if(serverParams.state == "zero") {
  recorderPanel.style.display="none";
  playerPanel.style.display="none";
  accountTopAlertP.innerHTML="Please introduce yourself and choose your thread";
}
else {
  var recorderBox=new RecorderBox();
  recorderBox.init(serverParams);

  var playerBox=new PlayerBox();
  playerBox.init(serverParams);
}

</script>

</body>
</html>