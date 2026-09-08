import { api } from './api.js';
import { notify } from './notify.js';
import { closeModal } from './modal.js';
import { getMapTree, setMapTree, updateBreadcrumb } from './map-navigator.js';

export function bindCreateMap() {
  const modal = document.getElementById('create-map-modal');
  const btnCancel = document.getElementById('btn-cancel-create');
  const btnSubmit = document.getElementById('btn-submit-create');
  const btnCloseHeader = document.getElementById('create-map-close');
  
  if (!modal) return;

  const closeAndReopenNav = () => {
    closeModal(modal);
    if (window.openMapNavigator) {
      window.openMapNavigator();
    }
  };

  btnCloseHeader?.addEventListener('click', closeAndReopenNav);
  btnCancel.addEventListener('click', closeAndReopenNav);
  
  window.openCreateMapModal = async function() {
    modal.classList.add('visible');
    
    // Ensure we have the tree
    if (!getMapTree()) {
      try {
        const json = await api('get_map_tree.php');
        setMapTree(json.data);
      } catch (e) {}
    }
    
    const bSel = document.getElementById('create-map-building-sel');
    const fSel = document.getElementById('create-map-floor-sel');
    
    // Populate Buildings
    if (bSel && getMapTree() && getMapTree().buildings) {
      let bHtml = '<option value="">+ New</option>';
      getMapTree().buildings.forEach(b => {
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
        
        const b = getMapTree().buildings.find(x => x.id == bSel.value);
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
    closeModal(modal);
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
        closeModal(modal);
        
        // Force refresh tree
        setMapTree(null);
        
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
