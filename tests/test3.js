[
'println("Testing SerialPlayer");',
'println("basic mode");',
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

'println("pause mode");',
'holdPlayWhileRecChkb.click(); \
 /*mc.utils.setSelect("refreshSelect",10); */ \
 clip2="Clip 2"; \
 descriptionInput.value=clip2; \
',
'ci.loop();',
'playFrom=medialistT.firstChild.nextSibling.nextSibling.getElementsByClassName("playDown")[0]; \
 clipId=medialistT.firstChild.nextSibling.nextSibling.id; \
 playFrom.click(); \
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 assertTrue("playingNLoading" == pse.state, "Wrong player state", "After PLAYFROM state=playingNLoading"); \
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
 assertTrue("playingNLoading" == pse.state, "Wrong player state", "After STOPRECORD and getting another clip state=playingNLoading"); \
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

'println("suspendedIdle mode"); \
 clip3="Clip 3"; \
 descriptionInput.value=clip3; \
 recordBtn.click(); \
 pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 assertTrue("suspendedIdle" == pse.state, "Wrong player state", "After RECORD state=suspendedIdle"); \
 ci.inc(); \
',
'whileState( "suspendedIdle", "suspendedLoading", function() { \
   tr=medialistT.firstChild.innerHTML; \
   descr=tr.indexOf(clip3) >= 0; \
   assertTrue(descr, "My 3rd clips are missing","My 3rd clip is present"); \
   ok=medialistT.firstChild.classList.contains("l"); \
   assertTrue( ok, "Wrong clip class", "Upper clip class l" ); \
}, function() { \
   playerBox.sendPoll(); \
})',
'ci.inc();','ci.inc();','ci.inc();',// wait for one more clip
'playerBox.sendPoll(); \
 ci.inc();',
'ok= ! medialistT.firstChild.classList.contains("l"); \
 ok &= ! medialistT.firstChild.classList.contains("p"); \
 ok &= ! medialistT.firstChild.classList.contains("g"); \
 assertTrue( ok, "Wrong clip class", "Upper clip class empty" ); \
 recordBtn.click(); \
 playerBox.sendPoll(); \
 ci.inc(); \
', 
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 assertTrue("playingNLoading" == pse.state, "Wrong player state", "Player state=playingNLoading"); \
 ok=medialistT.firstChild.classList.contains("l"); \
 assertTrue( ok, "Wrong clip class", "Upper clip class l" ); \
 ok=medialistT.firstChild.nextSibling.classList.contains("p"); \
 assertTrue( ok, "Wrong clip class", "Second clip class p" ); \
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 if ( pse.state != "idle") {} \
 else { \
   ok=medialistT.firstChild.classList.contains("g"); \
   assertTrue( ok, "Wrong clip class", "State=IDLE Upper clip class g" ); \
   ci.inc(); \
 } \
',
'ci.noLoop();',
'holdPlayWhileRecChkb.click(); \
 onrecordedRad2.click(); \
 playNewChkb.click(); \
 skipMineChkb.click(); \
',
'println("SerialPlayer tests finished successfully");' 
]