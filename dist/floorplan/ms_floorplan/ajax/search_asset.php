<?php
// OCS Inventory AJAX Endpoint
define('DO_NOT_REQUIRE_GUI', true);
require_once(__DIR__ . '/../../../../require/header.php');
require_once(__DIR__ . '/../require/MapEngine.php');

header('Content-Type: application/json');

try {
    $engine = new \Floorplan\MapEngine($_SESSION['APP_DB_LINK']);
    $q = isset($_GET['q']) ? strtolower($_GET['q']) : '';
    
    // In Phase 6, MapEngine will implement searchAsset($q)
    if (method_exists($engine, 'searchAsset')) {
        $result = $engine->searchAsset($q);
        echo json_encode(['status' => 'success', 'data' => $result]);
    } else {
        // Temporary mock search behavior using local mock file
        $mock = json_decode(file_get_contents(__DIR__ . '/../../../../public/ajax/mock_search.json'), true);
        if ($mock) {
            $filtered = [];
            foreach ($mock['data'] as $item) {
                if (strpos(strtolower($item['hardware_name'] ?? ''), $q) !== false || 
                    strpos(strtolower($item['room_name'] ?? ''), $q) !== false) {
                    $filtered[] = $item;
                }
            }
            echo json_encode(['status' => 'success', 'data' => $filtered]);
        } else {
            echo json_encode(['status' => 'success', 'data' => []]);
        }
    }
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
