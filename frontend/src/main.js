/**
 * floorplan - Entrypoint
 *
 * Inicializa o canvas Konva.js e carrega os dados do mapa
 * via interceptor de API (mock em dev, PHP em produção).
 */
import Konva from 'konva';
import { api } from './api.js';

/**
 * Inicializa o stage Konva.js com as camadas definidas
 * na arquitetura (estática, ativos, overlays).
 */
async function init() {
  const container = document.getElementById('floorplan-container');
  if (!container) {
    console.error('[floorplan] Container #floorplan-container não encontrado.');
    return;
  }

  // Carrega os dados do mapa (mock em dev)
  const response = await api('ajax/get_map.php?id=1');
  const { map, assets, static_elements: staticElements } = response.data;

  // Stage principal
  const stage = new Konva.Stage({
    container: 'floorplan-container',
    width: map.width,
    height: map.height,
  });

  // Camada 1: Elementos estáticos (paredes, portas) — listening: false para performance
  const staticLayer = new Konva.Layer({ listening: false });

  // Camada 2: Ativos (PCs, servidores, impressoras) — interativa
  const assetsLayer = new Konva.Layer();

  // Camada 3: Overlays (tooltips, seleção)
  const overlayLayer = new Konva.Layer();

  // Renderiza elementos estáticos
  staticElements.forEach((el) => {
    if (el.type === 'wall') {
      staticLayer.add(new Konva.Line({
        points: el.points,
        stroke: el.stroke,
        strokeWidth: el.strokeWidth,
        closed: el.points.length > 4,
      }));
    } else if (el.type === 'door') {
      staticLayer.add(new Konva.Rect({
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        fill: el.fill,
      }));
    }
  });

  // Renderiza ativos
  assets.forEach((asset) => {
    const group = new Konva.Group({
      x: asset.x,
      y: asset.y,
      draggable: false, // Ativado apenas no Modo de Edição
      id: `asset-${asset.id}`,
    });

    group.add(new Konva.Rect({
      width: asset.width,
      height: asset.height,
      fill: getAssetColor(asset.type),
      cornerRadius: 4,
      stroke: '#333',
      strokeWidth: 1,
    }));

    group.add(new Konva.Text({
      text: asset.name,
      fontSize: 10,
      fill: '#333',
      width: asset.width + 20,
      align: 'center',
      y: asset.height + 4,
      x: -10,
    }));

    assetsLayer.add(group);
  });

  stage.add(staticLayer);
  stage.add(assetsLayer);
  stage.add(overlayLayer);

  console.info(`[floorplan] Mapa "${map.name}" carregado com ${assets.length} ativos.`);
}

/**
 * Retorna a cor de preenchimento de acordo com o tipo do ativo.
 *
 * @param {string} type
 * @returns {string}
 */
function getAssetColor(type) {
  const colors = {
    server: '#4A90D9',
    desktop: '#5CB85C',
    printer: '#F0AD4E',
    switch: '#D9534F',
  };
  return colors[type] || '#999';
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
