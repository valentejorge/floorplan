<?php

declare(strict_types=1);

namespace Floorplan\Tests;

use PDO;

/**
 * Provides an in-memory SQLite database pre-loaded with the OCS mock tables
 * (hardware, networks) and the floorplan plugin tables (buildings, floors,
 * rooms, assets).
 *
 * Usage: `use DatabaseSetup;` in any PHPUnit TestCase, then call
 * `$this->createDatabase()` inside setUp().
 */
trait DatabaseSetup
{
    protected PDO $pdo;

    /**
     * Bootstraps the in-memory SQLite database with all required tables.
     */
    protected function createDatabase(): void
    {
        $this->pdo = new PDO('sqlite::memory:');
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        // ── OCS Mock Tables ────────────────────────────────────────────
        $this->pdo->exec('
            CREATE TABLE hardware (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                NAME VARCHAR(255) NOT NULL
            )
        ');

        $this->pdo->exec('
            CREATE TABLE networks (
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                HARDWARE_ID INTEGER NOT NULL,
                IPADDRESS VARCHAR(45),
                MACADDR VARCHAR(17),
                FOREIGN KEY (HARDWARE_ID) REFERENCES hardware(ID)
            )
        ');

        // ── Floorplan Plugin Tables ────────────────────────────────────
        $this->pdo->exec('
            CREATE TABLE plugin_floorplan_buildings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(255) NOT NULL
            )
        ');

        $this->pdo->exec('
            CREATE TABLE plugin_floorplan_floors (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                building_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                FOREIGN KEY (building_id) REFERENCES plugin_floorplan_buildings(id)
            )
        ');

        $this->pdo->exec('
            CREATE TABLE plugin_floorplan_rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                floor_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                FOREIGN KEY (floor_id) REFERENCES plugin_floorplan_floors(id)
            )
        ');

        $this->pdo->exec('
            CREATE TABLE plugin_floorplan_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL,
                hardware_id INTEGER NOT NULL,
                pos_x INTEGER NOT NULL DEFAULT 0,
                pos_y INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (room_id) REFERENCES plugin_floorplan_rooms(id),
                FOREIGN KEY (hardware_id) REFERENCES hardware(ID)
            )
        ');
    }

    /**
     * Seeds the OCS mock tables with sample hardware and network records.
     */
    protected function seedOcsData(): void
    {
        $this->pdo->exec("
            INSERT INTO hardware (ID, NAME) VALUES
            (1, 'SRV-DC-01'),
            (2, 'PC-RH-003'),
            (3, 'IMP-FINANCEIRO')
        ");

        $this->pdo->exec("
            INSERT INTO networks (ID, HARDWARE_ID, IPADDRESS, MACADDR) VALUES
            (1, 1, '192.168.10.5', 'AA:BB:CC:DD:EE:01'),
            (2, 2, '192.168.10.20', 'AA:BB:CC:DD:EE:02'),
            (3, 3, '192.168.10.80', 'AA:BB:CC:DD:EE:03')
        ");
    }
}
