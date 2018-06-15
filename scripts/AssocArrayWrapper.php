<?php
/**
 * @package LTforum
 * @version 1.4 blocked reading by nonexistent key even in loose mode SingletAssocArrayWrapper
 */

  class AssocArrayWrapper {
    protected $arr;
    protected $strict;

    public function s($key,$value) {
      if ( !array_key_exists($key,$this->arr) ) {
        if (strict) throw new UsageException ("Assignment by non-existent key ".$key.". Use forceSet if you really mean it" );
      }
      $this->arr[$key]=$value;
    }

    public function forceSet($key,$value) {
      $this->arr[$key]=$value;
    }

    public function g(string $key) {
      if ( !array_key_exists($key,$this->arr) ) {
        if (!strict) return ("");
        else throw new UsageException ("Reading by non-existent key ".$key);
      }
      return( $this->arr[$key] );
    }

    public function r($key) {
      if ( array_key_exists($key,$this->arr) ) unset ($this->arr[$key]);
    }

    public function __construct( $stric=true,$ar=array() ) {
      if ( isset($stric) ) $this->strict=$strict;
      if ( isset($ar) ) $this->arr=$arr;
    }
  }

  abstract class SetGet {
    abstract function s($key,$value);
    abstract function g($key);
  }

  class SingletAssocArrayWrapper extends SetGet {
    protected $arr;
    protected $strict;
    //protected static $me=null;// this should be in child classes

    public static function getInstance($stric=1,$ar=array()) {
      $sc=get_called_class();
      if ( empty( $sc::$me ) ) {
        //echo("Attaching instance to its \"$sc\" class\r\n");
        $sc::$me = new $sc($stric,$ar);
        // just =new singletAssocArrayWrapper($strict,$arr); is not good for childs
      }
      return $sc::$me;
    }

    public function s($key,$value) {
      if ( $this->strict==2 ) throw new UsageException ("Attempt to set value by key ".$key." while this instance was constucted in READONLY mode" );
      if ( !array_key_exists($key,$this->arr) ) {
        if ( $this->strict==1 ) throw new UsageException ("Assignment by non-existent key ".$key." while this instance was constucted in STRICT mode" );
      }
      $this->arr[$key]=$value;
    }

    /*public function forceSet($key,$value) {
      $this->arr[$key]=$value;
    }*/

    public function g($key) {
      if ( ! array_key_exists($key,$this->arr) ) {
        /*if (!$this->strict) return ("");
        else */throw new Exception ("Reading by non-existent key ".$key);
      }
      return( $this->arr[$key] );
    }
    
    public function checkNotEmpty($key) {
      if ( !array_key_exists($key,$this->arr) ) {
        return false;
      }
      return( ! empty($this->arr[$key]) );
    }

    public function r($key) {
      if ( $this->strict==2 ) throw new UsageException ("Attempt to remove element by key ".$key." while this instance was constucted in READONLY mode" );
      if ( array_key_exists($key,$this->arr) ) unset ($this->arr[$key]);
    }

    private function __construct( $stric=true,$ar=array() ) {
      if ( isset($stric) ) $this->strict=$stric;
      if ( isset($ar) ) $this->arr=$ar;
    }

    public function dump() {// DEBUG
      print_r($this->arr);
    }

    public function export() {
      return ($this->arr);
    }
    
    /**
     * Resets the object, so that it can be re-initialized.
     */
    public static function clearInstance() {
      $sc=get_called_class();
      $sc::$me=null;
    }
    
    public function overrideValuesBy(Array $guest) {
      if (empty($guest)) return;
      if ($this->strict==2) throw new UsageException ("Cannot override values as the object was created in readonly mode");
      $myKeys=array_keys($this->arr);
      $guestKeys=array_keys($guest);
      foreach ($guestKeys as $key) {
        if (in_array($key,$myKeys)) {
          $this->arr[$key]=$guest[$key];
        }
        else throw new UsageException ("Key ".$key." was not found in the host array");
      }
    }
    
    public function addFreshPairsFrom(Array $guest) {
      if (empty($guest)) return;
      if ($this->strict>0) throw new UsageException ("Cannot add pairs as the object was created in stict or readonly mode");
      $myKeys=array_keys($this->arr);
      $guestKeys=array_keys($guest);
      foreach ($guestKeys as $key) {
        if ( ! in_array($key,$myKeys)) {
          $this->arr[$key]=$guest[$key];
        }
        else throw new UsageException ("Key ".$key." is already present in the host array");
      }    
    }
    
  }// end SingletAssocArrayWrapper

?>