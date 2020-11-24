# mozchat

Target:

New Firefox and Chrome allow for easy VoIP connections and audio/video recording using JavaScript APIs like PeerConnection, getUserMedia and MediaRecorder.

By adding over that feature some JavaScript and PHP code, we can make VoIP calls straight from a web page, upload/download our records to a webserver (with very simple requirements to the hosting provider).

How to use the client page:

Client script first asks for username and thread name. Currently, there's no actual server-side authentication and any name is accepted (special chars are not allowed). Threads are created manually by the site admin and may have different look and behaviour depending on configuration. 

User controls are gathered into three panels: Phone/chat, Recorder and Player. Names of active users appear in the Phone panel starting from "Online:". Clicking a username selects it as a recipient. The CALL button makes a call, HANGUP aborts it, SEND sends a text chat message.

There's only one really important control for Recorder and Player, that's the big RECORD button. Clicking on it starts recording, clicking again stops it. The same way pressing spacebar on a keyboard starts recording, releasing spacebar stops it. If thread configuration enables auto upload, the clip will be sent to the server as soon as it's ready; if auto upload is off, more buttons will appear: PLAY and UPLOAD.

The Player script by default plays new clips as soon as they appear in the list, but only if they are created by other users. Any user may delete any of his clips at any time by clicking the appropriate DELETE button in the clip list. Any clip may be played by hitting PLAY button; PLAY_FROM button tries to continue playing upward, if the "only from others" setting permits that. 

Buttons with E open/hide extra controls and settings.

How to set it up on a server: 

All you need is a most usual Apache/PHP server, database is not used. Just copy all files from the root folder and the _scripts_, _assets_ and _wshub_ folder. If your target directory is your site's root, it's a good idea to add _favicon.ico_ and _robots.txt_.

There may be any number of independent rooms or threads, each has its own folder for clips (_site/thread/media/_ or _site/thread/mediaPlusSomeMoreChars/_), its own metadata storage _site/thread/catalog.json_, user status storage _site/thread/users.json_ and config file _site/thread/.ini_ that defines the thread's limits and behaviour. 

Currently there's no backend. Any thread may be deleted by admin by removing its folder. Admin may also delete all clips in a thread (or, better, media folder itself -- it will be re-created empty). To create a new thread one must create a folder with an appropriate name (do not use _scripts_ or _assets_ or _tests_, please). It's good to copy a redirecting index.php from any existing thread. What's really important is the _.ini_ file, stay with us...

What this thing can do depending on the server settings:

The total size of media folder is limited by _maxMediaFolderBytes_, when a new clip is added to a full folder, the oldest clips are deleted to free the room. Max size of one clip is limited by _maxBlobBytes_ , max duration by _maxClipSizeSec_, its lifetime on the server by _clipLifetimeSec_ (expired clips are removed only when a new one is added).

Other parameters define the interface behaviour and polling interval. After some tryouts, four combinations of settings were outlined: mediaForum, audioStream, videoStream, videoChat. Your can find respective folders with _.ini_ files in the distribution.

The mediaForum is intented for long storage of large video or audio messages. Clip duration, clip size, folder size and clip lifetime are all as large as your hosting can support. Clips are uploaded manually only after thoughtful preview by authors :). There's an additional feature of email notifications: _notifyUsers_ is set to true, and an additional file _notify.ini_ should be filled with pairs userName="user@someMail.com". When a new clip appears, the listed users get notification emails with a direct link to the brand new one.

The audioStream is a VoIP imitation. To minimize delay, clip duration is set to 1s and the hacky "long polling" is used, clip size limit is large enough for 1s audio and folder size - for 10-20 records. There's some clicking noise heard when player switches clips, but general quality is reasonable for talking. It's important to stop recording when not speaking and close the page when not conversating. Wonderfully, there's no limit on the number of participants -- as long as only one at a time speaks and others only listen.

The videoStream is an attempt to extend audioSream to video. With 1s duration, switching clips is really jerky, it may be slightly improved by setting duration to 2s. Other parameters are derived from this. This mode is a demanding browser-network-server performance test, that many components fail (for example, FireFox 60 under Windows 7 in VirtualBox with 1 CPU core and 1GB RAM gives normal video with almost no sound; Chromium under Ubuntu 14 with 2 cores and 2GB RAM over HTTPS gives normal playback but stuttering recording).

The videoChat is an attempt to tradeoff performance for delay. Clip duration is large, but it's sent only after recording, so delay equals to one phrase.

The mediaChat is by now the latest harmonisation; it's made from the videoChat by setting default recording mode to audio (video is still allowed and may be activated by user) and putting a limit on clip count, not only on total size.

Websockets support

Frequent polling of Apache/PHP is popularily believed to be a bad idea, but uploading/downloading heavy files through them is shurely a good one. Anyway, such oldschool design lets us to stay with a cheap shared hosting and away from mad worlds of mixed Websocket/plain HTTP traffic or NodeJs's callback pyramids.

If your hosting provider allows for installing PHP extensions and running your own PHP processes, you may improve the downlink performance by using our Websockets module. It's based on Ratchet, so you'll have to install Composer and Ratchet framework. The module itself is wshub/wshub.php and must be started as a separate PHP program:
  php wshub/wshub.php 
    if you'd like to see it working in terminal, or 
  (php wshub/wshub.php >/dev/null)&
    to run as a daemon
There are a few important parameters in ws.ini:
  wsOn must be set to non-zero to enable Websockets in other scripts
  wsServerUri must point to the wshub's outer host/port (as getUserMedia requires https, you'll have to use the wss:// scheme)
  composerPath must point to there Composer has layed its "vendor" folder (normally, your home directory)
  wssCert and wssKey must point to Apache's SSL certificate and key for wss to work (if the certificate is self-signed, some older browsers may demand your clients to open https://wsServerUri and cofirm the security exception) 

TURN server

By default, our WebRTC communication uses Google's STUN server. For many wireless providers it's not enough, and to connect to their mobiles you must set up your own TURN server (like Coturn). For our scripts to use it, you must point it in threads' .ini files:
  [client]
  ...
  iceAddr="this"
  iceString="[ { "urls" : "turn:@ip@:3478?transport=udp", "username" : "user", "credential" : "password" } ]"
  
If TURN server runs on a different machine from you webserver, indicate its IP in iceAddr instead of "this". See _mediaChat/example.ini_ for the example.


