"use strict";
var Utils={};

Utils.checkBrowser=function() {
  var mediaDevices= !! navigator.mediaDevices;
  var mediaRecorder= !! MediaRecorder;
  var plainGetUserMedia= !! navigator.getUserMedia;
  var outcome="?";
  
  if( ! mediaDevices) outcome="No navigator.mediaDevices";
  else if( ! mediaRecorder) outcome="No MediaRecorder";
  else outcome=true;
  
  return {
    mediaDevices:mediaDevices,
    mediaRecorder:mediaRecorder,
    plainGetUserMedia:plainGetUserMedia,
    outcome:outcome
  };
};

Utils.checkRecorderMime=function() {
  var mimesAudio = [
    "audio/webm", "audio/webm\;codecs=opus", "audio/ogg\;codecs=opus", "audio/mpeg3", "audio/mpeg", "audio/midi", "audio/wav", "audio/flac"
  ];
  var mimesVideo= [
    "video/webm", "video/webm\;codecs=vp8", "video/webm\;codecs=daala", "video/webm\;codecs=h264", "video/mpeg"
  ];
  var recorderMimesAudio=[],recorderMimesVideo=[],t;
  var te,ext,chosenMime=false,chosenExtension=false;
  var outcome="?";
  
  for(t in mimesAudio) { if (MediaRecorder.isTypeSupported(mimesAudio[t])) recorderMimesAudio.push(mimesAudio[t]); }
  for(t in mimesVideo) { if (MediaRecorder.isTypeSupported(mimesVideo[t])) recorderMimesVideo.push(mimesVideo[t]); }
  te=new Utils.TypesExtensions();
  for(t in recorderMimesAudio) { 
    ext=te.mime2ext(recorderMimesAudio[t]);
    if(ext) {
      chosenMime=recorderMimesAudio[t];
      chosenExtension=ext;
      break;
    }      
  }
  
  if( ! recorderMimesAudio.length) outcome="Empty mime types list";
  else if( ! chosenMime) outcome="Unknown mime types";
  else outcome=true;
  
  return {
    recorderMimesAudio:recorderMimesAudio,
    recorderMimesVideo:recorderMimesVideo,
    chosenMime:chosenMime,
    chosenExtension:chosenExtension,
    outcome:outcome
  };
};

Utils.TypesExtensions=function() {
  var te={
    "oga":"audio/ogg\;codecs=opus", "webm": "audio/webm\;codecs=opus", "wav":"audio/wav"
  };
  
  this.mime2ext=function(mime) {
    var ext;
    for(ext in te) {
      if(te.hasOwnProperty(ext) && te[ext] === mime ) return ext;
    }
    return false;
  };
  
  this.ext2mime=function(ext) {
    if(te.hasOwnProperty(ext)) return te[ext];
    return false;
  };
};

Utils.dumpArray=function(x) {
  var res="",i,expanded;
  if(typeof x == "object") {
    res+="{ ";
    for(i in x) {
      if(x.hasOwnProperty(i)) {
        res+=" "+i+":"+Utils.dumpArray(x[i]);
      }  
    }
    res+=" }";
  }
  else res+=""+x;
  return res;  
};

Utils.b2kb=function (b) { return Math.ceil(b/1000)+"KB" };

Utils.Ajaxer=function (responderUrl,onDataReceived,indicator) {
  if(typeof onDataReceived != "function") throw new Error("Non-function callback argument");
  if( ! indicator.on) indicator={on:function(){}, off:function(){}}; 
  var urlOffset="";
  if (typeof URLOFFSET != "undefined") urlOffset=URLOFFSET;
  
  var _this=this, req;
    
  this.postRequest=function(what) {
    if ( ! what) throw new Error ("no data");
    req=new XMLHttpRequest();
    req.open("POST",urlOffset+responderUrl,true); // POST
    //req.setRequestHeader("Content-Type","multipart/form-data");// for POST; should go _after_ req.open!//application/x-www-form-urlencoded
    req.onreadystatechange=receive;// both
    var q=req.send(what); // POST
    indicator.on();
  };
  
  this.getRequest=function(queryString) {
    req=new XMLHttpRequest();
    req.open("GET",urlOffset+responderUrl+"?"+queryString); // GET
    req.onreadystatechange=receive;// both
    var q=req.send(null); // GET
    indicator.on();
  };
  
  function receive() {
    if (req.readyState != 4) return;
    if(req.status != 200 && req.status != 201 && req.status != 304) {
      console.log("ajax returned code "+req.status);
      return;
    }
    indicator.off();
    if(req.status != 200) {
      onDataReceived(req.status);
      return;
    }
    var rdata=req.responseText;
    var rmime=req.responseType;
    //alert(rmime);
    if(rmime === "" || rmime == "json" || rmime == "text") rdata=tryJsonParse(rdata);
    onDataReceived(rdata);
  }
  
  function tryJsonParse(responseText) {
    var responseObj={};
    try { 
      responseObj=JSON.parse(responseText); 
    }
    catch (err) {
      //alert ("Unparsable server response:"+responseText);
      console.log("Unparsable server response:"+responseText);
      return responseText;
    }
    return responseObj;
  }
  
};// end Ajaxer

