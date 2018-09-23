[
'playerBox.sendClear();',
'println("Testing long poll"); \
 println("catch others log in and log out");',
'playerBox.sendPoll();',
'console.log(mc.utils.dumpArray(playerBox.getResponse()))',
'ul=playerBox.getResponse().users;\
 print(ul+" ");\
 assertEqualsPrim("Test1", ul, "Wrong users list", "Users list Ok")',
'playerBox.sendLongPoll();',
'console.log(mc.utils.dumpArray(playerBox.getResponse()))',
'assertTrue(playerBox.linkIsBusy(),"Long request returned","Long request is active")',
'shadow.sendPoll();',
'',
'assertTrue( ! playerBox.linkIsBusy(),"Missed user login","Returned on user login");\
 ul=playerBox.getResponse().users;\
 print(ul+" ");\
 assertEqualsPrim("Shadow, Test1", ul, "Wrong users list", "Users list Ok")',
'','',
'playerBox.sendLongPoll();',
'assertTrue(playerBox.linkIsBusy(),"Long request returned","Long request is active")',
'','','','','',
'assertTrue( ! playerBox.linkIsBusy(),"Missed user logout","Returned on user logout");\
 ul=usersS.innerHTML;\
 print(ul+" ");\
 assertEqualsPrim("Test1", ul, "Wrong users list", "Users list Ok")',
'playerBox.sendPoll();',

'println("catch clip upload and deletion");',
'shadow.sendPoll("removeExpired=1");',
'console.log(mc.utils.dumpArray(shadow.getResponce()));',
'playerBox.sendPoll();',// to avoid expiration and userslist change
'shadow.sendLongPoll();',
'if ( ! shadow.linkIsBusy()) console.log(mc.utils.dumpArray(shadow.getResponce())); \
 assertTrue(shadow.linkIsBusy(),"Long request returned","Long request is active")',
'mc.utils.setSelect("chunkSelect","1"); \
 mc.utils.setRadio("onrecordedRad","upload");\
 clip1="Clip Number One"; \
 descriptionInput.value=clip1;',
'recordBtn.click();',
'recordBtn.click();',
'',
'assertTrue( ! shadow.linkIsBusy(),"Missed clip upload","Returned on clip upload");\
 shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 shResp=mc.utils.dumpArray(shResp); \
 descr=shResp.split(clip1).length - 1; \
 assertTrue(descr > 0, "Missed description from response", "My description is present"); \
',
'playerBox.sendPoll();',
'shadow.sendLongPoll();',
'if ( ! shadow.linkIsBusy()) console.log(mc.utils.dumpArray(shadow.getResponce())); \
 assertTrue(shadow.linkIsBusy(),"Long request returned","Long request is active"); \
 delBtn=medialistT.getElementsByClassName("delete")[0]; \
 assertTrue(!!delBtn, "Missing DELETE link", "DELETE link found"); \
 delBtn.click();',
'assertTrue( ! shadow.linkIsBusy(),"Missed clip deletion","Returned on clip deletion");\
 shResp=shadow.getResponce(); \
 console.log(mc.utils.dumpArray(shResp)); \
 shResp=mc.utils.dumpArray(shResp); \
 descr2=shResp.split(clip1).length - 1; \
 assertEqualsPrim(1, descr-descr2, "Descriptions count is same", "One clip deleted"); \
',
'println("inflict timeout");',
'playerBox.sendPoll("hangS=3");',
'',
'assertTrue(playerBox.linkIsBusy(), "link is not hanged", "link is busy");',
'','','',
'assertTrue( ! playerBox.linkIsBusy(), "link is not freed", "link is free"); \
 err=playerAlertP.innerHTML.indexOf("timed out") >= 0; \
 assertTrue(err, "no error on timeout","error shown" ); \
',
  
'println("Tests finished successfully");'
]