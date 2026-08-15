/**
 * main.js — Phase 1.5: UI with Map Navigator & Unified Search
 */
import { api } from './api.js';
import { initEngine, zoomIn, zoomOut, zoomFit } from './engine.js';
import { loadMapData } from './renderer.js';
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
  bindCameraControls();
  
  bindToolbar();
  bindSearch();
  bindFurnitureModal();
  bindMapNavigator();
  bindModeToggle();
  
  // Initial Mock State
  setTimeout(async () => {
    try {
      const { skinManager } = await import('./skins.js');
      await skinManager.load();
      
      const res = await fetch('/ajax/mock_room_100.json');
      const json = await res.json();
      
      if (json.status === 'success') {
        loadMapData(json.data);
      }
    } catch (e) {
      console.warn("Error loading mock data", e);
    }
  }, 100);

  updateBreadcrumb('Headquarters', 'Ground Floor', 'Open Office A');

  console.info(`[floorplan] Phase 3: Data Layer & Konva Rendering loaded.`);
}

function updateBreadcrumb(building, floor, room) {
  const bc = document.getElementById('breadcrumb');
  if (!bc) return;
  bc.innerHTML = `
    <a href="#" data-nav="root" title="Open Navigator">🗺️ Todos os Mapas</a>
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

  function setMode(mode) {
    if (mode === 'edit') {
      layout.classList.add('is-editing');
      btnEdit.style.display = 'none';
      btnCancel.style.display = 'block';
      btnSave.style.display = 'block';
      
      explorerBody.innerHTML = `
        <div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">
          <strong>Modo Edição:</strong> Selecione Paredes, Zonas ou Móveis na barra lateral esquerda.
        </div>
      `;
      notify('Modo de Edição ativado.', 'warning');
    } else {
      layout.classList.remove('is-editing');
      btnEdit.style.display = 'flex';
      btnCancel.style.display = 'none';
      btnSave.style.display = 'none';
      
      explorerBody.innerHTML = `
        <div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">
          Listando Equipamentos de TI (Fase 3)...
        </div>
      `;
      notify(mode === 'save' ? 'Alterações salvas com sucesso!' : 'Edição cancelada.', 'success');
    }
    
    import('./engine.js').then(({ panToSafeArea, setEngineEditMode }) => {
      panToSafeArea();
      setEngineEditMode(mode === 'edit');
    });
    
    import('./renderer.js').then(({ toggleAssetEditMode }) => {
      toggleAssetEditMode(mode === 'edit');
    });
  }

  btnEdit.addEventListener('click', () => setMode('edit'));
  btnCancel.addEventListener('click', () => setMode('cancel'));
  btnSave.addEventListener('click', () => setMode('save'));
}

function bindToolbar() {
  const buttons = document.querySelectorAll('.fp-tool-btn[data-tool]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (tool === 'furniture') {
        document.getElementById('furniture-modal')?.classList.add('visible');
      }
      
      document.getElementById('floor-color-picker')?.classList.toggle('visible', tool === 'floor');
      document.getElementById('wall-type-picker')?.classList.toggle('visible', tool === 'wall');
    });
  });

  document.querySelectorAll('.fp-color-swatch').forEach(s => {
    s.addEventListener('click', () => {
      document.querySelectorAll('.fp-color-swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
    });
  });

  document.querySelectorAll('.fp-wall-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.fp-wall-option').forEach(x => x.classList.remove('active'));
      opt.classList.add('active');
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
                <span class="fp-search-results__name">🗺️ Mapa: ${item.room_name}</span>
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
              
              const fetchId = el.dataset.roomId; 
              fetch(`/ajax/mock_room_${fetchId}.json`)
                .then(r => {
                  if (!r.ok) throw new Error('Not found');
                  return r.json();
                })
                .then(json => {
                  if (json.status === 'success') {
                    import('./renderer.js').then(({ loadMapData }) => loadMapData(json.data));
                  }
                })
                .catch(() => {
                  notify(`Nenhum dado mockado para "${roomName}". Carregando mapa vazio.`, 'warning');
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
              notify(`Carregando mapa e focando: ${el.dataset.hwId}`);
              
              fetch(`/ajax/mock_room_${roomId}.json`)
                .then(r => {
                  if (!r.ok) throw new Error('Not found');
                  return r.json();
                })
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
                  notify(`Nenhum mapa encontrado para o equipamento "${el.dataset.hwId}".`, 'warning');
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
    if (e.key === '/' || e.key === 'i') {
      // Ignore if user is already typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        return;
      }
      e.preventDefault();
      input.focus();
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
      notify(`Furniture "${type}" selected for placement.`);
      document.querySelectorAll('.fp-tool-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.fp-tool-btn[data-tool="select"]')?.classList.add('active');
    });
  });
}

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

  if (!currentMapTree) {
    try {
      const res = await fetch('/ajax/mock_map_tree.json');
      currentMapTree = await res.json();
      window.renderNavigatorSidebar('', preselect);
    } catch (e) {
      console.error("Failed to load map tree", e);
      if (sidebar) sidebar.innerHTML = '<div style="padding:16px;color:red;">Error loading tree.</div>';
    }
  } else {
    // If it's already loaded, just render it again to reset search state if needed
    window.renderNavigatorSidebar('', preselect);
  }
};

function bindMapNavigator() {
  const modal = document.getElementById('map-navigator-modal');
  const closeBtn = modal?.querySelector('.fp-navigator__close');
  const sidebar = document.getElementById('navigator-sidebar');
  const grid = document.getElementById('navigator-grid');
  const sidebarSearch = document.getElementById('nav-sidebar-search');

  if (!modal) return;

  closeBtn?.addEventListener('click', () => window.closeModal(modal));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) window.closeModal(modal);
  });

  window.renderNavigatorSidebar = function(filter = '', preselect = '') {
    if (!currentMapTree) return;
    let html = '';
    
    currentMapTree.buildings.forEach(b => {
      // Filter logic: if building matches or any floor matches
      const bMatch = b.name.toLowerCase().includes(filter);
      const matchedFloors = b.floors.filter(f => f.name.toLowerCase().includes(filter));
      
      if (filter && !bMatch && matchedFloors.length === 0) return; // Skip if no match
      
      const floorsToRender = filter && !bMatch ? matchedFloors : b.floors;

      html += `<div class="fp-nav-building">${b.name}</div>`;
      floorsToRender.forEach(f => {
        html += `<div class="fp-nav-floor" data-bid="${b.id}" data-fid="${f.id}">${f.name}</div>`;
      });
    });
    
    sidebar.innerHTML = html || '<div style="padding:10px;color:var(--fp-text-muted);font-size:11px;">No matches</div>';

    sidebar.querySelectorAll('.fp-nav-floor').forEach(el => {
      el.addEventListener('click', () => {
        sidebar.querySelectorAll('.fp-nav-floor').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        
        const b = currentMapTree.buildings.find(x => x.id == el.dataset.bid);
        const f = b.floors.find(x => x.id == el.dataset.fid);
        renderNavigatorGrid(b, f);
      });
    });
    
    // Auto-select floor
    let targetFloor = null;
    if (preselect) {
      const pLower = preselect.toLowerCase();
      targetFloor = Array.from(sidebar.querySelectorAll('.fp-nav-floor')).find(el => el.innerText.trim().toLowerCase() === pLower);
    }
    
    if (!targetFloor) {
      targetFloor = sidebar.querySelector('.fp-nav-floor');
    }

    if (targetFloor) {
      targetFloor.click();
      if (preselect) targetFloor.scrollIntoView({ block: 'nearest' });
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

    grid.innerHTML = floor.rooms.map(r => `
      <div class="fp-room-card" data-bname="${building.name}" data-fname="${floor.name}" data-rname="${r.name}" data-room-id="${r.id}">
        <div class="fp-room-thumb" style="background:${r.color};">${r.icon}</div>
        <div class="fp-room-info">
          <div class="fp-room-name" title="${r.name}">${r.name}</div>
          <div class="fp-room-meta">
            <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor"><rect x="3" y="2" width="14" height="16" rx="2"/></svg>
            ${r.assetCount} assets
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.fp-room-card').forEach(card => {
      card.addEventListener('click', async () => {
        if (!(await window.checkEditMode())) return;
        
        const roomName = card.dataset.rname;
        const roomId = card.dataset.roomId || '100'; // Default fallback
        updateBreadcrumb(card.dataset.bname, card.dataset.fname, roomName);
        window.closeModal(modal);
        
        notify(`Carregando mapa: ${roomName}...`);
        
        fetch(`/ajax/mock_room_${roomId}.json`)
          .then(r => {
            if (!r.ok) throw new Error('Not found');
            return r.json();
          })
          .then(json => {
            if (json.status === 'success') {
              import('./renderer.js').then(({ loadMapData }) => {
                loadMapData(json.data);
              });
            }
          })
          .catch(() => {
            notify(`Nenhum dado mockado para "${roomName}". Carregando mapa vazio.`, 'warning');
            import('./renderer.js').then(({ loadMapData }) => {
              loadMapData({ floor_zones: [], walls: [], doors: [], furniture: [], assets: [] });
            });
          });
      });
    });
  }

  const btnNewMap = document.getElementById('btn-new-map');
  if (btnNewMap) {
    btnNewMap.addEventListener('click', () => {
      notify('A criação de mapas será implementada na Fase 6 (Integração com Backend OCS).', 'warning');
    });
  }
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
