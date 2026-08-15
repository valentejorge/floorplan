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
  exterior: { stroke: '#6b7a88', strokeWidth: 12, dash: [] },
  interior: { stroke: '#8a9aaa', strokeWidth: 6,  dash: [] },
  glass:    { stroke: '#5b9ecf', strokeWidth: 4,  dash: [8, 6] },
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

export function handleStageMouseDown(e) {
  // Ignore if clicking on a transformer anchor
  if (e.target.getParent()?.className === 'Transformer') return;

  switch (activeTool) {
    case TOOLS.SELECT:  handleSelectDown(e); break;
    case TOOLS.FLOOR:   handleFloorDown(e);  break;
    case TOOLS.WALL:    handleWallDown(e);   break;
    case TOOLS.FURNITURE: break; // handled via modal
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
  }
}

export function handleStageDblClick() {
  if (activeTool === TOOLS.WALL) handleWallDblClick();
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
  getLayerFloor().batchDraw();
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
  getLayerFloor().batchDraw();
  refreshExplorer();
}

// ════════════════════════════════════════════════════════════════════
// WALL Tool
// ════════════════════════════════════════════════════════════════════

function handleWallDown(e) {
  if (e.target !== getStage() && !e.target.getAttr('gridDot')) {
    // Clicked on an object, not blank canvas
    if (!drawState) return;
  }
  if (e.evt.button !== 0) return;

  const pos = getRelativePointerPosition();
  const sx = snapToGrid(pos.x);
  const sy = snapToGrid(pos.y);

  const style = WALL_STYLES[wallType] || WALL_STYLES.exterior;

  if (!drawState) {
    const id = 'w-' + Date.now();
    const line = new Konva.Line({
      points: [sx, sy, sx, sy],
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      dash: style.dash,
      lineCap: 'round',
      lineJoin: 'round',
      id: id,
      ...SHADOW_HEAVY,
    });
    line.setAttr('entityData', { id, name: 'New Wall', wallType, layer: 'architecture' });
    getLayerArchitecture().add(line);
    drawState = { node: line };
  } else {
    const pts = drawState.node.points();
    pts.push(sx, sy);
    drawState.node.points(pts);
    getLayerArchitecture().batchDraw();
  }
}

function handleWallMove() {
  if (!drawState) return;
  const pos = getRelativePointerPosition();
  const sx = snapToGrid(pos.x);
  const sy = snapToGrid(pos.y);

  const pts = drawState.node.points().slice();
  pts[pts.length - 2] = sx;
  pts[pts.length - 1] = sy;
  drawState.node.points(pts);
  getLayerArchitecture().batchDraw();
}

function handleWallDblClick() {
  if (!drawState) return;
  // Remove trailing temp point
  const pts = drawState.node.points();
  pts.splice(-2, 2);
  drawState.node.points(pts);

  drawState.node.draggable(true);
  applySnapOnDragEnd(drawState.node);

  drawState = null;
  getLayerArchitecture().batchDraw();
  refreshExplorer();
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
      getLayerArchitecture().batchDraw();
    } else if (activeTool === TOOLS.FLOOR) {
      if (drawState.node.width() < GRID_SIZE) drawState.node.destroy();
      getLayerFloor().batchDraw();
    }
    drawState = null;
    refreshExplorer();
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
      getLayerFurniture().batchDraw();
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

const skinManager = new SkinManager();
let skinLoaded = false;

export async function ensureSkins() {
  if (!skinLoaded) {
    await skinManager.load('theme_visio');
    skinLoaded = true;
  }
}

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

// ════════════════════════════════════════════════════════════════════
// Key handler
// ════════════════════════════════════════════════════════════════════

export function handleKeyDown(e) {
  if (e.key === 'Escape') {
    cancelDraw();
    clearSelection();
    setActiveTool(TOOLS.SELECT);
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    const tr = getTransformer();
    const nodes = tr.nodes();
    if (nodes.length > 0) {
      nodes.forEach(n => n.destroy());
      tr.nodes([]);
      clearSelection();
      refreshExplorer();
    }
  }
}
