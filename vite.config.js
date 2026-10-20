import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 构建产物输出到 site/，由零依赖的 server.js 单端口托管（同时提供 /api）
// 注意：不能叫 dist/ 或 build/ —— 发布工具会把这两个名字当“构建产物”排除掉，
// 导致线上只剩源码、加载不到 JS。
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'site',
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
