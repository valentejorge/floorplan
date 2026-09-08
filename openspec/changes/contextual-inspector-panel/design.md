## Context

The user wants a Figma-like "Layers" tree on the right side of the screen during Edit Mode. Currently, the layers tree is rendered inside the left sidebar, while the right sidebar shows IT Hosts. 

## Goals / Non-Goals

**Goals:**
- Move `#layers-body` to the right sidebar (`.fp-explorer`).
- Toggle `#explorer-body` and `#layers-body` visibility using the `.is-editing` class on `#main-layout`.
- Add an edit action (pencil icon) to the layers list for furniture items.

## Decisions

### 1. Moving the Layers Container
**Decision:** We will physically move the `<div id="layers-body">` from `.fp-left-sidebar` to `.fp-explorer` in both `index.html` and `ms_floorplan.php`.
- **Rationale:** Prevents duplicate DOM IDs and places the layers list in the desired visual location without rewriting the JS rendering logic.

### 2. Visibility Toggles
**Decision:** Pure CSS toggling.
```css
.fp-layout.is-editing #explorer-body { display: none !important; }
.fp-layout.is-editing #layers-body { display: flex !important; }
.fp-layout:not(.is-editing) #layers-body { display: none !important; }
```
- **Rationale:** Fast and avoids manual JS toggling.

### 3. Edit Action
**Decision:** Update `explorer.js` where the Layers list is rendered to inject an edit button for furniture nodes, wired up to call `showLayoutConfigModal(node)`.

### 4. Floating Card Header Design Component
**Decision:** Standardize `.fp-explorer__header` with a top margin gap (`margin: 10px 10px 6px`), rounded corners (`border-radius: 8px`), subtle background, and padding (`8px 12px`).
- **Rationale:** Separates panel headers from the top container edge, creating a reusable floating header component for Hosts, Layers, and Details.

### 5. Dynamic Details Panel Visibility
**Decision:** Hide `#properties-panel` completely (`display: none` or `.is-hidden`) when no object or host is selected in the canvas or list.
- **Rationale:** Prevents empty placeholder clutter ("Details / No selection") and maximizes vertical viewport area for the primary list.

### 6. Computer SVG Host Icons
**Decision:** Replace colored status dots (`.fp-explorer__item-icon`) with a standard computer/monitor SVG icon.
- **Rationale:** OCS Inventory does not perform real-time machine pinging; status dots are misleading. An SVG computer icon reflects static system inventory data accurately.
