import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

const root = import.meta.dirname;

export default defineConfig(({ command }) => ({
  build: {
    // Output compiled bundle directly to the extension dist folder
    outDir: resolve(root, '../dist/floorplan/ms_floorplan/assets'),
    emptyOutDir: false,
    // Never copy the public/ directory in production builds.
    // The public/ folder contains dev-only mock JSON files that
    // don't belong in the OCS Inventory dist.
    rollupOptions: {
      input: resolve(root, 'src/main.js'),
      output: {
        entryFileNames: 'map-bundle.js',
        assetFileNames: 'style.[ext]',
        // Inline everything into a single file for OCS deployment
        inlineDynamicImports: true,
      },
    },
  },
  // Serve public/ only in dev (Vite default). In build, exclude it.
  publicDir: command === 'serve' ? 'public' : false,
  server: {
    port: 5173,
    open: false,
  },
  plugins: [
    {
      name: 'mock-save-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/ajax/save_room.php' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
              try {
                const payload = JSON.parse(body);
                const filePath = resolve(root, 'public/ajax/mock_room_100.json');
                
                // Read current mock data
                const currentDataStr = fs.readFileSync(filePath, 'utf-8');
                const currentData = JSON.parse(currentDataStr);
                
                // Update the parts
                currentData.data.floor_zones = payload.floor_zones || [];
                currentData.data.walls = payload.walls || [];
                currentData.data.furniture = payload.furniture || [];
                currentData.data.assets = payload.assets || [];
                
                // Write back
                fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Saved to mock_room_100.json' }));
              } catch (e) {
                console.error(e);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, message: e.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ]
}));
