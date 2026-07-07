// ธีม 4/10 — "บูติกอบอุ่น" (tier 2 Pro) — §4.5
// hero boxed, มี AnnouncementBar + related products

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'prof-01',
  nameTh: 'บูติกอบอุ่น',
  tier: 2,
  tokens: {
    '--color-primary': '#9a5b3c',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f5ebe0',
    '--color-bg': '#fdfaf6',
    '--color-surface': '#f5ebe0',
    '--color-text': '#3f2f26',
    '--color-text-muted': '#8f7a6b',
    '--color-accent': '#c98a5e',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Prompt',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '6px',
    '--radius-md': '10px',
    '--radius-lg': '18px',
    '--space-unit': '4px',
    '--shadow-card': '0 1px 4px rgba(63, 47, 38, 0.08)',
    '--container-max': '1100px',
  },
  variants: {
    productCard: 'bordered',
    hero: 'boxed',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: false,
    related_products: true,
  },
  sections: ['announcement', 'hero', 'featured', 'categories', 'grid', 'footer'],
};
