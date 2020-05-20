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
  }    
      
  this.start=function() {
    var aov = mc.userParams.rb.audioOrVideo;
    if (aov !== "video") {
      fail("Feedback works only in video mode, got "+aov);
      return false;
    }
    videoStream=recorder.getStream();
    if ( ! (videoStream instanceof MediaStream)) {
      fail("Feedback requested MediaStream, got "+typeof videoStream);
      return false;
    }
    
    clearAll();
    videoStream=recorder.getStream();
    videoElement=document.createElement('video');
    videoElement.muted=true;
    videoElement.srcObject=videoStream;
    //videoElement.src="outputC3.mp4";
    //videoElement.loop=true;
    videoElement.play();
    canvas=document.createElement('canvas');
    videoElement.oncanplay=init2;
    ticker=new mc.utils.Ticker(onTick, captureIntervalMs);
    ticker.start();
    viewR.motionIndicator.z();
    return 2;// the warm-up state    
  };
  
  function init2() {
    setCaptureSize(videoElement,canvas);
    ctx=canvas.getContext('2d');
    //ctx.scale(2.0,2.0);
    ctx.imageSmoothingEnabled = false;
    analyser=new mc.rb.MotionAnalyser(ctx, canvas.width, canvas.height);
    feedback.onMDStart(canvas);
  }
  
  this.stop=function() {
    viewR.motionIndicator.getElement().classList.remove("ye");
    viewR.motionIndicator.off();
    feedback.onMDStop();
    ticker.stop();
    clearAll();
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
    if ( ! videoElement) { console.log("Futile tick, state="+state); return; }
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
    
    //feedback.onMDRedraw();
    //feedback.onMDStart(canvas);
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
}; // end MotionDetector

mc.rb.MotionAnalyser=function(ctx, w, h) {
  var count=0,
      storedVect=false,
      fuzziness=10,
      allowChangedPercent=20,
      demandUnchangedPercent=20,
      quietRgba=make1pxData(ctx,0,255,0,255),
      alertRgba=[ make1pxData(ctx,255,255,0,255), make1pxData(ctx,255,0,0,255) ],
      xyArr, newVect, sampleFn, rgbMetricFn, compareFn
  ;
  
  sampleFn=central9;
  rgbMetricFn=green;
  compareFn=percent; //subtract;// 
  xyArr=sampleFn(w, h);
  //console.log(mc.utils.dumpArray(xyArr));  
  
  this.go=function() {
    newVect=xyToData(ctx,xyArr,rgbMetricFn);
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
    //return mock();
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
      console.log(i+":"+compareFn(v1,v2,i));
      if (compareFn(v1,v2,i) > fuzziness) diff.push(i);
    }
    if (diff.length === 0) return false;
    return diff;
  }
  
  function subtract(v1,v2,i) {
    return Math.abs(v1[i] - v2[i]);
  }
  
  function percent(v1,v2,i) {
    var low = 5;
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
  
  function central9(w,h) {
    var xc=Math.floor(w/2.0),
        yc=Math.floor(h/2.0),
        dx=Math.floor(w*.28),
        dy=Math.floor(h*.28),
        pixel,
        res=[],
        dd=[-1,0,1],
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
  
  function xyToData(ctx,xyArr,rgbMetricFn) {
    var l=xyArr.length,
        i=0,
        res=[],
        rgba;
    
    if ( ! rgbMetricFn instanceof Function) throw new Error("Invalid rgbMetricFn");
    for (; i<l; i+=1) {
      rgba=ctx.getImageData(xyArr[i][0],xyArr[i][1],1,1).data;
      res.push(rgbMetricFn(rgba[0], rgba[1], rgba[2]));
    }
    return res;
  }
  
  function green(r,g,b) { return g; }
  
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
  
};
