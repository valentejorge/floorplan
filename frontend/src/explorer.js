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
  const layersBody = document.getElementById('layers-body');
  if (!body) return;

  body.innerHTML = '';
  if (layersBody) layersBody.innerHTML = '';
  
  const isEditMode = document.getElementById('main-layout')?.classList.contains('is-editing');
  
  // ALWAYS render mapped IT Assets in explorer-body
  const { getLayerFurniture } = require('./engine.js');
  const furnitureLayer = getLayerFurniture();
  if (furnitureLayer) {
    const mappedAssets = [];
    
    furnitureLayer.find('Group').forEach(group => {
      if (group.name() !== 'furniture') return;
      const data = group.getAttr('entityData');
      if (data && data.assigned_hardware && data.assigned_hardware.length > 0) {
        data.assigned_hardware.forEach(hw => {
          mappedAssets.push({
            asset: hw,
            parentGroup: group
          });
        });
      }
    });

    if (mappedAssets.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '16px';
      empty.style.textAlign = 'center';
      empty.style.color = 'var(--fp-text-muted)';
      empty.style.fontSize = '12px';
      empty.textContent = 'No mapped assets.';
      body.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';

      mappedAssets.forEach(({ asset, parentGroup }) => {
        const item = document.createElement('div');
        item.className = 'fp-explorer__item';
        
        const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                         asset.status === 'warning' ? '#d69e2e' : '#10b981';
                         
        const hwName = typeof asset === 'object' ? (asset.hardware_name || 'Unknown') : `ID: ${asset}`;
        const type = typeof asset === 'object' ? (asset.type || 'ASSET') : 'ASSET';
                         
        item.innerHTML = `
          <div class="fp-explorer__item-icon" style="background-color:${dotColor}; width:8px; height:8px; border-radius:50%; box-shadow:0 0 6px ${dotColor}66;"></div>
          <div class="fp-explorer__item-name" style="flex:1;">
            <div style="font-weight:600;font-size:11px;">${hwName}</div>
          </div>
          <div style="color:var(--fp-text-muted);font-size:10px;text-transform:uppercase;">${type}</div>
        `;
        
        item.addEventListener('click', () => {
          import('./engine.js').then(({ stage, getTransformer }) => {
            const pulse = new Konva.Circle({
              x: parentGroup.x(), y: parentGroup.y(),
              radius: 30, stroke: '#961B7E', strokeWidth: 2, opacity: 1
            });
            furnitureLayer.add(pulse);
            new Konva.Tween({
              node: pulse, duration: 1, radius: 100, opacity: 0,
              onFinish: () => pulse.destroy()
            }).play();
            
            const layout = document.getElementById('main-layout');
            if (layout && layout.classList.contains('is-editing')) {
              const tr = getTransformer();
              tr.nodes([parentGroup]);
              tr.getLayer().batchDraw();
            }
            selectNodeById(parentGroup.id());
          });
        });
        
        list.appendChild(item);
      });
      
      body.appendChild(list);
    }
  }
  
  // EDIT MODE: Render Layers tree in left sidebar
  if (isEditMode && layersBody) {
    LAYER_CONFIG.forEach(({ key, label, color, getter }) => {
      const layer = getter();
      if (!layer) return;

      const nodes = layer.getChildren(node => node.hasName('zone') || node.hasName('wall') || node.hasName('furniture') || node.hasName('asset'));
      if (nodes.length === 0) return;

      const catHead = document.createElement('div');
      catHead.className = 'fp-explorer__category';
      catHead.innerHTML = `
        <div class="fp-explorer__category-dot" style="background-color: ${color}"></div>
        ${label}
      `;
      layersBody.appendChild(catHead);

      const list = document.createElement('div');
      nodes.forEach(node => {
        const data = node.getAttr('entityData') || node.getAttr('assetData') || {};
        const id = node.id();
        const name = data.name || data.hardware_name || id;

        const item = document.createElement('div');
        item.className = 'fp-explorer__item' + (id === selectedNodeId ? ' active' : '');
        item.dataset.id = id;
        item.innerHTML = `
          <div class="fp-explorer__item-icon" style="background-color: ${color}"></div>
          <div class="fp-explorer__item-name">${name}</div>
          <div class="fp-layer-actions">
            <button class="fp-layer-btn" title="Toggle Visibility">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="fp-layer-btn" title="Lock Layer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </button>
          </div>
        `;

        item.addEventListener('click', () => {
          const layout = document.getElementById('main-layout');
          if (layout && layout.classList.contains('is-editing')) {
            import('./engine.js').then(({ getTransformer }) => {
              const tr = getTransformer();
              tr.nodes([node]);
              tr.getLayer().batchDraw();
            });
          }
          selectNodeById(id);
        });

        list.appendChild(item);
      });

      layersBody.appendChild(list);
    });
  }
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
    panel.innerHTML = '<div class="fp-panel-header"><h3 class="fp-panel-title">Properties</h3></div><div class="fp-empty-state">No selection</div>';
    return;
  }

  const data = node.getAttr('entityData') || node.getAttr('assetData') || {};
  const name = data.name || data.hardware_name || node.id();

  const isEditing = document.getElementById('main-layout')?.classList.contains('is-editing');
  const disabledAttr = isEditing ? '' : 'disabled';

  // Create a stunning Figma-style property grid using the Design System
  let rows = `
    <div style="margin-bottom:16px;">
      <div class="fp-text-label" style="margin-bottom:12px;">Design ${!isEditing ? '<span class="fp-text-muted">(View Only)</span>' : ''}</div>
      
      <!-- Details Row -->
      <div class="fp-flex-col fp-gap-1" style="margin-bottom:16px;">
        <div class="fp-prop-row">
          <span class="fp-text-muted">Name</span>
          <span class="fp-text-body">${name}</span>
        </div>
        ${data.type ? `<div class="fp-prop-row"><span class="fp-text-muted">Type</span><span class="fp-text-body">${data.type}</span></div>` : ''}
        ${data.ip ? `<div class="fp-prop-row"><span class="fp-text-muted">IP</span><span class="fp-text-body">${data.ip}</span></div>` : ''}
        ${data.mac ? `<div class="fp-prop-row"><span class="fp-text-muted">MAC</span><span class="fp-text-body">${data.mac}</span></div>` : ''}
      </div>

      <!-- Geometry Grid -->
      <div class="fp-prop-grid" style="margin-bottom:16px;">
        <div class="fp-input-group">
          <span class="fp-input-prefix">X</span>
          <input type="number" id="prop-x" value="${Math.round(node.x())}" class="fp-input-field" ${disabledAttr} />
        </div>
        <div class="fp-input-group">
          <span class="fp-input-prefix">Y</span>
          <input type="number" id="prop-y" value="${Math.round(node.y())}" class="fp-input-field" ${disabledAttr} />
        </div>
        <div class="fp-input-group">
          <span class="fp-input-prefix">W</span>
          <input type="number" id="prop-w" value="${Math.round(node.width() * node.scaleX())}" class="fp-input-field" ${disabledAttr} />
        </div>
        <div class="fp-input-group">
          <span class="fp-input-prefix">H</span>
          <input type="number" id="prop-h" value="${Math.round(node.height() * node.scaleY())}" class="fp-input-field" ${disabledAttr} />
        </div>
        <div class="fp-input-group" style="grid-column: span 2;">
          <span class="fp-input-prefix">°</span>
          <input type="number" id="prop-r" value="${Math.round(node.rotation())}" class="fp-input-field" ${disabledAttr} />
        </div>
      </div>
    </div>
  `;

  const isEditable = !!node.getAttr('entityData') && node.getAttr('entityData').layer === 'furniture';
  if (isEditable && document.getElementById('main-layout')?.classList.contains('is-editing')) {
    rows += `
      <div style="margin-top:8px;">
        <button class="fp-btn fp-btn--outline" id="btn-edit-asset-layout" style="width:100%; font-size:11px;">
          Configure Layout
        </button>
      </div>
    `;
  }

  panel.innerHTML = rows;

  // Bind input events
  const bindInput = (id, prop) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Add nice focus ring effect to parent
    el.addEventListener('focus', () => el.parentElement.style.borderColor = '#0d99ff');
    el.addEventListener('blur', () => el.parentElement.style.borderColor = 'var(--fp-border)');

    el.addEventListener('change', async (e) => {
      if (!document.getElementById('main-layout')?.classList.contains('is-editing')) return;
      const val = parseFloat(e.target.value);
      if (isNaN(val)) return;
      
      if (prop === 'w') {
        const origW = node.width() || 1;
        node.scaleX(val / origW);
      } else if (prop === 'h') {
        const origH = node.height() || 1;
        node.scaleY(val / origH);
      } else {
        node[prop](val);
      }
      
      const { requestRender } = await import('./engine.js');
      const { commitHistory } = await import('./history.js');
      requestRender();
      commitHistory();
    });
  };

  bindInput('prop-x', 'x');
  bindInput('prop-y', 'y');
  bindInput('prop-w', 'w');
  bindInput('prop-h', 'h');
  bindInput('prop-r', 'rotation');

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
  window.currentMicroEditNode = node; // Global exposure
  
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

export async function renderAssignedHardware(data) {
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

  // Note: the unmapped select dropdown was removed for scalability
}

// Global hook for the Add button
const addBtn = document.getElementById('asset-edit-assign-btn');
if (addBtn) {
  addBtn.addEventListener('click', () => {
    // Open the Unmapped Assets sidebar
    const btnAssets = document.querySelector('.fp-tool-btn[data-tool="assets"]');
    if (btnAssets) {
      btnAssets.click();
    }
    
    // Optionally bring focus to search
    setTimeout(() => {
      const searchInput = document.getElementById('assets-catalog-search');
      if (searchInput) searchInput.focus();
    }, 100);
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
  closeModal();
});

async function closeModal() {
  document.getElementById('asset-edit-modal')?.classList.remove('visible');
  currentMicroEditNode = null;
  window.currentMicroEditNode = null;
  microEditBackupState = null;
  const { zoomOutToSafe } = await import('./engine.js');
  zoomOutToSafe();
}
