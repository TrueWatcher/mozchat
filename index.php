<?php
/**
 * Client entry point
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
require_once("scripts/Inventory.php");
require_once("scripts/AssetsVersionMonitor.php");
$input=$_REQUEST;
$mimeDictionary=[];
$cssLink="blue.css";
try {
  checkUserRealm($pathBias,$input);
  $targetPath=$pathBias.$input["realm"]."/";
  $iniParams=IniParams::read($targetPath);
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsClient() );
  //$pr->overrideValuesBy($pageEntryParams["PageRegistry"]);
  $pr->overrideValuesBy($iniParams["common"]);
  $pr->overrideValuesBy($iniParams["client"]);

  $serverParams=[
    "state"=>"operational", "user"=>$input["user"], "realm"=>$input["realm"]
  ];
  $serverParams=$pr->exportByList( [
    "maxBlobBytes", "maxMediaFolderBytes", "clipLifetimeSec", "title", "allowVideo", "videoOn", "maxClipSizeSec", "allowStream", "onRecorded", "pollFactor", "playNew", "skipMine", "mediaFolder", "pathBias", "longPollPeriodS", "userStatusFadeS"
  ] , $serverParams);
  $serverParams["mediaFolder"]=Inventory::checkMediaFolderName($serverParams["mediaFolder"]);
  $mimeDictionary=MimeDecoder::getDictionary();

  include("scripts/templates/client.php");
} 
catch (NoCredentialsException $nce) {
  $serverParams=["state"=>"zero","alert"=>$nce->getMessage()];
  if(realmIsOk($pathBias,$input)) { $serverParams["realm"]=$input["realm"]; }
  include("scripts/templates/client.php");
}
catch (DataException $de) {
  print('{"error":"'.$de->getMessage().'"}');
}

function checkUserRealm($pathBias,$input) {
  $r=true;
  if( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="Missing USER or REALM";
  else if( charsInString($input["user"],"<>&\"':;()") ) $r="Forbidden symbols in username";
  else if( strlen($input["user"]) > 30 ) $r="Too long username";
  else if( ! realmIsOk($pathBias,$input)) $r="Thread folder not found";
  if($r !== true) throw new NoCredentialsException($r);
}

function realmIsOk($pathBias,$input) {
  return isset($input["realm"]) && file_exists($pathBias.$input["realm"]) && is_dir($pathBias.$input["realm"]);
}

function charsInString($object,$charsString) {
  if ( empty($object) ) return false;
  if (strtok($object,$charsString) !== $object) return true;
  return false;
}

function version($fn) {
  if ( ! class_exists("AssetsVersionMonitor")) return $fn;
  else return AssetsVersionMonitor::addVersion($fn);
}

?>