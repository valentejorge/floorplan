## 1. UI Structure & Styling

- [x] 1.1 In `index.html`, rename the "Object Explorer" panel header to "Hosts". Verify visually in the browser.
- [x] 1.2 In `index.html`, update `#explorer-panel` structure to include `#host-details-pane` below `#explorer-body`. Add the HTML template for host details (Hostname, Description, User, "View in OCS Inventory" button). Set its default style to `display: none;` or use a hidden class. Verify the structure is correct in browser dev tools.
- [x] 1.3 In `style.css`, apply Flexbox to `#explorer-panel` to ensure the split pane works (e.g., `display: flex; flex-direction: column; height: 100%;`). Set `#explorer-body` to `flex: 1; overflow-y: auto;` and `#host-details-pane` to `flex-shrink: 0; flex-basis: 33%; overflow-y: auto;`. Add a top border to `#host-details-pane`. Verify the layout proportions in the browser.

## 2. Interactive Behavior

- [x] 2.1 In `explorer.js` (or relevant JS file), update the list item click handler to visually select the item in the list and display `#host-details-pane` (`display: flex` or block), populating its HTML elements with the clicked asset's data. Verify by clicking an item in the list and seeing the details pane appear with correct data.
- [x] 2.2 In `explorer.js`, update the list item click handler to ALSO trigger the canvas selection (e.g. `fp.selectNode(id)` or similar Konva logic). Verify that clicking the list highlights the object on the map.
- [x] 2.3 In `main.js` (or where the canvas events are handled), listen for canvas selection events (when a node is clicked on the map). When this happens, automatically trigger the list selection logic so that the item is scrolled into view, highlighted in the list, and the details pane opens. Verify by clicking an asset on the map and seeing the list and details update automatically.
- [x] 2.4 In `explorer.js`, implement the click handler for the "View in OCS Inventory" button to open a new tab (`window.open`) using the OCS URL format with the asset's system ID. Verify by clicking the button and checking the URL of the new tab.
