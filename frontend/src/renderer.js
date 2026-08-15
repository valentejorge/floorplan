import Konva from 'konva';
import { zonesLayer, wallsLayer, assetsLayer, furnitureLayer, requestRender, animateMapEntrance } from './engine.js';
import { skinManager } from './skins.js';
import { buildFurnitureNode } from './furniture.js';

export let currentAssets = [];

export function repopulateAssetsExplorer() {
  populateObjectExplorer(currentAssets);
}

export function loadMapData(data, isInitial = true) {
  if (!data) return;
  currentAssets = data.assets || [];

  // Clear existing objects
  import('./engine.js').then(({ globalTransformer }) => {
    if (globalTransformer) globalTransformer.nodes([]);
  });
  
  zonesLayer.destroyChildren();
  wallsLayer.destroyChildren();
  assetsLayer.destroyChildren();
  furnitureLayer.destroyChildren();

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
        listening: false, // No hit graph
        scaleX: zone.scaleX || 1,
        scaleY: zone.scaleY || 1
      });
      rect.setAttr('entityData', { id: zone.id, name: zone.name || 'Zone', fill: zone.fill, opacity: zone.opacity || 0.4, layer: 'floor' });
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
        listening: false,
        scaleX: wall.scaleX || 1,
        scaleY: wall.scaleY || 1
      });
      line.setAttr('entityData', { id: wall.id, name: wall.name || 'Wall', wallType: wall.wallType, layer: 'architecture' });
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

  // 3. Render Furniture (from history state or separate array)
  if (data.furniture) {
    data.furniture.forEach(item => {
      const fnNode = buildFurnitureNode({
        id: item.id,
        type: item.type || item.layout?.table || 'desk_straight',
        x: item.x !== undefined ? item.x : (item.pos_x || 0),
        y: item.y !== undefined ? item.y : (item.pos_y || 0),
        rotation: item.rotation !== undefined ? item.rotation : (item.layout?.rotation || 0),
        name: item.name || 'Furniture'
      });
      if (fnNode) furnitureLayer.add(fnNode);
    });
  }

  // 4. Render Parametric Assets (Tables, Chairs, IT Devices)
  if (data.assets) {
    data.assets.forEach(asset => {
      // Support legacy structure where furniture is inside assets
      if (asset.type === 'furniture') {
        const type = asset.layout?.table || 'desk_straight';
        const fnNode = buildFurnitureNode({
          id: asset.id,
          type: type,
          x: asset.pos_x || asset.x,
          y: asset.pos_y || asset.y,
          rotation: asset.layout ? (asset.layout.rotation || 0) : 0,
          name: asset.name || 'Furniture'
        });
        if (fnNode) furnitureLayer.add(fnNode);
        return;
      }

      const group = new Konva.Group({
        x: asset.pos_x || asset.x,
        y: asset.pos_y || asset.y,
        rotation: asset.layout ? (asset.layout.rotation || 0) : (asset.rotation || 0),
        id: asset.id,
        hardware_id: asset.hardware_id,
        name: 'it-asset',
        scaleX: asset.scaleX || 1,
        scaleY: asset.scaleY || 1
      });
      group.setAttr('assetData', asset);

      let tw = 40, th = 40; // Default bounding box for labels

      if (asset.layout) {
        // Render Table Layer
        if (asset.layout.table && asset.layout.table !== 'none') {
          const imgObj = skinManager.getImage(asset.layout.table);
          if (imgObj) {
            tw = Math.max(tw, imgObj.width);
            th = Math.max(th, imgObj.height);
            const tableNode = new Konva.Image({
              image: imgObj,
              width: imgObj.width,
              height: imgObj.height,
              x: -imgObj.width / 2,
              y: -imgObj.height / 2,
              perfectDrawEnabled: false,
              shadowColor: 'rgba(0,0,0,0.15)', shadowBlur: 10, shadowOffsetX: 0, shadowOffsetY: 4
            });
            group.add(tableNode);
          }
        }

        // Render Chair Layer (offset to the edge of the table)
        if (asset.layout.chair && asset.layout.chair !== 'none') {
          const imgObj = skinManager.getImage(asset.layout.chair);
          if (imgObj) {
            let cx = asset.layout.chair_x !== undefined ? asset.layout.chair_x : 0;
            let cy = asset.layout.chair_y !== undefined ? asset.layout.chair_y : (th > 40 ? th / 2 + 5 : 0);
            if (asset.layout.table === 'desk_round' || asset.layout.table === 'none') {
              if (asset.layout.chair_y === undefined) cy = 0; // Don't offset for round tables by default
            }
            let cr = asset.layout.chair_r !== undefined ? asset.layout.chair_r : 0;

            const chairNode = new Konva.Image({
              image: imgObj,
              width: imgObj.width,
              height: imgObj.height,
              perfectDrawEnabled: false
            });

            // Group to handle rotation around center
            const chairGroup = new Konva.Group({
              x: cx, y: cy, rotation: cr
            });
            chairNode.position({ x: -imgObj.width / 2, y: -imgObj.height / 2 });
            chairGroup.add(chairNode);
            group.add(chairGroup);
          }
        }

        // Render Device Layer (offset slightly to the "top" of the desk)
        if (asset.layout.device && asset.layout.device !== 'none') {
          const imgObj = skinManager.getImage(asset.layout.device);
          if (imgObj) {
            let dx = asset.layout.device_x !== undefined ? asset.layout.device_x : 0;
            let dy = asset.layout.device_y !== undefined ? asset.layout.device_y : (th > 40 && asset.layout.table !== 'none' ? -15 : 0);
            let dr = asset.layout.device_r !== undefined ? asset.layout.device_r : 0;

            const deviceNode = new Konva.Image({
              image: imgObj,
              width: imgObj.width,
              height: imgObj.height,
              perfectDrawEnabled: false
            });

            const deviceGroup = new Konva.Group({
              x: dx, y: dy, rotation: dr
            });
            deviceNode.position({ x: -imgObj.width / 2, y: -imgObj.height / 2 });
            deviceGroup.add(deviceNode);
            group.add(deviceGroup);
          }
        }
      }

      // Fallback
      if (group.getChildren().length === 0) {
        const fallback = new Konva.Circle({
          radius: 20, fill: '#e2e8f0', stroke: '#a0aec0', strokeWidth: 2, perfectDrawEnabled: false
        });
        group.add(fallback);
      }

      // Only add labels and tooltips if it is an actual IT hardware (has hardware_id)
      if (asset.hardware_id) {
        // Hardware Name Label Background
        const labelBg = new Konva.Rect({
          x: -tw / 2 + 10,
          y: th / 2 + 10,
          width: tw - 20,
          height: 14,
          fill: 'rgba(255, 255, 255, 0.85)',
          cornerRadius: 3,
          perfectDrawEnabled: false
        });
        group.add(labelBg);

        // Hardware Name Label Text
        const label = new Konva.Text({
          text: asset.hardware_name,
          fontSize: 9, fontStyle: 'bold', fontFamily: 'sans-serif', fill: '#4a5568',
          y: th / 2 + 12, align: 'center', width: tw, x: -tw / 2,
          perfectDrawEnabled: false
        });
        group.add(label);

        const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                        asset.status === 'warning' ? '#d69e2e' : '#5cb85c';
        
        // Outer glow/stroke for the dot
        const dotBg = new Konva.Circle({
          radius: 5, fill: '#fff', x: tw / 2 - 10, y: -th / 2 + 10, perfectDrawEnabled: false
        });
        const dot = new Konva.Circle({
          radius: 3.5, fill: dotColor, x: tw / 2 - 10, y: -th / 2 + 10, perfectDrawEnabled: false
        });
        group.add(dotBg);
        group.add(dot);

        // Hover Insights (Tooltip)
        group.listening(true);
        group.on('mouseenter', (e) => {
          document.body.style.cursor = 'pointer';
          const tooltip = document.getElementById('asset-tooltip');
          if (!tooltip) return;
          
          const mac = asset.mac || `00:1A:2B:3C:4D:${asset.hardware_id.toString().substring(0,2)}`;
          const user = asset.user || (asset.type === 'desktop' ? 'jorge.silva' : 'system');
          const desc = asset.description || `Equipamento ${asset.type} padrão`;
          
          tooltip.innerHTML = `
            <div class="fp-tooltip__header">
              <div class="fp-tooltip__title">
                <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:0 0 8px ${dotColor}80;"></div>
                ${asset.hardware_name}
              </div>
              <div class="fp-tooltip__subtitle">ID: ${asset.hardware_id} • ${asset.type.toUpperCase()}</div>
            </div>
            <div class="fp-tooltip__body">
              <div class="fp-tooltip__row"><span class="fp-tooltip__label">IP Addr</span><span class="fp-tooltip__value">${asset.ip || '—'}</span></div>
              <div class="fp-tooltip__row"><span class="fp-tooltip__label">MAC Addr</span><span class="fp-tooltip__value">${mac}</span></div>
              <div class="fp-tooltip__row"><span class="fp-tooltip__label">Assignee</span><span class="fp-tooltip__value">${user}</span></div>
              <div class="fp-tooltip__row"><span class="fp-tooltip__label">Details</span><span class="fp-tooltip__value" style="font-weight:400;color:#cbd5e1;">${desc}</span></div>
            </div>
          `;
          tooltip.classList.add('visible');
        });
        
        group.on('mousemove', (e) => {
          const tooltip = document.getElementById('asset-tooltip');
          if (tooltip && tooltip.classList.contains('visible')) {
            tooltip.style.left = e.evt.clientX + 'px';
            tooltip.style.top = e.evt.clientY + 'px';
          }
        });
        
        group.on('mouseleave', () => {
          document.body.style.cursor = 'default';
          const tooltip = document.getElementById('asset-tooltip');
          if (tooltip) tooltip.classList.remove('visible');
        });
        
        group.on('click tap', () => {
          if (window.selectAsset) window.selectAsset(asset);
          
          const layout = document.getElementById('main-layout');
          if (layout && layout.classList.contains('is-editing')) {
            import('./engine.js').then(({ getTransformer }) => {
              const tr = getTransformer();
              tr.nodes([group]);
              tr.getLayer().batchDraw();
            });
            import('./explorer.js').then(({ selectNodeById }) => {
               selectNodeById(group.id());
            });
          }
        });
      }

      assetsLayer.add(group);
    });
  }

  requestRender();
  
  if (isInitial) {
    animateMapEntrance();
  }
  
  populateObjectExplorer(data.assets);
}

function populateObjectExplorer(assets) {
  const explorerBody = document.getElementById('explorer-body');
  if (!explorerBody || !assets) return;
  
  const itAssets = assets.filter(a => a.hardware_id);
  
  if (itAssets.length === 0) {
    explorerBody.innerHTML = `<div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">Nenhum equipamento encontrado.</div>`;
    return;
  }
  
  explorerBody.innerHTML = '';
  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  
  itAssets.forEach(asset => {
    const item = document.createElement('div');
    item.className = 'fp-explorer__item';
    item.dataset.hwId = asset.hardware_id;
    
    const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                     asset.status === 'warning' ? '#d69e2e' : '#5cb85c';
                     
    item.innerHTML = `
      <div class="fp-explorer__item-icon" style="background-color:${dotColor}; width:8px; height:8px; border-radius:50%; box-shadow:0 0 6px ${dotColor}66;"></div>
      <div class="fp-explorer__item-name">${asset.hardware_name}</div>
      <div style="color:var(--fp-text-muted);font-size:10px;text-transform:uppercase;">${asset.type}</div>
    `;
    
    item.onclick = () => {
      if (window.selectAsset) window.selectAsset(asset);

      // Find asset in Konva
      const group = assetsLayer.getChildren().find(node => String(node.id()) === String(asset.id));
      if (group) {
        import('./engine.js').then(({ stage, getTransformer }) => {
          // Pulse effect
          const pulse = new Konva.Circle({
            x: group.x(), y: group.y(),
            radius: 30, stroke: '#961B7E', strokeWidth: 2, opacity: 1
          });
          assetsLayer.add(pulse);
          new Konva.Tween({
            node: pulse, duration: 1, radius: 100, opacity: 0,
            onFinish: () => pulse.destroy()
          }).play();
          
          // Select with Transformer
          const tr = getTransformer();
          tr.nodes([group]);
          tr.getLayer().batchDraw();
        });
      }
    };
    
    list.appendChild(item);
  });
  
  explorerBody.appendChild(list);
}

export function toggleAssetEditMode(isEditing) {
  assetsLayer.getChildren().forEach(group => {
    // Clear the cache to make changes
    group.clearCache();
    
    // Find existing bounding box if any
    let bbox = group.findOne('.edit-bbox');
    
    if (isEditing) {
      // Enable interaction
      group.listening(true);
      group.on('mouseenter', () => {
        document.body.style.cursor = 'grab';
      });
      group.on('mouseleave', () => {
        document.body.style.cursor = 'default';
      });
      
      if (!bbox) {
        // Calculate bounds (roughly based on children)
        const rect = group.getClientRect({ skipTransform: true });
        bbox = new Konva.Rect({
          x: rect.x - 2,
          y: rect.y - 2,
          width: rect.width + 4,
          height: rect.height + 4,
          stroke: '#63b3ed', // Blue
          strokeWidth: 1.5,
          dash: [4, 4],
          name: 'edit-bbox',
          listening: false
        });
        group.add(bbox);
      }
      bbox.show();
    } else {
      // Disable interaction
      group.listening(false);
      group.off('mouseenter mouseleave');
      if (bbox) bbox.hide();
    }
    
    // Re-cache for performance
    group.cache();
  });
  
  requestRender();
}
