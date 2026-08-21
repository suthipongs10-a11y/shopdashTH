// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { reviews } from './src/data/reviews';

/** หน้า /reviews/ ยังว่าง = เป็น thin page อย่าเพิ่งส่งเข้า sitemap */
const hasReviews = reviews.length > 0;

/** ลำดับความสำคัญใน sitemap — money page (หน้าอำเภอ) สำคัญที่สุดรองจากหน้าแรก */
function priorityFor(url) {
  const path = new URL(url).pathname;
  if (path === '/') return 1.0;
  if (path === '/blog/') return 0.6;
  if (path.startsWith('/blog/')) return 0.7;
  if (path === '/about/' || path === '/contact/') return 0.5;
  if (/^\/[^/]+\/[^/]+\/[^/]+\/$/.test(path)) return 0.9; // /บริการ/จังหวัด/อำเภอ/ = money page
  if (/^\/[^/]+\/[^/]+\/$/.test(path)) return 0.8; // /บริการ/จังหวัด/
  return 0.8;
}

// hachangdd.com — static site, no SSR adapter (Cloudflare Pages serves ./dist)
export default defineConfig({
  site: 'https://hachangdd.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => (hasReviews ? true : !page.includes('/reviews/')),
      serialize: (item) => ({ ...item, priority: priorityFor(item.url) }),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    css: {
      // โปรเจกต์นี้ใช้ Tailwind ผ่าน Vite plugin ไม่ผ่าน PostCSS
      // ตั้งค่าเป็น inline config เพื่อไม่ให้ Vite ไปหยิบ postcss.config ของโปรเจกต์แม่ใน repo
      postcss: {},
    },
  },
});
