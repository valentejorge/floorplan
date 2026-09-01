import Konva from 'konva';
import { zonesLayer, wallsLayer, furnitureLayer, requestRender, animateMapEntrance } from './engine.js';
import { skinManager } from './skins.js';
import { buildFurnitureNode } from './furniture.js';

export let currentAssets = [];
export let currentRoomData = null;

export function repopulateAssetsExplorer() {
  import('./explorer.js').then(({ refreshExplorer }) => {
    refreshExplorer();
  });
}

export function loadMapData(data, isInitial = true) {
  const emptyStateOverlay = document.getElementById('empty-state-overlay');
  
  if (!data || (!data.id && (!data.room_data || !data.room_data.id))) {
    if (emptyStateOverlay) emptyStateOverlay.style.display = 'block';
    if (!data) return;
  } else {
    if (emptyStateOverlay) emptyStateOverlay.style.display = 'none';
  }

  currentRoomData = data.room_data || data;
  currentAssets = data.assets || [];
  const architecture = data.architecture || data;

  // Clear existing objects
  import('./engine.js').then(({ globalTransformer }) => {
    if (globalTransformer) globalTransformer.nodes([]);
  });
  
  zonesLayer.destroyChildren();
  wallsLayer.destroyChildren();
  furnitureLayer.destroyChildren();

  // 1. Render Floor Zones
  if (architecture.floor_zones) {
    architecture.floor_zones.forEach(zone => {
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
  if (architecture.walls) {
    architecture.walls.forEach(wall => {
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
  if (architecture.doors) {
    architecture.doors.forEach(door => {
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
      rect.setAttr('entityData', { id: door.id, name: 'Door', layer: 'architecture' });
      wallsLayer.add(rect);
    });
  }

  // 3. Render Furniture (from history state or separate array)
  if (architecture.furniture) {
    architecture.furniture.forEach(item => {
      const fnNode = buildFurnitureNode({
        id: item.id,
        type: item.type || item.layout?.table || 'desk_straight',
        x: item.x !== undefined ? item.x : (item.pos_x || 0),
        y: item.y !== undefined ? item.y : (item.pos_y || 0),
        rotation: item.rotation !== undefined ? item.rotation : (item.layout?.rotation || 0),
        name: item.name || 'Furniture',
        assigned_hardware: item.assigned_hardware || [],
        layout: item.layout || null,
        scaleX: item.scaleX || 1,
        scaleY: item.scaleY || 1
      });
      if (fnNode) {
        furnitureLayer.add(fnNode);
        
        // If this furniture has a layout with device/chair skins, render them
        const entityData = fnNode.getAttr('entityData');
        if (entityData.layout && (entityData.layout.device !== 'none' || entityData.layout.chair !== 'none')) {
          renderAssetContent(fnNode, entityData, skinManager);
          fnNode.cache();
        }
      }
    });
  }



  requestRender();
  
  if (isInitial) {
    animateMapEntrance();
  }
  
  import('./explorer.js').then(({ refreshExplorer }) => {
    refreshExplorer();
  });
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

  // Only add labels and tooltips if there is assigned IT hardware
  const firstHw = (asset.assigned_hardware && asset.assigned_hardware.length > 0) ? asset.assigned_hardware[0] : null;
  if (firstHw) {
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
      if (showHostname) textLines.push(firstHw.hardware_name || 'Unknown');
      if (showIp) textLines.push(firstHw.ip || 'No IP');
      if (showMac) textLines.push(firstHw.mac || 'No MAC');
      if (showUser) textLines.push(firstHw.assignee || 'No User');
      
      // If multiple hardware assigned, show count
      if (asset.assigned_hardware.length > 1) {
        textLines.push(`+${asset.assigned_hardware.length - 1} more`);
      }
      
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
      const dotColor = firstHw.status === 'offline' ? '#e53e3e' : 
                       firstHw.status === 'warning' ? '#d69e2e' : '#10b981'; // Emerald green
      
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
    
    // Hover Insights (Tooltip) — always bind, even without label filters
    const dotColor = firstHw.status === 'offline' ? '#e53e3e' : 
                     firstHw.status === 'warning' ? '#d69e2e' : '#10b981';
    
    group.listening(true);
    
    // Clean up previous listeners to avoid duplicates if re-rendered
    group.off('mouseenter.tooltip mousemove.tooltip mouseleave.tooltip');

    group.on('mouseenter.tooltip', (e) => {
      const layoutEl = document.getElementById('main-layout');
      if (layoutEl && layoutEl.classList.contains('is-editing')) return; // No tooltips in edit mode
      
      document.body.style.cursor = 'pointer';
      const tooltip = document.getElementById('asset-tooltip');
      if (!tooltip) return;

      // Build tooltip for all assigned hardware
      let hwRows = '';
      asset.assigned_hardware.forEach(hw => {
        const mac = hw.mac || '—';
        const user = hw.assignee || 'system';
        const hwDotColor = hw.status === 'offline' ? '#e53e3e' : hw.status === 'warning' ? '#d69e2e' : '#10b981';
        hwRows += `
          <div class="fp-tooltip__row" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;margin-top:4px;">
            <span class="fp-tooltip__label" style="display:flex;align-items:center;gap:4px;">
              <span style="width:6px;height:6px;border-radius:50%;background:${hwDotColor};display:inline-block;"></span>
              ${hw.hardware_name || 'Unknown'}
            </span>
            <span class="fp-tooltip__value">${hw.ip || '—'}</span>
          </div>
          <div class="fp-tooltip__row"><span class="fp-tooltip__label">MAC</span><span class="fp-tooltip__value">${mac}</span></div>
          <div class="fp-tooltip__row"><span class="fp-tooltip__label">Assignee</span><span class="fp-tooltip__value">${user}</span></div>
        `;
      });

      tooltip.innerHTML = `
        <div class="fp-tooltip__header">
          <div class="fp-tooltip__title">
            <div style="width:8px;height:8px;border-radius:50%;background:${dotColor};box-shadow:0 0 8px ${dotColor}80;"></div>
            ${firstHw.hardware_name || 'Unknown'}
          </div>
          <div class="fp-tooltip__subtitle">${asset.assigned_hardware.length} device(s) assigned</div>
        </div>
        <div class="fp-tooltip__body">
          ${hwRows}
        </div>
      `;
      tooltip.classList.add('visible');
    });

    group.on('mousemove.tooltip', (e) => {
      const tooltip = document.getElementById('asset-tooltip');
      if (tooltip && tooltip.classList.contains('visible')) {
        tooltip.style.left = e.evt.clientX + 'px';
        tooltip.style.top = e.evt.clientY + 'px';
      }
    });

    group.on('mouseleave.tooltip', () => {
      document.body.style.cursor = 'default';
      const tooltip = document.getElementById('asset-tooltip');
      if (tooltip) tooltip.classList.remove('visible');
    });
  }
}

export function forceRenderLabels() {
  if (!furnitureLayer) return;
  
  // Re-render only the contents of all furniture without moving them
  furnitureLayer.getChildren().forEach(group => {
    const data = group.getAttr('entityData');
    if (data) {
      group.clearCache();
      renderAssetContent(group, data, skinManager);
      // Re-add cache if in edit mode
      const layout = document.getElementById('main-layout');
      if (layout && layout.classList.contains('is-editing')) {
        group.cache();
      }
    }
  });
  furnitureLayer.getLayer().batchDraw();
}
