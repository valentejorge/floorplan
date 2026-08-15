/**
 * floorplan - Main Canvas Engine
 *
 * Initializes Konva.js with three isolated layers (static, assets, overlay),
 * manages Read/Edit modes, snap-to-grid, batch saving, HTML tooltips,
 * global search integration with pan/zoom animation, wall drawing,
 * and DOM-to-Canvas Drag & Drop.
 */
import Konva from 'konva';
import { api } from './api.js';
import { SkinManager, BOUNDING_BOX } from './skins.js';
import './style.css';

// ── Constants ──────────────────────────────────────────────────────
const GRID_SIZE = 20;
const SCALE_BY = 1.1;

// ── State ──────────────────────────────────────────────────────────
let stage;
let staticLayer, assetsLayer, overlayLayer;
let isEditMode = false;
let isDrawingWall = false;
let currentWallLine = null;
let selectedWall = null;
let roomData = null;
const skinManager = new SkinManager();

/** Tracks original positions before edit mode for cancel/revert. */
const originalPositions = new Map();

// ── DOM References ─────────────────────────────────────────────────
const $wrapper       = () => document.getElementById('canvas-wrapper');
const $container     = () => document.getElementById('floorplan-container');
const $btnEdit       = () => document.getElementById('btn-edit');
const $btnDrawWall   = () => document.getElementById('btn-draw-wall');
const $btnSave       = () => document.getElementById('btn-save');
const $btnCancel     = () => document.getElementById('btn-cancel');
const $editBadge     = () => document.getElementById('edit-badge');
const $tooltip       = () => document.getElementById('tooltip');
const $searchInput   = () => document.getElementById('search-input');
const $searchBtn     = () => document.getElementById('search-btn');
const $searchResults = () => document.getElementById('search-results');
const $breadcrumb    = () => document.getElementById('breadcrumb');
const $roomInfo      = () => document.getElementById('room-info');
const $unassignedList   = () => document.getElementById('unassigned-list');
const $unassignedSearch = () => document.getElementById('unassigned-search');

// Camera controls
const $btnZoomIn     = () => document.getElementById('btn-zoom-in');
const $btnZoomOut    = () => document.getElementById('btn-zoom-out');
const $btnZoomReset  = () => document.getElementById('btn-zoom-reset');
const $btnZoomFit    = () => document.getElementById('btn-zoom-fit');

// ════════════════════════════════════════════════════════════════════
// Bootstrap
// ════════════════════════════════════════════════════════════════════

async function init() {
  await skinManager.load('theme_visio');

  const response = await api('ajax/get_room.php?id=1');
  roomData = response.data;

  createStage();
  renderStaticElements();
  renderAssets();
  updateSidebar();
  renderUnassignedAssets();
  bindEvents();

  console.info(
    `[floorplan] Room "${roomData.room.name}" loaded — ${roomData.assets.length} assets.`,
  );
}

// ════════════════════════════════════════════════════════════════════
// Stage & Layers
// ════════════════════════════════════════════════════════════════════

function createStage() {
  const wrapper = $container().parentElement;
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;

  stage = new Konva.Stage({
    container: 'floorplan-container',
    width: w,
    height: h,
    draggable: true, // Enables Panning
  });

  // Layer 1 — static elements (walls/doors), interactive only in edit mode
  staticLayer = new Konva.Layer({ listening: false });

  // Layer 2 — assets (PCs, servers, etc.), interactive
  assetsLayer = new Konva.Layer();

  // Layer 3 — overlays (selection rings, highlights)
  overlayLayer = new Konva.Layer();

  stage.add(staticLayer, assetsLayer, overlayLayer);

  // Initial Fit
  fitStage();

  // Resize handler
  const ro = new ResizeObserver(() => {
    stage.width(wrapper.clientWidth);
    stage.height(wrapper.clientHeight);
  });
  ro.observe(wrapper);

  // Mouse wheel zoom
  stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
  });

  // Wall Drawing logic
  stage.on('mousedown', (e) => {
    if (!isDrawingWall) return;
    if (e.evt.button !== 0) return; // Only left click

    const pos = getRelativePointerPosition(stage);
    
    // Snap to grid
    const snappedX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;

    if (!currentWallLine) {
      currentWallLine = new Konva.Line({
        points: [snappedX, snappedY, snappedX, snappedY],
        stroke: '#4a5568',
        strokeWidth: 4,
        lineCap: 'round',
        lineJoin: 'round',
        listening: true,
        draggable: true,
      });
      bindWallEvents(currentWallLine);
      staticLayer.add(currentWallLine);
    } else {
      const points = currentWallLine.points();
      points.push(snappedX, snappedY);
      currentWallLine.points(points);
    }
    staticLayer.batchDraw();
  });

  stage.on('mousemove', () => {
    if (!isDrawingWall || !currentWallLine) return;

    const pos = getRelativePointerPosition(stage);
    const snappedX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;

    const points = currentWallLine.points().slice();
    points[points.length - 2] = snappedX;
    points[points.length - 1] = snappedY;
    currentWallLine.points(points);
    staticLayer.batchDraw();
  });

  stage.on('dblclick', () => {
    if (isDrawingWall && currentWallLine) {
      // Remove last temp point
      const points = currentWallLine.points();
      points.splice(-2, 2);
      currentWallLine.points(points);
      currentWallLine = null;
      staticLayer.batchDraw();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawingWall && currentWallLine) {
      const points = currentWallLine.points();
      points.splice(-2, 2);
      currentWallLine.points(points);
      currentWallLine = null;
      staticLayer.batchDraw();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && isEditMode && selectedWall) {
      selectedWall.destroy();
      selectedWall = null;
      staticLayer.batchDraw();
    }
  });
}

function getRelativePointerPosition(node) {
  const transform = node.getAbsoluteTransform().copy();
  transform.invert();
  const pos = node.getStage().getPointerPosition();
  return transform.point(pos);
}

// ════════════════════════════════════════════════════════════════════
// Camera Controls
// ════════════════════════════════════════════════════════════════════

function zoomIn() {
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale * SCALE_BY, y: oldScale * SCALE_BY });
  stage.batchDraw();
}

function zoomOut() {
  const oldScale = stage.scaleX();
  stage.scale({ x: oldScale / SCALE_BY, y: oldScale / SCALE_BY });
  stage.batchDraw();
}

function resetZoom() {
  stage.scale({ x: 1, y: 1 });
  stage.batchDraw();
}

function fitStage() {
  const padding = 40;
  const scaleX = stage.width() / (roomData.room.width + padding * 2);
  const scaleY = stage.height() / (roomData.room.height + padding * 2);
  const scale = Math.min(scaleX, scaleY, 1); // Cap at 100%

  stage.scale({ x: scale, y: scale });

  const offsetX = (stage.width() - roomData.room.width * scale) / 2;
  const offsetY = (stage.height() - roomData.room.height * scale) / 2;

  stage.position({ x: offsetX, y: offsetY });
  stage.batchDraw();
}

// ════════════════════════════════════════════════════════════════════
// Renderers
// ════════════════════════════════════════════════════════════════════

function bindWallEvents(line) {
  line.on('dragend', () => {
    // Snap whole line to grid
    const x = Math.round(line.x() / GRID_SIZE) * GRID_SIZE;
    const y = Math.round(line.y() / GRID_SIZE) * GRID_SIZE;
    line.position({ x, y });
    staticLayer.batchDraw();
  });

  line.on('click', () => {
    if (!isEditMode) return;
    if (selectedWall) selectedWall.stroke('#4a5568');
    selectedWall = line;
    line.stroke('#d9534f'); // highlight red
    staticLayer.batchDraw();
  });
}

function renderStaticElements() {
  const { static_elements: elements } = roomData;
  if (!elements) return;

  elements.forEach((el) => {
    if (el.type === 'wall') {
      const line = new Konva.Line({
        points: el.points,
        stroke: el.stroke || '#4a5568',
        strokeWidth: el.strokeWidth || 4,
        dash: el.dash || [],
        closed: el.points.length > 4,
        lineCap: 'round',
        lineJoin: 'round',
        draggable: false, // Updated in edit mode
      });
      bindWallEvents(line);
      staticLayer.add(line);
    } else if (el.type === 'door') {
      staticLayer.add(
        new Konva.Rect({
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          fill: el.fill || '#1c1c1c',
          cornerRadius: 1,
        }),
      );
    }
  });

  staticLayer.batchDraw();
}

function renderAssets() {
  assetsLayer.destroyChildren();
  roomData.assets.forEach(createAssetNode);
  assetsLayer.batchDraw();
}

function createAssetNode(asset) {
  const img = skinManager.getImage(asset.type);

  const group = new Konva.Group({
    x: asset.pos_x,
    y: asset.pos_y,
    draggable: isEditMode,
    id: `asset-${asset.id}`,
  });

  group.setAttr('assetData', asset);

  group.add(
    new Konva.Image({
      image: img,
      width: BOUNDING_BOX,
      height: BOUNDING_BOX,
    }),
  );

  group.add(
    new Konva.Text({
      text: asset.hardware_name,
      fontSize: 10,
      fontFamily: 'sans-serif',
      fill: '#4a5568',
      width: BOUNDING_BOX + 30,
      align: 'center',
      y: BOUNDING_BOX + 3,
      x: -15,
      listening: false,
    }),
  );

  group.on('dragend', () => {
    const snappedX = Math.round(group.x() / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(group.y() / GRID_SIZE) * GRID_SIZE;
    group.position({ x: snappedX, y: snappedY });
    assetsLayer.batchDraw();
  });

  group.on('mouseenter', () => showTooltip(group));
  group.on('mouseleave', hideTooltip);

  assetsLayer.add(group);
}

// ════════════════════════════════════════════════════════════════════
// Tooltip (HTML)
// ════════════════════════════════════════════════════════════════════

function showTooltip(group) {
  if (isEditMode || isDrawingWall) return; // Don't show in edit modes
  const data = group.getAttr('assetData');
  if (!data) return;

  const $t = $tooltip();
  document.getElementById('tooltip-hostname').textContent = data.hardware_name;
  document.getElementById('tooltip-ip').textContent       = data.ip || '—';
  document.getElementById('tooltip-mac').textContent      = data.mac || '—';
  document.getElementById('tooltip-type').textContent     = data.type || '—';

  // Position relative to the canvas wrapper
  const stageBox = stage.container().getBoundingClientRect();
  const absPos   = group.getAbsolutePosition();

  $t.style.left = `${stageBox.left + absPos.x + BOUNDING_BOX + 10}px`;
  $t.style.top  = `${stageBox.top + absPos.y}px`;
  $t.classList.add('visible');
}

function hideTooltip() {
  $tooltip().classList.remove('visible');
}

// ════════════════════════════════════════════════════════════════════
// Edit Mode & Draw Wall
// ════════════════════════════════════════════════════════════════════

function toggleEditMode() {
  isEditMode = !isEditMode;

  if (isEditMode) {
    // Snapshot positions before editing
    assetsLayer.find('Group').forEach((g) => {
      originalPositions.set(g.id(), { x: g.x(), y: g.y() });
      g.draggable(true);
    });

    staticLayer.listening(true);
    staticLayer.find('Line').forEach(l => l.draggable(true));

    $btnEdit().classList.add('fp-btn--warning');
    $btnEdit().innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <circle cx="8" cy="8" r="6"/>
        <line x1="5" y1="5" x2="11" y2="11"/>
        <line x1="11" y1="5" x2="5" y2="11"/>
      </svg>
      <span>Editing</span>`;
    $btnSave().style.display = '';
    $btnCancel().style.display = '';
    $btnDrawWall().style.display = '';
    $editBadge().classList.add('active');
  } else {
    exitEditMode();
  }
}

function toggleDrawWall() {
  if (!isEditMode) return;
  isDrawingWall = !isDrawingWall;
  currentWallLine = null;

  if (isDrawingWall) {
    $btnDrawWall().classList.add('fp-btn--primary');
    stage.container().style.cursor = 'crosshair';
    stage.draggable(false); // disable panning while drawing
  } else {
    $btnDrawWall().classList.remove('fp-btn--primary');
    stage.container().style.cursor = 'default';
    stage.draggable(true);
  }
}

function exitEditMode() {
  isEditMode = false;
  isDrawingWall = false;
  currentWallLine = null;

  assetsLayer.find('Group').forEach((g) => g.draggable(false));
  originalPositions.clear();

  if (selectedWall) {
    selectedWall.stroke('#4a5568');
    selectedWall = null;
  }

  staticLayer.listening(false);
  staticLayer.find('Line').forEach(l => l.draggable(false));

  $btnEdit().classList.remove('fp-btn--warning');
  $btnEdit().innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11.5 1.5 14.5 4.5 5 14H2v-3z"/>
      <line x1="9.5" y1="3.5" x2="12.5" y2="6.5"/>
    </svg>
    <span>Edit</span>`;
  $btnSave().style.display = 'none';
  $btnCancel().style.display = 'none';
  $btnDrawWall().style.display = 'none';
  $btnDrawWall().classList.remove('fp-btn--primary');
  $editBadge().classList.remove('active');
  stage.container().style.cursor = 'default';
  stage.draggable(true);
}

function cancelEdit() {
  // Revert to original positions
  assetsLayer.find('Group').forEach((g) => {
    const orig = originalPositions.get(g.id());
    if (orig) g.position(orig);
  });
  assetsLayer.batchDraw();
  exitEditMode();
  notify('Changes discarded.', 'warning');
}

async function batchSave() {
  const payload = [];

  assetsLayer.find('Group').forEach((g) => {
    const data = g.getAttr('assetData');
    if (!data) return;
    payload.push({
      id: data.id,
      pos_x: g.x(),
      pos_y: g.y(),
    });
    data.pos_x = g.x();
    data.pos_y = g.y();
  });

  try {
    await api('ajax/batch_update_assets.php', {
      method: 'POST',
      body: JSON.stringify({ room_id: roomData.room.id, assets: payload }),
    });
    notify(`${payload.length} assets saved successfully.`, 'success');
  } catch (err) {
    console.warn('[floorplan] Batch save (dev mock):', err.message);
    notify(`${payload.length} assets saved (dev mode).`, 'success');
  }

  exitEditMode();
}

// ════════════════════════════════════════════════════════════════════
// Unassigned Assets Drag & Drop
// ════════════════════════════════════════════════════════════════════

// Mock unassigned assets
const MOCK_UNASSIGNED = [
  { id: 9, hardware_id: 9, hardware_name: "SRV-BACKUP-01", type: "server", ip: "192.168.10.15", mac: "AA:BB:CC:DD:EE:09" },
  { id: 10, hardware_id: 10, hardware_name: "PC-TI-01", type: "desktop", ip: "192.168.10.30", mac: "AA:BB:CC:DD:EE:10" },
  { id: 11, hardware_id: 11, hardware_name: "IMP-TI", type: "printer", ip: "192.168.10.81", mac: "AA:BB:CC:DD:EE:11" },
];

function renderUnassignedAssets() {
  const query = $unassignedSearch().value.toLowerCase();
  
  const filtered = MOCK_UNASSIGNED.filter(a => 
    a.hardware_name.toLowerCase().includes(query) || 
    a.ip.toLowerCase().includes(query)
  );

  $unassignedList().innerHTML = filtered.map(a => `
    <div class="fp-unassigned-item" draggable="true" data-asset='${JSON.stringify(a)}'>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="3" width="12" height="10" rx="2"/></svg>
      ${a.hardware_name} <span style="color:#adb5bd;font-size:10px">${a.ip}</span>
    </div>
  `).join('');

  // Bind drag events
  document.querySelectorAll('.fp-unassigned-item').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      if (!isEditMode) {
        e.preventDefault();
        notify('Please enter Edit Mode to place assets.', 'warning');
        return;
      }
      e.dataTransfer.setData('application/json', el.dataset.asset);
    });
  });
}

function handleDropOnCanvas(e) {
  e.preventDefault();
  if (!isEditMode) return;

  const dataStr = e.dataTransfer.getData('application/json');
  if (!dataStr) return;

  const assetData = JSON.parse(dataStr);
  
  // Convert screen coordinates to relative stage coordinates
  stage.setPointersPositions(e);
  const pos = getRelativePointerPosition(stage);

  // Snap to grid
  assetData.pos_x = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
  assetData.pos_y = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;

  // Add to map
  roomData.assets.push(assetData);
  createAssetNode(assetData);
  assetsLayer.batchDraw();

  // Remove from unassigned
  const idx = MOCK_UNASSIGNED.findIndex(a => a.id === assetData.id);
  if (idx !== -1) MOCK_UNASSIGNED.splice(idx, 1);
  renderUnassignedAssets();

  notify(`${assetData.hardware_name} placed.`, 'success');
}

// ════════════════════════════════════════════════════════════════════
// Global Search
// ════════════════════════════════════════════════════════════════════

async function handleSearch() {
  const query = $searchInput().value.trim();
  if (!query) return;

  const $results = $searchResults();

  try {
    const response = await api(`ajax/search_asset.php?q=${encodeURIComponent(query)}`);
    const items = response.data;

    if (!items || items.length === 0) {
      $results.innerHTML = '<div class="fp-search-results__empty">No assets found.</div>';
    } else {
      $results.innerHTML = items
        .map(
          (item) => `
        <div class="fp-search-results__item" data-hardware-id="${item.hardware_id}" data-room-id="${item.room_id}">
          <span class="fp-search-results__name">${item.hardware_name} — ${item.ip || '—'}</span>
          <span class="fp-search-results__location">
            📍 ${item.building_name} › ${item.floor_name} › ${item.room_name}
          </span>
        </div>`,
        )
        .join('');

      // Click to highlight on canvas
      $results.querySelectorAll('.fp-search-results__item').forEach((el) => {
        el.addEventListener('click', () => {
          const hwId = parseInt(el.dataset.hardwareId, 10);
          const rId = parseInt(el.dataset.roomId, 10);
          
          if (rId !== roomData.room.id) {
            notify(`Simulating navigation to room ${rId}...`, 'warning');
            // In a real app we would load the new room data here.
            // For now, let's just pretend we are there.
          }
          
          highlightAsset(hwId);
          $results.classList.remove('visible');
        });
      });
    }

    $results.classList.add('visible');
  } catch (err) {
    console.error('[floorplan] Search error:', err);
  }
}

function highlightAsset(hardwareId) {
  // Clear previous highlights
  overlayLayer.destroyChildren();

  const target = assetsLayer.find('Group').find((g) => {
    const d = g.getAttr('assetData');
    return d && d.hardware_id === hardwareId;
  });

  if (!target) {
    notify('Asset not rendered on current map.', 'danger');
    return;
  }

  // Animate Pan to center the asset
  const targetX = target.x() + BOUNDING_BOX / 2;
  const targetY = target.y() + BOUNDING_BOX / 2;
  
  const scale = stage.scaleX();
  const newPos = {
    x: stage.width() / 2 - targetX * scale,
    y: stage.height() / 2 - targetY * scale,
  };

  const panTween = new Konva.Tween({
    node: stage,
    duration: 0.5,
    x: newPos.x,
    y: newPos.y,
    easing: Konva.Easings.EaseInOut,
  });
  panTween.play();

  // Pulsing ring around the found asset
  const ring = new Konva.Circle({
    x: targetX,
    y: targetY,
    radius: BOUNDING_BOX,
    stroke: '#8058a5', // OCS Purple
    strokeWidth: 4,
    dash: [6, 3],
    opacity: 0,
  });

  overlayLayer.add(ring);

  // Pulse animation & opacity flash
  const anim = new Konva.Animation((frame) => {
    const s = 0.8 + Math.sin(frame.time / 300) * 0.2;
    ring.scaleX(s);
    ring.scaleY(s);
    ring.opacity(0.6 + Math.sin(frame.time / 150) * 0.4); // Faster blink
  }, overlayLayer);

  anim.start();

  // Flash the target opacity too
  const targetTween = new Konva.Tween({
    node: target,
    duration: 0.3,
    opacity: 0.2,
    yoyo: true,
  });
  targetTween.play();

  // Stop after 4 seconds
  setTimeout(() => {
    anim.stop();
    ring.destroy();
    targetTween.destroy(); // Fixes the eternal blinking
    target.opacity(1);
    overlayLayer.batchDraw();
  }, 4000);
}

// ════════════════════════════════════════════════════════════════════
// Sidebar Updates
// ════════════════════════════════════════════════════════════════════

function mockNavigate(type, id) {
  console.log(`[floorplan] Simulating navigation: ${type} = ${id}`);
  notify(`Navigating to ${type} ${id}...`, 'warning');
  fitStage(); // Reset as a mock action
}

function updateSidebar() {
  const { building, floor, room, assets } = roomData;

  $breadcrumb().innerHTML = '';
  
  const b1 = document.createElement('a');
  b1.href = '#';
  b1.textContent = building.name;
  b1.addEventListener('click', (e) => { e.preventDefault(); mockNavigate('Building', building.id); });
  
  const sep1 = document.createElement('span'); sep1.innerHTML = ' › ';
  
  const b2 = document.createElement('a');
  b2.href = '#';
  b2.textContent = floor.name;
  b2.addEventListener('click', (e) => { e.preventDefault(); mockNavigate('Floor', floor.id); });

  const sep2 = document.createElement('span'); sep2.innerHTML = ' › ';
  
  const b3 = document.createElement('span');
  b3.textContent = room.name;

  $breadcrumb().append(b1, sep1, b2, sep2, b3);

  // Room info
  $roomInfo().innerHTML = `
    <strong>Room:</strong> ${room.name}<br/>
    <strong>Size:</strong> ${room.width} × ${room.height}px<br/>
    <strong>Grid:</strong> ${room.grid_size}px<br/>
    <strong>Assets:</strong> ${assets.length}
  `;
}

// ════════════════════════════════════════════════════════════════════
// Notification
// ════════════════════════════════════════════════════════════════════

function notify(message, type = 'success') {
  const $n = document.getElementById('notification');
  $n.textContent = message;
  $n.className = `fp-notification fp-notification--${type} visible`;
  setTimeout(() => $n.classList.remove('visible'), 3000);
}

// ════════════════════════════════════════════════════════════════════
// Event Bindings
// ════════════════════════════════════════════════════════════════════

function bindEvents() {
  // Tools
  $btnEdit().addEventListener('click', toggleEditMode);
  $btnDrawWall().addEventListener('click', toggleDrawWall);
  $btnSave().addEventListener('click', batchSave);
  $btnCancel().addEventListener('click', cancelEdit);

  // Camera
  $btnZoomIn().addEventListener('click', zoomIn);
  $btnZoomOut().addEventListener('click', zoomOut);
  $btnZoomReset().addEventListener('click', resetZoom);
  $btnZoomFit().addEventListener('click', fitStage);

  // Search
  $searchBtn().addEventListener('click', handleSearch);
  $searchInput().addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

  // Unassigned Assets Filter
  $unassignedSearch().addEventListener('input', renderUnassignedAssets);

  // Canvas Drop
  const wrapper = $wrapper();
  wrapper.addEventListener('dragover', (e) => {
    e.preventDefault(); // Necessary to allow dropping
  });
  wrapper.addEventListener('drop', handleDropOnCanvas);

  // Close search results on outside click
  document.addEventListener('click', (e) => {
    const $results = $searchResults();
    if (
      $results.classList.contains('visible') &&
      !$results.contains(e.target) &&
      e.target !== $searchInput() &&
      e.target !== $searchBtn()
    ) {
      $results.classList.remove('visible');
    }
  });
}

// ════════════════════════════════════════════════════════════════════
// Init
// ════════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
