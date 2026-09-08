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

        if (in_array($type, ['room', 'floor', 'building'])) {
            $engine->deleteLocation($id);
        } else {
            throw new Exception("Invalid type for delete");
        }
        
        echo json_encode(['status' => 'success']);
    } 
    elseif ($action === 'rename') {
        $id = (int)$data['id'];
        $name = trim($data['name'] ?? '');
        if (empty($name)) {
            throw new Exception("Name cannot be empty");
        }
        $engine->renameLocation($id, $name);
        echo json_encode(['status' => 'success']);
    }
    elseif ($action === 'move') {
        $id = (int)($data['id'] ?? $data['room_id'] ?? 0);
        $newParentId = (int)($data['parent_id'] ?? $data['new_floor_id'] ?? 0);
        if (!$id || !$newParentId) {
            throw new Exception("Missing id or parent_id for move");
        }
        $engine->moveLocation($id, $newParentId);
        echo json_encode(['status' => 'success']);
    } 
    elseif ($action === 'reorder') {
        $updates = $data['updates']; // Array of ['id' => 1, 'sort_order' => 5]
        if (!is_array($updates)) {
            throw new Exception("Invalid updates payload");
        }

        $pdo->beginTransaction();
        try {
            foreach ($updates as $u) {
                $engine->updateSortOrder((int)$u['id'], (int)$u['sort_order']);
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
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
