<?php
  include 'common.php';

  $db = get_PDO();
  if (isset($_POST["event"])) {
    if (isset($_POST["date"])) {
      if (isset($_POST["time"])) {
        $output = delete_event($db, $_POST["event"], $_POST["date"], $_POST["time"]);
      } else {
        $output = delete_event($db, $_POST["event"], $_POST["date"], '');
      }
    } else {
      $output = delete_event($db, $_POST["event"], '', '');
    }
    if (isset($output)) {
      header("Content-type: application/json");
      echo json_encode($output);
    }
  } else {
    header("HTTP/1.1 400 Invalid Request");
    echo "Error: Please pass a coninent name or random as a parameter.";
  }

  function delete_event($db, $event, $date, $time) {
    if ($date === '') {
      $date = date('y-m-d');
    }
    if ($time === '') {
      $time = date('h:i:sa');
    }
    $sql = "DELETE FROM calEvent WHERE event = :evet AND date = :date AND time = :time";
    try {
      $stmt = $db->prepare($sql);
      $info = array("event" => $event,
                    "date" => $date,
                    "time" => $time);
      $stmt->execute($info);
    }
    catch (PDOException $ex) {
      handle_db_error("A database error occurred. Please try again later.");
    }
    return array("success" => "{$even} removed from your calendar!");
  }
?>