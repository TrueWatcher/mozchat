<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>Multimedia chat</title>
  <link rel="stylesheet" type="text/css" href="<?php print($pathBias."assets/".version($cssLink,$pathBias)); ?>" media="all" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.5" />
</head>
<body>

<form action="?" method="GET">
<fieldset id="accountPanel">
  <p id="accountTopAlertP"></p>
  <input type="text" id="userInput" placeholder="Your name" name="user" value="Me" />
  <input type="text" id="realmInput" placeholder="Thread" name="realm" />
  <br />
  <input type="submit" id="exitBtn" value="Register" />
  <a href="?">Exit</a>
  <p id="accountBottomAlertP"></p>
</fieldset>
</form>

<fieldset id="recorderPanel">
  <span id="recorderControlsS"  class="hideable">
    Server limits: clip <span id="maxSizeS"></span>,
    lifetime <span id="lifetimeS"></span>, 
    folder <span id="folderSizeS"></span>,
    clips <span id="maxClipCountS"></span>
    <br />
    <span id="audioOrVideoS">
      <label for="audioOrVideoRad1">audio</label><input type="radio" id="audioOrVideoRad1" name="audioOrVideoRad" value="audio" checked="checked" />
      <label for="audioOrVideoRad2">or video</label><input type="radio" id="audioOrVideoRad2" name="audioOrVideoRad" value="video" />
      &nbsp;
    </span>  
    Chunk:
    <select id="chunkSelect" >
      <option value="1" selected="selected">1s</option>
      <option value="2">2s</option>
      <option value="15">15s</option>
      <option value="30">30s</option>
      <option value="custom">custom</option>
    </select>
    <input type="text" id="chunkInp" style="width : 3em;" />s,
    &nbsp;&nbsp;&nbsp;
    <span id="onrecordedS">
      then: <label for="onrecordedRad1">upload</label><input type="radio" id="onrecordedRad1" name="onrecordedRad" value="upload" checked="checked" />&nbsp;
      <label for="onrecordedRad2">stop</label><input type="radio" id="onrecordedRad2" name="onrecordedRad" value="stop" />
    </span>
    <br />
    <label for="holdPlayWhileRecChkb">pause player</label><input type="checkbox" id="holdPlayWhileRecChkb" checked="checked">
    <br />
  </span>
  <button id="toggleHideableRecB" title="Show more/less">◔</button>
  <input type="text" id="descriptionInput" placeholder="You may type here a description before recording" />
  <br />
  <button id="recordBtn">Oops...</button>
  <input type="text" id="timerInd" style="width : 3em;" class="inline" value="0" />s&nbsp;
  <span id="localPlayS">
    <br />
    <span id="blobSizeS"></span>
    <span id="downloadLink"></span>
    <input type="button" id="playHereBtn" value="Play" />
    <input type="button" id="uploadStoredBtn" value="Upload" />
  </span>
  <button id="uploadIndBtn" title="uplink indicator" >&nbsp;</button>
  <br />
  
  <p id="recorderAlertP"></p>
</fieldset>

<div id="playerRoom"></div>

<fieldset id="playerPanel">
  <p id="onlineS">
    Online: <span id="usersS" ></span>
  </p>
  <table id="medialistT">
  </table>
  <p id="freeP" class="hideable">
    Free:<input type="text" id="folderFreeInp" class="inline" style="width : 6em;" />
  </p>
  <p id="playerAlertP" class="hideable">
    Something is wrong if you see this
  </p>
  <button id="toggleHideablePlB" title="Show more/less">◔</button>
  <input type="button" id="clearBtn" value="Stop" />
  <input type="button" id="standbyBtn" value="Standby" />
  <input type="button" id="stopAfterBtn" value="Stop after current" class="hideable" />
  &nbsp;
  <span id="playerControlsS" class="hideable">
    <span id="refreshS">Refresh 
      <select id="refreshSelect" >
        <option value="l" >long</option>
        <!--<option value="4" >0.4s</option>-->
        <option value="10" selected="selected" >1s</option>
        <option value="30" >3s</option>
        <option value="100">10s</option>
        <option value="off">off</option>
      </select>
    </span>  
    &nbsp;
    <label for="playNewChkb">Play new clips</label><input type="checkbox" id="playNewChkb" checked="checked" />,
    <label for="skipMineChkb">only from others</label><input type="checkbox" id="skipMineChkb" checked="checked" />
  </span>
</fieldset>

<div id="footer">
&nbsp;<br />
<a href="https://github.com/TrueWatcher/mozchat">mozchat</a>, an open source media chat by TrueWatcher 2018
</div>

<script>
  var mc={};// namespace root
</script>
<script src="<?php print($pathBias."assets/".version("utils.js",$pathBias)); ?>"></script>
<script src="<?php print($pathBias."assets/".version("RecorderBox.js",$pathBias)); ?>"></script>
<script src="<?php print($pathBias."assets/".version("PlayerBox.js",$pathBias)); ?>"></script>
<script>
"use strict";
mc.mimeDictionary='<?php print(json_encode($mimeDictionary)); ?>';
mc.mimeDictionary=JSON.parse(mc.mimeDictionary);

mc.serverParams='<?php print(json_encode($serverParams)); ?>';
mc.serverParams=JSON.parse(mc.serverParams);

function $(id) { return document.getElementById(id); }

mc.TopManager=function() {
  var recorderBox={}, playerBox={}, kbm={}, sp=mc.serverParams;
  
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
    if(sp.realm) $("realmInput").value=sp.realm;
  }
  
  function initFull() {
    mc.screenParams=mc.utils.getScreenParams();
    adjustLayout(mc.screenParams);
    
    $("userInput").value=sp.user;
    $("realmInput").value=sp.realm;
    $("accountBottomAlertP").innerHTML="Press and hold SPACE to start recording, release SPACE to finish it";
    
    var found=mc.utils.checkBrowser();
    console.log(mc.utils.dumpArray(found));
    if(found.outcome !== true) {
      //console.log(Utils.dumpArray(found));
      accountBottomAlertP.innerHTML=found.outcome;
      throw new Error(found.outcome);
    }
    
    var onBeforerecording=function(params) {
      if (params.holdPlayWhileRec) playerBox.pause();
    };
    
    var onAfterrecording=function() {
      playerBox.unpause()
    };

    recorderBox=new mc.rb.RecorderBox(onBeforerecording, onAfterrecording);
    recorderBox.init(mc.serverParams);

    playerBox=new mc.pb.PlayerBox(recorderBox.getUpConnection());
    playerBox.init(mc.serverParams);
    
    kbm=new mc.utils.KeyboardMonitor(recorderBox.recorderOn, recorderBox.recorderOff, playerBox.clear);    
  }
    
  function adjustLayout(screenParams) {
    var isPortrait=0,// set this to 1 to debug
        videoWidth,
        videoHeight;
    isPortrait=isPortrait || screenParams.isPortrait;
    if (isPortrait) {// normally mobile, narrow screen
      //console.log("portrait screen");
      $("playerRoom").style="display: table-cell; padding:5px; width: 95%";
      mc.utils.addCss("video { max-width: 100%; }");
    }
    else {// landscape -- normally desktop
      $("playerRoom").style="position: fixed; bottom:5px; right:5px";
      videoWidth=Math.floor(screenParams.width*0.85);
      mc.utils.addCss("video { max-width:"+videoWidth+"px; }");
    }
    videoHeight=Math.floor(screenParams.height-15);
    // adjust for the mobile browser's status bar
    if (screenParams.isMobile) videoHeight += screenParams.emPx*2;
    mc.utils.addCss("video { max-height:"+videoHeight+"px; }");
  }
  
  this.getRB=function() { return recorderBox; };
  this.getPB=function() { return playerBox; };
};

mc.tm=new mc.TopManager();
mc.tm.go();

</script>

<?php if ( ! isset($disableTail)) { ?>
</body>
</html>
<?php }?>