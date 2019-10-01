<?php
/**
 * Handles AJAX uploads
 */
$pathBias="";
require_once("scripts/AssocArrayWrapper.php");
require_once("scripts/MyExceptions.php");
require_once("scripts/registries.php");
require_once("scripts/Inventory.php");
require_once("scripts/ChatRelay.php");
require_once("scripts/CallLogger.php");
 
// user,realm,blob,mime,ext,duration
//print("Hi, I'm upload.php\n");
//print("max=".ini_get("post_max_size")."!");
//print_r($_POST);
//print(implode(",",array_keys($_REQUEST)));
//print(implode(",",array_keys($_FILES)));

$input=$_REQUEST;
try {
  $resp=[];
  $p=[];
  $rr=""; $rrr="";
  //print_r($input);
  list($act,$user,$realm)=checkInput($pathBias,$input);
  $targetPath=$pathBias.$input["realm"]."/";
  $iniParams=IniParams::read($targetPath);
  $pr=PageRegistry::getInstance( 0, PageRegistry::getDefaultsAjax() );
  //$pr->overrideValuesBy($pageEntryParams["PageRegistry"]);
  $pr->overrideValuesBy($iniParams["common"]);
  $wsParams=parse_ini_file($pathBias."wshub/ws.ini", true, INI_SCANNER_RAW);
  $pr->addFreshPairsFrom($wsParams["common"]);
  $wsOn=$pr->g("wsOn");
  //$pr->dump();  
  if ( ! isset($input["act"])) throw new DataException("Missing ACT");
  $act=$input["act"];
  
  switch ($act) {
  case "uploadBlob":
    checkFields($input);
    checkBlob($_FILES,$pr);
    $inv=new Inventory();
    $inv->init($targetPath,$pr->g("mediaFolder"));
    $inv->removeExpired();
    $inv->removeOverNumber($pr->g("maxClipCount"));
    $n=$inv->newName($input["ext"]);
    $uploadedBytes=$inv->pickUploadedBlob($n,$input,$pr);
    $uploadedBytes=b2kb($uploadedBytes);
    //echo(" estimated_bytes=".$inv->getTotalBytes()." , found=".$inv->getDirectorySize()." ");
    $resp["alert"]='Server got a record of '.$uploadedBytes;
    $resp["alert"] .= MailHelper::go($input, $targetPath, $n, $uploadedBytes, $pr);
    $wsOn && sendCatalogToWs($inv,$pr,"",$realm,"");
    break;
  
  case "reportMimeFault":
    reportMimeFault($pathBias,$input);
    $resp=204;
    break;
  
  case "logError":
    logError($pathBias,$input);
    $resp=204;
    break;
  
  case "clearMedia":
    $inv=new Inventory();
    //$inv->init($targetPath,$pr->g("mediaFolder"));
    $inv->clear($targetPath,$pr->g("mediaFolder"));
    $resp["alert"]="files cleared";
    $wsOn && sendCatalogToWs($inv,$pr,"",$realm,$resp["alert"]);
    break;
    
  case "delete":
    if ( ! isset($input["id"])) throw new DataException("Missing ID");
    $id=$input["id"];    
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
    unlinkById($id,$inv,$input);    
    $inv->deleteLine($id);
    $resp["alert"]="Clip deleted";
    $wsOn && sendCatalogToWs($inv,$pr,"",$realm,$resp["alert"]);    
    break;
    
  case "removeExpired":
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
    $c=$inv->removeExpired();
    if ($c) $resp["alert"]="$c expired clips deleted";
    else $resp["alert"]="No outdated clips found";
    $wsOn && sendCatalogToWs($inv,$pr,"",$realm,$resp["alert"]);
    break;
    
  case "getCatalog":
    if ( ! $wsOn) throw new DataException("Unappropriate command=$act!");
    if (isset($input['sid'])) {
      (new CallLogger($pathBias,$realm))->go($input, $user);
    }
    $cr=new ChatRelay($pathBias,$realm);
    $found=$cr->tryExtract($user);
    if ($found) $rr=packAndSend($user,$realm,"forward",$found,$pr);
    $inv=new Inventory();
    $inv->init( $targetPath, $pr->g("mediaFolder"), $pr->g("hideExpired") );
    $rrr= sendCatalogToWs($inv,$pr,$user,$realm,"Catalog refreshed");
    $resp["alert"]="hub response:".$rr.",".$rrr;
    break;
  
  case "relay":
    if (empty($input)) throw new DataException("Missing command or data");
    if ( ! isset($input["target"])) throw new DataException("Missing TARGET");
    if ($wsOn) {
      $wsResult=packAndSend($input["target"],$realm,"forward",$input,$pr); 
      if ( strpos($wsResult,"Ok") === 0) {
        $resp["alert"]="message forwarded to $user";
        break;
      }
      else { $rr=$wsResult.", message is stored "; }
      // fall-through
    }
    $cr=new ChatRelay($pathBias,$realm);
    $rrr=$cr->put($input);
    $resp["alert"]=$rr.$rrr;
    break;
    
  case "logNrelay":
    if ( ! $wsOn) {
      $cr=new ChatRelay($pathBias,$realm);
      $resp=$cr->put($input);
    }
    $cl=new CallLogger($pathBias,$realm);
    $cl->go($input, $user);
    break;
  
  default:
    throw new DataException("Unknown command=$act!");
  }
  
} catch (DataException $de) {
  $resp["error"]=$de->getMessage();
}
if ($resp === 204) {
  header("HTTP/1.0 204 No Content");
  exit();
}
if ($resp === 304) {
  header("HTTP/1.0 304 Not Modified");
  exit();
}
header('Content-type: text/plain; charset=utf-8');//application/json
print(json_encode($resp));
exit();

function checkExt($ext) { return MimeDecoder::ext2mime($ext); }

function sendCatalogToWs(Inventory $inv, PageRegistry $pr,$user,$realm,$alert) {
  $p=[];
  $p["list"]=$inv->getCatalog();
  $p["timestamp"]=time();
  $p["free"]=$pr->g("maxMediaFolderBytes") - $inv->getTotalBytes();
  if ($alert) $p["alert"]=$alert;
  return packAndSend($user,$realm,"forward",$p,$pr);  
}

function packAndSend($user, $realm, $command, Array $payload, PageRegistry $pr) {
  $a=[];
  $a["user"]=$user;
  $a["realm"]=$realm;
  $a["act"]=$command;
  $a["payload"]=json_encode($payload);
  return sendWithGet($a, $pr->g("wsCommandUri"));
  // with sendWithPost connection hangs after hub's onOpen
  // hub's onMessage is not fired as IoServer does not trigger extra onMessage
}

function sendWithGet(Array $data, $wsCommandUri) {
  $opts=[
    'http'=>[
      'method'=>"GET",
      'header'=>"Content-type: text/plain\r\n".
                "User-Agent: SuperAgent/1.0",
    ]
  ];
  $context = stream_context_create($opts);
  $resp = file_get_contents($wsCommandUri.'?'.http_build_query($data), false, $context);
  return $resp;
}

function sendWithPost(Array $data) {
  $c=http_build_query($data);
  $opts=[
    'http'=>[
      //'protocol_version'=>1.1,
      'method'=>"POST",
      'header'=>implode("\r\n",[
         "Accept: */*'", "Content-type: application/x-www-form-urlencoded",                 "Host: localhost:8081", "User-Agent: SuperAgent 1.0", 
         "Content-lenght: ".strlen($c), "Connection: close" 
       ])."\r\n\r\n",
      'content'=>$c."\r\n"
    ]
  ];
  $context = stream_context_create($opts);
  $resp = file_get_contents('http://localhost:8081', false, $context);
  return $resp;
}

function _sendWithPost(Array $data) {
  $c=http_build_query($data);
  $sUrl='http://localhost:8081';
  $params = array('http' => array(
      'method' => 'POST',
      'header'=>"Content-type: application/x-www-form-urlencoded\r\n".
                "Host: localhost:8081\r\n".
                "User-Agent: SuperAgent/1.0\r\n".
                "Connection: close",
      'content' => $c
  ));
  $ctx = stream_context_create($params);
  $fp = @fopen($sUrl, 'rb', false, $ctx);
  if (!$fp)  throw new Exception("Problem with $sUrl, $php_errormsg");

  $response = @stream_get_contents($fp);
  if ($response === false) throw new Exception("Problem reading data from $sUrl, $php_errormsg");
  return $response;
}
  
function checkFields($input) {
  $r=true;
  if ( isset($input["description"]) ) $input["description"]=htmlspecialchars($input["description"]);
  if ( ! isset($input["mime"]) || ! isset($input["ext"]) ) $r="Missing MIME or EXT";
  else if ( ! checkExt($input["ext"])) $r="Unknown EXT=".$input["ext"]."!";
  else if ( isset($input["description"]) && strlen($input["description"]) > 200 ) {
    $input["description"]=substr($input["description"],0,100);
  }
  if ($r !== true) throw new DataException($r);
}

function checkBlob($files,$pr) {
  $r=true;
  if ( ! isset($files["blob"])) $r="Missing the file";
  else if ( $files["blob"]["size"] > $pr->g("maxBlobBytes") ) $r="File is bigger than ".b2kb($pr->g("maxBlobBytes"));
  if ($r !== true) throw new DataException($r);
}

function checkInput($pathBias,& $input) {
  $r=true;
  consumeJson($input);
  if ( ! isset($input["user"]) || ! isset($input["realm"]) ) { $r="Missing USER or REALM"; }
  else if ( charsInString($input["user"],"<>&\"':;()") ) { $r="Forbidden symbols in username"; }
  else if ( strlen($input["user"]) > 30 ) { $r="Too long username"; }
  else if ( ! realmIsOk($pathBias,$input)) {
    $r="Thread folder not found:".$pathBias.$input["realm"];
  }
  if ($r !== true) throw new DataException($r);
  $act="relay";
  if (array_key_exists("act",$input)) { $act=$input["act"]; }
  return [$act, $input["user"], $input["realm"]];
}

function consumeJson(& $input) {  
  if ( ! array_key_exists("json",$input)) return;
  $fromJson=[];
  if ( strpos($input["json"],"%3A") !== false ) { $input["json"]=urldecode($input["json"]); }
  $input["json"]=str_replace("\n", "\\n", $input["json"]);
  $fromJson=json_decode($input["json"], true);
  if (! is_array($fromJson)) {
    echo $input["json"]; echo ">>"; var_dump($fromJson);
    throw new DataException("JSON perse error");
  }
  $input=array_merge($input,$fromJson);
  unset($input["json"]);
}

function charsInString($object,$charsString) {
  if ( empty($object) ) return false;
  if (strtok($object,$charsString) !== $object) return true;
  return false;
}

function realmIsOk($pathBias,$input) {
  return isset($input["realm"]) && file_exists($pathBias.$input["realm"]) && is_dir($pathBias.$input["realm"]);
}

function reportMimeFault($pathBias,$input) {
  $rec="";
  $rec.="Mime fault:".$input["mimesList"]."\n";
  addToErrorLog($pathBias,$rec,$input); 
}

function logError($pathBias,$input) {
  $rec="";
  $errorFormat="%s in %s, line:%s\n%s\n";
  $rec.=sprintf($errorFormat, $input["errorMsg"], $input["url"], $input["lineNumber"], $input["errorObj"])."\n";
  addToErrorLog($pathBias,$rec,$input);
}

function addToErrorLog($pathBias,$rec,$input) {
  $limitB=30000;
  $logFile=$pathBias."error.log";
  $sep="-----\n";
  $header="[".date(DATE_ATOM)."] ".$input["user"]."@".$input["realm"]." ".$_SERVER["REMOTE_ADDR"]."\n";
  $header.=$_SERVER["HTTP_USER_AGENT"]."\n";
  $rec=$header.$rec.$sep;
  $size=strlen($rec);
  if ($size > $limitB) throw new DataException("Too long message");
  if (file_exists($logFile)) $size+=filesize($logFile);
  $exceed=$size-$limitB;
  if ($exceed <= 0) file_put_contents($logFile,$rec,FILE_APPEND);
  else {
    $buf=file_get_contents($logFile);
    $sepPos=strpos($buf,$sep,$exceed);
    if ($sepPos !== false) $buf=substr($buf,$sepPos+strlen($sep));
    else $buf="";
    file_put_contents($logFile,$buf.$rec);
  }
}

function unlinkById($id,Inventory $inv,$input) {
  $l=$inv->getLine($id);
  if ( ! $l) throw new DataException("No data about this file");
  if ($l["author"] != $input["user"]) throw new DataException("You are not permitted");
  $target=$inv->getMediaPath().$l["fileName"];
  if ( ! file_exists($target)) throw new DataException("No such file $target");
  unlink($target);
}

abstract class MailHelper {

  public static function go($input, $targetPath, $n, $uploadedBytes,  PageRegistry $pr) {
    if ( ! self::check($targetPath,$pr) ) return "";
    $counter=self::notifyUsers($input, $targetPath, $n, $uploadedBytes,  $pr);
    if ( ! $counter) return ", notifications failed";
    return ", $counter notifications sent";
  }
  
  private static function check($targetPath, PageRegistry $pr) {
    return (! $pr->g("allowStream")) && $pr->g("notifyUsers") && file_exists($targetPath."notify.ini");
  }
  
  private static function baseUri($server) {
    $url = 'http://';
    if ( (array_key_exists("HTTPS",$server)) && $server['HTTPS'] ) $url = 'https://';
    $url .= $server['HTTP_HOST'];
    $dir=dirname($server['PHP_SELF']);
    //echo(" url=$url, dir=$dir, ");
    if ( ! empty($dir) && $dir !== "/") $url.=$dir;
    $url.="/";
    return $uri;
  }

  private static function notifyUsers($input, $targetPath, $n, $uploadedBytes,  PageRegistry $pr) {
    $title="";
    if ($input["description"]) $title=" \"".$input["description"]."\" ";
    $valid=date("M_d_H:i:s",time()+3600*$pr->g("timeShiftHrs")+$pr->g("clipLifetimeSec"));
    $uri=self::baseUri($_SERVER);
    $enterLink=$url;
    if ($targetPath) $directLink=$url.$targetPath;
    $directLink.=Inventory::checkMediaFolderName($pr->g("mediaFolder"))."/";
    $directLink.=$n;  
    $noteMain="{$input["realm"]} has received a message from {$input["user"]} $title of {$input["duration"]}s/$uploadedBytes, valid until $valid";
    $noteMain.="\n".'<a href="'.$directLink.'">direct link</a>, <a href="'.$enterLink.'">thread</a>';
    $recipients=parse_ini_file($targetPath."notify.ini",true);
    //var_dump($recipients);
    $counter=0;
    foreach($recipients as $rName=>$rAddr) {
      $welcome="Dear $rName,\n";
      $sent=self::sendEmail($rAddr,$welcome.$noteMain,$pr);
      if ($sent === true) $counter+=1;
    }
    return $counter;
  }
  
  private static function sendEmail($recAddr,$msgBody,PageRegistry $pr) {
    $defaultSender="me@example.com";
    $headers=[];
    $defaultHeaders=[
      "Content-Type: text/plain; charset=utf-8;"/*, 
      "Content-transfer-encoding: quoted-printable;"*/
    ];
    $subj="New message in media chat";
    
    if (empty($recAddr) || false === strpos($recAddr,"@") || false===strpos($recAddr,".")) {
      return ([ $subj.$msgBody,"Invalid recipient" ]);
      //throw new UsageException("Invalid recipient address:$recAddr!");
    }    
    if ( $pr->checkNotEmpty("mailFrom") ) { $from="From: ".$pr->g("mailFrom"); }
    else { $from="From: ".$defaultSender; }
    $headers[]=$from;  
    if ( $pr->checkNotEmpty("mailReplyTo") ) { 
      $replyto="Reply-To: ".$pr->g("mailReplyTo");
      $headers[]=$replyto;
    }
    else { $replyto=""; }  
    $headers=$headers+$defaultHeaders;
    //var_dump($headers);
        
    $ret=mail($recAddr,$subj,$msgBody,implode("\r\n", $headers));
    return $ret;
  }
}

?>
