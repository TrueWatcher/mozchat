# mozchat

Target:

New Firefox and Chrome allow for easy audio/video recording using getUserMedia plus MediaRecorder.

By adding over that feature some js and php we can upload our records to a web-server 
(with very simple requirements to the hosting provider), download them, or,
if our net connections are fast enough, play others' records in almost-real time, thus establishing
a Skype-like communication.

How to use the client page:

Cliant script first asks for username and thread name. Currently there's no actual server-side authentication and any name is accepted (special chars are not allowed). Threads are created manually by the site admin and may have different look and behaviour depending on configuration. 

User controls are gathered into Recorder and Player panels. There's only one really important piece, that is the big RECORD button. Clicking on it starts recording, clicking again stops it. The same way pressing spacebar on a keyboard starts the recording, releasing spacebar stops it. If thread configaration set to auto upload, the clip will be sent to the server as soon as it's ready; if auto upload is off, more buttons will appear: PLAY and UPLOAD.

Names of active users appear in the player panel just below controls. 

Player script by default plays new clips as soon as they appear in the list, but only if they are created by other users. Any user may delete any of his clips at any time by hitting DELETE button in the clip list. Any clip may be played by hitting PLAY button; PLAY_FROM button tries to continue playing upward, if the "only from others" setting permits that.

How to set it up on a server: 

All you need is a most usual Apache/PHP server, database is not used. Just copy all files from the root folder and the _scripts_ folder. If your target directory is your site's root, it's a good idea to add _favicon.ico_ and _robots.txt_.

There may be any number of independent rooms or threads, each has its own folder for clips (site/thread/media/ or site/thread/mediaPlusSomeMoreChars/), its own metadata storage site/thread/catalog.json, user status storage site/thread/users.json and config file site/thread/.ini that defines the thread's limits and behaviour. 

Currently there's no backend. Any thread may be deleted by admin by removing its folder. Admin may also delete all clips in a thread (or, better, media folder itself -- it will be re-created empty). To create a new thread one must create a folder with an appropriate name (do not use _scripts_ or _tests_, please). It's good to copy a redirecting index.php from any existing thread. What's really important is the .ini file (read on, please).

What it can do depending on the server settings:

The total size of media folder is limited by _maxMediaFolderBytes_, when a new clip is added to a full folder, the oldest clips are deleted to free the room. Max size of one clip is limited by _maxBlobBytes_ , max duration by _maxClipSizeSec_, its lifetime on the server by _clipLifetimeSec_ (expired clips are removed only when a new one is added).

Other parameters define the interface behaviour and polling interval. After some tryouts, four combinations of settings were outlined: mediaForum, audioStream, videoStream, videoChat. Your can find respective folders with .ini files in the distribution.

The mediaForum is intented for long storage of large video or audio messages. Clip duration, clip size, folder size and clip lifetime are all as large as your hosting can support. Clips are uploaded manually only after attentive preview by authors :). There's an additional faeture of email notifications: _notifyUsers_ is set to true, and an additional file _notify.ini_ should be filled with pairs userName="user@someMail.com". When a new clip appears, the listed users get notification emails with a direct link to the brand new one.

The audioStream is like VoIP. Clip duration is set to 1s to minimize delay, polling interval is extreme 0.4s, clip size is large enough for 1s audio and folder size - for 10-20 records. There's some clicking noise heard when switching clips, but general quality is reasonable for talking (though dedicated VoIP applications use bandwith much more accurately). It's important to stop recording when not speaking and close the page when not conversating. Wonderfully, there's no limit on the number of participants -- as long as only one at a time speaks and others only listen.

The videoStream is an attempt to extend audioSream to video. With 1s duration switching clips is really jerky, it may be slightly improved by setting duration to 2s. Other parameters are derived from this. This mode is a demanding browser-network-server performance test, that many components fail (for example, FireFox 60 under Windows 7 in VirtualBox with 1 CPU core and 1GB RAM gives normal video with almost no sound; Chromium under Ubuntu 14.04 with 2 cores and 2GB RAM over HTTPS gives normal playback but stuttering recording).

The videoChat is an attempt to tradeoff performance for delay. Clip duration is large, but it's sent anly after recording, so delay equals to one phrase. 

Why not Websocket

Stream modes use very frequent AJAX polling to pull information from the server in almost-realtime. Frequent poliing of Apache/PHP is popularily believed to be a bad idea, but uploading/downloading heavy files through tnem is shurely a good one. Anyway, such oldschool design lets us to stay with cheap shared hosting and away from a mad world of mixed Websocket/plain HTTP traffic. Request-response round time is indicated at the bottom of player panel and on our systems varies from 12ms with a local test server to 50ms with a shared virtual hosting.



