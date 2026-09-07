## 1. Cleanup and Mock Setup

- [x] 1.1 Remove `isoMath.js` and `theme.js` completely, verifying no orphaned imports remain in the codebase.
- [x] 1.2 ~~Refactor `api.js` to intercept calls~~ (PIVOT): Create `deploy-local.sh` and revert `api.js` to use the live OCS Docker backend without mocks.
- [x] 1.3 Clean up `style.css` and `index.html` to remove all Cyberpunk/Pixel theming logic, establishing a clean white/gray minimalist palette and verifying the UI shell looks like the Canva/Visio mockup.

## 2. PixiJS Integration

- [x] 2.1 Replace KonvaJS dependency with `pixi.js` and `@pixi/filter-drop-shadow` in `package.json`, verifying installation succeeds (`npm install`).
- [x] 2.2 Rewrite `engine.js` to initialize a `PIXI.Application` with a 2D Orthogonal camera, grid, and panning/zooming logic, verifying the canvas renders a base grid without errors.
- [x] 2.3 Implement the `DropShadowFilter` utility that accepts a `z` (height) value and returns a configured filter, verifying it compiles and is ready for use in the renderer.

## 3. Rendering Pipeline

- [x] 3.1 Rewrite `renderer.js` to draw floors, walls, and doors using `PIXI.Graphics` instead of Konva shapes, verifying the base architecture renders correctly.
- [x] 3.2 Implement PixiJS sprite/graphics rendering for furniture and IT assets in `furniture.js`, applying the drop shadow filter dynamically based on their height, verifying they render with the 3D depth illusion.
- [ ] 3.3 Re-implement the editing tools (drag and drop, magnet snapping) to work with PixiJS interactive events, verifying the user can still place and move assets in the new engine.
