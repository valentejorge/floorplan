/**
 * main.js — Phase 1.5: UI with Map Navigator & Unified Search
 */
import { api } from './api.js';
import { initEngine, zoomIn, zoomOut, zoomFit } from './engine.js';
import { loadMapData } from './renderer.js';
import { bindToolsToStage, setActiveTool, setFloorColor, setWallType, setActiveFurnitureType } from './tools.js';
import { initAssetsCatalog } from './assets-catalog.js';
import { refreshExplorer } from './explorer.js';
import './style.css';

let currentMapTree = null;

// ════════════════════════════════════════════════════════════════════
// Global Helpers
// ════════════════════════════════════════════════════════════════════
window.checkEditMode = function() {
  return new Promise((resolve) => {
    const layout = document.getElementById('main-layout');
    if (layout && layout.classList.contains('is-editing')) {
      const modal = document.getElementById('confirm-modal');
      const btnCancel = document.getElementById('confirm-modal-cancel');
      const btnOk = document.getElementById('confirm-modal-ok');
      
      if (!modal) return resolve(true);

      modal.classList.add('visible');

      const cleanup = () => {
        modal.classList.remove('visible');
        btnCancel.removeEventListener('click', onCancel);
        btnOk.removeEventListener('click', onOk);
      };

      const onCancel = () => {
        cleanup();
        resolve(false);
      };

      const onOk = () => {
        cleanup();
        document.getElementById('btn-cancel-edit')?.click();
        resolve(true);
      };

      btnCancel.addEventListener('click', onCancel);
      btnOk.addEventListener('click', onOk);
    } else {
      resolve(true);
    }
  });
};

window.selectAsset = function(assetData) {
  const panel = document.getElementById('properties-panel');
  if (!panel) return;
  
  if (!assetData) {
    panel.innerHTML = `
      <div class="fp-properties__title">Properties</div>
      <div style="color:var(--fp-text-muted);font-size:11px;">No selection</div>
    `;
    return;
  }

  const mac = assetData.mac || `00:1A:2B:3C:4D:${assetData.hardware_id.toString().substring(0,2)}`;
  const user = assetData.user || (assetData.type === 'desktop' ? 'jorge.silva' : 'system');
  const desc = assetData.description || `Equipamento ${assetData.type} padrão`;
  const dotColor = assetData.status === 'offline' ? '#e53e3e' : assetData.status === 'warning' ? '#d69e2e' : '#5cb85c';

  panel.innerHTML = `
    <div class="fp-properties__title">Properties</div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px;font-weight:600;color:var(--fp-text);">
      <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:0 0 8px ${dotColor}80;"></div>
      ${assetData.hardware_name}
    </div>
    <div class="fp-properties__row"><span>ID</span><span>${assetData.hardware_id}</span></div>
    <div class="fp-properties__row"><span>Type</span><span style="text-transform:uppercase;">${assetData.type}</span></div>
    <div class="fp-properties__row"><span>IP</span><span>${assetData.ip || '—'}</span></div>
    <div class="fp-properties__row"><span>MAC</span><span>${mac}</span></div>
    <div class="fp-properties__row"><span>User</span><span>${user}</span></div>
    <div class="fp-properties__row"><span>Details</span><span title="${desc}" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${desc}</span></div>
  `;

  // Update selection in explorer list
  const explorerBody = document.getElementById('explorer-body');
  if (explorerBody) {
    explorerBody.querySelectorAll('.fp-explorer__item').forEach(el => {
      if (String(el.dataset.hwId) === String(assetData.hardware_id)) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// Bootstrap
// ════════════════════════════════════════════════════════════════════

async function init() {
  // Remove preload class to enable CSS transitions
  setTimeout(() => document.body.classList.remove('preload'), 50);

  initEngine('floorplan-container');
  bindToolsToStage();
  bindCameraControls();
  
  bindToolbar();
  bindViewFilters();
  bindSearch();
  bindFurnitureModal();
  bindMapNavigator();
  bindModeToggle();
  populateFurnitureCatalog();
  initAssetsCatalog();
  bindCreateMap();
  
  // Auto-Load first map
  setTimeout(async () => {
    try {
      const { skinManager } = await import('./skins.js');
      await skinManager.load();
      
      const jsonTree = await api('get_map_tree.php');
      if (jsonTree.status === 'success') {
        currentMapTree = jsonTree.data;
        let firstRoomId = null;
        if (currentMapTree.buildings.length > 0 && 
            currentMapTree.buildings[0].floors.length > 0 && 
            currentMapTree.buildings[0].floors[0].rooms.length > 0) {
            firstRoomId = currentMapTree.buildings[0].floors[0].rooms[0].id;
        }
        
        if (firstRoomId) {
            const roomJson = await api(`get_room.php?id=${firstRoomId}`);
            if (roomJson.status === 'success') {
              loadMapData(roomJson.data);
              const roomData = roomJson.data.room_data;
              updateBreadcrumb(roomData.building_name, roomData.floor_name, roomData.name);
              import('./history.js').then(({ initHistory }) => initHistory());
            }
        } else {
            notify("No maps found. Click 'All Maps' to create one.", "warning");
        }
      }
    } catch (e) {
      console.warn("Error loading initial map data", e);
    }
  }, 100);

  console.info(`[floorplan] Phase 3: Data Layer & Konva Rendering loaded.`);
}

function updateBreadcrumb(building, floor, room) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  bc.innerHTML = `
    <a href="#" data-nav="root" title="Open Navigator">🗺️ All Maps</a>
    <span> › </span>
    <a href="#" data-nav="building" title="Open Navigator">${building}</a>
    <span> › </span>
    <a href="#" data-nav="floor" title="Open Navigator">${floor}</a>
    <span> › </span>
    <span>${room}</span>
  `;

  bc.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!(await window.checkEditMode())) return;
      
      if (window.openMapNavigator) {
        const text = a.dataset.nav === 'root' ? '' : a.innerText.trim();
        window.openMapNavigator(text);
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════════
// Event Bindings
// ════════════════════════════════════════════════════════════════════

function bindCameraControls() {
  document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
  document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
  document.getElementById('btn-zoom-reset')?.addEventListener('click', zoomFit);
  document.getElementById('btn-zoom-fit')?.addEventListener('click', zoomFit);
}

function bindModeToggle() {
  const layout = document.getElementById('main-layout');
  const explorerBody = document.getElementById('explorer-body');
  
  const btnEdit = document.getElementById('btn-edit-mode');
  const btnCancel = document.getElementById('btn-cancel-edit');
  const btnSave = document.getElementById('btn-save-edit');

  if (!btnEdit || !btnCancel || !btnSave) return;

  let preEditState = null;

  async function setMode(mode) {
    if (mode === 'edit') {
      import('./history.js').then(({ serializeMapState }) => {
        preEditState = serializeMapState();
      });
      
      layout.classList.add('is-editing');
      btnEdit.style.display = 'none';
      btnCancel.style.display = 'block';
      btnSave.style.display = 'block';
      
      refreshExplorer();
      notify('Edit Mode activated.', 'warning');
    } else {
      if (mode === 'save') {
        try {
          const { serializeMapState } = await import('./history.js');
          const { currentRoomData } = await import('./renderer.js');
          
          if (!currentRoomData || !currentRoomData.id) {
            throw new Error("No active room loaded to save.");
          }
          
          const state = serializeMapState();
          // Build the strict MVP contract payload
          const payload = {
            id: currentRoomData.id,
            width: currentRoomData.canvas_width || currentRoomData.width || 1200,
            height: currentRoomData.canvas_height || currentRoomData.height || 800,
            architecture: {
              walls: state.walls || [],
              floor_zones: state.floor_zones || [],
              furniture: state.furniture || [],
              doors: state.doors || []
            },
            assets: (state.assets || []).map(a => ({
              hardware_id: a.hardware_id,
              pos_x: a.pos_x !== undefined ? a.pos_x : a.x,
              pos_y: a.pos_y !== undefined ? a.pos_y : a.y,
              rotation: a.rotation || (a.layout ? a.layout.rotation : 0) || 0
            }))
          };

          const apiModule = await import('./api.js');
          const api = apiModule.api || apiModule.default;
          
          const res = await api('save_room.php', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
          
          if (res.status === 'success') {
            notify('Changes saved successfully!', 'success');
          } else {
            throw new Error(res.message || 'Unknown backend error');
          }
        } catch (e) {
          console.error(e);
          notify('Error saving changes: ' + e.message, 'error');
        }
      } else if (mode === 'cancel' && preEditState) {
        // Restore map to exactly how it was before clicking Edit
        const { loadMapData } = await import('./renderer.js');
        loadMapData(preEditState, false);
        
        // Reset history to only contain this state
        import('./history.js').then(({ resetHistory }) => {
          resetHistory(preEditState);
        });
        notify('Edit cancelled.', 'success');
      }

      layout.classList.remove('is-editing');
      btnEdit.style.display = 'flex';
      btnCancel.style.display = 'none';
      btnSave.style.display = 'none';
      
      const furniturePanel = document.getElementById('furniture-catalog-panel');
      if (furniturePanel) furniturePanel.style.display = 'none';
      
      document.querySelectorAll('.fp-tool-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.fp-tool-btn[data-tool="select"]')?.classList.add('active');
      
      import('./tools.js').then(({ setActiveTool }) => setActiveTool('select'));
      import('./renderer.js').then(({ repopulateAssetsExplorer }) => {
        repopulateAssetsExplorer();
      });
    }
    
    // Animate stage to safe area first
    const { panToSafeArea, setEngineEditMode } = await import('./engine.js');
    await panToSafeArea();
    
    // Now that animation is done, we can do the heavy DOM/Cache blocking operations
    setEngineEditMode(mode === 'edit');
    
    import('./renderer.js').then(({ toggleAssetEditMode }) => {
      toggleAssetEditMode(mode === 'edit');
    });
  }

  btnEdit.addEventListener('click', () => setMode('edit'));
  btnCancel.addEventListener('click', () => setMode('cancel'));
  btnSave.addEventListener('click', () => setMode('save'));
}

function bindViewFilters() {
  const btn = document.getElementById('btn-view-filters');
  const dropdown = document.getElementById('view-filters-dropdown');
  const filterIds = ['filter-hostname', 'filter-ip', 'filter-mac', 'filter-user'];
  
  // Load from localStorage or default to false
  window.viewFilters = {};
  const saved = localStorage.getItem('fpViewFilters');
  if (saved) {
    window.viewFilters = JSON.parse(saved);
  } else {
    filterIds.forEach(id => window.viewFilters[id] = false);
  }
  
  // Sync UI with state
  filterIds.forEach(id => {
    const cb = document.getElementById(id);
    if (cb) {
      cb.checked = !!window.viewFilters[id];
      cb.addEventListener('change', (e) => {
        window.viewFilters[id] = e.target.checked;
        localStorage.setItem('fpViewFilters', JSON.stringify(window.viewFilters));
        
        // Trigger a re-render of labels
        import('./renderer.js').then(({ forceRenderLabels }) => {
          forceRenderLabels();
        });
      });
    }
  });

  // Toggle dropdown
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Clear filters
  const btnClear = document.getElementById('btn-clear-filters');
  btnClear?.addEventListener('click', (e) => {
    e.stopPropagation();
    filterIds.forEach(id => {
      window.viewFilters[id] = false;
      const cb = document.getElementById(id);
      if (cb) cb.checked = false;
    });
    localStorage.setItem('fpViewFilters', JSON.stringify(window.viewFilters));
    import('./renderer.js').then(({ forceRenderLabels }) => {
      forceRenderLabels();
    });
  });
  
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdown && dropdown.style.display === 'block' && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

function bindToolbar() {
  const buttons = document.querySelectorAll('.fp-tool-btn[data-tool]');
  const furniturePanel = document.getElementById('furniture-catalog-panel');
  const btnCloseFurniture = document.getElementById('btn-close-furniture');

  btnCloseFurniture?.addEventListener('click', () => {
    if(furniturePanel) furniturePanel.style.display = 'none';
    // Remove active state from button
    document.querySelector('.fp-tool-btn[data-tool="furniture"]')?.classList.remove('active');
  });

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (furniturePanel) {
        if (tool === 'furniture') {
          furniturePanel.style.display = 'flex';
        } else {
          furniturePanel.style.display = 'none';
        }
      }
      
      document.getElementById('floor-color-picker')?.classList.toggle('visible', tool === 'floor');
      document.getElementById('wall-type-picker')?.classList.toggle('visible', tool === 'wall');
      
      import('./tools.js').then(({ setActiveTool }) => {
        setActiveTool(tool);
      });
    });
  });

  document.querySelectorAll('.fp-color-swatch').forEach(s => {
    s.addEventListener('click', () => {
      document.querySelectorAll('.fp-color-swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      setFloorColor(s.dataset.color);
    });
  });

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
  let selectedIndex = -1;

  async function doSearch() {
    const q = input.value.trim();
    if (!q) {
      results.classList.remove('visible');
      selectedIndex = -1;
      return;
    }

    try {
      const res = await api(`ajax/search_asset.php?q=${encodeURIComponent(q)}`);
      const items = res.data || [];
      selectedIndex = -1;

      if (items.length === 0) {
        results.innerHTML = '<div class="fp-search-results__empty">No results.</div>';
      } else {
        results.innerHTML = items.map(item => {
          if (item.type === 'room') {
            return `
              <div class="fp-search-results__item" data-type="room" data-room-id="${item.room_id}" data-b="${item.building_name}" data-f="${item.floor_name}" data-r="${item.room_name}">
                <span class="fp-search-results__name">🗺️ Map: ${item.room_name}</span>
                <span class="fp-search-results__location">📍 ${item.building_name} › ${item.floor_name}</span>
              </div>
            `;
          } else {
            return `
              <div class="fp-search-results__item" data-type="asset" data-asset-id="${item.asset_id}" data-hw-id="${item.hardware_id}" data-room-id="${item.room_id}" data-r="${item.room_name}" data-b="${item.building_name}" data-f="${item.floor_name}">
                <span class="fp-search-results__name">💻 ${item.hardware_name} — ${item.ip || '—'}</span>
                <span class="fp-search-results__location">📍 ${item.building_name} › ${item.floor_name} › ${item.room_name}</span>
              </div>
            `;
          }
        }).join('');

        results.querySelectorAll('.fp-search-results__item').forEach(el => {
          el.addEventListener('click', async () => {
            if (!(await window.checkEditMode())) return;
            
            const roomId = el.dataset.roomId || el.dataset.rId; // rId for rooms if I set it
            const roomName = el.dataset.r;
            
            if (el.dataset.type === 'room') {
              updateBreadcrumb(el.dataset.b, el.dataset.f, roomName);
              notify(`Switched to map: ${roomName}`);
              
              api(`get_room.php?id=${fetchId}`)
                .then(json => {
                  if (json.status === 'success') {
                    import('./renderer.js').then(({ loadMapData }) => loadMapData(json.data));
                  }
                })
                .catch(() => {
                  notify(`No data found for "${roomName}". Loading empty map.`, 'warning');
                  import('./renderer.js').then(({ loadMapData }) => {
                    loadMapData({ floor_zones: [], walls: [], doors: [], furniture: [], assets: [] });
                  });
                });
            } else {
              // It's an asset. We must switch to the room AND focus the asset!
              const roomId = el.dataset.roomId;
              const roomName = el.dataset.r;
              const assetId = el.dataset.assetId;
              
              updateBreadcrumb(el.dataset.b, el.dataset.f, roomName);
              notify(`Loading map and focusing: ${el.dataset.hwId}`);
              
              api(`get_room.php?id=${roomId}`)
                .then(json => {
                  if (json.status === 'success') {
                    import('./renderer.js').then(({ loadMapData }) => {
                      loadMapData(json.data);
                      
                      // After load, we must focus the asset! Wait a tick for rendering.
                      setTimeout(() => {
                        import('./engine.js').then(({ stage, assetsLayer, getTransformer }) => {
                          const hwId = el.dataset.hwId;
                          const group = assetsLayer.getChildren().find(node => String(node.getAttr('hardware_id')) === String(hwId) || String(node.id()) === String(assetId));
                          
                          if (group) {
                            // Pulse effect on the found asset
                            const pulse = new Konva.Circle({
                              x: group.x(), y: group.y(),
                              radius: 30, stroke: '#961B7E', strokeWidth: 2, opacity: 1
                            });
                            assetsLayer.add(pulse);
                            new Konva.Tween({
                              node: pulse, duration: 1, radius: 100, opacity: 0,
                              onFinish: () => pulse.destroy()
                            }).play();

                            // Select it
                            const tr = getTransformer();
                            tr.nodes([group]);
                            tr.getLayer().batchDraw();
                          } else {
                            console.warn("Searched asset not found in Konva layer. hwId:", hwId, "assetId:", assetId);
                          }
                        });
                      }, 200);
                    });
                  }
                })
                .catch(() => {
                  notify(`No map found for asset "${el.dataset.hwId}".`, 'warning');
                  import('./renderer.js').then(({ loadMapData }) => {
                    loadMapData({ floor_zones: [], walls: [], doors: [], furniture: [], assets: [] });
                  });
                });
            }
            results.classList.remove('visible');
          });
        });
      }
      results.classList.add('visible');
    } catch (e) {
      console.warn("Search API failed", e);
    }
  }

  let searchTimeout;
  input?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(doSearch, 300);
  });

  input?.addEventListener('keydown', (e) => {
    if (!results.classList.contains('visible')) return;
    
    const items = Array.from(results.querySelectorAll('.fp-search-results__item'));
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        items[selectedIndex].click();
      } else if (items.length > 0) {
        items[0].click(); // default to first if none selected
      }
    }
  });

  function updateSelection(items) {
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  btn?.addEventListener('click', () => {
    clearTimeout(searchTimeout);
    doSearch();
  });

  // Vim-like search shortcut ('/' or 'i')
  document.addEventListener('keydown', (e) => {
    // Ignore if user is already typing in an input or textarea
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }
    
    if (e.key === '/' || e.key === 'i') {
      e.preventDefault();
      input.focus();
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
    
    // Undo: Ctrl+Z
    if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      import('./history.js').then(({ undo }) => undo());
    }
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    else if (isCmdOrCtrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      import('./history.js').then(({ redo }) => redo());
    }
  });

  document.addEventListener('click', (e) => {
    if (results?.classList.contains('visible') && !results.contains(e.target) && e.target !== input && e.target !== btn) {
      results.classList.remove('visible');
    }
  });
}

window.closeModal = function(modal) {
  if (!modal || !modal.classList.contains('visible')) return;
  modal.classList.add('hiding');
  // Wait for animation to finish before hiding
  setTimeout(() => {
    modal.classList.remove('visible');
    modal.classList.remove('hiding');
  }, 250);
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modals = Array.from(document.querySelectorAll('.fp-modal.visible'));
    if (modals.length > 0) {
      const modalToClose = modals[modals.length - 1];
      // Simulate click on the modal overlay which triggers the close handler
      modalToClose.click();
    }
  }
});

function bindFurnitureModal() {
  const modal = document.getElementById('furniture-modal');
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) window.closeModal(modal);
  });

  modal.querySelectorAll('.fp-furniture-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      window.closeModal(modal);
      
      setActiveFurnitureType(type);
      setActiveTool('furniture');
      
      notify(`Furniture "${type}" selected. Click on canvas to place it.`, 'info');
      
      document.querySelectorAll('.fp-tool-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.fp-tool-btn[data-tool="furniture"]')?.classList.add('active');
    });
  });
}

window.loadRoomMap = async function(roomId, roomName, buildingName, floorName) {
  if (!(await window.checkEditMode())) return;
  
  updateBreadcrumb(buildingName, floorName, roomName);
  
  const modal = document.getElementById('map-navigator-modal');
  if (modal) window.closeModal(modal);
  
  notify(`Loading map: ${roomName}...`);
  
  api(`get_room.php?id=${roomId}`)
    .then(json => {
      if (json.status === 'success') {
        import('./renderer.js').then(({ loadMapData }) => {
          loadMapData(json.data);
          const roomData = json.data.room_data;
          updateBreadcrumb(roomData.building_name, roomData.floor_name, roomData.name);
        });
      }
    })
    .catch(() => {
      notify(`No data found for "${roomName}". Loading empty map.`, 'warning');
      import('./renderer.js').then(({ loadMapData }) => {
        loadMapData({ floor_zones: [], walls: [], doors: [], furniture: [], assets: [] });
      });
    });
};

window.openMapNavigator = async function(preselect = '') {
  if (!(await window.checkEditMode())) return;
  
  const modal = document.getElementById('map-navigator-modal');
  const sidebar = document.getElementById('navigator-sidebar');
  const sidebarSearch = document.getElementById('nav-sidebar-search');
  if (!modal) return;

  modal.classList.add('visible');
  
  if (sidebarSearch) {
    sidebarSearch.value = ''; // clear search box so we don't filter out things
  }

  const resolveTargetFid = () => {
    const pLower = (preselect || '').trim().toLowerCase();
    if (!pLower) return null;
    let foundFid = null;
    currentMapTree.buildings.forEach(b => {
      if (!foundFid && b.name.toLowerCase() === pLower && b.floors.length > 0) {
        foundFid = b.floors[0].id;
      }
      b.floors.forEach(f => {
        if (!foundFid && f.name.toLowerCase() === pLower) {
          foundFid = f.id;
        }
      });
    });
    return foundFid;
  };

  if (!currentMapTree) {
    try {
      const json = await api('get_map_tree.php');
      currentMapTree = json.data;
      window.renderNavigatorSidebar('', resolveTargetFid());
    } catch (e) {
      console.error("Failed to load map tree", e);
      if (sidebar) sidebar.innerHTML = '<div style="padding:16px;color:red;">Error loading tree.</div>';
    }
  } else {
    // If it's already loaded, just render it again to reset search state if needed
    window.renderNavigatorSidebar('', resolveTargetFid());
  }
};

function bindMapNavigator() {
  const modal = document.getElementById('map-navigator-modal');
  const closeBtn = modal?.querySelector('.fp-navigator__close');
  const sidebar = document.getElementById('navigator-sidebar');
  const grid = document.getElementById('navigator-grid');
  const sidebarSearch = document.getElementById('nav-sidebar-search');

  if (!modal) return;

  let isEditMapMode = false;
  let mapOrderUpdates = []; // stores {type, id, order}

  const btnEditOrder = document.getElementById('btn-edit-order');
  const btnSaveOrder = document.getElementById('btn-save-order');
  const btnCancelOrder = document.getElementById('btn-cancel-order');
  const btnNewMap = document.getElementById('btn-new-map');

  const navDefaultActions = document.getElementById('nav-default-actions');
  const navEditActions = document.getElementById('nav-edit-actions');

  function resetEditOrderMode() {
    if (!isEditMapMode) return;
    isEditMapMode = false;
    mapOrderUpdates = [];
    
    if (navEditActions) {
      navEditActions.style.opacity = '0';
      navEditActions.style.pointerEvents = 'none';
    }
    if (navDefaultActions) {
      navDefaultActions.style.opacity = '1';
      navDefaultActions.style.pointerEvents = 'auto';
    }
    const sidebarContainer = document.querySelector('.fp-navigator__sidebar');
    if (sidebarContainer) sidebarContainer.style.width = '220px';
    
    document.querySelectorAll('.fp-sidebar-actions, .fp-room-card-actions').forEach(el => el.classList.add('is-closing'));
    
    const activeFid = sidebar.querySelector('.fp-nav-floor.active')?.dataset.fid;
    
    api('get_map_tree.php').then(json => {
      currentMapTree = json.data;
    });
    
    setTimeout(() => {
      window.renderNavigatorSidebar('', activeFid);
    }, 300);
  }

  const closeModalFunc = () => {
    resetEditOrderMode();
    window.closeModal(modal);
  };

  closeBtn?.addEventListener('click', closeModalFunc);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModalFunc();
  });

  btnEditOrder?.addEventListener('click', () => {
    isEditMapMode = true;
    mapOrderUpdates = [];
    
    if (navDefaultActions) {
      navDefaultActions.style.opacity = '0';
      navDefaultActions.style.pointerEvents = 'none';
    }
    if (navEditActions) {
      navEditActions.style.opacity = '1';
      navEditActions.style.pointerEvents = 'auto';
    }
    
    const sidebarContainer = document.querySelector('.fp-navigator__sidebar');
    if (sidebarContainer) sidebarContainer.style.width = '300px';

    // Refresh with edit UI
    const activeFid = sidebar.querySelector('.fp-nav-floor.active')?.dataset.fid;
    window.renderNavigatorSidebar('', activeFid);
  });

  btnCancelOrder?.addEventListener('click', () => {
    resetEditOrderMode();
  });
  
  btnSaveOrder?.addEventListener('click', async () => {
    btnSaveOrder.innerText = 'Saving...';
    try {
      if (mapOrderUpdates.length > 0) {
        await api('manage_tree.php', { method: 'POST', body: JSON.stringify({ action: 'reorder', updates: mapOrderUpdates }) });
      }
      notify("Order saved successfully", "success");
      // Reload tree
      const json = await api('get_map_tree.php');
      currentMapTree = json.data;
    } catch (e) {
      notify("Error saving order: " + e.message, "error");
    }
    
    isEditMapMode = false;
    btnSaveOrder.innerText = '✔ Save';
    btnSaveOrder.style.display = 'none';
    if (btnCancelOrder) btnCancelOrder.style.display = 'none';
    btnEditOrder.style.display = 'inline-block';
    
    const sidebarContainer = document.querySelector('.fp-navigator__sidebar');
    if (sidebarContainer) sidebarContainer.style.width = '220px';
    
    document.querySelectorAll('.fp-sidebar-actions, .fp-room-card-actions').forEach(el => el.classList.add('is-closing'));
    
    const activeFid = sidebar.querySelector('.fp-nav-floor.active')?.dataset.fid;
    
    setTimeout(() => {
       window.renderNavigatorSidebar('', activeFid);
    }, 300);
  });

  async function handleDelete(type, id) {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
      const res = await api('manage_tree.php', { method: 'POST', body: JSON.stringify({ action: 'delete', type, id }) });
      if (res.status === 'success') {
        notify(`${type} deleted successfully.`, "success");
        const json = await api('get_map_tree.php');
        currentMapTree = json.data;
        window.renderNavigatorSidebar();
      } else {
        notify("Error deleting: " + res.message, "error");
      }
    } catch (e) {
      notify("Failed to delete: " + e.message, "error");
    }
  }

  function openPropertiesModal(type, id, oldName) {
    const modal = document.getElementById('fp-properties-modal');
    if (!modal) return;
    
    const nameInput = document.getElementById('prop-name-input');
    const parentSelect = document.getElementById('prop-parent-select');
    const parentGroup = document.getElementById('prop-parent-group');
    
    nameInput.value = oldName;
    
    let currentParentId = null;
    parentSelect.innerHTML = '';
    
    if (type === 'building') {
      parentGroup.style.display = 'none';
    } else if (type === 'floor') {
      parentGroup.style.display = 'block';
      const b = currentMapTree.buildings.find(b => b.floors.some(f => f.id == id));
      if (b) currentParentId = b.id;
      
      currentMapTree.buildings.forEach(b => {
         const opt = document.createElement('option');
         opt.value = b.id;
         opt.textContent = b.name;
         if (b.id == currentParentId) opt.selected = true;
         parentSelect.appendChild(opt);
      });
    } else if (type === 'room') {
      parentGroup.style.display = 'block';
      currentMapTree.buildings.forEach(b => {
         b.floors.forEach(f => {
             if (f.rooms && f.rooms.some(r => r.id == id)) currentParentId = f.id;
         });
      });
      
      currentMapTree.buildings.forEach(b => {
         b.floors.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = `${b.name} > ${f.name}`;
            if (f.id == currentParentId) opt.selected = true;
            parentSelect.appendChild(opt);
         });
      });
    }
    
    modal.classList.add('visible');
    setTimeout(() => { nameInput.focus(); nameInput.select(); }, 100);
    
    let btnCancel = document.getElementById('btn-cancel-prop');
    let btnSave = document.getElementById('btn-save-prop');
    
    const cleanup = () => {
       const newCancel = btnCancel.cloneNode(true);
       btnCancel.replaceWith(newCancel);
       const newSave = btnSave.cloneNode(true);
       btnSave.replaceWith(newSave);
    };
    
    const closeFunc = () => {
       cleanup();
       window.closeModal(modal);
    };
    
    btnCancel.addEventListener('click', closeFunc);
    
    const headerCloseBtn = document.getElementById('prop-close-header-btn');
    if (headerCloseBtn) headerCloseBtn.onclick = closeFunc;
    
    modal.onclick = (e) => {
       if (e.target === modal) closeFunc();
    };
    
    btnSave.addEventListener('click', async () => {
       btnSave.disabled = true;
       btnSave.innerText = 'Saving...';
       const newName = nameInput.value.trim();
       const newParentId = parseInt(parentSelect.value);
       
       let didChange = false;
       try {
           if (newName && newName !== oldName) {
               await api('manage_tree.php', { method: 'POST', body: JSON.stringify({ action: 'rename', id, name: newName }) });
               didChange = true;
           }
           
           if (type !== 'building' && newParentId && newParentId !== currentParentId) {
               await api('manage_tree.php', { method: 'POST', body: JSON.stringify({ action: 'move', id, parent_id: newParentId }) });
               didChange = true;
           }
           
           if (didChange) {
               notify("Properties updated successfully", "success");
               const json = await api('get_map_tree.php');
               currentMapTree = json.data;
               const activeFid = document.querySelector('.fp-nav-floor.active')?.dataset.fid;
               window.renderNavigatorSidebar('', activeFid);
           }
       } catch (err) {
           notify("Error updating properties: " + err.message, "error");
       }
       
       btnSave.disabled = false;
       btnSave.innerText = 'Save';
       closeFunc();
    });
  }

  function moveItemInArray(arr, index, dir) {
    if (dir === 'up' && index > 0) {
      const temp = arr[index];
      arr[index] = arr[index - 1];
      arr[index - 1] = temp;
      return true;
    } else if (dir === 'down' && index < arr.length - 1) {
      const temp = arr[index];
      arr[index] = arr[index + 1];
      arr[index + 1] = temp;
      return true;
    }
    return false;
  }

  function registerOrderUpdate(type, id, newOrder) {
    const existing = mapOrderUpdates.find(u => u.type === type && u.id == id);
    if (existing) existing.sort_order = newOrder;
    else mapOrderUpdates.push({ type, id, sort_order: newOrder });
  }

  window.renderNavigatorSidebar = function(filter = '', preselectFid = null) {
    if (!currentMapTree) return;
    let html = '';
    
    currentMapTree.buildings.forEach(b => {
      // Filter logic: if building matches or any floor matches or any room inside floor matches
      const bMatch = b.name.toLowerCase().includes(filter);
      const matchedFloors = b.floors.filter(f => {
        const fMatch = f.name.toLowerCase().includes(filter);
        const rMatch = (f.rooms || []).some(r => r.name.toLowerCase().includes(filter));
        return fMatch || rMatch;
      });
      
      if (filter && !bMatch && matchedFloors.length === 0) return; // Skip if no match
      
      const floorsToRender = filter && !bMatch ? matchedFloors : b.floors;

      const pencilSvg = `<svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3.5L16.5 5.5L5.5 16.5L3.5 16.5L3.5 14.5L14.5 3.5Z"/></svg>`;
      const trashSvg = `<svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h14M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M5 6v10a2 2 0 002 2h6a2 2 0 002-2V6"/></svg>`;
      
      const bBuildingIcon = `<svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" style="margin-right:6px;color:#64748b;flex-shrink:0;"><rect x="4" y="2" width="12" height="16" rx="1"/><line x1="7" y1="5" x2="9" y2="5"/><line x1="11" y1="5" x2="13" y2="5"/><line x1="7" y1="9" x2="9" y2="9"/><line x1="11" y1="9" x2="13" y2="9"/><line x1="7" y1="13" x2="9" y2="13"/><line x1="11" y1="13" x2="13" y2="13"/><line x1="9" y1="18" x2="9" y2="15"/></svg>`;
      const fFloorIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:8px;color:#94a3b8;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>`;
      const chevronIcon = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px;color:#cbd5e1;flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>`;

      const bIdx = currentMapTree.buildings.indexOf(b);
      const bTotal = currentMapTree.buildings.length;
      const showBUp = bTotal > 1 && bIdx > 0;
      const showBDown = bTotal > 1 && bIdx < bTotal - 1;

      html += `<div class="fp-nav-building" data-id="${b.id}" style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;min-width:0;flex:1;">
          ${chevronIcon}
          ${bBuildingIcon}
          <span class="fp-item-title" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.name}</span>
        </div>
        ${isEditMapMode ? `<div class="fp-sidebar-actions" style="display:flex;gap:2px;align-items:center;flex-shrink:0;">
            <button class="fp-btn-icon fp-btn-rename" data-id="${b.id}" data-name="${b.name}" title="Rename">${pencilSvg}</button>
            <button class="fp-btn-icon fp-btn-del" data-type="building" data-id="${b.id}" title="Delete">${trashSvg}</button>
            ${showBUp ? `<button class="fp-btn-icon fp-btn-up" data-type="building" data-id="${b.id}" data-idx="${bIdx}" title="Move up">▲</button>` : ''}
            ${showBDown ? `<button class="fp-btn-icon fp-btn-down" data-type="building" data-id="${b.id}" data-idx="${bIdx}" title="Move down">▼</button>` : ''}
        </div>` : ''}
      </div>`;
      
      const fTotal = floorsToRender.length;
      floorsToRender.forEach((f, fIdx) => {
        const showFUp = fTotal > 1 && fIdx > 0;
        const showFDown = fTotal > 1 && fIdx < fTotal - 1;
        html += `<div class="fp-nav-floor" data-bid="${b.id}" data-fid="${f.id}" style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;min-width:0;flex:1;">
            ${fFloorIcon}
            <span class="fp-item-title" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name}</span>
          </div>
          ${isEditMapMode ? `<div class="fp-sidebar-actions" style="display:flex;gap:2px;align-items:center;flex-shrink:0;">
              <button class="fp-btn-icon fp-btn-rename" data-id="${f.id}" data-name="${f.name}" title="Rename">${pencilSvg}</button>
              <button class="fp-btn-icon fp-btn-del" data-type="floor" data-id="${f.id}" title="Delete">${trashSvg}</button>
              ${showFUp ? `<button class="fp-btn-icon fp-btn-up" data-type="floor" data-bid="${b.id}" data-id="${f.id}" data-idx="${fIdx}" title="Move up">▲</button>` : ''}
              ${showFDown ? `<button class="fp-btn-icon fp-btn-down" data-type="floor" data-bid="${b.id}" data-id="${f.id}" data-idx="${fIdx}" title="Move down">▼</button>` : ''}
          </div>` : ''}
        </div>`;
      });
    });
    
    const firstRects = new Map();
    if (isEditMapMode) {
      sidebar.querySelectorAll('.fp-nav-building, .fp-nav-floor').forEach(el => {
         const key = el.dataset.fid ? 'floor-' + el.dataset.fid : 'building-' + el.dataset.id;
         firstRects.set(key, el.getBoundingClientRect());
      });
    }
    
    sidebar.innerHTML = html || '<div style="padding:10px;color:var(--fp-text-muted);font-size:11px;">No matches</div>';

    if (isEditMapMode && firstRects.size > 0) {
       requestAnimationFrame(() => {
         sidebar.querySelectorAll('.fp-nav-building, .fp-nav-floor').forEach(el => {
           const key = el.dataset.fid ? 'floor-' + el.dataset.fid : 'building-' + el.dataset.id;
           const firstRect = firstRects.get(key);
           if (firstRect) {
             const lastRect = el.getBoundingClientRect();
             const deltaY = firstRect.top - lastRect.top;
             if (deltaY !== 0) {
                el.style.transform = `translateY(${deltaY}px)`;
                el.style.transition = 'none';
                
                requestAnimationFrame(() => {
                  el.style.transform = '';
                  el.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.15, 0.64, 1)'; // very slight, crisp bounce
                  
                  setTimeout(() => {
                      el.style.transition = '';
                  }, 350);
                });
             }
           }
         });
       });
    }

    sidebar.querySelectorAll('.fp-nav-floor').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return; // let buttons handle themselves
        sidebar.querySelectorAll('.fp-nav-floor').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        
        const b = currentMapTree.buildings.find(x => x.id == el.dataset.bid);
        const f = b.floors.find(x => x.id == el.dataset.fid);
        renderNavigatorGrid(b, f);
      });
      
      el.addEventListener('dblclick', async (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        if (isEditMapMode) return;
        
        const b = currentMapTree.buildings.find(x => x.id == el.dataset.bid);
        const f = b.floors.find(x => x.id == el.dataset.fid);
        if (f && f.rooms && f.rooms.length > 0) {
            const r = f.rooms[0];
            window.loadRoomMap(r.id, r.name, b.name, f.name);
        }
      });
    });

    sidebar.querySelectorAll('.fp-nav-building').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return; // let buttons handle themselves
        const b = currentMapTree.buildings.find(x => x.id == el.dataset.id);
        if (b && b.floors && b.floors.length > 0) {
          const f = b.floors[0];
          const floorEl = sidebar.querySelector(`.fp-nav-floor[data-bid="${b.id}"][data-fid="${f.id}"]`);
          if (floorEl) {
            floorEl.click();
          } else {
            renderNavigatorGrid(b, f);
          }
        }
      });

      el.addEventListener('dblclick', async (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        if (isEditMapMode) return;
        
        const b = currentMapTree.buildings.find(x => x.id == el.dataset.id);
        if (b && b.floors && b.floors.length > 0) {
            for (let f of b.floors) {
                if (f.rooms && f.rooms.length > 0) {
                    const r = f.rooms[0];
                    window.loadRoomMap(r.id, r.name, b.name, f.name);
                    return;
                }
            }
        }
      });
    });

    if (isEditMapMode) {
      sidebar.querySelectorAll('.fp-btn-up, .fp-btn-down').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const type = btn.dataset.type;
          const dir = btn.classList.contains('fp-btn-up') ? 'up' : 'down';
          const idx = parseInt(btn.dataset.idx);
          let arr = [];
          
          if (type === 'building') {
            arr = currentMapTree.buildings;
            if (moveItemInArray(arr, idx, dir)) {
               arr.forEach((item, i) => registerOrderUpdate(type, item.id, i));
               const activeFid = sidebar.querySelector('.fp-nav-floor.active')?.dataset.fid;
               window.renderNavigatorSidebar('', activeFid);
            }
          }
          
          if (type === 'floor') {
             const b = currentMapTree.buildings.find(x => x.id == btn.dataset.bid);
             const bIdx = currentMapTree.buildings.indexOf(b);
             arr = b.floors;
             const fId = btn.dataset.id;
             
             let moveTargetBid = null;
             if (dir === 'up' && idx === 0 && bIdx > 0) {
                 moveTargetBid = currentMapTree.buildings[bIdx - 1].id;
             } else if (dir === 'down' && idx === arr.length - 1 && bIdx < currentMapTree.buildings.length - 1) {
                 moveTargetBid = currentMapTree.buildings[bIdx + 1].id;
             }
             
             if (moveTargetBid) {
                 // Cross-building move!
                 btn.innerText = '...';
                 try {
                     if (mapOrderUpdates && mapOrderUpdates.length > 0) {
                        await api('manage_tree.php', { method: 'POST', body: JSON.stringify({ action: 'reorder', updates: mapOrderUpdates }) });
                        mapOrderUpdates = [];
                     }
                     await api('manage_tree.php', { method: 'POST', body: JSON.stringify({ action: 'move', id: fId, parent_id: moveTargetBid }) });
                     
                     const json = await api('get_map_tree.php');
                     currentMapTree = json.data;
                     
                     const activeFid = sidebar.querySelector('.fp-nav-floor.active')?.dataset.fid;
                     window.renderNavigatorSidebar('', activeFid);
                 } catch (err) {
                     notify("Error moving floor: " + err.message, "error");
                     btn.innerText = dir === 'up' ? '▲' : '▼';
                 }
             } else {
                 // Normal reorder inside the same building
                 if (moveItemInArray(arr, idx, dir)) {
                    arr.forEach((item, i) => registerOrderUpdate(type, item.id, i));
                    const activeFid = sidebar.querySelector('.fp-nav-floor.active')?.dataset.fid;
                    window.renderNavigatorSidebar('', activeFid);
                 }
             }
          }
        });
      });
    sidebar.querySelectorAll('.fp-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(btn.dataset.type, btn.dataset.id);
      });
    });

    sidebar.querySelectorAll('.fp-btn-rename').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.closest('.fp-nav-building') ? 'building' : 'floor';
        openPropertiesModal(type, btn.dataset.id, btn.dataset.name);
      });
    });
    }
    
    // Auto-select floor
    let targetFloor = null;
    if (preselectFid) {
      targetFloor = sidebar.querySelector(`.fp-nav-floor[data-fid="${preselectFid}"]`);
    }
    
    if (!targetFloor) {
      targetFloor = sidebar.querySelector('.fp-nav-floor');
    }

    if (targetFloor) {
      targetFloor.style.transition = 'none';
      targetFloor.click();
      targetFloor.offsetHeight; // force reflow
      targetFloor.style.transition = '';
      if (preselectFid) targetFloor.scrollIntoView({ block: 'nearest' });
    } else {
      grid.innerHTML = '<div style="padding:40px;grid-column:1/-1;text-align:center;">Select a floor</div>';
    }
  };

  sidebarSearch?.addEventListener('input', (e) => {
    renderNavigatorSidebar(e.target.value.toLowerCase().trim());
  });

  function renderNavigatorGrid(building, floor) {
    if (!floor.rooms || floor.rooms.length === 0) {
      grid.innerHTML = '<div style="padding:40px;grid-column:1/-1;text-align:center;">No maps on this floor.</div>';
      return;
    }

    const searchVal = document.getElementById('nav-sidebar-search')?.value.toLowerCase().trim() || '';
    let roomsToRender = floor.rooms;
    if (searchVal) {
      const filtered = roomsToRender.filter(r => r.name.toLowerCase().includes(searchVal));
      if (filtered.length > 0) {
        roomsToRender = filtered;
      }
    }

    const pencilSvg = `<svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3.5L16.5 5.5L5.5 16.5L3.5 16.5L3.5 14.5L14.5 3.5Z"/></svg>`;
    const trashSvg = `<svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h14M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M5 6v10a2 2 0 002 2h6a2 2 0 002-2V6"/></svg>`;

    const firstRects = new Map();
    if (isEditMapMode) {
      grid.querySelectorAll('.fp-room-card').forEach(el => {
         firstRects.set(el.dataset.roomId, el.getBoundingClientRect());
      });
    }

    const rTotal = roomsToRender.length;

    grid.innerHTML = roomsToRender.map((r, idx) => {
      const showRUp = rTotal > 1 && idx > 0;
      const showRDown = rTotal > 1 && idx < rTotal - 1;
      
      return `
      <div class="fp-room-card" data-bname="${building.name}" data-fname="${floor.name}" data-rname="${r.name}" data-room-id="${r.id}">
        <div class="fp-room-thumb" style="background:${r.color};">${r.icon}</div>
        ${isEditMapMode ? `
        <div class="fp-room-card-actions">
            <button class="fp-btn-icon fp-btn-rename" data-id="${r.id}" data-name="${r.name}" title="Rename">${pencilSvg}</button>
            <button class="fp-btn-icon fp-btn-del" data-type="room" data-id="${r.id}" title="Delete">${trashSvg}</button>
            ${showRUp ? `<button class="fp-btn-icon fp-grid-up" data-idx="${idx}" data-fid="${floor.id}" data-bid="${building.id}" title="Move left">◀</button>` : ''}
            ${showRDown ? `<button class="fp-btn-icon fp-grid-down" data-idx="${idx}" data-fid="${floor.id}" data-bid="${building.id}" title="Move right">▶</button>` : ''}
        </div>` : ''}
        <div class="fp-room-info" style="flex:1;">
          <div class="fp-room-name fp-item-title" title="${r.name}">${r.name}</div>
          <div class="fp-room-meta">
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor"><rect x="3" y="2" width="14" height="16" rx="2"/></svg>
            ${r.assetCount} assets
          </div>
        </div>
      </div>
    `}).join('');

    if (isEditMapMode && firstRects.size > 0) {
       requestAnimationFrame(() => {
         grid.querySelectorAll('.fp-room-card').forEach(el => {
           const firstRect = firstRects.get(el.dataset.roomId);
           if (firstRect) {
             const lastRect = el.getBoundingClientRect();
             const deltaX = firstRect.left - lastRect.left;
             const deltaY = firstRect.top - lastRect.top;
             if (deltaX !== 0 || deltaY !== 0) {
                el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
                el.style.transition = 'none';
                
                requestAnimationFrame(() => {
                  el.style.transform = '';
                  el.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.15, 0.64, 1)';
                  
                  setTimeout(() => {
                      el.style.transition = '';
                  }, 350);
                });
             }
           }
         });
       });
    }

    grid.querySelectorAll('.fp-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(btn.dataset.type, btn.dataset.id);
      });
    });

    grid.querySelectorAll('.fp-btn-rename').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openPropertiesModal('room', btn.dataset.id, btn.dataset.name);
      });
    });

    if (isEditMapMode) {
      grid.querySelectorAll('.fp-grid-up, .fp-grid-down').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dir = btn.classList.contains('fp-grid-up') ? 'up' : 'down';
          const idx = parseInt(btn.dataset.idx);
          if (moveItemInArray(floor.rooms, idx, dir)) {
             floor.rooms.forEach((r, i) => registerOrderUpdate('room', r.id, i));
             renderNavigatorGrid(building, floor);
          }
        });
      });
      grid.querySelectorAll('.fp-grid-del').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleDelete('room', btn.dataset.id);
        });
      });
    }

    grid.querySelectorAll('.fp-room-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (isEditMapMode) return; // Disable loading maps while in edit mode
        if (e.target.tagName === 'BUTTON') return;

        if (!(await window.checkEditMode())) return;
        
        const roomName = card.dataset.rname;
        const roomId = card.dataset.roomId || '100'; // Default fallback
        window.loadRoomMap(roomId, roomName, card.dataset.bname, card.dataset.fname);
      });
    });
  }

  const createModal = document.getElementById('create-map-modal');
  if (btnNewMap && createModal) {
    btnNewMap.addEventListener('click', () => {
      window.closeModal(modal); // Close navigator
      openCreateMapModal();
    });
  }
}
function bindCreateMap() {
  const modal = document.getElementById('create-map-modal');
  const btnCancel = document.getElementById('btn-cancel-create');
  const btnSubmit = document.getElementById('btn-submit-create');
  const btnCloseHeader = document.getElementById('create-map-close');
  
  if (!modal) return;

  const closeAndReopenNav = () => {
    window.closeModal(modal);
    if (window.openMapNavigator) {
      window.openMapNavigator();
    }
  };

  btnCloseHeader?.addEventListener('click', closeAndReopenNav);
  btnCancel.addEventListener('click', closeAndReopenNav);
  
  window.openCreateMapModal = async function() {
    modal.classList.add('visible');
    
    // Ensure we have the tree
    if (!currentMapTree) {
      try {
        const json = await api('get_map_tree.php');
        currentMapTree = json.data;
      } catch (e) {}
    }
    
    const bSel = document.getElementById('create-map-building-sel');
    const fSel = document.getElementById('create-map-floor-sel');
    
    // Populate Buildings
    if (bSel && currentMapTree && currentMapTree.buildings) {
      let bHtml = '<option value="">+ New</option>';
      currentMapTree.buildings.forEach(b => {
        bHtml += `<option value="${b.id}">${b.name}</option>`;
      });
      bSel.innerHTML = bHtml;
    }
    
    // Reset inputs
    document.getElementById('create-map-building-txt').value = '';
    document.getElementById('create-map-floor-txt').value = '';
    document.getElementById('create-map-room-txt').value = '';
    
    if (fSel) fSel.innerHTML = '<option value="">+ New</option>';
    
    // Reset flex styles
    bSel.style.flex = '0 0 25%';
    if (fSel) fSel.style.flex = '0 0 25%';

    bSel.addEventListener('change', () => {
      const bTxt = document.getElementById('create-map-building-txt');
      const fTxt = document.getElementById('create-map-floor-txt');

      if (bSel.value === "") {
        bSel.style.flex = '0 0 25%';
        bTxt.style.display = 'block';
        fSel.style.flex = '0 0 25%';
        fSel.innerHTML = '<option value="">+ New</option>';
        fTxt.style.display = 'block';
      } else {
        bSel.style.flex = '1 1 100%';
        bTxt.style.display = 'none';
        fSel.style.flex = '0 0 25%';
        fTxt.style.display = 'block';
        
        const b = currentMapTree.buildings.find(x => x.id == bSel.value);
        let fHtml = '<option value="">+ New</option>';
        if (b && b.floors) {
          b.floors.forEach(f => {
            fHtml += `<option value="${f.id}">${f.name}</option>`;
          });
        }
        fSel.innerHTML = fHtml;
      }
    });
    
    fSel.addEventListener('change', () => {
      const fTxt = document.getElementById('create-map-floor-txt');
      if (fSel.value === "") {
        fSel.style.flex = '0 0 25%';
        fTxt.style.display = 'block';
      } else {
        fSel.style.flex = '1 1 100%';
        fTxt.style.display = 'none';
      }
    });
  };

  btnCancel.addEventListener('click', () => {
    window.closeModal(modal);
    if (window.openMapNavigator) {
      window.openMapNavigator();
    }
  });
  
  btnSubmit.addEventListener('click', async () => {
    const bSel = document.getElementById('create-map-building-sel');
    const bTxt = document.getElementById('create-map-building-txt');
    const fSel = document.getElementById('create-map-floor-sel');
    const fTxt = document.getElementById('create-map-floor-txt');
    const rTxt = document.getElementById('create-map-room-txt');
    const wTxt = document.getElementById('create-map-w');
    const hTxt = document.getElementById('create-map-h');
    
    const payload = {
      building_id: bSel.value,
      building_name: bTxt.value.trim(),
      floor_id: fSel.value,
      floor_name: fTxt.value.trim(),
      room_name: rTxt.value.trim(),
      width: parseFloat(wTxt.value) || 800,
      height: parseFloat(hTxt.value) || 600
    };
    
    if (!payload.room_name) return notify('Map Name is required', 'warning');
    if (!payload.building_id && !payload.building_name) return notify('Building is required', 'warning');
    if (!payload.floor_id && !payload.floor_name) return notify('Floor is required', 'warning');
    
    btnSubmit.innerText = 'Creating...';
    btnSubmit.disabled = true;
    
    try {
      const res = await api('create_map.php', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (res.status === 'success') {
        notify('Map created! Loading...', 'success');
        window.closeModal(modal);
        
        // Force refresh tree
        currentMapTree = null;
        
        // Load the new map
        const mapRes = await api(`get_room.php?id=${res.room_id}`);
        if (mapRes.status === 'success') {
          import('./renderer.js').then(({ loadMapData }) => {
            loadMapData(mapRes.data);
            const roomData = mapRes.data.room_data;
            updateBreadcrumb(roomData.building_name, roomData.floor_name, roomData.name);
            // Auto enter edit mode
            document.getElementById('btn-edit-mode')?.click();
          });
        }
      } else {
        notify('Error: ' + res.message, 'error');
      }
    } catch (e) {
      console.error(e);
      notify('Failed to create map', 'error');
    } finally {
      btnSubmit.innerText = 'Create';
      btnSubmit.disabled = false;
    }
  });
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

async function populateFurnitureCatalog() {
  const panel = document.getElementById('furniture-catalog-body');
  if (!panel) return;
  
  const { SVG_TABLES, SVG_CHAIRS } = await import('./skins.js');
  
  const items = [
    { type: 'desk_straight', label: 'Mesa Reta', svg: SVG_TABLES.desk_straight },
    { type: 'desk_small', label: 'Mesa Pequena', svg: SVG_TABLES.desk_small },
    { type: 'desk_l', label: 'Mesa L', svg: SVG_TABLES.desk_l },
    { type: 'desk_round', label: 'Mesa Reunião', svg: SVG_TABLES.desk_round },
    { type: 'rack_cabinet', label: 'Rack Servidor', svg: SVG_TABLES.rack_cabinet },
    { type: 'office_partition_80', label: 'Divisória 80', svg: SVG_TABLES.office_partition_80 },
    { type: 'office_partition_160', label: 'Divisória 160', svg: SVG_TABLES.office_partition_160 },
    { type: 'sofa', label: 'Sofá', svg: SVG_TABLES.sofa },
    { type: 'office_chair', label: 'Cadeira', svg: SVG_TABLES.office_chair },
    { type: 'executive_chair', label: 'Cadeira Exec.', svg: SVG_TABLES.executive_chair },
    { type: 'meeting_chairs_4', label: 'Cadeiras (x4)', svg: SVG_CHAIRS.meeting_chairs_4 },
    { type: 'water_cooler', label: 'Bebedouro', svg: SVG_TABLES.water_cooler },
    { type: 'plant', label: 'Planta', svg: SVG_TABLES.plant }
  ];

  panel.innerHTML = items.map(it => `
    <div class="fp-furniture-card" draggable="true" data-type="${it.type}">
      ${it.svg}
      <div class="fp-furniture-card__label">${it.label}</div>
    </div>
  `).join('');

  panel.querySelectorAll('.fp-furniture-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('furniture-type', card.dataset.type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  const container = document.getElementById('floorplan-container');
  container.addEventListener('dragover', (e) => {
    // Only allow drop if we are in Edit Mode and Furniture tool is selected
    const layout = document.getElementById('main-layout');
    if (!layout?.classList.contains('is-editing')) return;
    
    const activeTool = document.querySelector('.fp-tool-btn.active')?.dataset.tool;
    if (activeTool !== 'furniture') return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  container.addEventListener('drop', async (e) => {
    const layout = document.getElementById('main-layout');
    if (!layout?.classList.contains('is-editing')) return;
    
    const activeTool = document.querySelector('.fp-tool-btn.active')?.dataset.tool;
    if (activeTool !== 'furniture') return;
    
    const type = e.dataTransfer.getData('furniture-type');
    if (!type) return;
    e.preventDefault();

    const { stage, getRelativePointerPosition, applySnapOnDragEnd, getLayerFurniture } = await import('./engine.js');
    stage.setPointersPositions(e);
    let pos = getRelativePointerPosition();
    
    const { GRID_SIZE } = await import('./engine.js');
    pos.x = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    pos.y = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
    
    const { buildFurnitureNode } = await import('./furniture.js');
    const node = buildFurnitureNode({
      id: 'fur_' + Date.now(),
      type: type,
      x: pos.x,
      y: pos.y,
      rotation: 0
    });
    
    if (node) {
      const furnitureLayer = getLayerFurniture();
      furnitureLayer.add(node);
      node.draggable(true);
      applySnapOnDragEnd(node);
      furnitureLayer.getLayer().batchDraw();
      
      const { commitHistory } = await import('./history.js');
      commitHistory();
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
