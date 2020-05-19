"use strict";

mc.rb.MotionDetector=function(recorder, recorderBox, feedback, viewR) {
  var _this=this,
      state=0,
      captureIntervalMs=500,
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
    videoElement.play();
    canvas=document.createElement('canvas');
    setRenderSize(videoElement,canvas);
    ctx=canvas.getContext('2d');
    analyser=new mc.rb.MotionAnalyser(ctx, canvas.width, canvas.height);
    ticker=new mc.utils.Ticker(onTick, captureIntervalMs);
    viewR.motionIndicator.z();
    feedback.onMDStart(canvas);
    ticker.start();
    return 2;// the warm-up state    
  };
  
  this.stop=function() {
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
      viewR.motionIndicator.getElement().className="ye";
      keepstillCounter=0;
      if (isMoving) {} // let it move and be filmed
      else { // arise!
        console.log("motion detected !");
        isMoving=1;
        recorderBox.recorderOn();
      }
    }
    else {
      viewR.motionIndicator.getElement().className="alert";
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
  
  function setRenderSize(videoElement,canvas) {
    var w=800,
        h=200;
        
    canvas.width = w;// videoElement.videoWidth;
    canvas.height = h; //videoElement.videoHeight;
  }
  
  function fail(err) {
    console.log('Error: ' + err);
    viewR.showMessage('Error: ' + err);
  }
}; // end MotionDetector

mc.rb.MotionAnalyser=function(ctx, w, h) {
  var count=0;
  
  this.go=function() {
    return mock();
  };
  
  function mock() {
    count+=500;
    if (count > 6000) {
      if (count < 10000) return true;
      if (count > 20000) count=0;
    }
    return false;    
  }
  
  
};
