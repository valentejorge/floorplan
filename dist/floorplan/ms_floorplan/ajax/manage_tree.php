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
    
    if (!$data || empty($data['action'])) {
        throw new Exception("Invalid payload or missing action");
    }

    $action = $data['action'];

    if ($action === 'delete') {
        $type = $data['type'];
        $id = (int)$data['id'];

        if ($type === 'room') {
            $engine->deleteRoom($id);
        } elseif ($type === 'floor') {
            $engine->deleteFloor($id);
        } elseif ($type === 'building') {
            $engine->deleteBuilding($id);
        } else {
            throw new Exception("Invalid type for delete");
        }
        
        echo json_encode(['status' => 'success']);
    } 
    elseif ($action === 'move') {
        $roomId = (int)$data['room_id'];
        $newFloorId = (int)$data['new_floor_id'];
        $engine->moveRoom($roomId, $newFloorId);
        echo json_encode(['status' => 'success']);
    } 
    elseif ($action === 'reorder') {
        $updates = $data['updates']; // Array of ['type' => 'room', 'id' => 1, 'sort_order' => 5]
        if (!is_array($updates)) {
            throw new Exception("Invalid updates payload");
        }

        $pdo->beginTransaction();
        try {
            foreach ($updates as $u) {
                $engine->updateSortOrder($u['type'], (int)$u['id'], (int)$u['sort_order']);
            }
            $pdo->commit();
            echo json_encode(['status' => 'success']);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } 
    else {
        throw new Exception("Unknown action: " . $action);
    }

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
