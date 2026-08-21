<?php
define('AJAX', true);
$debut = true;
require_once(__DIR__ . '/../../../../dbconfig.inc.php');
require_once(__DIR__ . '/../../require/MapEngine.php');
require_once(__DIR__ . '/../../require/db.php');

header('Content-Type: application/json');

try {
    $pdo = get_floorplan_pdo();
    $engine = new \Floorplan\MapEngine($pdo);
    
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) {
        throw new Exception("Invalid room ID");
    }

    $roomData = $engine->getRoom($id);
    
    // Contract: return { "room_data": {...}, "architecture": {...}, "assets": [...] }
    echo json_encode($roomData);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
