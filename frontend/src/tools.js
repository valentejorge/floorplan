/**
 * tools.js — Tool State Machine
 *
 * Manages the active tool and wires up the appropriate mouse event
 * handlers on the Konva Stage for each tool mode.
 */
import Konva from 'konva';
import {
  getStage, getLayerFloor, getLayerArchitecture, getLayerFurniture,
  getLayerAssets, getOverlayLayer, getTransformer,
  getRelativePointerPosition, snapToGrid, applySnapOnDragEnd, GRID_SIZE,
} from './engine.js';
import { SHADOW_LIGHT, SHADOW_HEAVY, buildFurnitureNode, FURNITURE_TYPES } from './furniture.js';
import { skinManager } from './skins.js';
import { commitHistory } from './history.js';
import { refreshExplorer, selectNodeById, clearSelection } from './explorer.js';

// ── Tool enum ──────────────────────────────────────────────────────
export const TOOLS = {
  SELECT:    'select',
  FLOOR:     'floor',
  WALL:      'wall',
  FURNITURE: 'furniture',
  ASSETS:    'assets',
};

let activeTool = TOOLS.SELECT;
let drawState = null; // transient state for current draw operation
let floorColor = '#9ab8a0';
let wallType = 'exterior';

// Wall style registry
const WALL_STYLES = {
  exterior: { stroke: '#2d3748', strokeWidth: 8, dash: [], opacity: 1 },
  interior: { stroke: '#a0aec0', strokeWidth: 4,  dash: [], opacity: 1 },
  glass:    { stroke: '#63b3ed', strokeWidth: 3,  dash: [8, 6], opacity: 0.7 },
};

// ════════════════════════════════════════════════════════════════════
// API
// ════════════════════════════════════════════════════════════════════

export function getActiveTool() { return activeTool; }

export function setActiveTool(tool) {
  // Clean up previous tool state
  cancelDraw();
  activeTool = tool;

  const stage = getStage();
  const cursor = tool === TOOLS.FLOOR ? 'crosshair'
    : tool === TOOLS.WALL ? 'crosshair'
    : tool === TOOLS.FURNITURE ? 'copy'
    : 'default';
  stage.container().style.cursor = cursor;

  // Panning: disabled during draw tools
  stage.draggable(tool === TOOLS.SELECT || tool === TOOLS.ASSETS);

  // Toggle pickers
  document.getElementById('floor-color-picker')?.classList.toggle('visible', tool === TOOLS.FLOOR);
  document.getElementById('wall-type-picker')?.classList.toggle('visible', tool === TOOLS.WALL);
}

export function setFloorColor(color) { floorColor = color; }
export function setWallType(type) { wallType = type; }

// ════════════════════════════════════════════════════════════════════
// Stage Event Handlers (called from main.js)
// ════════════════════════════════════════════════════════════════════

export function bindToolsToStage() {
  const stage = getStage();
  if (!stage) return;
  
  stage.on('mousedown touchstart', (e) => {
    // Ignore if not in edit mode
    const layout = document.getElementById('main-layout');
    if (!layout || !layout.classList.contains('is-editing')) return;
    
    handleStageMouseDown(e);
  });
  
  stage.on('mousemove touchmove', () => {
    const layout = document.getElementById('main-layout');
    if (!layout || !layout.classList.contains('is-editing')) return;
    handleStageMouseMove();
  });
  
  stage.on('mouseup touchend', () => {
    const layout = document.getElementById('main-layout');
    if (!layout || !layout.classList.contains('is-editing')) return;
    handleStageMouseUp();
  });
  
  stage.on('dblclick dbltap', (e) => {
    const layout = document.getElementById('main-layout');
    if (!layout || !layout.classList.contains('is-editing')) return;
    handleStageDblClick(e);
  });

  // Global key listener
  document.addEventListener('keydown', (e) => {
    const layout = document.getElementById('main-layout');
    if (!layout || !layout.classList.contains('is-editing')) return;

    if (e.key === 'Enter') {
      if (activeTool === TOOLS.WALL) {
        handleWallDblClick();
      }
      return;
    }

    if (e.key === 'Escape') {
      cancelDraw();
      clearSelection();
      setActiveTool(TOOLS.SELECT);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Don't delete if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const tr = getTransformer();
      const nodes = tr.nodes();
      if (nodes.length > 0) {
        const mainLayer = nodes[0].getLayer();
        nodes.forEach(n => n.destroy());
        tr.nodes([]);
        tr.getLayer().batchDraw();
        if (mainLayer) mainLayer.batchDraw();
        refreshExplorer();
        commitHistory();
      }
    }
  });
}

export function handleStageMouseDown(e) {
  // Ignore if clicking on a transformer anchor
  if (e.target.getParent()?.className === 'Transformer') return;

  switch (activeTool) {
    case TOOLS.SELECT:  handleSelectDown(e); break;
    case TOOLS.FLOOR:   handleFloorDown(e);  break;
    case TOOLS.WALL:    handleWallDown(e);   break;
    case TOOLS.FURNITURE: handleFurnitureDown(e); break;
    case TOOLS.ASSETS:  handleSelectDown(e); break;
  }
}

export function handleStageMouseMove() {
  switch (activeTool) {
    case TOOLS.FLOOR: handleFloorMove(); break;
    case TOOLS.WALL:  handleWallMove();  break;
  }
}

export function handleStageMouseUp() {
  switch (activeTool) {
    case TOOLS.FLOOR: handleFloorUp(); break;
    case TOOLS.WALL:  handleWallUp(); break;
  }
}

export function handleStageDblClick(e) {
  if (activeTool === TOOLS.WALL) {
    handleWallDblClick();
  } else if (activeTool === TOOLS.SELECT) {
    // If double clicking a node
    const target = e?.target;
    if (!target) return;
    
    // Bubble up to the nearest Group
    let node = target;
    while (node && node.nodeType !== 'Group' && node.nodeType !== 'Stage') {
      node = node.getParent();
    }
    
    if (node && node.nodeType === 'Group') {
      const isEditable = !!node.getAttr('assetData');
      if (isEditable && window.openAssetMicroEdit) {
        window.openAssetMicroEdit(node);
      }
    }
  }
}

let activeFurnitureType = null;
export function setActiveFurnitureType(type) { activeFurnitureType = type; }

function handleFurnitureDown(e) {
  // Allow clicking on empty space or grid
  if (e.target !== getStage() && !e.target.getAttr('gridDot')) return;
  if (!activeFurnitureType) return;

  const pos = getRelativePointerPosition();
  const sx = snapToGrid(pos.x);
  const sy = snapToGrid(pos.y);

  const id = 'f-' + Date.now();
  const node = buildFurnitureNode({
    id: id,
    type: activeFurnitureType,
    x: sx,
    y: sy,
    rotation: 0,
    name: 'New ' + activeFurnitureType
  });

  if (node) {
    node.draggable(true);
    getLayerFurniture().add(node);
    getLayerFurniture().getLayer().batchDraw();
    refreshExplorer();
    selectNodeById(id);
    commitHistory();
  }
}

// ════════════════════════════════════════════════════════════════════
// SELECT Tool
// ════════════════════════════════════════════════════════════════════

function handleSelectDown(e) {
  // Click on empty = deselect
  if (e.target === getStage()) {
    clearSelection();
    return;
  }

  // Find the top-level group/shape that has entityData or assetData
  let node = e.target;
  while (node && !node.getAttr('entityData') && !node.getAttr('assetData')) {
    node = node.getParent();
    if (node === getStage()) { node = null; break; }
  }

  if (node && node.id()) {
    selectNodeById(node.id());
  } else {
    clearSelection();
  }
}

// ════════════════════════════════════════════════════════════════════
// FLOOR ZONE Tool
// ════════════════════════════════════════════════════════════════════

function handleFloorDown(e) {
  if (e.target !== getStage() && e.target.getLayer() !== getOverlayLayer()) return;

  const pos = getRelativePointerPosition();
  const sx = snapToGrid(pos.x);
  const sy = snapToGrid(pos.y);

  const id = 'fz-' + Date.now();
  const rect = new Konva.Rect({
    x: sx, y: sy, width: 0, height: 0,
    fill: floorColor,
    opacity: 0.4,
    id: id,
    listening: true,
  });
  rect.setAttr('entityData', { id, name: 'New Floor Zone', layer: 'floor', fill: floorColor });
  getLayerFloor().add(rect);

  drawState = { node: rect, startX: sx, startY: sy };
}

function handleFloorMove() {
  if (!drawState) return;
  const pos = getRelativePointerPosition();
  const sx = snapToGrid(pos.x);
  const sy = snapToGrid(pos.y);

  const w = sx - drawState.startX;
  const h = sy - drawState.startY;

  drawState.node.width(Math.abs(w));
  drawState.node.height(Math.abs(h));
  drawState.node.x(w < 0 ? sx : drawState.startX);
  drawState.node.y(h < 0 ? sy : drawState.startY);
  getLayerFloor().getLayer().batchDraw();
}

function handleFloorUp() {
  if (!drawState) return;

  const node = drawState.node;
  if (node.width() < GRID_SIZE || node.height() < GRID_SIZE) {
    node.destroy();
  } else {
    node.draggable(true);
    applySnapOnDragEnd(node);
  }

  drawState = null;
  getLayerFloor().getLayer().batchDraw();
  refreshExplorer();
  commitHistory();
}

// ════════════════════════════════════════════════════════════════════
// WALL Tool
// ════════════════════════════════════════════════════════════════════

let wallStartPos = null;

function handleWallDown(e) {
  if (e.target !== getStage() && !e.target.getAttr('gridDot')) {
    if (!drawState) return;
  }
  if (e.evt.button !== 0) return;

  const pos = getRelativePointerPosition();
  const sx = snapToGrid(pos.x);
  const sy = snapToGrid(pos.y);

  if (!drawState) {
    wallStartPos = { x: sx, y: sy };
    const style = WALL_STYLES[wallType] || WALL_STYLES.exterior;

    const id = 'w-' + Date.now();
    const line = new Konva.Line({
      points: [sx, sy, sx, sy],
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      dash: style.dash,
      lineCap: 'round',
      lineJoin: 'round',
      opacity: style.opacity,
      id: id,
      ...SHADOW_HEAVY,
    });
    line.setAttr('entityData', { id, name: 'New Wall', wallType, layer: 'architecture' });
    getLayerArchitecture().add(line);
    drawState = { node: line };
  } else {
    // Continue drawing the polyline
    const pts = drawState.node.points();
    pts.push(pts[pts.length - 2], pts[pts.length - 1]); // Dupe the last point as the new temp point
    wallStartPos = { x: pts[pts.length - 4], y: pts[pts.length - 3] }; // Update start pos to the last fixed point
    drawState.node.points(pts);
    getLayerArchitecture().getLayer().batchDraw();
  }
}

function handleWallMove() {
  if (!drawState || !wallStartPos) return;
  const pos = getRelativePointerPosition();
  let sx = snapToGrid(pos.x);
  let sy = snapToGrid(pos.y);

  // Mario Maker Angle Lock: 0, 45, 90 degrees
  let dx = sx - wallStartPos.x;
  let dy = sy - wallStartPos.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  if (absDx > absDy * 2) {
    dy = 0; // Lock Horizontal
  } else if (absDy > absDx * 2) {
    dx = 0; // Lock Vertical
  } else {
    // Lock Diagonal 45 deg
    const max = Math.max(absDx, absDy);
    dx = Math.sign(dx) * max;
    dy = Math.sign(dy) * max;
  }
  
  sx = snapToGrid(wallStartPos.x + dx);
  sy = snapToGrid(wallStartPos.y + dy);

  const pts = drawState.node.points().slice();
  pts[pts.length - 2] = sx;
  pts[pts.length - 1] = sy;
  drawState.node.points(pts);
  getLayerArchitecture().getLayer().batchDraw();
}

export function handleWallDblClick() {
  if (!drawState) return;
  
  // Finish the polyline
  const pts = drawState.node.points();
  if (pts.length > 4) {
    // Remove the trailing temp point
    pts.splice(-2, 2);
    drawState.node.points(pts);
  } else if (pts[0] === pts[2] && pts[1] === pts[3]) {
    // It's just a single dot, destroy it
    drawState.node.destroy();
    drawState = null;
    wallStartPos = null;
    getLayerArchitecture().getLayer().batchDraw();
    return;
  }

  drawState.node.draggable(true);
  
  import('./engine.js').then(({ applySnapOnDragEnd }) => {
    applySnapOnDragEnd(drawState.node);
  });

  drawState = null;
  wallStartPos = null;
  getLayerArchitecture().getLayer().batchDraw();
  refreshExplorer();
  commitHistory();
}

function cancelDraw() {
  if (drawState) {
    if (activeTool === TOOLS.WALL) {
      const pts = drawState.node.points();
      if (pts.length <= 4) {
        drawState.node.destroy();
      } else {
        pts.splice(-2, 2);
        drawState.node.points(pts);
        drawState.node.draggable(true);
        applySnapOnDragEnd(drawState.node);
      }
      getLayerArchitecture().getLayer().batchDraw();
    } else if (activeTool === TOOLS.FLOOR) {
      if (drawState.node.width() < GRID_SIZE) drawState.node.destroy();
      getLayerFloor().getLayer().batchDraw();
    }
    drawState = null;
    refreshExplorer();
    commitHistory();
  }
}

// ════════════════════════════════════════════════════════════════════
// FURNITURE placement (from modal)
// ════════════════════════════════════════════════════════════════════

let pendingFurnitureType = null;

export function startFurniturePlacement(type) {
  pendingFurnitureType = type;
  setActiveTool(TOOLS.SELECT);
  getStage().container().style.cursor = 'copy';

  // One-shot click to place
  const handler = () => {
    const pos = getRelativePointerPosition();
    const reg = FURNITURE_TYPES[type];
    if (!reg) return;

    const id = 'f-' + Date.now();
    const data = {
      id, name: reg.label, type,
      x: snapToGrid(pos.x), y: snapToGrid(pos.y),
      width: reg.defaultW, height: reg.defaultH,
      rotation: 0,
    };

    const node = buildFurnitureNode(data);
    if (node) {
      node.draggable(true);
      applySnapOnDragEnd(node);
      getLayerFurniture().add(node);
      getLayerFurniture().getLayer().batchDraw();
      refreshExplorer();
    }

    getStage().off('click.placeFurniture');
    getStage().container().style.cursor = 'default';
    pendingFurnitureType = null;
  };

  getStage().on('click.placeFurniture', handler);
}

// ════════════════════════════════════════════════════════════════════
// IT ASSET placement (drag from panel)
// ════════════════════════════════════════════════════════════════════


export function createAssetNode(asset) {
  const img = skinManager.getImage(asset.type);

  const group = new Konva.Group({
    x: asset.pos_x,
    y: asset.pos_y,
    draggable: true,
    id: `asset-${asset.id}`,
    name: 'it_asset',
  });

  group.setAttr('assetData', asset);
  group.setAttr('entityData', {
    id: `asset-${asset.id}`,
    name: asset.hardware_name,
    type: asset.type,
    ip: asset.ip,
    mac: asset.mac,
    layer: 'assets',
  });

  group.add(new Konva.Image({
    image: img,
    width: 40,
    height: 40,
    ...SHADOW_LIGHT,
  }));

  group.add(new Konva.Text({
    text: asset.hardware_name,
    fontSize: 9,
    fontFamily: 'Inter, sans-serif',
    fill: '#333',
    width: 70,
    align: 'center',
    y: 42,
    x: -15,
    listening: false,
  }));

  applySnapOnDragEnd(group);
  return group;
}

// End of file
