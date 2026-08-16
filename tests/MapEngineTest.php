<?php

use PHPUnit\Framework\TestCase;
use Floorplan\MapEngine;

class MapEngineTest extends TestCase {
    private $db;
    private $engine;

    protected function setUp(): void {
        $this->db = getTestDbConnection();
        $this->engine = new MapEngine($this->db);
    }

    protected function tearDown(): void {
        $this->db = null;
    }

    public function testGetMapTreeReturnsValidStructure() {
        $tree = $this->engine->getMapTree();
        
        $this->assertIsArray($tree, "Tree should be an array");
        $this->assertArrayHasKey('buildings', $tree, "Tree should have 'buildings' key");
        $this->assertIsArray($tree['buildings'], "Buildings should be an array");
        
        if (count($tree['buildings']) > 0) {
            $building = $tree['buildings'][0];
            $this->assertArrayHasKey('id', $building);
            $this->assertArrayHasKey('name', $building);
            $this->assertArrayHasKey('floors', $building);
            $this->assertIsArray($building['floors']);
        }
    }

    public function testGetRoomReturnsValidStructure() {
        // Query the DB directly to find an existing room ID
        $result = $this->db->query("SELECT id FROM plugin_floorplan_rooms LIMIT 1");
        if ($result->rowCount() === 0) {
            $this->markTestSkipped("No rooms found in database to test getRoom.");
            return;
        }
        $row = $result->fetch(PDO::FETCH_ASSOC);
        $roomId = (int)$row['id'];
        
        $room = $this->engine->getRoom($roomId);
        
        $this->assertIsArray($room);
        $this->assertArrayHasKey('id', $room);
        $this->assertEquals($roomId, $room['id']);
        $this->assertArrayHasKey('assets', $room);
        $this->assertIsArray($room['assets']);
        $this->assertArrayHasKey('walls', $room);
        $this->assertArrayHasKey('doors', $room);
        $this->assertArrayHasKey('floor_zones', $room);
    }

    public function testGetUnmappedAssets() {
        $assets = $this->engine->getUnmappedAssets();
        
        $this->assertIsArray($assets, "Unmapped assets should be an array");
        
        if (count($assets) > 0) {
            $asset = $assets[0];
            // An unmapped asset must have a hardware_id
            $this->assertArrayHasKey('hardware_id', $asset);
            $this->assertArrayHasKey('hardware_name', $asset);
            
            // Verify that this asset is truly NOT in the plugin_floorplan_objects table
            $hardwareId = (int)$asset['hardware_id'];
            $query = "SELECT COUNT(*) as count FROM plugin_floorplan_objects WHERE device_id = $hardwareId";
            $res = $this->db->query($query);
            $row = $res->fetch(PDO::FETCH_ASSOC);
            $this->assertEquals(0, $row['count'], "Asset $hardwareId is returned as unmapped but exists in plugin_floorplan_objects!");
        }
    }
}
