<?php

declare(strict_types=1);

namespace Floorplan;

use PDO;

/**
 * MapEngine - Core business logic for the floorplan plugin.
 *
 * Manages the hierarchical spatial model:
 *   Building → Floor → Room → Asset (linked to OCS hardware)
 *
 * Provides a global search across OCS hardware/networks tables
 * to locate any device by hostname, IP, or MAC address and return
 * its full physical location tree.
 */
class MapEngine
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    // =========================================================================
    // Hierarchy CRUD
    // =========================================================================

    /**
     * Creates a new building.
     *
     * @return int The ID of the created building.
     */
    public function createBuilding(string $name): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO plugin_floorplan_buildings (name) VALUES (:name)'
        );
        $stmt->execute(['name' => $name]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Creates a new floor within a building.
     *
     * @return int The ID of the created floor.
     */
    public function createFloor(int $buildingId, string $name): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO plugin_floorplan_floors (building_id, name) VALUES (:building_id, :name)'
        );
        $stmt->execute([
            'building_id' => $buildingId,
            'name' => $name,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Creates a new room within a floor.
     *
     * @return int The ID of the created room.
     */
    public function createRoom(int $floorId, string $name): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO plugin_floorplan_rooms (floor_id, name) VALUES (:floor_id, :name)'
        );
        $stmt->execute([
            'floor_id' => $floorId,
            'name' => $name,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // =========================================================================
    // Asset Placement
    // =========================================================================

    /**
     * Plants an OCS hardware asset at a specific position within a room.
     *
     * @return int The ID of the created asset placement.
     */
    public function plantAsset(int $roomId, int $hardwareId, int $posX, int $posY): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO plugin_floorplan_assets (room_id, hardware_id, pos_x, pos_y)
             VALUES (:room_id, :hardware_id, :pos_x, :pos_y)'
        );
        $stmt->execute([
            'room_id' => $roomId,
            'hardware_id' => $hardwareId,
            'pos_x' => $posX,
            'pos_y' => $posY,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    // =========================================================================
    // Global Search (Killer Feature)
    // =========================================================================

    /**
     * Searches for assets by hostname, IP address, or MAC address.
     *
     * Performs a multi-table JOIN across OCS core tables (hardware, networks)
     * and the floorplan hierarchy (assets → rooms → floors → buildings)
     * to return the device data along with its full physical location.
     *
     * @param string $query Search term (hostname, IP, or MAC — supports partial match).
     * @return array<int, array{
     *     hardware_id: int,
     *     hardware_name: string,
     *     ip: string|null,
     *     mac: string|null,
     *     room_id: int,
     *     room_name: string,
     *     floor_name: string,
     *     building_name: string,
     *     pos_x: int,
     *     pos_y: int
     * }>
     */
    public function searchAsset(string $query): array
    {
        $stmt = $this->pdo->prepare('
            SELECT
                h.ID          AS hardware_id,
                h.NAME        AS hardware_name,
                n.IPADDRESS   AS ip,
                n.MACADDR     AS mac,
                a.room_id,
        $like = '%' . $query . '%';

        // 1. Search Hardware
        $hwStmt = $this->pdo->prepare('
            SELECT h.ID AS hardware_id, ANY_VALUE(h.NAME) AS name, ANY_VALUE(a.room_id) AS room_id, ANY_VALUE(l.name) AS room_name, ANY_VALUE(f.name) AS floor_name, ANY_VALUE(b.name) AS building_name
            FROM hardware h
            LEFT JOIN plugin_floorplan_assets a ON a.hardware_id = h.ID
            LEFT JOIN plugin_floorplan_locations l ON a.room_id = l.id
            LEFT JOIN plugin_floorplan_locations f ON l.parent_id = f.id
            LEFT JOIN plugin_floorplan_locations b ON f.parent_id = b.id
            LEFT JOIN networks n ON n.HARDWARE_ID = h.ID
            WHERE h.NAME LIKE :q OR n.IPADDRESS LIKE :q OR n.MACADDR LIKE :q
            GROUP BY h.ID
            LIMIT 50
        ');
        $hwStmt->execute(['q' => $like]);
        $assets = $hwStmt->fetchAll();

        // 2. Search Rooms
        $roomStmt = $this->pdo->prepare('
            SELECT l.id, l.name, ANY_VALUE(p.name) as floor_name, ANY_VALUE(b.name) as building_name
            FROM plugin_floorplan_locations l
            LEFT JOIN plugin_floorplan_locations p ON l.parent_id = p.id
            LEFT JOIN plugin_floorplan_locations b ON p.parent_id = b.id
            WHERE l.type = "room" AND l.name LIKE :q
            GROUP BY l.id
            LIMIT 50
        ');

        return $assets;
    }
}
