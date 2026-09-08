## 1. DOM and Styling

- [ ] 1.1 Move `#layers-body` from `.fp-left-sidebar` to `.fp-explorer` in `index.html`.
- [ ] 1.2 Move `#layers-body` from `.fp-left-sidebar` to `.fp-explorer` in `ms_floorplan.php`.
- [ ] 1.3 Add CSS in `style.css` to toggle visibility of `#explorer-body` and `#layers-body` based on `.fp-layout.is-editing`.
- [ ] 1.4 Update CSS in `style.css` to style `.fp-explorer__header` as a floating card component with top margin gap and rounded corners.
- [ ] 1.5 Add CSS classes/rules in `style.css` for hiding `#properties-panel` cleanly when no item is selected.

## 2. JavaScript Logic

- [ ] 2.1 Update `explorer.js` to add an "edit" (pencil) button to the actions div for Furniture items in the Layers list.
- [ ] 2.2 Wire the edit button to invoke `showLayoutConfigModal(node)` and ensure it triggers the modal correctly.
- [ ] 2.3 Update `explorer.js` host item renderer to replace green/colored status dots with a computer SVG icon.
- [ ] 2.4 Update `explorer.js` selection handlers to dynamically toggle `#properties-panel` visibility when selecting/clearing nodes.
