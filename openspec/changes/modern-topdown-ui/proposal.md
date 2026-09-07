## Why

The current frontend architecture became a mix of inline styles and duplicated code without a proper design system. The previous idea to use an isometric (2.5D) projection and dark-mode themes (Cyberpunk) was overly complex for a CAD tool and detracted from usability. 

We need to pivot to a **Modern Minimalist Top-Down** approach (Visio style), leveraging PixiJS to render crisp 2D maps with beautiful, dynamic drop shadows (`@pixi/filter-drop-shadow`) to create a premium 3D depth illusion. Furthermore, to accelerate UI development and testing, we need to completely decouple the frontend from the OCS Inventory backend by mocking the API layer. This allows rapid UI iteration without requiring constant Docker deployments.

## What Changes

- **BREAKING**: Remove all isometric projection logic (`isoMath.js`) and 2.5D asset constraints.
- **BREAKING**: Remove `theme.js` and all Cyberpunk/Pixel CSS theme definitions.
- **New Architecture**: 
  - Standardize `style.css` into a clean, minimalist design system (Figma/Canva style) using native CSS variables.
  - Implement PixiJS as the rendering engine for a top-down Orthogonal 2D view.
  - Apply `DropShadowFilter` in PixiJS based on the `z` (height) of assets to create depth.
- **Decoupling**: Implement an API Mocking layer in the frontend to serve static JSON (rooms, assets, layouts) so the frontend can run independently in a local Vite dev server without PHP/Docker.

## Capabilities

### New Capabilities
- `mock-api`: Local mocking layer for OCS endpoints to enable decoupled frontend development.
- `pixijs-renderer`: Top-down 2D rendering engine with dynamic drop shadows.

### Modified Capabilities

## Impact

- `frontend/src/isoMath.js` and `frontend/src/theme.js` will be deleted.
- `frontend/src/api.js` will be modified to intercept requests and return mock data when running in dev mode.
- `frontend/src/engine.js` and `frontend/src/renderer.js` will be entirely rewritten to use PixiJS instead of KonvaJS.
- `frontend/src/style.css` and `frontend/index.html` will be cleaned up to enforce the new minimalist design system.
