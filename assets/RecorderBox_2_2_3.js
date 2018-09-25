"use strict";
if ( ! mc) mc={};//namespace
mc.rb={};

mc.rb.RecorderBox=function(onBeforerecording, onAfterrecording) {
  var _this=this, viewR={}, recorder={};
  var blobPlus={}, userParams={}, serverParams={};
  var recordingTime=0, lastRecordedTime=0, timingOn=0, serialTime=0;
  var floodLimitS=120;
  var upConnection={};
  
  this.init=function(fromServer) {
    serverParams=fromServer;
    
    viewR=new mc.rb.ViewR();
    viewR.applyServerParams(serverParams);
    userParams=viewR.getParams();
    //console.log(mc.utils.dumpArray(userParams));
    
    upConnection=new mc.rb.UpConnection(fromServer.pathBias+"upload.php", takeResponseR, onHang,  serverParams, userParams, viewR.uploadIndicator);
    
    checkMime();
    
    recorder=new mc.rb.RecorderMR(onBlobReady, viewR.setIndicator, viewR);
    recorder.init(userParams);
    
    setInterval(_this.onTick, 1000);
    
    viewR.setHandlers(_this.recorderInit, _this.recorderToggle, _this.playLocally, _this.uploadStoredBlob);
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
  
  _this.onTick=function() {
    if ( ! timingOn) return;
    recordingTime+=1;
    viewR.showTiming(recordingTime);
    if (overFloodLimit()) { _this.recorderOff(); return; }  
    if (recordingTime < userParams.chunkSizeS) return;
    if (userParams.onrecorded == "stop") { _this.recorderOff(); }
    else if (userParams.onrecorded == "upload") { _this.recorderRestart(); }
  };
  
  function overFloodLimit() {
    serialTime+=1;
    if (serialTime <= floodLimitS) return "";
    var errmsg="Recording session is limited to "+floodLimitS+"s";
    console.log(errmsg);
    viewR.showMessage(errmsg);
    return errmsg;   
  }
  
  _this.recorderInit=function() { 
    _this.recorderOff();
    userParams=viewR.getParams();
    recorder.init(userParams);
  }
  
  _this.recorderOff=function() {
    recorder.onOff(0);
    timingOn=0;
    lastRecordedTime=recordingTime;
    viewR.showTiming(lastRecordedTime);
    onAfterrecording();
    return false;
  };
  
  _this.recorderOn=function() {
    userParams=viewR.getParams();
    viewR.hideLocalPlay();
    onBeforerecording(userParams);
    blobPlus={};
    recorder.onOff(1);
    timingOn=1;
    recordingTime=0;
    serialTime=0;
    viewR.showTiming(recordingTime);
    return false;
  };
  
  _this.recorderRestart=function() {
    recorder.restart();
    lastRecordedTime=recordingTime;
    recordingTime=0;
    return false;
  };
  
  _this.recorderToggle=function() {
    var s=recorder.getState();
    if (s) _this.recorderOff();
    else _this.recorderOn();
    return false;
  };
  
  _this.playLocally=function() {    
    mc.utils.play(blobPlus.localUrl, userParams.audioOrVideo, "playerRoom");
  };
  
  _this.uploadStoredBlob=function() { 
    userParams=viewR.getParams();
    uploadBlobAndData(blobPlus);
  };
  
  this.getUpConnection=function() { return upConnection; };
  
  function onHang() {
    viewR.showMessage("Request timed out");
  }
  
  function onBlobReady(blobPlusData) {    
    if (userParams.onrecorded == "upload" && serverParams.allowStream && serverParams.allowStream !== "0") {
      uploadBlobAndData(blobPlusData); 
    }
    else if (userParams.onrecorded == "stop") allowLocalDownload(blobPlusData);
    else throw new Error("Not to get here");
  }

  function allowLocalDownload(blobPlusData) {
    var audioURL=URL.createObjectURL(blobPlusData.blob);
    blobPlus=blobPlusData;// keep for possible upload
    viewR.showLocalPlay(audioURL, blobPlusData.size);
    blobPlus.localUrl=audioURL;
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
    viewR.applyServerParams({ allowStream : serverParams.allowStream, onRecorded : "stop" });
    userParams=viewR.getParams();
    return errmsg;
  }

  function takeResponseR(resp) { 
    //alert(resp);
    if (resp.error) viewR.showMessage("Error! "+resp.error);
    else if (resp.alert) viewR.showMessage(resp.alert+" fulfiled in "+resp.lag+"ms");
    else viewR.showMessage(resp.alert || mc.utils.dumpArray(resp) || "<empty>");
  }

}// end RecorderBox

mc.rb.UpConnection=function(respondrUri, onData, onHang, serverParams, userParams, indicator) {
  var _this=this;
  var ajaxerR=new mc.utils.Ajaxer(respondrUri, onData, indicator, onHang);
  
  this.linkIsBusy=function() { return ajaxerR.isBusy(); };
  
  this.sendBlobAndData=function(blobPlusData,lastRecordedTime,description) {
    var stuff;
    stuff=new FormData();
    stuff.append("act","uploadBlob");
    stuff.append("user",userParams.user);
    stuff.append("realm",userParams.realm);
    stuff.append("description",description);
    stuff.append("mime",blobPlusData.mime);
    stuff.append("ext",blobPlusData.ext);
    stuff.append("duration",lastRecordedTime);
    stuff.append("blob",blobPlusData.blob);
    ajaxerR.postRequest(stuff);
  };

  this.reportMimeFault=function(recorderMimes) {
    var  stuff=new FormData();
    stuff.append("act","reportMimeFault");
    stuff.append("user",userParams.user);
    stuff.append("realm",userParams.realm);
    stuff.append("mimesList",mc.utils.dumpArray(recorderMimes));
    ajaxerR.postRequest(stuff);
  };
  
  _this.sendClear=function() {
    var  stuff=new FormData();
    stuff.append("act","clearMedia");
    stuff.append("user",userParams.user);
    stuff.append("realm",userParams.realm);
    ajaxerR.postRequest(stuff);
  }
  
  _this.sendDelete=function(file) {
    var  stuff=new FormData();
    stuff.append("act","delete");
    stuff.append("user",userParams.user);
    stuff.append("realm",userParams.realm);
    stuff.append("id",file);
    ajaxerR.postRequest(stuff);    
  };
  document.activeElement.blur();
  _this.sendRemoveExpired=function() {
    var  stuff=new FormData();
    stuff.append("act","removeExpired");
    stuff.append("user",userParams.user);
    stuff.append("realm",userParams.realm);
    ajaxerR.postRequest(stuff);  
  };
  
  this.sendGetCatalog=function() {
    var  stuff=new FormData();
    stuff.append("act","getCatalog");
    stuff.append("user",userParams.user);
    stuff.append("realm",userParams.realm);
    ajaxerR.postRequest(stuff);  
  };
  
};

mc.rb.RecorderMR=function(receiveBlob,indicate,viewR) {  
  if (typeof receiveBlob != "function") throw new Error("No receiver callback given");
  
  var chunks = [];
  var _this=this;
  var isOn=0;
  var mime,ext,params={};
  
  if (typeof indicate != "function") {
    console.log("RecorderMR: wrong INDICATE");
    indicate=function(){};
  }
  
  _this.onOff=function() { return false; };
  
  _this.getState=function() { return isOn };
  
  this.init=function(userParams) {
    var constraints={ audio: true }, aov=userParams.audioOrVideo, rm;
    if (aov == "video") constraints.video=true;
    rm=mc.utils.checkRecorderMime(mc.mimeDictionary, aov);
    if ( ! rm) throw new Error("Something is wrong with MIME detection");
    mime=rm.chosenMime; 
    ext=rm.chosenExtension;
    params=rm.chosenParams;
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
    
    indicate("ready");
    
    _this.onOff=function(a) {
      if (a === "*") a= ! isOn;
      else if (a == isOn) return false;
      
      if (a) {
        isOn=1;
        mediaRecorder.start();
        indicate("recording");
      }
      else {
        isOn=0;
        mediaRecorder.stop();
        indicate("ready");
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

mc.rb.ViewR=function() {
  var _this=this;
  
  _this.setIndicator=function(s) {
    switch (s) {
    case "ready":
      $("recordBtn").innerHTML="Record";
      $("recordBtn").classList.remove("recording");
      break;
    case "recording":
      $("recordBtn").classList.add("recording");
      break;
    default:
      throw new Error("Unknown state="+s);
    }    
  };
  
  _this.uploadIndicator={
    on : function() { $("uploadIndBtn").style.background = "yellow"; },
    off : function() { $("uploadIndBtn").style.background = ""; }  
  };
  
  _this.showLocalPlay=function(url,bytes) {
    $("downloadLink").innerHTML = '<a href="'+url+'" target="_blank">The file</a>';
    $("blobSizeS").innerHTML=mc.utils.b2kb(bytes);
    $("localPlayS").style.display="";
  };
  
  _this.hideLocalPlay=function() {
    $("downloadLink").innerHTML = '';
    $("blobSizeS").innerHTML='';
    $("localPlayS").style.display="none";
  };
  
  _this.hideLocalPlay();
  
  _this.clearUrl=function() { $("downloadLink").innerHTML=""; };
  
  _this.showTiming=function(t) { $("timerInd").value=t; };
  
  _this.showMessage=function(m) { $("recorderAlertP").innerHTML=m; };
  _this.clearMessage=function(m) { $("recorderAlertP").innerHTML=""; };
  
  _this.applyServerParams=function(sp) {
    if (sp.maxBlobBytes) $("maxSizeS").innerHTML=mc.utils.b2kb(sp.maxBlobBytes);
    if (sp.clipLifetimeSec) $("lifetimeS").innerHTML=mc.utils.s2dhms(sp.clipLifetimeSec);
    if (sp.maxMediaFolderBytes) $("folderSizeS").innerHTML=mc.utils.b2kb(sp.maxMediaFolderBytes);
    if (sp.maxClipCount > 0) $("maxClipCountS").innerHTML=sp.maxClipCount;
    else $("maxClipCountS").innerHTML="unlimited";
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
  
  _this.getParams=function() {
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
  
  _this.setHandlers=function(initRecorder, toggleRecorder, playLocally, uploadStoredBlob) {
    $("audioOrVideoRad1").onchange=initRecorder;
    $("audioOrVideoRad2").onchange=initRecorder;
    $("recordBtn").onclick=toggleRecorder;
    $("playHereBtn").onclick=playLocally;
    $("uploadStoredBtn").onclick=uploadStoredBlob;
    // keyboard events are managed at the higher level by KeyboardMonitor
  };
  
  function blurSelect() {
    $("chunkSelect").onchange=function() { 
      document.activeElement.blur();// otherwise it will catch onkeypressed 
    };    
  }
  blurSelect();

}// end ViewR