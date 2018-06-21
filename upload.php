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
  //$pr->overrideValuesBy($iniParams["inventory"]);
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
    
    $counter=0;
    if( ! $pr->g("allowStream") && $pr->g("notifyUsers") && file_exists($targetPath."notify.ini")) {
      $counter=notifyUsers($input, $targetPath, $n, $uploadedBytes, $pr);
    }
    if($counter) {
      $r["alert"].=", $counter notifications sent";
    }
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

function checkExt($ext) {
  $mimeExt=["oga"=>"audio/ogg\;codecs=opus", "webm"=>"audio/webm\;codecs=opus", "wav"=>"audio/wav"];
  return array_key_exists($ext,$mimeExt);
}
  
function checkFields($input) {
  $r=true;
  if( ! isset($input["mime"]) || ! isset($input["ext"]) ) $r="Missing MIME or EXT";
  else if( ! checkExt($input["ext"])) $r="Unknown EXT=".$input["ext"]."!";
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
  else if( ! file_exists($pathBias.$input["realm"]) || ! is_dir($pathBias.$input["realm"])) $r="Thread folder not found";
  if($r !== true) throw new DataException($r);
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

function notifyUsers($input, $targetPath, $n, $uploadedBytes,  PageRegistry $pr) {
  $valid=date("M_d_H:i:s",time()+$pr->g("timeShiftHrs")+$pr->g("lifetimeMediaSec"));
  $url = 'http://';
  if ( (array_key_exists("HTTPS",$_SERVER)) && $_SERVER['HTTPS'] ) $url = 'https://';
  $url .= $_SERVER['HTTP_HOST'];
  $dir=dirname($_SERVER['REQUEST_URI']);
  $url.=$dir."/";
  $directLink=$url.$targetPath;
  $directLink.=Inventory::checkMediaFolderName($pr->g("mediaFolder"))."/";
  $directLink.=$n;
  $enterLink=$url;
  $noteMain="{$input["realm"]} has received a message from {$input["user"]} of {$input["duration"]}s/$uploadedBytes, valid until $valid";
  $noteMain.="\n".'<a href="'.$directLink.'">direct link</a>, <a href="'.$enterLink.'">thread</a>';
  $recipients=parse_ini_file($targetPath."notify.ini",true);
  //var_dump($recipients);
  $counter=0;
  foreach($recipients as $rName=>$rAddr) {
    $welcome="Dear $rName,\n";
    $sent=sendEmail($rAddr,$welcome.$noteMain,$pr);
    if($sent === true) $counter+=1;
  }
  return $counter;
}

function sendEmail($recAddr,$msgBody,PageRegistry $pr) {
  $defaultSender="me@example.com";
  $defaultHeaders="\r\nContent-Type: text/plain; charset=utf-8;\r\nContent-transfer-encoding: quoted-printable";
  $subj="New message in media chat";
  
  if(empty($recAddr) || false === strpos($recAddr,"@") || false===strpos($recAddr,".")) {
    return ([ $subj.$msgBody,"Invalid recipient" ]);
    //throw new UsageException("Invalid recipient address:$recAddr!");
  }    
  if( $pr->checkNotEmpty("mailFrom") ) { $from="From: ".$pr->g("mailFrom"); }
  else { $from="From: ".$defaultSender; }
  if( $pr->checkNotEmpty("mailReplyTo") ) { $replyto="\r\nReply-To: ".$pr->g("mailReplyTo"); }
  else { $replyto=""; }
  $headers= $from.$replyto.$defaultHeaders;
      
  $ret=mail($recAddr,$subj,$msgBody,$headers);
  return $ret;
}

?>