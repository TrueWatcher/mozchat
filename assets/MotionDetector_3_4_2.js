"use strict";

mc.rb.MotionDetector=function(recorder, recorderBox, feedback, viewR) {
  var _this=this,
      state=0,
      captureIntervalMs=1500,
      warmUpMs=3000,
      keepStillMs=2000,
      warmupCounter=0,
      isMoving=0,
      keepstillCounter=0,
      canvas=false,
      ctx,
      analyser,
      ticker,
      videoStream,
      videoElement;
  
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
      fail("Detector works only in video mode, got "+aov);
      return false;
    }
    if (state > 0) return state;
    
    clearAll();
    videoStream=recorder.getStream();
    if ( ! (videoStream instanceof MediaStream)) {
      fail("Detector requested MediaStream, got "+typeof videoStream);
      return false;
    }
    canvas=document.createElement('canvas');
    analyser=new mc.rb.MotionAnalyser();
    takeStream(videoStream);
    // --------- DEBUG ---------------
    //takeStream("outputC3.mp4");
    //takeStream("shade.mp4");
    //takeStream("noise.mp4");
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
    if (videoElement.loop && ctx) return; // avoid calling again if looped 
    setCaptureSize(videoElement,canvas);
    ctx=canvas.getContext('2d');
    //ctx.scale(2.0,2.0);
    ctx.imageSmoothingEnabled = false;
    analyser.addContext(ctx, canvas.width, canvas.height);
    feedback.onMDStart(canvas);
  }
  
  this.stop=function() {
    viewR.motionIndicator.getElement().classList.remove("ye");
    viewR.motionIndicator.off();
    feedback.onMDStop();
    ticker.stop();
    if (videoElement) videoElement.pause();
    clearAll();
    state=0;
  };
  
  function clearAll() {
    videoStream=false;
    videoElement=false;
    warmupCounter=0;
    keepstillCounter=0;
    isMoving=0;
    ctx=false;
    analyser=false;
    ticker=false;
  }
  
  function onTick() {
    if ( ! videoElement || ! ctx) { console.log("Futile tick, state="+state); return; }
    capture();
    var yes=analyser.go();
    
    if (state == 2) { // warmup
      warmupCounter += captureIntervalMs;
      if (warmupCounter < warmUpMs) return;
      // -> active
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
  
  function capture() {
    ctx.drawImage(videoElement,0,0,canvas.width,canvas.height);
  }
  
  function setCaptureSize(videoElement,canvas) {
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
    canvas.width = w;// videoElement.videoWidth;
    canvas.height = h; //videoElement.videoHeight;
    //alert(w+"/"+h);
  }
  
  function fail(err) {
    console.log('Error: ' + err);
    viewR.showMessage('Error: ' + err);
  }
  
  this.set=function(paramStr) {
    var res="", out, pairs, i=0;
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
    var key="", val="", res="", out;
    var keyVal=paramStr.trim().split("=");
    key=keyVal[0].trim();
    if (keyVal[1] && keyVal[1].trim()) val=keyVal[1].trim();
    console.log("Motion detector parameter set: key="+key+", val="+val);
    switch(key) {
    case "ci":
      out=outRange(val,30,3600000);
      if (out) { res=out; break; }
      captureIntervalMs=parseInt(val);
      if (ticker) {
        ticker.stop();
        ticker=null;
        ticker=new mc.utils.Ticker(onTick, captureIntervalMs);
        ticker.start();
      }
      break;
      
    case "fu":
      out=outRange(val,0,100);
      if (out) { res=out; break; }
      if ( ! analyser) { res="failed, start detector"; break; }
      analyser.setFuzziness(val);
      break;
    
    case "ac":
      out=outRange(val,0,100);
      if (out) { res=out; break; }
      if ( ! analyser) { res="failed, start detector"; break; }
      analyser.setAllowChanged(val);
      break;

    case "pf":
      if ( ! analyser) { res="failed, start detector"; break; }
      out=analyser.setPattern(val);
      if (out) res=out;
      break;
      
    case "sf":
      if ( ! analyser) { res="failed, start detector"; break; }
      //alert("sf");
      out=analyser.setSmooth(val);
      if (out) res=out;
      break;      
      
    case "mf":
      if ( ! analyser) { res="failed, start detector"; break; }
      out=analyser.setRgbMetric(val);
      if (out) res=out;
      break;
      
    case "cf":
      if ( ! analyser) { res="failed, start detector"; break; }
      out=analyser.setCompare(val);
      if (out) res=out;
      break;
      
    case "":
      res="give a name=value";
      break;
      
    default:
      res=key+" is not here";
    }
    return res;
    
  }
  
  function outRange(val, min, max) {
    if (val < min || val > max) return "invalid value:"+val;
    return "";
  }
}; // end MotionDetector

mc.rb.MotionAnalyser=function() {
  var ctx=false,
      count=0,
      storedVect=false,
      fuzziness=10,
      allowChangedPercent=5,
      demandUnchangedPercent=20,
      patternFn=c25, // c9, //
      smoothFn=px1, // px9, //
      rgbMetricFn=hue, // green, //
      compareFn=subtract,// percent, //
      w, h, quietRgba, alertRgba, xyArr, newVect
  ;
  
  this.addContext=function(aCtx, aW, aH) {
    if ( ! aCtx) { console.log("Empty aCtx"); return; }
    ctx=aCtx;
    w=aW; h=aH;
    quietRgba=make1pxData(ctx,0,255,0,255);
    alertRgba=[ make1pxData(ctx,255,255,0,255), make1pxData(ctx,255,0,0,255) ];
    xyArr=patternFn(w, h);
    //console.log(mc.utils.dumpArray(xyArr));  
  };
  
  this.go=function() {
    if ( ! ctx) return false;
    //console.log(mc.utils.dumpArray(xyArr));
    newVect=xyToData(ctx,xyArr,rgbMetricFn,smoothFn);
    //console.log(mc.utils.dumpArray(newVect));
    if ( ! storedVect) {
      storedVect=newVect;
      return false;
    }  
    var diff=countVectorDiff(newVect, storedVect, fuzziness, compareFn);
    //console.log(mc.utils.dumpArray(diff));    
    var yes=isSignificant(diff, newVect.length, allowChangedPercent,demandUnchangedPercent);
    storedVect=newVect;
    drawSensors(ctx, xyArr, diff, alertRgba[yes ? 1 : 0], quietRgba);
    return yes;
  };
  
  function mock() {
    count+=500;
    if (count > 6000) {
      if (count < 10000) return true;
      if (count > 20000) count=0;
    }
    return false;    
  }
  
  function countVectorDiff(v1, v2, fuzziness, compareFn) {
    if ( ! rgbMetricFn instanceof Function) throw new Error("Invalid rgbMetricFn");
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
  
  function isSignificant(diff,l,allowChangedPercent,demandUnchangedPercent) {
    var diffPercent;
    if (diff === false) return false;
    diffPercent=Math.round(diff.length/l*100);
    return ((diffPercent > allowChangedPercent) && (diffPercent < (100-demandUnchangedPercent)));
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
        pixel,
        res=[],
        //dd=[-1,0,1],
        i=0,
        j=0,
        l,x,y;
    
    l=dd.length;
    for (; i<l; i+=1) {
      for (j=0; j<l; j+=1) {
        x=xc+dx*dd[i];
        y=yc+dy*dd[j];
        res.push([x, y]);
      }
    }
    return res;
  }
  
  function xyToData(ctx,xyArr,rgbMetricFn,smoothFn) {
    var l=xyArr.length,
        i=0,
        res=[],
        rgba;
    
    if ( ! (rgbMetricFn instanceof Function)) throw new Error("Invalid rgbMetricFn");
    if ( ! (smoothFn instanceof Function)) throw new Error("Invalid smoothFn");
    for (; i<l; i+=1) {
      rgba=smoothFn(ctx, xyArr[i][0],xyArr[i][1]);
      res.push(rgbMetricFn(rgba[0], rgba[1], rgba[2]));
    }
    return res;
  }
  
  function px1(ctx,x,y) {
    return ctx.getImageData(x,y,1,1).data;
  }
  
  function px9(ctx,x,y) {
    var side=3,
        total=side*side,
        dataArr,i,r=0,g=0,b=0,a=0;
    
    dataArr=ctx.getImageData(x,y,side,side).data;
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
    var hue;
    if (c == 0) {
      hue = 0;
    }
    else {
      switch(max) {
        case r:
          var segment = (g - b) / c;
          var shift   = 0 / 60;       // R° / (360° / hex sides)
          if (segment < 0) {          // hue > 180, full rotation
            shift = 360 / 60;         // R° / (360° / hex sides)
          }
          hue = segment + shift;
          break;
        case g:
          var segment = (b - r) / c;
          var shift   = 120 / 60;     // G° / (360° / hex sides)
          hue = segment + shift;
          break;
        case b:
          var segment = (r - g) / c;
          var shift   = 240 / 60;     // B° / (360° / hex sides)
          hue = segment + shift;
          break;
      }
    }
    return Math.round(hue * 60); // hue is in [0,6], scale it up
    //return Math.round(hue*16.66); // 0..100
  }
  
  function drawSensors(ctx,xyArr,diffArr,alertRgba,quietRgba) {
    var l=xyArr.length,
        i=0,
        j=0;
        
    for (; i<l; i+=1) {
      ctx.putImageData(quietRgba, xyArr[i][0], xyArr[i][1]);
    }
    if ( ! diffArr) return;
    diffArr.forEach(function(j) {
      ctx.putImageData(alertRgba, xyArr[j][0], xyArr[j][1]);
    });    
  }
  
  function make1pxData(ctx,r,g,b,a) {
    var res=ctx.createImageData(1,1);
    res.data[0]=r;
    res.data[1]=g;
    res.data[2]=b;
    res.data[3]=a;
    return res;
  }
  
  this.setFuzziness=function(v) {
    if (v < 0 || v > 100) return;
    fuzziness=parseInt(v);
    storedVect=false;
  };
  
  this.setAllowChanged=function(v) {
    if (v < 0 || v > 100) return;
    allowChangedPercent=parseInt(v);
    storedVect=false;
  };

  this.setPattern=function(v) {
    if (v == "c9") patternFn=c9;
    else if (v == "c25") patternFn=c25;
    else return v+" is unknown so far";
    storedVect=false;
    if (ctx) xyArr=patternFn(w, h);
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
    parts=msg.text.trim().split(sep);
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
    connector.push.sendRelay(msg);
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
