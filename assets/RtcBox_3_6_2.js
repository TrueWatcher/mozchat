"use strict";
//function $(id) { return document.getElementById(id); };
mc.rtcb={};

mc.rtcb.ViewW=function() {
  this.serverParams2Dom=function(params) {
    if ( ! params.allowVideo) { $("videoCx").style.display="none"; }
    if (params.videoOn && params.allowVideo) { $("videoCx").checked="checked"; }
  };
  
  this.setClickHandlers=function(controller) {
    //alert(document.getElementById("name").type);
    //$("loginBtn").onclick=controller.handleClick;
    //$("logoutBtn").onclick=controller.handleClick;
    $("hangupBtn").onclick=controller.handleClick;
    $("sendBtn").onclick=controller.handleClick;
    $("callBtn").onclick=controller.handleClick;
    $("textInp").onkeyup=controller.handleKey;
    $("userlistP").onclick=this.onUserlistclicked;    
  };
  
  var spt=mc.serverParams.serverPath;
  this.audios={
    open : { src : spt+"assets/i30_open.mp3", el : new Audio() },
    close : { src : spt+"assets/i14_close.mp3", el : new Audio() },
    ring : { src : spt+"assets/i3_ring.mp3", el : new Audio() }, 
  };
  
  this.loadAudio=function() {
    this.audios.open.el.src=this.audios.open.src;
    this.audios.close.el.src=this.audios.close.src;
    this.audios.ring.el.src=this.audios.ring.src;
  };

  this.enableButtons=function() {
    document.getElementById("textInp").disabled = false;
    document.getElementById("sendBtn").disabled = false;  
  };

  this.addToChat=function(msgText) {
    var sep="<br />\n";
    var el=$("chatText");
    var pref="[" + (new Date()).toLocaleTimeString() + "] ";
    //el.innerHTML=el.innerHTML+sep+pref+msgText; // latest down
    //el.scrollTop=el.scrollHeight;
    el.innerHTML = pref + msgText + sep + el.innerHTML;// latest up
  };

  this.getUsername=function() { return $("userInp").value; };

  this.getPeerName=function() { return $("peerInp").value; };
  this.setPeerName=function(name) { $("peerInp").value=name; };
  
  this.getVideoCx=function() { return $("videoCx").checked ? "video" : "audio" ; };

  this.getTextInp=function() { return $("textInp").value; };
  this.clearTextInp=function() { $("textInp").value=""; };

  this.disableHangUp=function() { $("hangupBtn").disabled = true; };
  this.enableHangUp=function() { $("hangupBtn").disabled = false; };
  
  this.getAnswerCx=function() { return $("answerCx").checked; };
  
  this.getRingCx=function() { return $("ringCx").checked; };

  this.showAlert=function(msg) { $("alertP").innerHTML=mc.utils.escapeHtml(msg); };

  this.showState=function(state) {
    var el=$("stateIndBtn");
    switch (state) {
    case "inactive":
    case "ready":
    case "outCall":
    case "inCall":
    case "preparing":
    case "speak":
      break;
    default: 
      throw new Error("Unknown state:"+state);
    }
    el.innerHTML=state;
  };
  
  this.showUserList=function(usl) {
    if ( ! usl || usl.length == 0) return;
    var sep=", ";
    var list=usl.split(sep);
    usl=mc.utils.escapeHtml(usl);
    list.forEach(function(name,i,arr) { arr[i]="<span>"+name+"</span>"; });
    $("userlistP").innerHTML="Online: "+list.join(sep);
  };
  
  this.clearUserList=function() { $("userlistP").innerHTML=""; };
  
  // Finds clicked name and copies it into PEER input field
  this.onUserlistclicked=function(event) {
    event = event || window.event;
    var target = event.target || event.srcElement;
    var content="";
    //alert("UL clicked "+target.tagName);

    while(target.tagName != 'P') {
      if (target.tagName == 'SPAN') { content=target.innerHTML; break; }
      target = target.parentNode;
    }
    if (content) $("peerInp").value=content;
  };
  
  var receivedVideo;
  
  this.createVideo=function() {
    receivedVideo=document.createElement("VIDEO");
    receivedVideo.autoplay=true;
    document.getElementById("playerRoom").prepend(receivedVideo);
  };
  
  this.setVideoSrcObj=function(data) { receivedVideo.srcObject=data; };
  
  this.clearVideo=function() {
    if (receivedVideo && receivedVideo.srcObject) {
      receivedVideo.srcObject.getTracks().forEach(track => track.stop());
    }
    if (receivedVideo && receivedVideo.src) receivedVideo.src = null;
    if (receivedVideo && receivedVideo.parentNode) receivedVideo.parentNode.removeChild(receivedVideo);
    receivedVideo=null;
    document.getElementById("received_audio").srcObject=null;
  };
  
  this.setAudioSrcObj=function(data) { document.getElementById("received_audio").srcObject=data; };
  
};// end ViewW

mc.rtcb.RtcBox=function() {

var vw,
    peerBox,
    signallingConnection;

var up=mc.userParams.rtcb;
var sp=mc.serverParams;
var state="zero";
var states=[ "inactive", "ready", "outCall", "inCall", "preparing", "speak" ];

// Output logging information to console.
function log(text) {
  var time = new Date();
  console.log("[" + time.toLocaleTimeString() + "] " + text);
}

// Output an error message to console.
function log_error(text) {
  var time = new Date();
  console.error("[" + time.toLocaleTimeString() + "] " + text);
}

var handleMessage=function handleMessage(msg) {
  //var chatFrameDocument = document.getElementById("chatbox").contentDocument;
  var text="",
      time="",
      timeStr="",
      mtype="unknownMessage",
      processedByPeerBox=false;

  //log("Message received: "+mc.utils.dumpArray(msg));
      
  if (msg.pack  && msg.pack instanceof Array) {
    msg.pack.forEach(function(m) { handleMessage(m); });
    return;
  }

  if (msg.alert) { vw.showAlert(msg.alert); }
  if (msg.date) { timeStr = new Date(msg.date).toLocaleTimeString(); }
  if (msg.users) { vw.showUserList(msg.users); }
  
  if (msg.type) mtype=msg.type;
  
  if (stateIs("inactive")) {
    switch(mtype) {
    case "id":
      up.clientID = msg.id;
      setUsername();
      break;
    case "username":
      text = "User <b>" + mc.utils.escapeHtml(msg.user) + "</b> signed in";
      vw.addToChat(text);
      setState("ready");
      vw.enableButtons();
      break;
    default:    
      //logAMismatch(mtype);
    }  
    return false;
  }

  switch(mtype) {
  case "message":
    text = "<b>" + mc.utils.escapeHtml(msg.user) + "</b>: " + mc.utils.escapeHtml(msg.text);
    break;

  case "rejectusername":
    up.user = msg.user;
    text = "<b>Your username has been set to <em>" + mc.utils.escapeHtml(up.user) +
        "</em> because the name you chose is in use.</b>";
    break;

  case "userlist":
    //handleUserlistMsg(msg);
    vw.showUserList(msg.users);
    break;
    
  case "invite":
    handleInviteMsg(msg);
    break;

  case "accept":
    if ( ! stateIs("outCall")) { logAMismatch(mtype); break; }
    if ( ! msg.sid) { console.log("An ACCEPT without SID"); }
    up.sid=msg.sid;
    peerBox.startCall(vw.getVideoCx());
    break;

  case "rejectCall": // The other peer is busy or produces errors
    if ( ! targetIsMe(msg)) break;
    if (stateIs("outCall")) {
      text = msg.alert || "is busy";
      text = mc.utils.escapeHtml(msg.user) + " " + text;
      handleHangUpMsg(msg);
    }
    else if (stateIs("preparing") || stateIs("inCall")) { 
      text = mc.utils.escapeHtml(msg.user) + " " + msg.alert;
      processedByPeerBox=peerBox.handleMessage(msg);
    }
    else { logAMismatch(mtype); break; }
    break;
  
  case "hang-up":
    if ( ! targetIsMe(msg)) break;
    if (stateIs("inCall") || stateIs("outCall")) { handleHangUpMsg(msg); }
    else if (stateIs("preparing") || stateIs("speak")) { processedByPeerBox=peerBox.handleMessage(msg); }
    else  { logAMismatch(mtype); break; }
    break;
    
  case "video-offer":
    if ( ! stateIs("inCall")) { logAMismatch(mtype); break; }
    if ( ! targetIsMe(msg)) break;
    processedByPeerBox=peerBox.handleMessage(msg);
    break;
    
  case "pollNoData":
    break;
    
  default:
    // Care for the RTC Signaling messages
    if (stateIs("preparing") || stateIs("speak")) { processedByPeerBox=peerBox.handleMessage(msg); }
    //if ( ! processedByPeerBox) log("Unknown message received:"+mc.utils.dumpArray(msg));
  }

  if (text.length) { vw.addToChat(text); }
}// end handleMessage


function targetIsMe(msg) {
  var target="<mad evil thing>", sid="nonexist";
  if (msg.target) target=msg.target;
  if (msg.sid) sid=msg.sid;
  if (target != up.user || sid != up.sid) {
    console.log("Got a mis-addressed message, target="+target+" , sid="+sid);
    return false;
  }
  return true;
}

function logAMismatch(input) {
  console.log("Warning! State "+state+" does not allow "+input);
}

function handleClick(event) {
  //alert(evt.target.id);
  var clicked=event.target.id;
  
  if (stateIs("inactive")) {
    if (clicked == "loginBtn") { onLoginClicked(); }
    else { logAMismatch(clicked); }
    return false;
  }
  
  switch (clicked) {
  case "logoutBtn":
    if ( ! stateIs("ready")) { onHangupClicked(); } // >ready
    onLogoutClicked();
    break;
  case "hangupBtn":
    if (stateIs("ready")) { logAMismatch(clicked); break; }
    onHangupClicked();
    break;
  case "sendBtn":
    onSendClicked();
    break;
  case "callBtn":
    if ( ! stateIs("ready")) {
      //alert("You can't start a call because you already have one open!");
      logAMismatch(clicked); break;
    }
    onCallClicked();
    break;
  case "loginBtn":
    break;
  default:
    throw new Error("Unknown clicked ID:"+clicked);
  }
  return false;
}

function onLogoutClicked() {
  /*// remove all my messages from server
    signallingConnection.sendToServer({
    act : "clearAuthor",
    user : up.user
  });*/
  vw.addToChat("User <b>"+up.user+"</b> has logged out");
  vw.clearUserList();
  setTimeout(function() { signallingConnection.disconnect(); setState("inactive"); }, 1000);    
}

// Handles a click on the Send button (or pressing return/enter) by
// building a "message" object and sending it to the server.
function onSendClicked() {
  var target=vw.getPeerName();// NOT from mc.userParams.targetUsername, so that you can chat and speak with different users  
  if ( ! target) {
    //vw.showAlert("Peer user name required");
    alert("Peer user name required");
    return false;
  }
  var msg = {
    text: vw.getTextInp(),
    type: "message",
    id: up.clientID,
    date: Date.now(),
    user: up.user,
  };  
  //alert(target);
  if (target) msg.target=target;
  signallingConnection.sendRelay(msg);
  vw.clearTextInp();
}


function onHangupClicked() {  
  if (stateIs("preparing") || stateIs("speak")) {
    console.log("call ended by user");
    peerBox.hangUpCall();
  }
  else {
    signallingConnection.sendLogNRelay({
      user: up.user,
      target: up.targetUsername,
      sid : up.sid,
      type: "hang-up",
    });
  }
  up.sid="";
  setState("ready");
}

// Handler for keyboard events. This is used to intercept the return and
// enter keys so that we can call send() to transmit the entered text
// to the server.
function handleKey(evt) {
  if (evt.keyCode === 13 || evt.keyCode === 14) {
    if ( ! document.getElementById("sendBtn").disabled) {
      onSendClicked();
    }
  }
}

// Called when the "id" message is received; this message is sent by the
// server to assign this login session a unique ID number; in response,
// this function sends a "username" message to set our username for this
// session.
function setUsername() {
  up.user = vw.getUsername();

  signallingConnection.sendToServer({
    user: up.user,
    date: Date.now(),
    id: up.clientID,
    type: "username",
    act: "username"
  });
}

function rejectCall(aTargetUsername, alert) {
  if (alert === undefined) alert="";
  log("Rejected a call from "+aTargetUsername+" "+alert);
  var msg={
    user: up.user,
    target: aTargetUsername,
    type: "rejectCall"
  };
  if (alert) msg.alert=alert;
  signallingConnection.sendRelay(msg);
}

function onCallClicked() {
  
  var clickedUsername = vw.getPeerName();
  if ( ! clickedUsername) {
    alert("peer name required");
    return;
  }
  // Don't allow users to call themselves, because weird.
  if (clickedUsername === up.user) {
    alert("Sorry, talking to oneself is not supported in the free version :)");
    return;
  }
  
  log("Trying to start an outgoing call");  
  up.targetUsername = clickedUsername;
  log("Inviting user " + up.targetUsername);
  vw.addToChat("Calling "+up.targetUsername);
  setState("outCall");
  vw.enableHangUp();
  var requestVideo=sp.allowVideo && vw.getVideoCx();
  
  signallingConnection.sendRelay({
    user: up.user,
    id: up.clientID,
    target: up.targetUsername,
    type: "invite",
    video: requestVideo
  });
}

function handleInviteMsg(msg) {
  var attempting=msg.user;
  var alert;
  
  if ( ! stateIs("ready")) {
    rejectCall(attempting);
    vw.addToChat("Rejected a call from "+attempting);
    return;
  }
  if ( msg.video && msg.video == "video" ) {
    if ( ! sp.allowVideo || (vw.getVideoCx() != "video")) {
      rejectCall(attempting, "video is off, try audio call");
      vw.addToChat("Rejected a call from "+attempting);
      return;
    }  
  }
  
  if (vw.getRingCx()) { 
    // produce ring sound
    vw.audios.ring.el.play();
    setTimeout( function() { handleInvite2(msg); },100 );
    //var a=new Audio();
    //a.oncanplaythrough=function() { a.play(); handleInvite2(msg); };
    //a.src="assets/i3_ring.mp3";
  }
  else {handleInvite2(msg); } // no ringing
}

function handleInvite2(msg) {
  var attempting=msg.user;
  if (vw.getAnswerCx()) { acceptInvite(msg); }
  else {
    // must ask user
    mc.utils.confirmDialog(attempting+" is calling")
      .then(function() {
        acceptInvite(msg);
      })
      .catch(function() {
        rejectCall(attempting);
        setState("ready");
      });
    }
}

function acceptInvite(msg) {
  up.targetUsername = msg.user;
  vw.setPeerName(up.targetUsername);
  log("Starting to accept invitation from " + up.targetUsername);
  vw.addToChat(up.targetUsername + " is calling");
  setState("inCall");
  vw.enableHangUp();
  
  up.sid=mc.utils.randomString(10);
  signallingConnection.sendLogNRelay({
    user: up.user,
    id: up.clientID,
    callerId: msg.id,
    sid: up.sid,
    target: up.targetUsername,
    video: msg.video,
    type: "accept"
  });
}

function handleHangUpMsg(msg) {
  view.clearVideo();
  view.disableHangUp();
  up.targetUsername = null;
  up.sid="";
  cb.setState("ready");
}

function setState(aState) {
  if (states.indexOf(aState) < 0) throw new Error("Unknown state="+aState);
  state=aState;
  log("Call state changed to:"+state);
  vw.showState(state);
}

function stateIs(aState) {  
  if (states.indexOf(aState) < 0) throw new Error("Unknown query state="+aState);
  return (state == aState);
}

function _getSignallingConnection(WsOrAjax) {
  if (WsOrAjax == "ws") { return new mc.rtcb.WsTransport(); } 
  return new mc.rtcb.AjaxTransport(); 
}

function getSignallingConnection(connector,WsOrAjax) {
  return new mc.rtcb.SignallingConnection(connector,WsOrAjax); 
}

function init(connector) {
  vw=new mc.rtcb.ViewW();
  vw.serverParams2Dom(mc.serverParams);
  vw.loadAudio();
  signallingConnection = getSignallingConnection(connector,mc.serverParams.wsOn);
  signallingConnection.init(_this.handleMessage);
  var callbacks={ 
    setState : this.setState, log : this.log, disableHangUp : vw.disableHangUp,
    showAlert : vw.showAlert, addToChat : vw.addToChat
  };
  peerBox=new mc.rtcb.PeerBox(signallingConnection, vw, callbacks, up);
  vw.setClickHandlers(_this);
  setState("ready");
  vw.enableButtons();
  //setState("inactive");
}

var _this={
  setState : setState,
  log : log,
  init : init,
  // click handlers 
  handleClick : handleClick,
  handleKey : handleKey,
  // message handler for transport callback
  handleMessage : handleMessage,
}

return _this;
};// end Controller

mc.rtcb.SignallingConnection=function(connector,WsOrAjax) {
  //{ init: initAjax, sendToServer : sendToServerAjax, disconnect : disconnectAjax }
  var _this=this;
  var onMessage=function abstract(data) { alert("Redefine me properly!"); };
  
  //--------------------------AJAX polling----------------------
  
  function initAjax(aHandleMessage) {
    if ( ! aHandleMessage instanceof Function) throw new Error("Invalid callback");
    onMessage=aHandleMessage;
    connector.push.registerPushCallback(_this.unpackMessages);
    connector.pull.registerPullCallback(_this.unpackMessages);
  }
  
  this.unpackMessages=function(msgObj) {
    if (msgObj.pack && msgObj.pack instanceof Array) {
      console.log("Ajaxer got a pack of "+msgObj.pack.length+" messages");
      msgObj.pack.forEach( function(m) { onMessage(m); } );
      return;
    }
    else { onMessage(msgObj); }
  };
  
  function sendRelayAjax(msgObj) { connector.push.sendRelay(msgObj); }
  
  function sendLogNRelayAjax(msgObj) { connector.push.sendLogNRelay(msgObj); }
  
  function sendToServerAjax(msgObj) { 
    alert("Not to be used"); throw new Error("Not to be used");
    if ( ! msgObj.act) msgObj.act="relay";
    connector.push.sendAsJson(msgObj);
    //ajaxer.setTransport("post");
    //ajaxer.postAsFormData({ json : JSON.stringify(msgObj) }, 10000); // causes unreadable sdp
  }
  
  function disconnectAjax() {
    connector.pull.stop();
  }
  
  //------------------------WebSockets-----------------------
  
  function initWs(aHandleMessage) {
    if ( ! aHandleMessage instanceof Function) throw new Error("Invalid callback");
    connector.push.registerPushCallback(aHandleMessage);
    connector.pull.registerPullCallback(aHandleMessage);
  }
      
  function sendRelayWs(msgObj) {
    if (msgObj.type && msgObj.type == "message") connector.push.sendRelay(msgObj);
    else connector.pull.sendRelay(msgObj);
  }
  
  function sendLogNRelayWs(msgObj) {
    connector.pull.sendRelay(msgObj);// relay through WS
    connector.push.sendLogNRelay(msgObj);// log through upload.php
  }
  
  function sendToServerWs() { alert("Not to be used"); }
  
  function disconnectWs() {
    connector.pull.stop();
  }
  
  //-----------abstract factory-------------------------------
  
  if (WsOrAjax == 'ajax' || WsOrAjax === '0' || WsOrAjax === false) {
    return { init: initAjax, sendRelay: sendRelayAjax, sendLogNRelay: sendLogNRelayAjax, sendToServer: sendToServerAjax, disconnect: disconnectAjax };
  }
  else {
    return { init: initWs, sendRelay: sendRelayWs, sendLogNRelay: sendLogNRelayWs, sendToServer: sendToServerWs, disconnect: disconnectWs };
  }
}
