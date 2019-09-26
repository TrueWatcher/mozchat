[
'println(); \
 println("Testing SerialPlayer"); \
 println(); \
 println("basic mode"); \
',
'playerBox.sendClear();',
'playerBox.sendPoll();',
'playerBox.sendPoll();',
'mc.utils.setSelect("chunkSelect",2); \
 onrecordedRad1.click(); /* set AFTER_RECORDING to UPLOAD*/ \
 if ( ! playNewChkb.checked) playNewChkb.click(); \
 if (skipMineChkb.checked) skipMineChkb.click(); \
 if (holdPlayWhileRecChkb.checked) holdPlayWhileRecChkb.click(); \
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
  assertContains(clip1, tr, "My first clip is missing","My first clip is present"); \
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
'playerBox.sendPoll();','','','','',

'println(""); \
 println("skipping defective clips");',
'oldId=playerBox.changeId(1,"noSuchFile");',
'oldId2=playerBox.changeId(2,"noSuchFileAlso");',
'ci.loop();',
'state=playerBox.getPlayerStateExt().state, \
 assertEqualsPrim("idle", state, "Wrong player state:"+state, "Initially  state=idle"); \
 trs=medialistT.getElementsByTagName("TR"); \
 tr=trs[trs.length-1]; \
 playFrom=tr.getElementsByClassName("playDown")[0]; \
 playFrom.click(); \
 ci.inc(); \
',
'watchState(["playingNLoading", "playing"], "idle", function() { \
   assertTrue($("noSuchFile").classList.contains("e"), "The mangled clip remains unmarked","After playing, the mangled clip is marked"); \
})',
'playFrom=$("noSuchFile").getElementsByClassName("playDown")[0]; \
 playFrom.click(); \
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 assertContains(pse.state, ["playingNLoading","playing"], "Wrong player state="+pse.state, "Player started normally from a mangled clip" ); \
 ci.inc(); \
',
'watchState(["playingNLoading", "playing"], "idle", function() { \
   assertTrue($("noSuchFile").classList.contains("e"), "The mangled clip remains unmarked", "After playing, the mangled clip is marked"); \
})',
'ci.noLoop();',
'playerBox.changeId(1,oldId); \
 playerBox.changeId(2,oldId2);',


'println(""); \
 println("pause mode");',
'console.log("stop="+onrecordedRad2.checked); \
 if (onrecordedRad2.checked) { \
   println(" wow, AFTER_RECORDING is STOP (on a slow link?), setting it back to UPLOAD "); \
   onrecordedRad1.click(); \
 } \
',
'mc.utils.setSelect("chunkSelect",1);',
'holdPlayWhileRecChkb.click(); \
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
'playerBox.sendPoll(); ci.inc();', 'playerBox.sendPoll(); ci.inc();',
'recordBtn.click(); \
 playerBox.sendPoll();\
 ci.inc(); \
',
'pse=playerBox.getPlayerStateExt(); \
 print(pse.state+" "); \
 assertEqualsPrim("playingNLoading", pse.state, "Wrong player state", "After STOPRECORD and getting another clip state=playingNLoading"); \
 playerBox.sendPoll();\
 ci.inc(); \
',
'playerBox.sendPoll();\
 watchState("playingNLoading", "playing", function() { \
    tr=medialistT.firstChild.innerHTML; \
    assertContains(clip2, tr, "My further clips are missing","My further clip is present"); \
    ok=medialistT.firstChild.classList.contains("p"); \
    assertTrue( ok, "Wrong clip class -- not p", "Clip class p" ); \
})',
'watchState( "playing", "idle", function() { \
    ok=medialistT.firstChild.classList.contains("g"); \
    assertTrue( ok, "Wrong clip class -- not g", "State=IDLE Upper clip class g" ); \
})',   
'ci.noLoop();',

'println(""); \
 println("suspendedIdle mode"); \
 assertEqualsPrim("idle", playerBox.getPlayerStateExt().state, "Wrong player state", "Initially  state=idle"); \
',
'mc.utils.setSelect("chunkSelect",2);',
'clip3="Clip 3"; \
 descriptionInput.value=clip3; \
 recordBtn.click(); \
 pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("suspendedIdle", pse.state, "Wrong player state", "After RECORD state=suspendedIdle"); \
 ci.loop(); \
',
'watchState( "suspendedIdle", "suspendedLoading", function() { \
   tr=medialistT.firstChild.innerHTML; \
   assertContains(clip3, tr, "My 3rd clips are missing","Got a clip - My 3rd clip is present"); \
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
 assertTrue( ok, "Wrong upper clip class - not empty", "Got next clip - Upper clip class=empty" ); \
 recordBtn.click(); \
 playerBox.sendPoll(); \
 ci.inc(); \
', 
'pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("playingNLoading", pse.state, "Wrong player state", "After STOPRECORD - Player state=playingNLoading"); \
 ok=( medialistT.firstChild.classList.contains("l") ); \
 assertTrue( ok, "Wrong upper clip class - not l", "Upper clip class l" ); \
 ok=medialistT.firstChild.nextSibling.classList.contains("p"); \
 assertTrue( ok, "Wrong second clip class - not p", "Second clip class p" ); \
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
 assertContains(clip1, tr, "My 1st clips are missing","My 1st clip is present"); \
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
 assertEqualsPrim( "playingNLoading", pse.state, "Wrong player state", "After STOPRECORD player state=playingNLoading" ); \
 id=pse.a.id; \
 assertEqualsPrim( clipId, id, "Started from wrong place", "Playing first-loaded and flushed clip" ); \
 count+=1; \
 ci.inc(); \
',
'watchState( ["playingNLoading", "playing"] , "idle", function() { \
}, function() { \
  pse=playerBox.getPlayerStateExt(); \
  if (id != pse.a.id) { \
    count+=1; \
    print("\\n"+pse.a.id+" "); \
    id=pse.a.id; \
  } \
})',
'ci.noLoop();',
'','','',
'pse=playerBox.getPlayerStateExt(); \
 ok=medialistT.firstChild.classList.contains("g"); \
 assertTrue( ok, "Wrong clip class", "Upper clip class g" ); \
 trs=medialistT.getElementsByTagName("TR"); \
 tr=trs[trs.length-1]; \
 ok=(tr.classList.contains("e") && toSend-count===1); \
 if (ok) { print("the last clip is mangled, otherwise Ok "); count+=1; } \
 assertEqualsPrim( toSend, count, "Wrong played clips count", "Played (or tried) clips count = limit + 1"); \
',


'println(); \
 println("testing SkipMine and Standby"); \
 if ( ! skipMineChkb.checked ) skipMineChkb.click(); \
',
'mc.utils.setSelect("chunkSelect",1); \
 onrecordedRad2.click(); \
 if ( holdPlayWhileRecChkb.checked ) holdPlayWhileRecChkb.click();',
'clip1="My Clip 1"; \
 descriptionInput.value=clip1; \
 recordBtn.click(); \
 ci.loop(); \
',
'if ( ! recordBtn.classList.contains("recording") ) { \
   print(" my clip recorded "); \
   ci.inc(); \
 }; \
',
'ci.noLoop();', 
'standbyBtn.click();',
'assertTrue( playerBox.getStandby(), "failed to enter STANDBY", "Entered STANDBY");\
 pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("suspendedIdle", pse.state, "Wrong state", "After entering STANDBY state=suspendedIdle"); \
',
'uploadStoredBtn.click();',
'playerBox.sendAltUserClip();',
'playerBox.sendAltUserClip();',
'uploadStoredBtn.click();',
'uploadStoredBtn.click();',
'playerBox.sendAltUserClip();',
'',
'playerBox.sendPoll();',
'pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("suspendedLoading", pse.state, "Wrong state", "After getting clips state=suspendedLoading"); \
 id=pse.n.id; \
 tr=document.getElementById(id).innerHTML; \
 assertNotContains( sp.user, tr, "Clip with my name is selected", "Selected clip is not mine"); \
 assertContains( "Shadow", tr, "Wrong name in selected clip", "Selected clip name is Shadow"); \
 ci.loop(); \
',
'standbyBtn.click(); \
 assertTrue( ! playerBox.getStandby(), "failed to exit STANDBY", "Exited STANDBY");\
 pse=playerBox.getPlayerStateExt(); \
 assertEqualsPrim("playingNLoading", pse.state, "Wrong state", "After exiting STANDBY state=playingNLoading"); \
 clipId=pse.a.id; \
 print(id+" "); \
 count=1; \
 ci.inc(); \
',
'watchState( ["playingNLoading","playing"], "idle", function(){}, function(){ \
   id=pse.a.id; \
   if (id != clipId) { \
     clipId=id; \
     print("\\n"+id+" "); \
     count+=1; \
     tr=document.getElementById(id).innerHTML; \
     assertNotContains( sp.user, tr, "Clip with my name is selected", "Selected clip is not mine"); \
     assertContains( "Shadow", tr, "Wrong name in selected clip", "Selected clip name is Shadow"); \
   } \
});',
'ci.noLoop();',
'assertEqualsPrim( 3, count, "Wrong count", "Played all Shadow clips");',

'if (playNewChkb.checked ) playNewChkb.click(); \
 if (skipMineChkb.checked ) skipMineChkb.click(); \
',
'println(); \
 println("SerialPlayer tests finished successfully");' 
]
