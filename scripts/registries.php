<?php

class PageRegistry extends SingletAssocArrayWrapper {
  protected static $me=null;
  protected $input;
  protected $session;

  /**
   *
   * @return void
   */  
  public function attach($input=null,&$session=null) {
    if( is_null($input) ) { $this->input = $_REQUEST; }
    else { $this->input = $input; }
    if( ! is_null($session) ) $this->session = & $session;
  }

  /**
   *
   * @return void
   */  
  public function readInput(Array $keys) {
    $ins=readByKeys($this->input, $keys);
    //print_r($ins);
    $this->addFreshPairsFrom($ins);
  }
  
  /**
   *
   * @return string
   */  
  public function exportInput($separator) {
    $pairs=[];
    foreach ($this->input as $k=>$v) {
      $pairs[]=$k."=".$v;
    }
    $r=implode($separator,$pairs);
    return $r;
  }  

  /**
   *
   * @return void
   */  
  public function readSession(Array $keys) {
    if( ! is_array($this->session) ) $this->session = & $_SESSION;
    $ins=readByKeys($this->session, $keys);
    //print_r($ins);
    $this->addFreshPairsFrom($ins);
  }
  
  /**
   *
   * @return void
   */  
  public function writeSession(Array $pairs) {
    if( ! is_array($this->session) ) $this->session = & $_SESSION;
    foreach($pairs as $k=>$v) {
      $this->session[$k]=$v;
    }
  }
  
  /**
   *
   * @return void
   */  
  public function nullifySession() {
    if( ! is_array($this->session) ) return;
    //echo(" assigning an empty array to the session ");
    $empty=[];
    $this->session = $empty;// =&$empty does nothing
  }

  /**
   *
   * @return Array
   */  
  public static function getDefaultsClient() {
    $a=[
      //"scriptsPath"=>"scripts/",
      //"pathBias"=>"",
      "timeShiftHrs"=>0,
      "lang"=>"en",
      //"skipPlayerAuth"=>0,// if set, allowPlayerNameInInput must be set also
      "mailFrom"=>"Crazy Ghost <nobody@example.com>",
      "mailReplyTo"=>"",
      "title"=>"Audio chat",
      "mediaFolder"=>"media",
      "notifyUsers"=>0,
      "maxBlobBytes"=>50000,
      "maxMediaFolderBytes"=>400000,
      "lifetimeMediaSec"=>300,
      "allowVideo"=>0,
      "videoOn"=>0,// if allowVideo==0 this will be considered 0
      "allowStream"=>0,
      "onRecorded"=>"stop",// if allowStream==0 this will be considered "stop"
      "chunkSize"=>2,
      "pollFactor"=>10,
      "playNew"=>1,
      "skipMine"=>1,      
    ];
    return $a;
  }

    /**
   *
   * @return Array
   */  
  public static function getDefaultsUpload() {
    $a=[
      //"scriptsPath"=>"scripts/",
      //"pathBias"=>"",
      "timeShiftHrs"=>0,
      "lang"=>"en",
      //"allowAuthByRequestId"=>1,// Credentials
      //"allowPlayerNameInInput"=>1,// Credentials
      "mailFrom"=>"Crazy Ghost <nobody@example.com>",
      "mailReplyTo"=>"",
      "mediaFolder"=>"media",
      "notifyUsers"=>0,
      "maxBlobBytes"=>50000,
      "maxMediaFolderBytes"=>400000,
      "lifetimeMediaSec"=>300,
      "allowStream"=>0
    ];
    return $a;
  }
  
  /**
   *
   * @return Array
   */  
  public static function getDefaultsBackend() {
    $a=[
      "scriptsPath"=>"scripts/",
      "pathBias"=>"",
      "csvPath"=>"data/csv/",
      "lang"=>"en",
      "timeShiftHrs"=>0
    ];
    return $a;
  }
  
  public function overrideSubarrayValues($subarrayIndex,Array $data) {
    if(empty($data)) return;
    if( ! isset($this->arr[$subarrayIndex])) throw new UsageException("No such element:$subarrayIndex!");
    if( ! is_array($this->arr[$subarrayIndex])) throw new UsageException("Not an array element:$subarrayIndex!");
    $a=$this->arr[$subarrayIndex];
    foreach($a as $k=>$v) {
      if(array_key_exists($k,$data)) { $this->arr[$subarrayIndex][$k]=$data[$k]; }
    }
  }
  
  function exportByList($keys,Array $target) {
    $r=$target;
    foreach($keys as $k) { $r[$k]=$this->arr[$k]; }
    return $r;
  }
}

/**
 *
 * @param Array $source
 * @param Array $keys can be [key1,key2,..] or [sourceKey1=>outputKey1,sourceKey2=>outputKey2,..]
 * @return array
 */
function readByKeys(Array $source,Array $keys,$dummy="") {
  $r=[];
  foreach($keys as $key1=>$key2) {
    if(is_int($key1)) {
      $key1=$key2;
    }
    //echo("key1=$key1,key2=$key2 ");
    if(array_key_exists($key1,$source)) {
      $r[$key2]=$source[$key1];
    }
    else {
      if($dummy!==false) $r[$key2]=$dummy;
    }
  }
  return $r;
}

class IniParams {
  protected static $name=".ini";
  protected static $globalPath="";
  protected static $actualFullName;
  protected static $sectionsList=["common","auth","client"];
  
  public static function read($localPath) {
    $empty=[];
    foreach(self::$sectionsList as $sec) { $empty[$sec]=[]; }

    //if( ! file_exists($localPath.$name)) echo("Failed to find file:".$localPath.$name."!");
    $buf="";
    $r=[];
    if( ! is_null($localPath) && file_exists($localPath.self::$name)) {
      $buf=file_get_contents($localPath.self::$name);
      self::$actualFullName=$localPath.self::$name;
      //echo(" buf=".$buf);
    } /*else {
    if( ! empty($globalPath) && file_exists(self::$globalPath.self::$name)) {
      $buf=file_get_contents(self::$globalPath.self::$name);
      self::$actualFullName=self::$globalPath.self::$name;
    }*/ else return ($empty);
    $r=parse_ini_string($buf,true,INI_SCANNER_RAW);
    foreach(self::$sectionsList as $s) {
      if ( ! array_key_exists($s,$r)) $r[$s]=[];
    }
    return $r;  
  }
  
  public static function getFullPath() {
    return self::$actualFullName;
  }
}
