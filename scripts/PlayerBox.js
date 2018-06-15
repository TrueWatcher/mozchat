"use strict";
function PlayerBox() {
  var viewP={}, timerP={}, ajaxerP={}, player={}, serialPlayer={}, _this=this;
  var catalog=[], catalogTime=0, ticks=0, userParams={}, serverParams={};
  //var mediaFolder="media";
  
  this.init=function(fromServer) {
    serverParams=fromServer;
    viewP=new ViewP();
    viewP.clearMessage();
    viewP.applyServerParams(serverParams);
    _this.applyParams();
    
    ajaxerP=new Utils.Ajaxer("download.php", getResponseP, {});
    setInterval(_this.onTick, 100);
    
    if( ! serverParams.mediaFolder) throw new Error("MEDIAFOLDER required from server");
    var urlprefix=userParams.realm+"/"+serverParams.mediaFolder+"/";
    player=new Player(urlprefix, viewP);
    serialPlayer=new SerialPlayer(urlprefix, this.getNextId, viewP);
    
    viewP.setHandlers(_this.listClicked,_this.applyParams, serialPlayer.stopAfter);
  }
  
  function getResponseP(resp) { 
    var ps,diff;
    //alert(resp);
    if(resp.timestamp) catalogTime=resp.timestamp;
    if(resp.list) {
      //console.log(Utils.dumpArray(userParams));
      //console.log(Utils.dumpArray(resp.list));
      //console.log(Utils.dumpArray(catalog));
      diff=_this.diffCatalogsById(resp.list);
      //console.log(Utils.dumpArray(diff));
      catalog=resp.list;
      viewP.applyDiff(diff);
      if(userParams.playNew) {
        //console.log(Utils.dumpArray(diff.added));
        if(userParams.skipMine) diff.added=removeMyClips(diff.added);
        if(diff.added.length) {
          ps=serialPlayer.getState();
          //console.log(ps);          
          if(ps == "idle") serialPlayer.play({id:diff.added[0][0], el:false});
          else if(ps == "playing") serialPlayer.tryFeed();
        }
      }
    } 
    
    if(resp.error) viewP.showMessage("Error! "+resp.error);
    else viewP.showMessage(resp.alert || Utils.dumpArray(resp) || "<empty>");
  }
  
  _this.onTick=function() {
    ticks+=1;
    if(ticks >= userParams.pollFactor) {
      ticks=0;
      var qs="user="+userParams.user+"&realm="+userParams.realm;
      qs+="&act=dir&since="+catalogTime;
      ajaxerP.getRequest(qs, getResponseP);
    }
    
  };
  
  _this.listClicked=function(event) {
    //alert("click");
    var c=viewP.locateClick(event);
    if( ! c || ! c.command) return false;
    //alert(c.id+" "+c.command);
    if(c.command == "play") player.play(c.id);
    else if(c.command == "playDown") serialPlayer.play({id:c.id, el:false});
    else if(c.command == "delete") sendDelete(c.id); 
    return false;    
  };
  
  function sendDelete(file) {
    var qs="user="+userParams.user+"&realm="+userParams.realm;
    qs+="&act=delete&id="+encodeURIComponent(file);
    ajaxerP.getRequest(qs, getResponseP);    
  }
  
  _this.getNextId=function(id) {
    var i=0, l=catalog.length, idd, j=1;
    for(;i<l;i+=1) {
      idd=catalog[i][0];
      if(id == idd) {
        if( ! userParams.skipMine) {
          if(i+1 < l) return catalog[i+1][0];
          return false
        }
        while(i+j < l) {
          if(catalog[i+j][1] != userParams.user ) return catalog[i+j][0];
          j+=1;
        }
      }
    }
    return false;
  };
  
  function removeMyClips(clipList) {
    var r=[], i=0, l=clipList.length;
    for(; i<l; i+=1) {
      if(clipList[i][1] != userParams.user) r.push(clipList[i]);
    }
    return r;
  }
  
  _this.applyParams=function() { 
    userParams=viewP.getParams();
    //console.log(Utils.dumpArray(userParams));
    // no return false !!!
  };
  
  this._diffCatalogs=function(newCat) {// WRONGLY puts existing records to ADDED
    var removed=[],added=[],lOld=catalog.length,lNew=newCat.length,i=0,r={};
    for(i=0; i < lNew; i+=1) {
      if(catalog.indexOf(newCat[i]) < 0) added.push(newCat[i]);
    }
    for(i=0; i < lOld; i+=1) {
      if(newCat.indexOf(catalog[i]) < 0) removed.push(catalog[i]);
    }
    r={removed:removed, added:added};
    //console.log(Utils.dumpArray(r));
    return r;
  }

  this.diffCatalogsById=function(newCat) {
    var removed=[],added=[],lOld=catalog.length,lNew=newCat.length,i=0,j=0,r={},id;
    for(i=0; i < lNew; i+=1) {
      id=newCat[i][0];
      if( ! findId(catalog,lOld,id) ) added.push(newCat[i]);
    }
    for(i=0; i < lOld; i+=1) {
      id=catalog[i][0];
      if( ! findId(newCat,lNew,id) ) removed.push(catalog[i]);
    }
    r={removed:removed, added:added};
    return r;
  }
  
  function findId(clipList,l,id) {
    var j=0;
    for(; j<l; j++) { if(clipList[j][0]  == id ) return clipList[j]; }
    return false;
  }
      
  _this.isVideo(id) { 
    var mime=findId(catalog,catalog.length,id)[3];
    if(mime.indexOf("video") === 0) return true;
  }
  
  
}// end PlayerBox 

function ViewP() {
  var _this=this;
  var lineColors={l:"#ffd", p:"#fdd", g:"#ddd", n:""};
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
  
  this.showCatalog=function(list) {
    if( ! list instanceof Array) throw new Error("Wrong argument type "+(typeof list));
    var r="", i=0, l=list.length;
    for(; i<l; i+=1) { r+=renderLine(list[i]); };
    medialistT.innerHTML=r;
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
      tr=renderLine2(diff.added[i]);
      medialistT.appendChild(tr);
    }
  };
  
  function renderLine2(l) {
    if( ! l instanceof Array) throw new Error("Wrong argument type "+(typeof l));
    var r="", i=0, ll=l.length, del="<td></td>";
    var tr=document.createElement("TR");
    //for(; i<ll; i+=1) { r+="<td>"+line[i]+"</td>"; };
    if(l[1] == user) del='<td class="delete">'+"delete"+"</td>";
    r+="<td>"+l[1]+"</td>";
    r+="<td>"+l[2]+"</td>";
    r+="<td>"+l[3]+"</td>";
    r+="<td>"+l[4]+"s</td>";
    r+="<td>"+Utils.b2kb(l[5])+'</td>';
    r+=del;
    r+='<td class="play">'+"play"+"</td>";
    r+='<td class="playDown">'+"play_down"+"</td>";
    tr.innerHTML=r;
    tr.id=l[0];
    if(l[7]) tr.title=l[7];
    return tr;
  }
  
  function renderLine(l) {
    if( ! l instanceof Array) throw new Error("Wrong argument type "+(typeof l));
    var r="", i=0, ll=l.length, title="";
    //for(; i<ll; i+=1) { r+="<td>"+line[i]+"</td>"; };
    r+="<td>"+l[1]+"</td>";
    r+="<td>"+l[2]+"</td>";
    r+="<td>"+l[3]+"</td>";
    r+="<td>"+l[4]+"s</td>";
    r+="<td>"+Utils.b2kb(l[5])+'</td>';
    r+='<td class="play">'+"play"+"</td>";
    r+='<td class="playDown">'+"play_down"+"</td>";
    if(l[7]) title=' title="'+l[7]+'" ';
    r='<tr id="'+l[0]+'"'+title+'>'+r+"</tr>\n";
    return r;
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
    l.style.backgroundColor=lineColors[mode];
  };
  
  this.showMessage=function(m) { playerAlertP.innerHTML=m; };
  this.clearMessage=function(m) { playerAlertP.innerHTML=""; };
  
  _this.showClip=function(a) { playerRoom.appendChild(a); };
  _this.clearClips=function(a) { playerRoom.innerHTML=""; };
  
  this.setHandlers=function(listClicked, applyParams, stopAfter) {    
    medialistT.onclick=listClicked;
    //applyPlayerBtn.onclick=applyParams;
    playerControlsDiv.onclick=applyParams;
    stopAfterBtn.onclick=stopAfter;
  };
}

function Player(urlprefix,viewP) {
  this.play=function(name) {
    var a;
    try {
      a=new Audio(urlprefix+name);
      a.controls=true;
      viewP.showClip(a);
      a.play();
      a.onended=function() { setTimeout(viewP.clearClips(), 1); };
    } catch (err) {
      viewP.showMessage(err);
    }    
  } 
}

function SerialPlayer(urlprefix, getNextId, viewP) {
  if(typeof getNextId != "function") throw new Error("Non-function argument");
  var actual=false, next=false, _this=this, stopping=false, state="idle";
  
  _this.play=function(idOrElement) {
    var n,id,el;
    
    if(! idOrElement.el) {
      id=idOrElement.id;
      el=new Audio(urlprefix+id);
      //el.controls=true;
      actual={el:el, id:id};      
    }
    else {
      if(! idOrElement.id) throw new Error("Element without id");
      actual={id:idOrElement.id, el:idOrElement.el};
    }
    //viewP.showClip(actual.el);
    actual.el.play();
    console.log("playing "+actual.id);
    viewP.highlightLine(actual.id,"p");
    this.tryFeed();
    
    actual.el.onended=function() {
      //alert("2");
      //console.time("listrecorder step");
      setTimeout(function(){
        //alert("2");
        //viewP.clearClips();
        _this.tryStep();
      }, 0);
    }
  }
  
  _this.tryEnqueue=function(id) {
    var el;
    if( ! id) return false;
    if(next) return false;
    el=new Audio(urlprefix+id);
    //el.controls=true;
    el.autoplay=false;
    next={el:el, id:id};
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
    copy={id:next.id, el:next.el};
    next=false;
    setTimeout(function(){
      _this.play(copy);
      //console.timeEnd("listrecorder step");
    }, 1);
  };
  
  _this.tryFeed=function() {
    this.tryEnqueue(getNextId(actual.id));
  };
  
  _this.stopAfter=function() { stopping=true; };
  
  this.getState=function() {
    if(stopping) return "stopping";
    if( ! actual && ! next) return "idle";
    if( ! actual && next) throw new Error("NEXT set without ACTUAL");
    if( actual && ! next) return "playing";
    if( actual && next) return "playingNLoading";    
  };

}