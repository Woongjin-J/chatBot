<?php
  include 'common.php';

  if (isset($_GET['date'])) {
    $db = get_PDO();

    // if (isset($_GET['time'])) {
    //   $output = find_event_time($db, $_GET['date'], $_GET['time']);
    // } else {
      $output = find_event_date($db, $_GET['date']);
    // }
    echo json_encode("success");
    if (isset($output)) {
      header("Content-type: application/json");
      echo json_encode($output);
    }
  } else {
    header("HTTP/1.1 400 Invalid Request");
    echo "Error: Please pass a coninent name or random as a parameter.";
  }

  function find_event_date($db, $date) {
    echo "1";
    try {
      $sql = mysqli_query($db, "SELECT event FROM calEvent WHERE date = '{$date}'");
      $stmt = mysqli_fetch($sql, MYSQLI_ASSOC);
    }
    catch (PDOException $ex) {
      handle_db_error("A databse error occurred. Please try again later.");
    }
    return $stmt;
  }

  function find_event_time($db, $date, $time) {
    $sql = "SELECT event FROM calEvent WHERE date = :date AND time = :time";
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