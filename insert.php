<?php
  include 'common.php';

  if (isset($_POST["subject"])) {
    $db = get_PDO();
    // if (isset($_POST["date"])) {
    //   if (isset($_POST["time"])) {
    //     $output = insert_event($db, $_POST["subject"], $_POST["date"], $_POST["time"]);
    //   } else {
    //     $output = insert_event($db, $_POST["subject"], $_POST["date"], '');
    //   }
    // } else {
      $output = insert_event($db, $_POST["subject"], '', '');
    // }
    // if (isset($output)) {
    //   header("Content-type: application/json");
    //   echo json_encode($output);
    // }
  } else {
    header("HTTP/1.1 400 Invalid Request");
    echo "Error: Please pass a coninent name or random as a parameter.";
  }

  function insert_event($db, $subject, $date, $time) {
    if ($date === '') {
      $date = date('Y-m-d');
    }
    if ($time === '') {
      $time = date('h:i:sa');
    }

    try {
      $sql = "INSERT INTO calEvent (date, time, event) VALUES ('$date', '$time', '$subject')";
      $stmt = mysqli_query($db, $sql);
      if ($stmt) {
        echo "success: " . $subject . " added to your calendar!");
      } else {
        // echo mysqli_error($db);
        echo "error: " . $subject . " was not added to your calendar.." . mysqli_error($db);
      }
    }
    catch (PDOException $ex) {
      handle_db_error("A databse error occurred. Please try again later.");
    }
  }
?>