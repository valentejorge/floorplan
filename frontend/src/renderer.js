import Konva from 'konva';
import { zonesLayer, wallsLayer, assetsLayer, requestRender } from './engine.js';
import { skinManager, BOUNDING_BOX } from './skins.js';

export function loadMapData(data) {
  if (!data) return;

  // Clear existing objects
  zonesLayer.destroyChildren();
  wallsLayer.destroyChildren();
  assetsLayer.destroyChildren();

  // 1. Render Floor Zones
  if (data.floor_zones) {
    data.floor_zones.forEach(zone => {
      const rect = new Konva.Rect({
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        fill: zone.fill,
        opacity: zone.opacity,
        id: zone.id,
        name: 'zone',
        perfectDrawEnabled: false, // Performance boost
        listening: false // No hit graph
      });
      zonesLayer.add(rect);
    });
  }

  // 2. Render Walls
  if (data.walls) {
    data.walls.forEach(wall => {
      let strokeColor = '#2d3748';
      let strokeWidth = 8;
      let opacity = 1;

      if (wall.wallType === 'interior') {
        strokeColor = '#a0aec0';
        strokeWidth = 4;
      } else if (wall.wallType === 'glass') {
        strokeColor = '#63b3ed';
        strokeWidth = 3;
        opacity = 0.7;
      }

      const line = new Konva.Line({
        points: wall.points,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
        lineCap: 'round',
        lineJoin: 'round',
        opacity: opacity,
        id: wall.id,
        name: 'wall',
        perfectDrawEnabled: false,
        listening: false
      });
      wallsLayer.add(line);
    });
  }

  // 3. Render Doors
  if (data.doors) {
    data.doors.forEach(door => {
      const rect = new Konva.Rect({
        x: door.x,
        y: door.y,
        width: door.width,
        height: door.height,
        fill: '#8c6b5d',
        id: door.id,
        name: 'door',
        perfectDrawEnabled: false,
        listening: false
      });
      wallsLayer.add(rect);
    });
  }

  // 4. Render Furniture
  if (data.furniture) {
    data.furniture.forEach(furn => {
      const group = new Konva.Group({
        x: furn.x,
        y: furn.y,
        rotation: furn.rotation || 0,
        id: furn.id,
        name: 'furniture'
      });

      // NO SHADOWS - Pure flat performance
      const rect = new Konva.Rect({
        width: furn.width,
        height: furn.height,
        fill: '#ffffff',
        stroke: '#cbd5e0',
        strokeWidth: 2,
        cornerRadius: 4,
        perfectDrawEnabled: false
      });

      group.add(rect);
      
      // Cache the group to convert vectors to bitmap memory!
      group.cache();
      
      assetsLayer.add(group);
    });
  }

  // 5. Render IT Assets (Computers, Printers, etc.)
  if (data.assets) {
    data.assets.forEach(asset => {
      const group = new Konva.Group({
        x: asset.pos_x,
        y: asset.pos_y,
        id: asset.id,
        name: 'it-asset'
      });

      const imgObj = skinManager.getImage(asset.type);
      
      if (imgObj) {
        const icon = new Konva.Image({
          image: imgObj,
          width: BOUNDING_BOX,
          height: BOUNDING_BOX,
          x: -BOUNDING_BOX / 2,
          y: -BOUNDING_BOX / 2,
          perfectDrawEnabled: false
        });
        group.add(icon);
      } else {
        const fallback = new Konva.Circle({
          radius: BOUNDING_BOX / 2,
          fill: '#e2e8f0',
          stroke: '#a0aec0',
          strokeWidth: 2,
          perfectDrawEnabled: false
        });
        group.add(fallback);
      }

      const label = new Konva.Text({
        text: asset.hardware_name,
        fontSize: 10,
        fontFamily: 'sans-serif',
        fill: '#4a5568',
        y: BOUNDING_BOX / 2 + 2,
        align: 'center',
        width: BOUNDING_BOX * 2,
        x: -BOUNDING_BOX,
        perfectDrawEnabled: false
      });
      group.add(label);

      const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                      asset.status === 'warning' ? '#d69e2e' : null;
      
      if (dotColor) {
        const dot = new Konva.Circle({
          radius: 4,
          fill: dotColor,
          x: BOUNDING_BOX / 2 - 4,
          y: -BOUNDING_BOX / 2 + 4,
          stroke: '#fff',
          strokeWidth: 1,
          perfectDrawEnabled: false
        });
        group.add(dot);
      }

      // Convert complex text + svg + shapes into a SINGLE pre-rendered bitmap!
      group.cache();

      assetsLayer.add(group);
    });
  }

  requestRender();
}
