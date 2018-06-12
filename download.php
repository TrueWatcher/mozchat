<?php
/**
 * Handles AJAX uploads
 */

class DataException extends Exception {};

require_once("scripts/Inventory.php");
 
header('Content-type: text/plain; charset=utf-8');//application/json

$input=$_REQUEST;
$r=[];
try{
  checkFields($input);
  $targetPath=$input["realm"]."/";
  $act=$input["act"];
  
  switch($act){
  case "delete":
    if( ! isset($input["id"])) throw new DataException("Missing ID");
    $id=explode(".",$input["id"]) [0]; 
    $inv=new Inventory();
    $inv->init($targetPath);
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
    $r["alert"]="Clip deleted";
    break;
  
  case "dir":    
    if(isset($input["since"])) {
      $catalog=$targetPath.Inventory::getMyFileName();
      if(filemtime($catalog) <= $input["since"]) {
        $r=304;
        break;
      }
    }
    $inv=new Inventory();
    $inv->init($targetPath);
    //$list=$inv->getCatalogWithoutExpired();
    $list=$inv->getCatalog();
    $r["list"]=$list;
    $r["timestamp"]=time();
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