<?php
/**
 * Client entry point
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
$input=$_REQUEST;
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
    "maxBlobBytes", "maxMediaFolderBytes", "lifetimeMediaSec", "allowVideo", "chunkSize", "onRecorded", "pollFactor", "playNew", "skipMine", "mediaFolder"
  ] , $serverParams);

  include("scripts/templates/client.php");
} 
catch (NoCredentialsException $nce) {
  $serverParams=["state"=>"zero","alert"=>$nce->getMessage()];
  include("scripts/templates/client.php");
}
catch (DataException $de) {
  print('{"error":"'.$de->getMessage().'"}');
}

function checkUserRealm($pathBias,$input) {
  $r=true;
  if( ! isset($input["user"]) || ! isset($input["realm"]) ) $r="Missing USER or REALM";
  else if( ! file_exists($pathBias.$input["realm"]) || ! is_dir($pathBias.$input["realm"])) $r="Thread folder not found";
  if($r !== true) throw new NoCredentialsException($r);
}

?>