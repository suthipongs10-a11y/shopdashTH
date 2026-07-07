// ธีม 7/10 — "แกลเลอรีหรู" (tier 3 Premium) — §4.5
// sidebar nav (desktop), wishlist + related, text-scale 1.05

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'pro-01',
  nameTh: 'แกลเลอรีหรู',
  tier: 3,
  tokens: {
    '--color-primary': '#1a3c34',
    '--color-primary-fg': '#f4f1ea',
    '--color-secondary': '#e8e4d9',
    '--color-bg': '#f9f7f2',
    '--color-surface': '#efece3',
    '--color-text': '#22302c',
    '--color-text-muted': '#71807a',
    '--color-accent': '#a8894e',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Bai Jamjuree',
    '--font-body': 'Sarabun',
    '--text-scale': '1.05',
    '--radius-sm': '4px',
    '--radius-md': '8px',
    '--radius-lg': '12px',
    '--space-unit': '4px',
    '--shadow-card': '0 1px 6px rgba(34, 48, 44, 0.08)',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'overlay',
    hero: 'split',
    categoryNav: 'sidebar',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  sections: ['announcement', 'hero', 'featured', 'categories', 'grid', 'footer'],
};
