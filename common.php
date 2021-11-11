<?php
  /**
   * Returns a PDO object connected to the database. If a PDOException is thrown when
   * attempting to connect to the database, responds with a 503 Service Unavailable
   * error.
   * @return {PDO} connected to the database upon a succesful connection.
   */
  function get_PDO() {
    $host = "localhost";
    $port = "8889";           # fill in with a port if necessary (will be different mac/pc)
    $user = "root";
    $password = "root";
    $dbname = "calEventdb";

    # Make a data source string that will be used in creating the PDO object
    $ds = "mysql:host={$host}:{$port};dbname={$dbname};charset=utf8";

    try {
      $db = new PDO($ds, $user, $password);
      $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      return $db;
    } catch (PDOException $ex) {
      fiveOthree_error("Can not connect to the database. Please try again later.");
    }
  }

  /**
   * 503 error message returned.
   * If given a second (optional) argument as an Exception, prints details about the cause of the
   * exception.
   * Code from the course example.
   * @param  [string] $msg Plain text error message.
   * @param  [Exception] $ex  Exception object with additional exception details.
   */
  function fiveOthree_error($msg, $ex=NULL) {
    header("HTTP/1.1 503 Service Unavailable");
    header("Content-type: text/plain");
    if ($ex) {
      echo ("Error details: $ex \n");
    }
    die("{$msg}\n");
  }

  /**
  * Prints out a plain text 503 error message given $msg. If given a second (optional) argument as
  * an PDOException, prints details about the cause of the exception. See process_error for
  * note about responding with PDO errors to a client.
  * @param $msg {string} - Plain text 503 message to output
  */
  function handle_db_error($msg) { # we can do default parameters in PHP! NULL is default if not given a second parameter.
    process_error("HTTP/1.1 503 Service Unavailable", $msg);
  }

?>