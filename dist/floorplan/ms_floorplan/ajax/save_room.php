<?php
// OCS Inventory AJAX Endpoint
define('DO_NOT_REQUIRE_GUI', true);
require_once(__DIR__ . '/../../../../require/header.php');
require_once(__DIR__ . '/../require/MapEngine.php');

header('Content-Type: application/json');

try {
    $engine = new \Floorplan\MapEngine($_SESSION['APP_DB_LINK']);
    $data = json_decode(file_get_contents('php://input'), true);
    
    // In Phase 6, MapEngine will implement saveRoom($data)
    if (method_exists($engine, 'saveRoom')) {
        $result = $engine->saveRoom($data);
        echo json_encode(['status' => 'success', 'data' => $result]);
    } else {
        // Temporary mock response
        echo json_encode(['status' => 'success', 'message' => 'Mock saved successfully']);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
