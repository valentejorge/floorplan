## Context

See proposal.md - Why. The previous Object Explorer only showed a list and was not integrated tightly with the properties pane. We are moving to a split-pane layout to merge navigation and details, inspired by standard IDE panels.

## Goals / Non-Goals

**Goals:**
- Provide a smooth UX by keeping list and details visible simultaneously.
- Synchronize list selection and canvas selection dynamically.
- Support OCS Inventory integration via a direct deep-link button.

**Non-Goals:**
- Draggable splitters between panes (we will use fixed flex values for now: e.g., `flex: 2` for list, `flex: 1` for details).
- Making API calls directly to OCS from this panel (the deep link just opens a new tab using the OCS URL format).

## Decisions

- **Layout Structure**: We will use CSS Flexbox on `#explorer-panel` (or its wrapper). The list view `#explorer-body` will have `flex: 1` (with `overflow-y: auto`), while the details view `#host-details-pane` will be a flex container at the bottom with a defined height or `flex` ratio.
- **Details View Visibility**: We will hide the details view (e.g., `display: none`) when no asset is selected. When an asset is selected, it displays as `flex` at the bottom of the panel.
- **Event Synchronization**: 
  - On map click: The canvas selection logic will emit an event or call a function in `explorer.js` to highlight the corresponding `.fp-list-item` and populate the details pane.
  - On list click: The list item `click` event will call the canvas selection logic and also populate the details pane.
- **OCS Link Generation**: We will build the OCS URL dynamically based on the asset's system ID or hardware ID if available.

## Risks / Trade-offs

- [Risk] If the list is too long, the split pane might hide items.
  → Mitigation: The top pane (`fp-explorer__body`) will remain `overflow-y: auto` so users can scroll through the list even when the details pane is open.
