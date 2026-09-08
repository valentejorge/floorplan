## Why

When the user enters "Edit Map" mode, having sidebars pop up on both the left and right sides squeezes the canvas and clutters the workspace. To maximize canvas visibility and create a clean, Figma/CAD-style editing experience, the entire left side will remain 100% free and uncluttered. 

Instead of a left sidebar, all secondary views (Wall Styles, Floor Styles, Furniture Catalog, Unmapped IT Assets, and the Layers Tree) will dock into a **Single Right Inspector Panel** (`.fp-explorer`). The bottom floating Toolbar serves as the master controller, dynamically swapping the active sub-view in the right dock based on the active tool.

## What Changes

- **Clean Canvas Area**: Eliminate the `.fp-left-sidebar` to keep the left side completely unobstructed.
- **Single Right Docking Area (`.fp-explorer`)**:
  - **View Mode**: Displays the "IT Hosts" list.
  - **Edit Mode**: Dynamically displays the active tool view driven by the bottom Toolbar:
    - *Select Tool / Default*: Layers Tree (Scene Graph with quick edit action for furniture).
    - *Walls Tool*: Wall Styles picker (Exterior, Interior, Glass).
    - *Floors Tool*: Floor Styles picker.
    - *Furniture Tool*: Furniture Catalog & Drag-and-Drop.
    - *Unmapped Assets Tool*: Unmapped IT Assets list.
- **Floating Card Header System**: Standardize panel headers inside `.fp-explorer` with a top gap margin and rounded corners for a modern, elevated UI.
- **Compact & Dynamic Details Panel**: Hide `#properties-panel` completely (`display: none`) when no item is selected, giving 100% vertical space to the active list. When an item is selected, display `#properties-panel` below with a tight, well-proportioned gap.
- **Computer SVG Host Icons**: Replace misleading online status dots on host items with clean computer SVG icons matching OCS Inventory design standards.

## Capabilities

### Modified Capabilities
- `ui/explorer-panel`: The right side panel functions as a unified right dock housing all catalogs, layer trees, and host inspectors, dynamically driven by the bottom floating toolbar.

## Impact

- **Affected Code**: `index.html` & `ms_floorplan.php` (moving all catalog/picker panels into `.fp-explorer`), `style.css` (single right dock styling, removing left sidebar styles, dynamic `#properties-panel` visibility), `toolbar.js` & `explorer.js` (wiring toolbar buttons to activate sub-views in `.fp-explorer`).

