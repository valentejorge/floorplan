## Context

See proposal.md — Why. KonvaJS stays as the canvas engine. PixiJS was trialled and abandoned due to hard incompatibilities with OCS Inventory's Quirks Mode HTML environment (no DOCTYPE, no guaranteed WebGL, jQuery conflicts). KonvaJS is Canvas2D-based and works reliably in this context.

The deploy workflow is now: edit → `./deploy-local.sh` → refresh browser. No Docker rebuilds needed.

## Goals / Non-Goals

**Goals:**
- Enforce a single CSS variable design system across all UI components. No inline styles in production code.
- Apply Konva drop shadows per-asset using the `z` (height) property from `FURNITURE_SIZE` to create visual depth.
- Refactor the Properties Panel to only be interactive in Edit Mode.
- Make `explorer.js` and the Object Explorer panel fully modular and design-system-native.

**Non-Goals:**
- Switching canvas engine (KonvaJS is final).
- Isometric projection (abandoned, removed).
- Dark mode / theme switching (single minimalist palette only).
- Mocking the backend (we use the live Docker OCS container for all testing).

## Decisions

**KonvaJS over PixiJS (final):**
- *Rationale*: PixiJS v8 requires WebGL. OCS Inventory renders in Quirks Mode (no DOCTYPE) and the WebGL context was lost in every test. KonvaJS uses Canvas2D which works reliably in all browser environments.

**Drop shadows via Konva (top-left 45° directional lighting):**
- *Rationale*: Native Konva shadow properties (`shadowColor`, `shadowBlur`, `shadowOffsetX`, `shadowOffsetY`, `shadowOpacity`) are applied per sub-node layer (`tableNode`, `chairNode`, `deviceNode`) in `renderAssetContent()` and on architectural wall lines (`Konva.Line`). Offsets scale with real asset height (`ASSET_HEIGHT_CM`), casting realistic 45° top-left shadows (`shadowOffsetX: 4..22px`, `shadowOffsetY: 6..30px`, `shadowBlur: 8..30px`, `shadowOpacity: 18%..40%`). `group.cache()` is omitted on furniture nodes to prevent offscreen canvas bounding box shadow clipping.

**`deploy-local.sh` as the dev loop:**
- *Rationale*: `npm run build && docker cp dist/floorplan/. container:/extensions/floorplan/` is the fastest and most reliable way to test changes in the real OCS environment without mocks or a proxy server.

**Single minimalist palette (no themes):**
- *Rationale*: Theme switching added complexity with zero user value. A single clean light palette (white sidebars, light gray canvas) is easier to maintain and aligns with the Visio-style product direction.

## Risks / Trade-offs

- [Risk] Konva canvas might have performance limits with many assets (hundreds of Konva nodes).
  - *Mitigation*: Use `perfectDrawEnabled: false` and `listening: false` on static geometry layers. Group non-interactive elements. This was already done in the previous version.

- [Risk] Inline styles in `index.html` are hard to maintain and grow over time.
  - *Mitigation*: This change explicitly removes them, migrating to `.fp-*` CSS classes as part of the design system task.
