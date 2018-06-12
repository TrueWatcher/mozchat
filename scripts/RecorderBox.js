"use strict";
function RecorderBox() {
  var viewR={}, timerR={}, ajaxerR={}, recorder={}, _this=this;
  var blobPlus={}, userParams={}, serverParams={};
  var recordingTime=0, lastRecordedTime=0, timingOn=0;
  
  this.init=function() {
    var found=Utils.checkBrowser();
    console.log(Utils.dumpArray(found));
    if(found.outcome !== true) {
      //console.log(Utils.dumpArray(found));
      throw new Error(found.outcome);
    }    
    var rm=Utils.checkRecorderMime();
    console.log(Utils.dumpArray(rm));
    if(rm.outcome !== true) {
      //console.log(Utils.dumpArray(found));
      throw new Error(rm.outcome);
    }
    
    viewR=new ViewR();
    userParams=viewR.getParams();
    console.log(Utils.dumpArray(userParams));
    
    ajaxerR=new Utils.Ajaxer("upload.php", getResponseR, viewR.uploadIndicator);
    
    recorder=new RecorderMR(onBlobReady, viewR.setIndicator);//allowLocalDownload);
    recorder.init();
    
    setInterval(_this.onTick, 1000);
    
    viewR.setHandlers(_this.recorderToggle, _this.playLocally, _this.uploadStoredBlob);
  };
  
  _this.onTick=function() {
    if( ! timingOn) return;
    recordingTime+=1;
    viewR.showTiming(recordingTime);
    if(recordingTime < userParams.chunkSizeS) return;
    if(userParams.onrecorded == "stop") _this.recorderOff();
    else if(userParams.onrecorded == "upload") _this.recorderRestart();
  };
  
  _this.recorderOff=function() {
    recorder.onOff(0);
    timingOn=0;
    lastRecordedTime=recordingTime;
    viewR.showTiming(lastRecordedTime);
  };
  
  _this.recorderOn=function() {
    userParams=viewR.getParams();
    viewR.hideLocalPlay();
    blobPlus={};
    recorder.onOff(1);
    timingOn=1;
    recordingTime=0;
    viewR.showTiming(recordingTime);
  };
  
  _this.recorderRestart=function() {
    recorder.restart();
    lastRecordedTime=recordingTime;
    recordingTime=0;
  };
  
  _this.recorderToggle=function() {
    var s=recorder.getState();
    if(s) _this.recorderOff();
    else _this.recorderOn();
  };
  
  _this.playLocally=function() {    
    if( ! blobPlus.localUrl) { 
      //alert("No data");
      return;
    }
    var audio=new Audio(blobPlus.localUrl);
    audio.controls="controls";
    if(playerRoom.hasChildNodes()) playerRoom.innerHTML="";
    playerRoom.appendChild(audio);
    audio.play();
  };
  
  _this.uploadStoredBlob=function() { uploadBlobAndData(blobPlus); };
  
  function onBlobReady(blobPlusData) {    
    if(userParams.onrecorded == "upload") uploadBlobAndData(blobPlusData);
    else if(userParams.onrecorded == "stop") allowLocalDownload(blobPlusData);
    else throw new Error("Not to get here");
  }

  function allowLocalDownload(blobPlusData) {
    var audioURL=URL.createObjectURL(blobPlusData.blob);
    blobPlus=blobPlusData;// keep for possible upload
    viewR.showLocalPlay(audioURL, blobPlusData.size);
    blobPlus.localUrl=audioURL;
  }

  function uploadBlobAndData(blobPlusData) {
    //var userParams=viewR.getParams();
    if(serverParams.maxUploadBytes && (blobPlusData.size > serverParams.maxUploadBytes)) {
      viewR.showMessage("Error! You have "+Utils.b2kb(blobPlusData.size)+", server allows only "+Utils.b2kb(serverParams.maxUploadBytes));
      return;
    }
    var stuff=new FormData();
    stuff.append("act","upload");
    stuff.append("user",userParams.user);
    stuff.append("realm",userParams.realm);
    stuff.append("description",userParams.description);
    stuff.append("mime",blobPlusData.mime);
    stuff.append("ext",blobPlusData.ext);
    stuff.append("duration",lastRecordedTime);
    stuff.append("blob",blobPlusData.blob);
    ajaxerR.postRequest(stuff);
  }

  function getResponseR(resp) { 
    //alert(resp);
    if(resp.error) viewR.showMessage("Error! "+resp.error);
    else viewR.showMessage(resp.alert || Utils.dumpArray(resp) || "<empty>");
  }
  
  this.setServerParams=function(s) { serverParams=s; };
  
}

function RecorderMR(receiveBlob,indicate) {  
  if(typeof receiveBlob != "function") throw new Error("No receiver callback given");
  
  var chunks = [];
  var _this=this;
  var isOn=0;
  var mime,ext;
  
  if(typeof indicate != "function") {
    console.log("RecorderMR: wrong INDICATE");
    indicate=function(){};
  }
  
  _this.onOff=function() { return false; };
  
  this.init=function() {
    var constraints = { audio: true };
    navigator.mediaDevices.getUserMedia(constraints).then(operate).catch(logError);
    var rm=Utils.checkRecorderMime();
    mime=rm.chosenMime; 
    ext=rm.chosenExtension;
  };
  
  function logError(err) { console.log('Error: ' + err); }
  
  function operate(stream) {
    var mediaRecorder = new MediaRecorder(stream);
    
    indicate("ready");
    
    _this.onOff=function(a) {
      if(a === "*") a= ! isOn;
      else if(a == isOn) return false;
      
      if(a) {
        isOn=1;
        mediaRecorder.start();
        indicate("recording");
      }
      else {
        isOn=0;
        mediaRecorder.stop();
        indicate("ready");
      }
      console.log("recorder "+mediaRecorder.state);
      return isOn;
    };
    
    _this.restart=function() {
      mediaRecorder.stop();
      mediaRecorder.start();
    };
    
    _this.getState=function() { return isOn };

    mediaRecorder.onstop=function() { receiveBlob(makeBlob()); };

    mediaRecorder.ondataavailable = function(e) {
      // encoding chunks without stopping the recorder gives unaudible blobs !
      chunks.push(e.data);      
    }
  }
  
  function makeBlob() {
    console.time("make blob");
    var blob = new Blob(chunks, { 'type':mime });
    chunks = [];
    console.log("data processed");
    console.timeEnd("make blob");
    return {
      mime : mime,
      ext : ext,
      size : blob.size,
      blob : blob
    };
  }
}

function ViewR() {
  var _this=this;
  
  _this.setIndicator=function(s) {
    switch(s) {
    case "ready":
      recordBtn.innerHTML="Ready";
      recordBtn.style.background = "";
      recordBtn.style.color = "";
      break;
    case "recording":
      recordBtn.innerHTML="Now recording";
      recordBtn.style.background = "red";
      recordBtn.style.color = "white";
      break;
    case "inactive":
      recordBtn.innerHTML="Writing";
      recordBtn.style.background = "yellow";
      recordBtn.style.color = "";
      break;
    case "uploading":
      recordBtn.innerHTML="Uploading";
      recordBtn.style.background = "yellow";
      recordBtn.style.color = "green";
      break;
    default:
      throw new Error("Unknown state="+s);
    }    
  };
  
  _this.uploadIndicator={
    on : function() { uploadIndBtn.style.background = "yellow"; },
    off : function() { uploadIndBtn.style.background = ""; }  
  };
  
  _this.showLocalPlay=function(url,bytes) {
    downloadLink.innerHTML = '<a href="'+url+'" target="_blank">Get file</a>';
    blobSizeS.innerHTML=Utils.b2kb(bytes);
    localPlayS.style.visibility="";
  };
  
  _this.hideLocalPlay=function() {
    downloadLink.innerHTML = '';
    blobSizeS.innerHTML='';
    localPlayS.style.visibility="hidden";
  };
  
  _this.hideLocalPlay();
  
  _this.clearUrl=function() { downloadLink.innerHTML=""; };
  
  _this.showTiming=function(t) { timerInd.value=t; };
  
  _this.showMessage=function(m) { recorderAlertP.innerHTML=m; };
  _this.clearMessage=function(m) { recorderAlertP.innerHTML=""; };
  
  _this.getParams=function() {
    var chunkSizeS=document.querySelector('input[name="chunkRad"]:checked').value;
    if(chunkSizeS == "custom") {
      var c=chunkSizeS=parseInt(chunkInp.value,10);
      //alert(chunkInp.value+"/"+c);
      if( ( ! c ) || (c != c) ) {// empty or nan
        var first=document.querySelector('input[name="chunkRad"][value="1"]');
        first.checked="checked";
        chunkSizeS=1;
      }
    }
    
    return {
      user : userInput.value,
      realm : realmInput.value,
      onrecorded : document.querySelector('input[name="onrecordedRad"]:checked').value,
      description : decriptionInput.value,
      chunkSizeS : chunkSizeS
    };
  };
  
  _this.setHandlers=function(toggleRecorder,playLocally,uploadStoredBlob) {
    recordBtn.onclick=toggleRecorder;
    playHereBtn.onclick=playLocally;
    uploadStoredBtn.onclick=uploadStoredBlob;
  };

}// end ViewR