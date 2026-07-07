// ธีม 6/10 — "แฟชั่นนิตยสาร" (tier 2 Pro) — §4.5
// hero full-bleed, typography ใหญ่, card overlay

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'prof-03',
  nameTh: 'แฟชั่นนิตยสาร',
  tier: 2,
  tokens: {
    '--color-primary': '#1c1917',
    '--color-primary-fg': '#fafaf9',
    '--color-secondary': '#e7e5e4',
    '--color-bg': '#fafaf9',
    '--color-surface': '#f5f5f4',
    '--color-text': '#1c1917',
    '--color-text-muted': '#78716c',
    '--color-accent': '#b91c1c',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Bai Jamjuree',
    '--font-body': 'Noto Sans Thai',
    '--text-scale': '1.1',
    '--radius-sm': '2px',
    '--radius-md': '4px',
    '--radius-lg': '8px',
    '--space-unit': '4px',
    '--shadow-card': 'none',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'overlay',
    hero: 'full-bleed',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: false,
    related_products: true,
  },
  sections: ['announcement', 'hero', 'featured', 'grid', 'footer'],
};
