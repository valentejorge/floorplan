## Why

When the user enters "Edit Map" mode, they need a comprehensive view of all elements on the canvas (Walls, Floors, Furniture) grouped logically, much like the Layers panel in Figma or Canva. This allows them to quickly find, lock, hide, or edit specific objects.

Currently, the right-side panel statically displays the "IT Hosts" list regardless of mode, and the Layers list is rendered inside the left sidebar. We will move the Layers list to the right panel in Edit Mode to act as the primary structural navigator, replacing the Hosts list. 

## What Changes

- **Preserved Animations**: The smooth `transform: translateX` slide-in animations for the UI panels will remain untouched.
- **Dual-Purpose Right Panel**: 
  - **View Mode**: The right panel remains the "IT Explorer" (Hosts list + IT Details).
  - **Edit Mode**: The right panel transforms into the "Layers Tree" (Scene Graph).
- **DOM Restructuring**: The `#layers-body` HTML container will be moved from `.fp-left-sidebar` to the right `.fp-explorer` panel. CSS will toggle its visibility with `#explorer-body` based on `.is-editing`.
- **Quick Edit Action**: A pencil icon will be added to Furniture nodes in the Layers list to instantly open the Layout Configuration modal for host assignment.
- **Floating Card Header System**: Refactor panel headers (`.fp-explorer__header`) into reusable floating card components with rounded corners and a top gap from the panel rim.
- **Dynamic Details Panel**: Hide `#properties-panel` completely when no host or element is selected, expanding list viewport area.
- **Computer SVG Host Icons**: Replace artificial online status dots on host items with clean computer SVG icons aligned with OCS inventory design.

## Capabilities

### Modified Capabilities
- `ui/explorer-panel`: The right side panel, which switches content contextually between Hosts Explorer (View Mode) and Layers Tree (Edit Mode), features floating card headers, dynamic properties panel visibility, and SVG host icons.

## Impact

- **Affected Code**: `explorer.js` (rendering layers, host icons, and conditional details panel), `style.css` (floating card header styling and visibility toggles), `index.html` and `ms_floorplan.php` (DOM layout updates).
