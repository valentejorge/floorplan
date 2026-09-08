## Context

The user wants a unified, clean editing workspace. Sliding sidebars out from both sides of the screen clutters the floorplan area. We are consolidating all side panels (Furniture Catalog, Wall/Floor Styles, Unmapped IT Assets, and the Layers Tree) into a **Single Right Inspector Dock** (`.fp-explorer`).

## Goals / Non-Goals

**Goals:**
- Eliminate `.fp-left-sidebar` to leave the left side 100% clean and dedicated to the canvas.
- Move all catalog and picker panels (`#furniture-catalog-panel`, `#wall-type-picker`, `#floor-color-picker`, `#layers-body`, `#assets-catalog-panel`) inside `.fp-explorer`.
- Dynamically toggle sub-view visibility inside `.fp-explorer` based on the active tool selected in the bottom Toolbar.
- Hide `#properties-panel` completely when no item is selected, giving 100% vertical space to the active view list.
- Position `#properties-panel` with a tight, well-proportioned gap when an item IS selected.
- Add an edit action (pencil icon) to the layers list for furniture items.

## Decisions

### 1. Single Right Docking Container
**Decision:** All secondary panels will be placed as sibling sub-views inside `.fp-explorer` in `index.html` and `ms_floorplan.php`.
- **Rationale:** Keeps the left side completely unobstructed, providing maximum canvas workspace and a predictable right-hand inspector interface.

### 2. Toolbar-Driven Sub-View Switching
**Decision:** Clicking a tool button on the bottom floating Toolbar triggers an event on `eventBus` (or direct view toggle) to activate the corresponding sub-view inside `.fp-explorer`:
- **Select / Default Mode**: Displays `#layers-body` (Scene Graph).
- **Walls Tool**: Displays `#wall-type-picker`.
- **Floors Tool**: Displays `#floor-color-picker`.
- **Furniture Tool**: Displays `#furniture-catalog-panel`.
- **Unmapped IT Assets Tool**: Displays `#assets-catalog-panel`.

### 3. Dynamic Details Panel Visibility & Compact Gap
**Decision:** Hide `#properties-panel` completely (`display: none` / `.is-hidden`) when no object or host is selected.
- **Rationale:** Eliminates placeholder clutter ("Details / No selection") and gives 100% of vertical height to the active tool view. When an item is selected, `#properties-panel` displays below with a tight gap.

### 4. Floating Card Header Design Component
**Decision:** Standardize `.fp-explorer__header` with a top margin gap (`margin: 10px 10px 6px`), rounded corners (`border-radius: 8px`), subtle background, and padding (`8px 12px`).

### 5. Computer SVG Host Icons
**Decision:** Replace status dots (`.fp-explorer__item-icon`) with a clean computer SVG icon for static system inventory representation.

