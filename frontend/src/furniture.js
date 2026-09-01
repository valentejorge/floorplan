import Konva from 'konva';
import { skinManager } from './skins.js';

export function buildFurnitureNode(data) {
  const type = data.type;
  
  // Try to find image
  const skinData = skinManager.getImage(type);
  if (!skinData) {
    console.warn(`[furniture] Unknown SVG type or not loaded: ${type}`);
    // Return a fallback rectangle
    const group = new Konva.Group({
      x: data.x, y: data.y, rotation: data.rotation || 0,
      id: data.id, name: 'furniture'
    });
    group.add(new Konva.Rect({ width: 40, height: 40, x: -20, y: -20, fill: '#ccc' }));
    return group;
  }

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
    shadowColor: 'rgba(0,0,0,0.15)', shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 4
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

  // In edit mode, add hover states and edit bbox
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
