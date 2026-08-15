/**
 * furniture.js — Furniture Shape Factories
 *
 * Each factory returns a Konva.Group representing a top-down view of
 * office furniture. All shapes receive 2.5D drop shadows by default.
 */
import Konva from 'konva';

// ── Global Shadow Config ───────────────────────────────────────────
export const SHADOW_LIGHT = {
  shadowColor: 'rgba(0,0,0,0.25)',
  shadowBlur: 8,
  shadowOffsetX: 4,
  shadowOffsetY: 4,
  shadowEnabled: true,
};

export const SHADOW_HEAVY = {
  shadowColor: 'rgba(0,0,0,0.35)',
  shadowBlur: 12,
  shadowOffsetX: 5,
  shadowOffsetY: 5,
  shadowEnabled: true,
};

// ── Color Palette ──────────────────────────────────────────────────
const WOOD_LIGHT = '#c4a882';
const WOOD_DARK  = '#8b6914';
const WOOD_EDGE  = '#7a5c30';
const CHAIR_SEAT = '#555566';
const CHAIR_BACK = '#444455';
const PLANT_FILL = '#5a9e4b';
const PLANT_DARK = '#3d7a30';
const PARTITION_COLOR = '#9e9eb0';

// ════════════════════════════════════════════════════════════════════
// Factories
// ════════════════════════════════════════════════════════════════════

/**
 * Straight desk — rectangular wooden surface.
 */
export function createDeskStraight(w = 120, h = 60) {
  const group = new Konva.Group({ name: 'furniture' });

  // Desktop surface
  group.add(new Konva.Rect({
    x: 0, y: 0, width: w, height: h,
    fill: WOOD_LIGHT,
    stroke: WOOD_EDGE,
    strokeWidth: 1.5,
    cornerRadius: 2,
    ...SHADOW_LIGHT,
  }));

  // Dark edge strip (front)
  group.add(new Konva.Rect({
    x: 2, y: h - 6, width: w - 4, height: 4,
    fill: WOOD_DARK,
    cornerRadius: 1,
  }));

  return group;
}

/**
 * L-shaped desk — two rectangles forming an L.
 */
export function createDeskL(w = 140, h = 100) {
  const group = new Konva.Group({ name: 'furniture' });

  const mainW = w;
  const mainH = h * 0.5;
  const sideW = w * 0.4;
  const sideH = h;

  // Main horizontal surface
  group.add(new Konva.Rect({
    x: 0, y: 0, width: mainW, height: mainH,
    fill: WOOD_LIGHT,
    stroke: WOOD_EDGE,
    strokeWidth: 1.5,
    cornerRadius: 2,
    ...SHADOW_LIGHT,
  }));

  // Side vertical extension
  group.add(new Konva.Rect({
    x: mainW - sideW, y: 0, width: sideW, height: sideH,
    fill: WOOD_LIGHT,
    stroke: WOOD_EDGE,
    strokeWidth: 1.5,
    cornerRadius: 2,
    ...SHADOW_LIGHT,
  }));

  // Edge strip
  group.add(new Konva.Rect({
    x: 2, y: mainH - 5, width: mainW - sideW - 2, height: 3,
    fill: WOOD_DARK,
    cornerRadius: 1,
  }));

  return group;
}

/**
 * Round meeting table — circular surface.
 */
export function createDeskRound(w = 160) {
  const r = w / 2;
  const group = new Konva.Group({ name: 'furniture' });

  group.add(new Konva.Circle({
    x: r, y: r, radius: r,
    fill: WOOD_LIGHT,
    stroke: WOOD_EDGE,
    strokeWidth: 2,
    ...SHADOW_LIGHT,
  }));

  // Center detail
  group.add(new Konva.Circle({
    x: r, y: r, radius: r * 0.15,
    fill: WOOD_DARK,
    opacity: 0.3,
  }));

  return group;
}

/**
 * Office chair — top-down view with seat and backrest.
 */
export function createChair(w = 30) {
  const group = new Konva.Group({ name: 'furniture' });

  // Seat
  group.add(new Konva.Rect({
    x: 2, y: 6, width: w - 4, height: w - 8,
    fill: CHAIR_SEAT,
    cornerRadius: 4,
    ...SHADOW_LIGHT,
  }));

  // Backrest
  group.add(new Konva.Rect({
    x: 4, y: 0, width: w - 8, height: 6,
    fill: CHAIR_BACK,
    cornerRadius: [4, 4, 0, 0],
  }));

  return group;
}

/**
 * Decorative plant — green circle with radial gradient effect.
 */
export function createPlant(w = 30) {
  const r = w / 2;
  const group = new Konva.Group({ name: 'furniture' });

  // Pot base
  group.add(new Konva.Circle({
    x: r, y: r, radius: r * 0.5,
    fill: '#8b6914',
    ...SHADOW_LIGHT,
  }));

  // Foliage
  group.add(new Konva.Circle({
    x: r, y: r, radius: r,
    fillRadialGradientStartPoint: { x: -2, y: -2 },
    fillRadialGradientEndPoint: { x: 0, y: 0 },
    fillRadialGradientStartRadius: 0,
    fillRadialGradientEndRadius: r,
    fillRadialGradientColorStops: [0, PLANT_FILL, 0.7, PLANT_FILL, 1, PLANT_DARK],
    opacity: 0.85,
    ...SHADOW_LIGHT,
  }));

  return group;
}

/**
 * Partition / room divider — thin tall rectangle.
 */
export function createPartition(w = 6, h = 200) {
  const group = new Konva.Group({ name: 'furniture' });

  group.add(new Konva.Rect({
    x: 0, y: 0, width: w, height: h,
    fill: PARTITION_COLOR,
    stroke: '#7a7a8c',
    strokeWidth: 1,
    cornerRadius: 1,
    ...SHADOW_LIGHT,
  }));

  return group;
}

// ── Registry ───────────────────────────────────────────────────────
export const FURNITURE_TYPES = {
  desk_straight: { label: 'Straight Desk', factory: createDeskStraight, defaultW: 120, defaultH: 60 },
  desk_l:        { label: 'L-Desk',        factory: createDeskL,        defaultW: 140, defaultH: 100 },
  desk_round:    { label: 'Round Table',   factory: createDeskRound,    defaultW: 160, defaultH: 160 },
  chair:         { label: 'Chair',         factory: createChair,        defaultW: 30,  defaultH: 30 },
  plant:         { label: 'Plant',         factory: createPlant,        defaultW: 30,  defaultH: 30 },
  partition:     { label: 'Partition',     factory: createPartition,    defaultW: 6,   defaultH: 200 },
};

/**
 * Build a furniture Konva.Group from a data record.
 */
export function buildFurnitureNode(data) {
  const reg = FURNITURE_TYPES[data.type];
  if (!reg) {
    console.warn(`[furniture] Unknown type: ${data.type}`);
    return null;
  }

  const node = reg.factory(data.width || reg.defaultW, data.height || reg.defaultH);
  node.position({ x: data.x, y: data.y });
  node.rotation(data.rotation || 0);
  node.id(data.id);
  node.setAttr('entityData', { ...data, layer: 'furniture' });
  node.setAttr('entityType', data.type);
  node.draggable(false);

  return node;
}
