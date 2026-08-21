// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// hachangdd.com — static site, no SSR adapter (Cloudflare Pages serves ./dist)
export default defineConfig({
  site: 'https://hachangdd.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
    css: {
      // โปรเจกต์นี้ใช้ Tailwind ผ่าน Vite plugin ไม่ผ่าน PostCSS
      // ตั้งค่าเป็น inline config เพื่อไม่ให้ Vite ไปหยิบ postcss.config ของโปรเจกต์แม่ใน repo
      postcss: {},
    },
  },
});
