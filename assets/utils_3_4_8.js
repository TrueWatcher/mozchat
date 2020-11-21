"use strict";
if ( ! mc) mc={};
mc.utils={};

mc.utils.checkBrowser=function() {
  var mediaDevices = typeof navigator.mediaDevices == "object";
  var mediaRecorder = typeof MediaRecorder == "function";
  var plainGetUserMedia = typeof navigator.getUserMedia == "function";
  var MediaRecorder_isTypeSupported = mediaRecorder && typeof MediaRecorder.isTypeSupported == "function";
  //var mediaRecorder_isTypeSupported = "?", mr={};
  var outcome="?";
  
  if ( ! mediaDevices) outcome="No navigator.mediaDevices";
  else if ( ! mediaRecorder) outcome="No MediaRecorder";
  else if ( ! MediaRecorder_isTypeSupported) { outcome="No MediaRecorder.isTypeSupported"; }  
  else outcome=true;
  
  return {
    mediaDevices:mediaDevices,
    mediaRecorder:mediaRecorder,
    plainGetUserMedia:plainGetUserMedia,
    MediaRecorder_isTypeSupported:MediaRecorder_isTypeSupported,
    outcome:outcome
  };
};

mc.utils.checkRecorderMime=function(te, audioOrVideo) {
  if (audioOrVideo != "audio" && audioOrVideo != "video") throw new Error("Wrong argument="+audioOrVideo+"!");
  var mimes =  {
    audio : [
      "audio/webm", "audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mpeg3", "audio/mpeg", "audio/midi", "audio/wav", "audio/flac"
    ],
    video : [
      "video/webm", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp8", "video/webm;codecs=daala", "video/webm;codecs=h264", "video/mpeg"
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
    if (ext) {
      chosenMime=mime;
      chosenExtension=ext;
      chosenParams=tex.mime2params(chosenMime);
      break;
    }      
  }
  
  if ( ! recorderMimes[audioOrVideo].length) outcome="Empty mime types list";
  else if ( ! chosenMime) outcome="Unknown mime types";
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
  if ( ! te.audio || ! te.video) throw new Error("Wrong dictionary");
  
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

mc.utils.checkAutoplay=function(audioFile, onNotallowed, onError) {
  var el=new Audio();
  //el.autoplay=false;
  el.oncanplaythrough=function() {  
    //console.log("Media is ready"); 
    var promise=el.play();
    if (promise.catch && promise.catch instanceof Function) {
      promise.catch(function(error) {
        if (error.name === "NotAllowedError") { 
          alert("You should enable autoplay in you browser");
          if (onNotallowed instanceof Function) onNotallowed();
        }
        else {
          alert("Something is wrong with media playing:"+error.name); 
          if (onError instanceof Function) onError();
        }
      });
      promise.then(function() { console.log("autoplay ok"); });
    }
  };
  el.onended=function() { document.body.removeChild(el); };
  el.src=audioFile;
  document.body.appendChild(el);
  console.log("testing autoplay...");
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
  if (d) { 
    r+=d+"d"; 
    sec=sec-d*day;
  }
  h=Math.floor(sec/hour);
  if (h) {
    if (d) r+=" ";
    r+=h+"h"; 
    sec=sec-h*hour;
    if (d) return r;
  }
  m=Math.floor(sec/min);
  if (m) {
    if (h) r+=" ";
    r+=m+"m";
    sec=sec-m*min;
    if (h) return r;
  }
  if (sec) {
    if (m) r+=" ";
    r+=sec+"s";
  }
  return r;
};

mc.utils.getRadio=function(name) {
  return document.querySelector('input[name="'+name+'"]:checked').value;  
};

mc.utils.setRadio=function(name,value) {
  var btn=document.querySelector('input[name="'+name+'"][value="'+value+'"]');
  if (btn) {
    btn.checked="checked";
    document.activeElement.blur();// otherwise it will catch onkeypressed
  }
  else throw new Error("Invalid value="+value+" for "+name);
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
  if (el.selectedIndex < 0) throw new Error("Invalid value="+value+" for "+id);
  document.activeElement.blur();// otherwise it will catch onkeypressed
};

mc.utils.setCheckbox=function(id,value) {
  var el=document.getElementById(id);
  if ( ! el) throw new Error("Wrong id="+id);
  if (value === "0" || value === 0 || value === false) el.checked="";
  else el.checked="checked";
  document.activeElement.blur();
};

mc.utils.blockMobileZoom=function() {
  var meta=document.createElement("meta");
  meta.name="viewport";
  meta.content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0";
  document.head.appendChild(meta);
};

mc.utils.Indicator=function(id,states,htmlOrValue,startState) {
  var el=document.getElementById(id);
  if ( ! el) throw new Error("Wrong Id");
  if ( ! htmlOrValue) htmlOrValue="h";
  if ( ! states instanceof Array || states.length < 2) throw new Error("Wrong STATES");
  var cl=states.length;
  var sc=allOrNone()
  if ( ! startState) startState=0;
  if (startState >= cl) throw new Error("Too big STARTSTATE");
  var state;
  adoptState(startState);
  
  this.getElement=function() { return el; };
  
  this.on=function() { adoptState(1); };
  this.off=function() { adoptState(0); };
  this.z=function() { adoptState(2); };
  this.toggle=function() {
    if (state == 0) adoptState(1);
    else if (state == 1) adoptState(0);
    else console.log("Cannot toggle z-state");
  }
    
  function adoptState(index) {
    if (sc.strings) {
      if (htmlOrValue == "h") el.innerHTML=states[index][0];
      else el.value=states[index][0];
    }
    if (sc.classes) {
      removeOtherClasses(index);
      el.classList.add(states[index][1]);      
    }
    state=index;
  }
  
  function allOrNone() {
    var withStringCount=0,
        withoutStringCount=0,
        withClassCount=0,
        withoutClassCount=0;
    for (var i=0; i < cl; i+=1) {
      if ( !! states[i][0]) withStringCount+=1;
      else withoutStringCount+=1;
      if ( !! states[i][1]) withClassCount+=1;
      else withoutClassCount+=1;
    }
    if (withStringCount != cl && withoutStringCount != cl) throw new Error("Element: "+id+" Strings must be given for all states or for no state");
    if (withClassCount != cl && withoutClassCount != cl) throw new Error("Element: "+id+" Classes must be given for all states or for no state");
    return { strings : withStringCount == cl, classes : withClassCount == cl};
  }
  
  function removeOtherClasses(stateIndex) {
    var c;
    for (var i=0; i < cl; i+=1) {
      if (i == stateIndex) continue;
      el.classList.remove(states[i][1]);
    }   
  }
  
  this.removeAllStateClasses=function() {
    var c;
    for (var i=0; i < cl; i+=1) {
      el.classList.remove(states[i][1]);
    }
  };
}// end Indicator

mc.utils.getScreenParams=function() {
  var emPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
  var isMobile = null;
  if (typeof window.matchMedia == "function") isMobile = window.matchMedia("only screen and (max-width: 760px)");
  var width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
  var isPortrait=(width < height);
  return { isPortrait:isPortrait, width:width, height:height, isMobile : isMobile, emPx : emPx };
};

mc.utils.confirmDialog=function(msg) {
// https://vancelucas.com/blog/using-window-confirm-as-a-promise/
  return new Promise(function (resolve, reject) {
    let confirmed = window.confirm(msg);

    return confirmed ? resolve(true) : reject(false);
  });
};

mc.utils.addCss=function(str) {
  var css = document.createElement("style");
  css.type = "text/css";
  css.innerHTML = str;
  document.body.appendChild(css);
};

mc.utils.setStyle=function(collection, attr, value) {
  for (var i=collection.length-1; i >= 0; i-=1) { collection[i].style[attr]=value; }    
};

mc.utils.toggleHideable=function(hideable,getShowMore,setShowMore) {
  var showMore=getShowMore();
  if (showMore) { mc.utils.setStyle(hideable,"display",""); }
  else { mc.utils.setStyle(hideable,"display","none"); }
  showMore= ! showMore;
  setShowMore(showMore);  
};

mc.utils.play=function(url,audioOrVideo,playerRoom,errorHandler) {    
  var a, plr;
  if ( playerRoom instanceof HTMLElement) plr=playerRoom;//=document.getElementById(playerRoom);
  else plr=document.getElementById(playerRoom);
  if ( ! plr) throw new Error("Wrong PLAYERROOM");
  if ( ! url) { console.log("Empty url"); return; }
  if (audioOrVideo == "audio") {
    a=new Audio();
  }
  else if (audioOrVideo == "video") {
    a = document.createElement('video');
  }
  else throw new Error("Wrong AUDIOORVIDEO="+audioOrVideo);
  if (errorHandler && typeof errorHandler != "function") throw new Error("Invalid ERRORHANDLER");
  a.src=url;
  a.controls="controls";
  plr.prepend(a);
  //plr.appendChild(a);
  a.play();
  
  a.onended=function(){ 
    setTimeout( function() { plr.removeChild(a); a=null; }, 1 ); 
  };
  
  if (errorHandler) a.onerror=function() { errorHandler(a.error.message); return false; };
};

mc.utils.KeyboardMonitor=function(onSpacePressed, onSpaceReleased, onEsc) {
  // deals with serial onkeydown+onkeyup in Windows
  var counter=0, watching=false, to;
  
  document.onkeydown = function(e){
    var keycode = window.event ? window.event.keyCode : e.which;
    if (keycode == 27) {
      onEsc();
      return false;
    }
    if (document.activeElement.type == "text") { return; }
    if (keycode == 32) {
      if ( ! watching && ! counter) onSpacePressed();
      counter+=1;
      //console.log(" keydown "+counter);
      if ( ! watching) {
        watching=true;
        to=setTimeout(
          checkout
        ,400);
      }
      return false;
    }
    if (keycode == 32) return false;// prevents scrolling to the bottom
  };
  
  function checkout() {
    if (counter == 0) { 
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
};

mc.utils.getBlobByUri=function(uri,callBack) {
  var oReq = new XMLHttpRequest();
  oReq.open("GET", uri, true);
  oReq.responseType = "blob";
  oReq.onload = function (oEvent) {
    var blob = oReq.response; // Note: not oReq.responseText
    if (blob) { callBack(blob); }
  }
  oReq.send(null);
};

mc.utils.Ticker=function(onTickCb, intervalMs) {
  var intervalHandler;
  if ( ! intervalMs) intervalMs=1000;
  //console.log("interval:"+intervalMs);
  
  this.start=function() { intervalHandler=setInterval(onTickCb,intervalMs); };
  this.stop=function() { clearInterval(intervalHandler); };
}

mc.utils.path=function() {
  var wl=window.location;
  var arr=wl.pathname.split("/");
  arr.pop();
  var p=arr.join("/");
  var uri=wl.protocol+"//"+wl.host+p+"/";
  return uri;
};

mc.utils.Registry=function(initMap) {
  var _this=this;
  
  this.addFreshPairsFrom=function(map) {
    if (typeof map != "object") throw new Error("Wrong argument");
    var key;
    for (key in map) {
      if ( ! map.hasOwnProperty(key)) continue;
      if (_this.hasOwnProperty(key)) throw new Error("Key "+key+" already exists");
      _this[key]=map[key];
    }    
  };
  
  this.set=function(key,value) {
    if ( ! _this.hasOwnProperty(key)) throw new Error("Key "+key+" is missing");
    _this[key]=value;    
  };
  
  this.overrideValuesBy=function(map) {
    if (typeof map != "object") throw new Error("Wrong argument");
    var key;
    for (key in map) {
      if ( ! map.hasOwnProperty(key)) continue;
      _this.set(key, map[key]);
    }    
  };
  
  if (typeof initMap == "object") this.addFreshPairsFrom(initMap);
};


// link https://webrtchacks.com/limit-webrtc-bandwidth-sdp/
// media = "audio" | "video"
// bitrate in kbps
mc.utils.setMediaBitrate=function(sdp, media, bitrate) {
  if (bitrate <= 0) return sdp;
  if (typeof sdp !== "string" && ! (sdp instanceof String)) throw new Error("Wrong argument type "+(typeof sdp));  
  var lines = sdp.split("\n");
  var line = -1;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].indexOf("m="+media) === 0) {
      line = i;
      break;
    }
  }
  if (line === -1) {
    console.debug("Could not find the m line for", media);
    return sdp;
  }
  console.debug("Found the m line for", media, "at line", line);
 
  // Pass the m line
  line++;
 
  // Skip i and c lines
  while(lines[line].indexOf("i=") === 0 || lines[line].indexOf("c=") === 0) {
    line++;
  }
 
  // If we're on a b line, replace it
  if (lines[line].indexOf("b") === 0) {
    console.debug("Replaced b line at line", line);
    lines[line] = "b=AS:"+bitrate;
    return lines.join("\n");
  }
  
  // Add a new b line
  console.debug("Adding new b line before line", line);
  var newLines = lines.slice(0, line)
  newLines.push("b=AS:"+bitrate)
  newLines = newLines.concat(lines.slice(line, lines.length))
  return newLines.join("\n")
};

mc.utils.setOpusLimits=function(sdp) {
  var myLimit=6000;
  var regexOpus = /a=rtpmap:(\d+)\s+opus/gi;
  //var matchOpus = sdp.match(regexOpus);
  var matchOpus=regexOpus.exec(sdp);
  //alert(mc.utils.dumpArray(matchOpus));
  var num=matchOpus[1];
  var regexBitrate= "a=fmtp:"+num+"\\s+maxplaybackrate=(\\d+);stereo=(\\d)";
  //alert(regexBitrate);
  //a=fmtp:109 maxplaybackrate=48000;stereo=1
  regexBitrate=new RegExp(regexBitrate);
  var matchBitrate=regexBitrate.exec(sdp);
  //alert(mc.utils.dumpArray(matchBitrate));
  if ( ! matchBitrate || ! matchBitrate[0]) {
    log("Failed to adjust Opus params in SDP");
    return sdp;
  }
  var replace="a=fmtp:"+num+" maxplaybackrate="+myLimit+";stereo=0";
  var r=sdp.replace(matchBitrate[0], replace);
  //alert(r);
  return r;
};

mc.utils.randomString=function(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

mc.utils.obj2queryString=function(msgObj) {
  var queryString = Object
    .keys(msgObj)
    .map(function(key) { return key + '=' + msgObj[key] })
    .join('&');
  return queryString;
};

mc.utils.escapeHtml=function(text) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
};

mc.utils.initErrorReporter=function(upLink) {
  window.onerror=function(errorMsg, url, lineNumber, column, errorObj) {
    try {
      var o={ errorMsg: errorMsg, url: encodeURIComponent(url), lineNumber: lineNumber, errorObj: errorObj.toString() };
      if (errorObj.stack) o.errorObj=encodeURIComponent(errorObj.stack);
      upLink.sendLogError(o);
      console.log("An error occured and has been reported to server");
      return false;
    }
    catch (e) {
      var s=errorMsg+' Script: '+url+' Line: '+lineNumber+' Column: '+column+' StackTrace: '+errorObj;
      console.log("Failed to report Error:"+s);
      console.log("While trying, got Error:"+e.message);
    }
    return false;
  };
};
