/**
 * engine.js — Konva CAD Engine
 *
 * Manages the Stage, 4 strict Z-ordered layers, grid rendering,
 * camera controls (pan/zoom), snap-to-grid, and the shared Transformer.
 */
import Konva from 'konva';

// ── Constants ──────────────────────────────────────────────────────
export const GRID_SIZE = 20;
const SCALE_BY = 1.08;
const MIN_SCALE = 0.15;
const MAX_SCALE = 4;

// ── Singleton State ────────────────────────────────────────────────
let stage = null;
let layerFloor = null;
let layerArchitecture = null;
let layerFurniture = null;
let layerAssets = null;
let overlayLayer = null;
let transformer = null;
let gridGroup = null;

// ════════════════════════════════════════════════════════════════════
// Init
// ════════════════════════════════════════════════════════════════════

export function initEngine(containerId) {
  const container = document.getElementById(containerId);
  const parent = container.parentElement;

  stage = new Konva.Stage({
    container: containerId,
    width: parent.clientWidth,
    height: parent.clientHeight,
    draggable: true,
  });

  // ── Strict layer order (bottom → top) ────────────────────────
  layerFloor        = new Konva.Layer({ name: 'layer_floor' });
  layerArchitecture = new Konva.Layer({ name: 'layer_architecture' });
  layerFurniture    = new Konva.Layer({ name: 'layer_furniture' });
  layerAssets       = new Konva.Layer({ name: 'layer_it_assets' });
  overlayLayer      = new Konva.Layer({ name: 'layer_overlay' });

  stage.add(layerFloor, layerArchitecture, layerFurniture, layerAssets, overlayLayer);

  // ── Transformer (shared, lives on overlay) ───────────────────
  transformer = new Konva.Transformer({
    rotateEnabled: true,
    rotationSnaps: [0, 45, 90, 135, 180, 225, 270, 315],
    anchorSize: 8,
    anchorCornerRadius: 2,
    borderStroke: '#961B7E',
    anchorStroke: '#961B7E',
    anchorFill: '#fff',
    padding: 2,
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  });
  overlayLayer.add(transformer);

  // ── Grid ─────────────────────────────────────────────────────
  renderGrid();

  // ── Mouse wheel zoom ─────────────────────────────────────────
  stage.on('wheel', (e) => {
    e.evt.preventDefault();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    let newScale = direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  });

  // ── Resize observer ──────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    stage.width(parent.clientWidth);
    stage.height(parent.clientHeight);
  });
  ro.observe(parent);

  return stage;
}

// ════════════════════════════════════════════════════════════════════
// Grid
// ════════════════════════════════════════════════════════════════════

function renderGrid() {
  if (gridGroup) gridGroup.destroy();
  gridGroup = new Konva.Group({ listening: false });

  // Render a 1400×1100 grid (larger than any mock room)
  const gridW = 1600;
  const gridH = 1200;

  for (let x = 0; x <= gridW; x += GRID_SIZE) {
    for (let y = 0; y <= gridH; y += GRID_SIZE) {
      gridGroup.add(new Konva.Circle({
        x, y,
        radius: 1,
        fill: '#bbb',
        listening: false,
      }));
    }
  }

  // Add grid BEHIND everything on overlay (so it's behind transformer)
  overlayLayer.add(gridGroup);
  gridGroup.moveToBottom();
}

// ════════════════════════════════════════════════════════════════════
// Camera
// ════════════════════════════════════════════════════════════════════

export function zoomIn() {
  const s = Math.min(stage.scaleX() * SCALE_BY, MAX_SCALE);
  stage.scale({ x: s, y: s });
}

export function zoomOut() {
  const s = Math.max(stage.scaleX() / SCALE_BY, MIN_SCALE);
  stage.scale({ x: s, y: s });
}

export function resetZoom() {
  stage.scale({ x: 1, y: 1 });
}

export function fitStage(roomW, roomH) {
  const pad = 60;
  const sX = stage.width() / (roomW + pad * 2);
  const sY = stage.height() / (roomH + pad * 2);
  const s = Math.min(sX, sY, 1.2);

  stage.scale({ x: s, y: s });
  stage.position({
    x: (stage.width() - roomW * s) / 2,
    y: (stage.height() - roomH * s) / 2,
  });
}

// ════════════════════════════════════════════════════════════════════
// Snap
// ════════════════════════════════════════════════════════════════════

export function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export function applySnapOnDragEnd(node) {
  node.on('dragend', () => {
    node.position({
      x: snapToGrid(node.x()),
      y: snapToGrid(node.y()),
    });
    node.getLayer().batchDraw();
  });
}

// ════════════════════════════════════════════════════════════════════
// Getters
// ════════════════════════════════════════════════════════════════════

export function getStage()            { return stage; }
export function getLayerFloor()       { return layerFloor; }
export function getLayerArchitecture(){ return layerArchitecture; }
export function getLayerFurniture()   { return layerFurniture; }
export function getLayerAssets()      { return layerAssets; }
export function getOverlayLayer()     { return overlayLayer; }
export function getTransformer()      { return transformer; }

export function getRelativePointerPosition() {
  const transform = stage.getAbsoluteTransform().copy().invert();
  const pos = stage.getPointerPosition();
  return transform.point(pos);
}
