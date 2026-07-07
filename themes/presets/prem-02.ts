// ธีม 10/10 — "มินิมอลพรีเมียม" (tier 3 Premium) — §4.5
// whitespace เยอะ, heading Bai Jamjuree, ร้านแก้ token เองได้ (§4.6)

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'prem-02',
  nameTh: 'มินิมอลพรีเมียม',
  tier: 3,
  customizable: true,
  tokens: {
    '--color-primary': '#111111',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f3f3f3',
    '--color-bg': '#ffffff',
    '--color-surface': '#fafafa',
    '--color-text': '#1a1a1a',
    '--color-text-muted': '#8a8a8a',
    '--color-accent': '#6b7280',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Bai Jamjuree',
    '--font-body': 'IBM Plex Sans Thai',
    '--text-scale': '1.05',
    '--radius-sm': '2px',
    '--radius-md': '6px',
    '--radius-lg': '10px',
    '--space-unit': '5px',
    '--shadow-card': 'none',
    '--container-max': '1100px',
  },
  variants: {
    productCard: 'minimal',
    hero: 'split',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  sections: ['hero', 'featured', 'grid', 'categories', 'footer'],
};
