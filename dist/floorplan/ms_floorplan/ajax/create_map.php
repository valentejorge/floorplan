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
    
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!$data || empty($data['room_name'])) {
        throw new Exception("Invalid payload or missing room_name");
    }

    $buildingId = null;
    $floorId = null;

    // Resolve or Create Building
    if (!empty($data['building_id'])) {
        $buildingId = (int)$data['building_id'];
    } elseif (!empty($data['building_name'])) {
        $buildingId = $engine->createBuilding($data['building_name']);
    } else {
        throw new Exception("Either building_id or building_name is required");
    }

    // Resolve or Create Floor
    if (!empty($data['floor_id'])) {
        $floorId = (int)$data['floor_id'];
    } elseif (!empty($data['floor_name'])) {
        $floorId = $engine->createFloor($buildingId, $data['floor_name']);
    } else {
        throw new Exception("Either floor_id or floor_name is required");
    }

    // Create Room
    $width = !empty($data['width']) ? (float)$data['width'] : 800.0;
    $height = !empty($data['height']) ? (float)$data['height'] : 600.0;
    
    $roomId = $engine->createRoom($floorId, $data['room_name'], $width, $height);

    echo json_encode(['status' => 'success', 'room_id' => $roomId]);
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
