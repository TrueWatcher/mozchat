[
'println(""); println("Testing chat messaging"); println("");',
 
'println("Checking Websockets");\
 assertTrue(sp.wsOn, "ws turned off", "ws turned on");',
'','','',/* skip init request for catalog */
'playerBox.sendEchoRequest();',
'ok=playerAlertP.innerHTML.indexOf("echo reply") >= 0; \
 assertTrue(ok, "wrong message="+recorderAlertP.innerHTML, "ws server echo ok");',
'println("Sending to oneself");',
'print("I am "+sp.user+" "); \
 $("peerInp").value=sp.user; \
 toSend="testMsg01 loopback кириллица"; \
 $("textInp").value=toSend; \
 $("sendBtn").click(); \
',
'span=$("chatText").innerHTML; \
 assertContains(toSend,span,"Missing the loopback message","The loopback message received"); \
',
'println("Sending to Shadow");',
'shadow.connect();','','','',
'assertContains(shUser, $("userlistP").innerHTML, "Missing Shadow from userlist", "Shadow is visible");',
'$("peerInp").value=shUser; \
 toSend="testMsg02 to be relayed"; \
 $("textInp").value=toSend; \
 $("sendBtn").click(); \
 assertEqualsPrim("", $("textInp").value, "Text box not cleared:"+$("textInp").value, "Text box cleared"); \
',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp));',
'assertEqualsPrim(sp.user, shResp.user, "Wrong sender", "Sender is me"); \
 assertEqualsPrim(shUser, shResp.target, "Wrong target", "Target is "+shUser); \
 assertEqualsPrim(toSend, shResp.text, "Wrong relayed text", "Text is Ok"); \
',
'println("Testing message broadcast");',
'$("peerInp").value="*"; \
 toSend="testMsg04 broadvast"; \
 $("textInp").value=toSend; \
 $("sendBtn").click(); \
 assertEqualsPrim("", $("textInp").value, "Text box not cleared:"+$("textInp").value, "Text box cleared"); \
',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 assertEqualsPrim(sp.user, shResp.user, "Wrong sender", "Sender is me"); \
 assertEqualsPrim(shUser, shResp.target, "Wrong target", "Target is "+shUser); \
 assertEqualsPrim(toSend, shResp.text, "Wrong text", "Text is Ok"); \
',
'assertContains(toSend, $("chatText").innerHTML, "Wrong chat text", "Broadcast text is also here");',
'shadow.disconnect();',
'assertNotContains(shUser, $("userlistP").innerHTML, "Failed to clear Shadow from userlist", "Shadow is gone");',
'println("Chat tests finished successfully");',
]
