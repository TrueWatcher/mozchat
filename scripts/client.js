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

Utils.checkRecorderMime=function(audioOrVideo) {
  if(audioOrVideo != "audio" && audioOrVideo != "video") throw new Error("Wrong argument="+audioOrVideo+"!");
  var mimes =  {
    audio : [
      "audio/webm", "audio/webm\;codecs=opus", "audio/ogg\;codecs=opus", "audio/mpeg3", "audio/mpeg", "audio/midi", "audio/wav", "audio/flac"
    ],
    video : [
      "video/webm", "video/webm\;codecs=vp8", "video/webm\;codecs=daala", "video/webm\;codecs=h264", "video/mpeg"
    ]
  };
  var recorderMimes = { audio:[], video:[] }, t;
  var te,ext,chosenMime=false,chosenExtension=false;
  var outcome="?";
  
  for(t in mimes.audio) { if (MediaRecorder.isTypeSupported(mimes.audio[t])) recorderMimes.audio.push(mimes.audio[t]); }
  for(t in mimes.video) { if (MediaRecorder.isTypeSupported(mimes.video[t])) recorderMimes.video.push(mimes.video[t]); }
  te=new Utils.TypesExtensions(audioOrVideo);
  for(t in recorderMimes[audioOrVideo]) { 
    ext=te.mime2ext(recorderMimes[audioOrVideo][t]);
    if(ext) {
      chosenMime=recorderMimes[audioOrVideo][t];
      chosenExtension=ext;
      break;
    }      
  }
  
  if( ! recorderMimes[audioOrVideo].length) outcome="Empty mime types list";
  else if( ! chosenMime) outcome="Unknown mime types";
  else outcome=true;
  
  return {
    recorderMimes:recorderMimes,
    chosenMime:chosenMime,
    chosenExtension:chosenExtension,
    outcome:outcome
  };
};

Utils.TypesExtensions=function(audioOrVideo) {
  var te={
    audio : {
      "oga":"audio/ogg\;codecs=opus", "webm": "audio/webm\;codecs=opus", "wav":"audio/wav"
    },
    video : {
      "webm":"video/webm;codecs=vp8"
    }
  };
  
  this.mime2ext=function(mime) {
    var ext;
    for(ext in te[audioOrVideo]) {
      if( te[audioOrVideo].hasOwnProperty(ext) && te[audioOrVideo][ext] === mime ) return ext;
    }
    return false;
  };
  
  this.ext2mime=function(ext) {
    if( te[audioOrVideo].hasOwnProperty(ext) ) return te[audioOrVideo][ext];
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

Utils.getRadio=function(name) {
  return document.querySelector('input[name="'+name+'"]:checked').value;  
};

Utils.setRadio=function(name,value) {
  var btn=document.querySelector('input[name="'+name+'"][value="'+value+'"]');
  if(btn) btn.checked="checked";
};

Utils.setCheckbox=function(id,value) {
  var el=document.getElementById(id);
  if(value === "0" || value === 0 || value === false) el.checked="";
  else el.checked="checked";
};

