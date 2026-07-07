// ธีม 3/10 — "คลีนดำ-ขาว" (tier 1 Starter) — §4.5
// โทนขรึม radius 0 เหมาะ streetwear

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'basic-03',
  nameTh: 'คลีนดำ-ขาว',
  tier: 1,
  tokens: {
    '--color-primary': '#000000',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#e5e5e5',
    '--color-bg': '#ffffff',
    '--color-surface': '#f0f0f0',
    '--color-text': '#000000',
    '--color-text-muted': '#525252',
    '--color-accent': '#262626',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Kanit',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '0px',
    '--radius-md': '0px',
    '--radius-lg': '0px',
    '--space-unit': '4px',
    '--shadow-card': 'none',
    '--container-max': '1100px',
  },
  variants: {
    productCard: 'minimal',
    hero: 'full-bleed',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: false,
    related_products: false,
  },
  sections: ['hero', 'featured', 'grid', 'footer'],
};
