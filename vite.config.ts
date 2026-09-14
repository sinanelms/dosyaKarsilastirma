/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '127.0.0.1',
    strictPort: true,
  },
  clearScreen: false,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Worker'larda kullanılan paketler önceden optimize edilir; aksi hâlde `npm run dev` / `tauri dev`
  // sırasında ilk PDF/Excel işleminde Vite sayfayı yeniden yükler ve girilen veriler kaybolur.
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable', 'xlsx', '@tanstack/react-virtual', 'pdfjs-dist'],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
