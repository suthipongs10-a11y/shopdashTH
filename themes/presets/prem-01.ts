// ธีม 9/10 — "ซิกเนเจอร์" (tier 3 Premium) — §4.5
// ทุก section ครบ + ร้านแก้ token หลักเองได้จากหน้า "ปรับแต่งธีม" (§4.6)

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'prem-01',
  nameTh: 'ซิกเนเจอร์',
  tier: 3,
  customizable: true,
  tokens: {
    '--color-primary': '#3730a3',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#e0e7ff',
    '--color-bg': '#ffffff',
    '--color-surface': '#eef2ff',
    '--color-text': '#1e1b4b',
    '--color-text-muted': '#6b7280',
    '--color-accent': '#f59e0b',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Prompt',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '6px',
    '--radius-md': '12px',
    '--radius-lg': '20px',
    '--space-unit': '4px',
    '--shadow-card': '0 2px 8px rgba(30, 27, 75, 0.08)',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'bordered',
    hero: 'split',
    categoryNav: 'pills',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  sections: ['announcement', 'hero', 'featured', 'categories', 'grid', 'footer'],
};
