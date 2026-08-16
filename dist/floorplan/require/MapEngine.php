<?php
declare(strict_types=1);

namespace Floorplan;

use PDO;
use Exception;

class MapEngine
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }

    /**
     * Get the full hierarchy tree: Buildings -> Floors -> Rooms
     */
    public function getMapTree(): array
    {
        $buildings = [];
        
        // Get buildings
        $b_stmt = $this->pdo->query('SELECT id, name FROM plugin_floorplan_buildings ORDER BY name');
        while ($b = $b_stmt->fetch()) {
            $b['floors'] = [];
            $buildings[$b['id']] = $b;
        }

        if (empty($buildings)) return ['buildings' => []];

        // Get floors
        $f_stmt = $this->pdo->query('SELECT id, building_id, name FROM plugin_floorplan_floors ORDER BY name');
        $floors = [];
        while ($f = $f_stmt->fetch()) {
            $f['rooms'] = [];
            $floors[$f['id']] = $f;
        }

        // Get rooms
        $r_stmt = $this->pdo->query('SELECT id, floor_id, name FROM plugin_floorplan_rooms ORDER BY name');
        while ($r = $r_stmt->fetch()) {
            if (isset($floors[$r['floor_id']])) {
                $floors[$r['floor_id']]['rooms'][] = ['id' => $r['id'], 'name' => $r['name']];
            }
        }

        // Assemble tree
        foreach ($floors as $f) {
            if (isset($buildings[$f['building_id']])) {
                $buildings[$f['building_id']]['floors'][] = $f;
            }
        }

        return ['buildings' => array_values($buildings)];
    }

    /**
     * Get a room layout with all its objects (furniture and assets)
     */
    public function getRoom(int $roomId): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM plugin_floorplan_rooms WHERE id = :id');
        $stmt->execute(['id' => $roomId]);
        $room = $stmt->fetch();

        if (!$room) {
            throw new Exception("Room not found");
        }

        // Fetch objects
        $stmt = $this->pdo->prepare('
            SELECT o.*, 
                   h.NAME as hardware_name, 
                   h.USERID as user,
                   n.IPADDRESS as ip, 
                   n.MACADDR as mac
            FROM plugin_floorplan_objects o
            LEFT JOIN hardware h ON o.device_id = h.ID
            LEFT JOIN networks n ON n.HARDWARE_ID = h.ID
            WHERE o.room_id = :room_id
            GROUP BY o.id
        ');
        $stmt->execute(['room_id' => $roomId]);
        
        $furniture = [];
        $assets = [];

        while ($row = $stmt->fetch()) {
            if ($row['device_id']) {
                $assets[] = [
                    'id' => 'asset_' . $row['id'],
                    'db_id' => (int)$row['id'],
                    'hardware_id' => (int)$row['device_id'],
                    'hardware_name' => $row['hardware_name'] ?: 'Unknown',
                    'type' => $row['type'],
                    'x' => (float)$row['x'],
                    'y' => (float)$row['y'],
                    'width' => (float)$row['width'],
                    'height' => (float)$row['height'],
                    'rotation' => (float)$row['rotation'],
                    'ip' => $row['ip'],
                    'mac' => $row['mac'],
                    'user' => $row['user']
                ];
            } else {
                $furniture[] = [
                    'id' => 'furn_' . $row['id'],
                    'db_id' => (int)$row['id'],
                    'type' => $row['type'],
                    'x' => (float)$row['x'],
                    'y' => (float)$row['y'],
                    'width' => (float)$row['width'],
                    'height' => (float)$row['height'],
                    'rotation' => (float)$row['rotation'],
                    'color' => $row['color'],
                    'label' => $row['label']
                ];
            }
        }

        return [
            'id' => (int)$room['id'],
            'name' => $room['name'],
            'width' => (float)$room['width'],
            'height' => (float)$room['height'],
            'wall_color' => $room['wall_color'],
            'floor_color' => $room['floor_color'],
            'grid_size' => (float)$room['grid_size'],
            'furniture' => $furniture,
            'assets' => $assets
        ];
    }

    /**
     * Save room properties and all its objects
     */
    public function saveRoom(int $roomId, array $data): void
    {
        $this->pdo->beginTransaction();
        try {
            // 1. Update room properties if provided
            if (isset($data['width'], $data['height'])) {
                $stmt = $this->pdo->prepare('
                    UPDATE plugin_floorplan_rooms 
                    SET width = :w, height = :h, wall_color = :wc, floor_color = :fc, grid_size = :gs
                    WHERE id = :id
                ');
                $stmt->execute([
                    'w' => $data['width'],
                    'h' => $data['height'],
                    'wc' => $data['wall_color'] ?? '#333333',
                    'fc' => $data['floor_color'] ?? '#f0f0f0',
                    'gs' => $data['grid_size'] ?? 0.5,
                    'id' => $roomId
                ]);
            }

            // 2. Clear old objects
            $stmt = $this->pdo->prepare('DELETE FROM plugin_floorplan_objects WHERE room_id = :id');
            $stmt->execute(['id' => $roomId]);

            // 3. Insert new objects
            $insertObj = $this->pdo->prepare('
                INSERT INTO plugin_floorplan_objects 
                (room_id, type, x, y, width, height, rotation, color, label, device_id)
                VALUES (:rid, :type, :x, :y, :w, :h, :rot, :color, :label, :did)
            ');

            if (!empty($data['furniture'])) {
                foreach ($data['furniture'] as $f) {
                    $insertObj->execute([
                        'rid' => $roomId,
                        'type' => $f['type'],
                        'x' => $f['x'],
                        'y' => $f['y'],
                        'w' => $f['width'],
                        'h' => $f['height'],
                        'rot' => $f['rotation'] ?? 0,
                        'color' => $f['color'] ?? null,
                        'label' => $f['label'] ?? null,
                        'did' => null
                    ]);
                }
            }

            if (!empty($data['assets'])) {
                foreach ($data['assets'] as $a) {
                    $insertObj->execute([
                        'rid' => $roomId,
                        'type' => $a['type'] ?? 'asset',
                        'x' => $a['x'],
                        'y' => $a['y'],
                        'w' => $a['width'],
                        'h' => $a['height'],
                        'rot' => $a['rotation'] ?? 0,
                        'color' => null,
                        'label' => null,
                        'did' => $a['hardware_id']
                    ]);
                }
            }

            $this->pdo->commit();
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Searches for assets by hostname, IP address, MAC address, or user.
     */
    public function searchAsset(string $query): array
    {
        $stmt = $this->pdo->prepare('
            SELECT
                h.ID          AS hardware_id,
                ANY_VALUE(h.NAME)        AS hardware_name,
                ANY_VALUE(h.USERID)      AS user,
                ANY_VALUE(n.IPADDRESS)   AS ip,
                ANY_VALUE(n.MACADDR)     AS mac,
                ANY_VALUE(o.room_id)     AS room_id
            FROM hardware h
            LEFT JOIN networks n ON n.HARDWARE_ID = h.ID
            LEFT JOIN plugin_floorplan_objects o ON o.device_id = h.ID
            WHERE h.NAME      LIKE :q
               OR n.IPADDRESS LIKE :q
               OR n.MACADDR   LIKE :q
               OR h.USERID    LIKE :q
            GROUP BY h.ID
            LIMIT 50
        ');

        $like = '%' . $query . '%';
        $stmt->execute(['q' => $like]);

        $results = [];
        while ($row = $stmt->fetch()) {
            $results[] = [
                'type' => 'asset',
                'hardware_id' => (int)$row['hardware_id'],
                'hardware_name' => $row['hardware_name'] ?: 'Unknown',
                'ip' => $row['ip'],
                'mac' => $row['mac'],
                'user' => $row['user'],
                'is_mapped' => !empty($row['room_id']),
                'room_id' => $row['room_id'] ? (int)$row['room_id'] : null
            ];
        }

        return $results;
    }
    
    /**
     * Helper methods for manual seed creation
     */
    public function getUnmappedAssets(): array
    {
        $stmt = $this->pdo->query('
            SELECT
                h.ID          AS hardware_id,
                ANY_VALUE(h.NAME)        AS hardware_name,
                ANY_VALUE(h.USERID)      AS user,
                ANY_VALUE(n.IPADDRESS)   AS ip,
                ANY_VALUE(n.MACADDR)     AS mac,
                ANY_VALUE(o.room_id)     AS room_id
            FROM hardware h
            LEFT JOIN networks n ON n.HARDWARE_ID = h.ID
            LEFT JOIN plugin_floorplan_objects o ON o.device_id = h.ID
            WHERE o.room_id IS NULL
            GROUP BY h.ID
            LIMIT 100
        ');

        $results = [];
        while ($row = $stmt->fetch()) {
            $results[] = [
                'type' => 'asset',
                'hardware_id' => (int)$row['hardware_id'],
                'hardware_name' => $row['hardware_name'] ?: 'Unknown',
                'ip' => $row['ip'],
                'mac' => $row['mac'],
                'user' => $row['user']
            ];
        }

        return $results;
    }
    
    public function createBuilding(string $name): int {
        $stmt = $this->pdo->prepare('INSERT INTO plugin_floorplan_buildings (name) VALUES (:name)');
        $stmt->execute(['name' => $name]);
        return (int) $this->pdo->lastInsertId();
    }
    public function createFloor(int $bid, string $name): int {
        $stmt = $this->pdo->prepare('INSERT INTO plugin_floorplan_floors (building_id, name) VALUES (?, ?)');
        $stmt->execute([$bid, $name]);
        return (int) $this->pdo->lastInsertId();
    }
    public function createRoom(int $fid, string $name): int {
        $stmt = $this->pdo->prepare('INSERT INTO plugin_floorplan_rooms (floor_id, name) VALUES (?, ?)');
        $stmt->execute([$fid, $name]);
        return (int) $this->pdo->lastInsertId();
    }
}
