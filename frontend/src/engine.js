import Konva from 'konva';

let stage;
let backgroundLayer;
let zonesLayer;
let wallsLayer;
let assetsLayer;

// Constants
const SCALE_BY = 1.15;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
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
    draggable: true, // Enables Pan by default
  });

  // Create Layers
  backgroundLayer = new Konva.Layer();
  zonesLayer = new Konva.Layer();
  wallsLayer = new Konva.Layer();
  assetsLayer = new Konva.Layer();

  stage.add(backgroundLayer);
  stage.add(zonesLayer);
  stage.add(wallsLayer);
  stage.add(assetsLayer);

  // Resize event
  window.addEventListener('resize', () => {
    stage.width(container.clientWidth);
    stage.height(container.clientHeight);
    updateGrid();
  });

  // Wheel Zoom Mathematics
  stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    // The logic is: calculate pointer position on the canvas's local coordinates
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // Determine direction
    let direction = e.evt.deltaY > 0 ? -1 : 1;
    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    let newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

    stage.scale({ x: newScale, y: newScale });

    // Calculate new position of the stage to keep the pointer over the same local coordinate
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    updateGrid();
  });

  // Drag pan event
  stage.on('dragmove', () => {
    updateGrid();
  });

  // Initial Grid sync
  updateGrid();
}

/**
 * Synchronize the CSS background grid with Konva's Transform Matrix.
 * This guarantees 60fps infinite grid without drawing thousands of lines.
 */
function updateGrid() {
  const container = document.getElementById('canvas-area');
  if (!container) return;
  
  const scale = stage.scaleX();
  const x = stage.x();
  const y = stage.y();
  
  const scaledGridSize = GRID_SIZE * scale;
  
  container.style.backgroundPosition = `${x}px ${y}px`;
  container.style.backgroundSize = `${scaledGridSize}px ${scaledGridSize}px`;
}

// ── UI Camera Controls ────────────────────────────────────────────────
export function zoomIn() {
  zoomBy(SCALE_BY);
}

export function zoomOut() {
  zoomBy(1 / SCALE_BY);
}

export function zoomFit() {
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  updateGrid();
}

function zoomBy(factor) {
  const oldScale = stage.scaleX();
  let newScale = oldScale * factor;
  newScale = Math.max(MIN_SCALE, Math.min(newScale, MAX_SCALE));

  // Zoom center is middle of screen if triggered by button
  const center = {
    x: stage.width() / 2,
    y: stage.height() / 2,
  };

  const mousePointTo = {
    x: (center.x - stage.x()) / oldScale,
    y: (center.y - stage.y()) / oldScale,
  };

  stage.scale({ x: newScale, y: newScale });

  const newPos = {
    x: center.x - mousePointTo.x * newScale,
    y: center.y - mousePointTo.y * newScale,
  };
  stage.position(newPos);
  updateGrid();
}
