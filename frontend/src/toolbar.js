/**
 * toolbar.js — Tool button switching + style pickers + legacy furniture modal
 */
import { setActiveTool, setFloorColor, setWallType, setActiveFurnitureType } from './tools.js';
import { closeModal } from './modal.js';
import { notify } from './notify.js';

export function bindToolbar() {
  const buttons = document.querySelectorAll('.fp-tool-btn[data-tool]');
  
  const panels = {
    furniture: document.getElementById('furniture-catalog-panel'),
    assets: document.getElementById('assets-catalog-panel'),
    floor: document.getElementById('floor-color-picker'),
    wall: document.getElementById('wall-type-picker')
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;

      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Hide all left-sidebar panels
      ['furniture', 'floor', 'wall'].forEach(k => {
        if (panels[k]) panels[k].style.display = 'none';
      });
      // Assets panel is an overlay on the right, handle separately if needed
      if (tool === 'assets' && panels.assets) {
         // handled by assets-catalog.js mostly, but we can ensure it opens
      } else if (panels.assets) {
         panels.assets.style.display = 'none';
      }

      // Show the requested left-sidebar panel
      if (panels[tool] && tool !== 'assets') {
        panels[tool].style.display = 'flex';
      }
      
      import('./tools.js').then(({ setActiveTool }) => {
        setActiveTool(tool);
      });
    });
  });

  document.querySelectorAll('.fp-floor-option').forEach(s => {
    s.addEventListener('click', () => {
      document.querySelectorAll('.fp-floor-option').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
      setFloorColor(s.dataset.color);
    });
  });

  document.querySelectorAll('.fp-wall-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.fp-wall-option').forEach(x => x.classList.remove('active'));
      opt.classList.add('active');
      setWallType(opt.dataset.type);
    });
  });
}

export function bindLegacyFurnitureModal() {
  const modal = document.getElementById('furniture-modal');
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal(modal);
  });

  modal.querySelectorAll('.fp-furniture-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.type;
      closeModal(modal);
      
      setActiveFurnitureType(type);
      setActiveTool('furniture');
      
      notify(`Furniture "${type}" selected. Click on canvas to place it.`, 'info');
      
      document.querySelectorAll('.fp-tool-btn').forEach(b => b.classList.remove('active'));
      document.querySelector('.fp-tool-btn[data-tool="furniture"]')?.classList.add('active');
    });
  });
}
