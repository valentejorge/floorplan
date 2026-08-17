import Konva from 'konva';
import { zonesLayer, wallsLayer, assetsLayer, furnitureLayer, requestRender, animateMapEntrance } from './engine.js';
import { skinManager } from './skins.js';
import { buildFurnitureNode } from './furniture.js';

export let currentAssets = [];
export let currentRoomData = null;

export function repopulateAssetsExplorer() {
  populateObjectExplorer(currentAssets);
}

export function loadMapData(data, isInitial = true) {
  const emptyStateOverlay = document.getElementById('empty-state-overlay');
  
  if (!data || !data.id) {
    if (emptyStateOverlay) emptyStateOverlay.style.display = 'block';
    if (!data) return;
  } else {
    if (emptyStateOverlay) emptyStateOverlay.style.display = 'none';
  }

  currentRoomData = data;
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

      renderAssetContent(group, asset, skinManager);

      // Hover Insights (Tooltip)
      if (asset.hardware_id) {
        group.listening(true);
        group.on('mouseenter', (e) => {
          document.body.style.cursor = 'pointer';
          const tooltip = document.getElementById('asset-tooltip');
          if (!tooltip) return;
          
          const mac = asset.mac || `00:1A:2B:3C:4D:${asset.hardware_id.toString().substring(0,2)}`;
          const user = asset.user || (asset.type === 'desktop' ? 'jorge.silva' : 'system');
          const desc = asset.description || `Equipamento ${asset.type} padrão`;
          const dotColor = asset.status === 'offline' ? '#e53e3e' : asset.status === 'warning' ? '#d69e2e' : '#5cb85c';
          
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

export function renderAssetContent(group, asset, skinManager) {
  group.destroyChildren();

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

    // Determine offsets based on table type
    let cx = 0, cy = 0, cr = 180; // Chairs face UP by being rotated 180 (backrest is at the top of SVG)
    let dx = 0, dy = 0, dr = 0;

    if (asset.layout.table === 'desk_straight' || asset.layout.table === 'desk_small') {
      cy = th / 2 + 15; // pushed further down
      dy = -15;
    } else if (asset.layout.table === 'desk_l') {
      // Inner corner of L-desk is top-left
      // Person sits South-East of inner corner, facing North-West
      cx = 35; 
      cy = 35; 
      cr = 135; // 180 - 45 = 135 (faces North-West)
      dx = -25; 
      dy = -25;
      dr = -45; // Device faces South-East
    } else if (asset.layout.table === 'desk_round') {
      cy = 55; // chair pulled further out
      dy = -15;
    } else if (asset.layout.table === 'rack_cabinet') {
      cy = th / 2 + 15;
      dy = 0;
    }

    // Override with explicit coordinates if present
    if (asset.layout.chair_x !== undefined) cx = asset.layout.chair_x;
    if (asset.layout.chair_y !== undefined) cy = asset.layout.chair_y;
    if (asset.layout.chair_r !== undefined) cr = asset.layout.chair_r;
    
    if (asset.layout.device_x !== undefined) dx = asset.layout.device_x;
    if (asset.layout.device_y !== undefined) dy = asset.layout.device_y;
    if (asset.layout.device_r !== undefined) dr = asset.layout.device_r;

    // Render Chair Layer
    if (asset.layout.chair && asset.layout.chair !== 'none') {
      const imgObj = skinManager.getImage(asset.layout.chair);
      if (imgObj) {
        const chairNode = new Konva.Image({
          image: imgObj,
          width: imgObj.width,
          height: imgObj.height,
          perfectDrawEnabled: false
        });
        const chairGroup = new Konva.Group({ x: cx, y: cy, rotation: cr });
        chairNode.position({ x: -imgObj.width / 2, y: -imgObj.height / 2 });
        chairGroup.add(chairNode);
        group.add(chairGroup);
      }
    }

    // Render Device Layer
    if (asset.layout.device && asset.layout.device !== 'none') {
      const imgObj = skinManager.getImage(asset.layout.device);
      if (imgObj) {
        const deviceNode = new Konva.Image({
          image: imgObj,
          width: imgObj.width,
          height: imgObj.height,
          perfectDrawEnabled: false
        });
        const deviceGroup = new Konva.Group({ x: dx, y: dy, rotation: dr });
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
    // Check view filters
    const filters = window.viewFilters || {};
    const showHostname = filters['filter-hostname'];
    const showIp = filters['filter-ip'];
    const showMac = filters['filter-mac'];
    const showUser = filters['filter-user'];
    
    const showAny = showHostname || showIp || showMac || showUser;

    if (showAny) {
      // Build multiline text
      let textLines = [];
      if (showHostname) textLines.push(asset.hardware_name || 'Unknown');
      if (showIp) textLines.push(asset.ip || 'No IP');
      if (showMac) textLines.push(asset.mac || 'No MAC');
      if (showUser) textLines.push(asset.assignee || 'No User');
      
      const textContent = textLines.join('\n');

      // We want the label to always be readable (horizontal) and rendered ON TOP of the desk (center)
      const parentRot = group.rotation() || 0;
      
      // Create a counter-rotated group so its local coordinate system matches the screen's coordinate system
      const labelGroup = new Konva.Group({
        rotation: -parentRot,
        name: 'asset-label-group'
      });
      
      const labelY = 0; // Render directly in the middle of the desk

      // Hardware Name Label Text (create first to measure it)
      const label = new Konva.Text({
        text: textContent,
        fontSize: 10, fontStyle: 'bold', fontFamily: 'sans-serif', fill: '#334155',
        y: labelY - 5, align: 'center', lineHeight: 1.3,
        perfectDrawEnabled: false
      });
      
      const labelWidth = Math.max(80, label.width() + 24);
      const labelHeight = label.height() + 8;
      
      label.width(labelWidth);
      label.x(-labelWidth / 2);
      // Adjust y so the whole block is vertically centered
      label.y(labelY - labelHeight / 2 + 4);

      // Hardware Name Label Background
      const labelBg = new Konva.Rect({
        x: -labelWidth / 2,
        y: labelY - labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
        fill: 'rgba(255, 255, 255, 0.9)',
        cornerRadius: 4,
        shadowColor: '#000',
        shadowBlur: 2,
        shadowOpacity: 0.1,
        shadowOffsetY: 1,
        perfectDrawEnabled: false
      });
      labelGroup.add(labelBg);
      labelGroup.add(label);

      // Status Dot
      const dotColor = asset.status === 'offline' ? '#e53e3e' : 
                       asset.status === 'warning' ? '#d69e2e' : '#10b981'; // Emerald green
      
      const dotBg = new Konva.Circle({
        radius: 5, fill: '#fff', x: -labelWidth / 2 + 10, y: labelY, perfectDrawEnabled: false
      });
      const dot = new Konva.Circle({
        radius: 3.5, fill: dotColor, x: -labelWidth / 2 + 10, y: labelY, perfectDrawEnabled: false
      });
      labelGroup.add(dotBg);
      labelGroup.add(dot);

      group.add(labelGroup);
    }
  }
}

export function forceRenderLabels() {
  if (!assetsLayer) return;
  
  // Re-render only the contents of all assets without moving them
  assetsLayer.getChildren().forEach(group => {
    const asset = group.getAttr('assetData');
    if (asset) {
      group.clearCache();
      renderAssetContent(group, asset, skinManager);
      // Re-add cache if in edit mode
      const layout = document.getElementById('main-layout');
      if (layout && layout.classList.contains('is-editing')) {
        group.cache();
      }
    }
  });
  assetsLayer.getLayer().batchDraw();
}
