/**
 * explorer.js — Object Explorer Panel
 *
 * Syncs a categorized list of all Canvas entities with the Konva stage.
 * Supports visibility toggle, deletion, and select-sync.
 */
import {
  getLayerFloor, getLayerArchitecture, getLayerFurniture,
  getTransformer,
} from './engine.js';
import { commitHistory } from './history.js';

let selectedNodeId = null;
let onSelectCallback = null;

// ════════════════════════════════════════════════════════════════════
// Unified Hardware Assignment Pipeline
// ════════════════════════════════════════════════════════════════════

/**
 * Single entry point for assigning an IT hardware asset to a furniture node.
 * Called from both drag-and-drop (main.js) and the properties button (explorer.js).
 *
 * @param {Konva.Group} node - The furniture Konva group node.
 * @param {Object} hardwareData - The hardware object (hardware_id, hardware_name, ip, mac, etc.).
 */
export async function assignHardwareToNode(node, hardwareData) {
  const data = node.getAttr('entityData');
  
  // 1. Initialize structures if missing
  if (!data.assigned_hardware) data.assigned_hardware = [];
  if (!data.layout) data.layout = { table: data.type || 'desk_straight' };
  
  // 2. Prevent duplicate assignment
  const alreadyAssigned = data.assigned_hardware.some(
    hw => String(hw.hardware_id) === String(hardwareData.hardware_id)
  );
  if (alreadyAssigned) {
    console.warn(`[assignHardware] Hardware ${hardwareData.hardware_id} already assigned to ${node.id()}`);
    return;
  }
  
  // 3. Add hardware to the node's state
  data.assigned_hardware.push(hardwareData);
  
  // 4. Auto-set device visual skin if none is set
  if (!data.layout.device || data.layout.device === 'none') {
    data.layout.device = 'desktop_single';
  }
  
  // 5. Full visual re-render
  const { renderAssetContent } = await import('./renderer.js');
  const { skinManager } = await import('./skins.js');
  renderAssetContent(node, data, skinManager);
  node.clearCache();
  node.cache();
  node.getLayer().batchDraw();
  
  // 6. Remove from unmapped catalog
  const { removeAssetFromCatalog } = await import('./assets-catalog.js');
  if (removeAssetFromCatalog) removeAssetFromCatalog(hardwareData.hardware_id);
  
  // 7. Commit to undo/redo history
  commitHistory();
  
  // 8. Refresh the Object Explorer sidebar
  refreshExplorer();
}

const LAYER_CONFIG = [
  { key: 'floor',        label: 'Floor Zones', color: '#9ab8a0', getter: getLayerFloor },
  { key: 'architecture', label: 'Architecture', color: '#7a8a98', getter: getLayerArchitecture },
  { key: 'furniture',    label: 'Furniture',    color: '#c4a882', getter: getLayerFurniture },
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

  const isEditable = !!node.getAttr('entityData') && node.getAttr('entityData').layer === 'furniture';
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
  
  const data = node.getAttr('entityData');
  if (!data.layout) data.layout = { table: data.type };
  microEditBackupState = JSON.parse(JSON.stringify(data));
  
  // Populate UI
  const layout = data.layout;
  document.getElementById('asset-edit-table').value = layout.table || data.type || 'none';
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
  
  renderAssignedHardware(data);
  
  modal.classList.add('visible');
};

async function renderAssignedHardware(data) {
  const listEl = document.getElementById('asset-edit-assigned-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  
  const assigned = data.assigned_hardware || [];
  
  if (assigned.length === 0) {
    listEl.innerHTML = '<div style="color:var(--fp-text-muted);font-size:11px;padding:4px 0;">No assets assigned</div>';
  } else {
    assigned.forEach((hw, idx) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';
      row.style.padding = '4px 8px';
      row.style.background = 'var(--fp-bg-body)';
      row.style.borderRadius = '4px';
      row.style.fontSize = '11px';
      row.style.border = '1px solid var(--fp-border)';
      
      const nameEl = document.createElement('span');
      nameEl.textContent = typeof hw === 'object' ? (hw.hardware_name || 'Unknown') : `ID: ${hw}`;
      
      const rmBtn = document.createElement('button');
      rmBtn.innerHTML = '&times;';
      rmBtn.style.background = 'none';
      rmBtn.style.border = 'none';
      rmBtn.style.color = '#e53e3e';
      rmBtn.style.cursor = 'pointer';
      rmBtn.style.fontWeight = 'bold';
      
      rmBtn.addEventListener('click', () => {
        const newData = currentMicroEditNode.getAttr('entityData');
        newData.assigned_hardware.splice(idx, 1);
        renderAssignedHardware(newData);
        liveUpdateNode();
      });
      
      row.appendChild(nameEl);
      row.appendChild(rmBtn);
      listEl.appendChild(row);
    });
  }

  // Populate unmapped select
  const selectEl = document.getElementById('asset-edit-unmapped-select');
  if (selectEl) {
    selectEl.innerHTML = '<option value="">Select computer to assign...</option>';
    
    // We import from assets-catalog
    const { fetchUnmappedAssets } = await import('./assets-catalog.js');
    const unmapped = fetchUnmappedAssets ? await fetchUnmappedAssets() : [];
    unmapped.forEach(asset => {
      const opt = document.createElement('option');
      opt.value = asset.hardware_id;
      opt.textContent = asset.hardware_name || `Hardware ${asset.hardware_id}`;
      opt.dataset.asset = JSON.stringify(asset);
      selectEl.appendChild(opt);
    });
  }
}

// Global hook for the Add button
const addBtn = document.getElementById('asset-edit-assign-btn');
if (addBtn) {
  addBtn.addEventListener('click', async () => {
    if (!currentMicroEditNode) return;
    const selectEl = document.getElementById('asset-edit-unmapped-select');
    if (!selectEl.value) return;
    
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const asset = JSON.parse(selectedOption.dataset.asset);
    
    // Use the unified pipeline
    await assignHardwareToNode(currentMicroEditNode, asset);
    
    // Update the modal's assigned hardware list
    const data = currentMicroEditNode.getAttr('entityData');
    renderAssignedHardware(data);
    
    // Update the device dropdown to reflect auto-set
    if (data.layout?.device) {
      document.getElementById('asset-edit-device').value = data.layout.device;
    }
  });
}

async function liveUpdateNode() {
  if (!currentMicroEditNode) return;
  
  let data = currentMicroEditNode.getAttr('entityData');
  
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
['asset-edit-table', 'asset-edit-device', 'asset-edit-chair', 'asset-edit-rotation'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', liveUpdateNode);
});

// Cancel
document.getElementById('asset-edit-cancel')?.addEventListener('click', async () => {
  if (!currentMicroEditNode) return;
  currentMicroEditNode.setAttr('entityData', microEditBackupState);
  
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

async function closeAssetMicroEdit() {
  document.getElementById('asset-edit-modal')?.classList.remove('visible');
  currentMicroEditNode = null;
  microEditBackupState = null;
  const { zoomOutToSafe } = await import('./engine.js');
  zoomOutToSafe();
}
