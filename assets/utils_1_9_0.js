"use strict";
if( ! mc) mc={};
mc.utils={};

mc.utils.checkBrowser=function() {
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

mc.utils.checkRecorderMime=function(te, audioOrVideo) {
  if(audioOrVideo != "audio" && audioOrVideo != "video") throw new Error("Wrong argument="+audioOrVideo+"!");
  var mimes =  {
    audio : [
      "audio/webm", "audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mpeg3", "audio/mpeg", "audio/midi", "audio/wav", "audio/flac"
    ],
    video : [
      "video/webm", "video/webm;codecs=vp8", "video/webm;codecs=daala", "video/webm;codecs=h264", "video/mpeg"
    ]
  };
  var recorderMimes = { audio:[], video:[] }, t;
  var mime,tex,ext,chosenMime=false,chosenExtension=false,chosenParams={};
  var outcome="?";
  
  for(t in mimes.audio) { if (MediaRecorder.isTypeSupported(mimes.audio[t])) recorderMimes.audio.push(mimes.audio[t]); }
  for(t in mimes.video) { if (MediaRecorder.isTypeSupported(mimes.video[t])) recorderMimes.video.push(mimes.video[t]); }
  tex=new mc.utils.TypesExtensions(te, audioOrVideo);
  for(t in recorderMimes[audioOrVideo]) { 
    mime=recorderMimes[audioOrVideo][t]
    ext=tex.mime2ext(mime);
    if(ext) {
      chosenMime=mime;
      chosenExtension=ext;
      chosenParams=tex.mime2params(chosenMime);
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
    chosenParams:chosenParams,
    outcome:outcome
  };
};

mc.utils.TypesExtensions=function(te,audioOrVideo) {
  if( ! te.audio || ! te.video) throw new Error("Wrong dictionary");
  
  this.ext2mime=function(ext) {
    var mime;
    //return false;// DEBUG mime fault logging
    for (mime in te[audioOrVideo]) {
      if ( te[audioOrVideo].hasOwnProperty(mime) && te[audioOrVideo][mime][0] === ext ) return mime;
    }
    return false;
  };
  
  this.mime2ext=function(mime) {
    if ( te[audioOrVideo].hasOwnProperty(mime) ) return te[audioOrVideo][mime][0];
    return false;
  };
  
  this.mime2params=function(mime) {
    var str="";
    if ( te[audioOrVideo].hasOwnProperty(mime) ) {
      str=te[audioOrVideo][mime][1];
      //alert("Params:"+JSON.stringify(str));
      if (str) return str;
      else return {};
    }  
    return false;
  };
};

mc.utils.dumpArray=function(x) {
  var res="",i,expanded;
  if (typeof x == "object") {
    res+="{ ";
    for (i in x) {
      if (x.hasOwnProperty(i)) {
        res+=" "+i+":"+mc.utils.dumpArray(x[i]);
      }  
    }
    res+=" }";
  }
  else res+=""+x;
  return res;  
};

mc.utils.b2kb=function (b) { return Math.ceil(b/1000)+"KB" };

mc.utils.s2dhms=function(sec) {
  var r="", day=86400, hour=3600, min=60, d, h, m, s;
  d=Math.floor(sec/day);
  if(d) { 
    r+=d+"d"; 
    sec=sec-d*day;
  }
  h=Math.floor(sec/hour);
  if(h) {
    if(d) r+=" ";
    r+=h+"h"; 
    sec=sec-h*hour;
    if(d) return r;
  }
  m=Math.floor(sec/min);
  if(m) {
    if(h) r+=" ";
    r+=m+"m";
    sec=sec-m*min;
    if(h) return r;
  }
  if(sec) {
    if(m) r+=" ";
    r+=sec+"s";
  }
  return r;
};

mc.utils.Ajaxer=function (responderUrl,onDataReceived,indicator) {
  if(typeof onDataReceived != "function") throw new Error("Non-function callback argument");
  if( ! indicator.on) indicator={on:function(){}, off:function(){}}; 
  var urlOffset="";
  if (typeof URLOFFSET != "undefined") urlOffset=URLOFFSET;
  var lag=0, timer=false, busy=false;
  
  var _this=this, req;
    
  this.postRequest=function(what) {
    if ( ! what) throw new Error ("no data");
    if(busy) throw new Error("Ajaxer "+responderUrl+" is busy");
    timer=Date.now();
    req=new XMLHttpRequest();
    req.open("POST",urlOffset+responderUrl,true); // POST
    //req.setRequestHeader("Content-Type","multipart/form-data");// for POST; should go _after_ req.open!//application/x-www-form-urlencoded
    req.onreadystatechange=receive;// both
    var q=req.send(what); // POST
    indicator.on();
    busy=true;
  };
  
  this.getRequest=function(queryString) {
    if(busy) throw new Error("Ajaxer "+responderUrl+" is busy");
    timer=Date.now();
    req=new XMLHttpRequest();
    req.open("GET",urlOffset+responderUrl+"?"+queryString); // GET
    req.onreadystatechange=receive;// both
    var q=req.send(null); // GET
    indicator.on();
    busy=true;
  };
  
  function receive() {
    var rdata,rmime;
    
    if (req.readyState != 4) return;
    if(req.status != 200 && req.status != 204 && req.status != 304) {
      console.log(responderUrl+" ajax returned error "+req.status);
      req=null;
      return;
    }
    lag=Date.now()-timer;
    indicator.off();
    busy=false;
    if(req.status != 200  && req.status != 304) {
      console.log("ajax returned code "+req.status);
      //onDataReceived(req.status);
      req=null;
      return;
    }
    if(req.status == 304) {
      //console.log("304 "+lag);
      onDataReceived({ alert : "No changes", lag : lag });
      req=null;
      return;
    }
    rdata=req.responseText;
    rmime=req.responseType;
    req=null;
    //alert(rmime);
    if(rmime === "" || rmime == "json" || rmime == "text") rdata=tryJsonParse(rdata);
    onDataReceived(rdata);
    //setTimeout(function() { onDataReceived(rdata) }, 0);
  }
  
  function tryJsonParse(responseText) {
    if( ! responseText) return responseText;
    var responseObj={};
    try { 
      responseObj=JSON.parse(responseText); 
    }
    catch (err) {
      //alert ("Unparsable server response:"+responseText);
      console.log("Unparsable server response:"+responseText);
      return responseText;
    }
    responseObj.lag=lag;
    return responseObj;
  }
  
  this.getLag=function() { return lag; };
  
  this.isBusy=function() { return busy; };
  
};// end Ajaxer

mc.utils.getRadio=function(name) {
  return document.querySelector('input[name="'+name+'"]:checked').value;  
};

mc.utils.setRadio=function(name,value) {
  var btn=document.querySelector('input[name="'+name+'"][value="'+value+'"]');
  if(btn) {
    btn.checked="checked";
    document.activeElement.blur();// otherwise it will catch onkeypressed
  }
};

mc.utils.getSelect=function(id) {
  var el=document.getElementById(id);
  var v=el.options[el.selectedIndex].value;
  return v;  
};

mc.utils.setSelect=function(id,value) {
  var el=document.getElementById(id);
  if ( ! el) throw new Error("Wrong id="+id);
  el.value=value;
  document.activeElement.blur();// otherwise it will catch onkeypressed
};

mc.utils.setCheckbox=function(id,value) {
  var el=document.getElementById(id);
  if ( ! el) throw new Error("Wrong id="+id);
  if(value === "0" || value === 0 || value === false) el.checked="";
  else el.checked="checked";
  document.activeElement.blur();
};

mc.utils.blockMobileZoom=function() {
  var meta=document.createElement("meta");
  meta.name="viewport";
  meta.content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0";
  document.head.appendChild(meta);
};

mc.utils.getScreenParams=function() {
  var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  var isPortrait=(width < height);
  return { isPortrait:isPortrait, width:width, height:height };
}

mc.utils.addCss=function(str) {
  var css = document.createElement("style");
  css.type = "text/css";
  css.innerHTML = str;
  document.body.appendChild(css);
};

mc.utils.play=function(url,audioOrVideo,playerRoom,errorHandler) {    
  var a, plr;
  if( playerRoom instanceof HTMLElement) plr=playerRoom=document.getElementById(playerRoom);
  else plr=document.getElementById(playerRoom);
  if( ! plr) throw new Error("Wrong PLAYERROOM");
  if( ! url) { console.log("Empty url"); return; }
  if(audioOrVideo == "audio") {
    a=new Audio();
  }
  else if(audioOrVideo == "video") {
    a = document.createElement('video');
  }
  else throw new Error("Wrong AUDIOORVIDEO="+audioOrVideo);
  if(errorHandler && typeof errorHandler != "function") throw new Error("Invalid ERRORHANDLER");
  a.src=url;
  a.controls="controls";
  if(plr.hasChildNodes()) plr.innerHTML="";
  plr.appendChild(a);
  a.play();
  
  a.onended=function(){ 
    setTimeout( function() { plr.innerHTML=""; }, 1 ); 
  };
  
  if(errorHandler) a.onerror=function() { errorHandler(a.error.message); return false; };
};

mc.utils.KeyboardMonitor=function(onSpacePressed, onSpaceReleased, onEsc) {
  // deals with serial onkeydown+onkeyup in Windows
  var counter=0, watching=false, to;
  
  document.onkeydown = function(e){
    var keycode = window.event ? window.event.keyCode : e.which;
    if(keycode == 27) {
      onEsc();
      return false;
    }
    if(document.activeElement.type == "text") { return; }
    if(keycode == 32) {
      if( ! watching && ! counter) onSpacePressed();
      counter+=1;
      //console.log(" keydown "+counter);
      if( ! watching) {
        watching=true;
        to=setTimeout(
          checkout
        ,400);
      }
      return false;
    }
    if(keycode == 32) return false;// prevents scrolling to the bottom
  };
  
  function checkout() {
    if(counter == 0) { 
      //console.log(" release ");
      watching=false;
      onSpaceReleased();
      return true; 
    }
    else { 
      counter=0;
      to=setTimeout(
        checkout
      ,200);
      return false; 
    }
  }
}