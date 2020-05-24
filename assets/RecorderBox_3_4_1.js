"use strict";
if ( ! mc) mc={};//namespace
mc.rb={};

mc.rb.RecorderBox=function(connector, onBeforerecording, onAfterrecording) {
  var _this=this,
      viewR,
      clipManager,
      recorder,
      recordingTimer,
      feedback,
      motionDetector,
      chatController,
      userParams={},
      upConnection=connector.push,
      serverParams={}
      ;
  
  this.init=function(fromServer) {
    serverParams=fromServer;
    
    viewR=new mc.rb.ViewR();
    viewR.serverParams2dom(serverParams);
    mc.userParams.rb=new mc.utils.Registry(viewR.getParams());
    userParams=mc.userParams.rb;    
    //console.log(mc.utils.dumpArray(userParams));

    //alert(">"+typeof connector.echo);
    upConnection.registerPushCallback(_this.takeResponseR);
    
    checkMime();
    
    clipManager=new mc.rb.ClipManager(upConnection, viewR, userParams, serverParams);
    
    recorder=new mc.rb.RecorderMR(clipManager.receiveBlob, viewR.recIndicator, viewR);
    recorder.init(userParams);
    
    recordingTimer=new mc.rb.RecordingTimer(recorder, clipManager, viewR, userParams);
    
    feedback=new mc.rb.Feedback(recorder.getStream, viewR.feedbackIndicator, viewR);

    motionDetector=new mc.rb.MotionDetector(recorder, this, feedback, viewR);

    chatController=new mc.rb.ChatController(connector, motionDetector, this, viewR, userParams);    
    
    viewR.setHandlers(_this.recorderInit, _this.recorderToggle, clipManager.playLocally, clipManager.uploadStoredBlob, feedback.toggle, motionDetector.toggle, chatController.toggle);
    // keyboard events are monitored separately by KeyboardMonitor
  };
  
  function checkMime() {
    var rma=mc.utils.checkRecorderMime(mc.mimeDictionary, "audio"),
        rmv={ outcome : true },
        fail="";
    if (serverParams.allowVideo) rmv=mc.utils.checkRecorderMime(mc.mimeDictionary, "video");
    console.log(mc.utils.dumpArray(rma.recorderMimes));
    if (rma.outcome !== true) fail=rma.outcome;
    else if (rmv.outcome !== true) fail=rmv.outcome;
    if (fail) {
      upConnection.reportMimeFault(rma.recorderMimes);
      viewR.showMessage(fail);
      console.log(mc.utils.dumpArray(rma))
      console.log(mc.utils.dumpArray(rmv));
      throw new Error(fail);
    }
  }
  
  //this.getUpConnection=function() { return upConnection; };
  
  this.recorderInit=function() { 
    _this.recorderOff();
    userParams.overrideValuesBy(viewR.getParams());
    recorder.init(userParams);
  };
    
  this.recorderToggle=function() {
    var s=recorder.getState();
    if (s) _this.recorderOff();
    else _this.recorderOn();
    return false;
  };
  
  this.recorderOn=function() {
    userParams.overrideValuesBy(viewR.getParams());
    onBeforerecording(userParams);
    recordingTimer.startRecording();
    return false;
  };
      
  this.recorderOff=function() {
    recordingTimer.finishRecording();
    onAfterrecording();
    return false;
  };

  this.takeResponseR=function(resp) { 
    //alert(resp);
    if (resp.error) viewR.showMessage("Error! "+resp.error);
    else if (resp.alert) viewR.showMessage(resp.alert+" fulfiled in "+resp.lag+"ms");
    else viewR.showMessage(resp.alert || mc.utils.dumpArray(resp) || "<empty>");
  };

};// end RecorderBox

mc.rb.RecordingTimer=function(recorder, clipManager, viewR, userParams) {
  var ticker=new mc.utils.Ticker(onTick),
      recordingTime=0,
      lastRecordedTime=0,
      timingOn=0,
      serialTime=0,
      floodLimitS=120,
      _this=this
      //userParams=mc.userParams.rb;
  ;
  
  this.getLastRecordedTime=function() { return lastRecordedTime; }
  
  function onTick() {
    if ( ! timingOn) return;
    recordingTime+=1;
    viewR.showTiming(recordingTime);
    if (overFloodLimit()) { _this.finishRecording(); return; }  
    if (recordingTime < userParams.chunkSizeS) return;
    if (userParams.onrecorded == "stop") { _this.finishRecording(); }
    else if (userParams.onrecorded == "upload") { _this.restartRecording(); }
  };
  
  function overFloodLimit() {
    serialTime+=1;
    if (serialTime <= floodLimitS) return "";
    var errmsg="Recording session is limited to "+floodLimitS+"s";
    console.log(errmsg);
    viewR.showMessage(errmsg);
    return errmsg;   
  }
  
  this.finishRecording=function() {
    //console.log("finishRecording");
    ticker.stop();
    timingOn=0;
    lastRecordedTime=recordingTime;
    clipManager.setLastRecorededTime(lastRecordedTime);
    viewR.showTiming(lastRecordedTime);
    recorder.onOff(0);
  };
  
  this.startRecording=function() {
    //userParams.overrideValuesBy(viewR.getParams());
    clipManager.reset();
    recorder.onOff(1);
    ticker.start();
    timingOn=1;
    recordingTime=0;
    serialTime=0;
    viewR.showTiming(recordingTime);
  };
  
  this.restartRecording=function() {
    lastRecordedTime=recordingTime;
    clipManager.setLastRecorededTime(lastRecordedTime);
    recordingTime=0;
    recorder.restart();
    return false;
  };
  
}; // end recordingTimer

mc.rb.ClipManager=function(upConnection, viewR, userParams, serverParams) {
  var storedBlob={},
      lastRecordedTime=0;
  
  this.setLastRecorededTime = function(time) {
    lastRecordedTime=time;
  }
  
  this.reset=function() {
    storedBlob={};
    viewR.hideLocalPlay();
  }
  
  this.receiveBlob=function(blobPlusData) {    
    if (userParams.onrecorded == "upload" && serverParams.allowStream && serverParams.allowStream !== "0") {
      uploadBlobAndData(blobPlusData); 
    }
    else if (userParams.onrecorded == "stop") allowLocalDownload(blobPlusData);
    else throw new Error("Not to get here");
  }
  
  this.playLocally=function() {    
    if ( ! storedBlob || ! storedBlob.localUrl) throw new Error("Attempt to play an invalid record");
    mc.utils.play(storedBlob.localUrl, userParams.audioOrVideo, "playerRoom");
  };
  
  this.uploadStoredBlob=function() { 
    userParams.overrideValuesBy(viewR.getParams());
    uploadBlobAndData(storedBlob);
  };

  function allowLocalDownload(blobPlusData) {
    var audioURL=URL.createObjectURL(blobPlusData.blob);
    storedBlob=blobPlusData;// keep for possible upload
    viewR.showLocalPlay(audioURL, blobPlusData.size);
    storedBlob.localUrl=audioURL;
  }

  function uploadBlobAndData(blobPlusData) {
    if ( true !== checkBlobSize(blobPlusData) || true !== checkUplinkOverload() ) return;
    upConnection.sendBlobAndData(blobPlusData, lastRecordedTime, userParams.description);
  }
  
  function checkBlobSize(blobPlusData) {
    if (serverParams.maxBlobBytes && (blobPlusData.size < serverParams.maxBlobBytes)) return true;
    var errmsg="Error! You have "+mc.utils.b2kb(blobPlusData.size)+", server allows only "+mc.utils.b2kb(serverParams.maxBlobBytes);
    viewR.showMessage(errmsg);
    return errmsg;
  }
  
  function checkUplinkOverload() {
    if ( ! upConnection.linkIsBusy()) return true;
    var errmsg="Error! Uplink is busy. Your network or server is too slow for instant uploads. Try bigger chuncks sent after recording";
    viewR.showMessage(errmsg);
    console.log(errmsg);
    viewR.serverParams2dom({ allowStream : serverParams.allowStream, onRecorded : "stop" });
    userParams.overrideValuesBy(viewR.getParams());
    return errmsg;
  }  
}; // end ClipManager

mc.rb.RecorderMR=function(receiveBlob, indicator, viewR) {  
  if (typeof receiveBlob != "function") throw new Error("No receiver callback given");
  
  var _this=this,
      chunks = [],
      isOn=0,
      mime,
      ext,
      params={},
      myStream=false;
  
  if (typeof indicator != "object" || ! indicator.on) {
    console.log("RecorderMR: wrong INDICATOR");
    indicator={ on : function(){}, off : function(){} };
  }
  
  this.onOff=function() { return false; };
  
  this.getStream=function() { return myStream; }
  
  this.getState=function() { return isOn };
  
  this.init=function(userParams) {
    var constraints={ audio: true },
        aov=userParams.audioOrVideo,
        recorderMime;
        
    if (aov == "video") constraints={ video: true }; //constraints.video=true;//
    recorderMime=mc.utils.checkRecorderMime(mc.mimeDictionary, aov);
    if ( ! recorderMime) throw new Error("Something is wrong with MIME detection");
    mime=recorderMime.chosenMime; 
    ext=recorderMime.chosenExtension;
    params=recorderMime.chosenParams;
    params.mimeType=mime;
    navigator.mediaDevices.getUserMedia(constraints).then(operate).catch(logError);    
  };
  
  function logError(err) { 
    console.log('Error: ' + err);
    viewR.showMessage('Error: ' + err);
  }
  
  function operate(stream) {
    var mediaRecorder;
    if (params) mediaRecorder=new MediaRecorder(stream,params);
    else mediaRecorder=new MediaRecorder(stream);
    
    myStream=stream;
    
    indicator.off();
    
    mc.utils.checkAutoplay( viewR.audios.open.src );
    
    _this.onOff=function(a) {
      if (a === "*") a= ! isOn;
      else if (a == isOn) return false;
      
      if (a) {
        isOn=1;
        mediaRecorder.start();
        indicator.on();
      }
      else {
        isOn=0;
        mediaRecorder.stop();
        indicator.off();
      }
      //console.log("recorder "+mediaRecorder.state);
      return isOn;
    };
    
    _this.restart=function() {
      //mediaRecorder.requestData(); // Tryout
      mediaRecorder.stop();
      mediaRecorder.start();
    };

    mediaRecorder.onstop=function() { 
      receiveBlob(makeBlob());
    };

    mediaRecorder.ondataavailable = function(e) {
      // encoding chunks without stopping the recorder gives unaudible blobs !
      chunks.push(e.data);
      //receiveBlob(makeBlob());// Tryout
    }
    
  }
  
  function makeBlob() {
    //console.time("make blob");
    var blob = new Blob(chunks, { 'type':mime });
    chunks = [];
    //console.log("data processed");
    //console.timeEnd("make blob");
    return {
      mime : mime,
      ext : ext,
      size : blob.size,
      blob : blob
    };
  }
  
}// end RecorderMR

mc.rb.Feedback=function(getDataCb, indicator, viewR) {
  var isOn=false,
      myElement=false,
      plr=document.getElementById("playerRoom"),
      stream,
      canvas=false
      ;
  
  this.toggle=function() {
    if (isOn) {
      off();
      isOn=false;
    }
    else { isOn=on(); }
    return false;
  };
  
  function on() {
    var aov = mc.userParams.rb.audioOrVideo;
    if (aov !== "video") {
      fail("Feedback works only in video mode, got "+aov);
      return false;
    }
    
    if ( ! canvas) displayStream();
    else displayCanvas();
    
    indicator.on();
    return true;
  }
  
  function displayStream() {
    stream=getDataCb();
    if ( ! (stream instanceof MediaStream)) {
      fail("Feedback requested MediaStream, got "+typeof stream);
      return false;
    }
    myElement=document.createElement('video');
    myElement.muted=true;
    myElement.srcObject=stream;
    if (plr.hasChildNodes()) plr.innerHTML="";
    plr.appendChild(myElement);
    myElement.play();    
  }
  
  function displayCanvas() {
    if ( ! canvas) fail("Attempt to display an empty canvas");
    if (plr.hasChildNodes()) { plr.innerHTML=""; }
    plr.appendChild(canvas);
  }
  
  function fail(err) {
    console.log('Error: ' + err);
    viewR.showMessage('Error: ' + err);
  }  
  
  function off() {
    if (myElement) myElement.pause();
    if (plr.hasChildNodes()) plr.innerHTML="";
    myElement=false;
    indicator.off();
  }
  
  this.onMDStart=function(aCanvas) {
    canvas=aCanvas;
    if ( ! isOn) return;
    displayCanvas();
    myElement=false;
  };
  
  this.onMDRedraw=function() {
    if ( ! isOn) return;
    displayCanvas();
  };
  
  this.onMDStop=function() {
    if ( ! isOn) { canvas=false; return; }
    displayStream();
    canvas=false;    
  };
  
}

mc.rb.ViewR=function() {
  var _this=this,
      hideable=$("recorderPanel").getElementsByClassName("hideable"),
      showMore=0;
      
  function getShowMore() { return showMore; }
  function setShowMore(s) { showMore=s; }
  
  var spt=mc.serverParams.serverPath;
  this.audios={
    open : { src : spt+"assets/i30_open.mp3", el : new Audio() }
  };
  this.audios.open.el.src=this.audios.open.src;
  
  this.toggleHideable=function() { mc.utils.toggleHideable(hideable,getShowMore,setShowMore); };
  this.toggleHideable();
  
  this.recIndicator=new mc.utils.Indicator("recordBtn", 
    [["Record","auto"], ["Recording","recording"], ["Inactive","auto"]],
    "h", 2
  );
  
  this.feedbackIndicator=new mc.utils.Indicator("feedbackBtn", 
    [["View feedback","auto"], ["Hide feedback","auto"], ["Inactive","auto"]],
    "h", 0
  );
  
   this.motionIndicator=new mc.utils.Indicator("motionDetectorBtn", 
    [["Motion Detector","auto"], ["On alert","alert"], ["Get ready...","auto"]],
    "h", 0
  );
  
  //this.uploadIndicator=new mc.utils.Indicator("uploadIndBtn", [["","auto"], ["","ye"]] );
  
  this.showLocalPlay=function(url,bytes) {
    $("downloadLink").innerHTML = '<a href="'+url+'" target="_blank">The file</a>';
    $("blobSizeS").innerHTML=mc.utils.b2kb(bytes);
    $("localPlayS").style.display="";
  };
  
  this.hideLocalPlay=function() {
    $("downloadLink").innerHTML = '';
    $("blobSizeS").innerHTML='';
    $("localPlayS").style.display="none";
  };
  
  this.hideLocalPlay();
  
  this.clearUrl=function() { $("downloadLink").innerHTML=""; };
  
  this.showTiming=function(t) { $("timerInd").value=t; };
  
  this.showChatPin=function(s) { $("chatPinS").innerHTML=s; };
  
  this.showMessage=function(m) { $("recorderAlertP").innerHTML=m; };
  this.clearMessage=function(m) { $("recorderAlertP").innerHTML=""; };
  
  this.serverParams2dom=function(sp) {
    if (sp.hasOwnProperty("showMore")) {
      showMore=sp.showMore;
      this.toggleHideable();     
    }
    if (sp.maxBlobBytes) $("maxSizeS").innerHTML=mc.utils.b2kb(sp.maxBlobBytes);
    if (sp.clipLifetimeSec) $("lifetimeS").innerHTML=mc.utils.s2dhms(sp.clipLifetimeSec);
    if (sp.maxMediaFolderBytes) $("folderSizeS").innerHTML=mc.utils.b2kb(sp.maxMediaFolderBytes);
    if (sp.maxClipCount > 0) $("maxClipCountS").innerHTML=sp.maxClipCount;
    else if (sp.hasOwnProperty("maxClipCount")) $("maxClipCountS").innerHTML="unlimited";
    if (sp.allowVideo && sp.allowVideo === "0") sp.allowVideo=0;
    if (sp.videoOn && sp.videoOn === "0") sp.videoOn=false;
    if (sp.allowVideo) {
      $("audioOrVideoS").style.display="";
      //alert(sp.videoOn+" "+mc.utils.getRadio("audioOrVideoRad"));
      if (sp.videoOn) mc.utils.setRadio("audioOrVideoRad","video");
    }
    else { $("audioOrVideoS").style.display="none"; }
    if (sp.maxClipSizeSec) {
      $("chunkInp").value=sp.maxClipSizeSec;
      //mc.utils.setRadio("chunkRad","custom");
      mc.utils.setSelect("chunkSelect","custom");
    }
    if (sp.allowStream && sp.allowStream === "0") sp.allowStream=0;
    if (sp.allowStream) {
      $("onrecordedS").style.display="";
      if (sp.onRecorded) { mc.utils.setRadio("onrecordedRad",sp.onRecorded); }
    }
    else { 
      $("onrecordedS").style.display="none";
      sp.onRecorded="stop";
      mc.utils.setRadio("onrecordedRad",sp.onRecorded);
    }    
  };
  
  this.getParams=function() {
    var chunkSizeS=mc.utils.getSelect("chunkSelect");//mc.utils.getRadio("chunkRad");
    if (chunkSizeS == "custom") {
      var c=chunkSizeS=parseInt($("chunkInp").value,10);
      //alert(chunkInp.value+"/"+c);
      if ( ( ! c ) || (c != c) ) {// empty or nan
        chunkSizeS=1;
        mc.utils.setSelect("chunkSelect",1);
      }
    }
    else { $("chunkInp").value=""; }
    document.activeElement.blur();
    return {
      user : $("userInput").value,
      realm : $("realmInput").value,
      audioOrVideo : mc.utils.getRadio("audioOrVideoRad"),
      onrecorded : mc.utils.getRadio("onrecordedRad"),
      description : $("descriptionInput").value,
      chunkSizeS : chunkSizeS,
      holdPlayWhileRec : $("holdPlayWhileRecChkb").checked
    };
  };
  
  this.setHandlers=function(initRecorder, toggleRecorder, playLocally, uploadStoredBlob,
                            toggleFeedback, toggleMotionDetector, toggleChatController) {
    if ( ! initRecorder instanceof Function) throw new Error("Wrong initRecorder");
    if ( ! toggleRecorder instanceof Function) throw new Error("Wrong toggleRecorder");
    if ( ! playLocally instanceof Function) throw new Error("Wrong playLocally");
    if ( ! uploadStoredBlob instanceof Function) throw new Error("Wrong uploadStoredBlob");
    if ( ! toggleFeedback instanceof Function) throw new Error("Wrong toggleFeedback");
    if ( ! toggleMotionDetector instanceof Function) throw new Error("Wrong toggleMotionDetector");
    if ( ! toggleChatController instanceof Function) throw new Error("Wrong toggleChatController");
    $("audioOrVideoRad1").onchange=initRecorder;
    $("audioOrVideoRad2").onchange=initRecorder;
    $("recordBtn").onclick=toggleRecorder;
    $("playHereBtn").onclick=playLocally;
    $("uploadStoredBtn").onclick=uploadStoredBlob;
    $("feedbackBtn").onclick=toggleFeedback;
    $("motionDetectorBtn").onclick=toggleMotionDetector;
    $("chatControlChkb").onchange=toggleChatController;
    // keyboard events are managed at the higher level by KeyboardMonitor
    $("toggleHideableRecB").onclick=_this.toggleHideable;
  };
  
  function blurSelect() {
    $("chunkSelect").onchange=function() { 
      document.activeElement.blur();// otherwise it will catch onkeypressed 
    };    
  }
  blurSelect();
  
  $("chatControlChkb").checked=false;

}// end ViewR
