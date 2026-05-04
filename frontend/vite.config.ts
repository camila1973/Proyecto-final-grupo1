/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

// https://vite.dev/config/
export default defineConfig({
  root: __dirname,
  base: process.env.VITE_BASE_URL ?? '/',
  cacheDir: '../node_modules/.vite/frontend',

  server: {
    port: 4200,
    host: 'localhost',
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
        secure: true,
      },
    },
  },

  preview: {
    port: 4300,
    host: 'localhost',
  },

  plugins: [tailwindcss(), react(), nxViteTsPaths()],

  build: {
    outDir: '../dist/frontend',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
});
