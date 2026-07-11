// ธีม T1 "SIMPLE" — เดโม่แพลนเริ่มต้น ฿990 (TEMPLATE_SPEC §3.1, ตาม ref: SIMPLE WEAR)
// เว็บแนะนำสินค้า ขายผ่านแชท: ปุ่ม LINE/Facebook ใน header + แถบ CTA คู่ + ฟีเจอร์ Level 1
// โหมดการ์ด "ดูรายละเอียด"/"สั่งซื้อ" ตัดสินด้วย flag online_ordering ไม่ใช่ตัวธีม (§3.1)

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 't1-simple',
  nameTh: 'ซิมเปิล (แนะนำสินค้า)',
  tier: 1,
  tokens: {
    '--color-primary': '#111214',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f0eae2', // แผง hero + แถบ featureList พื้นเบจอุ่น (ref)
    '--color-bg': '#ffffff',
    '--color-surface': '#f7f7f7',
    '--color-text': '#111214',
    '--color-text-muted': '#6b6f76',
    '--color-accent': '#111214',
    '--color-danger': '#d6453d',
    '--color-success': '#1e9e57',
    '--font-heading': 'IBM Plex Sans Thai',
    '--font-body': 'IBM Plex Sans Thai',
    '--text-scale': '1',
    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '12px',
    '--space-unit': '4px',
    '--shadow-card': '0 1px 3px rgba(0,0,0,.06)',
    '--container-max': '1100px', // ref แคบกว่า T2 — เว็บเล็ก อ่านง่าย
  },
  variants: {
    productCard: 'simple',
    hero: 'split-panel',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: false,
    related_products: false,
  },
  // announcement ไม่อยู่ในนี้ — โหมด headerContactButtons วาดแถบประกาศดำเหนือ header ใน layout
  sections: ['hero', 'featured', 'contactCta', 'featureList', 'footer'],
  layout: {
    headerContactButtons: true,
    footerVariant: 'simple',
  },
};
