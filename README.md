# floorplan — OCS Inventory Plugin

Native plugin for OCS Inventory that adds an interactive spatial visualization layer (floor plans) to map and manage physical IT infrastructure using HTML5 Canvas (Konva.js).

---

## 🚀 How to Run

Following the **F1 Method (Tactical Decoupling)**, development is split into two independent tracks. **You do not need OCS Inventory or Docker running to develop**.

---

### 🏎️ Track 1: Frontend (Vite + Konva.js)

UI iteration in milliseconds using Hot Module Replacement (HMR) and mock API responses via static JSON.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open the URL shown in your terminal (e.g., `http://localhost:5173`). Map and asset data will be loaded automatically from `public/ajax/get_map_1.json`.

---

### 🏎️ Track 2: Backend (TDD / PHPUnit)

Business logic and database operations validated by unit tests using in-memory SQLite.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the test suite:
   ```bash
   bash run-tests.sh
   ```
   > **Note:** The `run-tests.sh` script dynamically loads PHP SQLite modules in local environments without requiring global system installation. If `php-sqlite` is installed on your OS, you can run `php vendor/bin/phpunit` directly.

---

### 📦 Building for Production (OCS)

To compile the final frontend bundle for deployment within OCS Inventory:

```bash
cd frontend
npm run build
```

The output file will be generated at `backend/assets/js/map-bundle.js`.

---

## 🛠️ Architecture

To understand the project patterns, database schemas, Time Travel auditing, and Konva.js guidelines, refer to the source of truth: [ARCHITECTURE.md](file:///home/jorge/projects/floorplan/ARCHITECTURE.md).
