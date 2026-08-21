<?php
define('AJAX', true);
$debut = true;
require_once(__DIR__ . '/../../../../dbconfig.inc.php');
require_once(__DIR__ . '/../../require/MapEngine.php');
require_once(__DIR__ . '/../../require/db.php');

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Method not allowed");
    }

    $pdo = get_floorplan_pdo();
    $engine = new \Floorplan\MapEngine($pdo);
    
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!$data) {
        throw new Exception("Invalid JSON payload");
    }

    // Since front-end might still send `id` at the root or we pull it from $_GET if it was a REST route.
    // The old code had save_room.php and the JS did: api('save_room.php', { body: JSON.stringify(state) })
    // So the room ID is inside the JSON as `id`.
    $roomId = isset($data['id']) ? (int)$data['id'] : 0;
    if ($roomId <= 0) {
        throw new Exception("Missing or invalid room id in payload");
    }

    $width = isset($data['width']) ? (int)$data['width'] : 1200;
    $height = isset($data['height']) ? (int)$data['height'] : 800;

    // The frontend has been updated to send the exact MVP architecture payload.
    // No more legacy adapter needed.
    $engine->saveRoom($roomId, $width, $height, $data);
    
    echo json_encode(['status' => 'success']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
