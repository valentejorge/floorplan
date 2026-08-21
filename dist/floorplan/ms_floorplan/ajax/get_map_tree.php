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
    
    $tree = $engine->getMapTree();
    
    // Contract: return { "locations": [...] }
    echo json_encode($tree);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
