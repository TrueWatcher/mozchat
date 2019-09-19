"use strict";

//
//  Based on:
//  https://raw.githubusercontent.com/mdn/samples-server/master/s/webrtc-from-chat/index.html
//
mc.rtcb.PeerBox=function(signallingConnection, view, cb, up) {
  var isVideoAllowed=false;
  var mediaConstraints = { audio: true, video: isVideoAllowed };
  var myPeerConnection = null;    // RTCPeerConnection

  // To work both with and without addTrack() we need to note
  // if it's available
  var hasAddTrack = false;
  //var up=mc.userParams.rtcb;

  // Create the RTCPeerConnection which knows how to talk to our
  // selected STUN/TURN server and then uses getUserMedia() to find
  // our camera and microphone and add that stream to the connection for
  // use in our video call. Then we configure event handlers to get
  // needed notifications on the call.
  function createPeerConnection() {
    cb.log("Setting up a connection...");

    // Create an RTCPeerConnection which knows to use our chosen
    // STUN server.

    myPeerConnection = new RTCPeerConnection({ iceServers : JSON.parse(mc.serverParams.iceString) });
    // Information about ICE servers - Use your own!
    //{iceServers : [ { urls: "stun:stun.stunprotocol.org" } ]}

    // Do we have addTrack()? If not, we will use streams instead.
    hasAddTrack = (myPeerConnection.addTrack !== undefined);

    // Set up event handlers for the ICE negotiation process.
    myPeerConnection.onicecandidate = handleICECandidateEvent;
    myPeerConnection.onremovestream = handleRemoveStreamEvent;
    myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
    myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
    myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
    myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;

    // Because the deprecation of addStream() and the addstream event is recent,
    // we need to use those if addTrack() and track aren't available.
    if (hasAddTrack) {
      myPeerConnection.ontrack = handleTrackEvent;
    } else {
      myPeerConnection.onaddstream = handleAddStreamEvent;
    }
  }

  // Called by the WebRTC layer to let us know when it's time to
  // begin (or restart) ICE negotiation. Starts by creating a WebRTC
  // offer, then sets it as the description of our local media
  // (which configures our local media stream), then sends the
  // description to the callee as an offer. This is a proposed media
  // format, codec, resolution, etc.
  function handleNegotiationNeededEvent() {
    cb.log("*** Negotiation needed");

    cb.log("---> Creating offer");
    myPeerConnection.createOffer().then(function(offer) {
      cb.log("---> Creating new description object to send to remote peer");
      return myPeerConnection.setLocalDescription(offer);
    })
    .then(function() {
      cb.log("---> Sending offer to remote peer "+up.targetUsername);
      if ( ! up.targetUsername) throw new Error("Empty up.targetUsername");
      signallingConnection.sendRelay({
        name: up.user,
        target: up.targetUsername,
        sid : up.sid,
        type: "video-offer",
        sdp: adjustSdp(myPeerConnection.localDescription)
      });
    })
    .catch(reportError);
  }

  // Called by the WebRTC layer when events occur on the media tracks
  // on our WebRTC call. This includes when streams are added to and
  // removed from the call.
  //
  // track events include the following fields:
  //
  // RTCRtpReceiver       receiver
  // MediaStreamTrack     track
  // MediaStream[]        streams
  // RTCRtpTransceiver    transceiver
  function handleTrackEvent(event) {
    cb.log("*** Track event");
    if (mediaConstraints.video) document.getElementById("received_video").srcObject = event.streams[0];
    else document.getElementById("received_audio").srcObject = event.streams[0];
  }

  // Called by the WebRTC layer when a stream starts arriving from the
  // remote peer. We use this to update our user interface, in this
  // example.
  function handleAddStreamEvent(event) {
    cb.log("*** Stream added");
    if (mediaConstraints.video) document.getElementById("received_video").srcObject = event.stream;
    else document.getElementById("received_audio").srcObject = event.stream;
  }

  // An event handler which is called when the remote end of the connection
  // removes its stream. We consider this the same as hanging up the call.
  // It could just as well be treated as a "mute".
  //
  // Note that currently, the spec is hazy on exactly when this and other
  // "connection failure" scenarios should occur, so sometimes they simply
  // don't happen.
  function handleRemoveStreamEvent(event) {
    cb.log("*** Stream removed");
    closeVideoCall();
  }

  // Handles |icecandidate| events by forwarding the specified
  // ICE candidate (created by our local ICE agent) to the other
  // peer through the signaling server.
  function handleICECandidateEvent(event) {
    if (event.candidate) {
      cb.log("Outgoing ICE candidate: " + event.candidate.candidate);

      if ( ! up.targetUsername) throw new Error("Empty up.targetUsername");
      signallingConnection.sendRelay({
        type: "new-ice-candidate",
        name: up.user,
        target: up.targetUsername,
        sid : up.sid,
        candidate: event.candidate
      });
    }
  }

  // Handle |iceconnectionstatechange| events. This will detect
  // when the ICE connection is closed, failed, or disconnected.
  //
  // This is called when the state of the ICE agent changes.
  function handleICEConnectionStateChangeEvent(event) {
    var iceState=myPeerConnection.iceConnectionState;
    cb.log("*** ICE connection state changed to " + iceState);
    cb.showAlert("ICE:"+iceState);
    
    switch(iceState) {
    case "closed":
    case "failed":
    case "disconnected":
      closeVideoCall();
      break;
    case "connected":
      cb.setState("speak");
      break;
    }
  }

  // Set up a |signalingstatechange| event handler. This will detect when
  // the signaling connection is closed.
  //
  // NOTE: This will actually move to the new RTCPeerConnectionState enum
  // returned in the property RTCPeerConnection.connectionState when
  // browsers catch up with the latest version of the specification!
  function handleSignalingStateChangeEvent(event) {
    var sigState=myPeerConnection.signalingState;
    cb.log("*** WebRTC signaling state changed to: " + sigState);
    cb.showAlert("ICE:"+sigState);
    
    switch(sigState) {
    case "closed":
      closeVideoCall();
      break;
    }
  }

  // Handle the |icegatheringstatechange| event. This lets us know what the
  // ICE engine is currently working on: "new" means no networking has happened
  // yet, "gathering" means the ICE engine is currently gathering candidates,
  // and "complete" means gathering is complete. Note that the engine can
  // alternate between "gathering" and "complete" repeatedly as needs and
  // circumstances change.
  //
  // We don't need to do anything when this happens, but we log it to the
  // console so you can see what's going on when playing with the sample.
  function handleICEGatheringStateChangeEvent(event) {
    cb.log("*** ICE gathering state changed to: " + myPeerConnection.iceGatheringState);
  }
  
  // Close the RTCPeerConnection and reset variables so that the user can
  // make or receive another call if they wish. This is called both
  // when the user hangs up, the other user hangs up, or if a connection
  // failure is detected.
  function closeVideoCall() {
    var remoteVideo = document.getElementById("received_video");
    var localVideo = document.getElementById("local_video");

    cb.log("Closing the call");
    cb.addToChat("Talking with "+up.targetUsername+" is over");
    //mc.utils.quickPlay( view.audios.close.src );
    view.audios.close.el.play();
    
    // Close the RTCPeerConnection
    if (myPeerConnection) {
      cb.log("--> Closing the peer connection");

      // Disconnect all our event listeners; we don't want stray events
      // to interfere with the hangup while it's ongoing.

      myPeerConnection.onaddstream = null;  // For older implementations
      myPeerConnection.ontrack = null;      // For newer ones
      myPeerConnection.onremovestream = null;
      myPeerConnection.onnicecandidate = null;
      myPeerConnection.oniceconnectionstatechange = null;
      myPeerConnection.onsignalingstatechange = null;
      myPeerConnection.onicegatheringstatechange = null;
      myPeerConnection.onnotificationneeded = null;

      // Stop the videos
      if (remoteVideo && remoteVideo.srcObject) {
        remoteVideo.srcObject.getTracks().forEach(track => track.stop());
      }
      if (localVideo && localVideo.srcObject) {
        localVideo.srcObject.getTracks().forEach(track => track.stop());
      }
      if (remoteVideo && remoteVideo.src) remoteVideo.src = null;
      if (localVideo && localVideo.src) localVideo.src = null;

      // Close the peer connection
      myPeerConnection.close();
      myPeerConnection = null;
    }

    // Disable the hangup button
    cb.disableHangUp();

    up.targetUsername = null;
    up.sid="";
    cb.setState("ready");
  }
  
  // Handle the "hang-up" message, which is sent if the other peer
  // has hung up the call or otherwise disconnected.
  function handleHangUpMsg(msg) {
    if ( ! targetIsMe(msg)) return;
    cb.log("*** Received hang up notification from other peer");
    closeVideoCall();
  }
  
  // Hang up the call by closing our end of the connection, then
  // sending a "hang-up" message to the other peer (keep in mind that
  // the signaling is done on a different connection). This notifies
  // the other peer that the connection should be terminated and the UI
  // returned to the "no call in progress" state.
  function hangUpCall() {
    // closeVideoCall(); // clears targetUsername, so sending message is futile
    signallingConnection.sendLogNRelay({
      name: up.user,
      target: up.targetUsername,
      sid : up.sid,
      type: "hang-up",
    });
    closeVideoCall();
  }
  
  // Handle a click on an item in the user list by inviting the clicked
  // user to video chat. Note that we don't actually send a message to
  // the callee here -- calling RTCPeerConnection.addStream() issues
  // a |notificationneeded| event, so we'll let our handler for that
  // make the offer.
  function startCall() {
    // Call createPeerConnection() to create the RTCPeerConnection.
    cb.log("Setting up connection to invite user: " + up.targetUsername);
    
    createPeerConnection();
    cb.setState("preparing");
    
    // Now configure and create the local stream, attach it to the
    // "preview" box (id "local_video"), and add it to the
    // RTCPeerConnection.
    cb.log("Requesting webcam access...");

    navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(function(localStream) {
      cb.log("-- Local video stream obtained");
      if (mediaConstraints.video) document.getElementById("local_video").srcObject = localStream;
      //document.getElementById("received_audio").srcObject = localStream;

      if (hasAddTrack) {
        cb.log("-- Adding tracks to the RTCPeerConnection");
        localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
      }
      else {
        cb.log("-- Adding stream to the RTCPeerConnection");
        myPeerConnection.addStream(localStream);
      }
      
      // Autoplay is required, modern browsers allow it after getUserMedia, the older ones do not
      mc.utils.checkAutoplay( view.audios.open.src );
    })
    .catch(handleGetUserMediaError);
  }

  // Accept an offer to video chat. We configure our local settings,
  // create our RTCPeerConnection, get and attach our local camera
  // stream, then create and send an answer to the caller.
  function handleVideoOfferMsg(msg) {
    var localStream = null;
    
    if ( ! targetIsMe(msg)) return;
    createPeerConnection();
    cb.setState("preparing");
    // We need to set the remote description to the received SDP offer
    // so that our local WebRTC layer knows how to talk to the caller.
    var desc = new RTCSessionDescription(msg.sdp);

    myPeerConnection.setRemoteDescription(desc).then(function () {
      cb.log("Setting up the local media stream...");
      return navigator.mediaDevices.getUserMedia(mediaConstraints);
    })
    .then(function(stream) {
      cb.log("-- Local video stream obtained");
      localStream = stream;
      if (mediaConstraints.video) document.getElementById("local_video").srcObject = localStream;

      if (hasAddTrack) {
        cb.log("-- Adding tracks to the RTCPeerConnection");
        localStream.getTracks().forEach(track =>
              myPeerConnection.addTrack(track, localStream)
        );
      }
      else {
        cb.log("-- Adding stream to the RTCPeerConnection");
        myPeerConnection.addStream(localStream);
      }
      
      mc.utils.checkAutoplay( view.audios.open.src );
    })
    .then(function() {      
      cb.log("------> Creating answer");
      // Now that we've successfully set the remote description, we need to
      // start our stream up locally then create an SDP answer. This SDP
      // data describes the local end of our call, including the codec
      // information, options agreed upon, and so forth.
      return myPeerConnection.createAnswer();
    })
    .then(function(answer) {
      cb.log("------> Setting local description after creating answer");
      // We now have our answer, so establish that as the local description.
      // This actually configures our end of the call to match the settings
      // specified in the SDP.
      return myPeerConnection.setLocalDescription(answer);
    })
    .then(function() {
      // We've configured our end of the call now. Time to send our
      // answer back to the caller so they know that we want to talk
      // and how to talk to us.
      cb.log("Sending answer packet back to other peer");
      signallingConnection.sendRelay({
        name: up.user,
        target: up.targetUsername,
        sid : up.sid,
        type: "video-answer",
        sdp: adjustSdp(myPeerConnection.localDescription)
      });
    })
    .catch(handleGetUserMediaError);
  }

  // Responds to the "video-answer" message sent to the caller
  // once the callee has decided to accept our request to talk.
  function handleVideoAnswerMsg(msg) {
    if ( ! targetIsMe(msg)) return;
    cb.log("Call recipient has accepted our call");
    cb.addToChat("Received an answer from </b>" + up.targetUsername + "</b>");
    
    // Configure the remote description, which is the SDP payload
    // in our "video-answer" message.
    var desc = new RTCSessionDescription(msg.sdp);
    myPeerConnection.setRemoteDescription(desc).catch(reportError);
  }

  // A new ICE candidate has been received from the other peer. Call
  // RTCPeerConnection.addIceCandidate() to send it along to the
  // local ICE framework.
  function handleNewICECandidateMsg(msg) {
    if ( ! targetIsMe(msg)) return;
    var candidate = new RTCIceCandidate(msg.candidate);
    cb.log("Adding received ICE candidate: " + JSON.stringify(candidate));
    if ( ! myPeerConnection) return;
    myPeerConnection.addIceCandidate(candidate).catch(reportError);
  }

  // Handle errors which occur when trying to access the local media
  // hardware; that is, exceptions thrown by getUserMedia(). The two most
  // likely scenarios are that the user has no camera and/or microphone
  // or that they declined to share their equipment when prompted. If
  // they simply opted not to share their media, that's not really an
  // error, so we won't present a message in that situation.
  function handleGetUserMediaError(e) {
    cb.log(e);
    switch(e.name) {
      case "NotFoundError":
        alert("Unable to open your call because no camera and/or microphone" +
              "were found.");
        break;
      case "SecurityError":
      case "PermissionDeniedError":
        // Do nothing; this is the same as the user canceling the call.
        break;
      default:
        alert("Error opening your camera and/or microphone: " + e.message);
        break;
    }

    // Make sure we shut down our end of the RTCPeerConnection so we're
    // ready to try again.
    closeVideoCall();
  }

  // Handles reporting errors. Currently, we just dump stuff to console but
  // in a real-world application, an appropriate (and user-friendly)
  // error message should be displayed.
  function reportError(errMessage) {
    console.log("Error " + errMessage.name + ": " + errMessage.message);
  }
  
  // should be done to both offer and answer
  // handleNegotiationNeededEvent(), handleVideoOfferMsg()
  // apparently unsuccessful for FF and Cr
  function adjustSdp(description) {
    //return description;// DEBUG
    var myAudioBitrate=30;// sdp b:AS in kbits/s
    var copy=JSON.parse(JSON.stringify(description));
    //alert(copy.sdp);
    copy.sdp=mc.utils.setMediaBitrate(copy.sdp, "audio", myAudioBitrate);
    //copy.sdp=mc.utils.setOpusLimits(copy.sdp);
    //alert(copy.sdp);
    return copy;
    //return JSON.stringify(copy);
  }
    
  function handleMessage(msg) {
    
    switch (msg.type) {
    case "video-offer":  // Invitation and offer to chat
      handleVideoOfferMsg(msg);
      break;

    case "video-answer":  // Callee has answered our offer
      handleVideoAnswerMsg(msg);
      break;

    case "new-ice-candidate": // A new ICE candidate has been received
      handleNewICECandidateMsg(msg);
      break;

    case "hang-up": // The other peer has hung up the call
      handleHangUpMsg(msg);
      break;      
      
    default:
      return false;
    }
    return true;    
  }
  
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
  
  var _this={
    handleMessage : handleMessage,
    startCall : startCall,
    hangUpCall : hangUpCall,
    closeCall : closeVideoCall
  };
  return _this;
}
