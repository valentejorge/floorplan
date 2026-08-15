import { defineConfig } from 'vite';
import { resolve } from 'path';

const root = import.meta.dirname;

export default defineConfig({
  build: {
    // Output compiled bundle to backend/assets/js/map-bundle.js
    outDir: resolve(root, '../backend/assets/js'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(root, 'src/main.js'),
      output: {
        entryFileNames: 'map-bundle.js',
        // Inline everything into a single file for OCS deployment
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
