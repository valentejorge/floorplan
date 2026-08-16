<?php
// Define OCS constants that are usually defined by OCS header.php
define('AJAX', true);
define('DO_NOT_REQUIRE_GUI', true);

// Include the class to be tested
$localPath = __DIR__ . '/../dist/floorplan/require/MapEngine.php';
$dockerPath = __DIR__ . '/../require/MapEngine.php';
if (file_exists($localPath)) {
    require_once $localPath;
} else {
    require_once $dockerPath;
}

// Helper to get a real DB connection pointing to the Docker MySQL container
function getTestDbConnection() {
    $host = 'ocsinventory-db';
    $user = 'ocsuser';
    $pass = 'ocspass';
    $db   = 'ocsweb';
    $port = 3306;

    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    try {
        $pdo = new PDO($dsn, $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        return $pdo;
    } catch (PDOException $e) {
        die("Connection failed: " . $e->getMessage() . "\nAre you running the docker-compose environment?\n");
    }
}
