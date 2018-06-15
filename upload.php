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
    $r=$inv->pickUploadedBlob($n,$input,$pr);
    //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
    print('{"alert":"'.'Got a record of '.b2kb($r).'"}');
  }
  else throw new DataException("Unknown command=$act!");
  
} catch (DataException $de) {
  print('{"error":"'.$de->getMessage().'"}');
}


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





?>