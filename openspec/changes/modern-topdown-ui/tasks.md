## 1. Already Done (committed)

- [x] 1.1 Remove `isoMath.js` and `theme.js` — no orphaned imports remain.
- [x] 1.2 Clean `api.js` to production-only mode — no mocks, calls live OCS backend.
- [x] 1.3 Remove Cyberpunk/Pixel/Blueprint themes from `style.css` and `index.html`. Minimalist palette active.
- [x] 1.4 Add `deploy-local.sh` — build + docker cp in one command. Fix vite.config.js to exclude public from builds.

## 2. Design System

- [x] 2.1 Audit `index.html` and list every `style="..."` inline attribute — verify at least 20 occurrences that need migration.
- [x] 2.2 Create `.fp-panel`, `.fp-label`, `.fp-badge`, `.fp-separator` CSS classes in `style.css` and verify each matches the existing visual appearance.
- [x] 2.3 Replace all inline color/layout styles in `index.html` with `.fp-*` classes, verifying zero `style="color:"`, `style="background:"` remain after the migration.

## 3. Canvas Drop Shadows

- [x] 3.1 Add `getShadowProps(z)` to `furniture.js` that returns Konva shadow config proportional to `z`, verifying with a unit-style console.assert check in dev.
- [x] 3.2 Apply `getShadowProps` in `buildFurnitureNode()` to all rendered Konva nodes, verifying that rack cabinets (z=96) visually have a noticeably larger shadow than desks (z=28) after a deploy + visual check.

## 4. Properties Panel & Explorer

- [ ] 4.1 Audit `explorer.js` for any remaining Konva API calls that use deprecated patterns (`.getAttr`, `.setAttr` on non-Konva nodes) — list them.
- [ ] 4.2 Ensure the Properties Panel only enables editing controls when `is-editing` class is active on `#main-layout`, verifying that in View Mode all inputs are read-only or hidden.
