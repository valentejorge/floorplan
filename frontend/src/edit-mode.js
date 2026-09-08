import { notify } from './notify.js';
import { refreshExplorer } from './explorer.js';

export function checkEditMode() {
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
}

window.checkEditMode = checkEditMode;

export function handleAssetSelect(assetData) {
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
}

window.selectAsset = handleAssetSelect;

export function bindModeToggle() {
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
      const panelTitle = document.getElementById('right-panel-title');
      if (panelTitle) panelTitle.textContent = 'Layers';
      btnEdit.style.display = 'none';
      btnCancel.style.display = 'flex';
      btnSave.style.display = 'flex';
      
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
          const { captureThumbnail } = await import('./engine.js');
          const payload = {
            id: currentRoomData.id,
            width: currentRoomData.canvas_width || currentRoomData.width || 1200,
            height: currentRoomData.canvas_height || currentRoomData.height || 800,
            thumbnail: captureThumbnail(),
            architecture: {
              walls: state.walls || [],
              floor_zones: state.floor_zones || [],
              furniture: state.furniture || [],
              doors: state.doors || []
            },
            assets: (state.furniture || []).reduce((acc, f) => {
              if (f.assigned_hardware && f.assigned_hardware.length > 0) {
                f.assigned_hardware.forEach(hw => {
                  acc.push({
                    hardware_id: hw.hardware_id,
                    pos_x: f.x,
                    pos_y: f.y,
                    rotation: f.rotation || 0
                  });
                });
              }
              return acc;
            }, [])
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
      const panelTitle = document.getElementById('right-panel-title');
      if (panelTitle) panelTitle.textContent = 'Hosts';
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
    

  }

  btnEdit.addEventListener('click', () => setMode('edit'));
  btnCancel.addEventListener('click', () => setMode('cancel'));
  btnSave.addEventListener('click', () => setMode('save'));
}
