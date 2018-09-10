<?php
abstract class AssetsVersionMonitor {

  protected static $myFolder="assets/";
  protected static $myFile="version.txt";
  protected static $now=false;
  protected static $sep="_";

  public static function addVersion($fileName,$pathBias="") {
    if ( ! self::$now) {
      self::$now=self::getVersionNumber($pathBias);
      if ( ! self::$now) { exit("Failed to read the version number, check ".self::$myFile); }
    }
    list($name,$version,$extension)=self::parseFileName($fileName);
    $newFileName=$name.self::$sep.self::$now.".".$extension;
    if ( ! file_exists($pathBias.self::$myFolder.$newFileName)) { 
      self::changeVersionOnDisk($name,$extension,$newFileName,$pathBias);
    }
    return $newFileName;
  }

  protected static function parseFileName($fileName) {
    $v="";
    list($n,$e)=explode(".",$fileName);
    $parts=explode(self::$sep,$n);
    $c=count($parts);
    if ($c < 4) { return [$n,$v,$e]; }
    $v=$parts[$c-3].self::$sep.$parts[$c-2].self::$sep.$parts[$c-1];
    return [$n,$v,$e];
  }

  protected static function getVersionNumber($pathBias) {
    $buf=file_get_contents($pathBias.self::$myFolder.self::$myFile);
    $buf=trim($buf);
    $buf=str_replace(".",self::$sep,$buf);
    if (count(explode(self::$sep,$buf)) !== 3) return false;
    return $buf;
  }
  
  protected static function changeVersionOnDisk($name,$extension,$newFileName,$pathBias) {
    $wildCard=$name.self::$sep."*".".".$extension;
    $count=0;
    foreach (array_filter(glob($pathBias.self::$myFolder.$wildCard) ,"is_file") as $f) {
      if ($count) throw new Exception("Several files match $wildCard");
      $r=rename($f, $pathBias.self::$myFolder.$newFileName);
      if ( ! $r) exit("Failed to rename $wildCard to $newFileName");
      $count+=1;
    }
    if ( ! $count) throw new Exception("No files match $wildCard");
  }
  

}