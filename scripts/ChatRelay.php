<?php

class ChatRelay {
  const myFileName="messages.json";
  private $fullTarget="";
  //private $buf=[];
  private $validityS=1000;
  private $edgeId=0;
  
  public function __construct($pathBias="",$realm="rtc") {
    $this->fullTarget=$pathBias.$realm."/".self::myFileName;
    if (class_exists("PageRegistry")) { 
      $pr=PageRegistry::getInstance();
      if ($pr->checkNotEmpty("messageTTLS")) $this->validityS = $pr->g("messageTTLS");
    }
  }

  public function put(Array $msg) {
    $note=[];
    $buf=$this->readBuffer();
    $n=count($buf);
    $buf=$this->removeExpired($buf);
    $n.="/".count($buf);
    $msg=$this->addMarks($msg);
    $buf[]=$msg;
    $n.="/".count($buf);
    $this->writeBuffer($buf);
    $note["alert"]=$n;
    return $note;
  }
  
  private function addMarks(Array $msg) {
    $r=$msg;
    $t=time();
    $r["received"]="".$t;
    $limit=$t+$this->validityS;
    $r["notAfter"]="".$limit;
    //$id=substr("".$t, -4, 4).end(explode('.',$_SERVER["REMOTE_ADDR"]));
    $r["msid"]=$this->edgeId+1;
    return $r;
  }
  
  public function tryExtract($user) {
    $allowSendPack=10;
    $broadcast="*";
    $buf=$this->readBuffer();
    $myMessages=[];
    $prevMsid=0;
    $found=0;
    foreach($buf as $msg) {
      if ( ! array_key_exists("msid",$msg)) throw new Exception("Missing MSID");
      if ($msg["msid"] <= $prevMsid) throw new Exception("Wrong MSID sequence: ".$prevMsid."/".$msg["msid"]);
      if ( @$msg["target"] == $broadcast || @$msg["target"] == $user ) {
        $found+=1;
        if ($found === 1 || $allowSendPack) $myMessages[]=$msg;
      }
    }
    if ( ! $found) return [];
    if ($allowSendPack && $found > 1) {
      $f=["pack"=>$myMessages];
      foreach($myMessages as $m) { $buf=$this->removeMsg($buf,$m); };
    }  
    else {
      $f=$myMessages[0];
      $buf=$this->removeMsg($buf,$f);
    }
    $buf=$this->removeExpired($buf);
    $this->writeBuffer($buf);
    return $f;
  }
  
  public function clearAuthor($user) {
    $buf=$this->readBuffer();
    $before=count($buf);
    if ( ! $before) { return ""; }
    $buf=$this->removeByAuthor($buf, $user);
    $this->writeBuffer($buf);
    $after=count($buf);
    return "$before/$after";
  }
  
  private function removeMsg(Array $buf, Array $msg) {
    $res=[];
    $id=$msg["msid"];
    $found=false;
    foreach ($buf as $m) {
      if ($m["msid"] != $id) { $res[]=$m; }
      else {
        if ($found) throw new Exception("Duplicate ID:$id");
        $found=true;
      }
    }
    if ( ! $found) throw new Exception("Unknown ID:$id");
    return $res;
  }
  
  private function removeByAuthor(Array $buf, $who) {
    $res=[];
    $found=0;
    foreach ($buf as $m) {
      if (@$m["user"] === $who || @$m["name"] === $who) { $found+=1; }
      else { $res[]=$m; }
    }
    return $res;
  }
  
  private function removeExpired(Array $buf) {
    $res=[];
    $t=time();
    
    foreach($buf as $msg) {
      if ( ! array_key_exists("notAfter",$msg)) throw new DataException("Found a message without NOTAFTER mark");
      if ( intval($msg["notAfter"]) > $t) $res[]=$msg;
    }
    return $res;
  }
  
  private function readBuffer() {
    $empty=[];
    if ( ! file_exists($this->fullTarget)) {
      file_put_contents($this->fullTarget, json_encode($empty));
      $this->edgeId=0;
      return $empty;
    }
    $buf=file_get_contents($this->fullTarget);
    $buf=json_decode($buf, true);
    if ( ! is_array($buf)) throw new Exception("Wrong file format");
    if ( ! empty($buf)) {
      if ( ! array_key_exists("msid", end($buf)) ) throw new Exception("No MSID in last message");
      $this->edgeId = end($buf)["msid"];
    }
    return $buf;
  }
  
  private function writeBuffer(Array $messages) {
    $buf=json_encode($messages);
    file_put_contents($this->fullTarget, $buf);  
  }
  
} 
