<?php
// OCS Inventory AJAX Endpoint
define('DO_NOT_REQUIRE_GUI', true);
require_once(__DIR__ . '/../../../../require/header.php');
require_once(__DIR__ . '/../require/MapEngine.php');

header('Content-Type: application/json');

try {
    $engine = new \Floorplan\MapEngine($_SESSION['APP_DB_LINK']);
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 1;
    // Actually, MapEngine does not have a `getRoom` implemented yet, but we will mock it for now.
    
    // Check if the MapEngine actually has getRoom, if not, fallback to static mock for Phase 6.
    if (method_exists($engine, 'getRoom')) {
        $data = $engine->getRoom($id);
        echo json_encode(['status' => 'success', 'data' => $data]);
    } else {
        // Fallback to reading the local JSON we built for demonstration
        $mock = file_get_contents(__DIR__ . '/../../../../public/ajax/mock_room_100.json');
        if ($mock) {
            echo $mock;
        } else {
            // Temporary mock structure if file not found
            echo json_encode(['status' => 'success', 'data' => [
                'id' => 100, 'name' => 'Sala OCS', 'floor_zones' => [], 'walls' => [], 'furniture' => [], 'assets' => []
            ]]);
        }
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
