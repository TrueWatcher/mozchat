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
  
  switch ($act) {
  case "echo":
    $r["alert"]="Echo response";
    break;
  
  case "delete":
    if( ! isset($input["id"])) throw new DataException("Missing ID");
    $id=$input["id"];    
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
    unlinkById($id,$inv,$input);    
    $inv->deleteLine($id);
    $r["list"]=$inv->getCatalog();
    $r["timestamp"]=time();
    $r["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes(); 
    $r["alert"]="Clip deleted";
    break;
  
  case "poll":
    $r=anyNews($pr,$input,$targetPath);
    if (isset($input["hangS"])) sleep($input["hangS"]);
    break;
  
  case "longPoll":    
    $longPollPeriodS=$pr->g("longPollPeriodS");
    $longPollStepMs=300;
    $cycles=ceil($longPollPeriodS*1000/$longPollStepMs);
    for ($i=0; $i<=$cycles; $i+=1) {
      $rr=anyNews($pr,$input,$targetPath);
      if ($rr !== 304) break;
      usleep(1000*$longPollStepMs);
    }
    if ($rr === 304) { $r=refreshCatalog($pr,$targetPath); } 
    else $r=$rr;
    if (isset($input["hangS"])) sleep($input["hangS"]);
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

function unlinkById($id,Inventory $inv,$input) {
  $l=$inv->getLine($id);
  if( ! $l) throw new DataException("No data about this file");
  if($l["author"] != $input["user"]) throw new DataException("You are not permitted");
  $target=$inv->getMediaPath().$l["fileName"];
  if( ! file_exists($target)) throw new DataException("No such file $target");
  unlink($target);
}

function refreshCatalog(PageRegistry $pr,$targetPath) {
  $r=[];
  $inv=new Inventory();
  $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
  $r["list"]=$inv->getCatalog();
  $r["timestamp"]=time();
  $r["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes(); 
  $r["alert"]="Catalog refreshed";;
  return $r;
}

function anyNews(PageRegistry $pr,$input,$targetPath) {
  $r=[];
  $inventoryUpdated = ( $pr->checkNotEmpty("removeExpiredFromDir") || isset($input["removeExpired"]) || ! Inventory::isStillValid($targetPath,$input["catSince"],$input["catBytes"]) );
  $usersToBeUpdated= ! UsersMonitor::isStillValid($targetPath,$input["usersSince"],$pr);
  //$delta=filemtime($targetPath."users.json")-$input["since"];
  
  if ($inventoryUpdated) {
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
    if ( $pr->checkNotEmpty("removeExpiredFromDir") || isset($input["removeExpired"]) ) { 
      $inv->removeExpired();
    }
    $r["list"]=$inv->getCatalog();
    $r["catalogBytes"]=$inv->getCatalogBytes();
    $r["timestamp"]=time();
    $r["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes(); 
    $r["alert"]="Catalog updated";
  }
  if ($usersToBeUpdated) {
    $um=new UsersMonitor();
    $rmo=$um->markOnlineAndReport($targetPath,$input,$pr);
    $userListIsSame=($rmo === true);
    if ( ! $userListIsSame) {
      $r["users"]=$rmo;
      $r["timestamp"]=time();
      if (isset($r["alert"])) { $r["alert"].=" users updated"; }
      else { $r["alert"]="Users updated";}
      //, delta=$delta, statusFade=".$pr->g("userStatusFadeS");
    }
  }
  $dataUnchanged=( ! $inventoryUpdated && ( ! $usersToBeUpdated || $userListIsSame));
  if ($dataUnchanged) {
    $r=304;
    //$r["alert"]="No changes, delta=$delta";
  }
  return $r;
}

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
    $validFor=2+self::$statusFadeS;
    $aPollFactor=0;
    if(isset($input["pollFactor"]) && $input["pollFactor"]) $aPollFactor=$input["pollFactor"];
    if($aPollFactor > self::$statusFadeS*10) $validFor=2+ceil($aPollFactor/10);
    $this->mark($input["user"],"online",$validFor);
    $after=$this->presentOnline();    
    file_put_contents($this->myFileFull,json_encode($this->data));
    if ( $this->checkUsersAgainstInput($input,$after) ) return true;
    return $after;
  }
  
  private function checkUsersAgainstInput($input,$list) {
    if ( ! is_string($list)) throw new Exception("Wrong LIST type");
    if ( ! isset($input["myUsersList"]) || empty($input["myUsersList"])) return false;
    if ($input["myUsersList"] !== $list) return false;
    return true;
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
    $dok=array_keys($this->data["online"]);
    sort($dok);
    return implode(", ",$dok);
  }
  
}// end UsersMonitor