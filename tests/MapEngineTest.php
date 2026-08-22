<?php

use PHPUnit\Framework\TestCase;
use Floorplan\MapEngine;

class MapEngineTest extends TestCase {
    private $db;
    private $engine;

    protected function setUp(): void {
        $this->db = getTestDbConnection();
        
        // Ensure tables exist for tests (simulate install.php)
        $this->setupTestDatabase();

        $this->engine = new MapEngine($this->db);
    }

    private function setupTestDatabase() {
        // Drop legacy tables if they exist in test DB to ensure clean state
        $this->db->exec("DROP TABLE IF EXISTS plugin_floorplan_objects");
        $this->db->exec("DROP TABLE IF EXISTS plugin_floorplan_rooms");
        $this->db->exec("DROP TABLE IF EXISTS plugin_floorplan_floors");
        $this->db->exec("DROP TABLE IF EXISTS plugin_floorplan_buildings");

        // Create new MVP tables
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS plugin_floorplan_locations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                parent_id INT NULL,
                type ENUM('building', 'floor', 'room') NOT NULL,
                name VARCHAR(255) NOT NULL,
                sequence INT DEFAULT 0,
                FOREIGN KEY (parent_id) REFERENCES plugin_floorplan_locations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
        ");

        $this->db->exec("
            CREATE TABLE IF NOT EXISTS plugin_floorplan_assets (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_id INT NOT NULL,
                hardware_id INT NOT NULL,
                pos_x FLOAT NOT NULL,
                pos_y FLOAT NOT NULL,
                rotation FLOAT DEFAULT 0,
                FOREIGN KEY (room_id) REFERENCES plugin_floorplan_locations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
        ");

        $this->db->exec("
            CREATE TABLE IF NOT EXISTS plugin_floorplan_rooms_data (
                room_id INT PRIMARY KEY,
                canvas_width INT NOT NULL,
                canvas_height INT NOT NULL,
                architecture_payload TEXT,
                thumbnail LONGTEXT DEFAULT NULL,
                FOREIGN KEY (room_id) REFERENCES plugin_floorplan_locations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
        ");
        
        // Clean data before each test
        $this->db->exec("DELETE FROM plugin_floorplan_rooms_data");
        $this->db->exec("DELETE FROM plugin_floorplan_assets");
        $this->db->exec("DELETE FROM plugin_floorplan_locations");
    }

    protected function tearDown(): void {
        $this->db = null;
    }

    public function testTheBlobSaveAndRetrieve() {
        // 1. Create a room location
        $roomId = $this->engine->createLocation(null, 'room', 'Test Room Blob');
        $this->assertGreaterThan(0, $roomId);

        // 2. Prepare mock JSON blob
        $mockArchitecture = [
            'walls' => [ ['x' => 0, 'y' => 0, 'length' => 100] ],
            'floors' => [],
            'furniture' => [ ['type' => 'desk', 'x' => 50, 'y' => 50] ]
        ];

        // 3. Save room data
        $payload = [
            'architecture' => $mockArchitecture,
            'assets' => [], // No assets for this test
            'thumbnail' => 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD' // mock base64
        ];
        
        // Engine should split this and save architecture to rooms_data
        $this->engine->saveRoom($roomId, 1200, 800, $payload);

        // 4. Retrieve it
        $retrieved = $this->engine->getRoom($roomId);
        
        $this->assertEquals(1200, $retrieved['room_data']['canvas_width']);
        $this->assertEquals(800, $retrieved['room_data']['canvas_height']);
        
        // The blob should be seamlessly deserialized
        $this->assertIsArray($retrieved['architecture']);
        $this->assertArrayHasKey('walls', $retrieved['architecture']);
        $this->assertCount(1, $retrieved['architecture']['walls']);
        $this->assertEquals(100, $retrieved['architecture']['walls'][0]['length']);
        
        // 5. Verify thumbnail in map tree
        $tree = $this->engine->getMapTree();
        $this->assertNotEmpty($tree['locations']);
        $this->assertEquals('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD', $tree['locations'][0]['thumbnail']);
    }

    public function testAssetRelationWithOcsHardware() {
        // Find a real hardware_id from OCS to test the JOIN
        $stmt = $this->db->query("SELECT ID, NAME FROM hardware LIMIT 1");
        $hardware = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$hardware) {
            $this->markTestSkipped("No hardware found in OCS DB to test JOIN.");
        }
        $hwId = (int)$hardware['ID'];
        $hwName = $hardware['NAME'];

        // 1. Create a room
        $roomId = $this->engine->createLocation(null, 'room', 'Test Room Asset');

        // 2. Save room with an asset
        $payload = [
            'architecture' => ['walls' => []],
            'assets' => [
                [
                    'hardware_id' => $hwId,
                    'pos_x' => 150.5,
                    'pos_y' => 200.0,
                    'rotation' => 45
                ]
            ]
        ];

        $this->engine->saveRoom($roomId, 1000, 1000, $payload);

        // 3. Retrieve and verify the JOIN with OCS
        $retrieved = $this->engine->getRoom($roomId);

        $this->assertCount(1, $retrieved['assets']);
        $asset = $retrieved['assets'][0];
        
        $this->assertEquals($hwId, $asset['hardware_id']);
        $this->assertEquals(150.5, $asset['pos_x']);
        $this->assertEquals(200.0, $asset['pos_y']);
        $this->assertEquals(45, $asset['rotation']);
        
        // Verify canonical data was pulled from OCS
        $this->assertArrayHasKey('canonical_data', $asset);
        $this->assertEquals($hwName, $asset['canonical_data']['name']);
    }

    public function testGetTreeHierarchy() {
        // Create Building -> Floor -> Room
        $bId = $this->engine->createLocation(null, 'building', 'HQ');
        $fId = $this->engine->createLocation($bId, 'floor', 'Floor 1');
        $rId = $this->engine->createLocation($fId, 'room', 'Server Room');

        $tree = $this->engine->getMapTree();

        $this->assertArrayHasKey('locations', $tree);
        $this->assertCount(1, $tree['locations']);
        
        $building = $tree['locations'][0];
        $this->assertEquals('building', $building['type']);
        $this->assertEquals('HQ', $building['name']);
        
        $this->assertArrayHasKey('children', $building);
        $this->assertCount(1, $building['children']);
        
        $floor = $building['children'][0];
        $this->assertEquals('floor', $floor['type']);
        
        $this->assertArrayHasKey('children', $floor);
        $this->assertCount(1, $floor['children']);
        
        $room = $floor['children'][0];
        $this->assertEquals('room', $room['type']);
        $this->assertEquals('Server Room', $room['name']);
    }

    public function testMoveAndReorderLocation() {
        $bId = $this->engine->createLocation(null, 'building', 'HQ Move');
        $fId1 = $this->engine->createLocation($bId, 'floor', 'Floor 1 Move');
        $fId2 = $this->engine->createLocation($bId, 'floor', 'Floor 2 Move');
        $rId = $this->engine->createLocation($fId1, 'room', 'Room Move');

        // Move room to floor 2
        $this->engine->moveLocation($rId, $fId2);
        
        $stmt = $this->db->query("SELECT parent_id FROM plugin_floorplan_locations WHERE id = $rId");
        $this->assertEquals($fId2, (int)$stmt->fetchColumn());

        // Update sort order
        $this->engine->updateSortOrder($rId, 10);
        $stmt2 = $this->db->query("SELECT sequence FROM plugin_floorplan_locations WHERE id = $rId");
        $this->assertEquals(10, (int)$stmt2->fetchColumn());
    }

    public function testDeleteLocationWithSafetyLock() {
        $bId = $this->engine->createLocation(null, 'building', 'HQ Delete');
        $fId = $this->engine->createLocation($bId, 'floor', 'Floor Delete');

        // Try deleting building with floor (should throw)
        $this->expectException(Exception::class);
        $this->expectExceptionMessage("Cannot delete location. It contains nested maps or floors.");
        $this->engine->deleteLocation($bId);
    }
}
