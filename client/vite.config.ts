import { defineConfig } from 'vite';

/**
 * Конфигурация Vite.
 *
 * В dev-режиме фронтенд работает на порту 5173, а все запросы к /api
 * проксируются на бэкенд (по умолчанию http://localhost:41321). Так на фронте
 * можно использовать относительные пути (/api/...), и они одинаково работают
 * и в разработке, и в проде (где бэкенд сам отдаёт собранную статику).
 */
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:41321',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
  css: {
    preprocessorOptions: {
      // Современный Sass API (@use/@forward) без legacy-предупреждений.
      scss: { api: 'modern' },
    },
  },
});
