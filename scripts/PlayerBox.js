"use strict";
if( ! mc) mc={};//namespace
mc.pb={};

mc.pb.PlayerBox=function() {
  var viewP={}, timerP={}, ajaxerP={}, /*player={},*/ serialPlayer={}, _this=this;
  var catalogTime=0, catalogBytes=0, ticks=0, userParams={}, serverParams={}, inventory={}, firstResponse=1, response={}, changesMap={};
  var urlprefix="";
  //var mediaFolder="media";
  
  this.init=function(fromServer) {
    serverParams=fromServer;
    viewP=new mc.pb.ViewP();
    viewP.clearMessage();
    viewP.applyServerParams(serverParams);
    _this.applyParams();
    inventory=new mc.pb.Inventory();
    
    ajaxerP=new mc.utils.Ajaxer(serverParams.pathBias+"download.php", takeResponseP, {});
    if(serverParams.pollFactor < 3600) setInterval(_this.onTick, 100);
    
    if( ! serverParams.mediaFolder) throw new Error("MEDIAFOLDER required from server");
    urlprefix=serverParams.pathBias+userParams.realm+"/"+serverParams.mediaFolder+"/";
    serialPlayer=new mc.pb.SerialPlayer(urlprefix, this.getNextId, this.isVideo, viewP, onMediaError);
    
    viewP.setHandlers(_this.listClicked,_this.applyParams, serialPlayer.stopAfter, _this.clear);
  };
  
  function takeResponseP(resp) { 
    var ps,toPlay;

    if(resp.catalogBytes) catalogBytes=resp.catalogBytes;
    if(resp.timestamp) catalogTime=resp.timestamp;
    if(resp.free) viewP.showFreeSpace(resp.free);
    if(resp.users) viewP.showUsers(resp.users);
    if(resp.list) {
      //console.log(mc.utils.dumpArray(userParams));
      changesMap=inventory.consumeNewCatalog(resp.list, userParams);
      viewP.applyDiff(changesMap);
      //console.log(mc.utils.dumpArray(changesMap));
      toPlay=changesMap.toPlay;
      if(toPlay && ! firstResponse) {
        ps=serialPlayer.getState();         
        if(ps == "idle") serialPlayer.play({id : toPlay[0], mime: toPlay[3], el:false});
        else if(ps == "playing") serialPlayer.tryFeed();
      }
      firstResponse=0;// allows playing new items
    } 
    
    if(resp.error) viewP.showMessage("Error! "+resp.error);
    ps=serialPlayer.getState();
    if(ps != "playing" && ps !="playingNLoading") {
      if(resp.alert) { viewP.showMessage(resp.alert+" fulfiled in "+resp.lag+"ms"); }
      //else viewP.showMessage(resp.alert || mc.utils.dumpArray(resp) || "<empty>");
    }
    response=resp;
  }
  
  this.getResponse=function() { return response; };
  this.getChangesMap=function() { return changesMap; };
  
  _this.onTick=function() {
    ticks+=1;
    if(ticks < userParams.pollFactor) return;
    ticks=0;
    _this.sendDir();
  };
  
  _this.sendDir=function() {
    var qs="";
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=dir&since="+catalogTime+"&catBytes="+catalogBytes;
    qs+="&pollFactor="+userParams.pollFactor;
    ajaxerP.getRequest(qs);    
  }
  
  _this.listClicked=function(event) {
    //alert("click");
    var c=viewP.locateClick(event);
    if( ! c || ! c.command) return false;
    //alert(c.id+" "+c.command);
    if(c.command == "play") mc.utils.play(urlprefix+c.id, _this.isVideo(c.id),"playerRoom",onMediaError);
    else if(c.command == "playDown") serialPlayer.play({
      id : c.id, mime : _this.isVideo(c.id), el : false}
    );
    else if(c.command == "delete") sendDelete(c.id);
    return false;    
  };
  
  function onMediaError(msg) { 
    console.log("Caught a media error:"+msg); 
    viewP.showMessage(msg);
    viewP.clearClips();
    return false;
  }
  
  function sendDelete(file) {
    var qs="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=delete&id="+encodeURIComponent(file);
    ajaxerP.getRequest(qs);    
  }
  
  _this.getNextId=function(id) { return inventory.getNextId(id,userParams); };
  
  _this.applyParams=function() { 
    userParams=viewP.getParams();
    //console.log(mc.utils.dumpArray(userParams));
    // no return false !!!
  };

  _this.isVideo=function(id) { return inventory.isVideo(id); };
  
  _this.clear=function() { serialPlayer.stop(); viewP.clearClips(); };
   
}// end PlayerBox 

mc.pb.Inventory=function() {
  var catalog={}, oldCatalog={}, _this=this, userParams={};
  
  _this.getNextId=function(id,aUserParams) {
    userParams=aUserParams;
    var i=0, l=catalog.length, idd, j=1;
    for(;i<l;i+=1) {
      idd=catalog[i][0];
      if(id == idd) {
        if( ! userParams.skipMine) {
          if(i+1 < l) return {
            id : catalog[i+j][0], mime : catalog[i+j][3]
          };;
          return false
        }
        while(i+j < l) {
          if(catalog[i+j][1] != userParams.user ) return {
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
    if( ! userParams.playNew || ! diff.added.length) diff.toPlay=false;
    else if( ! userParams.skipMine) diff.toPlay=diff.added[0];
    else diff.toPlay=findFirstNotMine(diff.added);
    return diff;
  }
  
  function removeMyClips(clipList) {
    var r=[], i=0, l=clipList.length;
    for(; i<l; i+=1) {
      if(clipList[i][1] != userParams.user) r.push(clipList[i]);
    }
    return r;
  }
  
  function findFirstNotMine(clipList) {
    var i=0, l=clipList.length;
    for(; i<l; i+=1) {
      if(clipList[i][1] != userParams.user) return clipList[i];
    }
    return false;
  }
  
  function diffCatalogsById(newCat) {
    var removed=[],added=[],lOld=catalog.length,lNew=newCat.length,i=0,j=0,r={},id;
    for(i=0; i < lNew; i+=1) {
      id=newCat[i][0];
      if( ! _this.findId(catalog,lOld,id) ) added.push(newCat[i]);
    }
    for(i=0; i < lOld; i+=1) {
      id=catalog[i][0];
      if( ! _this.findId(newCat,lNew,id) ) removed.push(catalog[i]);
    }
    r={removed:removed, added:added};
    return r;
  }
  
  _this.findId=function(clipList,l,id) {
    var j=0;
    for(; j<l; j++) { if(clipList[j][0]  == id ) return clipList[j]; }
    return false;
  };
  
  _this.isVideo=function(id) { 
    var mime =_this.findId(catalog, catalog.length, id)[3];
    if(mime.indexOf("video") === 0) return "video";
    else if(mime.indexOf("audio") === 0) return "audio";
    throw new Error("Unknown mime type="+mime);
  };
  
}// end Inxentory

mc.pb.ViewP=function() {
  var _this=this;
  var user="";
  var playerRoom=document.getElementById("playerRoom");
  
  this.applyServerParams=function(sp) {
    if(sp.pollFactor) { mc.utils.setRadio("refreshRad",sp.pollFactor); }
    if(sp.hasOwnProperty("playNew")) { mc.utils.setCheckbox("playNewChkb",sp.playNew); }
    if(sp.hasOwnProperty("skipMine")) { mc.utils.setCheckbox("skipMineChkb",sp.skipMine); }
  };
  
  this.getParams=function() {
    user=userInput.value;// needed for DELETE links
    return {
      user : userInput.value,
      realm : realmInput.value,
      pollFactor : mc.utils.getRadio("refreshRad"),
      playNew : playNewChkb.checked,
      skipMine : skipMineChkb.checked
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
      medialistT.insertBefore(tr, medialistT.firstChild);// latest at top
      tr=null;
    }
  };
  
  // @return HTMLElement tr
  function renderLine(l) {
    if( ! l instanceof Array) throw new Error("Wrong argument type "+(typeof l));
    var r="", i=0, ll=l.length, del="<td></td>", descr="";
    var tr=document.createElement("TR");
    if(l[1] == user) del='<td class="delete">'+"delete"+"</td>";
    if(l[7]) descr="<br />"+l[7];
    r+="<td>"+l[1]+" "+l[2]+descr+"</td>";
    r+="<td>"+l[3]+"</td>";
    r+="<td>"+l[4]+"s</td>";
    r+="<td>"+mc.utils.b2kb(l[5])+'</td>';
    r+=del;
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
      if(target.nodeName == 'TD' && target.className) { tdClass=target.className; }
      else if(target.nodeName == 'TR') { 
        trId=target.id; 
        return {id:trId, command:tdClass};
      } 
      target = target.parentNode;
    }
    return (false);
  };
  
  this.highlightLine=function(id,mode) {
    var l=document.getElementById(id);
    if( ! l) return;
    l.className=mode;
  };
  
  this.showMessage=function(m) { playerAlertP.innerHTML=m; };
  this.clearMessage=function(m) { playerAlertP.innerHTML=""; };
  
  this.showFreeSpace=function(b) { folderFreeInp.value=mc.utils.b2kb(b); };
  this.showUsers=function(s) { usersS.innerHTML=s; };
  
  _this.showClip=function(a) { playerRoom.appendChild(a); };
  _this.clearClips=function() { playerRoom.innerHTML=""; };
  _this.replaceClip=function(newc,oldc) { playerRoom.replaceChild(newc,oldc); };// replaceChild(new, old)
  
  this.setHandlers=function(listClicked, applyParams, stopAfter, clear) {    
    medialistT.onclick=listClicked;
    playerControlsDiv.onclick=applyParams;
    stopAfterBtn.onclick=stopAfter;
    clearBtn.onclick=clear;
    // onkeydown 27 = clear SEE top controller
  };
}

mc.pb.SerialPlayer=function(urlprefix, getNextId, getType, viewP, errorHandler) {
  if(typeof getNextId != "function") throw new Error("Non-function argument");
  if(errorHandler && typeof errorHandler != "function") throw new Error("Invalid ERRORHANDLER");
  var actual=false, next=false, _this=this, stopping=false, state="idle";
  
  _this.play=function(idPlus) {   
    if( ! idPlus.id) throw new Error("Element without ID");
    if( ! idPlus.el) {
      actual=createMediaElement(idPlus,true,errorHandler);
      if(actual.mime == "video") viewP.showClip(actual.el);
      next=false;
    }
    console.log("playing from "+actual.id);
    viewP.highlightLine(actual.id,"p");
    this.tryFeed();
  };
  
  _this.tryEnqueue=function(idPlus) {
    if(next) return false;
    if( ! idPlus) return false;
    next=createMediaElement(idPlus,false,errorHandler);
    console.log("loading "+next.id+" "+next.mime);
    viewP.highlightLine(next.id,"l");
  };
  
  function tryHandover() {
    // first things first
    if(next && ! stopping && next.mime == "video") {
      if(actual.mime == "video") { viewP.replaceClip(next.el, actual.el); }
      else { viewP.showClip(next.el); }
    }
    else if(actual.mime == "video") { viewP.clearClips(); }
    // play() after appendChild() is important for Chromium and unimportant for FF
    if(next && ! stopping) next.el.play();
    console.log("<<"+Date.now());    
    
    viewP.highlightLine(actual.id,"g");
    if(stopping) {
      actual=false;
      if(next) viewP.highlightLine(next.id,"n");
      next=false;
      stopping=false;
      console.log("player stopped by user");
      return;
    }
    if( ! next) { _this.tryFeed(); }
    if( ! next) {
      actual=false;
      console.log("queue ended");
      return;
    }
    actual=next;//{id:next.id, el:next.el, mime:next.mime};//
    next=false;
    console.log("playing "+actual.id);
    viewP.highlightLine(actual.id,"p");
    _this.tryFeed();
  };
  
  function createMediaElement(idPlus,autoplay,errorHandler) {
    var el, id, mime;
    
    if( ! idPlus.mime) { throw new Error("Argument must contain id and mime"); }
    id=idPlus.id;
    mime=idPlus.mime;
    if(mime.length > 5) mime=mime.substr(0,5);
    if(mime.length > 5) mime=mime.substr(0,5);
    if(mime == "audio") el=new Audio();
    else if(mime == "video") {
      el=document.createElement('video');
    }
    else throw new Error("Wrong MIME="+mime);
    if(errorHandler) {
      el.onerror=function() { 
        viewP.highlightLine(actual.id,"e");
        errorHandler(el.error.message);
        return false; 
      };
    }
    el.onended=function() {
      console.log(">>"+Date.now());  
      setTimeout(tryHandover, 0);
      // simply tryHandover is only a little faster, but more demanding on memory 
    };
    el.autoplay=autoplay;
    //el.controls=true;
    el.src=urlprefix+id;
    return { el:el, id:id, mime:mime };
  }
  
  _this.tryFeed=function() {
    if( ! next) this.tryEnqueue(getNextId(actual.id));
  };
  
  _this.stopAfter=function() { stopping=true; };
  
  _this.stop=function() {
    if(actual.el && ! actual.el.paused) actual.el.pause();
    if(actual.id) viewP.highlightLine(actual.id,"n");
    if(next.id) viewP.highlightLine(next.id,"n");
    actual=false;
    next=false;
    viewP.clearClips();
  };
  
  this.getState=function() {
    if(stopping) return "stopping";
    if( ! actual && ! next) return "idle";
    if( ! actual && next) throw new Error("NEXT set without ACTUAL");
    if( actual && ! next) return "playing";
    if( actual && next) return "playingNLoading";    
  };

}// end SerialPlayer