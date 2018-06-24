"use strict";
function PlayerBox() {
  var viewP={}, timerP={}, ajaxerP={}, /*player={},*/ serialPlayer={}, _this=this;
  var catalogTime=0, ticks=0, userParams={}, serverParams={}, inventory={}, firstResponse=1;
  var urlprefix="";
  //var mediaFolder="media";
  
  this.init=function(fromServer) {
    serverParams=fromServer;
    viewP=new ViewP();
    viewP.clearMessage();
    viewP.applyServerParams(serverParams);
    _this.applyParams();
    inventory=new Inventory();
    
    ajaxerP=new Utils.Ajaxer("download.php", getResponseP, {});
    setInterval(_this.onTick, 100);
    
    if( ! serverParams.mediaFolder) throw new Error("MEDIAFOLDER required from server");
    urlprefix=userParams.realm+"/"+serverParams.mediaFolder+"/";
    serialPlayer=new SerialPlayer(urlprefix, this.getNextId, this.isVideo, viewP, onMediaError);
    
    viewP.setHandlers(_this.listClicked,_this.applyParams, serialPlayer.stopAfter, _this.clear);
  }
  
  function getResponseP(resp) { 
    var ps,changes,toPlay;

    if(resp.timestamp) catalogTime=resp.timestamp;
    if(resp.free) viewP.showFreeSpace(resp.free);
    if(resp.list) {
      //console.log(Utils.dumpArray(userParams));
      changes=inventory.consumeNewCatalog(resp.list, userParams);
      viewP.applyDiff(changes);
      //console.log(Utils.dumpArray(changes));
      toPlay=changes.toPlay;
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
      else viewP.showMessage(resp.alert || Utils.dumpArray(resp) || "<empty>");
    }
  }
  
  _this.onTick=function() {
    ticks+=1;
    var qs="";
    if(ticks < userParams.pollFactor) return;
    ticks=0;
    qs+="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=dir&since="+catalogTime;
    ajaxerP.getRequest(qs, getResponseP);
  };
  
  _this.listClicked=function(event) {
    //alert("click");
    var c=viewP.locateClick(event);
    if( ! c || ! c.command) return false;
    //alert(c.id+" "+c.command);
    if(c.command == "play") Utils.play(urlprefix+c.id, _this.isVideo(c.id),"playerRoom",onMediaError);
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
    ajaxerP.getRequest(qs, getResponseP);    
  }
  
  _this.getNextId=function(id) { return inventory.getNextId(id,userParams); };
  
  _this.applyParams=function() { 
    userParams=viewP.getParams();
    //console.log(Utils.dumpArray(userParams));
    // no return false !!!
  };

  _this.isVideo=function(id) { return inventory.isVideo(id); };
  
  _this.clear=function() { serialPlayer.stop(); viewP.clearClips(); };
   
}// end PlayerBox 

function Inventory() {
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
  
}

function ViewP() {
  var _this=this;
  //var lineColors={l:"#ffd", p:"#fdd", g:"#ddd", n:"", e:""};
  var user="";
  
  this.applyServerParams=function(sp) {
    if(sp.pollFactor) { Utils.setRadio("refreshRad",sp.pollFactor); }
    if(sp.hasOwnProperty("playNew")) { Utils.setCheckbox("playNewChkb",sp.playNew); }
    if(sp.hasOwnProperty("skipMine")) { Utils.setCheckbox("skipMineChkb",sp.skipMine); }
  };
  
  this.getParams=function() {
    user=userInput.value;// needed for DELETE links
    return {
      user : userInput.value,
      realm : realmInput.value,
      pollFactor : Utils.getRadio("refreshRad"),
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
    r+="<td>"+Utils.b2kb(l[5])+'</td>';
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
    //l.style.backgroundColor=lineColors[mode];
    l.className=mode;
  };
  
  this.showMessage=function(m) { playerAlertP.innerHTML=m; };
  this.clearMessage=function(m) { playerAlertP.innerHTML=""; };
  
  this.showFreeSpace=function(b) { folderFreeS.innerHTML=Utils.b2kb(b); };
  
  _this.showClip=function(a) { playerRoom.appendChild(a); };
  _this.clearClips=function(a) { playerRoom.innerHTML=""; };
  
  this.setHandlers=function(listClicked, applyParams, stopAfter, clear) {    
    medialistT.onclick=listClicked;
    playerControlsDiv.onclick=applyParams;
    stopAfterBtn.onclick=stopAfter;
    clearBtn.onclick=clear;
    // onkeydown 27 = clear SEE viewR::setHandlers
  };
}

function SerialPlayer(urlprefix, getNextId, getType, viewP, errorHandler) {
  if(typeof getNextId != "function") throw new Error("Non-function argument");
  if(errorHandler && typeof errorHandler != "function") throw new Error("Invalid ERRORHANDLER");
  var actual=false, next=false, _this=this, stopping=false, state="idle";
  
  _this.play=function(idOrElement) {
    var n,id,el,mime;
    
    if( ! idOrElement.mime) throw new Error("no MIME");
    mime=idOrElement.mime.substr(0,5);
    if( ! idOrElement.el) {
      id=idOrElement.id;
      if(mime == "audio") el=new Audio();
      else if(mime == "video") {
        el=document.createElement('video');
      }
      else throw new Error("Wrong MIME="+mime);
      if(errorHandler) el.onerror=function() { 
        viewP.highlightLine(actual.id,"e");
        errorHandler(el.error.message);
        return false; 
      };
      el.src=urlprefix+id;
      el.autoplay=true;
      //el.controls=true;
      actual={el:el, id:id, mime:mime};
      if(actual.mime == "video") viewP.showClip(actual.el);
    }
    else {
      if( ! idOrElement.id) throw new Error("Element without ID");
      actual={id:idOrElement.id, el:idOrElement.el, mime:idOrElement.mime};
    }
    //if(actual.mime == "video") viewP.showClip(actual.el);
    //actual.el.play(); // 
    console.log("playing "+actual.id);
    viewP.highlightLine(actual.id,"p");
    this.tryFeed();
    
    actual.el.onended=function() {
      setTimeout(function() {       
        if(actual.mime == "video") {
          actual.el.parentNode.removeChild(actual.el);
          if(next && ! stopping) viewP.showClip(next.el);
        }
        // play() after appendChild() is important for Chromium and unimportant for FF
        if(next && ! stopping) next.el.play();
        _this.tryStep();
      }, 0);
    };
    
  }
  
  _this.tryEnqueue=function(id) {
    //console.log(Utils.dumpArray(id));
    var el,mime="";
    if(next) return false;
    if( ! id) return false;
    if(typeof id == "object") {
      mime=id.mime.substr(0,5);
      id=id.id;      
    }
    else {
      mime=getType();
      console.log("this should not happen");
    }
    if(mime == "audio") el=new Audio();
    else if(mime == "video") {
      el=document.createElement('video');
    }
    else throw new Error("Wrong MIME="+mime);
    el.src=urlprefix+id;
    //el.controls=true;
    el.autoplay=false;
    next={el:el, id:id, mime:mime};
    console.log("loading "+next.id);
    viewP.highlightLine(next.id,"l");
  };
  
  _this.tryStep=function() {
    var n,copy;
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
      return "finished";
    }
    copy={id:next.id, el:next.el, mime:next.mime};
    next=false;
    _this.play(copy);
  };
  
  _this.tryFeed=function() {
    this.tryEnqueue(getNextId(actual.id));
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

}