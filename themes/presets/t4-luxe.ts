// ธีม T4 "LUXÉ" — เดโม่แพลนพรีเมียม ฿15,900 (TEMPLATE_SPEC §3.4, ตาม ref: LUXÉ + BRAND.CO)
// เปลี่ยนบุคลิก: หัวเรื่อง serif (Cormorant Garamond + Noto Serif Thai), จังหวะหายใจ 96px,
// hero โทนเข้ม + ตัวขาว, การ์ดไม่มีดาว/badge (§5.6), footer ดำ

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 't4-luxe',
  nameTh: 'ลุกซ์ (Luxury)',
  tier: 3,
  tokens: {
    '--color-primary': '#141416', // ink เข้ม — hero/BrandStory/footer ดำใช้พื้นนี้
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f4f3f0', // USP strip พื้นเทาอ่อน + กล่องโค้ดลูกค้าใหม่
    '--color-bg': '#ffffff',
    '--color-surface': '#f7f7f7',
    '--color-text': '#141416',
    '--color-text-muted': '#6b6f76',
    '--color-accent': '#8b6f47', // ทองหม่น — จุดเน้นเล็กๆ แบบหรู
    '--color-danger': '#d6453d',
    '--color-success': '#1e9e57',
    '--font-heading': 'Noto Serif Thai', // resolve เป็น Cormorant Garamond (Latin) + Noto Serif Thai
    '--font-body': 'IBM Plex Sans Thai',
    '--text-scale': '1.05',
    '--radius-sm': '2px', // เหลี่ยมคม — บุคลิก luxury
    '--radius-md': '4px',
    '--radius-lg': '8px',
    '--space-unit': '4px',
    '--shadow-card': '0 1px 3px rgba(0,0,0,.06)',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'luxe',
    hero: 'luxe',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  // ref T4 ไล่บน→ล่าง: hero เข้ม → USP เทาอ่อน → ใหม่ล่าสุด → Lookbook/Brand Story
  // → ไฮไลต์ 4 ไอคอน → Size Guide/โค้ด/newsletter → payment+SSL → footer ดำ
  sections: ['hero', 'usp', 'featured', 'lookbookSplit', 'highlights', 'luxePerks', 'trustBar', 'footer'],
  layout: {
    footerVariant: 'dark',
    mobileDrawer: true, // DoD §6.5 — เมนูมือถือเป็น drawer
    logoWide: true, // โลโก้ตัวโปร่ง letter-spacing กว้าง (§3.4)
  },
};
