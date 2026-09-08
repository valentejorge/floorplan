/**
 * view-filters.js — View filter checkboxes + localStorage sync
 */

let viewFilters = {};

export function getFilters() {
  return viewFilters;
}

export function bindViewFilters() {
  const btn = document.getElementById('btn-view-filters');
  const dropdown = document.getElementById('view-filters-dropdown');
  const filterIds = ['filter-hostname', 'filter-ip', 'filter-mac', 'filter-user'];
  
  // Load from localStorage or default to false
  const saved = localStorage.getItem('fpViewFilters');
  if (saved) {
    viewFilters = JSON.parse(saved);
  } else {
    filterIds.forEach(id => viewFilters[id] = false);
  }
  
  // Keep window.viewFilters in sync for backward compatibility
  window.viewFilters = viewFilters;
  
  // Sync UI with state
  filterIds.forEach(id => {
    const cb = document.getElementById(id);
    if (cb) {
      cb.checked = !!viewFilters[id];
      cb.addEventListener('change', (e) => {
        viewFilters[id] = e.target.checked;
        window.viewFilters = viewFilters;
        localStorage.setItem('fpViewFilters', JSON.stringify(viewFilters));
        
        // Trigger a re-render of labels
        import('./renderer.js').then(({ forceRenderLabels }) => {
          forceRenderLabels();
        });
      });
    }
  });

  // Toggle dropdown
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  // Clear filters
  const btnClear = document.getElementById('btn-clear-filters');
  btnClear?.addEventListener('click', (e) => {
    e.stopPropagation();
    filterIds.forEach(id => {
      viewFilters[id] = false;
      const cb = document.getElementById(id);
      if (cb) cb.checked = false;
    });
    window.viewFilters = viewFilters;
    localStorage.setItem('fpViewFilters', JSON.stringify(viewFilters));
    import('./renderer.js').then(({ forceRenderLabels }) => {
      forceRenderLabels();
    });
  });
  
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (dropdown && dropdown.style.display === 'block' && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}
