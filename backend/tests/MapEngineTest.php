<?php

declare(strict_types=1);

namespace Floorplan\Tests;

use Floorplan\MapEngine;
use PHPUnit\Framework\TestCase;

/**
 * TDD test suite for MapEngine.
 *
 * Covers the hierarchical data model (Building → Floor → Room → Asset)
 * and the global search "killer feature" across OCS hardware/networks.
 */
class MapEngineTest extends TestCase
{
    use DatabaseSetup;

    private MapEngine $engine;

    protected function setUp(): void
    {
        $this->createDatabase();
        $this->seedOcsData();
        $this->engine = new MapEngine($this->pdo);
    }

    // =========================================================================
    // Hierarchy: Building → Floor → Room
    // =========================================================================

    public function testCanCreateHierarchy(): void
    {
        $buildingId = $this->engine->createBuilding('Headquarters');
        $this->assertIsInt($buildingId);
        $this->assertGreaterThan(0, $buildingId);

        $floorId = $this->engine->createFloor($buildingId, 'Ground Floor');
        $this->assertIsInt($floorId);
        $this->assertGreaterThan(0, $floorId);

        $roomId = $this->engine->createRoom($floorId, 'Server Room A');
        $this->assertIsInt($roomId);
        $this->assertGreaterThan(0, $roomId);

        // Verify foreign key relationships are persisted correctly
        $floor = $this->pdo->query("SELECT * FROM plugin_floorplan_floors WHERE id = {$floorId}")->fetch();
        $this->assertSame($buildingId, (int) $floor['building_id']);

        $room = $this->pdo->query("SELECT * FROM plugin_floorplan_rooms WHERE id = {$roomId}")->fetch();
        $this->assertSame($floorId, (int) $room['floor_id']);
    }

    // =========================================================================
    // Asset Placement
    // =========================================================================

    public function testCanPlantAssetInRoom(): void
    {
        $buildingId = $this->engine->createBuilding('Headquarters');
        $floorId    = $this->engine->createFloor($buildingId, 'Ground Floor');
        $roomId     = $this->engine->createRoom($floorId, 'Server Room A');

        // Plant hardware ID 1 (SRV-DC-01) at coordinates (120, 340)
        $assetId = $this->engine->plantAsset($roomId, 1, 120, 340);

        $this->assertIsInt($assetId);
        $this->assertGreaterThan(0, $assetId);

        // Verify persisted data
        $asset = $this->pdo->query("SELECT * FROM plugin_floorplan_assets WHERE id = {$assetId}")->fetch();
        $this->assertSame($roomId, (int) $asset['room_id']);
        $this->assertSame(1, (int) $asset['hardware_id']);
        $this->assertSame(120, (int) $asset['pos_x']);
        $this->assertSame(340, (int) $asset['pos_y']);
    }

    // =========================================================================
    // Global Search (Killer Feature)
    // =========================================================================

    public function testGlobalSearchFindsAssetByHostname(): void
    {
        $this->plantTestAsset();

        $results = $this->engine->searchAsset('SRV-DC-01');

        $this->assertNotEmpty($results);
        $this->assertSame('SRV-DC-01', $results[0]['hardware_name']);
        $this->assertSame('Server Room A', $results[0]['room_name']);
        $this->assertSame('Ground Floor', $results[0]['floor_name']);
        $this->assertSame('Headquarters', $results[0]['building_name']);
    }

    public function testGlobalSearchFindsAssetByIp(): void
    {
        $this->plantTestAsset();

        $results = $this->engine->searchAsset('192.168.10.5');

        $this->assertNotEmpty($results);
        $this->assertSame('SRV-DC-01', $results[0]['hardware_name']);
        $this->assertSame('Headquarters', $results[0]['building_name']);
    }

    public function testGlobalSearchFindsAssetByMac(): void
    {
        $this->plantTestAsset();

        $results = $this->engine->searchAsset('AA:BB:CC:DD:EE:01');

        $this->assertNotEmpty($results);
        $this->assertSame('SRV-DC-01', $results[0]['hardware_name']);
    }

    public function testGlobalSearchReturnsCoordinates(): void
    {
        $this->plantTestAsset();

        $results = $this->engine->searchAsset('SRV-DC-01');

        $this->assertSame(120, (int) $results[0]['pos_x']);
        $this->assertSame(340, (int) $results[0]['pos_y']);
    }

    public function testGlobalSearchPartialMatch(): void
    {
        $this->plantTestAsset();

        // Partial hostname search
        $results = $this->engine->searchAsset('SRV-DC');
        $this->assertNotEmpty($results);

        // Partial IP search
        $results = $this->engine->searchAsset('192.168.10');
        $this->assertNotEmpty($results);
    }

    public function testGlobalSearchReturnsEmptyForUnknown(): void
    {
        $this->plantTestAsset();

        $results = $this->engine->searchAsset('DOES-NOT-EXIST');
        $this->assertEmpty($results);
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Creates a full hierarchy and plants SRV-DC-01 for search tests.
     */
    private function plantTestAsset(): void
    {
        $buildingId = $this->engine->createBuilding('Headquarters');
        $floorId    = $this->engine->createFloor($buildingId, 'Ground Floor');
        $roomId     = $this->engine->createRoom($floorId, 'Server Room A');

        $this->engine->plantAsset($roomId, 1, 120, 340);
    }
}
