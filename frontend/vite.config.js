import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Gera o bundle final para ser copiado em /assets/js/map-bundle.js
    outDir: resolve(__dirname, '../backend/assets/js'),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.js'),
      output: {
        entryFileNames: 'map-bundle.js',
        // Inline tudo em um único arquivo para simplificar deploy no OCS
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
