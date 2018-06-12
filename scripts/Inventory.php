<?php

class Inventory {
  private $targetPath="";
  private $mediaFolderName="media";
  private static $myFileName="catalog.json";
  private $mediaFolder="";
  private $data=[];
  private $total;
  private $keys=["fileName","author","dateTime","mime","duration","bytes","expire","description"];
  
  static function getMyFileName() { return self::$myFileName; }
  
  function init($tp) {
    $mediaFolder=$tp.$this->mediaFolderName;
    if( ! file_exists($mediaFolder) || ! is_dir($mediaFolder)) throw new DataException ("Target folder ".$mediaFolder." not found");
    $this->targetPath=$tp;
    $this->mediaFolder=$mediaFolder;
    $myFile=$tp.self::$myFileName;
    $filesFound=scandir($mediaFolder);
    array_shift($filesFound); array_shift($filesFound);// "." and ".." are always there
    //print_r($filesFound);
    $folderIsEmpty=(count($filesFound) == 0);
    if($folderIsEmpty) {
      //echo(" empty folder ");
      $this->data=[];
      $this->total=0;
      file_put_contents($myFile,"[]");
      return;
    }
    $this->data=json_decode(file_get_contents($myFile));
    $this->checkCatalog($filesFound);
    $this->sumUpBytes();
  }
  
  private function checkCatalog($scanned) {
    $scannedLength=count($scanned);
    $myLength=count($this->data);
    if($myLength != $scannedLength) throw new DataException("Inventory has $myLength records, the folder has $scannedLength files");
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      if( ! in_array($ee["fileName"],$scanned) ) throw new DataException("Inventory entry {$ee["fileName"]} is missing from the folder");
    }
  }
  
  function getDirectorySize(){
  // https://stackoverflow.com/questions/478121/how-to-get-directory-size-in-php
  /*  $f = './path/directory';
    $io = popen ( '/usr/bin/du -sk ' . $f, 'r' );
    $size = fgets ( $io, 4096);
    $size = substr ( $size, 0, strpos ( $size, "\t" ) );
    pclose ( $io );
    echo 'Directory: ' . $f . ' => Size: ' . $size;
  */
    $path=$this->mediaFolder;
    $bytestotal = 0;
    $path = realpath($path);
    if($path!==false && $path!='' && file_exists($path)){
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)) as $object){
            $bytestotal += $object->getSize();
        }
    }
    return $bytestotal;
  }
  
  // user,realm,blob,mime,ext,duration
  function addClip($fileName,$author,$dateTime,$mime,$duration,$bytes,$expire,$description) {
    if($duration == 0) $duration="1";
    $e=[$fileName,$author,$dateTime,$mime,$duration,$bytes,$expire,$description];
    $this->data[]=$e;
    $this->total+=$bytes;
    file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
  }
  
  function removeExpired() {
    $t=time();
    $resData=[];
    $counter=0;
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      if($ee["expire"] < $t) {
        unlink($this->mediaFolder."/".$ee["fileName"]);
        $counter+=1;
      }
      else { $resData[]=$e; }
    }
    if($counter) {
      $this->data=$resData;
      $this->sumUpBytes();
      file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
    }
  }
  
  function freeSomeRoom($bytes) {
    if($bytes > $this->total) throw new Exception("Cannot remove $bytes from the total {$this->total}");
    $freed=0;
    $d=$this->data;
    while($freed < $bytes) {
      $e=array_shift($d);
      $ee=array_combine($this->keys,$e);
      unlink($this->mediaFolder."/".$ee["fileName"]);
      $freed+=$ee["bytes"];
    }
    $this->data=$d;
    $this->sumUpBytes();
    file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
  }
  
  private function sumUpBytes() {
    $sum=0;
    /*if(empty($this->data)) {
      $this->total=0;
      return 0;
    }*/
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      $sum+=$ee["bytes"];
    }
    $this->total=$sum;
    return $sum;
  }
  
  function getCatalog() { return $this->data; }
  function getTotalBytes() { return $this->total; }
  
  function getCatalogWithoutExpired() { $t=time();
    $resData=[];
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      if($ee["expire"] > $t) { $resData[]=$e; }
    }
    return $resData;
  }
  
  function getLine($id) {
    if(empty($id)) return false;
    //print_r($this->data);
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      //print_r($ee);
      if(self::idFromName($ee["fileName"]) == $id) { return $ee; }
    }
    return false;
  }
  
  static function idFromName($fn) { return explode(".",$fn) [0]; }
  
  function deleteLine($id) {
    if(empty($id)) return false;
    $res=[];
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      if(self::idFromName($ee["fileName"]) != $id) { $res[]=$e; }
    }
    $this->data=$res;
    file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
  }
  
  function getMediaPath() { return $this->mediaFolder."/"; }

}