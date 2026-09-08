## 1. DOM and Styling (Single Right Dock & Clean Left Area)

- [ ] 1.1 Move `#furniture-catalog-panel`, `#wall-type-picker`, `#floor-color-picker`, and `#layers-body` into `.fp-explorer` in `index.html`.
- [ ] 1.2 Move `#furniture-catalog-panel`, `#wall-type-picker`, `#floor-color-picker`, and `#layers-body` into `.fp-explorer` in `ms_floorplan.php`.
- [ ] 1.3 Remove `.fp-left-sidebar` CSS container styles and left slide-in rules in `style.css` so the left side remains 100% clean and unobstructed.
- [ ] 1.4 Update CSS in `style.css` to style `.fp-explorer__header` as a floating card component with top margin gap and rounded corners.
- [ ] 1.5 Add CSS rules in `style.css` to hide `#properties-panel` cleanly when no item is selected (`display: none`), allowing the active list to take 100% height, and setting a compact bottom gap when visible.

## 2. JavaScript Logic (Toolbar Sub-View Switching & Inspectors)

- [ ] 2.1 Update `toolbar.js` and `explorer.js` to switch the active sub-view inside `.fp-explorer` based on the active Toolbar tool (Layers/Select, Walls, Floors, Furniture, IT Assets).
- [ ] 2.2 Update `explorer.js` to add an "edit" (pencil) button for Furniture items in the Layers list.
- [ ] 2.3 Wire the edit button to invoke `showLayoutConfigModal(node)` for furniture layout configuration.
- [ ] 2.4 Update `explorer.js` host item renderer to replace colored status dots with a computer SVG icon.
- [ ] 2.5 Update selection handlers in `explorer.js` and `map-navigator.js` to dynamically toggle `#properties-panel` visibility and compact gap when selecting/clearing nodes.

