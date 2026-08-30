import { getLayerFloor, getLayerArchitecture, getLayerFurniture } from './engine.js';

let historyStack = [];
let historyIndex = -1;
let isRestoring = false;

export function initHistory() {
  historyStack = [];
  historyIndex = -1;
  commitHistory();
}

export function commitHistory() {
  if (isRestoring) return;
  
  const state = serializeMapState();
  
  // Truncate future if we undo'd and then made a new action
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  
  historyStack.push(state);
  historyIndex++;
}

export function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    restoreState(historyStack[historyIndex]);
  }
}

export function redo() {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    restoreState(historyStack[historyIndex]);
  }
}

export function resetHistory(state) {
  historyStack = [state];
  historyIndex = 0;
}

export function serializeMapState() {
  const getNodesData = (layer) => {
    return layer.getChildren().map(node => {
      let data;
      
      // If it's an IT asset, we pull the assetData
      if (node.getAttr('assetData')) {
         // Deep clone to avoid mutating the original reference
         data = JSON.parse(JSON.stringify(node.getAttr('assetData')));
         data.pos_x = node.x();
         data.pos_y = node.y();
         if (data.layout) {
           data.layout.rotation = node.rotation();
         } else {
           data.rotation = node.rotation();
         }
      } else {
         data = JSON.parse(JSON.stringify(node.getAttr('entityData')));
         data.x = node.x();
         data.y = node.y();
         data.rotation = node.rotation();
      }
      
      data.scaleX = node.scaleX();
      data.scaleY = node.scaleY();
      
      if (node.getClassName() === 'Rect') {
        data.width = node.width();
        data.height = node.height();
      } else if (node.getClassName() === 'Line') {
        data.points = node.points();
      }
      
      return data;
    });
  };

  return {
    floor_zones: getNodesData(getLayerFloor()),
    walls: getNodesData(getLayerArchitecture()),
    furniture: getNodesData(getLayerFurniture())
  };
}

function restoreState(state) {
  isRestoring = true;
  
  const layout = document.getElementById('main-layout');
  const isEditing = layout && layout.classList.contains('is-editing');
  
  import('./renderer.js').then(({ loadMapData }) => {
    // We need to disable the camera pan for undo/redo
    loadMapData(state, false); 
    
    // Also re-apply editable state if we are in Edit mode
    if (isEditing) {
      import('./engine.js').then(({ setEngineEditMode }) => {
        setEngineEditMode(true);
      });
    }
    
    isRestoring = false;
  });
}
