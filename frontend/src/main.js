/**
 * main.js — Orchestrator
 *
 * Initializes the CAD engine, loads mock data, wires up the toolbar,
 * populates all Konva layers, and binds DOM events.
 */
import Konva from 'konva';
import { api } from './api.js';
import {
  initEngine, fitStage, getStage,
  getLayerFloor, getLayerArchitecture, getLayerFurniture, getLayerAssets,
  getTransformer, applySnapOnDragEnd, snapToGrid, getRelativePointerPosition,
  zoomIn, zoomOut, resetZoom, GRID_SIZE,
} from './engine.js';
import { SHADOW_LIGHT, SHADOW_HEAVY, buildFurnitureNode, FURNITURE_TYPES } from './furniture.js';
import {
  TOOLS, setActiveTool, getActiveTool, setFloorColor, setWallType,
  handleStageMouseDown, handleStageMouseMove, handleStageMouseUp,
  handleStageDblClick, handleKeyDown, ensureSkins, createAssetNode,
  startFurniturePlacement,
} from './tools.js';
import { refreshExplorer, onExplorerSelect, clearSelection } from './explorer.js';
import './style.css';

// ── State ──────────────────────────────────────────────────────────
let roomData = null;

// ════════════════════════════════════════════════════════════════════
// Bootstrap
// ════════════════════════════════════════════════════════════════════

async function init() {
  // Load skins
  await ensureSkins();

  // Load room data
  const response = await api('ajax/get_room.php?id=1');
  roomData = response.data;

  // Init Konva engine
  initEngine('floorplan-container');

  // Render all layers
  renderFloorZones();
  renderWalls();
  renderDoors();
  renderFurniture();
  renderAssets();

  // Fit camera
  fitStage(roomData.room.width, roomData.room.height);

  // Bind events
  bindStageEvents();
  bindToolbar();
  bindCameraControls();
  bindSearch();
  bindFurnitureModal();
  bindAssetsDragDrop();
  bindBreadcrumb();

  // Initial explorer refresh
  refreshExplorer();

  console.info(
    `[floorplan] CAD Editor loaded — Room: "${roomData.room.name}" ` +
    `| ${roomData.assets.length} assets | ${roomData.furniture.length} furniture`
  );
}

// ════════════════════════════════════════════════════════════════════
// Renderers
// ════════════════════════════════════════════════════════════════════

function renderFloorZones() {
  const layer = getLayerFloor();
  (roomData.floor_zones || []).forEach(fz => {
    const rect = new Konva.Rect({
      x: fz.x, y: fz.y, width: fz.width, height: fz.height,
      fill: fz.fill,
      opacity: fz.opacity || 0.4,
      id: fz.id,
      draggable: true,
    });
    rect.setAttr('entityData', { ...fz, layer: 'floor' });
    applySnapOnDragEnd(rect);
    layer.add(rect);
  });
  layer.batchDraw();
}

function renderWalls() {
  const WALL_STYLES = {
    exterior: { stroke: '#6b7a88', strokeWidth: 12, dash: [] },
    interior: { stroke: '#8a9aaa', strokeWidth: 6,  dash: [] },
    glass:    { stroke: '#5b9ecf', strokeWidth: 4,  dash: [8, 6] },
  };

  const layer = getLayerArchitecture();
  (roomData.walls || []).forEach(w => {
    const style = WALL_STYLES[w.wallType] || WALL_STYLES.exterior;
    const line = new Konva.Line({
      points: w.points,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      dash: style.dash,
      lineCap: 'round',
      lineJoin: 'round',
      closed: w.points.length > 4 && w.points[0] === w.points[w.points.length-2] && w.points[1] === w.points[w.points.length-1],
      id: w.id,
      draggable: true,
      ...SHADOW_HEAVY,
    });
    line.setAttr('entityData', { ...w, layer: 'architecture' });
    applySnapOnDragEnd(line);
    layer.add(line);
  });
  layer.batchDraw();
}

function renderDoors() {
  const layer = getLayerArchitecture();
  (roomData.doors || []).forEach(d => {
    const rect = new Konva.Rect({
      x: d.x, y: d.y, width: d.width, height: d.height,
      fill: '#c4a882',
      stroke: '#8b6914',
      strokeWidth: 1,
      cornerRadius: 1,
      id: d.id,
      draggable: true,
      ...SHADOW_LIGHT,
    });
    rect.setAttr('entityData', { ...d, name: d.name, type: 'door', layer: 'architecture' });
    applySnapOnDragEnd(rect);
    layer.add(rect);
  });
  layer.batchDraw();
}

function renderFurniture() {
  const layer = getLayerFurniture();
  (roomData.furniture || []).forEach(f => {
    const node = buildFurnitureNode(f);
    if (node) {
      node.draggable(true);
      applySnapOnDragEnd(node);
      layer.add(node);
    }
  });
  layer.batchDraw();
}

function renderAssets() {
  const layer = getLayerAssets();
  (roomData.assets || []).forEach(asset => {
    const node = createAssetNode(asset);
    layer.add(node);
  });
  layer.batchDraw();
}

// ════════════════════════════════════════════════════════════════════
// Event Bindings
// ════════════════════════════════════════════════════════════════════

function bindStageEvents() {
  const stage = getStage();

  stage.on('mousedown touchstart', (e) => handleStageMouseDown(e));
  stage.on('mousemove touchmove', () => handleStageMouseMove());
  stage.on('mouseup touchend', () => handleStageMouseUp());
  stage.on('dblclick dbltap', () => handleStageDblClick());

  document.addEventListener('keydown', handleKeyDown);
}

function bindToolbar() {
  const buttons = document.querySelectorAll('.fp-tool-btn[data-tool]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      setActiveTool(tool);

      // Update active state
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // If furniture tool, open the modal
      if (tool === TOOLS.FURNITURE) {
        document.getElementById('furniture-modal')?.classList.add('visible');
      }
    });
  });
}

function bindCameraControls() {
  document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
  document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
  document.getElementById('btn-zoom-reset')?.addEventListener('click', resetZoom);
  document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
    fitStage(roomData.room.width, roomData.room.height);
  });

  // Floor color picker
  document.querySelectorAll('.fp-color-swatch').forEach(s => {
    s.addEventListener('click', () => {
      document.querySelectorAll('.fp-color-swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      setFloorColor(s.dataset.color);
    });
  });

  // Wall type picker
  document.querySelectorAll('.fp-wall-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.fp-wall-option').forEach(x => x.classList.remove('active'));
      opt.classList.add('active');
      setWallType(opt.dataset.type);
    });
  });
}

function bindSearch() {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');
  const results = document.getElementById('search-results');

  async function doSearch() {
    const q = input.value.trim();
    if (!q) return;

    const res = await api(`ajax/search_asset.php?q=${encodeURIComponent(q)}`);
    const items = res.data || [];

    if (items.length === 0) {
      results.innerHTML = '<div class="fp-search-results__empty">No results.</div>';
    } else {
      results.innerHTML = items.map(item => `
        <div class="fp-search-results__item" data-hw-id="${item.hardware_id}">
          <span class="fp-search-results__name">${item.hardware_name} — ${item.ip || '—'}</span>
          <span class="fp-search-results__location">📍 ${item.building_name} › ${item.floor_name} › ${item.room_name}</span>
        </div>
      `).join('');

      results.querySelectorAll('.fp-search-results__item').forEach(el => {
        el.addEventListener('click', () => {
          const hwId = parseInt(el.dataset.hwId, 10);
          highlightAsset(hwId);
          results.classList.remove('visible');
        });
      });
    }
    results.classList.add('visible');
  }

  btn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  document.addEventListener('click', (e) => {
    if (results?.classList.contains('visible') && !results.contains(e.target) && e.target !== input && e.target !== btn) {
      results.classList.remove('visible');
    }
  });
}

function highlightAsset(hardwareId) {
  const stage = getStage();
  const layer = getLayerAssets();
  const target = layer.find('Group').find(g => {
    const d = g.getAttr('assetData');
    return d && d.hardware_id === hardwareId;
  });

  if (!target) {
    notify('Asset not on this map.', 'warning');
    return;
  }

  // Pan to asset
  const scale = stage.scaleX();
  const tween = new Konva.Tween({
    node: stage,
    duration: 0.5,
    x: stage.width() / 2 - (target.x() + BOUNDING_BOX/2) * scale,
    y: stage.height() / 2 - (target.y() + BOUNDING_BOX/2) * scale,
    easing: Konva.Easings.EaseInOut,
  });
  tween.play();

  // Pulse ring
  const overlay = getStage().findOne('.layer_overlay') || getStage().getLayers()[4];
  const ring = new Konva.Circle({
    x: target.x() + BOUNDING_BOX/2,
    y: target.y() + BOUNDING_BOX/2,
    radius: BOUNDING_BOX,
    stroke: '#961B7E',
    strokeWidth: 3,
    dash: [6, 3],
    opacity: 0,
  });
  overlay.add(ring);

  const anim = new Konva.Animation((frame) => {
    const s = 0.8 + Math.sin(frame.time / 300) * 0.2;
    ring.scaleX(s); ring.scaleY(s);
    ring.opacity(0.5 + Math.sin(frame.time / 200) * 0.5);
  }, overlay);
  anim.start();

  setTimeout(() => { anim.stop(); ring.destroy(); overlay.batchDraw(); }, 3500);

  selectNodeById(target.id());
}

function bindFurnitureModal() {
  const modal = document.getElementById('furniture-modal');
  if (!modal) return;

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('visible');
  });

  // Card clicks
  modal.querySelectorAll('.fp-furniture-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      modal.classList.remove('visible');
      startFurniturePlacement(type);
      notify(`Click on the canvas to place ${FURNITURE_TYPES[type]?.label || type}.`, 'success');
    });
  });
}

function bindAssetsDragDrop() {
  // IT Assets are listed in the explorer as draggable items
  // For now, we rely on the assets being placed from mock data
}

function bindBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  if (!bc || !roomData) return;
  bc.innerHTML = `
    <a href="#">${roomData.building.name}</a>
    <span> › </span>
    <a href="#">${roomData.floor.name}</a>
    <span> › </span>
    <span>${roomData.room.name}</span>
  `;
}

// ════════════════════════════════════════════════════════════════════
// Notification
// ════════════════════════════════════════════════════════════════════

function notify(message, type = 'success') {
  const $n = document.getElementById('notification');
  if (!$n) return;
  $n.textContent = message;
  $n.className = `fp-notification fp-notification--${type} visible`;
  setTimeout(() => $n.classList.remove('visible'), 3000);
}

// ════════════════════════════════════════════════════════════════════
// Init
// ════════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
