[ 
'',
'println(""); println("Basic record/save tests over Websockets"); println("");',
'println("Checking Websockets");\
 assertTrue(sp.wsOn, "ws turned off", "ws turned on");',
'','','',/* skip init request for catalog */
'playerBox.sendEchoRequest();',
'ok=playerAlertP.innerHTML.indexOf("echo reply") >= 0; \
 assertTrue(ok, "wrong message="+recorderAlertP.innerHTML, "ws server echo ok");',
 
'println("Clearing files and reading the catalog");',
'playerBox.sendClear();',
'ok=recorderAlertP.innerHTML.indexOf("cleared") >= 0; \
 assertTrue(ok, "wrong message="+recorderAlertP.innerHTML, "server agreed");',
'ok=( $("medialistT").getElementsByTagName("TR").length===1 && tr0().innerHTML.indexOf("no records") > 0 ); \ \
 assertTrue(ok,"Some data are present in the catalog","catalog cleared"); \
 free=parseInt(folderFreeInp.value); \
 assertEqualsPrim(sp.maxMediaFolderBytes/1000, free, "Wrong free space", "All space is free");',
'ok=usersS.innerHTML.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Missing my username", "My username is listed")',

'println("Testing max size limit");',
'chunkInp.value=4; \
 mc.utils.setSelect("chunkSelect","custom"); \
 mc.utils.setRadio("onrecordedRad","stop");',
'ci.loop();',
'if(recordBtn.innerHTML.charAt(0) != "W") ci.inc();',
'recordBtn.click(); ci.inc();',
'if(localPlayS.style.display == "") ci.inc();',
'ci.noLoop();',
'blobKb=parseInt(blobSizeS.innerHTML); \
 assertTrue( blobKb > sp.maxBlobBytes/1000, "wrong blob size","blob size="+blobKb+" is over limit" );',
'uploadStoredBtn.click()',
'err=recorderAlertP.innerHTML.indexOf("server allows only") >= 0; \
 assertTrue(err, "no error on uploading oversized record","error shown" );',
 
'println("Testing simple send");',
'mc.utils.setSelect("chunkSelect",2);',
'ci.loop();',
'if(recordBtn.innerHTML.charAt(0) != "W") ci.inc();',
'recordBtn.click(); ci.inc();',
'if(localPlayS.style.display == "") ci.inc();',
'ci.noLoop();',
'blobKb=parseInt(blobSizeS.innerHTML); \
 assertTrue( blobKb < sp.maxBlobBytes/1000, "wrong blob size","blob size="+blobKb+" is ok" );',
'clip1="Clip Number One"; \
 descriptionInput.value=clip1; \
 uploadStoredBtn.click();',
'ok=recorderAlertP.innerHTML.indexOf("Server got ") >= 0; \
 assertTrue(ok, "wrong upload message","message ok" );',
'assertTrue(tr0(), "Empty catalog","catalog got some data");', 
'tr=tr0().innerHTML; \
 me=tr.indexOf(sp.user) >= 0; \
 assertTrue(me,"My good name is absent","My username is present"); \
 descr=tr.indexOf(clip1) >= 0; \
 assertTrue(descr,"My description is absent","My description is present"); ',

'println("Testing repeated send");',
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
'elapsed=Date.now()/1000-storedTime1; \
 assertTrue(elapsed <= sp.clipLifetimeSec, "Increase the lifetime", "No new files have expired yet")',
'free=parseInt(folderFreeInp.value); \
 assertTrue(free <= blobKb, "Wrong FREE after salvo", "Free space is less than clip size"); \
 var tr=tr0().innerHTML; \
 var descr=tr.indexOf(clip1) >= 0; \
 assertTrue( ! descr,"My first clip is still present","My first clip is removed"); \
 descr=tr.indexOf(clip2) >= 0; \
 assertTrue(descr,"My next clips are missing","My next clips are there"); \
',
'println("Testing clip expiration");',
'ci.loop();',
'elapsed=Date.now()/1000-storedTime1; \
 if(elapsed > (1+parseInt(sp.clipLifetimeSec)) ) { ci.inc(); };',
'ci.noLoop();',
'playerBox.sendRemoveExpired();',
'var freeAfterOneLifetime=parseInt(folderFreeInp.value); \
 assertTrue(freeAfterOneLifetime > free, "Wrong FREE after expiration="+freeAfterOneLifetime, "Some clips have expired");',
'ci.loop();',
'elapsed=Date.now()/1000-storedTime2; \
 if(elapsed > sp.clipLifetimeSec) { ci.inc(); };',
'ci.noLoop();',
'playerBox.sendRemoveExpired();',
'var freeFinally=parseInt(folderFreeInp.value); \
 assertEqualsPrim(sp.maxMediaFolderBytes/1000, freeFinally, "Wrong free space", "All space is eventually free"); \
 ok= ! medialistT.hasChildren; \
 assertTrue(ok,"Some data are present un the catalog","Catalog is empty"); ', 
'println("Testing users list basic operations");',
'shadow.connect();',
'','',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 ok=shResp.users.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Failed to get my username", "My username is visible to Shadow"); \
 ok=shResp.users.indexOf(shUser) >= 0; \
 assertTrue(ok, "Failed to get Shadow username", "Shadow username is visible to Shadow");',
'ok=usersS.innerHTML.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Missing my username", "My username is listed"); \
 ok=usersS.innerHTML.indexOf(shUser) >= 0; \
 assertTrue(ok, "Missing Shadow username", "Shadow username is listed"); ',
'shadow.disconnect();',
'',
//'console.log(mc.utils.dumpArray(playerBox.getResponse()));',
'ok=usersS.innerHTML.indexOf(sp.user) >= 0; \
 assertTrue(ok, "Missing my username", "My username is listed"); \
 ok=usersS.innerHTML.indexOf(shUser) < 0; \
 assertTrue(ok, "Shadow username not expired", "Shadow username is expired"); ',
 
'println("Testing passing a clip to another user");',
'shadow.connect();',
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
//'playerBox.sendPoll();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 shChangesMap=shadow.getChangesMap(); \
 console.log(mc.utils.dumpArray(shChangesMap)); \
 assertTrue( shResp.list && shResp.list.length, "Missing clips list", "New clips are visible" );',
'ok=shChangesMap.added && (shChangesMap.added.length == 1) && (shChangesMap.removed.length == 0); \
 assertTrue( ok, "Wrong changesMap", "ChangesMap ok" );',
'ok=shChangesMap.toPlay && (shChangesMap.toPlay[1] == sp.user) && (shChangesMap.toPlay[7] == clip3); \
 assertTrue(ok, "Wrong changesMap.toPlay", "ChangesMap.toPlay ok");',
'assertEqualsVect( shChangesMap.toPlay, shChangesMap.added[0], "ChangesMap.toPlay -- wrong data", "ChangesMap.toPlay data ok" );',

'println("Testing clip deletion");\
 dels=medialistT.getElementsByClassName("delete");\
 print(dels.length+" del links found ");\
 assertTrue( !!dels.length, "Missing DELETE link", "DELETE link found" ); \
 if (dels.length > 1) delBtn=dels[1];\
 else delBtn=dels[0]; \
 id=delBtn.parentNode.id; \
 print("deleting "+id+" ");\
 delBtn.click();',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 shChangesMap=shadow.getChangesMap(); \
 console.log(mc.utils.dumpArray(shChangesMap)); \
 ok=shChangesMap.removed && (shChangesMap.removed.length == 1); \
 ok=ok && (shChangesMap.added.length == 0); \
 assertTrue(ok, "Wrong changesMap", "ChangesMap ok"); \
',
'assertEqualsPrim(id, shChangesMap.removed[0][0], "Wrong ID", "Removed the right ID");',
'shadow.disconnect();',
'println("First ws tests pack finished successfully");',
''
]
