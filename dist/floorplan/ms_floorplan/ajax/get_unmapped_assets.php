<?php
// OCS Inventory AJAX Endpoint
define('DO_NOT_REQUIRE_GUI', true);
require_once(__DIR__ . '/../../../../require/header.php');
require_once(__DIR__ . '/../require/MapEngine.php');

header('Content-Type: application/json');

try {
    $engine = new \Floorplan\MapEngine($_SESSION['APP_DB_LINK']);
    
    // In Phase 6, MapEngine will implement getUnmappedAssets()
    if (method_exists($engine, 'getUnmappedAssets')) {
        $result = $engine->getUnmappedAssets();
        echo json_encode(['status' => 'success', 'data' => $result]);
    } else {
        // Temporary mock for Unmapped Assets
        echo json_encode(['status' => 'success', 'data' => [
            ['hardware_id' => 101, 'hardware_name' => 'DESKTOP-NEW-01', 'type' => 'desktop'],
            ['hardware_id' => 102, 'hardware_name' => 'DESKTOP-NEW-02', 'type' => 'desktop'],
            ['hardware_id' => 201, 'hardware_name' => 'LAPTOP-HR-04', 'type' => 'laptop']
        ]]);
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
