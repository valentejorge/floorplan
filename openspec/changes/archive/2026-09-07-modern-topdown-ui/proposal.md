## Why

The frontend grew organically into a tangle of inline styles, duplicate code, and zero design system. Themes (Cyberpunk, Pixel, Blueprint) cluttered the CSS without improving usability. The isometric projection experiment was abandoned. KonvaJS is working well as the canvas engine and will be kept — it proved far more compatible with the OCS Inventory environment (Quirks Mode, no WebGL guarantees) than alternatives.

The focus of this change is: **make what we already have clean, consistent, and premium-looking.** That means a real design system enforced across the codebase, a production-first API layer with `deploy-local.sh` for fast iteration, and the visual quality of a Visio-style tool rather than a developer prototype.

## What Changes

- **DONE**: Remove `isoMath.js`, `theme.js`, and all isometric projection code.
- **DONE**: Remove Cyberpunk/Pixel/Blueprint CSS themes. Single minimalist palette (light mode, Visio-style).
- **DONE**: Clean `api.js` to production-only mode — calls live OCS PHP backend directly.
- **DONE**: Add `deploy-local.sh` — builds the frontend and pushes straight to the running Docker container in one command.
- **DONE**: Fix `vite.config.js` to exclude `public/ajax/` mock files from production builds.
- **DONE**: Consolidate all remaining inline styles in `index.html` and `explorer.js` into CSS variables from the design system.
- **DONE**: Refactor `explorer.js` and `properties panel` to be properly modular and read-only in View Mode.
- **DONE**: Apply realistic 45° top-left drop shadows per-sublayer (`tableNode`, `chairNode`, `deviceNode`) and architectural walls (`Konva.Line`), scaling with real-world height (`ASSET_HEIGHT_CM`) without `group.cache()` shadow clipping.

## Capabilities

### Modified Capabilities
- `design-system`: Single CSS variable system enforced across all components. No more one-off inline styles.
- `canvas-engine`: KonvaJS stays. Drop shadows applied per-asset based on Z height.
- `properties-panel`: Full refactor — only editable in Edit Mode, not in View Mode.

## Impact

- `frontend/src/style.css`: Design system tokens — single source of truth.
- `frontend/index.html`: Inline styles migrated to CSS classes.
- `frontend/src/explorer.js`: Modular, using design system only.
- `deploy-local.sh`: New helper for build + deploy cycle.
