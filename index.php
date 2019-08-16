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
  $wsParams=parse_ini_file($pathBias."wshub/ws.ini", true, INI_SCANNER_RAW);
  //var_dump($wsParams);
  $pr->addFreshPairsFrom($wsParams["common"]);
  $wsOn=$pr->g("wsOn");
  if ($wsOn) checkWsCommandLink($pr->g("wsCommandUri"));

  $serverParams=[
    "state"=>"operational", "user"=>$input["user"], "realm"=>$input["realm"]
  ];
  $serverParams=$pr->exportByList( [
    "serverPath", "serverName", "maxBlobBytes", "maxMediaFolderBytes", "clipLifetimeSec", "title", "allowVideo", "videoOn", "maxClipSizeSec", "maxClipCount", "allowStream", "onRecorded", "pollFactor", "playNew", "skipMine", "showMore", "mediaFolder", "pathBias", "longPollPeriodS", "userStatusFadeS", "wsOn", "wsServerUri"
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

function checkWsCommandLink($uri) {
  $q=$uri."/?act=echo";
  $ctx=stream_context_create(['http'=>['method'=>'get','header'=>'Content-type: text/plain']]);
  $reply=@file_get_contents($q,false,$ctx);
  if ( ! is_string($reply)) exit("Error! System is misconfigured, required websockets server does not respond");
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
