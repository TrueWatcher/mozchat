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
   assertTrue(ok, "Wrong player state", "Player state Ok" ); \
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
  assertTrue(ok, "Wrong player state", "Player state Ok" ); \
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
 assertTrue("playingNLoading" == pse.state, "Wrong player state", "Player state playingNLoading Ok"); \
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
 assertTrue(ok , "Wrong player state", "Player state paused* Ok"); \
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
 assertTrue("playingNLoading" == pse.state, "Wrong player state", "Player state playingNLoading Ok"); \
 tr=medialistT.firstChild.innerHTML; \
 descr=tr.indexOf(clip2) >= 0; \
 assertTrue(descr, "My further clips are missing","My further clip is present"); \
 ci.inc(); \
',

'ci.noLoop();',
'holdPlayWhileRecChkb.click(); \
 onrecordedRad2.click(); \
 playNewChkb.click(); \
 skipMineChkb.click(); \
',
''
]