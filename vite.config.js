import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 构建产物输出到 dist/，由零依赖的 server.js 单端口托管（同时提供 /api）
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8765',
      '/uploads': 'http://127.0.0.1:8765'
    }
  }
});
