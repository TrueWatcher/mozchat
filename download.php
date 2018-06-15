<?php
/**
 * Handles AJAX queries from playerBox
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
require_once("scripts/Inventory.php");
 
header('Content-type: text/plain; charset=utf-8');//application/json

$input=$_REQUEST;
$r=[];
try {
  checkFields($input);
  $targetPath=$pathBias.$input["realm"]."/";
  $iniParams=IniParams::read($targetPath);
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsUpload() );
  //$pr->overrideValuesBy($pageEntryParams["PageRegistry"]);
  $pr->overrideValuesBy($iniParams["common"]);
  //$pr->overrideValuesBy($iniParams["inventory"]);
  //$pr->dump();  
  //if( ! isset($input["act"])) throw new DataException("Missing ACT");
  $act=$input["act"];
  
  switch($act){
  case "delete":
    if( ! isset($input["id"])) throw new DataException("Missing ID");
    //$id=explode(".",$input["id"]) [0]; 
    $inv=new Inventory();
    $inv->init($targetPath,$pr->g("mediaFolder"));
    $id=$input["id"];
    $l=$inv->getLine($id);
    if( ! $l) throw new DataException("No data about this file");
    if($l["author"] != $input["user"]) throw new DataException("You are not permitted");
    $target=$inv->getMediaPath().$l["fileName"];
    if( ! file_exists($target)) throw new DataException("No such file $target");
    unlink($target);
    $inv->deleteLine($id);
    $list=$inv->getCatalog();
    $r["list"]=$list;
    $r["timestamp"]=time();
    $r["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes(); 
    $r["alert"]="Clip deleted";
    break;
  
  case "dir":    
    if(isset($input["since"]) && $input["since"]) {
      $catalog=$targetPath.Inventory::getMyFileName();
      if(filemtime($catalog) < $input["since"]) {
        $r=304;
        break;
      }
    }
    $inv=new Inventory();
    $inv->init($targetPath,$pr->g("mediaFolder"));
    //$list=$inv->getCatalogWithoutExpired();
    $list=$inv->getCatalog();
    $r["list"]=$list;
    $r["timestamp"]=time();
    $r["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes(); 
    break;
  
  
  default:
    throw new DataException("Unknown command $act");  
  }
  if($r == 304) {
    header("HTTP/1.0 304 Not Modified");
    exit();
  }
  print(json_encode($r));
} catch (DataException $de) {
  print('{"error":"'.$de->getMessage().'"}');
}


function checkFields($input) {
  $r=true;
  if( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="Missing USER or REALM";
  else if( ! isset($input["act"])) $r="Missing ACT";
  if($r !== true) throw new DataException($r);
}