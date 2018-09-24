"use strict";
if ( ! mc) mc={};//namespace
mc.pb={};

mc.pb.PlayerBox=function(upConnection) {
  var _this=this,
      viewP={},
      serialPlayer={},
      userParams={},
      serverParams={},
      inventory={},
      firstResponse=1,// 1,0
      changesMap={},
      dataSource={},
      urlprefix="",// used by serialPlayer and 
      isPaused=0;// 0,1, or params of a suspended incoming clip
  
  this.init=function(fromServer) {
    serverParams=fromServer;
    viewP=new mc.pb.ViewP();
    viewP.clearMessage();
    viewP.applyServerParams(serverParams);
    this.applyParams();
    inventory=new mc.pb.Inventory();    
    dataSource=getDataSource(serverParams.wsOn);   
    if ( ! serverParams.mediaFolder) throw new Error("MEDIAFOLDER required from server");
    urlprefix=serverParams.pathBias+userParams.realm+"/"+serverParams.mediaFolder+"/";
    serialPlayer=new mc.pb.SerialPlayer(urlprefix, this.getNextId, this.isVideo, viewP, onMediaError);    
    viewP.setHandlers(_this.listClicked,_this.applyParams, serialPlayer.stopAfter, _this.clear); 
  };
  
  function getDataSource(websocketsOn) {
    if (websocketsOn) {
      return new mc.pb.WsClient(onWsconnected, takeResponseP, _this.onPollhangs, userParams, serverParams, upConnection);
    }
    else {
      return new mc.pb.Poller(serverParams.pathBias+"download.php", takeResponseP,  _this.onPollhangs, _this.getUserParams, serverParams);
    }    
  }
  
  function onWsconnected() {
    console.log("requesting the catalog from uplink");
    upConnection.sendGetCatalog(userParams.user, userParams.realm);
  }
  
  function takeResponseP(resp) { 
    var ps,al;
    if (resp.free) viewP.showFreeSpace(resp.free);
    if (resp.users) { 
      viewP.showUsers(resp.users);
    }
    if (resp.list) {
      //console.log(mc.utils.dumpArray(userParams));
      changesMap=inventory.consumeNewCatalog(resp.list, userParams);
      viewP.applyDiff(changesMap);
      //console.log(mc.utils.dumpArray(changesMap));
      tryToPlay(changesMap.toPlay);
    }     
    if (resp.error) viewP.showMessage("Error! "+resp.error);
    ps=serialPlayer.getState();
    if (ps != "playing" && ps !="playingNLoading") {
      if (resp.alert) { 
        al=resp.alert;
        if (resp.lag) al+=" fulfiled in "+resp.lag+"ms";
        viewP.showMessage(al);
      }
      //else viewP.showMessage(resp.alert || mc.utils.dumpArray(resp) || "<empty>");
    }
  }
  
  function tryToPlay(toPlay) {
    var ps,playData;
    if (toPlay && ! toPlay instanceof Array) throw new Error("Wrong argument type="+(typeof toPlay));
    if (toPlay && ! firstResponse) {
      ps=serialPlayer.getState();         
      if (ps == "idle") {
        playData={ id : toPlay[0], mime: toPlay[3], el:false };
        if ( ! isPaused) { serialPlayer.play(playData); }
        else {
          if (typeof isPaused != "object") {// queued already
            isPaused=playData;
            console.log("stashed "+playData.id);
          }  
        }// store until unpause
      }
      else if (ps == "playing") serialPlayer.tryFeed();
      // other states -- do nothing
    }
    firstResponse=0;// allows playing new items    
  }
    
  this.getDebugApi=function() {  
    return {
      getResponse : function() { return dataSource.getResponse(); },
      linkIsBusy : function() { return dataSource.linkIsBusy(); },
      sendClear : function() { return upConnection.sendClear(); },
      sendPoll : function(moreParams) { return dataSource.sendPoll(moreParams); },
      sendLongPoll : function(moreParams) { return dataSource.sendLongPoll(moreParams); },
      sendDelete : function(file) { return upConnection.sendDelete(file); },
      sendRemoveExpired : function() { return upConnection.sendRemoveExpired(); },
      sendEchoRequest : function() { 
        var toSend={ user:userParams.user, realm:userParams.realm, act:"echo" };
        toSend=JSON.stringify(toSend);
        return dataSource.sendData(toSend);     
      },
      connect : function() { return dataSource.connect(); },
      disconnect : function() { return dataSource.disconnect(); },  
      getChangesMap : function() { return changesMap; },
      getIsPaused : function() { return isPaused; },
      getPlayerStateExt : function() { return serialPlayer.getStateExt(); }
    }
  };
  
  this.sendDelete=function(file) { return upConnection.sendDelete(file); };
  
  _this.onPollhangs=function() { 
    viewP.showMessage("The request has timed out");
    console.log("The request has timed out");
  };
  
  _this.listClicked=function(event) {
    //alert("click");
    var c=viewP.locateClick(event);
    if ( ! c || ! c.command) return false;
    //alert(c.id+" "+c.command);
    if (c.command == "play") mc.utils.play(urlprefix+c.id, _this.isVideo(c.id),"playerRoom",onMediaError);
    else if (c.command == "playDown") serialPlayer.play({
      id : c.id, mime : _this.isVideo(c.id), el : false}
    );
    else if (c.command == "delete") _this.sendDelete(c.id);
    return false;    
  };
  
  _this.getUserParams=function() { return userParams; };
  
  function onMediaError(msg) { 
    console.log("Caught a media error:"+msg); 
    viewP.showMessage(msg);
    viewP.clearClips();
    return false;
  }
  
  _this.getNextId=function(id) { return inventory.getNextId(id, userParams); };
  
  _this.applyParams=function() { 
    userParams=viewP.getParams();
    viewP.blurActive();
    //console.log(mc.utils.dumpArray(userParams));
    // no return false !!!
  };

  _this.isVideo=function(id) { return inventory.isVideo(id); };
  
  _this.clear=function() { serialPlayer.stop(); viewP.clearClips(); };
  
  _this.pause=function() { 
    console.log("playerBox paused");
    isPaused=1;
    serialPlayer.pause();
  };
  
  _this.unpause=function() { 
    console.log("playerBox unpaused");
    serialPlayer.unpause();
    if (typeof isPaused == "object") serialPlayer.play(isPaused);
    isPaused=0;
  };
   
}// end PlayerBox

mc.pb.Poller=function(responderUri, onData, onHang, fUserParams, serverParams) {
  var _this=this, ticks=0, catalogTime=0, catalogBytes=0, usersListTime=0, catCrc="1234", myUsersList="", response;
  var userParams=fUserParams();
  
  var ajaxerP=new mc.utils.Ajaxer(responderUri, takeUpdatedMarks, {}, onHang); 
    
  _this.onTick=function() {
    userParams=fUserParams();// otherwise uses only a copy, not live params
    //console.log(userParams.pollFactor);
    if (userParams.pollFactor === "off") return;
    if (userParams.pollFactor === "l") {
      if ( ! ajaxerP.isBusy()) _this.sendLongPoll();
      return;
    }
    ticks+=1;
    if (ticks < userParams.pollFactor) return;
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
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=poll";
    qs=addUpdatedMarks(qs);
    qs+="&pollFactor="+userParams.pollFactor;
    if (moreParams) qs+="&"+moreParams;
    ajaxerP.getRequest(qs, 2000);   
  };
  
  this.sendLongPoll=function(moreParams) {
    var qs="";
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=longPoll";
    qs=addUpdatedMarks(qs);
    qs+="&myUsersList="+encodeURIComponent(myUsersList);
    if (moreParams) qs+="&"+moreParams;
    ajaxerP.getRequest(qs, serverParams.longPollPeriodS*1000+2000);    
  };
  
  this._sendDelete=function(file) {
    var qs="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=delete&id="+encodeURIComponent(file);
    ajaxerP.getRequest(qs);    
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
  
  setInterval(_this.onTick, 100);   
};

mc.pb.WsClient=function(onConnect, onData, onHang, userParams, serverParams, upConnection, connectAtOnce) {
  //console.log("serverParams.wsServerUri");
  var conn={onopen:notReady, onmessage:notReady, send:notReady};
  var myHello=JSON.stringify({user:userParams.user, realm:userParams.realm, act:"userHello"});
  var response=[];
  if (typeof connectAtOnce == "undefined") connectAtOnce=true;
  
  function notReady() { throw new Error("The object is not ready"); }
  
  this.connect=function() {    
    conn=new WebSocket(serverParams.wsServerUri);//'ws://localhost:8080'  
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
  
  if (userParams.pollFactor != "off") {
    setInterval(function() {
      upConnection.sendGetCatalog(userParams.user, userParams.realm);
    }, 15000);
  }
};

mc.pb.Inventory=function() {
  var catalog={}, oldCatalog={}, _this=this, userParams={};
  
  _this.getNextId=function(id,aUserParams) {
    userParams=aUserParams;
    var i=0, l=catalog.length, idd, j=1;
    for(;i<l;i+=1) {
      idd=catalog[i][0];
      if (id == idd) {
        if ( ! userParams.skipMine) {
          if (i+1 < l) return {
            id : catalog[i+j][0], mime : catalog[i+j][3]
          };;
          return false
        }
        while(i+j < l) {
          if (catalog[i+j][1] != userParams.user ) return {
            id : catalog[i+j][0], mime : catalog[i+j][3]
          };
          j+=1;
        }
      }
    }
    return false;
  };
  
  this.consumeNewCatalog=function(newCat,aUserParams) {
    userParams=aUserParams;
    var diff=diffCatalogsById(newCat);
    catalog=newCat;
    if ( ! userParams.playNew || ! diff.added.length) diff.toPlay=false;
    else if ( ! userParams.skipMine) diff.toPlay=diff.added[0];
    else diff.toPlay=findFirstNotMine(diff.added);
    return diff;
  }
  
  function removeMyClips(clipList) {
    var r=[], i=0, l=clipList.length;
    for(; i<l; i+=1) {
      if (clipList[i][1] != userParams.user) r.push(clipList[i]);
    }
    return r;
  }
  
  function findFirstNotMine(clipList) {
    var i=0, l=clipList.length;
    for(; i<l; i+=1) {
      if (clipList[i][1] != userParams.user) return clipList[i];
    }
    return false;
  }
  
  function diffCatalogsById(newCat) {
    var removed=[],added=[],lOld=catalog.length,lNew=newCat.length,i=0,j=0,r={},id;
    for(i=0; i < lNew; i+=1) {
      id=newCat[i][0];
      if ( ! _this.findId(catalog,lOld,id) ) added.push(newCat[i]);
    }
    for(i=0; i < lOld; i+=1) {
      id=catalog[i][0];
      if ( ! _this.findId(newCat,lNew,id) ) removed.push(catalog[i]);
    }
    r={removed:removed, added:added};
    return r;
  }
  
  _this.findId=function(clipList,l,id) {
    var j=0;
    for(; j<l; j++) { if (clipList[j][0]  == id ) return clipList[j]; }
    return false;
  };
  
  _this.isVideo=function(id) { 
    var mime =_this.findId(catalog, catalog.length, id)[3];
    if (mime.indexOf("video") === 0) return "video";
    else if (mime.indexOf("audio") === 0) return "audio";
    throw new Error("Unknown mime type="+mime);
  };
  
}// end Inxentory

mc.pb.ViewP=function() {
  var _this=this,
      user="",
      playerRoom=document.getElementById("playerRoom");
  
  this.applyServerParams=function(sp) {
    if (sp.pollFactor) { mc.utils.setSelect("refreshSelect",sp.pollFactor); }
    if (sp.hasOwnProperty("playNew")) { mc.utils.setCheckbox("playNewChkb",sp.playNew); }
    if (sp.hasOwnProperty("skipMine")) { mc.utils.setCheckbox("skipMineChkb",sp.skipMine); }
    if (sp.wsOn) refreshS.style.display="none";
  };
  
  this.getParams=function() {
    user=userInput.value;// needed for DELETE links
    return {
      user : $("userInput").value,
      realm : $("realmInput").value,
      pollFactor : mc.utils.getSelect("refreshSelect"),
      playNew : $("playNewChkb").checked,
      skipMine : $("skipMineChkb").checked
    };
  };
  
  this.applyDiff=function(diff) {
    var rml=diff.removed.length;
    var adl=diff.added.length;
    var i,tr;

    for(i=0; i<rml; i+=1) {
      tr=document.getElementById(diff.removed[i][0]);
      tr.parentNode.removeChild(tr);
      tr=null;
    }
    for(i=0; i<adl; i+=1) {
      tr=renderLine(diff.added[i]);
      //medialistT.appendChild(tr); // latest at bottom
      $("medialistT").insertBefore(tr, medialistT.firstChild);// latest at top
      tr=null;
    }
  };
  
  // @return HTMLElement tr
  function renderLine(l) {
    if ( ! l instanceof Array) throw new Error("Wrong argument type "+(typeof l));
    var r="", i=0, ll=l.length, delLink="<td></td>", descr="",aov="",aovPlusTitle="";
    var tr=document.createElement("TR");
    if (l[1] == user) delLink='<td class="delete">'+"delete"+"</td>";
    if (l[7]) descr="<br />"+l[7];
    r+="<td>"+l[1]+" "+l[2]+descr+"</td>";
    aov=l[3].substr(0,5);
    aovPlusTitle='<b title="'+l[3]+'">'+aov+'</b>';
    r+="<td>"+aovPlusTitle+"</td>";//l[3]
    r+="<td>"+l[4]+"s</td>";
    r+="<td>"+mc.utils.b2kb(l[5])+'</td>';
    r+=delLink;
    r+='<td class="play">'+"play"+"</td>";
    r+='<td class="playDown">'+"play_from"+"</td>";
    tr.innerHTML=r;
    tr.id=l[0];
    return tr;
  }
  
  _this.locateClick=function(event) { 
    event = event || window.event;
    var target = event.target || event.srcElement;
    var tdClass="",trId="";

    while(target.nodeName != 'TABLE') {
      if (target.nodeName == 'TD' && target.className) { tdClass=target.className; }
      else if (target.nodeName == 'TR') { 
        trId=target.id; 
        return {id:trId, command:tdClass};
      } 
      target = target.parentNode;
    }
    return (false);
  };
  
  this.highlightLine=function(id,mode) {
    var l=document.getElementById(id);
    if ( ! l) return;
    l.className=mode;
  };
  
  this.showMessage=function(m) { playerAlertP.innerHTML=m; };
  this.clearMessage=function(m) { playerAlertP.innerHTML=""; };
  
  this.showFreeSpace=function(b) { folderFreeInp.value=mc.utils.b2kb(b); };
  this.showUsers=function(s) { usersS.innerHTML=s; };
  
  _this.showClip=function(a) { playerRoom.appendChild(a); };
  _this.clearClips=function() { playerRoom.innerHTML=""; };
  _this.replaceClip=function(newc,oldc) { playerRoom.replaceChild(newc,oldc); };
  
  this.setHandlers=function(listClicked, applyParams, stopAfter, clear) {    
    $("medialistT").onclick=listClicked;
    $("refreshSelect").onchange=applyParams;
    $("playNewChkb").onchange=applyParams;
    $("skipMineChkb").onchange=applyParams;
    // applyParams > setSelect > activeElement.blur, so no explicit blur calls
    $("stopAfterBtn").onclick=stopAfter;
    $("clearBtn").onclick=clear;
    // onkeydown 27 = clear SEE top controller
  };
  
  this.blurActive=function() { document.activeElement.blur(); }
}

mc.pb.SerialPlayer=function(urlprefix, getNextId, getType, viewP, errorHandler) {
  if (typeof getNextId != "function") throw new Error("Non-function argument");
  if (errorHandler && typeof errorHandler != "function") throw new Error("Invalid ERRORHANDLER");
  var actual=false,
      next=false,
      _this=this,
      stopping=false,
      paused=false,
      state="idle";
  
  _this.play=function(idPlus) {   
    if ( ! idPlus.id) throw new Error("Element without ID");
    if ( ! idPlus.el) {
      actual=createMediaElement(idPlus,true,errorHandler);
      if (actual.mime == "video") viewP.showClip(actual.el);
      next=false;
    }
    console.log("playing from "+actual.id);
    viewP.highlightLine(actual.id,"p");
    this.tryFeed();
  };
  
  _this.tryEnqueue=function(idPlus) {
    if (next) return false;
    if ( ! idPlus) return false;
    next=createMediaElement(idPlus,false,errorHandler);
    //console.log("loading "+next.id+" "+next.mime);
    viewP.highlightLine(next.id,"l");
  };
  
  function runNext() {
    // first things first
    if (next && ! stopping && next.mime == "video") {
      if (actual.mime == "video") { viewP.replaceClip(next.el, actual.el); }
      else { viewP.showClip(next.el); }
    }
    else if (actual.mime == "video") { viewP.clearClips(); }
    // play() after appendChild() is important for Chromium and unimportant for FF
    if (next && ! stopping) next.el.play();    
  }
  
  function tryHandover() {
    //console.log("<<"+Date.now());    
    
    viewP.highlightLine(actual.id,"g");
    if (stopping) {
      actual=false;
      if (next) viewP.highlightLine(next.id,"n");
      next=false;
      stopping=false;
      console.log("player stopped by user");
      return;
    }
    if ( ! next) { _this.tryFeed(); }
    if ( ! next) {
      actual=false;
      console.log("queue ended");
      return;
    }
    actual=next;    
    next=false;
    //console.log("playing "+actual.id);
    viewP.highlightLine(actual.id,"p");
    _this.tryFeed();
  };
  
  function createMediaElement(idPlus,autoplay,errorHandler) {
    var el, id, mime;
    
    if ( ! idPlus.mime) { throw new Error("Argument must contain id and mime"); }
    id=idPlus.id;
    mime=idPlus.mime;
    if (mime.length > 5) mime=mime.substr(0,5);
    if (mime == "audio") el=new Audio();
    else if (mime == "video") {
      el=document.createElement('video');
    }
    else throw new Error("Wrong MIME="+mime);
    if (errorHandler) {
      el.onerror=function() { 
        viewP.highlightLine(actual.id,"e");
        errorHandler(el.error.message);
        return false; 
      };
    }
    el.onended=function() {
      //console.log(">>"+Date.now());  
      runNext();
      setTimeout(tryHandover, 0);      
      //tryHandover();
    };
    el.autoplay=autoplay;
    //el.controls=true;
    el.src=urlprefix+id;
    return { el:el, id:id, mime:mime };
  }
  
  _this.tryFeed=function() {
    if ( ! next) this.tryEnqueue(getNextId(actual.id));
  };
  
  _this.stopAfter=function() { stopping=true; };
  
  _this.stop=function() {
    if (actual.el && ! actual.el.paused) actual.el.pause();
    if (actual.id) viewP.highlightLine(actual.id,"n");
    if (next.id) viewP.highlightLine(next.id,"n");
    actual=false;
    next=false;
    viewP.clearClips();
  };
  
  this.pause=function() {
    if ( ! actual) return;
    paused=true;
    actual.el.pause();
  };
  
  this.unpause=function() {
    if (paused) actual.el.play();
    paused=false;
  };
  
  this.getState=function() {
    if (stopping) return "stopping";
    if (paused) return "playingPaused";
    if ( ! actual && ! next) return "idle";
    if ( ! actual && next) throw new Error("NEXT set without ACTUAL");
    if ( actual && ! next) return "playing";
    if ( actual && next) return "playingNLoading";    
  };
  
  this.getStateExt=function() {
    return { a : actual, n : next, state : this.getState() };
  };

}// end SerialPlayer