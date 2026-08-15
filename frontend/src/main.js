/**
 * main.js — Phase 1.5: UI with Map Navigator & Unified Search
 */
import { api } from './api.js';
import { initEngine, zoomIn, zoomOut, zoomFit } from './engine.js';
import { loadMapData } from './renderer.js';
import './style.css';

let currentMapTree = null;

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
      
      const res = await fetch('/ajax/mock_room_1.json');
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
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.openMapNavigator) window.openMapNavigator();
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
    
    import('./engine.js').then(({ panToSafeArea }) => {
      panToSafeArea();
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

  async function doSearch() {
    const q = input.value.trim();
    if (!q) {
      results.classList.remove('visible');
      return;
    }

    try {
      const res = await api(`ajax/search_asset.php?q=${encodeURIComponent(q)}`);
      const items = res.data || [];

      if (items.length === 0) {
        results.innerHTML = '<div class="fp-search-results__empty">No results.</div>';
      } else {
        results.innerHTML = items.map(item => {
          if (item.type === 'room') {
            return `
              <div class="fp-search-results__item" data-type="room" data-b="${item.building_name}" data-f="${item.floor_name}" data-r="${item.room_name}">
                <span class="fp-search-results__name">🗺️ Mapa: ${item.room_name}</span>
                <span class="fp-search-results__location">📍 ${item.building_name} › ${item.floor_name}</span>
              </div>
            `;
          } else {
            return `
              <div class="fp-search-results__item" data-type="asset" data-hw-id="${item.hardware_id}">
                <span class="fp-search-results__name">💻 ${item.hardware_name} — ${item.ip || '—'}</span>
                <span class="fp-search-results__location">📍 ${item.building_name} › ${item.floor_name} › ${item.room_name}</span>
              </div>
            `;
          }
        }).join('');

        results.querySelectorAll('.fp-search-results__item').forEach(el => {
          el.addEventListener('click', () => {
            if (el.dataset.type === 'room') {
              updateBreadcrumb(el.dataset.b, el.dataset.f, el.dataset.r);
              notify(`Switched to map: ${el.dataset.r}`);
            } else {
              notify(`Zooming to asset ID: ${el.dataset.hwId}`);
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

  btn?.addEventListener('click', doSearch);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

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

window.openMapNavigator = async function() {
  const modal = document.getElementById('map-navigator-modal');
  const sidebar = document.getElementById('navigator-sidebar');
  if (!modal) return;

  modal.classList.add('visible');
  if (!currentMapTree) {
    try {
      const res = await fetch('/ajax/mock_map_tree.json');
      currentMapTree = await res.json();
      window.renderNavigatorSidebar();
    } catch (e) {
      console.error("Failed to load map tree", e);
      if (sidebar) sidebar.innerHTML = '<div style="padding:16px;color:red;">Error loading tree.</div>';
    }
  } else {
    // If it's already loaded, just render it again to reset search state if needed
    window.renderNavigatorSidebar();
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

  window.renderNavigatorSidebar = function(filter = '') {
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
    
    // Auto-select first floor when rendering
    const firstFloor = sidebar.querySelector('.fp-nav-floor');
    if (firstFloor) firstFloor.click();
    else grid.innerHTML = '<div style="padding:40px;grid-column:1/-1;text-align:center;">Select a floor</div>';
  }

  sidebarSearch?.addEventListener('input', (e) => {
    renderNavigatorSidebar(e.target.value.toLowerCase().trim());
  });

  function renderNavigatorGrid(building, floor) {
    if (!floor.rooms || floor.rooms.length === 0) {
      grid.innerHTML = '<div style="padding:40px;grid-column:1/-1;text-align:center;">No maps on this floor.</div>';
      return;
    }

    grid.innerHTML = floor.rooms.map(r => `
      <div class="fp-room-card" data-bname="${building.name}" data-fname="${floor.name}" data-rname="${r.name}">
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
      card.addEventListener('click', () => {
        updateBreadcrumb(card.dataset.bname, card.dataset.fname, card.dataset.rname);
        modal.classList.remove('visible');
        notify(`Switched to map: ${card.dataset.rname}`);
      });
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
