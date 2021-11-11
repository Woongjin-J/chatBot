<?php
  include 'common.php';

  // Check that the $db is set.Then check $output is set and return the list of
  // calendar event. (JSON)
  if (isset($date)) {
    $db = get_PDO();
    if (isset($time)) {
      $output = find_event_time($db, $date, $time);
    } else {
      $output = find_event_date($db, $date);
    }
    if (isset($output)) {
      header("Content-type: application/json");
      echo json_encode($output);
    }
  } else {
    header("HTTP/1.1 400 Invalid Request");
    echo "Error: Please pass a coninent name or random as a parameter.";
  }

  function find_event_date($db, $date) {
    $sql = "SELECT event FROM eventCal WHERE date = :date";
    try {
      $stmt = $db->prepare($sql);
      $info = array("date" => strtolower($date));
      $stmt->execute($info);
    }
    catch (PDOException $ex) {
      handle_db_error("A databse error occurred. Please try again later.");
    }
    return $stmt->fetch();
  }

  function find_event_time($db, $date, $time) {
    $sql = "SELECT event FROM eventCal WHERE date = :date AND time = :time";
    try {
      $stmt = $db->prepare($sql);
      $info = array("date" => strtolower($date),
                    "time" => strtolower($time));
      $stmt->execute($info);
    }
    catch (PDOException $ex) {
      handle_db_error("A databse error occurred. Please try again later.");
    }
    return $stmt->fetch();
  }
?>