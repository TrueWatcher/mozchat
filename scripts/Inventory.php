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
  
  static function isStillValid($tp, $since, $catBytes) {
    if(is_null($since) || ! $since) return false;
    if( ! file_exists($tp.self::$myFileName)) return false;
    if(filesize($tp.self::$myFileName) != $catBytes) return false;
    if(filemtime($tp.self::$myFileName) >= $since) return false;
    return 304;
  }
  
  function init($tp,$mfn) {
    // media must be stored in "mediaBLABLA" folder
    $mfn=self::checkMediaFolderName($mfn);
    $mediaFolder=$tp.$mfn;
    if( ! file_exists($mediaFolder)) mkdir($mediaFolder);
    //|| ! is_dir($mediaFolder)) throw new DataException ("Target folder ".$mediaFolder." not found");
    $this->targetPath=$tp;
    $this->mediaFolderName=$mfn;
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
  
  static function checkMediaFolderName($mfn) {
    if( strpos($mfn, "media") !== 0 ) { $mfn="media".$mfn; }
    return $mfn;
  }
  
  private function checkCatalog($scanned) {
    $scannedLength=count($scanned);
    $myLength=count($this->data);
    if($myLength != $scannedLength) { 
      var_dump($scanned);
      throw new DataException("Inventory has $myLength records, the folder has $scannedLength files"); 
    }
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
  
  function makeName($ext,$inc="0") { return time().$inc.".".$ext; }

  function newName($ext) {
    $inc=0;
    $n=$this->makeName($ext,$inc);
    while($this->getLine($n)) {
      $inc+=1;
      $n=$this->makeName($ext,$inc);
    }
    return $n;// only fileName, no path
  }
  
  function pickUploadedBlob($newName,$input,PageRegistry $pr) {
    // overcheck
    if(file_exists($this->mediaFolder."/".$newName)) throw new DataException("File ".$newName." already exists");
    $r=move_uploaded_file($_FILES['blob']['tmp_name'], $this->mediaFolder."/".$newName);
    if( ! $r) throw new DataException("Moving failed");
    $clipBytes=filesize($this->mediaFolder."/".$newName);
    $dt=date("M_d_H:i:s", time()+3600*$pr->g("timeShiftHrs"));
    $expire=time()+$pr->g("lifetimeMediaSec");
    $this->addLine(
      $newName, $input["user"], $dt, $input["mime"], $input["duration"], $clipBytes, $expire, $input["description"]
    );
    //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
    $overdraft=$this->getTotalBytes()-$pr->g("maxMediaFolderBytes");
    if($overdraft > 0) $this->freeSomeRoom($overdraft);
    return $clipBytes;
  }
  
  // user,realm,blob,mime,ext,duration
  function addLine($fileName,$author,$dateTime,$mime,$duration,$bytes,$expire,$description) {
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
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      $sum+=$ee["bytes"];
    }
    $this->total=$sum;
    return $sum;
  }
  
  function getCatalog() { return $this->data; }
  function getTotalBytes() { return $this->total; }
  
  function getCatalogBytes() { return filesize($this->targetPath.self::$myFileName); }
  
  function getLineById($id) {
    if(empty($id)) return false;
    //print_r($this->data);
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      //print_r($ee);
      if(self::idFromName($ee["fileName"]) == $id) { return $ee; }
    }
    return false;
  }
  
  function getLine($fileName) {
    if(empty($fileName)) return false;
    //print_r($this->data);
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      //print_r($ee);
      if($ee["fileName"] == $fileName) { return $ee; }
    }
    return false;
  }
  
  static function idFromName($fn) { return explode(".",$fn) [0]; }
  
  function deleteLine($fileName) {
    if(empty($fileName)) return false;
    $res=[];
    foreach($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      if($ee["fileName"] != $fileName) { $res[]=$e; }
    }
    $this->data=$res;
    file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
  }
  
  function getMediaPath() { return $this->mediaFolder."/"; }
  
  function clear($tp,$mfn) {
    // media must be stored in "mediaBLABLA" folder
    $mfn=self::checkMediaFolderName($mfn);
    $mediaFolder=$tp.$mfn;
    if( ! file_exists($mediaFolder)) return true;
    array_map('unlink', glob($mediaFolder."/*.*"));
  } 

}// end Inventory

function b2kb($bytes) { return ceil($bytes/1000).'kB'; }

abstract class MimeDecoder {
  private static $lookup=["audio/ogg;codecs=opus"=>"oga", "audio/webm;codecs=opus"=>"webm" , "audio/wav"=>"wav", "video/webm;codecs=vp8"=>"webm", "video/webm;codecs=h264"=>"webm"];
  
  static function getLookup() { return self::$lookup; }
  
  static function getDictionary() {
    $a=[];
    $v=[];
    foreach(self::$lookup as $mime=>$ext) {
      if( strpos($mime,"audio") === 0 ) $a[$mime]=$ext;
      if( strpos($mime,"video") === 0 ) $v[$mime]=$ext;
    }
    return [ "audio"=>$a, "video"=>$v ];
  }

  static function ext2mime($ext) { return array_search($ext,self::$lookup); }
  
  static function mime2ext($mime) {
    if(array_key_exists($mime,self::$lookup)) return self::$lookup[$mime];
    return false;
  }
}