// ธีม 5/10 — "เด็กเล่นสนุก" (tier 2 Pro) — §4.5
// สีสด font Mitr, badge "ใหม่/ขายดี" บน ProductCard

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'prof-02',
  nameTh: 'เด็กเล่นสนุก',
  tier: 2,
  tokens: {
    '--color-primary': '#f59e0b',
    '--color-primary-fg': '#421f04',
    '--color-secondary': '#dbeafe',
    '--color-bg': '#fffdf5',
    '--color-surface': '#fef3c7',
    '--color-text': '#37301f',
    '--color-text-muted': '#8a7f61',
    '--color-accent': '#3b82f6',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Mitr',
    '--font-body': 'Sarabun',
    '--text-scale': '1.05',
    '--radius-sm': '10px',
    '--radius-md': '16px',
    '--radius-lg': '24px',
    '--space-unit': '4px',
    '--shadow-card': '0 3px 10px rgba(245, 158, 11, 0.12)',
    '--container-max': '1100px',
  },
  variants: {
    productCard: 'bordered',
    hero: 'boxed',
    categoryNav: 'pills',
  },
  featureDefaults: {
    wishlist: false,
    related_products: true,
  },
  sections: ['announcement', 'hero', 'categories', 'featured', 'grid', 'footer'],
};
