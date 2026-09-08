/**
 * main.js — Application Orchestrator
 */
import './style.css';

import { api } from './api.js';
import { initEngine, zoomIn, zoomOut, zoomFit } from './engine.js';
import { loadMapData } from './renderer.js';
import { bindToolsToStage } from './tools.js';
import { initAssetsCatalog } from './assets-catalog.js';

// Newly extracted modules
import { bindEscapeClose } from './modal.js';
import { bindViewFilters } from './view-filters.js';
import { bindToolbar, bindLegacyFurnitureModal } from './toolbar.js';
import { bindSearch } from './search.js';
import { bindModeToggle } from './edit-mode.js';
import { populateFurnitureCatalog } from './furniture-catalog.js';
import { bindMapNavigator, updateBreadcrumb, getMapTree, setMapTree } from './map-navigator.js';
import { bindCreateMap } from './create-map.js';
import { notify } from './notify.js';

function bindCameraControls() {
  document.getElementById('btn-zoom-in')?.addEventListener('click', zoomIn);
  document.getElementById('btn-zoom-out')?.addEventListener('click', zoomOut);
  document.getElementById('btn-zoom-reset')?.addEventListener('click', zoomFit);
  document.getElementById('btn-zoom-fit')?.addEventListener('click', zoomFit);
}

async function init() {
  // Remove preload class to enable CSS transitions
  setTimeout(() => document.body.classList.remove('preload'), 50);

  initEngine('floorplan-container');
  bindToolsToStage();
  bindCameraControls();
  
  bindToolbar();
  bindViewFilters();
  bindSearch();
  bindLegacyFurnitureModal();
  bindMapNavigator();
  bindModeToggle();
  populateFurnitureCatalog();
  initAssetsCatalog();
  bindCreateMap();
  bindEscapeClose();
  
  // Auto-Load first map
  setTimeout(async () => {
    try {
      const { skinManager } = await import('./skins.js');
      await skinManager.load();
      
      const jsonTree = await api('get_map_tree.php');
      if (jsonTree.status === 'success') {
        setMapTree(jsonTree.data);
        const currentMapTree = getMapTree();
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

document.addEventListener('DOMContentLoaded', init);
