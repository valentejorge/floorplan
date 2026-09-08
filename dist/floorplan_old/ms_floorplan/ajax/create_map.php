<?php
define('AJAX', true);
$debut = true;
require_once(__DIR__ . '/../../../../dbconfig.inc.php');
require_once(__DIR__ . '/../../require/MapEngine.php');
require_once(__DIR__ . '/../../require/db.php');

header('Content-Type: application/json');

try {
    $pdo = get_floorplan_pdo();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (!$data || empty($data['room_name'])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "Invalid payload or missing room_name"]);
        exit;
    }

    $roomName = $data['room_name'];
    $width = !empty($data['width']) ? (int)$data['width'] : 1200;
    $height = !empty($data['height']) ? (int)$data['height'] : 800;

    $pdo->beginTransaction();

    try {
        $buildingId = null;
        $floorId = null;

        // 1. Resolve or Create Building
        if (!empty($data['building_id'])) {
            $buildingId = (int)$data['building_id'];
        } elseif (!empty($data['building_name'])) {
            $stmtB = $pdo->prepare('INSERT INTO plugin_floorplan_locations (parent_id, type, name, sequence) VALUES (NULL, "building", ?, 0)');
            $stmtB->execute([$data['building_name']]);
            $buildingId = (int)$pdo->lastInsertId();
        }

        // 2. Resolve or Create Floor
        if (!empty($data['floor_id'])) {
            $floorId = (int)$data['floor_id'];
        } elseif (!empty($data['floor_name'])) {
            $stmtF = $pdo->prepare('INSERT INTO plugin_floorplan_locations (parent_id, type, name, sequence) VALUES (?, "floor", ?, 0)');
            $stmtF->execute([$buildingId, $data['floor_name']]);
            $floorId = (int)$pdo->lastInsertId();
        }

        // 3. Create Room
        $stmtLocation = $pdo->prepare('INSERT INTO plugin_floorplan_locations (parent_id, type, name, sequence) VALUES (?, "room", ?, 0)');
        $stmtLocation->execute([$floorId, $roomName]);
        $roomId = (int)$pdo->lastInsertId();

        // 4. Create initial room architecture data
        $initialArchitecture = json_encode(['walls' => [], 'floors' => [], 'furniture' => []]);
        $stmtData = $pdo->prepare('INSERT INTO plugin_floorplan_rooms_data (room_id, canvas_width, canvas_height, architecture_payload) VALUES (?, ?, ?, ?)');
        $stmtData->execute([$roomId, $width, $height, $initialArchitecture]);

        $pdo->commit();

        echo json_encode(['status' => 'success', 'room_id' => $roomId]);

    } catch (PDOException $e) {
        $pdo->rollBack();
        throw $e;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
