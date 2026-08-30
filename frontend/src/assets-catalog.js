import { api } from './api.js';
import { createAssetNode } from './tools.js';
import { refreshExplorer, selectNodeById } from './explorer.js';
import { commitHistory } from './history.js';

let unmappedAssets = [];

export function initAssetsCatalog() {
  const panel = document.getElementById('assets-catalog-panel');
  const btnClose = document.getElementById('btn-close-assets');
  const btnAssets = document.querySelector('.fp-tool-btn[data-tool="assets"]');
  const searchInput = document.getElementById('assets-catalog-search');

  if (!panel || !btnAssets) return;

  btnAssets.addEventListener('click', async () => {
    panel.style.display = 'flex';
    document.getElementById('assets-catalog-body').innerHTML = '<div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">Buscando equipamentos...</div>';
    
    try {
      unmappedAssets = await fetchUnmappedAssets();
      if (unmappedAssets.length > 0) {
        renderAssetsCatalog();
      }
    } catch (e) {
      document.getElementById('assets-catalog-body').innerHTML = '<div style="padding:16px;text-align:center;color:#e53e3e;font-size:12px;">Erro ao carregar equipamentos.</div>';
    }
  });

  btnClose?.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  searchInput?.addEventListener('input', (e) => {
    renderAssetsCatalog(e.target.value.toLowerCase());
  });
}

function renderAssetsCatalog(filter = '') {
  const body = document.getElementById('assets-catalog-body');
  if (!body) return;

  body.innerHTML = '';
  
  const filtered = unmappedAssets.filter(a => {
    if (!filter) return true;
    return (a.hardware_name && a.hardware_name.toLowerCase().includes(filter)) ||
           (a.ip && a.ip.toLowerCase().includes(filter)) ||
           (a.mac && a.mac.toLowerCase().includes(filter)) ||
           (a.user && a.user.toLowerCase().includes(filter));
  });

  if (filtered.length === 0) {
    body.innerHTML = '<div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">Nenhum equipamento encontrado.</div>';
    return;
  }

  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';

  filtered.forEach(asset => {
    const item = document.createElement('div');
    item.className = 'fp-explorer__item';
    item.style.cursor = 'grab';
    item.draggable = true;
    
    const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                     asset.status === 'warning' ? '#d69e2e' : '#5cb85c';
                     
    item.innerHTML = `
      <div class="fp-explorer__item-icon" style="background-color:${dotColor}; width:8px; height:8px; border-radius:50%; box-shadow:0 0 6px ${dotColor}66;"></div>
      <div class="fp-explorer__item-name" style="flex:1;">
        <div style="font-weight:600;font-size:11px;">${asset.hardware_name || 'Desconhecido'}</div>
        <div style="color:var(--fp-text-muted);font-size:10px;">${asset.ip || 'Sem IP'}</div>
      </div>
      <div style="color:var(--fp-text-muted);font-size:10px;text-transform:uppercase;">${asset.type || 'ASSET'}</div>
    `;

    // Click to place at center
    item.addEventListener('click', () => {
      import('./main.js').then(({ notify }) => {
        if (notify) notify("Arraste e solte o computador em cima de uma Mesa ou Rack no mapa.", "info");
      });
    });

    // HTML5 Drag and Drop
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/json', JSON.stringify({ source: 'assets-catalog', asset }));
      e.dataTransfer.effectAllowed = 'copy';
    });

    list.appendChild(item);
  });

  body.appendChild(list);
}



export function removeAssetFromCatalog(hardwareId) {
  unmappedAssets = unmappedAssets.filter(a => a.hardware_id !== hardwareId);
  renderAssetsCatalog(document.getElementById('assets-catalog-search')?.value || '');
}

export function getUnmappedAssetsList() {
  return unmappedAssets;
}

export async function fetchUnmappedAssets() {
  if (unmappedAssets.length === 0) {
    try {
      const res = await api('get_unmapped_assets.php');
      if (res && res.data) {
        unmappedAssets = res.data;
      }
    } catch (e) {
      console.error("Failed to fetch unmapped assets", e);
    }
  }
  return unmappedAssets;
}
