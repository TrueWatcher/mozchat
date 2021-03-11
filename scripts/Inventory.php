<?php

class Inventory {
  const EMPTY="[]";
  private $targetPath="";
  private $mediaFolderName="media";
  private static $myFileName="catalog.json";
  private $mediaFolder="";
  private $data=[];
  private $total;
  private $keys=["fileName","author","dateTime","mime","duration","bytes","expire","description"];
  private $hideExpired=0;
  
  static function getMyFileName() { return self::$myFileName; }
  
  static function isStillValid($tp, $input) {
    $res=304;
    $since=@$input["since"];
    $catBytes=@$input["catBytes"];
    $catCrc=@$input["catCrc"];
    if ( ! $since && ! $catBytes && ! $catCrc) throw new Exception("No any update marks");
    /*if (is_null($since) || ! $since) $res=false;
    else*/ if ( ! file_exists($tp.self::$myFileName)) $res=false;
    //else if (isset($catBytes) && filesize($tp.self::$myFileName) != $catBytes) $res=false;
    else if (isset($catCrc) && (self::getMyFileCrc($tp) != $catCrc) ) {
      $res=false;
      //echo self::getMyFileCrc($tp);
    }  
    //else if (filemtime($tp.self::$myFileName) > $since) $res=false;
    clearstatcache();
    return $res;
  }
  
  static function getMyFileCrc($tp) {
    return hash_file("crc32",$tp.self::$myFileName);
  }
  
  function init($tp,$mfn,$hideExpired=0) {
    // media must be stored in "mediaBLABLA" folder
    if ($hideExpired) $this->hideExpired=$hideExpired;
    $mfn=self::checkMediaFolderName($mfn);
    $mediaFolder=$tp.$mfn;
    if ( ! file_exists($mediaFolder)) mkdir($mediaFolder);
    //|| ! is_dir($mediaFolder)) throw new DataException ("Target folder ".$mediaFolder." not found");
    $this->targetPath=$tp;
    $this->mediaFolderName=$mfn;
    $this->mediaFolder=$mediaFolder;
    $myFile=$tp.self::$myFileName;
    $filesFound=scandir($mediaFolder);
    //var_dump($filesFound); echo "<<<<<";
    if (is_array($filesFound)) { array_shift($filesFound); array_shift($filesFound); }// "." and ".." are always there
    //print_r($filesFound);
    $folderIsEmpty=($filesFound === false || count($filesFound) == 0);
    if ($folderIsEmpty) {
      //echo(" empty folder ");
      if (empty($this->data)) return;// to avoid rewriting and changing modtime
      $this->data=[];
      $this->total=0;
      file_put_contents($myFile,self::EMPTY);
      return;
    }
    if ( ! file_exists($myFile)) { 
      $myFileContent=self::EMPTY;
      file_put_contents($myFile,$myFileContent);
    }
    else { 
      $myFileContent=file_get_contents($myFile);
      if ( ! is_string($myFileContent) || empty($myFileContent)) $myFileContent=self::EMPTY;
    }
    $this->data=json_decode($myFileContent);
    if ( ! is_array($this->data)) throw new DataException("Non-array DATA");
    $this->checkCatalog($filesFound);
    $this->sumUpBytes();
  }
  
  static function checkMediaFolderName($mfn) {
    if ( strpos($mfn, "media") !== 0 ) { $mfn="media".$mfn; }
    return $mfn;
  }
  
  private function checkCatalog($scanned) {
    $scannedLength=count($scanned);
    if ( ! is_array($this->data)) throw new DataException("Non-array DATA");
    $myLength=count($this->data);
    if ($myLength != $scannedLength) { 
      var_dump($scanned);
      throw new DataException("Inventory has $myLength records, the folder has $scannedLength files"); 
    }
    foreach ($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      if ( ! in_array($ee["fileName"],$scanned) ) throw new DataException("Inventory entry {$ee["fileName"]} is missing from the folder");
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
    if ($path!==false && $path!='' && file_exists($path)) {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)) as $object) {
            $bytestotal += $object->getSize();
        }
    }
    return $bytestotal;
  }
  
  function makeName($ext,$inc="0") { return time().$inc.".".$ext; }

  function newName($ext) {
    $inc=0;
    $n=$this->makeName($ext,$inc);
    while ($this->getLine($n)) {
      $inc+=1;
      $n=$this->makeName($ext,$inc);
    }
    return $n;// only fileName, no path
  }
  
  function pickUploadedBlob($newName,$input,PageRegistry $pr) {
    // overcheck
    if ( ! isset($_FILES['blob']) || ! isset($_FILES['blob']['tmp_name'])) throw new DataException("Uploading failed, check POST headers");
    if (file_exists($this->mediaFolder."/".$newName)) throw new DataException("File ".$newName." already exists");
    $r=move_uploaded_file($_FILES['blob']['tmp_name'], $this->mediaFolder."/".$newName);
    if ( ! $r) throw new DataException("Moving failed");
    $clipBytes=filesize($this->mediaFolder."/".$newName);
    $dt=date("M_d_H:i:s", time()+3600*$pr->g("timeShiftHrs"));
    $expire=time()+$pr->g("clipLifetimeSec");
    $this->addLine(
      $newName, $input["user"], $dt, $input["mime"], $input["duration"], $clipBytes, $expire, $input["description"]
    );
    //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
    $this->removeOverdraft($pr->g("maxMediaFolderBytes"));
    return $clipBytes;
  }
  
  // user,realm,blob,mime,ext,duration
  function addLine($fileName,$author,$dateTime,$mime,$duration,$bytes,$expire,$description) {
    if ($duration == 0) $duration="1";
    $e=[$fileName,$author,$dateTime,$mime,$duration,$bytes,$expire,$description];
    $this->data[]=$e;
    $this->total+=$bytes;
    file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
  }
  
  function removeExpired() {
    list($valid,$counter,$expired)=$this->withoutExpired();
    if ( ! $counter) return;
    $this->data=$valid;
    $this->sumUpBytes();
    file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
    foreach ($expired as $e) {
      $ee=array_combine($this->keys,$e);
      unlink($this->mediaFolder."/".$ee["fileName"]);
    }
    return $counter;
  }
  
  function removeOverNumber($maxClipCount) {
    if ($maxClipCount <= 0) return false;
    $actual=count($this->data);
    $delta=$actual-$maxClipCount+1;// +1 for the new file to be added
    if ($delta <= 0) return false;
    $d=$this->data;
    for ($i=0; $i < $delta; $i+=1) {
      $e=array_shift($d);
      $ee=array_combine($this->keys,$e);
      unlink($this->mediaFolder."/".$ee["fileName"]);
    }
    $this->data=$d;
    $this->sumUpBytes();
    file_put_contents($this->targetPath.self::$myFileName, json_encode($this->data));
    return $delta;
  }
  
  private function withoutExpired() {
    $t=time();
    $valid=[];
    $expired=[];
    foreach ($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      if ($ee["expire"] < $t) { $expired[]=$e; }
      else { $valid[]=$e; }
    }  
    return [ $valid, count($expired), $expired ];
  }
  
  private function removeOverdraft($maxMediaFolderBytes) {
    $overdraft=$this->getTotalBytes()-$maxMediaFolderBytes;
    if ($overdraft <= 0) return false;
    //if ($bytes > $this->total) throw new Exception("Cannot remove $bytes from the total {$this->total}");
    $freed=0;
    $d=$this->data;
    while ($freed < $overdraft) {
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
    foreach ($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      $sum+=$ee["bytes"];
    }
    $this->total=$sum;
    return $sum;
  }
  
  function getCatalog() { 
    if ( ! $this->hideExpired) return $this->data;
    $valid=$this->withoutExpired()[0];
    return $valid;
  }
  
  function getTotalBytes() { return $this->total; }
  
  function getCatalogBytes() { return filesize($this->targetPath.self::$myFileName); }
  
  function getLineById($id) {
    if (empty($id)) return false;
    //print_r($this->data);
    foreach ($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      //print_r($ee);
      if(self::idFromName($ee["fileName"]) == $id) { return $ee; }
    }
    return false;
  }
  
  function getLine($fileName) {
    if (empty($fileName)) return false;
    //print_r($this->data);
    foreach ($this->data as $e) {
      $ee=array_combine($this->keys,$e);
      //print_r($ee);
      if ($ee["fileName"] == $fileName) { return $ee; }
    }
    return false;
  }
  
  static function idFromName($fn) { return explode(".",$fn) [0]; }
  
  function deleteLine($fileName) {
    if (empty($fileName)) return false;
    $res=[];
    foreach ($this->data as $e) {
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
    if (file_exists($mediaFolder)) {
      array_map('unlink', glob($mediaFolder."/*.*"));
    }
    $this->data=[];
    file_put_contents($tp.self::$myFileName, json_encode($this->data));
  } 

}// end Inventory

function b2kb($bytes) { return ceil($bytes/1000).'kB'; }

abstract class MimeDecoder {
  private static $lookup=[
   "audio/ogg;codecs=opus"=>["oga",["audioBitsPerSecond"=>24576]],
   "audio/webm;codecs=opus"=>["webm",["audioBitsPerSecond"=>24576]], 
   "audio/wav"=>["wav",[]],
   "video/webm;codecs=vp8"=>["webm",[]],
   "video/webm;codecs=vp9"=>["webm",[]],
   "video/webm;codecs=vp8,opus"=>["webm",[]],
   "video/webm;codecs=vp9,opus"=>["webm",[]],
   "video/webm;codecs=h264"=>["webm",[]],
   "video/mp4"=>["mp4",[]]
 ];
  
  static function getLookup() { return self::$lookup; }
  
  static function getDictionary() {
    $a=[];
    $v=[];
    foreach (self::$lookup as $mime=>$data) {
      if ( strpos($mime,"audio") === 0 ) $a[$mime]=$data;
      if ( strpos($mime,"video") === 0 ) $v[$mime]=$data;
    }
    return [ "audio"=>$a, "video"=>$v ];
  }

  static function ext2mime($ext) { 
    foreach (self::$lookup as $mime=>$data) {
      if ($ext === $data[0]) return $mime;
    }
    return false; 
  }
  
  static function mime2ext($mime) {
    if (array_key_exists($mime,self::$lookup)) return self::$lookup[$mime][0];
    return false;
  }
  
  static function mime2params($mime) {
    if (array_key_exists($mime,self::$lookup)) return self::$lookup[$mime][1];
    return false;
  }
  
  private static $videoPresets=[
    ["auto resolution",'[true,0]'],
    ["640x480@15 0.50", '[{ "width":{"exact":640},  "height":{"exact":480}, "frameRate":15 },  500000]'],
    ["640x480@30 1.0",  '[{ "width":{"exact":640},  "height":{"exact":480}, "frameRate":30 }, 1000000]'],
    ["800x600@30 1.5",  '[{ "width":{"exact":800},  "height":{"exact":600}, "frameRate":30 }, 1500000]'],
    ["960x720@30 2.0",  '[{ "width":{"exact":960},  "height":{"exact":720}, "frameRate":30 }, 2000000]'],
    ["1280x720@30 2.5", '[{ "width":{"exact":1280}, "height":{"exact":720}, "frameRate":30 }, 2500000]'],
    ["ladder",'[{"optional":[{"minWidth":640},{"minWidth":800},{"minWidth":900},{"minWidth":1024},{"minWidth":1280}]},1500000]']
  ];
  
  static function getVideoPresets() {
    return self::$videoPresets;
  }
}
