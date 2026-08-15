import Konva from 'konva';

export let stage;
export let backgroundLayer;
export let gridLayer;
export let zonesLayer;
export let wallsLayer;
export let assetsLayer;

// Constants
const SCALE_BY = 1.15;
const MIN_SCALE = 0.05;
const MAX_SCALE = 20;
const GRID_SIZE = 20;

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
  zonesLayer = new Konva.Layer({ listening: false }); 
  wallsLayer = new Konva.Layer({ listening: false });
  assetsLayer = new Konva.Layer(); 

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
  stage.add(zonesLayer);
  stage.add(wallsLayer);
  stage.add(assetsLayer);

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
    safeX = toolbarW;
    safeW = w - toolbarW - explorerW;
  } else {
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
  const safe = getSafeArea();
  const bbox = getMapBoundingBox();
  const currentScale = stage.scaleX();
  
  const newX = safe.x + (safe.width - bbox.width * currentScale) / 2 - bbox.x * currentScale;
  const newY = safe.y + (safe.height - bbox.height * currentScale) / 2 - bbox.y * currentScale;
  
  animateStage(currentScale, newX, newY, 0.6);
}

function animateStage(scale, x, y, duration = 0.6) {
  new Konva.Tween({
    node: stage,
    duration: duration,
    scaleX: scale,
    scaleY: scale,
    x: x,
    y: y,
    easing: Konva.Easings.StrongEaseOut,
    onUpdate: () => stage.batchDraw()
  }).play();
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

export function setEngineEditMode(isEditing) {
  // Fade grid in/out
  new Konva.Tween({
    node: gridLayer,
    duration: 0.6,
    opacity: isEditing ? 1 : 0,
    easing: Konva.Easings.StrongEaseOut,
    onUpdate: () => gridLayer.batchDraw()
  }).play();
}
