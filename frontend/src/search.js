import Konva from 'konva';
import { api } from './api.js';
import { notify } from './notify.js';
import { updateBreadcrumb } from './map-navigator.js';

export function bindSearch() {
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
      const res = await api(`search_asset.php?q=${encodeURIComponent(q)}`);
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
            const isMapped = !!item.room_id && item.room_id !== "null";
            const locText = isMapped 
                 ? `📍 ${item.building_name} › ${item.floor_name} › ${item.room_name}`
                 : `📍 (Unmapped)`;
                 
            return `
              <div class="fp-search-results__item" data-type="asset" data-asset-id="${item.asset_id}" data-hw-id="${item.hardware_id}" data-room-id="${item.room_id}" data-r="${item.room_name}" data-b="${item.building_name}" data-f="${item.floor_name}" data-mapped="${isMapped}">
                <span class="fp-search-results__name">💻 ${item.hardware_name} — ${item.ip || '—'}</span>
                <span class="fp-search-results__location">${locText}</span>
              </div>
            `;
          }
        }).join('');

        results.querySelectorAll('.fp-search-results__item').forEach(el => {
          el.addEventListener('click', async () => {
            if (!(await window.checkEditMode())) return;
            
            const roomId = el.dataset.roomId || el.dataset.rId;
            const roomName = el.dataset.r;
            
            if (el.dataset.type === 'room') {
              updateBreadcrumb(el.dataset.b, el.dataset.f, roomName);
              notify(`Switched to map: ${roomName}`);
              
              api(`get_room.php?id=${roomId}`)
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
              // It's an asset.
              const isMapped = el.dataset.mapped === 'true';
              if (!isMapped) {
                results.classList.remove('visible');
                input.value = '';
                notify("This asset has not been mapped to any floorplan yet.", "warning");
                
                // Open the unmapped assets catalog!
                const panel = document.getElementById('assets-catalog-panel');
                if (panel) {
                  panel.style.display = 'flex';
                  import('./assets-catalog.js').then(({ fetchUnmappedAssets, renderAssetsCatalog }) => {
                    fetchUnmappedAssets().then(() => renderAssetsCatalog());
                  });
                }
                return;
              }
              
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
                        import('./engine.js').then(({ stage, getLayerFurniture, getTransformer }) => {
                          const hwId = el.dataset.hwId;
                          const furnitureLayer = getLayerFurniture();
                          const group = furnitureLayer.getChildren().find(node => {
                            const data = node.getAttr('entityData');
                            if (data && data.assigned_hardware) {
                              return data.assigned_hardware.some(hw => String(hw.hardware_id) === String(hwId) || String(hw.hardware_id) === String(assetId));
                            }
                            return false;
                          });
                          
                          if (group) {
                            // Pulse effect on the found furniture
                            const pulse = new Konva.Circle({
                              x: group.x(), y: group.y(),
                              radius: 30, stroke: '#961B7E', strokeWidth: 2, opacity: 1
                            });
                            furnitureLayer.add(pulse);
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
