[
'println(""); \
 println("Testing chat messaging");',
'println("Sending to oneself");',
'print("I am "+sp.user+" "); \
 $("peerInp").value=sp.user; \
 toSend="testMsg01 loopback кириллица"; \
 $("textInp").value=toSend; \
 $("sendBtn").click(); \
',
'playerBox.sendPoll();','',
'span=$("chatText").innerHTML; \
 assertContains(toSend,span,"Missing the loopback message","The loopback message received"); \
',
'println("Sending to Shadow, two messages");',
'$("peerInp").value=shUser; \
 toSend="testMsg02 first of two"; \
 toSend2="testMsg03 второе из двух"; \
 $("textInp").value=toSend; \
 $("sendBtn").click(); \
 assertEqualsPrim("", $("textInp").value, "Text box not cleared:"+$("textInp").value, "Text box cleared"); \
 $("textInp").value=toSend2; \
 $("sendBtn").click(); \
',
'shadow.sendPoll();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 assertTrue(shResp.pack instanceof Array && shResp.pack.length == 2, "Wrong response", shUser+" got a pack of 2 messages"); \
 assertEqualsPrim(sp.user, shResp.pack[0].user, "Wrong sender", "Sender is me"); \
 assertEqualsPrim(shUser, shResp.pack[0].target, "Wrong target", "Target is "+shUser); \
 assertEqualsPrim(toSend, shResp.pack[0].text, "Wrong 1st text", "Text 1st is Ok"); \
 assertEqualsPrim(toSend2, shResp.pack[1].text, "Wrong 2nd text", "Text 2nd is Ok"); \
',
'println("Testing message expiration with two messages");',
'$("peerInp").value=shUser; \
 toSend="testMsg04 first of two, to be lost"; \
 toSend2="testMsg05 второе из двух, to be received"; \
 $("textInp").value=toSend; \
 $("sendBtn").click(); \
 assertEqualsPrim("", $("textInp").value, "Text box not cleared:"+$("textInp").value, "Text box cleared"); \
',
'','','',
'$("textInp").value=toSend2; \
 $("sendBtn").click();',
'shadow.sendPoll();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 assertTrue( ! shResp.pack, "Wrong response", "Not a pack"); \
 assertEqualsPrim(sp.user, shResp.user, "Wrong sender", "Sender is me"); \
 assertEqualsPrim(shUser, shResp.target, "Wrong target", "Target is "+shUser); \
 assertEqualsPrim(toSend2, shResp.text, "Wrong text", "Text is Ok"); \
',
'shadow.sendPoll();',
'',
'shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 assertTrue( ! shResp.pack && ! shResp.text, "Some more of a message", "No more messages"); \
', 
'println("Chat tests finished successfully");',
]
