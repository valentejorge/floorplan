import { notify } from './notify.js';

export async function populateFurnitureCatalog() {
  const panel = document.getElementById('furniture-catalog-body');
  if (!panel) return;
  
  const { SVG_ARCH, SVG_TABLES, SVG_CHAIRS } = await import('./skins.js');
  
  const items = [
    // Architecture
    { type: 'door', label: 'Door', svg: SVG_ARCH.door },
    { type: 'window', label: 'Window', svg: SVG_ARCH.window },
    
    // Desks & Tables
    { type: 'desk_straight', label: 'Straight Desk', svg: SVG_TABLES.desk_straight },
    { type: 'desk_small', label: 'Small Desk', svg: SVG_TABLES.desk_small },
    { type: 'desk_l', label: 'L-Desk', svg: SVG_TABLES.desk_l },
    { type: 'desk_round', label: 'Round Table', svg: SVG_TABLES.desk_round },
    { type: 'meeting_table', label: 'Meeting Table', svg: SVG_TABLES.meeting_table },
    
    // Chairs
    { type: 'office_chair', label: 'Chair', svg: SVG_CHAIRS.office_chair },
    { type: 'executive_chair', label: 'Executive Chair', svg: SVG_CHAIRS.executive_chair },
    { type: 'meeting_chairs_4', label: 'Chairs (x4)', svg: SVG_CHAIRS.meeting_chairs_4 },
    { type: 'meeting_chairs_6', label: 'Chairs (x6)', svg: SVG_CHAIRS.meeting_chairs_6 },
    
    // Decor & Utilities
    { type: 'rack_cabinet', label: 'Server Rack', svg: SVG_TABLES.rack_cabinet },
    { type: 'office_partition_80', label: 'Partition 80', svg: SVG_TABLES.office_partition_80 },
    { type: 'office_partition_160', label: 'Partition 160', svg: SVG_TABLES.office_partition_160 },
    { type: 'sofa', label: 'Sofa', svg: SVG_TABLES.sofa },
    { type: 'ac_unit', label: 'AC Unit', svg: SVG_TABLES.ac_unit },
    { type: 'water_cooler', label: 'Water Cooler', svg: SVG_TABLES.water_cooler },
    { type: 'plant', label: 'Plant', svg: SVG_TABLES.plant }
  ];

  panel.innerHTML = items.map(it => `
    <div class="fp-furniture-card" draggable="true" data-type="${it.type}">
      ${it.svg}
      <div class="fp-furniture-card__label">${it.label}</div>
    </div>
  `).join('');

  panel.querySelectorAll('.fp-furniture-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('furniture-type', card.dataset.type);
      e.dataTransfer.effectAllowed = 'copy';
    });
  });

  const container = document.getElementById('floorplan-container');
  container.addEventListener('dragover', (e) => {
    const layout = document.getElementById('main-layout');
    if (!layout?.classList.contains('is-editing')) return;
    
    const activeTool = document.querySelector('.fp-tool-btn.active')?.dataset.tool;
    if (activeTool !== 'furniture' && activeTool !== 'assets') return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  container.addEventListener('drop', async (e) => {
    const layout = document.getElementById('main-layout');
    if (!layout?.classList.contains('is-editing')) return;
    
    e.preventDefault();

    const { stage, getRelativePointerPosition, applySnapOnDragEnd, getLayerFurniture, GRID_SIZE } = await import('./engine.js');
    stage.setPointersPositions(e);
    let pos = getRelativePointerPosition();
    
    pos.x = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    pos.y = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
    
    const furType = e.dataTransfer.getData('furniture-type');
    if (furType) {
      const { buildFurnitureNode } = await import('./furniture.js');
      const node = buildFurnitureNode({
        id: 'fur_' + Date.now(),
        type: furType,
        x: pos.x,
        y: pos.y,
        rotation: 0
      });
      
      if (node) {
        const furnitureLayer = getLayerFurniture();
        furnitureLayer.add(node);
        node.draggable(true);
        applySnapOnDragEnd(node);
        furnitureLayer.getLayer().batchDraw();
        
        const { commitHistory } = await import('./history.js');
        commitHistory();
      }
      return;
    }

    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      try {
        const payload = JSON.parse(jsonData);
        if (payload.source === 'assets-catalog' && payload.asset) {
          const asset = payload.asset;
          
          // 1. Ensure pointers are updated for the drop event
          const { stage, getRelativePointerPosition, getLayerFurniture } = await import('./engine.js');
          stage.setPointersPositions(e);
          const pos = getRelativePointerPosition(); // {x, y} in map coordinates
          
          // 2. Find closest furniture (Magnetic Drop)
          let minGroup = null;
          let minDist = Infinity;
          const maxDropRadius = 60; // 60 map units (pixels at 100% zoom)
          
          getLayerFurniture().getChildren().forEach(node => {
            // Find the top-level furniture group
            let group = node;
            while (group && group.name() !== 'furniture' && group.parent) {
              group = group.parent;
            }
            if (group && group.name() === 'furniture') {
              const dx = group.x() - pos.x;
              const dy = group.y() - pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < minDist) {
                minDist = dist;
                minGroup = group;
              }
            }
          });
          
          if (!minGroup || minDist > maxDropRadius) {
            notify("Drag the computer closer to the center of a Desk or Rack.", "warning");
            return;
          }
          
          // 3. Use the unified pipeline to assign
          const { assignHardwareToNode } = await import('./explorer.js');
          await assignHardwareToNode(minGroup, asset);
          notify(`${asset.hardware_name || 'Asset'} assigned successfully!`, 'success');
        }
      } catch (err) {
        console.error("Drop asset parse error", err);
      }
    }
  });
}
