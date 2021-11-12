<?php
  include 'common.php';
  // echo isset($_POST["subject"]);
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
    if (isset($output)) {
      header("Content-type: application/json");
      echo json_encode($output);
    }
  } else {
    header("HTTP/1.1 400 Invalid Request");
    echo "Error: Please pass a coninent name or random as a parameter.";
  }

  function insert_event($db, $subject, $date, $time) {
    // echo "0";
    if ($date === '') {
      $date = date('y-m-d');
    }
    if ($time === '') {
      $time = date('h:i:sa');
    }
    // echo $date;
    // $sql = "INSERT INTO calEvent (subject, date, time) VALUES (:subject, :date, :time);";
    $sql = mysqli_query($db, "INSERT INTO calEvent (subject, date, time) VALUES ('$subject', '$date', '$time')");
    echo "success";
    return array("success" => "{$subject} added to your calendar!");
    // try {
    //   // echo "2";
    //   $stmt = $db->prepare($sql);
    //   $info = array("subject" => $subject,
    //                 "date" => $date,
    //                 "time" => $time);

    //   $stmt->execute($info);
    //   // echo "3";
    //   return array("success" => "{$subject} added to your calendar!");
    // }
    // catch (PDOException $ex) {
    //   handle_db_error("A databse error occurred. Please try again later.");
    // }
  }
?>