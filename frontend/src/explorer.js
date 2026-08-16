/**
 * explorer.js — Object Explorer Panel
 *
 * Syncs a categorized list of all Canvas entities with the Konva stage.
 * Supports visibility toggle, deletion, and select-sync.
 */
import {
  getLayerFloor, getLayerArchitecture, getLayerFurniture,
  getLayerAssets, getTransformer,
} from './engine.js';
import { commitHistory } from './history.js';

let selectedNodeId = null;
let onSelectCallback = null;

const LAYER_CONFIG = [
  { key: 'floor',        label: 'Floor Zones', color: '#9ab8a0', getter: getLayerFloor },
  { key: 'architecture', label: 'Architecture', color: '#7a8a98', getter: getLayerArchitecture },
  { key: 'furniture',    label: 'Furniture',    color: '#c4a882', getter: getLayerFurniture },
  { key: 'assets',       label: 'IT Assets',    color: '#5b8dbf', getter: getLayerAssets },
];

/**
 * Set a callback for when an explorer item is clicked.
 */
export function onExplorerSelect(cb) {
  onSelectCallback = cb;
}

/**
 * Refresh the explorer panel DOM from current canvas state.
 */
export function refreshExplorer() {
  const body = document.getElementById('explorer-body');
  if (!body) return;

  body.innerHTML = '';

  LAYER_CONFIG.forEach(({ key, label, color, getter }) => {
    const layer = getter();
    if (!layer) return;

    // Group title
    const title = document.createElement('div');
    title.className = 'fp-explorer__group-title';
    title.textContent = label;
    body.appendChild(title);

    // Collect entities (skip non-entity nodes like grid dots)
    const nodes = layer.find('Group, Rect, Line, Circle, Image').filter(n => {
      return n.getAttr('entityData') || n.getAttr('assetData');
    });

    if (nodes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'fp-explorer__item';
      empty.style.color = 'var(--fp-chrome-text2)';
      empty.style.fontStyle = 'italic';
      empty.textContent = 'Empty';
      body.appendChild(empty);
      return;
    }

    nodes.forEach(node => {
      const data = node.getAttr('entityData') || node.getAttr('assetData') || {};
      const name = data.name || data.hardware_name || node.id() || 'Unnamed';
      const nodeId = node.id();

      const item = document.createElement('div');
      item.className = 'fp-explorer__item';
      if (nodeId === selectedNodeId) item.classList.add('selected');
      item.dataset.nodeId = nodeId;

      // Color swatch
      const swatch = document.createElement('div');
      swatch.className = 'fp-explorer__item-icon';
      swatch.style.background = color;
      item.appendChild(swatch);

      // Name
      const nameEl = document.createElement('span');
      nameEl.className = 'fp-explorer__item-name';
      nameEl.textContent = name;
      item.appendChild(nameEl);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'fp-explorer__item-actions';

      // Visibility toggle
      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'fp-explorer__action-btn';
      eyeBtn.innerHTML = node.visible() ? '👁' : '🚫';
      eyeBtn.title = 'Toggle visibility';
      eyeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        node.visible(!node.visible());
        node.getLayer().batchDraw();
        refreshExplorer();
      });
      actions.appendChild(eyeBtn);

      // Delete
      const delBtn = document.createElement('button');
      delBtn.className = 'fp-explorer__action-btn danger';
      delBtn.innerHTML = '🗑';
      delBtn.title = 'Delete';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedNodeId === nodeId) {
          getTransformer().nodes([]);
          selectedNodeId = null;
        }
        node.destroy();
        node.getLayer()?.batchDraw();
        refreshExplorer();
        updateProperties(null);
        commitHistory();
      });
      actions.appendChild(delBtn);

      item.appendChild(actions);

      // Click to select
      item.addEventListener('click', () => {
        selectNodeById(nodeId);
      });

      body.appendChild(item);
    });
  });
}

/**
 * Select a node by its Konva id. Updates explorer highlight and transformer.
 */
export function selectNodeById(nodeId) {
  selectedNodeId = nodeId;

  // Find the node across all layers
  let node = null;
  for (const { getter } of LAYER_CONFIG) {
    const layer = getter();
    if (!layer) continue;
    node = layer.findOne('#' + nodeId);
    if (node) break;
  }

  if (node) {
    const entityData = node.getAttr('entityData') || {};
    const assetData = node.getAttr('assetData');
    const tr = getTransformer();
    
    // Disable resizing and hide anchors for furniture, IT assets, and walls
    const isFurniture = entityData.layer === 'furniture';
    const isAsset = !!assetData || entityData.layer === 'assets';
    const isWall = !!entityData.wallType || entityData.name === 'Wall' || entityData.name === 'New Wall';

    if (isFurniture || isAsset || isWall) {
      tr.enabledAnchors([]);
      tr.resizeEnabled(false);
    } else {
      tr.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'bottom-right', 'bottom-center', 'bottom-left', 'middle-left']);
      tr.resizeEnabled(true);
    }

    tr.nodes([node]);
    tr.getLayer().batchDraw();
    updateProperties(node);
    if (onSelectCallback) onSelectCallback(node);
  }

  refreshExplorer();
}

/**
 * Clear selection.
 */
export function clearSelection() {
  selectedNodeId = null;
  getTransformer().nodes([]);
  getTransformer().getLayer().batchDraw();
  updateProperties(null);
  refreshExplorer();
}

export function getSelectedNodeId() {
  return selectedNodeId;
}

/**
 * Update the properties panel with node info.
 */
function updateProperties(node) {
  const panel = document.getElementById('properties-panel');
  if (!panel) return;

  if (!node) {
    panel.innerHTML = '<div class="fp-properties__title">Properties</div><div style="color:var(--fp-chrome-text2);font-size:11px;">No selection</div>';
    return;
  }

  const data = node.getAttr('entityData') || node.getAttr('assetData') || {};
  const name = data.name || data.hardware_name || node.id();

  let rows = `
    <div class="fp-properties__title">Properties</div>
    <div class="fp-properties__row"><span>Name</span><span>${name}</span></div>
    <div class="fp-properties__row"><span>X</span><span>${Math.round(node.x())}</span></div>
    <div class="fp-properties__row"><span>Y</span><span>${Math.round(node.y())}</span></div>
    <div class="fp-properties__row"><span>Rotation</span><span>${Math.round(node.rotation())}°</span></div>
  `;

  if (data.ip) rows += `<div class="fp-properties__row"><span>IP</span><span>${data.ip}</span></div>`;
  if (data.mac) rows += `<div class="fp-properties__row"><span>MAC</span><span>${data.mac}</span></div>`;
  if (data.type) rows += `<div class="fp-properties__row"><span>Type</span><span>${data.type}</span></div>`;

  const isEditable = !!node.getAttr('assetData');
  if (isEditable && document.getElementById('main-layout')?.classList.contains('is-editing')) {
    rows += `
      <div style="margin-top:16px;">
        <button class="fp-btn fp-btn--outline" id="btn-edit-asset-layout" style="width:100%; font-size:11px;">
          Configurar Layout
        </button>
      </div>
    `;
  }

  panel.innerHTML = rows;

  if (isEditable) {
    const btn = document.getElementById('btn-edit-asset-layout');
    if (btn) {
      btn.addEventListener('click', () => {
        if (window.openAssetMicroEdit) window.openAssetMicroEdit(node);
      });
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// Asset Micro-Edit Mode
// ════════════════════════════════════════════════════════════════════

let currentMicroEditNode = null;
let microEditBackupState = null;

window.openAssetMicroEdit = async function(node) {
  const modal = document.getElementById('asset-edit-modal');
  if (!modal) return;
  
  currentMicroEditNode = node;
  const isAsset = !!node.getAttr('assetData');
  
  // Backup state
  const data = isAsset ? node.getAttr('assetData') : node.getAttr('entityData');
  microEditBackupState = JSON.parse(JSON.stringify(data));
  
  // Populate UI
  const layout = data.layout || {};
  document.getElementById('asset-edit-table').value = layout.table || 'none';
  document.getElementById('asset-edit-device').value = layout.device || 'none';
  document.getElementById('asset-edit-chair').value = layout.chair || 'none';
  document.getElementById('asset-edit-rotation').value = (layout.rotation || 0).toString();
  
  // Disable selection globally so we don't misclick during edit
  import('./tools.js').then(({ setActiveTool, TOOLS }) => {
    setActiveTool(TOOLS.SELECT);
  });

  // Zoom camera
  const { zoomToNode } = await import('./engine.js');
  zoomToNode(node);
  
  modal.classList.add('visible');
};

async function liveUpdateNode() {
  if (!currentMicroEditNode) return;
  
  const isAsset = !!currentMicroEditNode.getAttr('assetData');
  let data = isAsset ? currentMicroEditNode.getAttr('assetData') : currentMicroEditNode.getAttr('entityData');
  
  if (!data.layout) data.layout = {};
  data.layout.table = document.getElementById('asset-edit-table').value;
  data.layout.device = document.getElementById('asset-edit-device').value;
  data.layout.chair = document.getElementById('asset-edit-chair').value;
  data.layout.rotation = parseInt(document.getElementById('asset-edit-rotation').value, 10);
  
  // Update node rotation
  currentMicroEditNode.rotation(data.layout.rotation);
  
  // Clear cache for visual update
  currentMicroEditNode.clearCache();

  const { renderAssetContent } = await import('./renderer.js');
  const { skinManager } = await import('./skins.js');
  
  renderAssetContent(currentMicroEditNode, data, skinManager);

  // If in edit mode, re-draw the bounding box
  let bbox = currentMicroEditNode.findOne('.edit-bbox');
  if (bbox) bbox.destroy();
  
  const rect = currentMicroEditNode.getClientRect({ skipTransform: true });
  bbox = new Konva.Rect({
    x: rect.x - 2,
    y: rect.y - 2,
    width: rect.width + 4,
    height: rect.height + 4,
    stroke: '#63b3ed', // Blue
    strokeWidth: 1.5,
    dash: [4, 4],
    name: 'edit-bbox',
    listening: false
  });
  currentMicroEditNode.add(bbox);

  currentMicroEditNode.cache();
  currentMicroEditNode.getLayer().batchDraw();
}

// Bind live update to selects
document.addEventListener('DOMContentLoaded', () => {
  ['asset-edit-table', 'asset-edit-device', 'asset-edit-chair', 'asset-edit-rotation'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', liveUpdateNode);
  });
  
  // Cancel
  document.getElementById('asset-edit-cancel')?.addEventListener('click', async () => {
    if (!currentMicroEditNode) return;
    const isAsset = !!currentMicroEditNode.getAttr('assetData');
    if (isAsset) currentMicroEditNode.setAttr('assetData', microEditBackupState);
    else currentMicroEditNode.setAttr('entityData', microEditBackupState);
    
    currentMicroEditNode.rotation(microEditBackupState.layout?.rotation || 0);
    currentMicroEditNode.clearCache();
    
    const { renderAssetContent } = await import('./renderer.js');
    const { skinManager } = await import('./skins.js');
    renderAssetContent(currentMicroEditNode, microEditBackupState, skinManager);

    let bbox = currentMicroEditNode.findOne('.edit-bbox');
    if (bbox) bbox.destroy();
    
    const rect = currentMicroEditNode.getClientRect({ skipTransform: true });
    bbox = new Konva.Rect({
      x: rect.x - 2,
      y: rect.y - 2,
      width: rect.width + 4,
      height: rect.height + 4,
      stroke: '#63b3ed',
      strokeWidth: 1.5,
      dash: [4, 4],
      name: 'edit-bbox',
      listening: false
    });
    currentMicroEditNode.add(bbox);
    currentMicroEditNode.cache();
    currentMicroEditNode.getLayer().batchDraw();
    
    closeAssetMicroEdit();
  });
  
  // Save
  document.getElementById('asset-edit-save')?.addEventListener('click', async () => {
    import('./history.js').then(({ commitHistory }) => {
      commitHistory();
    });
    closeAssetMicroEdit();
  });
});

async function closeAssetMicroEdit() {
  document.getElementById('asset-edit-modal')?.classList.remove('visible');
  currentMicroEditNode = null;
  microEditBackupState = null;
  const { zoomOutToSafe } = await import('./engine.js');
  zoomOutToSafe();
}
