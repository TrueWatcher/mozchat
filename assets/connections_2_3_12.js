"use strict";

mc.utils.Ajaxer=function (responderUrl,onDataReceived,indicator,onTimeout) { //NEW
  if (typeof onDataReceived != "function") throw new Error("Non-function callback argument");
  if ( ! indicator.on) indicator={on:function(){}, off:function(){}}; 
  var urlOffset="";
  if (typeof URLOFFSET != "undefined") urlOffset=URLOFFSET;
  var lag=0, timer=false, busy=false, watch=false;
  var transports=["post", "posturle" ,"postmulti", "postfd", "get", "jsonp"];
  var queue=[], queueMax=15;
  
  var _this=this, req;
  
  this.transport=null;
  
  // query string or Form
  this.postRequest=function(what, timeoutMs, enc) {
    if ( ! what) throw new Error ("no data");
    if ( enqueueMsg(what, "post") ) return;
    // unconditional entry point for from-queue messages
    doPostRequest(what, timeoutMs, enc);
  };
  
  function doPostRequest(what, timeoutMs, enc) {
    if (typeof enc == "undefined") enc=_this.transport;
    timer=Date.now();
    req=new XMLHttpRequest();
    req.open("POST",urlOffset+responderUrl,true); // POST
    //console.log("ENCODING="+enc);
    if (enc == "postmulti") req.setRequestHeader("Content-Type","multipart/form-data");// for POST; should go _after_ req.open!
    else if (enc == "posturle") req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    req.onreadystatechange=receive;// both
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
    }
    //console.log("posting "+what);
    var q=req.send(what); // POST
  }
  
  // queryString or urlencoded queryString
  this.getRequest=function(queryString,timeoutMs) {
    if (enqueueMsg(queryString, "get")) return;
    doGetRequest(queryString,timeoutMs);
  };
  
  function doGetRequest(queryString,timeoutMs) {
    timer=Date.now();
    req=new XMLHttpRequest();
    var uriForGet=urlOffset+responderUrl+"?"+queryString; // GET
    req.open("GET", uriForGet); // GET
    req.onreadystatechange=receive;// both
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
      //console.log("watching for "+timeoutMs);
    } 
    var q=req.send(null); // GET
  }
  
  var globalJsonpReceiverName=false;
  
  this.initJsonp= function() {
    if ( ! acceptMessage instanceof Function) throw new Error("Missing global receiver function (expected acceptMessage)");
    acceptMessage=_this.receiveJsonp;
    globalJsonpReceiverName="acceptMessage";
  };
  
  this.jsonpRequest=function(queryString,timeoutMs) {
    if (enqueueMsg(queryString, "jsonp")) return;
    doJsonpRequest(queryString,timeoutMs);
  };
  
  function doJsonpRequest(queryString,timeoutMs) {
    if ( ! globalJsonpReceiverName) _this.initJsonp();
    timer=Date.now();
    req = document.createElement("script");
    var uriForGet=urlOffset+responderUrl+"?"+queryString;
    uriForGet += "&jsonpWrapper="+globalJsonpReceiverName;
    req.setAttribute("src", uriForGet);
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
      //console.log("watching for "+timeoutMs);
    }
    document.head.appendChild(req);
    document.head.removeChild(req);
    req = null;
  }
  
  function enqueueMsg(what, aMethod) {
    if ( queueMax <= 0 && busy) throw new Error("Ajaxer "+responderUrl+" is busy");
    if ( queue.length == 0 && ! busy) return false; // if there is queue, put it there
    if (queue.length+1 >= queueMax) throw new Error("Ajaxer "+responderUrl+" is overflown");
    queue.push({ msg: what, method : aMethod });
    console.log("Ajaxer "+responderUrl+": queued "+queue.length+"th message");
    return true;
  }
  
  this.postAsFormData=function(msgObj, to) {
    var fd=new FormData(), p;
    for (p in msgObj) {
      if (msgObj.hasOwnProperty(p)) fd.append(p, msgObj[p]);
    }
    this.postRequest(fd, to, "postfd");
  };
  
  this.sendAsJson=function(msgObj, to) { alert("redefine me!"); };
  
  this.setTransport=function(t) {
    if (transports.indexOf(t) < 0) throw new Error("Unknown transport:"+t);
    this.transport=t;
    //alert(transport);
    if (t == "postfd") {
      _this.sendAsJson=function(msgObj, to) {
        var msgObj = { json : JSON.stringify(msgObj) };
        _this.postAsFormData(msgObj, to);
      };
    }
    else if (t.charAt(0) == "p") {
      _this.sendAsJson=function(msgObj, to) {
        var msgPost = "json="+JSON.stringify(msgObj);
        _this.postRequest(msgPost, to);
      };
    }
    else if (t == "get") {
      _this.sendAsJson=function(msgObj, to) {
        var msgGet = "json="+encodeURIComponent(JSON.stringify(msgObj));
        _this.getRequest(msgGet, to);
      };
    }
    else if (t == "jsonp") {
      _this.sendAsJson=function(msgObj, to) {
        var msgGet = "json="+encodeURIComponent(JSON.stringify(msgObj));
        _this.jsonpRequest(msgGet, to);
      };
    }
  };  
  this.setTransport("posturle");
  
  this.setQueueMax=function(n) { queueMax=n; };
  
  this.timeoutInner=function() {
    _this.reset();
    onTimeout();
  }
  
  this.reset=function() {
    if (req) req.abort();
    busy=false;
    indicator.off();
  };
  
  function receive() {
    var rdata,rmime;
    var fromQueue;
    
    if (req.readyState != 4) return;
    if (watch) clearTimeout(watch);
    if (req.status != 200 && req.status != 204 && req.status != 304) {
      console.log(responderUrl+" ajax returned error "+req.status);
      req=null;
      return;
    }
    lag=Date.now()-timer;
    indicator.off();
    busy=false;
    if (req.status != 200  && req.status != 304) {
      console.log("ajax returned code "+req.status);
      //onDataReceived(req.status);
      req=null;
      return;
    }
    if (req.status == 304) {
      //console.log("304 "+lag);
      onDataReceived({ alert : "No changes", lag : lag });
      req=null;
      return;
    }
    rdata=req.responseText;
    rmime=req.responseType;
    req=null;
    //alert(rmime);
    if (rmime === "" || rmime == "json" || rmime == "text") rdata=tryJsonParse(rdata);
    tryTakeFromQueue();
    onDataReceived(rdata);
    //setTimeout(function() { onDataReceived(rdata) }, 0);
  }
  
  this.receiveJsonp=function(responseObj) {
    var rdata,rmime;
    var fromQueue;
    lag=Date.now()-timer;
    if (watch) clearTimeout(watch);
    indicator.off();
    busy=false;
    rdata=responseObj;
    //req=null; // not good -- req needed for removeChild;
    tryTakeFromQueue();
    rdata.lag=lag;
    onDataReceived(rdata);
  }
  
  function tryTakeFromQueue() {
    if ( queueMax <= 0 || queue.length == 0) { busy=false; return false; }
    var fromQueue=queue.shift();
    busy=true;
    setTimeout(function() {
      console.log("Ajaxer "+responderUrl+": unqueued a message, "+queue.length+" remain");
      if (fromQueue.method == "post") doPostRequest(fromQueue.msg); 
      else if (fromQueue.method == "get") doGetRequest(fromQueue.msg);
      else if (fromQueue.method == "jsonp") doJsonpRequest(fromQueue.msg);
      else throw new Error("Unknown method: "+fromQueue.method);         
    }, 0);
    return true;
  }
  
  function tryJsonParse(responseText) {
    if ( ! responseText) return responseText;
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
  
  this.isBusy=function() {
    if (queueMax <= 0) return busy;
    var remains=(queueMax-queue.length  < 1);
    return remains;
  };
  
};// end Ajaxer

mc.utils.old_Ajaxer=function (responderUrl,onDataReceived,indicator,onTimeout) {
  if (typeof onDataReceived != "function") throw new Error("Non-function callback argument");
  if ( ! indicator.on) indicator={on:function(){}, off:function(){}}; 
  var urlOffset="";
  if (typeof URLOFFSET != "undefined") urlOffset=URLOFFSET;
  var lag=0, timer=false, busy=false, watch=false;
  var transport, transports=["post", "posturle" ,"postmulti", "get", "jsonp"];
  var queue=[], queueMax=15;
  
  var _this=this, req;
  
  // query string or Form
  this.postRequest=function(what, timeoutMs, encoding) {
    if ( ! what) throw new Error ("no data");
    if ( enqueueMsg(what, "post") ) return;
    timer=Date.now();
    req=new XMLHttpRequest();
    req.open("POST",urlOffset+responderUrl,true); // POST
    if (encoding == "postmulti") req.setRequestHeader("Content-Type","multipart/form-data");// for POST; should go _after_ req.open!
    else if (encoding == "posturle") req.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
    else if ( ! encoding) {}
    else throw new Error("Unknown encoding="+encoding);
    req.onreadystatechange=receive;// both
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout( this.timeoutInner, timeoutMs);
    }
    //console.log("posting "+what);
    var q=req.send(what); // POST
  };
  
  // queryString or urlencoded queryString
  this.getRequest=function(queryString,timeoutMs) {
    if (enqueueMsg(queryString, "get")) return;
    timer=Date.now();
    req=new XMLHttpRequest();
    var uriForGet=urlOffset+responderUrl+"?"+queryString; // GET
    req.open("GET", uriForGet); // GET
    req.onreadystatechange=receive;// both
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
      //console.log("watching for "+timeoutMs);
    } 
    var q=req.send(null); // GET
  };
  
  var globalJsonpReceiverName=false;
  
  this.initJsonp= function() {
    if ( ! acceptMessage instanceof Function) throw new Error("Missing global receiver function (expected acceptMessage)");
    acceptMessage=_this.receiveJsonp;
    globalJsonpReceiverName="acceptMessage";
    //acceptMessage({alert:"check ok"});
  };
  
  this.jsonpRequest=function(queryString,timeoutMs) {
    if (enqueueMsg(queryString, "jsonp")) return;
    if ( ! globalJsonpReceiverName) this.initJsonp();
    timer=Date.now();
    req = document.createElement("script");
    var uriForGet=urlOffset+responderUrl+"?"+queryString;
    uriForGet += "&jsonpWrapper="+globalJsonpReceiverName;
    req.setAttribute("src", uriForGet);
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
      //console.log("watching for "+timeoutMs);
    }
    document.head.appendChild(req);
    document.head.removeChild(req);
    req = null;
  };
  
  function enqueueMsg(what, aMethod) {
    if ( queueMax <= 0 && busy) throw new Error("Ajaxer "+responderUrl+" is busy");
    if ( ! busy) return false; // if there is queue, put it there
    if (queue.length+1 >= queueMax) throw new Error("Ajaxer "+responderUrl+" is overflown");
    queue.push({ msg: what, method : aMethod });
    console.log("Ajaxer "+responderUrl+": queued "+queue.length+"th message");
    return true;
  }
  
  this.postAsFormData=function(msgObj, to) {
    var fd=new FormData(), p;
    for (p in msgObj) {
      if (msgObj.hasOwnProperty(p)) fd.append(p, msgObj[p]);
    }
    this.postRequest(fd, to, "");
  };
  
  this.sendAsJson=function(msgObj, to) { alert("redefine me!"); };
  
  this.setTransport=function(t) {
    if (transports.indexOf(t) < 0) throw new Error("Unknown transport:"+t);
    transport=t;
    if (t.charAt(0) == "p") {
      this.sendAsJson=function(msgObj, to) {
        var msgPost = "json="+JSON.stringify(msgObj);
        _this.postRequest(msgPost, to, transport);
      };
    }
    else if (t == "get") {
      this.sendAsJson=function(msgObj, to) {
        var msgGet = "json="+encodeURIComponent(JSON.stringify(msgObj));
        _this.getRequest(msgGet, to);
      };
    }
    else if (t == "jsonp") {
      this.sendAsJson=function(msgObj, to) {
        var msgGet = "json="+encodeURIComponent(JSON.stringify(msgObj));
        _this.jsonpRequest(msgGet, to);
      };
    }
  };
  
  this.setTransport("posturle");
  
  this.setQueueMax=function(n) { queueMax=n; };
  
  this.timeoutInner=function() {
    _this.reset();
    onTimeout();
  }
  
  this.reset=function() {
    if (req) req.abort();
    busy=false;
    indicator.off();
  };
  
  function receive() {
    var rdata,rmime;
    var fromQueue;
    
    if (req.readyState != 4) return;
    if (watch) clearTimeout(watch);
    if (req.status != 200 && req.status != 204 && req.status != 304) {
      console.log(responderUrl+" ajax returned error "+req.status);
      req=null;
      return;
    }
    lag=Date.now()-timer;
    indicator.off();
    busy=false;
    if (req.status != 200  && req.status != 304) {
      console.log("ajax returned code "+req.status);
      //onDataReceived(req.status);
      req=null;
      return;
    }
    if (req.status == 304) {
      //console.log("304 "+lag);
      onDataReceived({ alert : "No changes", lag : lag });
      req=null;
      return;
    }
    rdata=req.responseText;
    rmime=req.responseType;
    req=null;
    //alert(rmime);
    if (rmime === "" || rmime == "json" || rmime == "text") rdata=tryJsonParse(rdata);
    tryTakeFromQueue();
    onDataReceived(rdata);
    //setTimeout(function() { onDataReceived(rdata) }, 0);
  }
  
  this.receiveJsonp=function(responseObj) {
    var rdata,rmime;
    var fromQueue;
    lag=Date.now()-timer;
    if (watch) clearTimeout(watch);
    indicator.off();
    busy=false;
    rdata=responseObj;
    //req=null; // not good -- req needed for removeChild;
    tryTakeFromQueue();
    rdata.lag=lag;
    onDataReceived(rdata);
  }
  
  function tryTakeFromQueue() {
    if ( queueMax <= 0 || queue.length == 0) return false;
    var fromQueue=queue.shift();
    setTimeout(function() {
      console.log("Ajaxer "+responderUrl+": unqueued a message, "+queue.length+" remain");
      if (fromQueue.method == "post") _this.postRequest(fromQueue.msg); 
      else if (fromQueue.method == "get") _this.getRequest(fromQueue.msg);
      else if (fromQueue.method == "jsonp") _this.jsonpRequest(fromQueue.msg);
      else throw new Error("Unknown method: "+fromQueue.method);         
    }, 0);
    return true;
  }
  
  function tryJsonParse(responseText) {
    if ( ! responseText) return responseText;
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
  
  this.isBusy=function() {
    if (queueMax <= 0) return busy;
    var remains=(queueMax-queue.length  < 1);
    return remains;
  };
  
};// end Ajaxer

mc.utils._Ajaxer=function (responderUrl,onDataReceived,indicator,onTimeout) {
  if (typeof onDataReceived != "function") throw new Error("Non-function callback argument");
  if ( ! indicator.on) indicator={on:function(){}, off:function(){}}; 
  var urlOffset="";
  if (typeof URLOFFSET != "undefined") urlOffset=URLOFFSET;
  var lag=0, timer=false, busy=false, watch=false;
  
  var _this=this, req;
    
  this.postRequest=function(what,timeoutMs) {
    if ( ! what) throw new Error ("no data");
    if (busy) throw new Error("Ajaxer "+responderUrl+" is busy");
    timer=Date.now();
    req=new XMLHttpRequest();
    req.open("POST",urlOffset+responderUrl,true); // POST
    //req.setRequestHeader("Content-Type","multipart/form-data");// for POST; should go _after_ req.open!//application/x-www-form-urlencoded
    req.onreadystatechange=receive;// both
    var q=req.send(what); // POST
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) watch=setTimeout(timeoutInner,timeoutMs);
  };
  
  this.getRequest=function(queryString,timeoutMs) {
    if (busy) throw new Error("Ajaxer "+responderUrl+" is busy");
    timer=Date.now();
    req=new XMLHttpRequest();
    req.open("GET",urlOffset+responderUrl+"?"+queryString); // GET
    req.onreadystatechange=receive;// both
    var q=req.send(null); // GET
    indicator.on();
    busy=true;
    if (timeoutMs && onTimeout) {
      watch=window.setTimeout(_this.timeoutInner, timeoutMs);
      //console.log("watching for "+timeoutMs);
    }  
  };
  
  this.timeoutInner=function() {
    _this.reset();
    onTimeout();
  }
  
  this.reset=function() {
    req.abort();
    busy=false;
    indicator.off();
  };
  
  function receive() {
    var rdata,rmime;
    
    if (req.readyState != 4) return;
    if (watch) clearTimeout(watch);
    if (req.status != 200 && req.status != 204 && req.status != 304) {
      console.log(responderUrl+" ajax returned error "+req.status);
      req=null;
      return;
    }
    lag=Date.now()-timer;
    indicator.off();
    busy=false;
    if (req.status != 200  && req.status != 304) {
      console.log("ajax returned code "+req.status);
      //onDataReceived(req.status);
      req=null;
      return;
    }
    if (req.status == 304) {
      //console.log("304 "+lag);
      onDataReceived({ alert : "No changes", lag : lag });
      req=null;
      return;
    }
    rdata=req.responseText;
    rmime=req.responseType;
    req=null;
    //alert(rmime);
    if (rmime === "" || rmime == "json" || rmime == "text") rdata=tryJsonParse(rdata);
    onDataReceived(rdata);
    //setTimeout(function() { onDataReceived(rdata) }, 0);
  }
  
  function tryJsonParse(responseText) {
    if ( ! responseText) return responseText;
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
