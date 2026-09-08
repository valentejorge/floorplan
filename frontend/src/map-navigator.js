/**
 * map-navigator.js — Map tree state, breadcrumb, room loading,
 *                     Navigator modal (tree, grid, reorder, delete, rename)
 */
import { api } from './api.js';
import { notify } from './notify.js';
import { closeModal } from './modal.js';

// ════════════════════════════════════════════════════════════════════
// Map Tree State
// ════════════════════════════════════════════════════════════════════

let currentMapTree = null;

export function getMapTree() { return currentMapTree; }
export function setMapTree(tree) { currentMapTree = tree; }

// ════════════════════════════════════════════════════════════════════
// Breadcrumb
// ════════════════════════════════════════════════════════════════════

export function updateBreadcrumb(building, floor, room) {
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
// Load Room Map
// ════════════════════════════════════════════════════════════════════

export async function loadRoomMap(roomId, roomName, buildingName, floorName) {
  if (!(await window.checkEditMode())) return;
  
  updateBreadcrumb(buildingName, floorName, roomName);
  
  const modal = document.getElementById('map-navigator-modal');
  if (modal) closeModal(modal);
  
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
window.loadRoomMap = loadRoomMap;

// ════════════════════════════════════════════════════════════════════
// Open Map Navigator
// ════════════════════════════════════════════════════════════════════

export async function openMapNavigator(preselect = '') {
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
      renderNavigatorSidebar('', resolveTargetFid());
    } catch (e) {
      console.error("Failed to load map tree", e);
      if (sidebar) sidebar.innerHTML = '<div style="padding:16px;color:red;">Error loading tree.</div>';
    }
  } else {
    // If it's already loaded, just render it again to reset search state if needed
    renderNavigatorSidebar('', resolveTargetFid());
  }
};
window.openMapNavigator = openMapNavigator;

// ════════════════════════════════════════════════════════════════════
// Bind Map Navigator (modal, sidebar, grid, reorder, delete, rename)
// ════════════════════════════════════════════════════════════════════

export function bindMapNavigator() {
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
      renderNavigatorSidebar('', activeFid);
    }, 300);
  }

  const closeModalFunc = () => {
    resetEditOrderMode();
    closeModal(modal);
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
    renderNavigatorSidebar('', activeFid);
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
       renderNavigatorSidebar('', activeFid);
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
        renderNavigatorSidebar();
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
       closeModal(modal);
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
               renderNavigatorSidebar('', activeFid);
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

  const renderNavigatorSidebar = function(filter = '', preselectFid = null) {
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
               renderNavigatorSidebar('', activeFid);
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
                     renderNavigatorSidebar('', activeFid);
                 } catch (err) {
                     notify("Error moving floor: " + err.message, "error");
                     btn.innerText = dir === 'up' ? '▲' : '▼';
                 }
             } else {
                 // Normal reorder inside the same building
                 if (moveItemInArray(arr, idx, dir)) {
                    arr.forEach((item, i) => registerOrderUpdate(type, item.id, i));
                    const activeFid = sidebar.querySelector('.fp-nav-floor.active')?.dataset.fid;
                    renderNavigatorSidebar('', activeFid);
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
        <div class="fp-room-thumb" style="background:${r.thumbnail ? '#f4f5f7' : r.color}; border-bottom: 1px solid var(--fp-border);">
          ${r.thumbnail ? `<img src="${r.thumbnail}" style="max-width: 100%; max-height: 100%; object-fit: contain; padding: 4px;" alt="Map">` : r.icon}
        </div>
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
      closeModal(modal); // Close navigator
      window.openCreateMapModal();
    });
  }

  // Window bridge for backward compat
  window.renderNavigatorSidebar = renderNavigatorSidebar;
}
