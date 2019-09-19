<?php

class CallLogger {

  const myFileName="calls.csv";
  const SEP=";";
  const NL="\n";
  const fields=["started", "A", "B", "sid", "ticks", "secs" , "state"];
  private $buf="";
  private $fullTarget="";
  private $shouldLogPolls=1;
  
  public function __construct($pathBias="",$realm="rtc") {
    $this->fullTarget=$pathBias.$realm."/".self::myFileName;
    if (class_exists("PageRegistry")) {
      $pr=PageRegistry::getInstance();
      $this->shouldLogPolls = $pr->checkNotEmpty("shouldLogPolls");
    }
  }
  
  public function go($input, $user) {
    if ($input['act'] == "poll") {
      if ($this->shouldLogPolls) $this->logPoll($input, $user);
      return;
    }
    if ( ! isset($input['type']) ) throw new DataException("Missing TYPE (act=".$input['act'].")");
    switch ( $input['type'] ) {
    case "accept":
      $this->logAccept($input);
      break;
    case "hang-up";
      $this->logHangup($input, $user);
      break;
    default:
      throw new DataException( "Wrong TYPE=".$input['type'] );
    }
  }
  
  private function readBuf() {
    $header=implode(self::SEP, self::fields).self::NL;
    if ( ! file_exists($this->fullTarget) ) $this->buf=[$header];
    else {
      $this->buf=file($this->fullTarget);
      if ($this->buf[0] != $header) throw new Exception("Wrong CSV header:".$this->buf[0]);
    }
  }
  
  private function write() {
    file_put_contents($this->fullTarget, implode('',$this->buf));
  }
  
  private function findBySid($sid) {
    if (count($this->buf) == 0) return false;
    if (empty($sid)) return false;
    $sidColumn=array_search("sid", self::fields);
    for( $i=count($this->buf)-1; $i >= 1; $i-=1) {
      if (empty($this->buf[$i]) || $this->buf[$i] == self::NL) continue;
      $line=explode(self::SEP, $this->buf[$i]);
      if ($line[$sidColumn] === $sid) return $i;
    }
    return false;
  }
  
  private function keepLimit() {
    $maxLines=3;
    if (class_exists("PageRegistry")) {
      $pr=PageRegistry::getInstance();
      if ($pr->checkNotEmpty("callLogLimit")) $maxLines=$pr->g("callLogLimit");
    }
    $over=count($this->buf) - $maxLines;
    if ($over <= 0) return false;
    return count(array_splice($this->buf, 1, $over));
  }
  
  public function logAccept($input) {
    $line=[
      "started"=>time(), "A"=>$input['target'], "B"=>$input['name'], "sid"=>$input['sid'], "ticks"=>0, "secs"=>0, "state"=>"new"
    ];
    $this->readBuf();
    $this->buf[]=implode(self::SEP,$line).self::NL;
    $this->keepLimit();
    $this->write();
  }
  
  public function logPoll($input, $user) {
    if ( ! $this->shouldLogPolls) return false;
    
    $doLogPoll=function ($line, $input, $user) {
      if ($line['A'] != $user) return false; // avoid double counting
      if ( ! isset($input['pollFactor']) ) return false;
      if ($line['state'] == "off") return false;
      
      $line['ticks'] += $input['pollFactor'];
      $line['state'] = "on";
      return $line;
    };
    
    $this->processLine($input, $user, $doLogPoll);
  }
  
  public function logHangup($input, $user) {
    $doLogHangup=function ($line, $input, $user) {
      $line['state'] = "off";
      $line['secs'] = time()- $line['started'];
      return $line;
    };
    
    $this->processLine($input, $user, $doLogHangup);
  }
  
  private function processLine($input, $user, $whatToDo) {
    if ( ! isset($input['sid']) || ! $input['sid'] ) return false;
    $this->readBuf();
    $i=$this->findBySid($input['sid']);
    if ($i === false) return false;
    $line=explode(self::SEP, trim($this->buf[$i]));
    if (count($line) != count(self::fields)) throw new DataException("Line ".$i." has ".count($line)." fields, header - ".count(self::fields));
    $line=array_combine(self::fields, $line);
    
    $ret=$whatToDo($line, $input, $user);
    if ( ! is_array($ret)) return $ret;
    
    $line=implode(self::SEP, array_values($ret)).self::NL;
    $this->buf[$i]=$line;
    $this->write();
  }

}
