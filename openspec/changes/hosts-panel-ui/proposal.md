## Why

The current "Object Explorer" panel is generic and lacks a cohesive user experience for IT assets mapped from OCS Inventory. We need a polished "Hosts" view that uses a split-pane layout to simultaneously show the list of assets and the details of a selected asset without overlapping modals, keeping the user in context.

## What Changes

- Rename "Object Explorer" to "Hosts" in the UI.
- Implement a split-pane layout in the right sidebar when an asset is selected:
  - Top pane (approx 66% height): The scrollable list of hosts.
  - Bottom pane (approx 33% height): Details of the selected host.
- Interactive highlighting: Clicking an asset in the list selects it in the map, and clicking an asset on the map selects it in the list (opening the bottom details pane).
- Display Hostname, Description, User, and a "View in OCS Inventory" button inside the details pane.
- Remove the old separate `#properties-panel` behavior, integrating it directly into the bottom pane of this split view.

## Capabilities

### New Capabilities
- `hosts-panel`: Defines the behavior, interactions, and split-pane layout of the new Hosts Explorer panel.

### Modified Capabilities
*(None)*

## Impact

- `index.html`: Restructuring the `#explorer-panel` HTML to support a flexbox-based split pane layout.
- `style.css`: Adding CSS for the split-pane sizing (e.g., using `flex: 2` and `flex: 1`) and transition animations for opening/closing the details pane.
- `frontend/src/explorer.js` (and potentially `main.js`): Updating event listeners to sync selection between the list and the Konva canvas, and populating the new details pane.
