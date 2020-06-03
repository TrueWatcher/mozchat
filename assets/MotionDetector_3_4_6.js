"use strict";

mc.rb.MotionDetector=function(recorder, recorderBox, feedback, viewR) {
  var _this=this,
      state=0,
      captureIntervalMs=400,
      warmUpMs=3000,
      keepStillMs=2000,
      warmupCounter=0,
      isMoving=0,
      keepstillCounter=0,
      canvasCapture=false,
      ctxCapture,
      canvasView=document.createElement('canvas'),
      ctxView=canvasView.getContext('2d'),
      canvasBuf=false,
      scaleView=2,
      analyser, ticker, videoStream, videoElement;
  
  this.toggle=function() {
    if (state > 0) {
      _this.stop();
      state=0;
    }
    else {
      state=_this.start();
    }
  };  
      
  this.start=function() {
    var aov = mc.userParams.rb.audioOrVideo;
    if (aov !== "video") {
      fail("Turn video on");
      return false;
    }
    if (state > 0) return state;
    
    clearAll();
    videoStream=recorder.getStream();
    if ( ! (videoStream instanceof MediaStream)) {
      fail("Detector requested MediaStream, got "+typeof videoStream);
      return false;
    }
    canvasCapture=document.createElement('canvas');
    analyser=new mc.rb.MotionAnalyser();
    takeStream(videoStream);
    // --------- DEBUG ---------------
    //takeStream("outputC3.mp4");
    //takeStream("shade.mp4");
    //takeStream("noise.mp4");
    //takeStream("men.webm");
    //takeStream("car.webm");
    ticker=new mc.utils.Ticker(onTick, captureIntervalMs);
    ticker.start();
    viewR.motionIndicator.z();
    state=2;
    return 2;// the warm-up state    
  };
  
  function takeStream(streamOrFile) {
    videoElement=document.createElement('video');
    videoElement.muted=true;
    if (streamOrFile instanceof MediaStream) {
      videoElement.srcObject=streamOrFile;
      //alert("01");
    }
    else { // use mock video file
      console.log("Using video file:"+streamOrFile);
      videoElement.loop=true;
      videoElement.src=streamOrFile;
    }
    videoElement.play();
    videoElement.oncanplaythrough=video2ctx;
    //alert("02");
  }
  
  function video2ctx() {
    //alert("video2ctx");
    if (videoElement.loop && ctxCapture) return; // avoid calling again if looped 
    setCanvasSize();
    ctxCapture=canvasCapture.getContext('2d');
    ctxCapture.imageSmoothingEnabled = false;
    analyser.addContext(canvasCapture, canvasCapture.width, canvasCapture.height);
    feedback.onMDStart(canvasView);
  }
  
  this.stop=function() {
    viewR.motionIndicator.getElement().classList.remove("ye");
    viewR.motionIndicator.off();
    feedback.onMDStop();
    ticker.stop();
    clearAll();
    state=0;
  };
  
  function clearAll() {
    videoStream=false;
    if (videoElement) videoElement.pause();
    videoElement=false;
    warmupCounter=0;
    keepstillCounter=0;
    isMoving=0;
    ctxCapture=false;
    analyser=false;
    ticker=false;
  }
  
  function onTick() {
    if ( ! videoElement || ! ctxCapture) { console.log("Futile tick, state="+state); return; }
    //console.time();
    var yes=analyser.go(videoElement);
    copyCanvasToView();
    //console.timeEnd();
    
    if (state == 2) { // warmup
      warmupCounter += captureIntervalMs;
      if (warmupCounter < warmUpMs) return;
      // warmUp -> active
      state=1;
      viewR.motionIndicator.on();
      warmupCounter=0;
    }
    if (yes) {
      viewR.motionIndicator.removeAllStateClasses();
      viewR.motionIndicator.getElement().classList.add("ye");
      keepstillCounter=0;
      if (isMoving) {} // let it move and be filmed
      else { // arise!
        console.log("motion detected !");
        isMoving=1;
        recorderBox.recorderOn();
      }
    }
    else {
      viewR.motionIndicator.getElement().classList.remove("ye");
      viewR.motionIndicator.getElement().classList.add("alert");
      if (isMoving) { // apparently, motion has gone
        keepstillCounter += captureIntervalMs;
        //console.log("still:"+keepstillCounter);
        if (keepstillCounter >= keepStillMs) { // relax now
          console.log("no more motion");
          keepstillCounter=0;
          isMoving=0;
          recorderBox.recorderOff();
        }
      }
      else {} // all is quiet
    }
  }
  
  function copyCanvasToView() {
    if ( ! ctxView || ! canvasCapture) { return; }
    ctxView.drawImage(canvasCapture,0,0, canvasCapture.width*scaleView, canvasCapture.height*scaleView);     
  }
  
  function setCanvasSize() {
    var w=800,
        h=200,
        isPortrait=true,
        lesserSide=100,
        scale=1.0;
    
    if (videoElement.videoWidth > videoElement.videoHeight) isPortrait=false;
    if (isPortrait) {
      w=lesserSide;
      scale=videoElement.videoWidth/lesserSide;
      h=Math.ceil(videoElement.videoHeight/scale);
      //alert(videoElement.videoHeight+"/"+scale+"/"+h);
    }
    else {
      h=lesserSide;
      scale=videoElement.videoHeight/lesserSide;
      w=Math.ceil(videoElement.videoWidth/scale);
    }
    canvasCapture.width = w;// videoElement.videoWidth;
    canvasCapture.height = h; //videoElement.videoHeight;
    //alert(w+"/"+h);
    canvasView.width = w*scaleView;
    canvasView.height = h*scaleView;
  }
  
  function fail(err) {
    console.log('Error: ' + err);
    viewR.showMessage('Error: ' + err);
  }
  
  this.set=function(paramStr) {
    var res="", pairs, i=0;
    if ( ! paramStr) return "give a name=value";
    if (paramStr.indexOf(",") >= 0) {
      pairs=paramStr.split(",");
      for (i=0; i < pairs.length; i+=1) {
        res=doSet(pairs[i]);
        if (res) return res;
      }
      return "all "+pairs.length+" ok";
    }
    res=doSet(paramStr);
    if (res) return res;
    return "ok";
  };
    
  function doSet(paramStr) {
    var key="", val="", res="";
    var keyVal=paramStr.trim().split("=");
    key=keyVal[0].trim();
    if (keyVal[1] && keyVal[1].trim()) val=keyVal[1].trim();
    console.log("Motion detector parameter set: key="+key+", val="+val);
    if ( ! analyser) return "failed, start detector";
    
    switch(key) {
    case "ci":
      res=checkRange(val,30,3600000);
      if (res) { break; }
      restartTicker(val);
      break;
      
    case "br":
      res=checkRange(val,0,100);
      if (res) { break; }
      analyser.setDiffBlurRad=val;
      break;
      
    case "fu":
      res=checkRange(val,0,100);
      if (res) { break; }
      res=analyser.setFuzziness(val);
      break;
    
    case "ac":
      res=checkRange(val,0,100);
      if (res) { break; }
      res=analyser.setAllowChanged(val);
      break;

    case "pf":
      res=analyser.setPattern(val);
      break;
      
    case "sf":
      //alert("sf");
      res=analyser.setSmooth(val);
      break;      
      
    case "mf":
      res=analyser.setRgbMetric(val);
      break;
      
    case "cf":
      res=analyser.setCompare(val);
      break;
      
    case "":
      res="give a name=value";
      break;
      
    default:
      res=key+" is not here";
    }
    return res;
    
  }
  
  function checkRange(val, min, max) {
    if (val < min || val > max) return "invalid value:"+val;
    return "";
  }
  
  function restartTicker(newIntervalMs) {
    captureIntervalMs=parseInt(val);
    if ( ! ticker) return;
    ticker.stop();
    ticker=null;
    ticker=new mc.utils.Ticker(onTick, captureIntervalMs);
    ticker.start();
  }
  
}; // end MotionDetector

mc.rb.MotionAnalyser=function() {
  var canvasCapture=false,
      ctxCapture=false,
      canvasBuf=false,      
      count=0,
      storedVect=false,
      weight=0,
      fuzziness=10,
      diffBlurRad=2,
      allowChanged=5,
      demandUnchanged=20,
      patternFn="dbh", // "dbdh", // c25, // c9, // fr3, // dbdh
      smoothFn=px1, // px9, //
      rgbMetricFn=hue, // green, //
      compareFn=subtract,// percent, //
      w, h, quietRgba, alertRgba, xyArr, newVect
  ;
  
  if (patternFn instanceof Function) {
    rgbMetricFn=hue;
    fuzziness=10;
    allowChanged=5;
  }
  else {
    rgbMetricFn=green;
    fuzziness=20;
    allowChanged=20;
  }
  loadStackblur();
  
  this.addContext=function(aCanvasCapture, aW, aH) {
    if ( ! aCanvasCapture) { console.log("Empty aCtx"); return; }
    canvasCapture=aCanvasCapture;
    ctxCapture=canvasCapture.getContext("2d");
    w=aW; h=aH;
    quietRgba=make1pxData(ctxCapture,0,0,255,255);// blue
    alertRgba=[ make1pxData(ctxCapture,255,0,255,255), make1pxData(ctxCapture,255,0,0,255) ];// magenta,red
    canvasBuf=document.createElement('canvas');
    canvasBuf.width=canvasCapture.width;
    canvasBuf.height=canvasCapture.height;
    canvasBuf.getContext('2d').imageSmoothingEnabled = false;
    if (patternFn instanceof Function) {
      xyArr=patternFn(w, h);
      //console.log(mc.utils.dumpArray(xyArr));
      this.go=processSpots;
    }
    else {
      this.go=process2d;
    }
  };
  
  function loadStackblur() {
    if (typeof StackBlur !== "undefined") return;
    var script=document.createElement('script');
    script.src="assets/stackblur.min.js";
    document.body.appendChild(script);
  }
  
  function processSpots(videoElement) {
    var yes, diff;
    if ( ! ctxCapture) return false;
    capture(videoElement);
    //console.log(mc.utils.dumpArray(xyArr));
    newVect=xyToData(ctxCapture,xyArr,rgbMetricFn,smoothFn);
    //console.log(mc.utils.dumpArray(newVect));
    if ( ! storedVect) {
      storedVect=newVect;
      return false;
    }  
    diff=countVectorDiff(newVect, storedVect, fuzziness, compareFn);
    //console.log(mc.utils.dumpArray(diff));    
    yes=isSignificant(diff, newVect.length, allowChanged,demandUnchanged);
    storedVect=newVect;
    drawSensors(ctxCapture, xyArr, diff, alertRgba[yes ? 1 : 0], quietRgba);
    return yes;
  };
  
  function process2d(videoElement) {
    var yes, diff;
    if ( ! ctxCapture) return false;
    captureNStore(videoElement);
    newVect=histogram(ctxCapture, green, w, h);
    //console.log(mc.utils.dumpArray(newVect));
    if (patternFn === "dbh") {
      weight=weightHead(newVect,allowChanged);
    }
    else throw new Error("Unknow patternFn:"+patternFn);
    //console.log("weight:"+weight);    
    yes=(weight > fuzziness*100);
    yes=yes && ( weight < (100-demandUnchanged)*100 );
    drawWeight(ctxCapture, weight, yes ? "#ff0000" : "#ff00ff");
    return yes;
  };
  
  this.getWeight=function() { return weight; };
  
  function mock() {
    count+=500;
    if (count > 6000) {
      if (count < 10000) return true;
      if (count > 20000) count=0;
    }
    return false;    
  }
      
  function capture(videoElement) {
    ctxCapture.globalCompositeOperation = "copy";
    ctxCapture.filter="none";
    ctxCapture.drawImage(videoElement,0,0,canvasCapture.width,canvasCapture.height);
  }
  
  function countVectorDiff(v1, v2, fuzziness, compareFn) {
    if ( ! (compareFn instanceof Function)) throw new Error("Invalid compareFn");
    if ( ! v1 || ! v2) { return false; }
    if (v1.length != v2.length) throw new Error("Size mismatch:"+v1.length+"/"+v2.length);
    var l=v1.length,
        diff=[],
        i=0;
    
    for (; i<l; i+=1) {
      //console.log(i+":"+compareFn(v1,v2,i));
      if (compareFn(v1,v2,i) > fuzziness) diff.push(i);
    }
    if (diff.length === 0) return false;
    return diff;
  }
  
  function subtract(v1,v2,i) {
    return Math.abs(v1[i] - v2[i]);
  }
  
  function percent(v1,v2,i) {
    var low = 3;
    if (v2[i] < low && v1[i] < low) return 0;
    if (v1[i] < v2[i]) return Math.floor(100*(1.0 - v1[i]/v2[i]));
    else return Math.floor(100*(1.0 - v2[i]/v1[i]));
  }
  
  function isSignificant(diff,l,allowChanged,demandUnchanged) {
    var diffPercent;
    if (diff === false) return false;
    diffPercent=Math.round(diff.length/l*100);
    if (diffPercent < allowChanged) return false;
    if (diffPercent > (100-demandUnchanged)) return false;
    return true;
  }
  
  function c9(w,h) {
    var dd=[-1,0,1];
    return central(w, h, dd,.28);
  }
  
  function c25(w,h) {
    var dd=[-2,-1,0,1,2];
    return central(w, h, dd,.20);
  }
  
  function central(w, h, dd, step) {
    var xc=Math.floor(w/2.0),
        yc=Math.floor(h/2.0),
        dx=Math.floor(w*step),
        dy=Math.floor(h*step),
        res=[],
        l=dd.length,
        i,j,x,y;
        
    for (i=0; i<l; i+=1) {
      for (j=0; j<l; j+=1) {
        x=xc+dx*dd[i];
        y=yc+dy*dd[j];
        res.push([x, y]);
      }
    }
    return res;
  }
  
  function fr3(w,h) {
    var dd=[-4,-3,-2,-1,0,1,2,3,4], dd2=[-3,-2,-1,0,1,2,3], res;
    res=fr(w, h, dd,.105);
    res=res.concat(fr(w, h, dd,.08));
    res=res.concat(fr(w, h, dd2,.07));
    return res;
  }
  
  function fr(w, h, dd, step) {
    var xc=Math.floor(w/2.0),
        yc=Math.floor(h/2.0),
        dx=Math.floor(w*step),
        dy=Math.floor(h*step),
        res=[],
        l=dd.length,
        i,j,x,y,inc;
        
    for (i=0; i<l; i+=1) {
      if (i == 0 || i == l-1) { inc=1; }
      else { inc = l-1; }
      for (j=0; j<l; j+=inc) {
        x=xc+dx*dd[i];
        y=yc+dy*dd[j];
        res.push([x, y]);
      }
    }
    return res;
  }
  
  function dummyFn() {}
  
  function xyToData(ctxCapture,xyArr,rgbMetricFn,smoothFn) {
    var l=xyArr.length,
        i=0,
        res=[],
        rgba;
    
    if ( ! (rgbMetricFn instanceof Function)) throw new Error("Invalid rgbMetricFn");
    if ( ! (smoothFn instanceof Function)) throw new Error("Invalid smoothFn");
    for (; i<l; i+=1) {
      rgba=smoothFn(ctxCapture, xyArr[i][0],xyArr[i][1]);
      res.push(rgbMetricFn(rgba[0], rgba[1], rgba[2]));
    }
    return res;
  }
  
  function captureNStore(videoElement) {
    if ( ! canvasBuf) return capture();
    ctxCapture.globalCompositeOperation = "copy";
    ctxCapture.filter="none";
    ctxCapture.drawImage(canvasBuf,0,0,canvasCapture.width,canvasCapture.height);
    ctxCapture.globalCompositeOperation = "difference";
    canvasBuf.getContext('2d').drawImage(videoElement,0,0,canvasCapture.width,canvasCapture.height);
    ctxCapture.drawImage(canvasBuf,0,0,canvasCapture.width,canvasCapture.height);
    //ctxCapture.filter="blur("+diffBlurRad+"px)";// does not blur drawn image
    StackBlur.canvasRGBA(canvasCapture,0,0,canvasCapture.width,canvasCapture.height, diffBlurRad);
    //ctxCapture.globalCompositeOperation = "copy";
  }
  
  function histogram(ctxCapture,rgbMetricFn,w,h) {
    var res=[], rgba, value, i, total=w*h*4;
    for (i=0; i<=255; i+=1) { res[i]=0; }
    
    rgba=ctxCapture.getImageData(0,0,w,h).data;// reading by one pixel is very slow   
    for (i=0; i<total; i+=4) {
      value=Math.round(rgbMetricFn(rgba[i+0], rgba[i+1], rgba[i+2]));
      res[value] += 1;
    }
    return res;
  }
  
  function subtractHistograms(v1,v2) {
    if ( ! v1 || ! v2) { return false; }
    if (v1.length != v2.length) throw new Error("Size mismatch:"+v1.length+"/"+v2.length);
    var l=v1.length,
        diff=[],
        i=0,
        val;
    
    for (i=0; i<l; i+=1) {
      //console.log(i+":"+compareFn(v1,v2,i));
      val=subtract(v1,v2,i);
      diff[i]=val;
    }
    if (diff.length === 0) return false;
    return diff;
  }
  
  function weightHead(diff,start) {
    var l=diff.length, res=0, i=0;
    
    for (i=start; i < l; i+=1) { res += diff[i]*(i-start+1); }
    return res;
  }
  
  function px1(ctxCapture,x,y) {
    return ctxCapture.getImageData(x,y,1,1).data;
  }
  
  function px9(ctxCapture,x,y) {
    var side=3,
        total=side*side,
        r=0,g=0,b=0,a=0,
        dataArr,i;
    
    dataArr=ctxCapture.getImageData(x,y,side,side).data;
    for (i=0; i < total; i+=1) {
      r += dataArr[i*4+0];
      g += dataArr[i*4+1];
      b += dataArr[i*4+2];
      a += dataArr[i*4+3];
    }
    r=Math.round(r/total);
    g=Math.round(g/total);
    b=Math.round(b/total);
    a=Math.round(a/total);
    return [r, g, b, a];
  }
  
  function green(r,g,b) { return g; }
  
  function hue(r,g,b) {
  // https://stackoverflow.com/questions/39118528/rgb-to-hsl-conversion
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var c   = max - min;
    var hue,segment,shift;
    if (c == 0) { hue = 0; }
    else {
      switch(max) {
        case r:
          segment = (g - b) / c;
          shift   = 0 / 60;       // R° / (360° / hex sides)
          if (segment < 0) {          // hue > 180, full rotation
            shift = 360 / 60;         // R° / (360° / hex sides)
          }
          break;
        case g:
          segment = (b - r) / c;
          shift   = 120 / 60;     // G° / (360° / hex sides)
          break;
        case b:
          segment = (r - g) / c;
          shift   = 240 / 60;     // B° / (360° / hex sides)
          break;
      }
      hue = segment + shift;
    }
    //return Math.round(hue * 60); // hue is in [0,6], scale it up
    //return Math.round(hue*16.66); // 0..100
    return Math.round(hue*42.5); // 0..255
  }
  
  function drawSensors(ctxCapture,xyArr,diffArr,alertRgba,quietRgba) {
    var l=xyArr.length, i, j;
        
    // paint all sensor points with quiet color
    for (i=0; i<l; i+=1) {
      ctxCapture.putImageData(quietRgba, xyArr[i][0], xyArr[i][1]);
    }
    // repaint the changed points with alert color
    if ( ! diffArr) return;
    diffArr.forEach(function(j) {
      ctxCapture.putImageData(alertRgba, xyArr[j][0], xyArr[j][1]);
    });    
  }
  
  function make1pxData(ctxCapture,r,g,b,a) {
    var res=ctxCapture.createImageData(1,1);
    res.data[0]=r;
    res.data[1]=g;
    res.data[2]=b;
    res.data[3]=a;
    return res;
  }
  
  function drawWeight(ctxCapture, weight, color) {
    ctxCapture.font = "12px Arial";
    ctxCapture.fillStyle = color;
    ctxCapture.fillText(">"+Math.round(weight/100), 0, 15);
  }
  
  this.setFuzziness=function(v) {
    if (v < 0 || v > 100) return;
    if (v < 1) fuzziness=v;
    else fuzziness=parseInt(v);
    storedVect=false;
  };
  
  this.setAllowChanged=function(v) {
    if (v < 0 || v > 100) return;
    allowChanged=parseInt(v);
    storedVect=false;
  };

  this.setPattern=function(v) {
    if (v == "c9") patternFn=c9;
    else if (v == "c25") patternFn=c25;
    else if (v == "fr3") patternFn=fr3;
    else if (v == "dbh") patternFn=v;
    else return v+" is unknown so far";
    storedVect=false;
    if (patternFn instanceof Function) {
      if (ctxCapture) xyArr=patternFn(w, h);
      //console.log(mc.utils.dumpArray(xyArr));
      this.go=processSpots;
    }
    else {
      this.go=process2d;
    }
    return "";
  };
  
  this.setSmooth=function(v) {
    if (v == "px1") smoothFn=px1;
    else if (v == "px9") smoothFn=px9;
    else return v+" is unknown so far";
    storedVect=false;
    return "";
  };
  
  this.setRgbMetric=function(v) {
    if (v == "green") rgbMetricFn=green;
    else if (v == "hue") rgbMetricFn=hue;
    else return v+" is unknown so far";
    storedVect=false;
    return "";
  };
  
  this.setCompare=function(v) {
    if (v == "subtract") compareFn=subtract;
    else if (v == "percent") compareFn=percent;
    else return v+" is unknown so far";
    storedVect=false;
    return "";
  };
  
  this.setDiffBlurRad=function(v) { diffBlurRad=v; };
  
};// end MotionAnalyser

mc.rb.ChatController=function(connector, motionDetector, recorderBox, viewR, userParams) {
  var _this=this,
      pin=mc.utils.randomString(4),
      isOn="new",
      parts=[""],
      sep=" ",
      act="",
      params="",
      res=""
  ;
  
  this.handleMessage=function(msg) {
    if (isOn !== true) return;
    
    if (msg.pack  && msg.pack instanceof Array) {
      msg.pack.forEach(function(m) { _this.handleMessage(m); });
      return;
    }

    if ( ! msg.type || ! msg.target || ! msg.text || ! msg.user) return;
    if (msg.type != "message" || msg.target != userParams.user) return;
    //alert(msg.text);
    // pin command [key=val[,key2=val2,key3=val3]]
    // 123456 on
    // 123456 mdset mf=hue,fu=15,ci=300,pf=fr3,sf=px9,mf=subtract
    // 123456 mdset mf=green,fu=8,ci=200,pf=c9,sf=px9,mf=subtract
    parts=msg.text.trim().replace(/\s+/g,sep).split(sep);
    //alert(parts[0]);
    if (parts[0] !== pin) { return; }
    if (parts[1]) act=parts[1];
    else act="";
    if (parts[2]) params=parts[2];
    else params="";
    res=cli(act,params);
    if (res) reply(res, msg.user);
  };
  
  function reply(str, whom) {
    if (str === true) str="ok";
    var msg = {
      text: str,
      type: "message",
      date: Date.now(),
      user: userParams.user,
      target: whom
    };
    if (mc.serverParams.wsOn) { connector.pull.sendRelay(msg); }
    else { connector.push.sendRelay(msg); }
  }
  
  function cli(act,params) {
    var res="ok", r;
    switch(act) {
    case "echo":
      res="ready";
      break;
    case "on":
      recorderBox.recorderOn();
      break;
    case "off":
      recorderBox.recorderOff();
      break;
    case "mdon":
      recorderBox.recorderOff();
      r=motionDetector.start();
      res=r > 0 ? "ok" : "failed";
      if (res == "ok" && params) res=motionDetector.set(params);
      break;
    case "mdoff":
      recorderBox.recorderOff();
      motionDetector.stop();
      break;
    case "mdset":
      recorderBox.recorderOff();
      res=motionDetector.set(params);
      break;
    default:
      res="what?";
    }
    return act+" "+params+" : "+res;
  }
  
  this.toggle=function(event) {
    var isChecked=event.target.checked;
    if (isChecked) {
      if (userParams.audioOrVideo != "video") {
        viewR.showMessage("Turn video on");
        event.target.checked=false;
        return false;
      }
      if (isOn === "new") {
        connector.pull.registerPullCallback(_this.handleMessage);
      }
      isOn=true;
      pin=mc.utils.randomString(6);
      viewR.showChatPin(pin);
    }
    else {
      isOn=false;
      pin=mc.utils.randomString(6);
      viewR.showChatPin("");
    }
    //alert(event.target.checked);
    return false;
  };

}
