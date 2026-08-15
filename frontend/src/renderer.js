import Konva from 'konva';
import { zonesLayer, wallsLayer, assetsLayer, requestRender, animateMapEntrance } from './engine.js';
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

      // Flat but beautiful Figma-style furniture
      const rect = new Konva.Rect({
        width: furn.width,
        height: furn.height,
        fillLinearGradientStartPoint: { x: 0, y: 0 },
        fillLinearGradientEndPoint: { x: 0, y: furn.height },
        fillLinearGradientColorStops: [0, '#ffffff', 1, '#f8fafc'],
        stroke: '#cbd5e0',
        strokeWidth: 2,
        cornerRadius: 6,
        perfectDrawEnabled: false
      });

      // Add a subtle inner line to represent a desk edge
      const innerRect = new Konva.Rect({
        x: 2, y: 2,
        width: furn.width - 4,
        height: furn.height - 4,
        stroke: '#e2e8f0',
        strokeWidth: 1,
        cornerRadius: 4,
        perfectDrawEnabled: false
      });

      group.add(rect);
      group.add(innerRect);
      
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

      // Hardware Name Label Background
      const labelBg = new Konva.Rect({
        x: -BOUNDING_BOX + 10,
        y: BOUNDING_BOX / 2 + 1,
        width: BOUNDING_BOX * 2 - 20,
        height: 14,
        fill: 'rgba(255, 255, 255, 0.85)',
        cornerRadius: 3,
        perfectDrawEnabled: false
      });
      group.add(labelBg);

      // Hardware Name Label Text
      const label = new Konva.Text({
        text: asset.hardware_name,
        fontSize: 9,
        fontStyle: 'bold',
        fontFamily: 'sans-serif',
        fill: '#4a5568',
        y: BOUNDING_BOX / 2 + 3,
        align: 'center',
        width: BOUNDING_BOX * 2,
        x: -BOUNDING_BOX,
        perfectDrawEnabled: false
      });
      group.add(label);

      const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                      asset.status === 'warning' ? '#d69e2e' : '#5cb85c';
      
      // Outer glow/stroke for the dot
      const dotBg = new Konva.Circle({
        radius: 5,
        fill: '#fff',
        x: BOUNDING_BOX / 2 - 4,
        y: -BOUNDING_BOX / 2 + 4,
        perfectDrawEnabled: false
      });
      const dot = new Konva.Circle({
        radius: 3.5,
        fill: dotColor,
        x: BOUNDING_BOX / 2 - 4,
        y: -BOUNDING_BOX / 2 + 4,
        perfectDrawEnabled: false
      });
      group.add(dotBg);
      group.add(dot);

      // Cache for performance
      group.cache();
      
      // Hover Insights (Tooltip)
      // Note: we must set listening to true for tooltips!
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

      assetsLayer.add(group);
    });
  }

  requestRender();
  
// Slide and fade map gracefully
  animateMapEntrance();
  
  populateObjectExplorer(data.assets);
}

function populateObjectExplorer(assets) {
  const explorerBody = document.getElementById('explorer-body');
  if (!explorerBody || !assets) return;
  
  if (assets.length === 0) {
    explorerBody.innerHTML = `<div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">Nenhum equipamento encontrado.</div>`;
    return;
  }
  
  explorerBody.innerHTML = '';
  const list = document.createElement('div');
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  
  assets.forEach(asset => {
    const item = document.createElement('div');
    item.className = 'explorer-item';
    item.style.padding = '8px 12px';
    item.style.borderBottom = '1px solid var(--fp-border)';
    item.style.cursor = 'pointer';
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.gap = '8px';
    item.style.fontSize = '12px';
    
    // Hover effect
    item.onmouseenter = () => item.style.backgroundColor = '#f8fafc';
    item.onmouseleave = () => item.style.backgroundColor = 'transparent';
    
    const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                     asset.status === 'warning' ? '#d69e2e' : '#5cb85c';
                     
    item.innerHTML = `
      <div style="width:8px;height:8px;border-radius:50%;background-color:${dotColor};"></div>
      <div style="font-weight:600;color:var(--fp-text);flex:1;">${asset.hardware_name}</div>
      <div style="color:var(--fp-text-muted);font-size:11px;">${asset.type}</div>
    `;
    
    item.onclick = () => {
      // Find asset in Konva
      const group = assetsLayer.getChildren().find(node => node.id() === asset.id);
      if (group) {
        import('./engine.js').then(({ stage }) => {
          const scale = stage.scaleX();
          new Konva.Tween({
            node: stage,
            duration: 0.6,
            x: stage.width() / 2 - group.x() * scale,
            y: stage.height() / 2 - group.y() * scale,
            easing: Konva.Easings.StrongEaseOut,
            onUpdate: () => stage.batchDraw()
          }).play();
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
