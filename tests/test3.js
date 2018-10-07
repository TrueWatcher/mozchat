[
'println(""); \
 println("Testing SerialPlayer");',
'println(""); \
 println("basic mode");',
'playerBox.sendClear();',
'playerBox.sendPoll();',
'playerBox.sendPoll();',
'mc.utils.setSelect("chunkSelect",2); \
 onrecordedRad1.click(); \
 playNewChkb.click(); \
 skipMineChkb.click(); \
 assertEqualsPrim("Record", recordBtn.innerHTML, "Recorder is not ready", "Recorder ready"); \
',
'clip1="Clip 1"; \
 descriptionInput.value=clip1; \
 recordBtn.click(); \
 ci.loop(); \
',
'chm=playerBox.getChangesMap(); \
 if ( ! chm.toPlay) { playerBox.sendPoll(); } \
 else { \
  console.log(mc.utils.dumpArray(chm)); \
  tr=medialistT.firstChild.innerHTML; \
  descr=tr.indexOf(clip1) >= 0; \
  assertTrue(descr, "My first clip is missing","My first clip is present"); \
  clipId=chm.added[0][0]; \
  pse=playerBox.getPlayerStateExt(); \
  console.log(mc.utils.dumpArray(pse)); \
  assertEqualsPrim( "playing", pse.state, "Wrong player state="+pse.state, "Player state=playing" ); \
  assertEqualsPrim( clipId , pse.a.id, "Wrong actual clip ID", "actual clip ID is Ok" ); \
  playerBox.sendPoll(); \
  ci.inc(); \
 } \
',
'chm=playerBox.getChangesMap(); \
 if (chm.toPlay[0] == clipId) { playerBox.sendPoll(); } \
 else { \
   console.log(mc.utils.dumpArray(chm)); \
   clipId=chm.added[0][0]; \
   pse=playerBox.getPlayerStateExt(); \
   console.log(mc.utils.dumpArray(pse)); \
   print(pse.state+" "); \
   ok=(pse.state == "playingNLoading" || pse.state == "playing"); \
   assertTrue(ok, "Wrong player state", "Player state=playing*" ); \
   if (pse.state == "playing") { assertEqualsPrim( clipId , pse.a.id, "Wrong actual clip ID", "actual clip ID is Ok" ) } \
   else { assertEqualsPrim( clipId , pse.n.id, "Wrong actual clip ID", "next clip ID is Ok" ) } \
   playerBox.sendPoll(); \
   ci.inc(); \
 } \
',
'chm=playerBox.getChangesMap(); \
 if (chm.toPlay[0] == clipId) { playerBox.sendPoll(); } \
 else { \
  console.log(mc.utils.dumpArray(chm)); \
  clipId=chm.added[0][0]; \
  pse=playerBox.getPlayerStateExt(); \
  console.log(mc.utils.dumpArray(pse)); \
  print(pse.state+" "); \
  ok=(pse.state == "playingNLoading" || pse.state == "playing"); \
  assertTrue(ok, "Wrong player state", "Player state=playing*" ); \
  if (pse.state == "playing") { assertEqualsPrim( clipId , pse.a.id, "Wrong actual clip ID", "actual clip ID is Ok" ) } \
  else { assertEqualsPrim( clipId , pse.n.id, "Wrong actual clip ID", "next clip ID is Ok" ) } \
  playerBox.sendPoll(); \
  ci.inc(); \
 } \
',
'ci.noLoop();',
'recordBtn.click();',
'playerBox.sendPoll();','','',


'println(""); \
 println("pause mode");',
'console.log("stop="+onrecordedRad2.checked); \
 holdPlayWhileRecChkb.click(); \
 /*mc.utils.setSelect("refreshSelect",10); */ \
 clip2="Clip 2"; \
 descriptionInput.value=clip2; \
',
'ci.loop();',
'assertEqualsPrim("idle", playerBox.getPlayerStateExt().state, "Wrong player state", "Initially  state=idle"); \
 playFrom=medialistT.firstChild.nextSibling.nextSibling.getElementsByClassName("playDown")[0]; \
 clipId=medialistT.firstChild.nextSibling.nextSibling.id; \
 playFrom.click(); \
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("playingNLoading", pse.state, "Wrong player state", "After PLAYFROM state=playingNLoading"); \
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 if (pse.a.id == clipId) {} \
 else { \
  nextId=pse.n.id; \
  recordBtn.click(); \
  playerBox.sendPoll(); \
  ci.inc(); \
 } \
',
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 ok=("pausedPlayingNLoading" == pse.state || "pausedPlaying" == pse.state); \
 assertTrue(ok , "Wrong player state", "After RECORD state=paused* "); \
 playerBox.sendPoll(); \
 ci.inc(); \
',
'recordBtn.click(); \
 playerBox.sendPoll(); \
 ci.inc(); \
',
'playerBox.sendPoll();\
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 assertEqualsPrim("playingNLoading", pse.state, "Wrong player state", "After STOPRECORD and getting another clip state=playingNLoading"); \
 playerBox.sendPoll();\
 ci.inc(); \
',
'whileState("playingNLoading", "playing", function() { \
    tr=medialistT.firstChild.innerHTML; \
    descr=tr.indexOf(clip2) >= 0; \
    assertTrue(descr, "My further clips are missing","My further clip is present"); \
    ok=medialistT.firstChild.classList.contains("p"); \
    assertTrue( ok, "Wrong clip class", "Clip class p" ); \
})',
'whileState( "playing", "idle", function() { \
    ok=medialistT.firstChild.classList.contains("g"); \
    assertTrue( ok, "Wrong clip class", "State=IDLE Upper clip class g" ); \
})',   


'println(""); \
 println("suspendedIdle mode"); \
 assertEqualsPrim("idle", playerBox.getPlayerStateExt().state, "Wrong player state", "Initially  state=idle"); \
 ci.inc(); \
', 
'clip3="Clip 3"; \
 descriptionInput.value=clip3; \
 recordBtn.click(); \
 pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("suspendedIdle", pse.state, "Wrong player state", "After RECORD state=suspendedIdle"); \
 ci.inc(); \
',
'whileState( "suspendedIdle", "suspendedLoading", function() { \
   tr=medialistT.firstChild.innerHTML; \
   descr=tr.indexOf(clip3) >= 0; \
   assertTrue(descr, "My 3rd clips are missing","Got a clip - My 3rd clip is present"); \
   ok=medialistT.firstChild.classList.contains("l"); \
   assertTrue( ok, "Wrong clip class", "Got a clip - Upper clip class=l" ); \
}, function() { \
   playerBox.sendPoll(); \
})',
'ci.inc();','ci.inc();','ci.inc();',// wait for one more clip
'playerBox.sendPoll(); \
 ci.inc();',
'ok= ! medialistT.firstChild.classList.contains("l"); \
 ok &= ! medialistT.firstChild.classList.contains("p"); \
 ok &= ! medialistT.firstChild.classList.contains("g"); \
 assertTrue( ok, "Wrong clip class", "Got next clip - Upper clip class=empty" ); \
 recordBtn.click(); \
 playerBox.sendPoll(); \
 ci.inc(); \
', 
'pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("playingNLoading", pse.state, "Wrong player state", "After STOPRECORD - Player state=playingNLoading"); \
 ok=medialistT.firstChild.classList.contains("l"); \
 assertTrue( ok, "Wrong clip class", "Upper clip class l" ); \
 ok=medialistT.firstChild.nextSibling.classList.contains("p"); \
 assertTrue( ok, "Wrong clip class", "Second clip class p" ); \
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 if ( pse.state != "idle") { playerBox.sendPoll(); } \
 else { \
   ok=medialistT.firstChild.classList.contains("g"); \
   assertTrue( ok, "Wrong clip class", "State=IDLE Upper clip class g" ); \
   ci.inc(); \
 } \
',


'println(""); \
 println("testing flush while in suspendedLoading"); \
 mc.utils.setSelect("chunkSelect",1); \
 toSend=parseInt(maxClipCountS.innerHTML)+1; \
 playerBox.sendPoll(); \
 ci.inc(); \
',
'assertEqualsPrim("idle", playerBox.getPlayerStateExt().state, "Wrong player state", "Initially  state=idle"); \
 clip1="Clip 1"; \
 descriptionInput.value=clip1; \
 recordBtn.click(); \
 pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("suspendedIdle", pse.state, "Wrong player state", "After RECORD state= suspendedIdle"); \
 playerBox.sendPoll(); \
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 if (pse.state == "suspendedIdle") { playerBox.sendPoll(); } \
 else { \
  assertEqualsPrim("suspendedLoading", pse.state, "Wrong player state", "After first clip state= suspendedLoading"); \
  chm=playerBox.getChangesMap(); \
  print("added:"+chm.added[0]+" "); \
  ci.inc(); \
 } \
',
'tr=medialistT.firstChild.innerHTML; \
 descr=tr.indexOf(clip1) >= 0; \
 assertTrue(descr, "My 1st clips are missing","My 1st clip is present"); \
 clipId=medialistT.firstChild.id; \
 print(clipId+" "); \
 ci.inc(); \
',
'id=medialistT.firstChild.id; \
 if (id == clipId) { playerBox.sendPoll(); } \
 else { \
   count=1; \
   removedCount=targetRemovedCount=0; \
   print(count+" "); \
   playerBox.sendPoll(); \
   ci.inc(); \
 } \
',
'if (count <= toSend+4) { \
    count+=1; \
    print(count+" "); \
    playerBox.sendPoll(); \
    chm=playerBox.getChangesMap(); \
    if (chm.removed && chm.removed.length) { \
     removedCount+=1; \
     console.log(mc.utils.dumpArray(playerBox.getResponse())); \
     console.log(mc.utils.dumpArray(chm.removed)); \
    } \
    if (chm.removed && chm.removed.length && chm.removed[0][0] == clipId) { \
      targetRemovedCount+=1; \
      print(" flushed! "); \
    } \
 } \
 else { \
   tr=document.getElementById(clipId); \
   if (tr) console.log("tr exists, id="+clipId+", parent="+tr.parentNode.nodeName); \
   ok= ! tr || tr.parentNode.nodeName != "TABLE"; \
   assertTrue( ok, "First clip id is still present", "First clip id flushed"); \
   if ( targetRemovedCount != 1) console.log("First clip repeatedly removed"); \
   assertTrue( removedCount-targetRemovedCount >= 1, "Only one removal", "Following clip is also flushed"); \
   pse=playerBox.getPlayerStateExt(); \
   assertEqualsPrim("suspendedLoading", pse.state, "Wrong player state", "After flushing player state=suspendedLoading"); \
   ci.inc(); \
 } \
',
'count=0; \
 recordBtn.click(); \
 playerBox.sendPoll(); \
 pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("playingNLoading", pse.state, "Wrong player state", "After STOPRECORD player state=playingNLoading"); \
 id=pse.a.id; \
 assertEqualsPrim(clipId, id, "Started from wrong place", "Playing first-loaded and flushed clip"); \
 count+=1; \
 ci.inc(); \
',

'whileState( "playingNLoading", "playing", function() { \
}, function() { \
  pse=playerBox.getPlayerStateExt(); \
  if (id != pse.a.id) { \
    count+=1; \
    print(pse.a.id+" "); \
    id=pse.a.id; \
  } \
})',
'whileState( "playing", "idle", function() { \
}, function() { \
pse=playerBox.getPlayerStateExt(); \
if (id != pse.a.id) { \
  count+=1; \
  print(pse.a.id+" "); \
  id=pse.a.id; \
  } \
})',

'ci.inc();','ci.inc();','ci.inc();','ci.inc();',
'pse=playerBox.getPlayerStateExt(); \
 ok=medialistT.firstChild.classList.contains("g"); \
 assertTrue( ok, "Wrong clip class", "Upper clip class g" ); \
 assertEqualsPrim(toSend, count, "Wrong played clips count", "Played clips count = limit + 1"); \
 ci.inc(); \
',
'ci.noLoop();',
'holdPlayWhileRecChkb.click(); \
 onrecordedRad2.click(); \
 playNewChkb.click(); \
 skipMineChkb.click(); \
',
'println("SerialPlayer tests finished successfully");' 
]