<?php
namespace MyApp;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\Http\HttpServerInterface;
use Ratchet\ConnectionInterface;
use React\EventLoop\Factory;
use React\Socket\Server;
//use React\Socket\ConnectionInterface;

//require dirname(__DIR__) . '/vendor/autoload.php';
$composerVendorPath="/home/alexander/";
require $composerVendorPath.'vendor/autoload.php';
//require 'Chat.php';

class UserManager {
  protected $clients;
  protected $realms=["videoStream"=>[]];
  
  public function __construct() {
    $this->clients = new \SplObjectStorage;
  }
  
  function onClientconnects(ConnectionInterface $conn) {
    $this->clients->attach($conn);
    echo "New connection! ({$conn->resourceId})\n";
  }
  
  function onUsershowsup(Array $userData) {
    var_dump($userData);
  }
  
  function onDisconnect(ConnectionInterface $conn) {
    $this->clients->detach($conn);
    //echo "Connection {$conn->resourceId} has disconnected\n";
    $found=$this->removeByConn($conn);
    if ( ! $found) { 
      echo "Error! No record found for connection {$conn->resourceId}\n";
      return;
    }
    list($user,$realm)=$found;
    $remain=count($this->realms[$realm]);
    echo "$user has left, $remain users remain in $realm\n";
    $s=["users"=>$this->presentGroup($realm),"timestamp"=>time(),"alert"=>"$user went off"];
    $this->sendToGroup($realm,$s);
  }
  
  function onOutermessage($from, $query) {
    $pairs=explode("&",$query);
    $keyValues=[];
    foreach ($pairs as $pair) {
      list($k,$v)=explode('=',$pair);
      $keyValues[$k]=urldecode($v);
    }
    $data=$keyValues;
    //echo "sata----\n"; var_dump($data);
    if ( ! isset($data["realm"]) || empty($data["realm"]) ) {
      echo "Error! An outer message without realm\n";
      return;
    }
    $realm=$data["realm"];
    if ( ! array_key_exists($realm, $this->realms)) {
      echo "Error! An outer message with unknown realm=$realm!\n";
      return;
    }
    $group=$this->realms[$realm];
    if (empty($group)) {
       echo "Cannot pass message as there are no clients in $realm\n";
       return;
    }
    $user=false;
    if (isset($data["user"]) && strlen($data["user"])) {
      $user=$data["user"];
      $singleConn=$this->findConnectionByName($user,$group);
      if ($singleConn === false) {
        echo "Cannot pass message as there is no client $user in $realm\n";
        return; 
      }
    }
    if ($user) {
      echo "Passing message to $user in $realm\n";
      $singleConn->send($data["payload"]);
      return;
    }
    echo "Passing message to ".count($group)." clients of $realm\n";
    foreach ($group as $client) {
      $conn=$this->getConnection($client);
      $conn->send($data["payload"]);
    }
  }
  
  function onClientmessage(ConnectionInterface $from, $data) {
    var_dump($data);
    $data=\json_decode($data,true);
    $credentialsPresent=(isset($data["realm"]) && strlen($data["realm"]) && isset($data["user"]) && strlen($data["user"]));
    if ( ! $credentialsPresent) return;
    $user=$data["user"];
    $realm=$data["realm"];
    if ( ! array_key_exists($realm, $this->realms)) {
      echo "Error! Client $user from unknown realm=$realm!\n";
      $this->sendAlert($from, "Unknown realm=$realm");
      return;
    }
    while ($this->removeByConn($from));// make sure she's not registered
    $this->realms[$realm][]=[ $from->resourceId, $user, time(), $from ];
    $this->sendAlert($from, "Welcome to $realm, $user !");
    $present=count($this->realms[$realm]);
    echo "User $user enlisted to realm $realm, now $present are present\n";
    $s=["users"=>$this->presentGroup($realm),"timestamp"=>time(),"alert"=>"$user logged in"];
    $this->sendToGroup($realm,$s);
  }
  
  private function sendAlert(ConnectionInterface $to,$text) {
    $to->send(json_encode(["alert"=>$text]));
  }
  
  private function findConnectionByName($user,$group) {
    foreach ($group as $c) {
      if ($c[1] == $user) return $c[3];
    }
    return false;
  }
  
  private function getConnection($client) { return $client[3]; }
  
  private function removeByConn(ConnectionInterface $conn) {
    $id=$conn->resourceId;
    $foundGroup=$foundJ=false;
    foreach ($this->realms as $i=>$group) {
      foreach ($group as $j=>$client) {
        if ($id == $client[0]) {
          $user=$client[1];
          $foundJ=$j;
          break;
        }
      }
      if ($foundJ !== false) { 
        $foundGroup=$i;
        break; 
      }
    }
    if ($foundJ === false) { return false; }
    array_splice($this->realms[$foundGroup],$foundJ,1);
    return [ $user, $foundGroup ];
  }
  
  private function presentGroup($realm) {
    $users=[];
    if (empty($this->realms[$realm])) return "";
    foreach ($this->realms[$realm] as $c) { $users[]=$c[1]; }
    sort($users);
    return implode(", ",$users);
  }
  
  private function sendToGroup($realm, Array $data) {
    if (empty($this->realms[$realm])) return;
    $json=json_encode($data);
    foreach ($this->realms[$realm] as $c) { $this->getConnection($c)->send($json); }
  }

}

class ChatRelay implements MessageComponentInterface {
  private $userManager;
  
  public function __construct(UserManager $um) {
    $this->userManager = $um;
  }
  
  public function onOpen(ConnectionInterface $conn) { 
    $this->userManager->onClientconnects($conn);
  }
  
  public function onMessage(ConnectionInterface $from, $msg) {
    $this->userManager->onClientmessage($from, $msg);
  }

  public function onClose(ConnectionInterface $conn) {
    $this->userManager->onDisconnect($conn);
  }
  
  public function onError(ConnectionInterface $conn, \Exception $e) {
    echo "An error has occurred: {$e->getMessage()}\n";
    $conn->close();
  }
}

class CmdRelay implements HttpServerInterface {
  private $userManager;
  
  public function __construct(UserManager $um) {
    $this->userManager = $um;
  }
  
  public function onOpen(ConnectionInterface $conn, \Psr\Http\Message\RequestInterface $request = null ) { 
    echo "Command connection established with  ".$conn->remoteAddress."\n";
    //var_dump($request);
    //echo $request["uri"]["query"];
    $query=$request->getUri()->getQuery();
    //echo "query=$query\n";
    $this->userManager->onOutermessage($conn, $query);
    //var_dump($conn);    
    //$conn->send($this->formPage());
    $conn->send($this->okPage());
    $conn->close();
  }
  
  public function onMessage(ConnectionInterface $from, $http) {
    echo "onMessage\n";
    //var_dump($http);
    //$data=$this->getData($http);
    //var_dump($data);
    $this->userManager->onOutermessage($from, $this->getData($http));
    $from->send($this->okPage());
    $from->close();
  }

  public function onClose(ConnectionInterface $conn) {
    echo "Command connection closed\n";
  }
  
  public function onError(ConnectionInterface $conn, \Exception $e) {
    echo "An error has occurred: {$e->getMessage()}\n";
    $conn->close();
  }
  
  private function getData($all) {
    $bodySeparator="\r\n\r\n";
    $bsPosition=strpos($all,$bodySeparator);
    $body=substr($all,$bsPosition+strlen($bodySeparator));
    //echo $body."\n\n";
    $pairs=explode('&',$body);
    $keyValues=[];
    foreach ($pairs as $pair) {
      list($k,$v)=explode('=',$pair);
      $keyValues[$k]=urldecode($v);
    }
    //print_r($keyValues);
    return $keyValues;
  }
  
  private function okPage() {
    $form="ok!";
    $form.="\r\n";
    $headers=[
      "HTTP/1.1 200 Ok", "Content-Length: ".strlen($form), "Content-Type: text/plain"
    ];//"Connection: Close" 
    $headers=implode("\r\n",$headers)."\r\n\r\n";
    return $headers.$form;
  }
}

$um=new UserManager();

echo "Starting Websocket server on 8080...\n";

$loop=\React\EventLoop\Factory::create();
$wsSocket = new \React\Socket\Server('0.0.0.0:8080', $loop);
$serverWs = new \Ratchet\Server\IoServer(
  new \Ratchet\Http\HttpServer(
    new \Ratchet\WebSocket\WsServer(new ChatRelay($um))
  ),
  $wsSocket
);

echo "Starting Http server on 8081...\n";

$httpSocket= new \React\Socket\Server('0.0.0.0:8081', $loop);
$serverCmd = new \Ratchet\Server\IoServer(
  new \Ratchet\Http\HttpServer(new CmdRelay($um)),
  $httpSocket
);

$loop->run();