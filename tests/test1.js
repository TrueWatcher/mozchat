[ 
'println("Clearing files and reading the catalog"); \
 playerBox.sendClear();',
'', '', '', 
'assertContains("cleared", recorderAlertP.innerHTML, "wrong message", "server agreed");',
'playerBox.sendPoll();','','playerBox.sendPoll();',
'',
'ok=($("medialistT").children.length===0); \
 assertTrue(ok,"Some data are present in the catalog","catalog cleared"); \
 free=parseInt(folderFreeInp.value); \
 assertEqualsPrim(sp.maxMediaFolderBytes/1000, free, "Wrong free space", "All space is free");',
'assertContains(sp.user, usersS.innerHTML, "Missing my username", "My username is listed"); \
 if (holdPlayWhileRecChkb.checked) holdPlayWhileRecChkb.click(); \
',

'println("Testing max size limit");',
'chunkInp.value=4; \
 mc.utils.setSelect("chunkSelect","custom"); \
 mc.utils.setRadio("onrecordedRad","stop");',
'ci.loop();',
'if(recordBtn.innerHTML.charAt(0) != "W") ci.inc();',
'recordBtn.click(); ci.inc();',
'if (localPlayS.style.display == "") ci.inc();',
'ci.noLoop();',
'blobKb=parseInt(blobSizeS.innerHTML); \
 assertTrue( blobKb > sp.maxBlobBytes/1000, "wrong blob size","blob size="+blobKb+" is over limit" );',
'uploadStoredBtn.click()',
'assertContains("server allows only", recorderAlertP.innerHTML, "no error on uploading oversized record","error shown" );',
 
'println("Testing simple send");',
'mc.utils.setSelect("chunkSelect",2);',
'assertEqualsPrim("Record", recordBtn.innerHTML, "Recorder is not ready", "Recorder ready");',
'ci.loop();',
'recordBtn.click(); ci.inc();',
'if (localPlayS.style.display == "") ci.inc();',
'ci.noLoop();',
'blobKb=parseInt(blobSizeS.innerHTML); \
 assertTrue( blobKb < sp.maxBlobBytes/1000, "wrong blob size","blob size="+blobKb+" is ok" );',
'clip1="Clip Number One"; \
 descriptionInput.value=clip1; \
 uploadStoredBtn.click();',
'',
'assertContains("Server got ", recorderAlertP.innerHTML, "wrong upload message","message ok" );',
'playerBox.sendPoll();',
'',
'assertTrue(medialistT.firstChild, "Empty catalog","catalog got some data");', 
'tr=medialistT.firstChild.innerHTML; \
 assertContains(sp.user, tr, "My good name is absent","My username is present"); \
 assertContains(clip1, tr, "My description is absent","My description is present"); ',

'println("Testing repeated send and folder size limit");',
'clip2="clips salvo 1"; \
 descriptionInput.value=clip2; \
 free=parseInt(folderFreeInp.value); \
 toSend=Math.ceil(free/blobKb)+1;\
 storedTime1=Date.now()/1000; \
 i=0;',
'ci.loop();',
'uploadStoredBtn.click(); i+=1; print(" "+i+" "); if(i >= toSend) { ci.inc(); };',
'ci.noLoop();',
'storedTime2=Date.now()/1000; \
 playerBox.sendRemoveExpired();',
'playerBox.sendPoll();',
'',
'elapsed=Date.now()/1000-storedTime1; \
 assertTrue(elapsed <= sp.clipLifetimeSec, "Increase the lifetime", "No new files have expired yet")',
'free=parseInt(folderFreeInp.value); \
 assertTrue(free <= blobKb, "Wrong FREE after salvo", "Free space is less than clip size"); \
 tr=medialistT.firstChild.innerHTML; \
 assertNotContains(clip1, tr, "My first clip is still present", "My first clip is removed"); \
 assertContains(clip2, tr, "My next clips are missing","My next clips are there"); \
',

'println("Testing clip expiration");',
'ci.loop();',
'elapsed=Date.now()/1000-storedTime1; \
 if(elapsed > (1+parseInt(sp.clipLifetimeSec)) ) { ci.inc(); };',
'ci.noLoop();',
'playerBox.sendRemoveExpired();',
'playerBox.sendPoll();',
'',
'var freeAfterOneLifetime=parseInt(folderFreeInp.value); \
 assertTrue(freeAfterOneLifetime > free, "Wrong FREE after expiration="+freeAfterOneLifetime, "Some clips have expired");',
'ci.loop();',
'elapsed=Date.now()/1000-storedTime2; \
 if(elapsed > sp.clipLifetimeSec) { ci.inc(); };',
'ci.noLoop();',
'playerBox.sendRemoveExpired();',
'playerBox.sendPoll();',
'',
'var freeFinally=parseInt(folderFreeInp.value); \
 assertEqualsPrim(sp.maxMediaFolderBytes/1000, freeFinally, "Wrong free space", "All space is eventually free"); \
 ok= ! medialistT.hasChildren; \
 assertTrue(ok,"Some data are present un the catalog","Catalog is empty"); ',

'println("Testing clips count limit");',
'mc.utils.setSelect("chunkSelect",1); \
 assertEqualsPrim("Record", recordBtn.innerHTML, "Recorder is not ready", "Recorder ready");',
'ci.loop();',
'recordBtn.click(); ci.inc();',
'if (localPlayS.style.display == "") ci.inc();',
'ci.noLoop();',
'clip1="Clip Number One A"; \
 descriptionInput.value=clip1; \
 uploadStoredBtn.click();',
'playerBox.sendPoll();',
'tr=medialistT.firstChild.innerHTML; \
 assertContains(clip1, tr, "My first clip is missing","My first clip is present"); \
 toSend=parseInt(maxClipCountS.innerHTML)+1; \
 i=0; \
 clip2="clips salvo 1 A"; \
 descriptionInput.value=clip2; \
',
'ci.loop();',
'uploadStoredBtn.click(); i+=1; print(" "+i+" "); if (i >= toSend) { ci.inc(); };',
'ci.noLoop();',
'playerBox.sendPoll();',
'free=parseInt(folderFreeInp.value); \
 assertTrue(free > blobKb, "Wrong FREE after salvo", "Free space is not limiting"); \
 tr=medialistT.firstChild.innerHTML; \
 assertNotContains(clip1, tr, "My first clip is still present", "My first clip is removed"); \
 assertContains(clip2, tr, "My next clips are missing","My next clips are there"); \
 tr=medialistT.children.length; \
 assertEqualsPrim(parseInt(maxClipCountS.innerHTML), tr, "Wrong clips count", "Clips count limit is enforced"); \
', 
 
'println("Testing users list basic operations");',
'storedTime1=Date.now()/1000; \
 playerBox.sendPoll();',
'',
'shadow.sendPoll();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 assertContains(sp.user, shResp.users, "Failed to get my username", "My username is visible to Shadow"); \
 assertContains(shUser, shResp.users,  "Failed to get Shadow username", "Shadow username is visible to Shadow");',
'',// fine tune of delay: the responder shoul be open to me without expiring Shadow's record
'elapsed=Date.now()/1000-storedTime1; \
 assertTrue(elapsed > sp.userStatusFadeS, "Increase delay, elapsed="+elapsed+" of "+sp.userStatusFadeS, "Delay has passed"); \
 playerBox.sendPoll();',
'',
//'console.log(mc.utils.dumpArray(playerBox.getResponse()));',
'assertContains(sp.user, usersS.innerHTML, "Missing my username", "My username is listed"); \
 assertContains(shUser, usersS.innerHTML,  "Missing Shadow username", "Shadow username is listed"); ',
'','','','',// another tune: waiting for Shadow's record to expire
'playerBox.sendPoll();',
'',
//'console.log(mc.utils.dumpArray(playerBox.getResponse()));',
'assertContains(sp.user, usersS.innerHTML,"Missing my username", "My username is listed"); \
 assertNotContains(shUser, usersS.innerHTML,"Shadow username not expired", "Shadow username is expired"); ',
 
'println("Testing passing a clip to another user");',
'','','playerBox.sendRemoveExpired();',// let old clips expire
'shadow.sendPoll();',
'clip3="Clips salvo Two"; \
 descriptionInput.value=clip3; \
 mc.utils.setRadio("onrecordedRad","upload"); \
 mc.utils.setSelect("chunkSelect",1); \
 storedTime1=Date.now()/1000; \
 recordBtn.click(); \
 ci.loop();\
',
'elapsed=Date.now()/1000-storedTime1; \
 if(elapsed >= 2) { recordBtn.click(); ci.inc();}',
'ci.noLoop();',
'shadow.sendPoll();',
'playerBox.sendPoll();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 shChangesMap=shadow.getChangesMap(); \
 console.log(mc.utils.dumpArray(shChangesMap)); \
 assertTrue(shResp.list && (shResp.list.length >= 1), "Missing clips list", "New clips are visible" ); \
 ok=shChangesMap.added && (shChangesMap.added.length == shResp.list.length); \
 ok=ok && (shChangesMap.removed.length == 0); \
 assertTrue(ok, "Wrong changesMap", "ChangesMap ok"); \
 ok=shChangesMap.toPlay && (shChangesMap.toPlay[1] == sp.user) && (shChangesMap.toPlay[7] == clip3); \
 assertTrue(ok, "Wrong changesMap.toPlay", "ChangesMap.toPlay ok"); \
',
'println("Testing clip deletion");\
 dels=medialistT.getElementsByClassName("delete");\
 print(dels.length+" del links found ");\
 assertTrue( !!dels.length, "Missing DELETE link", "DELETE link found" ); \
 if (dels.length > 1) delBtn=dels[1];\
 else delBtn=[0]; \
 id=delBtn.parentNode.id; \
 print("deleting "+id+" ");\
 delBtn.click();',
'shadow.sendPoll();',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 shChangesMap=shadow.getChangesMap(); \
 console.log(mc.utils.dumpArray(shChangesMap)); \
 ok=shChangesMap.removed && (shChangesMap.removed.length == 1); \
 ok=ok && (shChangesMap.added.length == 0); \
 assertTrue(ok, "Wrong changesMap", "ChangesMap ok"); \
',
'assertEqualsPrim(id, shChangesMap.removed[0][0], "Wrong ID", "Removed the right ID");',
'println("First tests pack finished successfully");',
'', '','','',// wait for Shadow to expire 
]
