// ธีม 11 — "วันเพจ" (tier 1) — หน้าเดียวจบสำหรับแพลนเริ่มต้น ฿990
// แคตตาล็อกเต็ม + การ์ดติดต่อร้าน อยู่บนหน้าแรกทั้งหมด (ระบบขาย/ตะกร้า/ชำระเงินยังครบ)

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'one-01',
  nameTh: 'วันเพจ',
  tier: 1,
  tokens: {
    '--color-primary': '#0f766e',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f0fdfa',
    '--color-bg': '#ffffff',
    '--color-surface': '#f8fafc',
    '--color-text': '#1e293b',
    '--color-text-muted': '#64748b',
    '--color-accent': '#0d9488',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Prompt',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '6px',
    '--radius-md': '10px',
    '--radius-lg': '16px',
    '--space-unit': '4px',
    '--shadow-card': '0 1px 3px rgb(0 0 0 / 0.08)',
    '--container-max': '1100px',
  },
  variants: {
    productCard: 'bordered',
    hero: 'boxed',
    categoryNav: 'pills',
  },
  featureDefaults: {
    wishlist: false,
    related_products: false,
  },
  sections: ['hero', 'categories', 'catalog', 'contact', 'footer'],
};
