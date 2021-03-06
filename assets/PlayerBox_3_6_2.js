"use strict";
if ( ! mc) mc={};//namespace
mc.pb={};

mc.pb.PlayerBox=function(connector) {
  var _this=this,
      viewP={},
      serialPlayer={},
      userParams={},
      serverParams={},
      inventory={},
      firstResponse=1,// 1,0
      changesMap={},
      urlprefix="",// used by serialPlayer and
      standby=0,
      storedPollFactor,
      standbyPollFactor=100
      ;
  
  this.init=function(fromServer) {
    serverParams=fromServer;
    viewP=new mc.pb.ViewP();
    viewP.clearMessage();
    viewP.serverParams2dom(serverParams);
    viewP.blurActive();
    //this.dom2userParams();
    mc.userParams.pb=new mc.utils.Registry(viewP.getParams());
    userParams=mc.userParams.pb;
    inventory=new mc.pb.Inventory(userParams);    
    if ( ! serverParams.mediaFolder) throw new Error("MEDIAFOLDER required from server");
    urlprefix=serverParams.pathBias+userParams.realm+"/"+serverParams.mediaFolder+"/";
    serialPlayer=new mc.pb.SerialPlayer(urlprefix, this.getNextClip, this.isVideo, viewP, onMediaError);    
    viewP.setHandlers(_this.listClicked,_this.dom2userParams, serialPlayer.stopAfter, _this.clear, _this.toggleStandby);
    connector.pull.registerPullCallback(_this.takeResponseP);
  };
  
  this.reinit=function() {
    // to revive polling after sleep on mobile
    this.dom2userParams();
    connector.pullReinit();
  };
  
  this.takeResponseP=function(resp) { 
    var ps,al;
    if (resp.free) viewP.showFreeSpace(resp.free);
    if (resp.users) { 
      viewP.showUsers(resp.users);
    }
    if (resp.hasOwnProperty("list")) {
      //console.log(mc.utils.dumpArray(userParams));
      changesMap=inventory.consumeNewCatalog(resp.list);
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
    var playData;
    if (toPlay && ! toPlay instanceof Array) throw new Error("Wrong argument type="+(typeof toPlay));
    if (toPlay && ! firstResponse) {
      playData={ id : toPlay[0], mime: toPlay[3], el:false };
      serialPlayer.supplyClip(playData);
    }
    firstResponse=0;// allows playing new items    
  }
    
  this.getDebugApi=function() {  
    
    function doSendAltUserClip(blob) {
      var mime="audio/ogg";
      var ext="oga";
      var blobPlusData={ mime: mime, ext : ext, blob : blob};
      var up={ user:"ShadowInPlayerBox", realm:"test0" };
      var lastRecordedTime=2;
      var description="Shadow's clip";
      connector.push.sendBlobAndData(blobPlusData,lastRecordedTime,description,up);      
    }
    
    function sendAltUserClip() {
      //alert(sendAltUserClip.blob);
      if ( ! sendAltUserClip.blob) {
        var name="purr1s.oga";     
        var uri=mc.utils.path()+name;
        //alert(uri);
        mc.utils.getBlobByUri(uri, function(blob) {
          sendAltUserClip.blob=blob;
          doSendAltUserClip(blob); 
        });
      }
      else { doSendAltUserClip(sendAltUserClip.blob); }
    }
    
    return {
      getResponse : function() { return connector.pull.getResponse(); },
      linkIsBusy : function() { return connector.pull.linkIsBusy(); },
      sendClear : function() { return connector.push.sendClear(); },
      sendPoll : function(moreParams) { return connector.pull.sendPoll(moreParams); },
      sendLongPoll : function(moreParams) { return connector.pull.sendLongPoll(moreParams); },
      sendDelete : function(file) { return connector.push.sendDelete(file); },
      sendRemoveExpired : function() { return connector.push.sendRemoveExpired(); },
      sendEchoRequest : function() { 
        var toSend={ user:userParams.user, realm:userParams.realm, act:"echo" };
        toSend=JSON.stringify(toSend);
        return connector.pull.sendData(toSend);     
      },
      sendAltUserClip : sendAltUserClip,
      setUpConnQueueMax : function(n) { connector.push.setQueueMax(n); },
      connect : function() { return connector.pull.connect(); },
      disconnect : function() { return connector.pull.disconnect(); },  
      getChangesMap : function() { return changesMap; },
      getPlayerStateExt : function() { return serialPlayer.getStateExt(); },
      getStandby: function() { return _this.getStandby(); },
      changeId: function(i,newId) {
        var oldId=inventory.changeId(i,newId);
        if ($(oldId)) $(oldId).id=newId;
        return oldId;
      },
      getCatalogLength: function() { return inventory.getCatalogLength(); }
    }
  };
  
  this.sendDelete=function(file) { return connector.push.sendDelete(file); };
  
  this.listClicked=function(event) {
    //alert("click");
    var c=viewP.locateClick(event);
    if ( ! c || ! c.command) return false;
    //alert(c.id+" "+c.command);
    if (c.command == "play") {
      _this.toggleStandby(0);
      mc.utils.play(urlprefix+c.id, _this.isVideo(c.id), "playerRoom", onMediaError);
    }
    else if (c.command == "playDown") { 
      _this.toggleStandby(0);
      serialPlayer.stop();// make sure state=idle
      serialPlayer.supplyClip({ id : c.id, mime : _this.isVideo(c.id), el : false });
    }
    else if (c.command == "delete") { _this.sendDelete(c.id); }
    return false;    
  };
  
  this.getUserParams=function() { return userParams; };
  
  function onMediaError(msg) { 
    console.log("Caught a media error:"+msg); 
    viewP.showMessage(msg);
    //serialPlayer.stop();
    return false;
  }
  
  this.getNextClip=function(id) { return inventory.getNextClip(id); };
  
  this.dom2userParams=function() { 
    userParams.overrideValuesBy(viewP.getParams());
    viewP.blurActive();
    //console.log(mc.utils.dumpArray(userParams));
    // no return false !!!
  };

  this.isVideo=function(id) { return inventory.isVideo(id); };
  
  this.clear=function() { serialPlayer.stop(); };
  
  this.pause=function() { serialPlayer.pause(); };
  
  this.unpause=function() { if ( ! standby) serialPlayer.unpause(); };
  
  this.toggleStandby=function(target) {
    // onclick passes object as an argument
    if (typeof target == "number" || typeof target == "boolean" ) {
      if (standby == target) return;
      standby= ! target;
      //console.log("target:"+(typeof target)+", a standby="+ standby);
    } 
    //console.log("standby="+ standby);
    if (standby) {
      serialPlayer.unpause();
      viewP.standbyInd.off();
      if (storedPollFactor) {
        viewP.serverParams2dom({pollFactor : storedPollFactor});
        _this.dom2userParams();
        storedPollFactor=false;
      }  
    }
    else {
      serialPlayer.pause();
      viewP.standbyInd.on();
      storedPollFactor=false;
      if (userParams.pollFactor != "off") {
        storedPollFactor=userParams.pollFactor;
        viewP.serverParams2dom({pollFactor : standbyPollFactor});
        _this.dom2userParams();
      }  
    }
    standby= ! standby;
    console.log("standby set to "+ standby);
    return false;
  }
  
  this.getStandby=function() { return standby; };
  
  if (typeof document.hidden != "undefined") {
    document.addEventListener("visibilitychange",function() {
      if ( ! document.hidden) {
        //alert("Hi again");
        _this.reinit();
      }
    });
  }
   
}// end PlayerBox

mc.pb.Inventory=function(userParams) {
  var catalog={}, oldCatalog={}, _this=this;
  
  this.getNextClip=function(id) {
    var i=0, l=catalog.length, clip={};
    i=findIById(catalog, l, id);
    // if i===false assumed 0 -- start from the lowest
    if (i+1 >= l) return false;// top of list reached
    if ( ! userParams.skipMine) { clip=catalog[i+1]; }
    else {
      clip=findFirstNotMine(catalog, i+1);
      if ( ! clip) return false; // all clips are uneligible
    }
    //alert("i="+i+", l="+l);
    return { id : clip[0], mime : clip[3] };
  };
  
  this.consumeNewCatalog=function(newCat) {
    var diff=diffCatalogsById(newCat);
    catalog=newCat;
    if ( ! userParams.playNew || ! diff.added.length) diff.toPlay=false;
    else if ( ! userParams.skipMine) diff.toPlay=diff.added[0];
    else diff.toPlay=findFirstNotMine(diff.added);
    return diff;
  };
  
  function findFirstNotMine(clipList, start) {
    if (typeof start == "undefined") start=0;
    var i=start, l=clipList.length;
    for(; i<l; i+=1) {
      if (clipList[i][1] != userParams.user) return clipList[i];
    }
    return false;
  }
  
  function diffCatalogsById(newCat) {
    var removed=[],added=[],lOld=catalog.length,lNew=newCat.length,i=0,j=0,r={},id;
    for(i=0; i < lNew; i+=1) {
      id=newCat[i][0];
      if ( ! findClipById(catalog,lOld,id) ) added.push(newCat[i]);
    }
    for(i=0; i < lOld; i+=1) {
      id=catalog[i][0];
      if ( ! findClipById(newCat,lNew,id) ) removed.push(catalog[i]);
    }
    r={ removed:removed, added:added, newLength: lNew };
    return r;
  }
  
  function findClipById(clipList,l,id) {
    var j=0;
    for(; j<l; j++) { if (clipList[j][0]  == id ) return clipList[j]; }
    return false;
  };
  
  function findIById(clipList,l,id) {
    var j=0;
    for(; j<l; j++) { if (clipList[j][0]  == id ) return j; }
    return false;
  }
  
  this.isVideo=function(id) { 
    var mime=findClipById(catalog, catalog.length, id)[3];
    if (mime.indexOf("video") === 0) return "video";
    else if (mime.indexOf("audio") === 0) return "audio";
    throw new Error("Unknown mime type="+mime);
  };
  
  this.changeId=function(index,newId) {
    if (index >= catalog.length) throw new Error("Out of catalog:"+index+"/"+catalog.length);
    if ( ! catalog[index] instanceof Array) throw new Error("Something is wrong with index");
    var oldId=catalog[index][0];
    catalog[index][0]=newId;
    return oldId;
  };
  
  this.getCatalogLength=function() { return catalog.length; };
  
}// end Inxentory

mc.pb.ViewP=function() {
  var _this=this,
      user="",
      playerRoom=document.getElementById("playerRoom"),
      hideable=$("playerPanel").getElementsByClassName("hideable"),
      emptyListTr='<tr id="listPlaceholder"><td>&lt;no records&gt;</td></tr>',
      showMore=0;
  
  function getShowMore() { return showMore; }
  function setShowMore(s) { showMore=s; }
      
  this.toggleHideable=function() { mc.utils.toggleHideable(hideable,getShowMore,setShowMore); };
  this.toggleHideable();
  
  this.standbyInd=new mc.utils.Indicator("standbyBtn", [["","auto"], ["","alert"]]);
  
  this.serverParams2dom=function(sp) {
    if (sp.hasOwnProperty("showMore")) {
      showMore=sp.showMore;
      this.toggleHideable();     
    }
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
    var mle=$("medialistT");
    var i, tr, phe;

    for(i=0; i<rml; i+=1) {
      tr=document.getElementById(diff.removed[i][0]);
      tr.parentNode.removeChild(tr);
      tr=null;
    }
    phe=document.getElementById("listPlaceholder");
    if (diff.newLength > 0) {// remove placeholder
      if (phe) {
        phe.parentNode.removeChild(phe);
        phe=null;
      }
    }
    else {// add placeholder
      if ( phe == null ) replace(mle,emptyListTr);//mle.innerHTML=emptyListTr;
    }
    for(i=0; i<adl; i+=1) {
      tr=renderLine(diff.added[i]);
      prepend(mle,tr);
    }
  };
  
  function prepend(table,tr) {
    var firstInTable=table.firstChild;
    if (firstInTable === null || firstInTable.nodeName === "TR") {
      table.insertBefore(tr, firstInTable);// latest at top
    }
    else if (firstInTable.nodeName === "TBODY") {
      firstInTable.insertBefore(tr, firstInTable.firstChild);// latest at top
    }
    else throw new Error("Table contains unknown element "+firstInTable.nodeName);
  }
  
  function replace(table,trString) {
    var firstInTable=table.firstChild;
    if (firstInTable === null || firstInTable.nodeName === "TR") {
      table.innerHTML=trString;
    }
    else if (firstInTable.nodeName === "TBODY") {
      firstInTable.innerHTML=trString;
    }
    else throw new Error("Table contains unknown element "+firstInTable.nodeName);
  }
  
  // @return HTMLElement tr
  function renderLine(l) {
    if ( ! l instanceof Array) throw new Error("Wrong argument type "+(typeof l));
    var r="", i=0, ll=l.length, delLink="<td></td>", descr="",aov="",aovPlusTitle="";
    var tr=document.createElement("TR");
    if (l[1] == user) delLink='<td class="delete">'+"delete"+"</td>";
    if (l[7]) descr="<br />"+l[7];
    r+="<td title=\""+l[0]+"\">"+l[1]+" "+l[2]+descr+"</td>";
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
  
  _this.showClip=function(a) { playerRoom.prepend(a); };
  _this.clearClip=function(a) { if (a && playerRoom.contains(a.el)) playerRoom.removeChild(a.el); };
  _this.replaceClip=function(newc,oldc) { playerRoom.replaceChild(newc,oldc); };
    
  this.setHandlers=function(listClicked, dom2userParams, stopAfter, clear, standby) {    
    $("medialistT").onclick=listClicked;
    $("refreshSelect").onchange=dom2userParams;
    $("playNewChkb").onchange=dom2userParams;
    $("skipMineChkb").onchange=dom2userParams;
    // dom2userParams > setSelect > activeElement.blur, so no explicit blur calls
    $("stopAfterBtn").onclick=stopAfter;
    $("clearBtn").onclick=clear;
    $("standbyBtn").onclick=standby;
    // onkeydown 27 = clear SEE top controller
    $("toggleHideablePlB").onclick=_this.toggleHideable;
  };
  
  this.blurActive=function() { document.activeElement.blur(); }
}

mc.pb.SerialPlayer=function(urlprefix, getNextClip, getType, viewP, errorHandler) {
  if (typeof getNextClip != "function") throw new Error("Non-function argument");
  if (errorHandler && typeof errorHandler != "function") throw new Error("Invalid ERRORHANDLER");
  var actual=false,
      next=false,
      _this=this,
      stopping=false,
      paused=false,
      state="idle";
      
  this.getState=function() {    
    if ( ! paused) {
      if (stopping && ! actual) throw new Error("STOPPING set without ACTUAL");
      if (stopping)  return "stopping";
      if ( ! actual && ! next) return "idle";
      if ( ! actual && next) throw new Error("NEXT set without ACTUAL");
      if ( actual && ! next) return "playing";
      if ( actual && next) return "playingNLoading";
    }
    else {
      if (stopping && ! actual) throw new Error("STOPPING set without ACTUAL");
      if (stopping)  return "pausedStopping";
      if ( ! actual && ! next) return "suspendedIdle";
      if ( ! actual && next) return "suspendedLoading";;
      if ( actual && ! next) return "pausedPlaying";
      if ( actual && next) return "pausedPlayingNLoading";      
    }
    throw new Error("Not to get here");    
  };
  
  this.getStateExt=function() {
    return { a : actual, n : next, p : paused, state : this.getState() };
  };
  
  //@param idPlus Object  { id : "file_name", mime : "audio"|"video", el : false|"mediaElement" }
  this.supplyClip=function(idPlus) {
    var s=_this.getState();
    if (s == "idle") { playFrom(idPlus); }
    else if ( ! next) { tryEnqueue(idPlus); }    
  };
    
  this.pause=function() {
    if (paused) return;
    paused=true;
    if (actual) { actual.el.pause(); }
    //console.log("player paused, state="+_this.getState());
  };
  
  this.unpause=function() {
    if ( ! paused) return;
    paused=false;
    //console.log("player unpaused");// _this.getState() here causes error
    if (actual) { 
      if ( ! actual.el.paused) throw new Error("PAUSED set without mediaElement paused");
      actual.el.play();
    }
    else if (next) {
      runNext();
      tryHandover();
      // setTimeout here causes forbidden state (actual -, next +) just after return
    }
    else {} // pausedIdle > isle    
  };
  
  this.stopAfter=function() {
    var s=_this.getState();
    if (s == "suspendedLoading") {
      if (next.id) viewP.highlightLine(next.id,"n");
      next=false;
      return;
    }
    if ( ! actual) return;
    stopping=true; 
  };
      
  this.tryFeed=function() {
    tryEnqueue(getNextClip(actual.id));
  };
  
  this.stop=function() {
    if (actual.id) viewP.highlightLine(actual.id,"n");
    if (next.id) viewP.highlightLine(next.id,"n");
    viewP.clearClip(actual);
    viewP.clearClip(next);
    actual=false;
    next=false;
    //console.log("player stopped by user");   
  };
  
  function playFrom(idPlus) {   
    if ( ! idPlus.id) throw new Error("Clip without ID");
    if (idPlus.el) throw new Error("Clip with EL")
    actual=createMediaElement(idPlus,true,errorHandler);
    if (actual.mime == "video") viewP.showClip(actual.el);
    next=false;
    console.log("playing from "+actual.id);
    viewP.highlightLine(actual.id,"p");
    _this.tryFeed();
  };
  
  function tryEnqueue(idPlus) {
    if (next) return false;
    if ( ! idPlus) return false;
    if (idPlus.el) throw new Error("Clip with EL")
    next=createMediaElement(idPlus,false,errorHandler);
    //console.log("loading "+next.id+" "+next.mime);
    viewP.highlightLine(next.id,"l");
    //var state="?";
    //try { state=this.getState(); } catch (e) { state="wrong"; } // always gets wrong
    console.log("enqueued "+next.id/*+", state="+state*/);
  };
  
  function runNext() {
    // first things first
    if (next && ! stopping && next.mime == "video" && ! next.error) {
      if (actual.mime == "video") { viewP.replaceClip(next.el, actual.el); }
      else { viewP.showClip(next.el); }
    }
    else if (actual.mime == "video") { viewP.clearClip(actual); }
    // play() after appendChild() is important for Chromium and unimportant for FF
    if (next && ! stopping && ! next.error) { 
      next.el.play();
      console.log("playing "+next.id);
      viewP.highlightLine(next.id,"p");
    }
    else if (next && ! stopping && next.error) {
      console.log("skipping "+next.id);
      tryHandover();
      runNext();
    } 
  }
  
  function onClipisbad(problemEl,msg) {
    if (problemEl == next.el) {
      console.log("failed to load the scheduled next clip:"+msg);
      viewP.highlightLine(next.id,"e");
      next.error=msg;
    }
    else if (problemEl == actual.el) {
      console.log("failed to load the actual clip:"+msg);
      viewP.highlightLine(actual.id,"e");
      actual.error=msg;
      runNext();
      setTimeout(tryHandover, 0);
    }
    else console.log("onClipisbad: neither next nor actual");
  }
  
  function tryHandover() {
    //console.log("<<"+Date.now());        
    if (! actual.error) viewP.highlightLine(actual.id,"g");
    if (stopping) {
      softStop();
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
    _this.tryFeed();
  }
  
  function softStop() {
    actual=false;
    if (next) viewP.highlightLine(next.id,"n");
    next=false;
    stopping=false;
    console.log("player gracefully stopped by user");    
  }
  
  function createMediaElement(idPlus,autoplay,errorHandler) {
    var el, id, mime;
    
    if ( ! idPlus) throw new Error("Empty 1st argument");
    if ( ! idPlus.mime) { 
      console.log(mc.utils.dumpArray(idPlus));
      throw new Error("Argument must contain id and mime");
    }
    id=idPlus.id;
    mime=idPlus.mime;
    if (mime.length > 5) mime=mime.substr(0,5);
    if (mime == "audio") { el=new Audio(); }
    else if (mime == "video") {
      el=document.createElement('video');
    }
    else throw new Error("Wrong MIME="+mime);
    if (errorHandler) {
      el.onerror=function() {
        onClipisbad(el, el.error.message);
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
    if (autoplay) {
      el.autoplay=true; //may fail as autoplay is disabled in some browsers
      el.oncanplaythrough=function() {  
        //console.log("Media is ready"); 
        var promise=el.play();
        if (promise.catch && promise.catch instanceof Function) { 
          promise.catch(function(error) {
            if (error.name === "NotAllowedError") { alert("You should enable autoplay in you browser"); }
            else { alert("Something is wrong with media playing"); }
          });
        }
      };
    }
    //el.controls=true;
    el.src=urlprefix+id;
    return { el: el, id: id, mime: mime, error: false };
  }

}// end SerialPlayer
