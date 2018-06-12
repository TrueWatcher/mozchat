<?php
/**
 * Handles AJAX uploads
 */

class DataException extends Exception {};
require_once("scripts/Inventory.php");
 
header('Content-type: text/plain; charset=utf-8');//application/json
// user,realm,blob,mime,ext,duration
//print("Hi, I'm upload.php\n");
//print("max=".ini_get("post_max_size")."!");
//print_r($_POST);
//print(implode(",",array_keys($_REQUEST)));
//print(implode(",",array_keys($_FILES)));

define("MAX_BLOB_BYTES",50000);
define("MAX_DIR_BYTES",200000);
define("TIME_TO_KEEP_S",60);

$input=$_POST;
try {
  checkFields($input);
  checkBlob($_FILES);
  list($mediaPath,$clipName)=chooseName($input["realm"],$input["user"],$input["ext"]);
  $targetPath=$input["realm"]."/";
  
  $inv=new Inventory();
  $inv->init($targetPath);
  $inv->removeExpired();
  
  $r=move_uploaded_file($_FILES['blob']['tmp_name'], $mediaPath.$clipName);
  if( ! $r) throw new Exception("Moving failed");
  $clipBytes=filesize($mediaPath.$clipName);    
  $inv->addClip(
    $clipName, $input["user"], time(), $input["mime"], $input["duration"], $clipBytes, time()+TIME_TO_KEEP_S, $input["description"]
  );
  //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
  $overdraft=$inv->getTotalBytes()-MAX_DIR_BYTES;
  if($overdraft > 0) $inv->freeSomeRoom($overdraft);
  //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
  print('{"alert":"'.'Got a record of '.ceil($clipBytes/1000).'KB"}');
  
} catch (DataException $de) {
  print('{"error":"'.$de->getMessage().'"}');
}


function checkExt($ext) {
  $mimeExt=["oga"=>"audio/ogg\;codecs=opus", "webm"=>"audio/webm\;codecs=opus", "wav"=>"audio/wav"];
  return array_key_exists($ext,$mimeExt);
}
  
function checkFields($input) {
  $r=true;
  if( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="Missing USER or REALM";
  else if( ! isset($input["mime"]) || ! isset($input["ext"]) ) $r="Missing MIME or EXT";
  else if( ! checkExt($input["ext"])) $r="Unknown EXT=".$input["ext"]."!";
  if($r !== true) throw new DataException($r);
}

function checkBlob($files) {
  $r=true;
  if( ! isset($files["blob"])) $r="Missing the file";
  else if( $files["blob"]["size"] > MAX_BLOB_BYTES ) $r="File is bigger than ".MAX_BLOB_BYTES;
  if($r !== true) throw new DataException($r);
}

function makeName($user,$ext,$inc="0") {
  return $user."_".time().$inc.".".$ext;
}

function chooseName($realm,$user,$ext) {
  $pathBias="";
  $mediaFolderName="media";
  $mediaPath=$realm."/".$mediaFolderName."/";
  if( ! file_exists($pathBias.$realm) || ! is_dir($pathBias.$realm)) throw new DataException ("Thread folder ".$pathBias.$realm." not found");
  $n=makeName($user,$ext);
  if(file_exists($mediaPath.$n)) $n=makeName($user,$ext,"1");
  if(file_exists($mediaPath.$n)) $n=makeName($user,$ext,"2");
  if(file_exists($mediaPath.$n)) throw new DataException("File ".$n." already exists");
  return [$mediaPath,$n];
}



?>