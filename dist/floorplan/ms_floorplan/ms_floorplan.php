<?php
// Define the base URL for the plugin assets dynamically
$plugin_dir = "extensions/floorplan/ms_floorplan";
$assets_dir = "$plugin_dir/assets";
?>
<style>
<?php 
$css_file_path = __DIR__ . '/assets/style.css';
if (file_exists($css_file_path)) {
    echo file_get_contents($css_file_path);
} else {
    $css_files = glob(__DIR__ . '/assets/assets/*.css');
    if (!empty($css_files)) {
        usort($css_files, function($a, $b) { return filemtime($b) - filemtime($a); });
        echo file_get_contents($css_files[0]);
    }
}
?>
</style>
<div id="floorplan-root" style="height: calc(100vh - 120px); position: relative; display: flex; flex-direction: column;">
  <!-- OCS Plugin Container -->
    <!-- ── Topbar ──────────────────────────────────────────────── -->
    <header class="fp-topbar">
      <div class="fp-topbar__brand" style="flex:1;">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px;">
          <rect x="1" y="1" width="16" height="16" rx="2"/>
          <line x1="1" y1="9" x2="17" y2="9"/>
          <line x1="9" y1="1" x2="9" y2="17"/>
        </svg>
        floorplan
      </div>

      <div class="fp-topbar__search" style="flex:2; display:flex; justify-content:center;">
        <div style="position:relative; display:flex; gap:4px;">
          <input id="search-input" class="fp-topbar__input" style="width:360px; padding:6px 12px; border:1px solid var(--fp-border); border-radius:4px;" type="text" placeholder="Search hostname, IP, MAC, maps…" autocomplete="off" />
          <button id="search-btn" style="background:var(--fp-primary);color:#fff;border:none;padding:5px 12px;border-radius:4px;font-size:12px;cursor:pointer;">
            Search
          </button>
          <!-- Search Results (now relative to this exact container) -->
          <div id="search-results" class="fp-search-results"></div>
        </div>
      </div>

      <div style="flex:1;display:flex;justify-content:flex-end;align-items:center;gap:8px;">
        
        <!-- View Filters Dropdown -->
        <div style="position:relative; margin-right:8px;">
          <button id="btn-view-filters" style="background:#fff;color:var(--fp-text);border:1px solid var(--fp-border);padding:5px 10px;border-radius:4px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;font-weight:600;">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 3C4.5 3 1.5 10 1.5 10C1.5 10 4.5 17 10 17C15.5 17 18.5 10 18.5 10C18.5 10 15.5 3 10 3Z"/><circle cx="10" cy="10" r="3"/></svg>
            View
          </button>
          
          <div id="view-filters-dropdown" style="display:none;position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border:1px solid var(--fp-border);border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.1);padding:12px;width:180px;z-index:9999;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-size:11px;font-weight:700;color:var(--fp-text-muted);text-transform:uppercase;letter-spacing:0.5px;">Map Labels</div>
              <button id="btn-clear-filters" style="background:none;border:none;color:var(--fp-primary);font-size:10px;font-weight:600;cursor:pointer;padding:0;">Clear</button>
            </div>
            
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px;cursor:pointer;">
              <input type="checkbox" id="filter-hostname" style="accent-color:var(--fp-primary);"> Hostname
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px;cursor:pointer;">
              <input type="checkbox" id="filter-ip" style="accent-color:var(--fp-primary);"> IP Address
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px;cursor:pointer;">
              <input type="checkbox" id="filter-mac" style="accent-color:var(--fp-primary);"> MAC Address
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:6px;cursor:pointer;">
              <input type="checkbox" id="filter-user" style="accent-color:var(--fp-primary);"> User
            </label>
          </div>
        </div>

        <button id="btn-edit-mode" style="background:var(--fp-primary);color:#fff;border:none;padding:6px 14px;border-radius:4px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;font-weight:600;">
          <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.5 3.5L16.5 5.5L5.5 16.5L3.5 16.5L3.5 14.5L14.5 3.5Z"/></svg>
          Edit Map
        </button>
        <button id="btn-cancel-edit" class="fp-btn" style="display:none;background:transparent;color:var(--fp-text-muted);border:1px solid var(--fp-border);padding:6px 14px;border-radius:4px;font-size:12px;cursor:pointer;font-weight:600;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Cancel
        </button>
        <button id="btn-save-edit" class="fp-btn" style="display:none;background:var(--fp-primary);color:#fff;border:none;padding:6px 14px;border-radius:4px;font-size:12px;cursor:pointer;font-weight:600;">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Save
        </button>
      </div>
    </header>

    <!-- ── Main Layout (3-column) ──────────────────────────────── -->
    <div class="fp-layout" id="main-layout">

      <!-- Canvas Area -->
      <div class="fp-canvas-area" id="canvas-area">
        <div class="fp-grid-layer" id="grid-layer"></div>
        <div id="floorplan-container"></div>
        
        <!-- Interactive Breadcrumb Overlay -->
        <nav id="breadcrumb" class="fp-canvas-breadcrumb"><a href="#" onclick="if(window.openMapNavigator) window.openMapNavigator(); return false;" title="Open Navigator">🗺️ All Maps</a></nav>
        
        <div class="fp-camera-controls">
          <button id="btn-zoom-in" title="Zoom In">+</button>
          <button id="btn-zoom-out" title="Zoom Out">−</button>
          <button id="btn-zoom-reset" class="text-btn" title="100%">100%</button>
          <button id="btn-zoom-fit" class="text-btn" title="Fit">Fit</button>
        </div>
      </div>

      <!-- Right/Left Explorer Panel -->
      <aside class="fp-explorer" id="explorer-panel">
        
        <!-- ── Furniture Catalog Panel ─────────────────────────────────────── -->
        <div id="furniture-catalog-panel" style="display:none;background:var(--fp-bg-sidebar);flex-direction:column;max-height:100%;z-index:100;pointer-events:auto;position:absolute;top:0;left:0;right:0;bottom:0;">
          <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--fp-border);">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:var(--fp-text);text-transform:uppercase;letter-spacing:0.8px;">Furniture Catalog</h3>
            <button id="btn-close-furniture" style="background:none;border:none;color:var(--fp-text-muted);cursor:pointer;font-size:16px;line-height:1;">&times;</button>
          </div>
          <div id="furniture-catalog-body" style="flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:start;">
            <!-- SVGs will be injected here via JS -->
          </div>
        </div>

        <!-- ── IT Assets Catalog Panel ─────────────────────────────────────── -->
        <div id="assets-catalog-panel" style="display:none;background:var(--fp-bg-sidebar);flex-direction:column;max-height:100%;z-index:101;pointer-events:auto;position:absolute;top:0;left:0;right:0;bottom:0;">
          <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--fp-border);">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:var(--fp-text);text-transform:uppercase;letter-spacing:0.8px;">Unmapped Assets</h3>
            <button id="btn-close-assets" style="background:none;border:none;color:var(--fp-text-muted);cursor:pointer;font-size:16px;line-height:1;">&times;</button>
          </div>
          <div style="padding:8px 12px;border-bottom:1px solid var(--fp-border);background:#f8fafc;">
             <input type="text" id="assets-catalog-search" placeholder="Filter assets..." style="width:100%;padding:6px;border:1px solid #cbd5e1;border-radius:4px;font-size:11px;">
          </div>
          <div id="assets-catalog-body" style="flex:1;overflow-y:auto;padding:0;">
            <!-- Fetched from API -->
            <div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">Loading...</div>
          </div>
        </div>

        <!-- ── Floor Color Panel ─────────────────────────────────────── -->
        <div id="floor-catalog-panel" style="display:none;background:var(--fp-bg-sidebar);flex-direction:column;max-height:100%;z-index:102;pointer-events:auto;position:absolute;top:0;left:0;right:0;bottom:0;">
          <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--fp-border);">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:var(--fp-text);text-transform:uppercase;letter-spacing:0.8px;">Floor Style</h3>
            <button id="btn-close-floor" style="background:none;border:none;color:var(--fp-text-muted);cursor:pointer;font-size:16px;line-height:1;">&times;</button>
          </div>
          <div id="floor-color-picker" style="flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;align-content:start;">
            <div class="fp-color-swatch active" data-color="#9ab8a0" style="background:#9ab8a0;" title="Carpet Green"></div>
            <div class="fp-color-swatch" data-color="#d4cfc4" style="background:#d4cfc4;" title="Tile Beige"></div>
            <div class="fp-color-swatch" data-color="#8fa8c8" style="background:#8fa8c8;" title="Corporate Blue"></div>
            <div class="fp-color-swatch" data-color="#c4b896" style="background:#c4b896;" title="Wood Floor"></div>
            <div class="fp-color-swatch" data-color="#bbb" style="background:#bbb;" title="Concrete"></div>
            <div class="fp-color-swatch" data-color="#e8e0d0" style="background:#e8e0d0;" title="White Tile"></div>
            <div class="fp-color-swatch" data-color="#7a9a8a" style="background:#7a9a8a;" title="Dark Carpet"></div>
            <div class="fp-color-swatch" data-color="#dbb8a0" style="background:#dbb8a0;" title="Terracotta"></div>
          </div>
        </div>

        <!-- ── Wall Type Panel ─────────────────────────────────────── -->
        <div id="wall-catalog-panel" style="display:none;background:var(--fp-bg-sidebar);flex-direction:column;max-height:100%;z-index:103;pointer-events:auto;position:absolute;top:0;left:0;right:0;bottom:0;">
          <div style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--fp-border);">
            <h3 style="margin:0;font-size:12px;font-weight:700;color:var(--fp-text);text-transform:uppercase;letter-spacing:0.8px;">Wall Type</h3>
            <button id="btn-close-wall" style="background:none;border:none;color:var(--fp-text-muted);cursor:pointer;font-size:16px;line-height:1;">&times;</button>
          </div>
          <div id="wall-type-picker" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;">
            <div class="fp-wall-option active" data-type="exterior">
              <div class="fp-wall-option__line" style="background:#6b7a88;height:6px;"></div>
              Exterior
            </div>
            <div class="fp-wall-option" data-type="interior">
              <div class="fp-wall-option__line" style="background:#8a9aaa;height:3px;"></div>
              Interior
            </div>
            <div class="fp-wall-option" data-type="glass">
              <div class="fp-wall-option__line" style="background:#5b9ecf;height:2px;border-top:2px dashed #5b9ecf;"></div>
              Glass
            </div>
          </div>
        </div>

        <div class="fp-explorer__header">Object Explorer</div>
        <div id="explorer-body" class="fp-explorer__body">
          <div style="padding:16px;text-align:center;color:var(--fp-text-muted);font-size:12px;">
            Loading IT Assets...
          </div>
        </div>
        <div id="properties-panel" class="fp-properties">
          <div class="fp-properties__title">Properties</div>
          <div style="color:var(--fp-text-muted);font-size:11px;">No selection</div>
        </div>

        <!-- Asset Micro-Edit Panel (Overlays the explorer) -->
        <div id="asset-edit-modal" class="fp-asset-edit-panel">
          <div class="fp-asset-edit__title" style="font-weight:600;font-size:14px;margin-bottom:16px;">Layout Configuration</div>
          
          <div class="fp-form-group">
            <label>Table</label>
            <select id="asset-edit-table" class="fp-select">
              <option value="none">None</option>
              <option value="desk_small">Small Desk</option>
              <option value="desk_straight">Straight Desk</option>
              <option value="desk_l">L-Desk</option>
              <option value="desk_round">Round Table</option>
              <option value="rack_cabinet">Server Rack</option>
            </select>
          </div>
          
          <div class="fp-form-group">
            <label>Device</label>
            <select id="asset-edit-device" class="fp-select">
              <option value="none">None</option>
              <option value="desktop_single">Desktop (1 Monitor)</option>
              <option value="desktop_dual">Desktop (2 Monitors)</option>
              <option value="laptop">Laptop</option>
              <option value="server_unit">Server 1U</option>
              <option value="switch_unit">Switch</option>
              <option value="printer_unit">Printer</option>
              <option value="monitor_wall">Wall Monitor</option>
              <option value="conference_phone">Conference Phone</option>
            </select>
          </div>
          
          <div class="fp-form-group">
            <label>Chair</label>
            <select id="asset-edit-chair" class="fp-select">
              <option value="none">None</option>
              <option value="office_chair">Office Chair</option>
              <option value="executive_chair">Executive Chair</option>
              <option value="meeting_chairs_4">Meeting Chairs (x4)</option>
            </select>
          </div>

          <div class="fp-form-group">
            <label>Internal Rotation</label>
            <select id="asset-edit-rotation" class="fp-select">
              <option value="0">0º (Up)</option>
              <option value="90">90º (Right)</option>
              <option value="180">180º (Down)</option>
              <option value="270">270º (Left)</option>
            </select>
          </div>

          <div class="fp-form-group" style="margin-top: 16px; border-top: 1px solid var(--fp-border); padding-top: 12px;">
            <label style="display:flex; justify-content:space-between;">
              <span>Assigned IT Assets</span>
            </label>
            <div id="asset-edit-assigned-list" style="display:flex; flex-direction:column; gap:4px; margin-bottom: 8px;">
              <!-- Assigned assets populated here via JS -->
            </div>
            <div style="display:flex; gap:4px;">
              <select id="asset-edit-unmapped-select" class="fp-select" style="flex:1;">
                <option value="">Select computer to assign...</option>
                <!-- Populated by JS from unmapped list -->
              </select>
              <button id="asset-edit-assign-btn" class="fp-btn fp-btn--outline" style="padding:0 8px;">Add</button>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-top:24px;">
            <button class="fp-btn fp-btn--outline" id="asset-edit-cancel" style="flex:1;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Cancel
            </button>
            <button class="fp-btn fp-btn--primary" id="asset-edit-save" style="flex:1;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Save
            </button>
          </div>
        </div>
      </aside>

      <!-- Right Toolbar Panel (Hidden initially) -->
      <aside class="fp-toolbar" id="toolbar-panel">
        <!-- Select -->
        <button class="fp-tool-btn active" data-tool="select" data-tooltip="Select / Transform">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 2 L4 16 L8 12 L12 18 L14 17 L10 11 L15 10 Z"/>
          </svg>
        </button>

        <div class="fp-toolbar__sep"></div>

        <!-- Draw Floor Zone -->
        <button class="fp-tool-btn" data-tool="floor" data-tooltip="Draw Floor Zone">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="2" y="2" width="16" height="16" rx="1" stroke-dasharray="3 2"/>
          </svg>
        </button>

        <!-- Draw Wall -->
        <button class="fp-tool-btn" data-tool="wall" data-tooltip="Draw Wall">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M3 17 L10 4 L17 17"/>
          </svg>
        </button>

        <div class="fp-toolbar__sep"></div>

        <!-- Furniture Catalog -->
        <button class="fp-tool-btn" data-tool="furniture" data-tooltip="Furniture Catalog">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="14" height="8" rx="1"/>
            <rect x="5" y="4" width="10" height="4" rx="1"/>
            <line x1="5" y1="16" x2="5" y2="19"/>
            <line x1="15" y1="16" x2="15" y2="19"/>
          </svg>
        </button>

        <!-- IT Assets -->
        <button class="fp-tool-btn" data-tool="assets" data-tooltip="IT Assets">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="2" width="14" height="16" rx="2"/>
            <rect x="5" y="4" width="10" height="4" rx="1"/>
            <circle cx="13" cy="6" r="1.2" fill="currentColor"/>
            <rect x="5" y="10" width="10" height="4" rx="1"/>
            <circle cx="13" cy="12" r="1.2" fill="currentColor"/>
          </svg>
        </button>
      </aside>



      <!-- Canvas Area and Explorer were moved above -->
    </div>


    <!-- ── Map Navigator Modal (Habbo Style) ─────────────────────── -->
    <div id="map-navigator-modal" class="fp-modal">
      <div class="fp-modal__content fp-navigator">
        <div class="fp-navigator__header">
          <button class="fp-navigator__close" style="margin-right:12px; display:flex; align-items:center; justify-content:center; padding:4px;" title="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div class="fp-navigator__title">Map Navigator</div>
          <div style="flex:1;"></div>
          <div style="position:relative; display:flex; align-items:center;">
            <div id="nav-default-actions" style="display:flex; transition: opacity 0.2s ease-in-out; opacity: 1; pointer-events: auto;">
              <button class="fp-btn" id="btn-edit-order" style="background:var(--fp-primary);color:#fff;border:none;padding:6px 14px;border-radius:4px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;font-weight:600;margin-left:8px;" title="Edit Map">
                <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.5 3.5L16.5 5.5L5.5 16.5L3.5 16.5L3.5 14.5L14.5 3.5Z"/></svg>
                Edit Map
              </button>
              <button class="fp-btn" id="btn-new-map" style="background:var(--fp-primary);color:#fff;border:none;padding:6px 14px;border-radius:4px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:6px;font-weight:600;margin-left:8px;" title="New Map">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                New Map
              </button>
            </div>
            <div id="nav-edit-actions" style="position:absolute; right:0; display:flex; transition: opacity 0.2s ease-in-out; opacity: 0; pointer-events: none;">
              <button class="fp-btn" id="btn-cancel-order" style="background:transparent;color:var(--fp-text-muted);border:1px solid var(--fp-border);padding:6px 14px;border-radius:4px;font-size:12px;cursor:pointer;font-weight:600;margin-left:8px;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                Cancel
              </button>
              <button class="fp-btn" id="btn-save-order" style="background:var(--fp-primary);color:#fff;border:none;padding:6px 14px;border-radius:4px;font-size:12px;cursor:pointer;font-weight:600;margin-left:8px;">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                Save
              </button>
            </div>
          </div>
        </div>
        <div class="fp-navigator__body">
          <div class="fp-navigator__sidebar" style="display:flex;flex-direction:column;">
            <div style="padding:10px;border-bottom:1px solid var(--fp-border);">
              <input id="nav-sidebar-search" type="text" placeholder="Filter buildings..." style="width:100%;padding:6px;border:1px solid var(--fp-border);border-radius:4px;font-size:11px;" />
            </div>
            <div id="navigator-sidebar" style="flex:1;overflow-y:auto;">
              <!-- Populated via JS -->
            </div>
          </div>
          <div class="fp-navigator__grid" id="navigator-grid">
            <div style="padding:40px;text-align:center;color:var(--fp-text-muted);grid-column:1/-1;">
              Select a floor on the left to view its rooms.
            </div>
            <!-- Populated via JS -->
          </div>
        </div>
      </div>
    </div>

    <!-- ── Create Map Modal ─────────────────────────────────────── -->
    <div id="create-map-modal" class="fp-modal">
      <div class="fp-modal__content" style="width:480px; max-width:90vw; border-radius:8px; overflow:hidden;">
        <div class="fp-navigator__header">
          <div class="fp-navigator__title">Create New Map</div>
          <div style="flex:1;"></div>
          <button id="create-map-close" class="fp-navigator__close">×</button>
        </div>

        <div style="padding:24px; background:#fff;">
          <div class="fp-form-group" style="margin-bottom:16px;">
            <label style="display:block; font-size:12px; font-weight:600; color:var(--fp-text-muted); margin-bottom:6px;">Building</label>
            <div style="display:flex; gap:8px;">
              <select id="create-map-building-sel" class="fp-select" style="flex: 0 0 25%; padding:8px 6px; font-size:12px;">
                <option value="">+ New</option>
              </select>
              <input type="text" id="create-map-building-txt" placeholder="Building name" style="flex: 1 1 75%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px;">
            </div>
          </div>

          <div class="fp-form-group" style="margin-bottom:16px;">
            <label style="display:block; font-size:12px; font-weight:600; color:var(--fp-text-muted); margin-bottom:6px;">Floor</label>
            <div style="display:flex; gap:8px;">
              <select id="create-map-floor-sel" class="fp-select" style="flex: 0 0 25%; padding:8px 6px; font-size:12px;">
                <option value="">+ New</option>
              </select>
              <input type="text" id="create-map-floor-txt" placeholder="Floor name" style="flex: 1 1 75%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px;">
            </div>
          </div>

          <div class="fp-form-group" style="margin-bottom:16px;">
            <label style="display:block; font-size:12px; font-weight:600; color:var(--fp-text-muted); margin-bottom:6px;">Map / Room Name</label>
            <input type="text" id="create-map-room-txt" placeholder="e.g. Open Office A" style="width:100%; padding:9px 12px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; box-sizing:border-box;">
          </div>
          
          <div style="display:flex; gap:12px; margin-bottom:24px;">
            <div class="fp-form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; color:var(--fp-text-muted); margin-bottom:6px;">Width (px)</label>
              <input type="number" id="create-map-w" value="1200" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; box-sizing:border-box;">
            </div>
            <div class="fp-form-group" style="flex:1;">
              <label style="display:block; font-size:12px; font-weight:600; color:var(--fp-text-muted); margin-bottom:6px;">Height (px)</label>
              <input type="number" id="create-map-h" value="800" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; box-sizing:border-box;">
            </div>
          </div>

          <div style="display:flex; gap:12px; margin-top:24px;">
            <button class="fp-btn fp-btn--outline" id="btn-cancel-create" style="flex:1; padding:9px 16px; font-size:13px; font-weight:600;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Cancel
            </button>
            <button class="fp-btn fp-btn--primary" id="btn-submit-create" style="flex:1; padding:9px 16px; font-size:13px; font-weight:600;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Create
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Properties Modal (Jira-style edit) ─────────────────────────── -->
    <div id="fp-properties-modal" class="fp-modal">
      <div class="fp-modal__content" style="width: 360px; padding: 0; overflow: hidden; border-radius: 8px;">
        <div class="fp-navigator__header">
          <button class="fp-navigator__close" id="prop-close-header-btn" style="margin-right:12px; display:flex; align-items:center; justify-content:center; padding:4px;" title="Back">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <div class="fp-navigator__title">Edit Properties</div>
          <div style="flex:1;"></div>
        </div>
        <div style="padding: 24px;">
          <div class="fp-form-group" style="margin-bottom: 16px;">
            <label style="display:block; font-size:12px; font-weight:600; color:var(--fp-text-muted); margin-bottom:6px;">Name</label>
            <input type="text" id="prop-name-input" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; box-sizing:border-box;">
          </div>
          
          <div class="fp-form-group" id="prop-parent-group" style="margin-bottom: 24px;">
            <label style="display:block; font-size:12px; font-weight:600; color:var(--fp-text-muted); margin-bottom:6px;">Parent</label>
            <select id="prop-parent-select" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:13px; box-sizing:border-box; background:#fff;">
              <!-- Options dynamically populated -->
            </select>
          </div>
          
          <div style="display:flex; gap:10px; margin-top:20px; justify-content:flex-end;">
            <button class="fp-btn fp-btn--outline" id="btn-cancel-prop" style="padding:7px 14px; font-size:13px; font-weight:600;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              Cancel
            </button>
            <button class="fp-btn fp-btn--primary" id="btn-save-prop" style="padding:7px 14px; font-size:13px; font-weight:600;">
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Confirm Modal ───────────────────────────────────────── -->
    <div id="confirm-modal" class="fp-modal">
      <div class="fp-modal__content fp-confirm-dialog">
        <div class="fp-confirm-dialog__icon">⚠️</div>
        <div class="fp-confirm-dialog__title">Warning!</div>
        <div class="fp-confirm-dialog__message" id="confirm-modal-message">You are in edit mode. Do you want to discard your changes and continue?</div>
        <div class="fp-confirm-dialog__actions">
          <button class="fp-btn fp-btn--outline" id="confirm-modal-cancel">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Cancel
          </button>
          <button class="fp-btn fp-btn--primary" id="confirm-modal-ok">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Continue
          </button>
        </div>
      </div>
    </div>

    <!-- ── Tooltip ─────────────────────────────────────────────── -->
    <div id="asset-tooltip" class="fp-tooltip"></div>

    <!-- ── Notification ────────────────────────────────────────── -->
    <div id="notification" class="fp-notification"></div>

</div>



<?php
$js_path = __DIR__ . '/assets/map-bundle.js';
$js_v = file_exists($js_path) ? filemtime($js_path) : time();
?>
<script type="module" src="<?php echo $assets_dir; ?>/map-bundle.js?v=<?php echo $js_v; ?>"></script>

<?php
require_once('footer.php');
?>
