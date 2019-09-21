"use strict";

mc.Connector=function(serverParams, userParams) {
  var _this=this,
      pullCallbacks=[],
      pushCallbacks=[];
  
  var viewC={
    showMessageP: function(m) { $("playerAlertP").innerHTML=m; },
    showMessageR: function(m) { $("recorderAlertP").innerHTML=m; },
    uploadIndicatorR: new mc.utils.Indicator("uploadIndBtn", [["","auto"], ["","ye"]] ),
    onHangR: function() { $("recorderAlertP").innerHTML="Request timed out"; },
    onPollhangsP: function() { $("playerAlertP").innerHTML="The poll request has timed out"; }    
  };
  
  this.echo="echo";
      
  this.push=new mc.Connector.PushLink(serverParams.serverPath+serverParams.pathBias+"upload.php", pushCallAllBack, viewC.onHang,  serverParams, userParams, viewC.uploadIndicatorR);

  this.push.registerPushCallback=function(cb) {
    if ( ! cb instanceof Function) throw new Error("Wrong CB type="+(typeof cb));
    pushCallbacks.push(cb);
  };
  
  function pushCallAllBack(respObj) {
    var i=0, l=pushCallbacks.length;
    if (l == 0) throw new Error("No callbacks found");
    for (; i < l; i+=1) { pushCallbacks[i](respObj); }    
  }  
  
  this.pull=getPullLink(mc.serverParams.wsOn);
  
  this.pull.registerPullCallback=function(cb) {
    if ( ! cb instanceof Function) throw new Error("Wrong CB type="+(typeof cb));
    pullCallbacks.push(cb);
  };
  
  function getPullLink(websocketsOn) {
    if (websocketsOn) {
      return new mc.utils.WsClient(onWsconnected, callAllBack, viewC.onPollhangsP, userParams, serverParams, _this.push);
    }
    else {
      return new mc.utils.Poller(serverParams.pathBias+"download.php", callAllBack,  viewC.onPollhangsP, userParams, serverParams);
    }    
  }
  
  function onWsconnected() {
    console.log("requesting the catalog from uplink");
    _this.push.sendGetCatalog(serverParams.user, serverParams.realm);
  }
  
  function callAllBack(respObj) {
    var i=0, l=pullCallbacks.length;
    if (l == 0) throw new Error("No callbacks found");
    for (; i < l; i+=1) { pullCallbacks[i](respObj); }    
  }
  
  this.pull.reinit=function() {
    _this.pull.stop();
    _this.pull=getPullLink(mc.serverParams.wsOn); 
  };
  
};

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
    }, 30);
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

mc.utils.Poller=function(responderUri, onData, onHang, userParams, serverParams) {
  var _this=this, ticks=0, catalogTime=0, catalogBytes=0, usersListTime=0, catCrc="1234", myUsersList="", response, intervalHandler;
  
  var ajaxerP=new mc.utils.Ajaxer(responderUri, takeUpdatedMarks, {}, onHang);
  ajaxerP.setQueueMax(0);// queue and long poll cannot go together
    
  this.onTick=function() {
    var pf=userParams.pb.pollFactor;
    //console.log("pollFactor="+pf);
    if (typeof pf == "undefined") throw new Error("Cannot get pollFactor:"+typeof userParams+"/"+typeof pf);
    if (pf === "off") return;
    if (pf === "l") {
      if ( ! ajaxerP.isBusy()) _this.sendLongPoll();
      return;
    }
    ticks+=1;
    if (ticks < pf) return;
    ticks=0;
    if ( ! ajaxerP.isBusy()) _this.sendPoll();
  };
  
  function addUpdatedMarks(qs) {
    qs+="&catSince="+catalogTime+"&catBytes="+catalogBytes+"&usersSince="+usersListTime;
    if (catCrc !== false) qs+="&catCrc="+catCrc;
    return qs;
  }
  
  this.sendPoll=function(moreParams) {
    var qs="";
    qs+="user="+serverParams.user+"&realm="+serverParams.realm;
    qs+="&act=poll";
    qs=addUpdatedMarks(qs);
    qs+="&pollFactor="+userParams.pb.pollFactor;
    if (moreParams) qs+="&"+moreParams;
    ajaxerP.getRequest(qs, 2000);   
  };
  
  this.sendLongPoll=function(moreParams) {
    var qs="";
    qs+="user="+serverParams.user+"&realm="+serverParams.realm;
    qs+="&act=longPoll";
    qs=addUpdatedMarks(qs);
    qs+="&myUsersList="+encodeURIComponent(myUsersList);
    if (moreParams) qs+="&"+moreParams;
    ajaxerP.getRequest(qs, serverParams.longPollPeriodS*1000+2000);    
  };
  
  this.linkIsBusy=function() { return ajaxerP.isBusy(); };
  
  this.getResponse=function() { return response; };
  
  function takeUpdatedMarks(resp) {
    response=resp;
    if (resp.catalogBytes) catalogBytes=resp.catalogBytes;
    if (resp.timestamp) catalogTime=resp.timestamp;
    if (resp.users) { 
      usersListTime=resp.timestamp;
      myUsersList=resp.users;
    }
    if (resp.catCrc) { 
      //console.log("my crc="+catCrc+", server's="+resp.catCrc); 
      catCrc=resp.catCrc;
    }
    onData(resp);
  }
  
  if (userParams.pb.pollFactor != "off") this.sendPoll();
  intervalHandler=setInterval(_this.onTick, 100);

  this.stop=function() {
    if (intervalHandler) clearInterval(intervalHandler);
  }; 
};

mc.utils.WsClient=function(onConnect, onData, onHang, userParams, serverParams, upConnection, connectAtOnce) {
  //console.log("serverParams.wsServerUri");
  var conn={onopen:notReady, onmessage:notReady, send:notReady},
      myHello=JSON.stringify({user:serverParams.user, realm:serverParams.realm, act:"userHello"}),
      pollFactor=15000;
  var response=[], intervalHandler=false;
  if (typeof connectAtOnce == "undefined") connectAtOnce=true;
  
  function notReady() { throw new Error("The object is not ready"); }
  
  this.connect=function() {    
    conn=new WebSocket(serverParams.wsServerUri);//'ws://localhost:8080'
    
    conn.onerror = function(e) {
      alert("Something is wrong with Websocket connection");
      if (wss2https()) {
        $("accountTopAlertP").innerHTML='<a href="'+wss2https()+'" target="_blank">Please, check WS certificate</a>';
      }
    };
    
    conn.onopen = function(e) {
      console.log("Connection established!");
      setTimeout(function() {
        //console.log(myHello);
        conn.send(myHello); }
      ,200);
      setTimeout(onConnect,500);
    };

    conn.onmessage = function(e) {
      //console.log(e.data);
      response=JSON.parse(e.data);
      onData(response);
    };    
  };  
  if (connectAtOnce) this.connect();
  
  this.disconnect=function() {
    conn.close();
    conn={onopen:notReady, onmessage:notReady, send:notReady};   
  };
  
  this.sendData=function(data) { conn.send(data); }; 
  this.linkIsBusy=function() { return false; };  
  this.getResponse=function() { return response; };
  
  if (userParams.pb.pollFactor != "off") {
    intervalHandler=setInterval(function() {
      upConnection.sendGetCatalog(pollFactor);
    }, pollFactor);
  }
  
  function wss2https() {
    var uri=serverParams.wsServerUri;
    if (uri.indexOf("ws://") === 0) return false;
    if (uri.indexOf("wss://") === 0) return uri.replace("wss://", "https://");
    throw new Error("Wrong ws uri="+uri);
  }
  
  this.stop=function() {
    if (intervalHandler) clearInterval(intervalHandler);
  };
  
  this.sendRelay=function(msgObj) {
    msgObj.act="relay";
    msgObj.user=serverParams.user;
    msgObj.realm=serverParams.realm;
    this.sendData(JSON.stringify(msgObj));
  };
  
};

mc.Connector.PushLink=function(respondrUri, onData, onHang, serverParams, userParams, indicator) {
  var _this=this;
  var ajaxerR=new mc.utils.Ajaxer(respondrUri, onData, indicator, onHang);
  
  this.linkIsBusy=function() { return ajaxerR.isBusy(); };
  this.setQueueMax=function(n) { ajaxerR.setQueueMax(n); };
  
  this.sendBlobAndData=function(blobPlusData,lastRecordedTime,description,aUserParams) {
    var stuff,up;
    if (!! aUserParams) up=aUserParams;// required for debug
    else up=serverParams;    
    stuff={
     act:"uploadBlob", user: up.user, realm: up.realm, description: description,
     mime: blobPlusData.mime, ext: blobPlusData.ext, duration: lastRecordedTime, blob: blobPlusData.blob
    };
    ajaxerR.postAsFormData(stuff);
  };

  this.reportMimeFault=function(recorderMimes) {
    var  stuff={
      act: "reportMimeFault", user: serverParams.user, realm: serverParams.realm,
      mimesList: mc.utils.dumpArray(recorderMimes)
    };
    ajaxerR.postAsFormData(stuff);
  };
  
  _this.sendClear=function() {
    var stuff= { act: "clearMedia", user: serverParams.user, realm: serverParams.realm };
    ajaxerR.postAsFormData(stuff);
  }
  
  _this.sendDelete=function(file) {
    var stuff={ act: "delete", user: serverParams.user, realm: serverParams.realm, id: file };
    ajaxerR.postAsFormData(stuff);    
  };

  _this.sendRemoveExpired=function() {
    var stuff={ act: "removeExpired", user: serverParams.user, realm: serverParams.realm };
    ajaxerR.postAsFormData(stuff);  
  };
  
  this.sendGetCatalog=function(pollFactor) {
    var  stuff={ act: "getCatalog", user: serverParams.user, realm: serverParams.realm };
    if (pollFactor) stuff.pollFactor=pollFactor;
    ajaxerR.postAsFormData(stuff);  
  };
  
  this.sendRelay=function(msgObj) {
    msgObj.act="relay";
    this.sendAsJson(msgObj);
  };
  
  this.sendLogNRelay=function(msgObj) {
    msgObj.act="logNrelay";
    this.sendAsJson(msgObj);
  };
  
  this.sendAsJson=function(msgObj, timeout=10000) {
    msgObj.user=serverParams.user;
    msgObj.realm=serverParams.realm;
    ajaxerR.sendAsJson(msgObj, timeout);
  };
  
};
