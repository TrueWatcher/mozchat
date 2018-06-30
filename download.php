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
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsAjax() );
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
    $inventoryUpdated = ( $pr->checkNotEmpty("removeExpiredFromDir") || ! Inventory::isStillValid($targetPath,$input["since"],$input["catBytes"]) );
    $usersToBeUpdated= ! UsersMonitor::isStillValid($targetPath,$input["since"],$pr);
    //$delta=filemtime($targetPath."users.json")-$input["since"];
    
    if($inventoryUpdated) {
      $inv=new Inventory();
      $inv->init($targetPath,$pr->g("mediaFolder"));
      if($pr->checkNotEmpty("removeExpiredFromDir")) { $inv->removeExpired(); }
      $r["list"]=$inv->getCatalog();
      $r["catalogBytes"]=$inv->getCatalogBytes();
      $r["timestamp"]=time();
      $r["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes();     
    }
    if($usersToBeUpdated) {
      $um=new UsersMonitor();
      $r["users"]=$um->markOnlineAndReport($targetPath,$input,$pr);
      $r["timestamp"]=time();
      $r["alert"]="Users updated";//, delta=$delta, statusFade=".$pr->g("userStatusFadeS");
    }
    if( ! $inventoryUpdated && ! $usersToBeUpdated) {
      $r=304;
      //$r["alert"]="No changes, delta=$delta";
    }
    break;
  
  case "clearMedia":
    $inv=new Inventory();
    $inv->init($targetPath,$pr->g("mediaFolder"));
    $inv->clear();
    $r["alert"]="files cleared";
    break;
  
  default:
    throw new DataException("Unknown command $act");  
  }

} catch (DataException $de) {
  $r["error"]=$de->getMessage();
}

if($r === 304) {
  header("HTTP/1.0 304 Not Modified");
  exit();
}
print(json_encode($r));
exit();


function checkFields($input) {
  $r=true;
  if( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="Missing USER or REALM";
  else if( ! isset($input["act"])) $r="Missing ACT";
  if($r !== true) throw new DataException($r);
}

class UsersMonitor {
  private static $myFileName="users.json";
  private $myFileFull="";
  private $data=[];
  private $targetPath="";
  private static $statusFadeS=5;
  private static $fileFadeS=2;
  
  static function getMyFileName() { return self::$myFileName; }
  
  static function isStillValid($tp, $since, PageRegistry $pr) {
    if(is_null($since) || ! $since) return false;
    if( ! file_exists($tp.self::$myFileName)) return false;
    self::$fileFadeS=$pr->g("userStatusFadeS")-1;
    if( time()-$since <  self::$fileFadeS ) return 304;
    return false;
  }
  
  function markOnlineAndReport($tp,$input,PageRegistry $pr) {
    $this->read($tp);
    $this->removeExpired();
    self::$statusFadeS=$pr->g("userStatusFadeS");
    $valid=self::$statusFadeS;
    $aPollFactor=0;
    if(isset($input["pollFactor"]) && $input["pollFactor"]) $aPollFactor=$input["pollFactor"];
    if($aPollFactor > self::$statusFadeS*10) $valid=ceil($aPollFactor/10);
    $this->mark($input["user"],"online",$valid);
    file_put_contents($this->myFileFull,json_encode($this->data));
    return $this->presentOnline();
  }
  
  
  private function read($tp) {
    $this->myFileFull=$tp.self::$myFileName;
    if( ! file_exists($this->myFileFull)) {
      $this->data=["online"=>[]];
    }
    else {      
      $buf=file_get_contents($this->myFileFull);
      $this->data=json_decode($buf,true);
    }
  }
  
  private function removeExpired() {
    $status="online";
    $res=[];
    $t=time();
    foreach($this->data[$status] as $u=>$expire) {
      if($expire > $t) { $res[$u]=$expire; }
    }
    $this->data[$status]=$res;  
  }
  
  private function mark($user,$status,$validForS) {
    $expire=time()+$validForS;
    $this->data[$status][$user]=$expire;
  }
  
  private function presentOnline() {
    return implode(", ",array_keys($this->data["online"]));
  }
  
}// end UsersMonitor