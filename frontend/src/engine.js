import Konva from 'konva';

export let stage;
export let backgroundLayer;
export let gridLayer;
export let zonesLayer;
export let wallsLayer;
export let furnitureLayer;
export let overlayLayer;
export let globalTransformer;

// Constants
const SCALE_BY = 1.15;
const MIN_SCALE = 0.05;
const MAX_SCALE = 20;
export const GRID_SIZE = 20;

export function getStage() { return stage; }
export function getLayerFloor() { return zonesLayer; }
export function getLayerArchitecture() { return wallsLayer; }
export function getLayerFurniture() { return furnitureLayer; }
export function getOverlayLayer() { return overlayLayer; }
export function getTransformer() { return globalTransformer; }

export function captureThumbnail() {
  if (!stage) return null;
  
  const wasGridVisible = gridLayer.opacity() > 0;
  if (wasGridVisible) gridLayer.opacity(0);
  
  const activeNodes = globalTransformer.nodes();
  globalTransformer.nodes([]);
  
  // Calculate bounding box of all shapes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const layers = [wallsLayer, zonesLayer, furnitureLayer];
  
  layers.forEach(layer => {
    layer.getChildren().forEach(node => {
      const box = node.getClientRect({ skipTransform: false });
      if (box.width > 0 && box.height > 0) {
        if (box.x < minX) minX = box.x;
        if (box.y < minY) minY = box.y;
        if (box.x + box.width > maxX) maxX = box.x + box.width;
        if (box.y + box.height > maxY) maxY = box.y + box.height;
      }
    });
  });

  let dataURL;
  if (minX !== Infinity && maxX > minX) {
    const padding = 40; // padding around the drawing
    const cropX = minX - padding;
    const cropY = minY - padding;
    const cropWidth = (maxX - minX) + (padding * 2);
    const cropHeight = (maxY - minY) + (padding * 2);
    
    // Scale the crop so the max dimension is roughly 400px
    const targetWidth = 400;
    // We want the resulting image to fit inside a 400px box while maintaining its own aspect ratio
    const ratio = Math.min(targetWidth / cropWidth, targetWidth / cropHeight);
    
    dataURL = stage.toDataURL({
      mimeType: 'image/png',
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      pixelRatio: ratio
    });
  } else {
    // Fallback if empty room
    const targetWidth = 400;
    const ratio = Math.min(targetWidth / stage.width(), 1);
    dataURL = stage.toDataURL({
      mimeType: 'image/png',
      pixelRatio: ratio
    });
  }

  if (wasGridVisible) gridLayer.opacity(0.1);
  globalTransformer.nodes(activeNodes);

  return dataURL;
}

export function getRelativePointerPosition() {
  const pointerPosition = stage.getPointerPosition();
  if (!pointerPosition) return { x: 0, y: 0 };
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  return transform.point(pointerPosition);
}

export function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export function applySnapOnDragEnd(node) {
  node.dragBoundFunc(function(pos) {
    const scale = stage.scaleX();
    const logicalX = (pos.x - stage.x()) / scale;
    const logicalY = (pos.y - stage.y()) / scale;
    
    return {
      x: Math.round(logicalX / GRID_SIZE) * GRID_SIZE * scale + stage.x(),
      y: Math.round(logicalY / GRID_SIZE) * GRID_SIZE * scale + stage.y()
    };
  });
}


export function initEngine(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container #${containerId} not found`);
    return;
  }

  // Initialize Stage
  stage = new Konva.Stage({
    container: containerId,
    width: container.clientWidth,
    height: container.clientHeight,
    draggable: true,
  });

  // Create Layers
  backgroundLayer = new Konva.Layer({ listening: false });
  gridLayer = new Konva.Layer({ listening: false, opacity: 0 }); // Hidden by default
  
  // Combine elements into logical layers to stay within Konva's 3-5 layer recommendation
  const architectureLayer = new Konva.Layer();
  const contentLayer = new Konva.Layer();
  
  zonesLayer = new Konva.Group({ listening: false, name: 'zonesLayer' }); 
  wallsLayer = new Konva.Group({ listening: false, name: 'wallsLayer' });
  furnitureLayer = new Konva.Group({ listening: true, name: 'furnitureLayer' });
  
  architectureLayer.add(zonesLayer);
  architectureLayer.add(wallsLayer);
  
  contentLayer.add(furnitureLayer);
  
  overlayLayer = new Konva.Layer();
  
  globalTransformer = new Konva.Transformer({
    nodes: [],
    padding: 0,
    borderStroke: '#0d99ff',
    borderStrokeWidth: 1.5,
    anchorStroke: '#0d99ff',
    anchorStrokeWidth: 1.5,
    anchorFill: '#ffffff',
    anchorSize: 8,
    anchorCornerRadius: 1, // slight rounding like Figma
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
  });
  overlayLayer.add(globalTransformer);

  // Fast GPU Pattern Grid
  const patternCanvas = document.createElement('canvas');
  patternCanvas.width = GRID_SIZE;
  patternCanvas.height = GRID_SIZE;
  const pCtx = patternCanvas.getContext('2d');
  pCtx.fillStyle = 'rgba(99, 179, 237, 0.4)';
  pCtx.beginPath();
  pCtx.arc(1, 1, 1, 0, Math.PI * 2);
  pCtx.fill();

  const gridShape = new Konva.Rect({
    x: 0,
    y: 0,
    width: stage.width(),
    height: stage.height(),
    fillPatternImage: patternCanvas,
    listening: false,
    perfectDrawEnabled: false
  });
  gridLayer.add(gridShape);

  // Sync grid offset and scale on every render
  gridLayer.on('beforeDraw', () => {
    const scale = stage.scaleX();
    gridShape.width(stage.width() / scale);
    gridShape.height(stage.height() / scale);
    gridShape.x(-stage.x() / scale);
    gridShape.y(-stage.y() / scale);
    gridShape.fillPatternScale({ x: 1/scale, y: 1/scale });
    gridShape.fillPatternOffset({
      x: stage.x(),
      y: stage.y()
    });
  });

  stage.add(backgroundLayer);
  stage.add(gridLayer);
  stage.add(architectureLayer);
  stage.add(contentLayer);
  stage.add(overlayLayer);

  // Resize event
  window.addEventListener('resize', () => {
    stage.width(container.clientWidth);
    stage.height(container.clientHeight);
    stage.batchDraw();
  });

  // Wheel Zoom Mathematics
  stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? -1 : 1;
    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    let newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    
    // Dynamic LOD: hide labels if zoomed out too far
    if (furnitureLayer) {
      const isZoomedOut = newScale < 0.65;
      furnitureLayer.getChildren().forEach(group => {
        const labelGroup = group.findOne('.asset-label-group');
        if (labelGroup) {
          labelGroup.visible(!isZoomedOut);
        }
      });
    }

    stage.batchDraw();
  });

  // Drag pan event
  stage.on('dragmove', () => {
    // Only redraw the stage if necessary, though dragging natively pans the stage
  });

  stage.batchDraw();
}

export function requestRender() {
  if (!stage) return;
  stage.batchDraw();
}

// ── Safe Area Math ──────────────────────────────────────────────────
/**
 * Calculates the bounding box of the actual drawn map (walls, zones).
 */
export function getMapBoundingBox() {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  const checkRect = (x, y, w, h) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  };

  zonesLayer.getChildren().forEach(node => {
    checkRect(node.x(), node.y(), node.width(), node.height());
  });

  wallsLayer.getChildren().forEach(node => {
    if (node.getClassName() === 'Line') {
      const pts = node.points();
      for (let i = 0; i < pts.length; i += 2) {
        if (pts[i] < minX) minX = pts[i];
        if (pts[i] > maxX) maxX = pts[i];
        if (pts[i+1] < minY) minY = pts[i+1];
        if (pts[i+1] > maxY) maxY = pts[i+1];
      }
    } else if (node.getClassName() === 'Rect') {
      checkRect(node.x(), node.y(), node.width(), node.height());
    }
  });

  if (minX === Infinity) {
    return { x: 0, y: 0, width: 800, height: 600 };
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Returns the Safe Area Viewport (Canvas minus UI Panels)
 */
function getSafeArea() {
  const isEditing = document.getElementById('main-layout')?.classList.contains('is-editing');
  
  const w = stage.width();
  const h = stage.height();
  
  const topOffset = 64; // Breadcrumb + Top margin
  const margin = 16;
  const explorerW = 240 + margin * 2;
  const toolbarW = 48 + margin * 2;
  
  let safeX, safeY, safeW, safeH;
  
  safeY = topOffset;
  safeH = h - topOffset - margin;
  
  if (isEditing) {
    // Both left and right sidebars are open
    safeX = explorerW;
    safeW = w - (explorerW * 2) - margin;
    // Toolbar is at bottom
    const toolbarH = 48 + margin;
    safeH = h - topOffset - margin - toolbarH;
  } else {
    // Only left sidebar (IT assets) is open
    safeX = explorerW;
    safeW = w - explorerW - margin;
  }
  
  return { x: safeX, y: safeY, width: safeW, height: safeH };
}


// ── UI Camera Controls ────────────────────────────────────────────────
export function zoomIn() { zoomBy(SCALE_BY); }
export function zoomOut() { zoomBy(1 / SCALE_BY); }

export function zoomReset() {
  const safe = getSafeArea();
  const bbox = getMapBoundingBox();
  
  const newScale = 1.0;
  const newX = safe.x + (safe.width - bbox.width * newScale) / 2 - bbox.x * newScale;
  const newY = safe.y + (safe.height - bbox.height * newScale) / 2 - bbox.y * newScale;
  
  animateStage(newScale, newX, newY);
}

export function zoomFit(animate = true) {
  const safe = getSafeArea();
  const bbox = getMapBoundingBox();
  
  const padding = 0.95;
  const scaleX = (safe.width * padding) / bbox.width;
  const scaleY = (safe.height * padding) / bbox.height;
  
  let newScale = Math.min(scaleX, scaleY);
  newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));
  
  const newX = safe.x + (safe.width - bbox.width * newScale) / 2 - bbox.x * newScale;
  const newY = safe.y + (safe.height - bbox.height * newScale) / 2 - bbox.y * newScale;
  
  if (animate) {
    animateStage(newScale, newX, newY);
  } else {
    stage.scale({ x: newScale, y: newScale });
    stage.position({ x: newX, y: newY });
    stage.batchDraw();
  }
}

function zoomBy(factor) {
  const oldScale = stage.scaleX();
  let newScale = oldScale * factor;
  newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

  const safe = getSafeArea();
  const center = { 
    x: safe.x + safe.width / 2, 
    y: safe.y + safe.height / 2 
  };
  
  const mousePointTo = {
    x: (center.x - stage.x()) / oldScale,
    y: (center.y - stage.y()) / oldScale,
  };

  const newX = center.x - mousePointTo.x * newScale;
  const newY = center.y - mousePointTo.y * newScale;

  animateStage(newScale, newX, newY, 0.2);
}

export function panToSafeArea() {
  return new Promise((resolve) => {
    const safe = getSafeArea();
    const bbox = getMapBoundingBox();
    
    let newScale = stage.scaleX(); // Maintain current zoom
    
    const newX = safe.x + (safe.width - bbox.width * newScale) / 2 - bbox.x * newScale;
    const newY = safe.y + (safe.height - bbox.height * newScale) / 2 - bbox.y * newScale;
    
    animateStage(newScale, newX, newY, resolve);
  });
}

function animateStage(newScale, newX, newY, onFinish) {
  const container = document.getElementById('floorplan-container');
  if (!container) {
    stage.scale({ x: newScale, y: newScale });
    stage.position({ x: newX, y: newY });
    stage.batchDraw();
    
    // Dynamic LOD
    if (furnitureLayer) {
      const isZoomedOut = newScale < 0.65;
      furnitureLayer.getChildren().forEach(group => {
        const labelGroup = group.findOne('.asset-label-group');
        if (labelGroup) {
          labelGroup.visible(!isZoomedOut);
        }
      });
    }

    if (onFinish) onFinish();
    return;
  }

  const oldX = stage.x();
  const oldY = stage.y();
  const oldScale = stage.scaleX();

  // M_css = M_old * M_new_inverse
  const s = oldScale / newScale;
  const tx = oldX - newX * s;
  const ty = oldY - newY * s;

  // Snap Konva instantly (no CPU rendering during animation)
  stage.scale({ x: newScale, y: newScale });
  stage.position({ x: newX, y: newY });
  
  // Dynamic LOD
  if (furnitureLayer) {
    const isZoomedOut = newScale < 0.65;
    furnitureLayer.getChildren().forEach(group => {
      const labelGroup = group.findOne('.asset-label-group');
      if (labelGroup) {
        labelGroup.visible(!isZoomedOut);
      }
    });
  }

  stage.batchDraw();

  // If no change, return immediately
  if (Math.abs(tx) < 0.5 && Math.abs(ty) < 0.5 && Math.abs(s - 1) < 0.001) {
    if (onFinish) onFinish();
    return;
  }

  // Set up fake CSS transform to look like old state
  container.style.transition = 'none';
  container.style.transformOrigin = '0 0';
  container.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;

  // Force reflow
  void container.offsetHeight;

  // Animate CSS transform to 0,0 scale 1 (new state) over 0.4s
  container.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  container.style.transform = 'translate(0px, 0px) scale(1)';

  setTimeout(() => {
    container.style.transition = 'none';
    if (onFinish) onFinish();
  }, 400);
}

export function animateMapEntrance() {
  const safe = getSafeArea();
  const bbox = getMapBoundingBox();
  
  const padding = 0.95;
  const scaleX = (safe.width * padding) / bbox.width;
  const scaleY = (safe.height * padding) / bbox.height;
  
  let newScale = Math.min(scaleX, scaleY);
  newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));
  
  const newX = safe.x + (safe.width - bbox.width * newScale) / 2 - bbox.x * newScale;
  const newY = safe.y + (safe.height - bbox.height * newScale) / 2 - bbox.y * newScale;
  
  // Start map slightly lower and zoomed out
  stage.scale({ x: newScale * 0.9, y: newScale * 0.9 });
  stage.position({ x: newX, y: newY + 50 });
  
  // Using native HTML Canvas Opacity for entrance
  const container = stage.container();
  container.style.opacity = '0';
  container.style.transition = 'opacity 0.6s ease-out';
  
  // Force reflow
  container.offsetHeight;
  container.style.opacity = '1';
  
  // Animate position and scale to fit
  new Konva.Tween({
    node: stage,
    duration: 0.8,
    scaleX: newScale,
    scaleY: newScale,
    x: newX,
    y: newY,
    easing: Konva.Easings.StrongEaseOut,
    onUpdate: () => stage.batchDraw()
  }).play();
}

let preZoomState = null;

export function zoomToNode(node) {
  preZoomState = {
    x: stage.x(),
    y: stage.y(),
    scaleX: stage.scaleX(),
    scaleY: stage.scaleY()
  };

  const nodeAbsPos = node.getAbsolutePosition();
  const safe = getSafeArea();
  const zoomScale = 3.0;

  const centerX = safe.x + safe.width / 2;
  const centerY = safe.y + safe.height / 2;

  const nodeLocalX = (nodeAbsPos.x - stage.x()) / stage.scaleX();
  const nodeLocalY = (nodeAbsPos.y - stage.y()) / stage.scaleY();

  const newX = centerX - nodeLocalX * zoomScale;
  const newY = centerY - nodeLocalY * zoomScale;

  new Konva.Tween({
    node: stage,
    duration: 0.5,
    scaleX: zoomScale,
    scaleY: zoomScale,
    x: newX,
    y: newY,
    easing: Konva.Easings.StrongEaseOut,
    onUpdate: () => stage.batchDraw()
  }).play();
}

export function zoomOutToSafe() {
  if (preZoomState) {
    new Konva.Tween({
      node: stage,
      duration: 0.5,
      scaleX: preZoomState.scaleX,
      scaleY: preZoomState.scaleY,
      x: preZoomState.x,
      y: preZoomState.y,
      easing: Konva.Easings.StrongEaseOut,
      onUpdate: () => stage.batchDraw()
    }).play();
    preZoomState = null;
  }
}

export function setEngineEditMode(isEditing) {
  // Fade grid in/out
  new Konva.Tween({
    node: gridLayer,
    duration: 0.6,
    opacity: isEditing ? 1 : 0,
    easing: Konva.Easings.StrongEaseOut,
    onUpdate: () => gridLayer.batchDraw()
  }).play();
  
  // Enable interaction with architectural nodes
  [zonesLayer, wallsLayer].forEach(layer => {
    layer.listening(isEditing);
    layer.getChildren().forEach(node => {
      node.listening(isEditing);
      node.draggable(isEditing);
    });
  });

  // Furniture should always be listening for tooltips
  [getLayerFurniture()].forEach(layer => {
    layer.listening(true);
    layer.getChildren().forEach(node => {
      // If it's an IT asset with a tooltip, it should always listen
      if (node.name() === 'it-asset' || node.name() === 'furniture') {
        node.listening(true);
      } else {
        node.listening(isEditing);
      }
      node.draggable(isEditing);
      
      // Manage live snap listener
      node.off('dragend.snap');
      node.off('dragend.history');
      
      if (isEditing) {
        node.dragBoundFunc(function(pos) {
          const scale = stage.scaleX();
          const logicalX = (pos.x - stage.x()) / scale;
          const logicalY = (pos.y - stage.y()) / scale;
          return {
            x: Math.round(logicalX / GRID_SIZE) * GRID_SIZE * scale + stage.x(),
            y: Math.round(logicalY / GRID_SIZE) * GRID_SIZE * scale + stage.y()
          };
        });
        
        node.on('dragend.history', () => {
          // Refresh properties panel if this node is selected
          import('./explorer.js').then(({ getSelectedNodeId, selectNodeById }) => {
            if (getSelectedNodeId() === node.id()) {
              selectNodeById(node.id());
            }
          });
          
          import('./history.js').then(({ commitHistory }) => commitHistory());
        });
      } else {
        node.dragBoundFunc(null);
      }
    });
  });
  
  if (!isEditing) {
    globalTransformer.nodes([]);
    overlayLayer.batchDraw();
  }
}
