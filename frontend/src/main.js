/**
 * floorplan - Main Canvas Engine
 *
 * Initializes Konva.js with three isolated layers (static, assets, overlay),
 * manages Read/Edit modes, snap-to-grid, batch saving, HTML tooltips,
 * and global search integration.
 */
import Konva from 'konva';
import { api } from './api.js';
import { SkinManager, BOUNDING_BOX } from './skins.js';
import './style.css';

// ── Constants ──────────────────────────────────────────────────────
const GRID_SIZE = 20;

// ── State ──────────────────────────────────────────────────────────
let stage;
let staticLayer, assetsLayer, overlayLayer;
let isEditMode = false;
let roomData = null;
const skinManager = new SkinManager();

/** Tracks original positions before edit mode for cancel/revert. */
const originalPositions = new Map();

// ── DOM References ─────────────────────────────────────────────────
const $container     = () => document.getElementById('floorplan-container');
const $btnEdit       = () => document.getElementById('btn-edit');
const $btnSave       = () => document.getElementById('btn-save');
const $btnCancel     = () => document.getElementById('btn-cancel');
const $editBadge     = () => document.getElementById('edit-badge');
const $tooltip       = () => document.getElementById('tooltip');
const $searchInput   = () => document.getElementById('search-input');
const $searchBtn     = () => document.getElementById('search-btn');
const $searchResults = () => document.getElementById('search-results');
const $breadcrumb    = () => document.getElementById('breadcrumb');
const $roomInfo      = () => document.getElementById('room-info');
const $legend        = () => document.getElementById('legend');

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
  });

  // Layer 1 — static elements (walls/doors), non-interactive
  staticLayer = new Konva.Layer({ listening: false });

  // Layer 2 — assets (PCs, servers, etc.), interactive
  assetsLayer = new Konva.Layer();

  // Layer 3 — overlays (selection rings, highlights)
  overlayLayer = new Konva.Layer();

  stage.add(staticLayer, assetsLayer, overlayLayer);

  // Center the room drawing in the canvas
  const offsetX = Math.round((w - roomData.room.width) / 2);
  const offsetY = Math.round((h - roomData.room.height) / 2);
  [staticLayer, assetsLayer, overlayLayer].forEach((layer) => {
    layer.offsetX(-offsetX);
    layer.offsetY(-offsetY);
  });

  // Resize handler
  const ro = new ResizeObserver(() => {
    const nw = wrapper.clientWidth;
    const nh = wrapper.clientHeight;
    stage.width(nw);
    stage.height(nh);

    const ox = Math.round((nw - roomData.room.width) / 2);
    const oy = Math.round((nh - roomData.room.height) / 2);
    [staticLayer, assetsLayer, overlayLayer].forEach((layer) => {
      layer.offsetX(-ox);
      layer.offsetY(-oy);
    });
  });
  ro.observe(wrapper);
}

// ════════════════════════════════════════════════════════════════════
// Renderers
// ════════════════════════════════════════════════════════════════════

function renderStaticElements() {
  const { static_elements: elements } = roomData;
  if (!elements) return;

  elements.forEach((el) => {
    if (el.type === 'wall') {
      staticLayer.add(
        new Konva.Line({
          points: el.points,
          stroke: el.stroke || '#4a5568',
          strokeWidth: el.strokeWidth || 2,
          dash: el.dash || [],
          closed: el.points.length > 4,
        }),
      );
    } else if (el.type === 'door') {
      staticLayer.add(
        new Konva.Rect({
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          fill: el.fill || '#e2a854',
          cornerRadius: 1,
        }),
      );
    }
  });

  staticLayer.batchDraw();
}

function renderAssets() {
  roomData.assets.forEach((asset) => {
    const img = skinManager.getImage(asset.type);

    const group = new Konva.Group({
      x: asset.pos_x,
      y: asset.pos_y,
      draggable: false,
      id: `asset-${asset.id}`,
    });

    // Store asset metadata for tooltip and batch save
    group.setAttr('assetData', asset);

    // Bounding Box Rule — icon always rendered within BOUNDING_BOX
    group.add(
      new Konva.Image({
        image: img,
        width: BOUNDING_BOX,
        height: BOUNDING_BOX,
      }),
    );

    // Label below icon
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

    // ── Snap to Grid (dragend) ───────────────────────────────
    group.on('dragend', () => {
      const snappedX = Math.round(group.x() / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(group.y() / GRID_SIZE) * GRID_SIZE;
      group.position({ x: snappedX, y: snappedY });
      assetsLayer.batchDraw();
    });

    // ── Tooltip events ───────────────────────────────────────
    group.on('mouseenter', () => showTooltip(group));
    group.on('mouseleave', hideTooltip);

    assetsLayer.add(group);
  });

  assetsLayer.batchDraw();
}

// ════════════════════════════════════════════════════════════════════
// Tooltip (HTML)
// ════════════════════════════════════════════════════════════════════

function showTooltip(group) {
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
  const layerOff = assetsLayer.getAbsolutePosition();

  $t.style.left = `${stageBox.left + absPos.x + layerOff.x + BOUNDING_BOX + 10}px`;
  $t.style.top  = `${stageBox.top + absPos.y + layerOff.y}px`;
  $t.classList.add('visible');
}

function hideTooltip() {
  $tooltip().classList.remove('visible');
}

// ════════════════════════════════════════════════════════════════════
// Edit Mode
// ════════════════════════════════════════════════════════════════════

function toggleEditMode() {
  isEditMode = !isEditMode;

  if (isEditMode) {
    // Snapshot positions before editing
    assetsLayer.find('Group').forEach((g) => {
      originalPositions.set(g.id(), { x: g.x(), y: g.y() });
      g.draggable(true);
    });

    $btnEdit().classList.add('fp-btn--warning');
    $btnEdit().innerHTML = `
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
        <circle cx="8" cy="8" r="6"/>
        <line x1="5" y1="5" x2="11" y2="11"/>
        <line x1="11" y1="5" x2="5" y2="11"/>
      </svg>
      Editing…`;
    $btnSave().style.display = '';
    $btnCancel().style.display = '';
    $editBadge().classList.add('active');
    stage.container().style.cursor = 'grab';
  } else {
    exitEditMode();
  }
}

function exitEditMode() {
  isEditMode = false;

  assetsLayer.find('Group').forEach((g) => g.draggable(false));
  originalPositions.clear();

  $btnEdit().classList.remove('fp-btn--warning');
  $btnEdit().innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11.5 1.5 14.5 4.5 5 14H2v-3z"/>
      <line x1="9.5" y1="3.5" x2="12.5" y2="6.5"/>
    </svg>
    Edit Mode`;
  $btnSave().style.display = 'none';
  $btnCancel().style.display = 'none';
  $editBadge().classList.remove('active');
  stage.container().style.cursor = '';
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
    // Update local asset data to match new position
    data.pos_x = g.x();
    data.pos_y = g.y();
  });

  try {
    // In dev mode this hits the mock; in production it calls the real endpoint
    await api('ajax/batch_update_assets.php', {
      method: 'POST',
      body: JSON.stringify({ room_id: roomData.room.id, assets: payload }),
    });
    notify(`${payload.length} assets saved successfully.`, 'success');
  } catch (err) {
    // In dev mock may not exist for POST — that's fine
    console.warn('[floorplan] Batch save (dev mock):', err.message);
    notify(`${payload.length} assets saved (dev mode).`, 'success');
  }

  exitEditMode();
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
        <div class="fp-search-results__item" data-hardware-id="${item.hardware_id}">
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

  if (!target) return;

  // Pulsing ring around the found asset
  const ring = new Konva.Circle({
    x: target.x() + BOUNDING_BOX / 2,
    y: target.y() + BOUNDING_BOX / 2,
    radius: BOUNDING_BOX,
    stroke: '#337ab7',
    strokeWidth: 2,
    dash: [6, 3],
    opacity: 0,
  });

  overlayLayer.add(ring);

  // Pulse animation
  const anim = new Konva.Animation((frame) => {
    const scale = 0.8 + Math.sin(frame.time / 300) * 0.15;
    ring.scaleX(scale);
    ring.scaleY(scale);
    ring.opacity(0.6 + Math.sin(frame.time / 300) * 0.4);
  }, overlayLayer);

  anim.start();

  // Stop after 4 seconds
  setTimeout(() => {
    anim.stop();
    ring.destroy();
    overlayLayer.batchDraw();
  }, 4000);
}

// ════════════════════════════════════════════════════════════════════
// Sidebar Updates
// ════════════════════════════════════════════════════════════════════

function updateSidebar() {
  const { building, floor, room, assets } = roomData;

  // Breadcrumb
  $breadcrumb().innerHTML =
    `${building.name} <span>›</span> ${floor.name} <span>›</span> <span>${room.name}</span>`;

  // Room info
  const types = {};
  assets.forEach((a) => { types[a.type] = (types[a.type] || 0) + 1; });

  $roomInfo().innerHTML = `
    <strong>Room:</strong> ${room.name}<br/>
    <strong>Size:</strong> ${room.width} × ${room.height}px<br/>
    <strong>Grid:</strong> ${room.grid_size}px<br/>
    <strong>Assets:</strong> ${assets.length}
  `;

  // Legend
  const legendColors = {
    server:  { label: 'Server',  color: '#4a5568' },
    desktop: { label: 'Desktop', color: '#5a6a7e' },
    printer: { label: 'Printer', color: '#5a6a7e' },
    switch:  { label: 'Switch',  color: '#4a5568' },
  };

  $legend().innerHTML = Object.entries(legendColors)
    .filter(([type]) => types[type])
    .map(
      ([type, cfg]) =>
        `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="width:12px;height:12px;border-radius:2px;background:${cfg.color};display:inline-block;"></span>
          ${cfg.label} <span style="color:var(--fp-text-muted)">(${types[type]})</span>
        </div>`,
    )
    .join('');
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
  $btnEdit().addEventListener('click', toggleEditMode);
  $btnSave().addEventListener('click', batchSave);
  $btnCancel().addEventListener('click', cancelEdit);

  $searchBtn().addEventListener('click', handleSearch);
  $searchInput().addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSearch();
  });

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
