<?php

class UsersMonitor {
  private static $myFileName="users.json";
  private $myFileFull="";
  private $data=[];
  private $targetPath="";
  private static $statusFadeS=5;
  private static $fileFadeS=2;
  
  static function getMyFileName() { return self::$myFileName; }
  
  static function isStillValid($tp, $since, PageRegistry $pr) {
    if (is_null($since) || ! $since) return false;
    if ( ! file_exists($tp.self::$myFileName)) return false;
    self::$fileFadeS=self::fileFadeS($pr);
    if ( time()-$since <  self::$fileFadeS ) return 304;
    return false;
  }
  
  static function fileFadeS($pr) { return $pr->g("userStatusFadeS")-1; }
  
  function markOnlineAndReport($tp,$input,PageRegistry $pr) {
    $this->read($tp);
    $this->removeExpired();
    self::$statusFadeS=$pr->g("userStatusFadeS");
    $validFor=1+self::$statusFadeS;
    if (isset($input["pollFactor"]) && $input["pollFactor"]) {
      $aPollFactor=$input["pollFactor"];
      if ($aPollFactor > self::$statusFadeS*10) $validFor=1+ceil($aPollFactor/10);
    }  
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
    if ( ! file_exists($this->myFileFull)) {
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
      if ($expire > $t) { $res[$u]=$expire; }
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
