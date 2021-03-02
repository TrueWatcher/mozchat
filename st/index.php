<?php
// issues redirect to main index.php with the current folder name as parameter
// if a username is given as ?user=Me, it's also passed
// Location: http://mysite.net/mozchat/?realm=thisFolder

list($upperUri,$realm)=absUpperUri($_SERVER);
$goTo=$upperUri."?realm=$realm";
if(isset($_REQUEST["user"]) && $_REQUEST["user"]) {
  $goTo .= "&user=".$_REQUEST["user"];
}  
//echo($goTo);
header('Location: '.$goTo);
exit();

function absUpperUri($server) {
  $myFolder="";
  $url = 'http://';
  if ( (array_key_exists("HTTPS",$server)) && $server['HTTPS'] ) $url = 'https://';
  $url .= $server['HTTP_HOST'];
  $dir=dirname($server['PHP_SELF']);
  $lastSlash=strrpos($dir,'/');
  $myFolder=substr($dir,$lastSlash+1);
  $dir=substr($dir,0,$lastSlash);
  if( ! empty($dir) && $dir !== "/") $url.=$dir;
  $url.="/";
  //echo(" url=$url, lastSlash=$lastSlash, dir=$dir, myFolder=$myFolder\r\n");
  return [$url,$myFolder];
}

?>
