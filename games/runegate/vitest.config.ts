import { defineConfig } from 'vitest/config';

export default defineConfig({
  // ระบุ postcss แบบ inline เพื่อกัน Vite ไต่ขึ้นไปเจอ config ของโปรเจ็คแม่ (ShopDash)
  css: { postcss: { plugins: [] } },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    testTimeout: 60_000,
  },
});
