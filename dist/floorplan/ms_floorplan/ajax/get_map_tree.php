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
    echo json_encode(['status' => 'success', 'data' => $tree]);
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
