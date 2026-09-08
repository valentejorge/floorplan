# Workspace Rules

- **Language Constraint:** All user interface text, code, documentation, and commit messages MUST be written in English. This is an OCS Inventory plugin, and future multi-language support will be based on an English foundation. Do not program or write UI strings in Portuguese or any other language.
- **Frontend Architecture:** The frontend is organized as modular ES modules in `frontend/src/`. Do NOT re-introduce monolithic scripts or mutate global `window.*` properties. Use `event-bus.js` for decoupled module communication.
- **Canvas Library:** Use **Fabric.js** for all HTML5 Canvas rendering logic (do NOT import or reference Konva.js).
- **Build & Deployment:** Verify frontend changes by running `npm run build` in `frontend/` and deploying to Docker via `./deploy-local.sh`.

