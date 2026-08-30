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
     * Helper to insert a new location for testing or logic
     */
    public function createLocation(?int $parentId, string $type, string $name, int $sequence = 0): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO plugin_floorplan_locations (parent_id, type, name, sequence) VALUES (?, ?, ?, ?)');
        $stmt->execute([$parentId, $type, $name, $sequence]);
        return (int) $this->pdo->lastInsertId();
    }

    /**
     * GET /api/tree logic
     */
    public function getMapTree(): array
    {
        // 1. Fetch all locations
        $stmt = $this->pdo->query('
            SELECT l.id, l.parent_id, l.type, l.name, l.sequence, d.thumbnail 
            FROM plugin_floorplan_locations l
            LEFT JOIN plugin_floorplan_rooms_data d ON l.id = d.room_id
            ORDER BY l.sequence ASC, l.name ASC
        ');
        $locations = $stmt->fetchAll();

        // 2. Build the tree
        $tree = [];
        $lookup = [];
        foreach ($locations as $loc) {
            $loc['children'] = [];
            $lookup[$loc['id']] = $loc;
        }

        foreach ($lookup as &$loc) {
            if ($loc['parent_id'] !== null && isset($lookup[$loc['parent_id']])) {
                $lookup[$loc['parent_id']]['children'][] = &$loc;
            } else {
                $tree[] = &$loc;
            }
        }

        return ['locations' => $tree];
    }

    /**
     * GET /api/room/{id} logic
     */
    public function getRoom(int $roomId): array
    {
        // 1. Validate location exists and is a room, fetching parent names for breadcrumbs
        $stmt = $this->pdo->prepare('
            SELECT l1.id, l1.name, 
                   l2.name as floor_name, 
                   l3.name as building_name
            FROM plugin_floorplan_locations l1
            LEFT JOIN plugin_floorplan_locations l2 ON l1.parent_id = l2.id
            LEFT JOIN plugin_floorplan_locations l3 ON l2.parent_id = l3.id
            WHERE l1.id = ? AND l1.type = "room"
        ');
        $stmt->execute([$roomId]);
        $room = $stmt->fetch();

        if (!$room) {
            throw new Exception("Room not found");
        }

        // 2. Fetch Room Data (Blob)
        $dataStmt = $this->pdo->prepare('SELECT canvas_width, canvas_height, architecture_payload FROM plugin_floorplan_rooms_data WHERE room_id = ?');
        $dataStmt->execute([$roomId]);
        $data = $dataStmt->fetch();

        $width = $data ? (int)$data['canvas_width'] : 1200;
        $height = $data ? (int)$data['canvas_height'] : 800;
        $architecture = $data && $data['architecture_payload'] ? json_decode($data['architecture_payload'], true) : ['walls' => [], 'floors' => [], 'furniture' => []];

        // 3. Fetch Assets and Join with OCS Hardware
        $assetsStmt = $this->pdo->prepare('
            SELECT a.hardware_id, 
                   ANY_VALUE(a.pos_x) as pos_x, 
                   ANY_VALUE(a.pos_y) as pos_y, 
                   ANY_VALUE(a.rotation) as rotation,
                   ANY_VALUE(h.NAME) as hardware_name,
                   ANY_VALUE(n.IPADDRESS) as ip
            FROM plugin_floorplan_assets a
            LEFT JOIN hardware h ON a.hardware_id = h.ID
            LEFT JOIN networks n ON n.HARDWARE_ID = h.ID
            WHERE a.room_id = ?
            GROUP BY a.hardware_id
        ');
        $assetsStmt->execute([$roomId]);
        
        $assets = [];
        while ($row = $assetsStmt->fetch()) {
            $assets[] = [
                'hardware_id' => (int)$row['hardware_id'],
                'pos_x' => (float)$row['pos_x'],
                'pos_y' => (float)$row['pos_y'],
                'rotation' => (float)$row['rotation'],
                'canonical_data' => [
                    'name' => $row['hardware_name'] ?: 'Unknown',
                    'ip' => $row['ip']
                ]
            ];
        }

        return [
            'room_data' => [
                'id' => (int)$room['id'],
                'name' => $room['name'],
                'floor_name' => $room['floor_name'] ?: '',
                'building_name' => $room['building_name'] ?: '',
                'canvas_width' => $width,
                'canvas_height' => $height
            ],
            'architecture' => $architecture,
            'assets' => $assets
        ];
    }

    /**
     * POST /api/room/{id}/save logic
     */
    public function saveRoom(int $roomId, int $width, int $height, array $payload): void
    {
        $this->pdo->beginTransaction();
        try {
            // 1. Save architecture payload to rooms_data
            $architectureJson = isset($payload['architecture']) ? json_encode($payload['architecture']) : '{}';
            $thumbnail = isset($payload['thumbnail']) ? $payload['thumbnail'] : null;
            
            $stmt = $this->pdo->prepare('
                INSERT INTO plugin_floorplan_rooms_data (room_id, canvas_width, canvas_height, architecture_payload, thumbnail) 
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE canvas_width = VALUES(canvas_width), canvas_height = VALUES(canvas_height), architecture_payload = VALUES(architecture_payload), thumbnail = VALUES(thumbnail)
            ');
            $stmt->execute([$roomId, $width, $height, $architectureJson, $thumbnail]);

            // 2. Refresh Assets Relation
            // Delete all existing assets for this room
            $delStmt = $this->pdo->prepare('DELETE FROM plugin_floorplan_assets WHERE room_id = ?');
            $delStmt->execute([$roomId]);

            // Insert new assets state
            if (!empty($payload['assets'])) {
                $insStmt = $this->pdo->prepare('
                    INSERT INTO plugin_floorplan_assets (room_id, hardware_id, pos_x, pos_y, rotation)
                    VALUES (?, ?, ?, ?, ?)
                ');
                foreach ($payload['assets'] as $a) {
                    $insStmt->execute([
                        $roomId,
                        $a['hardware_id'],
                        $a['pos_x'],
                        $a['pos_y'],
                        $a['rotation'] ?? 0
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
     * GET /api/search?q={query} logic
     */
    public function searchAsset(string $query): array
    {
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
        $roomStmt->execute(['q' => $like]);
        $rooms = $roomStmt->fetchAll();

        return [
            'results' => [
                'assets' => $assets,
                'rooms' => $rooms
            ]
        ];
    }

    /**
     * Delete a location with safety lock
     */
    public function deleteLocation(int $id): void
    {
        // Safety lock: check if it has children
        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM plugin_floorplan_locations WHERE parent_id = ?');
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() > 0) {
            throw new Exception("Cannot delete location. It contains nested maps or floors.");
        }
        
        $stmt = $this->pdo->prepare('DELETE FROM plugin_floorplan_locations WHERE id = ?');
        $stmt->execute([$id]);
    }

    /**
     * Move a location to a new parent
     */
    public function moveLocation(int $id, ?int $newParentId): void
    {
        $stmt = $this->pdo->prepare('UPDATE plugin_floorplan_locations SET parent_id = ? WHERE id = ?');
        $stmt->execute([$newParentId, $id]);
    }

    /**
     * Update sequence/sort order
     */
    public function updateSortOrder(int $id, int $newOrder): void
    {
        $stmt = $this->pdo->prepare("UPDATE plugin_floorplan_locations SET sequence = ? WHERE id = ?");
        $stmt->execute([$newOrder, $id]);
    }

    /**
     * GET /api/unmapped logic
     */
    public function getUnmappedAssets(): array
    {
        $stmt = $this->pdo->query('
            SELECT h.ID as hardware_id, h.NAME as hardware_name, MAX(n.IPADDRESS) as ip, MAX(n.MACADDR) as mac
            FROM hardware h
            LEFT JOIN plugin_floorplan_assets a ON h.ID = a.hardware_id
            LEFT JOIN networks n ON h.ID = n.HARDWARE_ID
            WHERE a.hardware_id IS NULL
            GROUP BY h.ID
            ORDER BY h.NAME ASC
            LIMIT 100
        ');
        
        $assets = [];
        while ($row = $stmt->fetch()) {
            $assets[] = [
                'hardware_id' => (int)$row['hardware_id'],
                'hardware_name' => $row['hardware_name'] ?: 'Unknown',
                'ip' => $row['ip'],
                'mac' => $row['mac'],
                'status' => 'online'
            ];
        }
        return $assets;
    }

    /**
     * Rename a location
     */
    public function renameLocation(int $id, string $newName): void
    {
        $stmt = $this->pdo->prepare("UPDATE plugin_floorplan_locations SET name = ? WHERE id = ?");
        $stmt->execute([$newName, $id]);
    }
}
