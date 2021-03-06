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
use \Exception;

$pathBias="";
$params=getIniParams($pathBias);
requireVendorAutoload($params);
//require dirname(__DIR__) . '/vendor/autoload.php';

class UserManager {
  protected $realms=[];//["videoStream"=>[], "test0"=>[]];
  
  function __construct($params) {
    if ( ! isset($params["realms"]) || ! is_array($params["realms"])) throw new Exception("Wromg PARAMS");
    foreach ($params["realms"] as $r=>$s) {
      $this->realms[$r]=[];
    }
  }
  
  function onClientconnects(ConnectionInterface $conn) {
    echo "New connection! ({$conn->resourceId})\n";
  }
  
  function onDisconnect(ConnectionInterface $conn) {
    $found=$this->removeByConn($conn);
    if ( ! $found) { 
      echo "No record found for connection {$conn->resourceId}\n";
      return;
    }
    list($user,$realm)=$found;
    $remain=count($this->realms[$realm]);
    echo "$user has left, $remain users remain in $realm\n";
    $s=["users"=>$this->presentGroup($realm),"timestamp"=>time(),"alert"=>"$user went off"];
    $this->sendToGroup($realm,$s);
  }
  
  function onOutermessage($from, $dataString, $method) {
    $r=false;
    try {
    $data=$this->decodeHttp($dataString, $method);
    //echo "sata----\n"; var_dump($data);
    
    if ( ! isset($data["act"])) throw new Exception ("Missing ACT");
    $act=$data["act"];
    switch ($act) {
    case "forward":
      if ( ! isset($data["realm"]) || empty($data["realm"]) ) {
        throw new Exception ("Error! An outer message without realm");
      }
      $realm=$data["realm"];
      if ( ! array_key_exists($realm, $this->realms)) {
        throw new Exception ("Error! An outer message with unknown realm=$realm!");
      }
      $group=$this->realms[$realm];
      if (empty($group)) {
        throw new Exception ("There are no clients in $realm");
      }
      $user=false;
      if (isset($data["user"]) && strlen($data["user"]) && $data["user"] != "*") {
        $user=$data["user"];
        $singleConn=$this->findConnectionByName($user,$group);
        if ($singleConn === false) {
          throw new Exception ("There is no client $user in $realm");
        }
      }
      $this->sendHttpReply($from, 'Ok');      
      if ($user && $user != "*") {
        echo "Passing message from cmd to $user@$realm\n";
        $singleConn->send($data["payload"]);
        break;
      }
      echo "Passing message from cmd to ".count($group)." clients of $realm\n";
      $this->sendToEachInGroup($realm, json_decode($data["payload"], true));
      break;

    case "echo":
      $this->sendHttpReply($from, 'Echo reply');
      break;
      
    default:
      throw new Exception ("Unknown ACT=$act");
    }// end switch    
    }
    catch (Exception $e) {
      $em=$e->getMessage();
      echo $em."\n";
      $this->sendHttpReply($from, $em);
    }
  }
  
  private function decodeHttp($string,$method) {
    if ($method == "POST") {
      $bodySeparator="\r\n\r\n";
      $parts=explode($bodySeparator,$string);
      if (count($parts) != 2) throw new Exception("Wrong POST string");
      $string=$parts[1];
    }    
    $pairs=explode("&",$string);
    $keyValues=[];
    foreach ($pairs as $pair) {
      list($k,$v)=explode('=',$pair);
      $keyValues[$k]=urldecode($v);
    }
    return $keyValues;
  }
  
  function onClientmessage(ConnectionInterface $from, $data) {
    try {
    $ret="";
    var_dump($data);
    $data=\json_decode($data,true);
    $credentialsPresent=(isset($data["realm"]) && strlen($data["realm"]) && isset($data["user"]) && strlen($data["user"]));
    if ( ! $credentialsPresent) return;
    $user=$data["user"];
    $realm=$data["realm"];
    if ( ! array_key_exists($realm, $this->realms)) {
      throw new Exception ("Error! Client $user from unknown realm=$realm!");
    }
    if ( ! isset($data["act"])) throw new Exception ("Missing ACT");
    $act=$data["act"];
    
    switch ($act) {
    case "userHello":
      // make sure she's not registered
      while ( ($withSameName=$this->findConnectionByName($user,$this->realms[$realm])) ) {
        $this->removeByConn($withSameName);
        $withSameName->close();
      }
      $this->realms[$realm][]=[ $from->resourceId, $user, time(), $from ];
      $this->sendAlert($from, "Welcome to $realm, $user !");
      $present=count($this->realms[$realm]);
      echo "User $user enlisted to realm $realm, now $present are present\n";
      $s=[
        "users"=>$this->presentGroup($realm), "timestamp"=>time(), "alert"=>"$user logged in"
      ];
      $this->sendToGroup($realm,$s);
      break;

    case "chatMessage":
      if ( ! isset($data["text"])) throw new Exception ("Missing TEXT");
      $text=$data["text"];
      $s=[ "user"=>$user, "to"=>"", "timestamp"=>time(), "text"=>$text ];
      $this->sendToGroup($realm,$s);
      break;
      
    case "relay":
      if ( ! isset($data["target"]) || empty($data["target"]) ) throw new Exception ("Missing TARGET");
      $to=$data["target"];
      if ($to == "*") {
        $ret="Message is broadcast to all active users";
        echo "Broadcasting to all in $realm\n";
        $this->sendToEachInGroup($realm,$data);
        break;
      }
      $targetConn=$this->findConnectionByName($to,$this->realms[$realm]);
      if ( ! $targetConn) {
        $ret="Pecipient $to is offline, try again later";
        echo "No such online user $to@$realm\n";
        break;
      }
      else {
        $ret="Forwarding to $to";
        echo "Relaying message to $to@$realm\n";
        $targetConn->send(json_encode($data));
      }
      break;
      
    case "echo":
      $from->send('{"alert":"echo reply"}');
      break;
      
    default:
      throw new Exception ("Unknown ACT=$act");
    }// end case
    }
    catch (Exception $e) {
      $em=$e->getMessage();
      echo $em."\n";
      $this->sendAlert($from, $em);
      return;
    }
    
    if ($ret) $this->sendAlert($from, $ret);
  }
  
  private function sendAlert(ConnectionInterface $to,$text) {
    $to->send(json_encode(["alert"=>$text]));
  }
  
  private function findConnectionByName($user,$group) {
    foreach ($group as $c) {
      if ($this->getName($c) == $user) return $this->getConnection($c);
    }
    return false;
  }
  
  private function sendHttpReply($to, $string, $status="200 Ok") {
    $headers=[
      "HTTP/1.1 $status", "Content-Length: ".strlen($string), "Content-Type: text/plain", "Connection: Close"
    ];// 
    $r=implode("\r\n",$headers)."\r\n\r\n".$string."\r\n";
    $to->send($r);
    $to->close();
  }
  
  private function getConnection($client) { return $client[3]; }
  private function getName($client) { return $client[1]; }
  
  private function removeByConn(ConnectionInterface $conn) {
    $id=$conn->resourceId;
    $foundGroup=$foundJ=false;
    foreach ($this->realms as $i=>$group) {
      foreach ($group as $j=>$client) {
        if ($id == $client[0]) {
          $user=$this->getName($client);
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
  
  private function sendToEachInGroup($realm, Array $data) {
    if (empty($this->realms[$realm])) return;
    foreach ($this->realms[$realm] as $c) {
      $data["target"]=$this->getName($c);
      $json=json_encode($data);
      $this->getConnection($c)->send($json);
    }
  }

}// end UserManager

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
    //echo "Command connection established with  ".$conn->remoteAddress."\n";
    //var_dump($request);
    //echo $request["uri"]["query"];
    if ($request->getMethod() == "POST") {
      echo "POST detected\n";
      //$conn->close();
      //$conn->send($this->okPage()); 
      return;
    }
    // echo "POST detected\n"; $conn->send($this->okPage()); 
    $query=$request->getUri()->getQuery();
    //echo "query=$query\n";
    $closed=$this->userManager->onOutermessage($conn, $query, "GET");
    //var_dump($conn);    
    //$conn->send($this->formPage());
    if ( ! $closed) {
      $conn->send($this->okPage());
      $conn->close();
    }
  }
  
  public function onMessage(ConnectionInterface $conn, $http) {
    echo "onMessage\n";
    var_dump($http);
    //$data=$this->getData($http);
    //var_dump($data);
    $closed=$this->userManager->onOutermessage($conn, $http, "POST");
    if ( ! $closed) {
      $conn->send($this->okPage());
      $conn->close();
    }
  }

  public function onClose(ConnectionInterface $conn) {
    //echo "Command connection closed\n";
  }
  
  public function onError(ConnectionInterface $conn, \Exception $e) {
    echo "CmdRelay: Error: {$e->getMessage()}\n";
    $conn->close();
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

function requireVendorAutoload($params) {
  if ( ! isset($params["server"]["composerPath"]) ) {
    throw new Exception("Please, give the composerPath (usually, your home dir) in ws.ini");
  }
  $try=$params["server"]["composerPath"].'vendor/autoload.php';
  if ( ! file_exists($try)) {
    throw new Exception("Cannot find $try");
  }
  require_once $try;
}

function getPort($uri) {
  $hostPort=explode("://",$uri)[1];
  $parts=explode(":",$hostPort);
  $port=end($parts); // end(explode()) causes warning in php7
  if ( ! ctype_digit($port)) throw new Exception("Wrong port:$port!");
  return $port;
}

function isSecure($uri) {
  $proto=explode("://",$uri)[0];
  if ($proto === "wss" || $proto == "https") return $proto;
  if ($proto === "ws" || $proto == "http") return false;
  throw new Exception("Wrong uri:".$uri);
}

function getIniParams($pathBias) {
  $params=parse_ini_file($pathBias."ws.ini", true, INI_SCANNER_RAW);
  $params["server"]["commandPort"]=getPort($params["common"]["wsCommandUri"]);
  if (array_key_exists("wsLocalPort",$params["server"]) && $params["server"]["wsLocalPort"]) {
    // wss-to-ws proxying via the webserver: wss:wsServerUri <-> ws://localhost:wsLocalPort
    $params["server"]["wsPort"]=$params["server"]["wsLocalPort"];
    $params["server"]["isWss"]=false;
  }
  else {
    $params["server"]["wsPort"]=getPort($params["common"]["wsServerUri"]);
    $params["server"]["isWss"]=isSecure($params["common"]["wsServerUri"]);
  }
  return $params;
}

function setUpWss(Array $params, \React\Socket\Server $wsSocket, $loop) {
  // WSS: https://github.com/ratchetphp/Ratchet/issues/489
  //
  // If the cert is self-signed, client must first visit https://wsHost:wsPort and create a security exception
  if ( ! isset($params["server"]["wssCert"]) || ! isset($params["server"]["wssKey"]) ) {
    throw new Exception("WSS needs wssCert and wssKey");
  }
  if ( ! file_exists($params["server"]["wssCert"]) ) {
    throw new Exception("Nonexistent wssCert:".$params["server"]["wssCert"]);
  }
  if ( ! file_exists($params["server"]["wssKey"]) ) {
    throw new Exception("Nonexistent wssKey:".$params["server"]["wssKey"]);
  }
  if ( ! is_readable($params["server"]["wssCert"]) || ! is_readable($params["server"]["wssKey"]) ) {
    throw new Exception("Unreadable wssCert or wssKey");
  }
  $wsSocket = new \React\Socket\SecureServer($wsSocket, $loop, [
    'local_cert' => $params["server"]["wssCert"],
    'local_pk' => $params["server"]["wssKey"],
    'allow_self_signed' => true, 'verify_peer' => false
  ] );
  return $wsSocket;
}

//print_r($_SERVER);
if (isset($_SERVER["DOCUMENT_ROOT"]) && $_SERVER["DOCUMENT_ROOT"]) exit("This script cannot be accessed through a server");
$pathBias="";
$params=getIniParams($pathBias);
requireVendorAutoload($params);

$um=new UserManager($params);

$secure="";
if ($params["server"]["isWss"]) $secure="a secure";
echo "Starting $secure Websocket server on {$params["server"]["wsPort"]}...\n";

$loop=\React\EventLoop\Factory::create();
$wsSocket = new \React\Socket\Server('0.0.0.0:'.$params["server"]["wsPort"], $loop);
if ( $params["server"]["isWss"] ) { $wsSocket = setUpWss($params, $wsSocket, $loop); }
$serverWs = new \Ratchet\Server\IoServer(
  new \Ratchet\Http\HttpServer(
    new \Ratchet\WebSocket\WsServer(new ChatRelay($um))
  ),
  $wsSocket
);

echo "Starting Http server on {$params["server"]["commandPort"]}...\n";

$listenMask=$params["server"]["listenForCommands"].':'.$params["server"]["commandPort"];
$httpSocket= new \React\Socket\Server($listenMask, $loop);// 127.0.0.1:8081
$serverCmd = new \Ratchet\Server\IoServer(
  new \Ratchet\Http\HttpServer(new CmdRelay($um)),
  $httpSocket
);

$loop->run();

/*
INSTRUCTION
1)  install composer.phar
2)  use composer to install Ratchet:
       php /opt/lampp/bin/composer.phar require cboden/ratchet
3)  make sure mozchat/wshub/ws.ini is adequate (wsOn=1, wsServerUri='wss:your_domain.com:8080' etc.)
4)  make sure that port 8080 is not blocked
5)  run this script from a terminal:
       php mozchat/wshub/wshub.php
    and leave it open
5a) or run it like a daemon:
       (php mozchat/wshub/wshub.php >/dev/null)&
6)  if your cert is self-signed, client must first visit https://your_domain.com:8080 and create a security exception
7)  profit!!!
*/
