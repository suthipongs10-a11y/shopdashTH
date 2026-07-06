// ธีม 1/10 — "มินิมอลขาว" (tier 1 Starter) — §4.5
// grid เรียบ, card minimal, ไม่มี AnnouncementBar / wishlist / related products

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'basic-01',
  tier: 1,
  tokens: {
    '--color-primary': '#171717',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f5f5f5',
    '--color-bg': '#ffffff',
    '--color-surface': '#f7f7f7',
    '--color-text': '#171717',
    '--color-text-muted': '#6b7280',
    '--color-accent': '#404040',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Prompt',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '4px',
    '--radius-md': '8px',
    '--radius-lg': '14px',
    '--space-unit': '4px',
    '--shadow-card': 'none',
    '--container-max': '1100px',
  },
  variants: {
    productCard: 'minimal',
    hero: 'boxed',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: false,
    related_products: false,
  },
  sections: ['hero', 'featured', 'categories', 'grid', 'footer'],
};
