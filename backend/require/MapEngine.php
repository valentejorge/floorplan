<?php

declare(strict_types=1);

namespace Floorplan;

use PDO;

/**
 * MapEngine - Lógica de negócio do plugin floorplan.
 *
 * Responsável por todas as operações CRUD sobre mapas (plantas baixas),
 * ativos posicionados e revisões de auditoria.
 *
 * Utiliza PDO puro para queries, permitindo compatibilidade com
 * MariaDB (produção/OCS) e SQLite (testes unitários).
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

    /**
     * Retorna os dados de um mapa pelo ID, incluindo seus ativos posicionados.
     *
     * @param int $mapId
     * @return array{map: array, assets: array}|null
     */
    public function getMap(int $mapId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM plugin_maps WHERE id = :id');
        $stmt->execute(['id' => $mapId]);
        $map = $stmt->fetch();

        if (!$map) {
            return null;
        }

        $stmt = $this->pdo->prepare(
            'SELECT a.*, h.NAME as hardware_name
             FROM plugin_map_assets a
             LEFT JOIN hardware h ON h.ID = a.hardware_id
             WHERE a.map_id = :map_id'
        );
        $stmt->execute(['map_id' => $mapId]);
        $assets = $stmt->fetchAll();

        return [
            'map' => $map,
            'assets' => $assets,
        ];
    }

    /**
     * Cria um novo mapa (planta baixa).
     *
     * @param string $name
     * @param int $width
     * @param int $height
     * @param int $gridSize
     * @return int ID do mapa criado
     */
    public function createMap(string $name, int $width, int $height, int $gridSize = 20): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO plugin_maps (name, width, height, grid_size, created_at, updated_at)
             VALUES (:name, :width, :height, :grid_size, :now, :now2)'
        );

        $now = date('Y-m-d H:i:s');
        $stmt->execute([
            'name' => $name,
            'width' => $width,
            'height' => $height,
            'grid_size' => $gridSize,
            'now' => $now,
            'now2' => $now,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Salvamento em lote (batch) de posições de ativos.
     * Atualiza as coordenadas de múltiplos ativos de uma vez e cria uma revisão.
     *
     * @param int $mapId
     * @param array $assets Lista de ['id' => int, 'x' => int, 'y' => int, 'rotation' => int]
     * @param string $userId Identificador do usuário logado no OCS
     * @return int ID da revisão criada
     */
    public function batchUpdateAssets(int $mapId, array $assets, string $userId): int
    {
        $this->pdo->beginTransaction();

        try {
            $stmt = $this->pdo->prepare(
                'UPDATE plugin_map_assets
                 SET x = :x, y = :y, rotation = :rotation
                 WHERE id = :id AND map_id = :map_id'
            );

            foreach ($assets as $asset) {
                $stmt->execute([
                    'x' => $asset['x'],
                    'y' => $asset['y'],
                    'rotation' => $asset['rotation'] ?? 0,
                    'id' => $asset['id'],
                    'map_id' => $mapId,
                ]);
            }

            // Atualiza o timestamp do mapa
            $this->pdo->prepare('UPDATE plugin_maps SET updated_at = :now WHERE id = :id')
                ->execute(['now' => date('Y-m-d H:i:s'), 'id' => $mapId]);

            // Gera snapshot para auditoria (Time Travel)
            $revisionId = $this->createRevision($mapId, $userId);

            $this->pdo->commit();

            return $revisionId;
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Cria uma revisão (snapshot imutável) do estado atual do mapa.
     *
     * @param int $mapId
     * @param string $userId
     * @return int ID da revisão criada
     */
    private function createRevision(int $mapId, string $userId): int
    {
        // Captura o estado final completo do mapa
        $snapshot = $this->getMap($mapId);

        $stmt = $this->pdo->prepare(
            'INSERT INTO plugin_map_revisions (map_id, user_id, created_at, map_snapshot)
             VALUES (:map_id, :user_id, :created_at, :map_snapshot)'
        );

        $stmt->execute([
            'map_id' => $mapId,
            'user_id' => $userId,
            'created_at' => date('Y-m-d H:i:s'),
            'map_snapshot' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    /**
     * Lista todas as revisões de um mapa (para o Time Travel).
     *
     * @param int $mapId
     * @return array
     */
    public function getRevisions(int $mapId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, map_id, user_id, created_at
             FROM plugin_map_revisions
             WHERE map_id = :map_id
             ORDER BY id DESC'
        );
        $stmt->execute(['map_id' => $mapId]);

        return $stmt->fetchAll();
    }

    /**
     * Retorna o snapshot completo de uma revisão específica.
     *
     * @param int $revisionId
     * @return array|null
     */
    public function getRevisionSnapshot(int $revisionId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT * FROM plugin_map_revisions WHERE id = :id'
        );
        $stmt->execute(['id' => $revisionId]);
        $revision = $stmt->fetch();

        if (!$revision) {
            return null;
        }

        $revision['map_snapshot'] = json_decode($revision['map_snapshot'], true);

        return $revision;
    }
}
