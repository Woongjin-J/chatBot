<?php
  include 'common.php';

  if (isset($_POST["event"])) {
    $db = get_PDO();
    if (isset($_POST["date"])) {
      if (isset($_POST["time"])) {
        $output = insert_event($db, $_POST["event"], $_POST["date"], $_POST["time"]);
      } else {
        $output = insert_event($db, $_POST["event"], $_POST["date"], '');
      }
    } else {
      $output = insert_event($db, $_POST["event"], '', '');
    }
    if (isset($output)) {
      header("Content-type: application/json");
      echo json_encode($output);
    }
  } else {
    header("HTTP/1.1 400 Invalid Request");
    echo "Error: Please pass a coninent name or random as a parameter.";
  }

  function insert_today($db, $event, $date, $time) {
    if ($date === '') {
      $date = date('y-m-d');
    }
    if ($time === '') {
      $time = date('h:i:sa');
    }
    $sql = "INSERT INTO calEvent (event, date, time) VALUES (:event, :date, :time);";
    try {
      $stmt = $db->prepare($sql);
      $info = array("event" => $event,
                    "date" => $date,
                    "time" => $time);
      $stmt->execute($info);
      return array("success" => "{$event} added to your calendar!");
    }
    catch (PDOException $ex) {
      handle_db_error("A databse error occurred. Please try again later.");
    }
  }
?>