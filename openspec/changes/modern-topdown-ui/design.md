## Context

See proposal.md - Why. We need to decouple the frontend from OCS Inventory's PHP backend for rapid UI iteration, and rewrite the rendering engine using PixiJS to deliver a top-down Visio-style interface with rich drop shadows.

## Goals / Non-Goals

**Goals:**
- Completely replace KonvaJS with PixiJS.
- Achieve a 2D Orthogonal perspective that relies on dynamic WebGL drop shadows (`@pixi/filter-drop-shadow`) to create the illusion of 3D depth based on asset height.
- Mock all backend PHP calls so the frontend can be developed and served via Vite (`npm run dev`) with zero backend dependencies.
- Re-style the UI shell to be minimalist and standard, removing dark mode themes.

**Non-Goals:**
- Any form of isometric, 2.5D, or 3D rotation logic.
- Rewriting backend PHP logic (all mock endpoints must mirror existing payload structures).

## Decisions

**PixiJS over KonvaJS:** 
- *Rationale*: PixiJS offers a robust WebGL pipeline and built-in filter system (`pixi-filters`), which allows us to apply a high-quality drop shadow filter natively to our sprites, mimicking the provided reference image. Konva is fundamentally Canvas2D-first and struggles with complex multi-pass filters at 60fps.

**Drop Shadow Depth Calculation:**
- *Rationale*: We will use the `z` property (height) defined in `FURNITURE_SIZE` to calculate the `distance` and `blur` parameters of the `DropShadowFilter`. A rack cabinet (Z=96) will cast a long, blurry shadow, while a small desk (Z=28) will cast a tight, sharp shadow. 

**Vite Proxy / MSW for API Mocking:**
- *Rationale*: We will intercept `fetch` calls in `api.js` when `NODE_ENV !== 'production'` (or via a URL flag) and return hardcoded JSON objects that mimic `get_unmapped_assets.php`, `get_map.php`, etc. This avoids setting up a complex local PHP/Docker environment just to iterate on the UI.

## Risks / Trade-offs

- [Risk] PixiJS DropShadowFilter can be expensive if applied to hundreds of objects individually.
  - *Mitigation*: If performance dips, we will group static elements (like desks) into a single PixiJS Container and apply the filter to the container, or bake the shadows into the static textures where dynamic depth isn't strictly necessary.
