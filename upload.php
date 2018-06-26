<?php
/**
 * Handles AJAX uploads
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
require_once("scripts/Inventory.php");
 
header('Content-type: text/plain; charset=utf-8');//application/json
// user,realm,blob,mime,ext,duration
//print("Hi, I'm upload.php\n");
//print("max=".ini_get("post_max_size")."!");
//print_r($_POST);
//print(implode(",",array_keys($_REQUEST)));
//print(implode(",",array_keys($_FILES)));

$input=$_POST;
try {
  $r=[];
  checkUserRealm($pathBias,$input);
  $targetPath=$pathBias.$input["realm"]."/";
  $iniParams=IniParams::read($targetPath);
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsUpload() );
  //$pr->overrideValuesBy($pageEntryParams["PageRegistry"]);
  $pr->overrideValuesBy($iniParams["common"]);
  //$pr->dump();  
  if( ! isset($input["act"])) throw new DataException("Missing ACT");
  $act=$input["act"];

  if($act == "uploadBlob") {
    checkFields($input);
    checkBlob($_FILES,$pr);
    $inv=new Inventory();
    $inv->init($targetPath,$pr->g("mediaFolder"));
    $inv->removeExpired();
    $n=$inv->newName($input["ext"]);
    $uploadedBytes=$inv->pickUploadedBlob($n,$input,$pr);
    $uploadedBytes=b2kb($uploadedBytes);
    //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
    $r["alert"]='Server got a record of '.$uploadedBytes;
    $r["alert"] .= MailHelper::go($input, $targetPath, $n, $uploadedBytes,  $pr);
  }
  else if($act == "reportMimeFault") {
    reportMimeFault($pathBias,$input);
    $r=204;
  }
  else throw new DataException("Unknown command=$act!");
  
} catch (DataException $de) {
  $r["error"]=$de->getMessage();
}
if($r === 204) {
  header("HTTP/1.0 204 No Content");
  exit();
}
if($r === 304) {
  header("HTTP/1.0 304 Not Modified");
  exit();
}
print(json_encode($r));
exit();

function checkExt($ext) { return MimeDecoder::ext2mime($ext); }
  
function checkFields($input) {
  $r=true;
  if( isset($input["description"]) ) $input["description"]=htmlspecialchars($input["description"]);
  if( ! isset($input["mime"]) || ! isset($input["ext"]) ) $r="Missing MIME or EXT";
  else if( ! checkExt($input["ext"])) $r="Unknown EXT=".$input["ext"]."!";
  else if( isset($input["description"]) && strlen($input["description"]) > 200 ) {
    $input["description"]=substr($input["description"],0,100);
  }
  if($r !== true) throw new DataException($r);
}

function checkBlob($files,$pr) {
  $r=true;
  if( ! isset($files["blob"])) $r="Missing the file";
  else if( $files["blob"]["size"] > $pr->g("maxBlobBytes") ) $r="File is bigger than ".b2kb($pr->g("maxBlobBytes"));
  if($r !== true) throw new DataException($r);
}

function checkUserRealm($pathBias,$input) {
  $r=true;
  if( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="Missing USER or REALM";
  else if( charsInString($input["user"],"<>&\"':;()") ) $r="Forbidden symbols in username";
  else if( strlen($input["user"]) > 30 ) $r="Too long username";
  else if( ! file_exists($pathBias.$input["realm"]) || ! is_dir($pathBias.$input["realm"])) $r="Thread folder not found";
  if($r !== true) throw new DataException($r);
}

function charsInString($object,$charsString) {
  if ( empty($object) ) return false;
  if (strtok($object,$charsString) !== $object) return true;
  return false;
}

function reportMimeFault($pathBias,$input) {
  $browserLogFile=$pathBias."browser.log";
  $rec="";
  $rec.=$input["user"]." ".$_SERVER["HTTP_REMOTE_ADDR"]." ".$input["realm"]."\n";
  $rec.=$_SERVER["HTTP_USER_AGENT"]."\n";
  $rec.=$input["mimesList"]."\n";
  $rec.="\n";
  file_put_contents($browserLogFile,$rec);  
}


abstract class MailHelper {

  function go($input, $targetPath, $n, $uploadedBytes,  PageRegistry $pr) {
    if( ! self::check($targetPath,$pr) ) return "";
    $counter=self::notifyUsers($input, $targetPath, $n, $uploadedBytes,  $pr);
    if( ! $counter) return ", notifications failed";
    return ", $counter notifications sent";
  }
  
  private static function check($targetPath, PageRegistry $pr) {
    return (! $pr->g("allowStream")) && $pr->g("notifyUsers") && file_exists($targetPath."notify.ini");
  }

  private static function notifyUsers($input, $targetPath, $n, $uploadedBytes,  PageRegistry $pr) {
    $title="";
    if($input["description"]) $title=" \"".$input["description"]."\" ";
    $valid=date("M_d_H:i:s",time()+3600*$pr->g("timeShiftHrs")+$pr->g("lifetimeMediaSec"));
    $url = 'http://';
    if ( (array_key_exists("HTTPS",$_SERVER)) && $_SERVER['HTTPS'] ) $url = 'https://';
    $url .= $_SERVER['HTTP_HOST'];
    $dir=dirname($_SERVER['REQUEST_URI']);
    //echo(" url=$url, dir=$dir, ");
    if( ! empty($dir) && $dir !== "/") $url.=$dir;
    $url.="/";
    $enterLink=$url;
    if($targetPath) $directLink=$url.$targetPath;
    $directLink.=Inventory::checkMediaFolderName($pr->g("mediaFolder"))."/";
    $directLink.=$n;  
    $noteMain="{$input["realm"]} has received a message from {$input["user"]} $title of {$input["duration"]}s/$uploadedBytes, valid until $valid";
    $noteMain.="\n".'<a href="'.$directLink.'">direct link</a>, <a href="'.$enterLink.'">thread</a>';
    $recipients=parse_ini_file($targetPath."notify.ini",true);
    //var_dump($recipients);
    $counter=0;
    foreach($recipients as $rName=>$rAddr) {
      $welcome="Dear $rName,\n";
      $sent=self::sendEmail($rAddr,$welcome.$noteMain,$pr);
      if($sent === true) $counter+=1;
    }
    return $counter;
  }
  
  private static function sendEmail($recAddr,$msgBody,PageRegistry $pr) {
    $defaultSender="me@example.com";
    $headers=[];
    $defaultHeaders=[
      "Content-Type: text/plain; charset=utf-8;"/*, 
      "Content-transfer-encoding: quoted-printable;"*/
    ];
    $subj="New message in media chat";
    
    if(empty($recAddr) || false === strpos($recAddr,"@") || false===strpos($recAddr,".")) {
      return ([ $subj.$msgBody,"Invalid recipient" ]);
      //throw new UsageException("Invalid recipient address:$recAddr!");
    }    
    if( $pr->checkNotEmpty("mailFrom") ) { $from="From: ".$pr->g("mailFrom"); }
    else { $from="From: ".$defaultSender; }
    $headers[]=$from;  
    if( $pr->checkNotEmpty("mailReplyTo") ) { 
      $replyto="Reply-To: ".$pr->g("mailReplyTo");
      $headers[]=$replyto;
    }
    else { $replyto=""; }  
    $headers=$headers+$defaultHeaders;
    //var_dump($headers);
        
    $ret=mail($recAddr,$subj,$msgBody,implode("\r\n", $headers));
    return $ret;
  }
}

?>