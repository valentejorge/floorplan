# floorplan - Architecture and Guidelines

## 1. Overview

OCS Inventory plugin that adds an interactive spatial visualization layer (floor plans) utilizing JSON data structures and HTML5 Canvas rendering.

## 2. Visual Identity (Native OCS Integration)

The plugin **MUST NOT** look like a third-party external application. It must behave and feel like a native OCS Inventory module.

The GUI (modals, panels, and canvas) must use native OCS color palettes, fonts, and CSS classes (Bootstrap). The Canvas must inherit the user's active theme (supporting standard Light mode and adapting seamlessly if Dark mode is enabled in OCS), ensuring smooth adoption without visual friction.

## 3. Development Methodology (Tactical Decoupling / F1 Method)

We adopt a strict separation during development:

*   **Track 1 (Frontend):** Isolated development using Vite. The OCS API is mocked via static JSON files in `public/` and a fetch wrapper intercepting local requests, enabling millisecond UI iteration without backend dependencies. Vite serves purely as a bundler to generate the final distribution asset.
*   **Track 2 (Backend):** Test-Driven Development (TDD). All PHP and SQL logic must be validated by unit tests via PHPUnit, using an in-memory SQLite database to emulate MariaDB and native OCS tables before writing production queries.

## 4. Plugin Directory Structure (OCS Standard)

The final distribution package must follow this tree:

```
/
├── setup.php                   # Plugin registration, versioning, and menu injection
├── install.sql                 # Table definitions (plugin_maps, plugin_map_assets, plugin_map_revisions)
├── uninstall.sql               # Cleanup queries
├── /require/MapEngine.php      # Business logic and PDO queries
├── /ajax/                      # Internal API endpoints (get_map.php, batch_update_assets.php, etc.)
└── /assets/
    ├── /css/floorplan.css      # Custom styling complementing native OCS CSS
    └── /js/map-bundle.js       # Compiled Vite bundle (Konva.js)
```

## 5. Frontend Golden Rules (Konva.js)

1.  **Layer Isolation:** Separate layers for static elements (walls/doors with `listening: false` for optimal performance), assets (PCs, printers), and overlays (tooltips, drag indicators).
2.  **Performance Target (60 FPS):** Visual updates occur in browser local memory instantaneously.
3.  **Snap to Grid & Explicit Saving (Batch Save):** Drag-and-drop actions snap to an invisible grid (e.g., 20px). To preserve inventory integrity and prevent accidental changes, there is NO autosave. The canvas features an "Edit Mode" enabling draggability. Position updates remain in local Canvas state until the user clicks "Save", triggering a single batch payload to the API.
4.  **Grouping:** Nested elements (e.g., a PC on top of a desk) inherit positioning via `Konva.Group`.

## 6. Auditing & Versioning (Time Travel)

To maintain compliance and traceability across IT operations, the system preserves an immutable change history for floor plans.

*   **Table `plugin_map_revisions`:** Defined in `install.sql`, containing `id` (PK), `map_id` (FK), `user_id` (VARCHAR, logged-in OCS user), `created_at` (DATETIME), and `map_snapshot` (JSON).
*   **Snapshot Trigger:** Whenever the batch save endpoint commits asset changes, it captures the updated map state and creates a new entry in the revisions table.
