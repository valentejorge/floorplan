import Konva from 'konva';
import { skinManager } from './skins.js';

// ── Height Map ────────────────────────────────────────────────────────────────
// Real-world approximate heights in cm for each asset type.
// Used by getShadowProps() to compute realistic drop shadows.
// Desk surface ~75cm, chairs ~100cm (backrest), server rack ~180cm, etc.
export const ASSET_HEIGHT_CM = {
  // Furniture
  desk_small:             75,
  desk_straight:          75,
  desk_l:                 75,
  desk_round:             75,
  meeting_table:          75,
  rack_cabinet:           180,
  sofa:                   85,
  plant:                  120,
  ac_unit:                200,
  water_cooler:           130,
  office_partition_80:    80,
  office_partition_160:   160,
  tv_wall:                10,   // flat on wall
  whiteboard:             180,
  // Chairs
  office_chair:           100,
  executive_chair:        120,
  meeting_chairs_4:       100,
  meeting_chairs_6:       100,
  // IT Devices
  desktop_single:         45,
  desktop_dual:           45,
  laptop:                 5,
  server_unit:            4,    // 1U = 4.4 cm
  switch_unit:            4,
  printer_unit:           35,
  monitor_wall:           5,
  conference_phone:       10,
  // Architecture
  door:                   210,
  window:                 120,
};

export const DEFAULT_HEIGHT_CM = 75; // fallback for unknown types

// ── Shadow Utility ────────────────────────────────────────────────────────────
/**
 * Returns Konva shadow properties proportional to the asset's real height.
 *
 * Visual model: taller objects cast a larger, more offset shadow, as if lit
 * from above-left at a fixed angle. Flat objects (laptop, server 1U) have
 * a minimal shadow that barely lifts them off the floor.
 *
 * @param {number} heightCm - Real-world height in centimetres
 * @returns {Object} Konva shadow props
 */
export function getShadowProps(heightCm) {
  // Normalise height to [0..1] across the practical range (0–200cm)
  const t = Math.min(heightCm, 200) / 200;

  return {
    shadowColor:   'rgba(15, 23, 42, 1)',
    shadowBlur:    8 + t * 22,             // 8px (flat) → 30px (tall rack)
    shadowOffsetX: 4 + t * 18,             // 4px (flat) → 22px (tall rack)
    shadowOffsetY: 6 + t * 24,             // 6px (flat) → 30px (tall rack)
    shadowOpacity: 0.18 + t * 0.22,        // 18% → 40% opacity
    shadowEnabled: true,
  };
}

// ── Node Builder ──────────────────────────────────────────────────────────────
export function buildFurnitureNode(data) {
  const type = data.type;

  // Try to find image
  const skinData = skinManager.getImage(type);
  if (!skinData) {
    console.warn(`[furniture] Unknown SVG type or not loaded: ${type}`);
    // Return a fallback rectangle with a basic shadow
    const group = new Konva.Group({
      x: data.x, y: data.y, rotation: data.rotation || 0,
      id: data.id, name: 'furniture'
    });
    group.add(new Konva.Rect({
      width: 40, height: 40, x: -20, y: -20, fill: '#ccc',
      ...getShadowProps(DEFAULT_HEIGHT_CM)
    }));
    return group;
  }

  const heightCm = ASSET_HEIGHT_CM[type] ?? DEFAULT_HEIGHT_CM;

  const group = new Konva.Group({
    x: data.x, y: data.y, rotation: data.rotation || 0,
    id: data.id, name: 'furniture',
    scaleX: data.scaleX || 1, scaleY: data.scaleY || 1
  });

  const node = new Konva.Image({
    image: skinData.image,
    width: skinData.width,
    height: skinData.height,
    x: -skinData.width / 2,
    y: -skinData.height / 2,
    perfectDrawEnabled: false,
    ...getShadowProps(heightCm)
  });

  group.add(node);

  group.setAttr('entityData', {
    ...data,
    assigned_hardware: data.assigned_hardware || [],
    layout: data.layout || null,
    layer: 'furniture'
  });
  group.setAttr('entityType', type);
  group.draggable(false);

  // In edit mode, add hover states
  group.on('mouseenter', () => {
    const layout = document.getElementById('main-layout');
    if (layout?.classList.contains('is-editing') && group.listening()) {
      document.body.style.cursor = 'grab';
    }
  });
  group.on('mouseleave', () => {
    document.body.style.cursor = 'default';
  });

  return group;
}
