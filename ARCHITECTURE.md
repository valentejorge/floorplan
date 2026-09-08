# floorplan - Architecture and Guidelines

## 1. Overview

OCS Inventory plugin that adds an interactive spatial visualization layer (floor plans) utilizing JSON data structures and HTML5 Canvas rendering.

## Core Architecture Rules

1. **Language:** All code, user interface text, variables, comments, commit messages, and documentation MUST be written in English. This ensures future compatibility with OCS Inventory's multi-language translation dictionaries.
2. **Frameworks:** Vanilla JS (Frontend) + PHP (Backend).
3. **Canvas:** Fabric.js for rendering the 2D floorplan.
4. **Integration:** Plugs directly into OCS Inventory as a standard extension.

## 2. Visual Identity (Native OCS Integration)

The plugin **MUST NOT** look like a third-party external application. It must behave and feel like a native OCS Inventory module.

The GUI (modals, panels, and canvas) must use native OCS color palettes, fonts, and CSS classes (Bootstrap). The Canvas must inherit the user's active theme (supporting standard Light mode and adapting seamlessly if Dark mode is enabled in OCS), ensuring smooth adoption without visual friction.

## 3. Development Methodology (Tactical Decoupling / F1 Method)

We adopt a strict separation during development:

*   **Track 1 (Frontend):** Isolated development using Vite. The OCS API is mocked via static JSON files in `public/` and a fetch wrapper intercepting local requests, enabling millisecond UI iteration without backend dependencies. Vite serves purely as a bundler to generate the final distribution asset.
*   **Track 2 (Backend):** Test-Driven Development (TDD). All PHP and SQL logic must be validated by unit tests via PHPUnit, using an in-memory SQLite database to emulate MariaDB and native OCS tables before writing production queries.

## 4. Plugin Directory Structure (OCS Standard)

The final distribution package follows this structure:

```
/
├── setup.php                   # Plugin registration, versioning, and menu injection
├── install.sql                 # Table definitions (plugin_maps, plugin_map_assets, plugin_map_revisions)
├── uninstall.sql               # Cleanup queries
├── /require/MapEngine.php      # Business logic and PDO queries
├── /ajax/                      # Internal API endpoints (get_map.php, batch_update_assets.php, etc.)
├── /frontend/                  # Vite-powered frontend source
│   ├── index.html              # Main HTML entrypoint (development / standalone)
│   └── /src/                   # Modular ES source files
│       ├── main.js             # Entrypoint orchestrator
│       ├── event-bus.js        # Decoupled pub/sub event bus
│       ├── map-navigator.js    # Canvas viewport, pan/zoom & Fabric.js interaction
│       ├── furniture-catalog.js# Furniture catalog & drag-and-drop
│       ├── edit-mode.js        # Canvas edit mode state management
│       ├── view-filters.js     # Map layer visibility controls
│       ├── toolbar.js          # Main toolbar UI logic
│       ├── search.js           # Asset search & canvas focus
│       ├── explorer.js         # Unified Explorer tree & inspector logic
│       ├── create-map.js       # Map creation modal & wizard
│       ├── modal.js            # Modal dialog utilities
│       ├── notify.js           # Toast notifications
│       └── api.js              # Intercepted fetch API wrapper
└── /assets/
    ├── /css/floorplan.css      # Custom styling complementing native OCS CSS
    └── /js/map-bundle.js       # Compiled Vite bundle (Fabric.js)
```

## 5. Frontend Golden Rules (Fabric.js & Modular ES Architecture)

1. **Modular Architecture:** Keep modules focused and single-purpose. Communicate between UI components and canvas engines via the central `event-bus.js` (`eventBus.on()`, `eventBus.emit()`) rather than attaching transient state to global `window.*` variables.
2. **Layer Isolation:** Maintain separate logical groups for static elements (walls/doors), inventory assets (PCs, printers), and interactive overlays.
3. **Performance Target (60 FPS):** Visual updates occur in browser local memory instantaneously using Fabric.js.
4. **Snap to Grid & Explicit Saving (Batch Save):** Drag-and-drop actions snap to a grid (e.g., 20px). To preserve inventory integrity and prevent accidental changes, there is NO autosave. The canvas features an "Edit Mode" enabling draggability. Position updates remain in local Canvas state until the user clicks "Save", triggering a single batch payload to the API.
5. **Grouping & Object Positioning:** Nested elements (e.g., a PC on top of a desk) inherit relative positioning using native Fabric.js object grouping and hierarchy.

## 6. Auditing & Versioning (Time Travel)

To maintain compliance and traceability across IT operations, the system preserves an immutable change history for floor plans.

*   **Table `plugin_map_revisions`:** Defined in `install.sql`, containing `id` (PK), `map_id` (FK), `user_id` (VARCHAR, logged-in OCS user), `created_at` (DATETIME), and `map_snapshot` (JSON).
*   **Snapshot Trigger:** Whenever the batch save endpoint commits asset changes, it captures the updated map state and creates a new entry in the revisions table.

