import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  base: './',
  // inline เพื่อกัน Vite ไต่ขึ้นไปเจอ postcss.config ของโปรเจ็คแม่ (ShopDash)
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      '@himmapan/data': r('../data/src/index.ts'),
      '@himmapan/sim': r('../sim/src/index.ts'),
    },
  },
  server: { host: true, port: 5173 },
  build: { outDir: 'dist', target: 'es2022', sourcemap: true },
});
