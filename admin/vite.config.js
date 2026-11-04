import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const adminRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: adminRoot,
  plugins: [react(), tailwindcss()],
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: 'ES2022',
        useDefineForClassFields: true,
        jsx: 'automatic',
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/recharts/') || /\/node_modules\/(d3-|victory-vendor)/.test(id)) {
            return 'charts';
          }
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react';
          }
          if (id.includes('/node_modules/firebase/') || id.includes('/node_modules/@firebase/') || id.includes('/node_modules/@grpc/')) {
            return 'firebase';
          }
        },
      },
    },
  },
});
