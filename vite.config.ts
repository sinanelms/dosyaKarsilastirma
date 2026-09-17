/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  server: {
    port: 3000,
    host: '127.0.0.1',
    strictPort: true,
    // Rust tarafını Tauri CLI izler; Vite'ın `src-tauri/target` altındaki kilitli .exe/.dll
    // dosyalarını izlemeye çalışması Windows'ta EBUSY hatasıyla dev sunucusunu çökertir.
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  clearScreen: false,
  // Yardım penceresindeki sürüm numarası package.json'dan gelir (elle yazılan sabit eskide kalıyordu).
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
