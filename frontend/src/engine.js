import Konva from 'konva';

export let stage;
export let backgroundLayer;
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

  // Create Layers with optimizations
  backgroundLayer = new Konva.Layer({ listening: false });
  zonesLayer = new Konva.Layer({ listening: false }); // Disable events for zones temporarily
  wallsLayer = new Konva.Layer({ listening: false });
  assetsLayer = new Konva.Layer(); // Only assets need click events for now

  stage.add(backgroundLayer);
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

// ── UI Camera Controls ────────────────────────────────────────────────
export function zoomIn() { zoomBy(SCALE_BY); }
export function zoomOut() { zoomBy(1 / SCALE_BY); }

export function zoomFit() {
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
}

function zoomBy(factor) {
  const oldScale = stage.scaleX();
  let newScale = oldScale * factor;
  newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

  const center = { x: stage.width() / 2, y: stage.height() / 2 };
  const mousePointTo = {
    x: (center.x - stage.x()) / oldScale,
    y: (center.y - stage.y()) / oldScale,
  };

  stage.scale({ x: newScale, y: newScale });
  stage.position({
    x: center.x - mousePointTo.x * newScale,
    y: center.y - mousePointTo.y * newScale,
  });
  stage.batchDraw();
}
