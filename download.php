<?php
/**
 * Handles AJAX queries from playerBox
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
require_once("scripts/Inventory.php");
require_once("scripts/UsersMonitor.php");
require_once("scripts/ChatRelay.php");
require_once("scripts/CallLogger.php");

$input=$_REQUEST;
$resp=[];
try {
  list($act,$user,$realm)=checkFields($input);
  $targetPath=$pathBias.$realm."/";
  $iniParams=IniParams::read($targetPath);
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsAjax() );
  //$pr->overrideValuesBy($pageEntryParams["PageRegistry"]);
  $pr->overrideValuesBy($iniParams["common"]);
  //$pr->overrideValuesBy($iniParams["inventory"]);
  //$pr->dump();  
  
  switch ($act) {
  case "echo":
    $resp["alert"]="Echo response";
    break;
  
  case "delete":
    if ( ! isset($input["id"])) throw new DataException("Missing ID");
    $id=$input["id"];    
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
    unlinkById($id,$inv,$input);    
    $inv->deleteLine($id);
    return makeCatalog($inv, $pr, "Clip deleted", $targetPath);
    break;
  
  case "poll":
    $cr=new ChatRelay($pathBias,$realm);
    $resp=$cr->tryExtract($user);
    if ( ! empty($resp)) break;
    $resp=anyNews($pr,$input,$targetPath);
    if (isset($input["hangS"])) sleep($input["hangS"]);
    break;
  
  case "longPoll":    
    $longPollPeriodS=$pr->g("longPollPeriodS");
    $longPollStepMs=300;
    $cycles=ceil($longPollPeriodS*1000/$longPollStepMs);
    $usersCycle=floor(UsersMonitor::fileFadeS($pr)*1000/$longPollStepMs);
    for ($i=0; $i<=$cycles; $i+=1) {
      $forceUpdateUsers=( $i % $usersCycle === 0 );
      $rr=anyNews($pr,$input,$targetPath,$forceUpdateUsers);
      if ($rr !== 304) break;
      usleep(1000*$longPollStepMs);
    }
    if ($rr === 304) { $resp=refreshCatalog($pr,$targetPath); } 
    else $resp=$rr;
    if (isset($input["hangS"])) sleep($input["hangS"]);
    break;
  
  case "clearMedia":
    $inv=new Inventory();
    $inv->init($targetPath,$pr->g("mediaFolder"));
    $inv->clear();
    $resp["alert"]="files cleared";
    break;
  
  default:
    throw new DataException("Unknown command $act");  
  }

} catch (DataException $de) {
  $resp["error"]=$de->getMessage();
}

if ($resp === 304) {
  header("HTTP/1.0 304 Not Modified");
  exit();
}
header('Content-type: text/plain; charset=utf-8');//application/json
print(json_encode($resp));
exit();

function unlinkById($id,Inventory $inv,$input) {
  $l=$inv->getLine($id);
  if ( ! $l) throw new DataException("No data about this file");
  if ($l["author"] != $input["user"]) throw new DataException("You are not permitted");
  $target=$inv->getMediaPath().$l["fileName"];
  if ( ! file_exists($target)) throw new DataException("No such file $target");
  unlink($target);
}

function makeCatalog(Inventory $inv, PageRegistry $pr, $alert, $tp) {
  $p=[];
  $p["list"]=$inv->getCatalog();
  $p["timestamp"]=time();
  $r["catalogBytes"]=$inv->getCatalogBytes();
  $p["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes();
  $p["catCrc"]=$inv->getMyFileCrc($tp);
  if ($alert) $p["alert"]=$alert;
  return $p;  
}

function refreshCatalog(PageRegistry $pr,$targetPath) {
  $inv=new Inventory();
  $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
  return makeCatalog($inv, $pr, "Catalog refreshed", $targetPath);
}

function anyNews(PageRegistry $pr,$input,$targetPath,$forceUpdateUsers=null) {
  $r=[];
  $inventoryUpdated = ( $pr->checkNotEmpty("removeExpiredFromDir") || isset($input["removeExpired"]) || ! Inventory::isStillValid($targetPath,$input) );
  if (is_null($forceUpdateUsers)) {
    $usersToBeUpdated = ! UsersMonitor::isStillValid($targetPath,$input["usersSince"],$pr);
  }
  else { $usersToBeUpdated = $forceUpdateUsers; }
  //$delta=filemtime($targetPath."users.json")-$input["since"];
  
  if ($inventoryUpdated) {
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
    if ( $pr->checkNotEmpty("removeExpiredFromDir") || isset($input["removeExpired"]) ) { 
      $inv->removeExpired();
    }
    $r=makeCatalog($inv, $pr, "Catalog updated", $targetPath);
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
  if ( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="Missing USER or REALM";
  else if ( ! isset($input["act"])) $r="Missing ACT";
  if ($r !== true) throw new DataException($r);
  return [$input["act"], $input["user"], $input["realm"]];
}
