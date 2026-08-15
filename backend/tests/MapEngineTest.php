<?php

declare(strict_types=1);

namespace Floorplan\Tests;

use Floorplan\MapEngine;
use PDO;
use PHPUnit\Framework\TestCase;

/**
 * MapEngineTest - Testes unitários para a lógica de negócio do plugin floorplan.
 *
 * Utiliza SQLite em memória para simular o MariaDB do OCS Inventory,
 * incluindo as tabelas nativas do OCS (hardware) e as tabelas do plugin
 * (plugin_maps, plugin_map_assets, plugin_map_revisions).
 */
class MapEngineTest extends TestCase
{
    private PDO $pdo;
    private MapEngine $engine;

    /**
     * Cria o banco SQLite em memória e inicializa as tabelas antes de cada teste.
     */
    protected function setUp(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Mock da tabela nativa do OCS Inventory
        $this->pdo->exec('
            CREATE TABLE hardware (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                NAME VARCHAR(255) NOT NULL,
                WORKGROUP VARCHAR(255),
                OSNAME VARCHAR(255),
                IPADDR VARCHAR(255)
            )
        ');

        // Tabelas do plugin floorplan (equivalente ao install.sql)
        $this->pdo->exec('
            CREATE TABLE plugin_maps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL,
                width INTEGER NOT NULL DEFAULT 1200,
                height INTEGER NOT NULL DEFAULT 800,
                grid_size INTEGER NOT NULL DEFAULT 20,
                background_color VARCHAR(7) DEFAULT "#f5f5f5",
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL
            )
        ');

        $this->pdo->exec('
            CREATE TABLE plugin_map_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                map_id INTEGER NOT NULL,
                hardware_id INTEGER NOT NULL,
                asset_type VARCHAR(50) NOT NULL DEFAULT "desktop",
                x INTEGER NOT NULL DEFAULT 0,
                y INTEGER NOT NULL DEFAULT 0,
                width INTEGER NOT NULL DEFAULT 30,
                height INTEGER NOT NULL DEFAULT 30,
                rotation INTEGER NOT NULL DEFAULT 0,
                meta TEXT,
                FOREIGN KEY (map_id) REFERENCES plugin_maps(id),
                FOREIGN KEY (hardware_id) REFERENCES hardware(ID)
            )
        ');

        $this->pdo->exec('
            CREATE TABLE plugin_map_revisions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                map_id INTEGER NOT NULL,
                user_id VARCHAR(255) NOT NULL,
                created_at DATETIME NOT NULL,
                map_snapshot TEXT NOT NULL,
                FOREIGN KEY (map_id) REFERENCES plugin_maps(id)
            )
        ');

        // Seed: equipamentos fictícios no inventário OCS
        $this->pdo->exec("
            INSERT INTO hardware (ID, NAME, WORKGROUP, OSNAME, IPADDR) VALUES
            (101, 'SRV-DC-01', 'SERVERS', 'Ubuntu 24.04 LTS', '192.168.1.10'),
            (102, 'PC-RH-003', 'RH', 'Windows 11 Pro', '192.168.1.45'),
            (103, 'IMP-FINANCEIRO', 'FINANCE', 'Printer Firmware', '192.168.1.80')
        ");

        $this->engine = new MapEngine($this->pdo);
    }

    // =========================================================================
    // createMap
    // =========================================================================

    public function testCreateMapReturnsValidId(): void
    {
        $id = $this->engine->createMap('Datacenter - Andar Térreo', 1200, 800);

        $this->assertIsInt($id);
        $this->assertGreaterThan(0, $id);
    }

    public function testCreateMapPersistsCorrectData(): void
    {
        $id = $this->engine->createMap('Sala de Reuniões', 600, 400, 10);

        $stmt = $this->pdo->prepare('SELECT * FROM plugin_maps WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $map = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->assertSame('Sala de Reuniões', $map['name']);
        $this->assertSame(600, (int) $map['width']);
        $this->assertSame(400, (int) $map['height']);
        $this->assertSame(10, (int) $map['grid_size']);
    }

    // =========================================================================
    // getMap
    // =========================================================================

    public function testGetMapReturnsNullForNonexistentMap(): void
    {
        $result = $this->engine->getMap(9999);

        $this->assertNull($result);
    }

    public function testGetMapReturnsMapWithAssets(): void
    {
        $mapId = $this->engine->createMap('Datacenter', 1200, 800);

        // Posiciona ativos no mapa
        $this->pdo->exec("
            INSERT INTO plugin_map_assets (map_id, hardware_id, asset_type, x, y) VALUES
            ({$mapId}, 101, 'server', 200, 300),
            ({$mapId}, 102, 'desktop', 500, 400)
        ");

        $result = $this->engine->getMap($mapId);

        $this->assertNotNull($result);
        $this->assertArrayHasKey('map', $result);
        $this->assertArrayHasKey('assets', $result);
        $this->assertCount(2, $result['assets']);
        $this->assertSame('SRV-DC-01', $result['assets'][0]['hardware_name']);
    }

    // =========================================================================
    // batchUpdateAssets
    // =========================================================================

    public function testBatchUpdateAssetsMovesPositions(): void
    {
        $mapId = $this->engine->createMap('Datacenter', 1200, 800);
        $this->pdo->exec("
            INSERT INTO plugin_map_assets (id, map_id, hardware_id, asset_type, x, y) VALUES
            (1, {$mapId}, 101, 'server', 200, 300),
            (2, {$mapId}, 102, 'desktop', 500, 400)
        ");

        $this->engine->batchUpdateAssets($mapId, [
            ['id' => 1, 'x' => 220, 'y' => 320, 'rotation' => 0],
            ['id' => 2, 'x' => 540, 'y' => 420, 'rotation' => 90],
        ], 'admin');

        $stmt = $this->pdo->prepare('SELECT x, y, rotation FROM plugin_map_assets WHERE id = 1');
        $stmt->execute();
        $asset = $stmt->fetch(PDO::FETCH_ASSOC);

        $this->assertSame(220, (int) $asset['x']);
        $this->assertSame(320, (int) $asset['y']);
    }

    public function testBatchUpdateCreatesRevision(): void
    {
        $mapId = $this->engine->createMap('Datacenter', 1200, 800);
        $this->pdo->exec("
            INSERT INTO plugin_map_assets (id, map_id, hardware_id, asset_type, x, y) VALUES
            (1, {$mapId}, 101, 'server', 200, 300)
        ");

        $revisionId = $this->engine->batchUpdateAssets($mapId, [
            ['id' => 1, 'x' => 250, 'y' => 350, 'rotation' => 0],
        ], 'admin');

        $this->assertIsInt($revisionId);
        $this->assertGreaterThan(0, $revisionId);

        // Verifica que o snapshot foi persistido
        $revisions = $this->engine->getRevisions($mapId);
        $this->assertCount(1, $revisions);
        $this->assertSame('admin', $revisions[0]['user_id']);
    }

    public function testBatchUpdateRevisionContainsCorrectSnapshot(): void
    {
        $mapId = $this->engine->createMap('Datacenter', 1200, 800);
        $this->pdo->exec("
            INSERT INTO plugin_map_assets (id, map_id, hardware_id, asset_type, x, y) VALUES
            (1, {$mapId}, 101, 'server', 200, 300)
        ");

        $revisionId = $this->engine->batchUpdateAssets($mapId, [
            ['id' => 1, 'x' => 999, 'y' => 888, 'rotation' => 45],
        ], 'operador_ti');

        $snapshot = $this->engine->getRevisionSnapshot($revisionId);

        $this->assertNotNull($snapshot);
        $this->assertSame('operador_ti', $snapshot['user_id']);

        // O snapshot deve refletir o estado APÓS o batch update
        $assets = $snapshot['map_snapshot']['assets'];
        $this->assertSame(999, (int) $assets[0]['x']);
        $this->assertSame(888, (int) $assets[0]['y']);
        $this->assertSame(45, (int) $assets[0]['rotation']);
    }

    // =========================================================================
    // getRevisions (Time Travel)
    // =========================================================================

    public function testGetRevisionsReturnsEmptyForNewMap(): void
    {
        $mapId = $this->engine->createMap('Mapa Novo', 800, 600);

        $revisions = $this->engine->getRevisions($mapId);

        $this->assertIsArray($revisions);
        $this->assertEmpty($revisions);
    }

    public function testMultipleBatchUpdatesCreateMultipleRevisions(): void
    {
        $mapId = $this->engine->createMap('Datacenter', 1200, 800);
        $this->pdo->exec("
            INSERT INTO plugin_map_assets (id, map_id, hardware_id, asset_type, x, y) VALUES
            (1, {$mapId}, 101, 'server', 200, 300)
        ");

        // Primeira movimentação
        $this->engine->batchUpdateAssets($mapId, [
            ['id' => 1, 'x' => 210, 'y' => 310, 'rotation' => 0],
        ], 'admin');

        // Segunda movimentação
        $this->engine->batchUpdateAssets($mapId, [
            ['id' => 1, 'x' => 220, 'y' => 320, 'rotation' => 0],
        ], 'tecnico_01');

        $revisions = $this->engine->getRevisions($mapId);

        $this->assertCount(2, $revisions);
        // Ordem DESC: mais recente primeiro
        $this->assertSame('tecnico_01', $revisions[0]['user_id']);
        $this->assertSame('admin', $revisions[1]['user_id']);
    }

    public function testGetRevisionSnapshotReturnsNullForNonexistent(): void
    {
        $result = $this->engine->getRevisionSnapshot(9999);

        $this->assertNull($result);
    }
}
