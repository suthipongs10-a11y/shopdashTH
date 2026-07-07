// ธีม 8/10 — "สตรีทเข้ม" (tier 3 Premium) — §4.5
// dark mode ทั้งร้าน, accent นีออน

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'pro-02',
  nameTh: 'สตรีทเข้ม',
  tier: 3,
  tokens: {
    '--color-primary': '#a3e635',
    '--color-primary-fg': '#111827',
    '--color-secondary': '#1f2937',
    '--color-bg': '#0b0f14',
    '--color-surface': '#161d27',
    '--color-text': '#e5e7eb',
    '--color-text-muted': '#9ca3af',
    '--color-accent': '#22d3ee',
    '--color-danger': '#f87171',
    '--color-success': '#4ade80',
    '--font-heading': 'Kanit',
    '--font-body': 'Noto Sans Thai',
    '--text-scale': '1',
    '--radius-sm': '2px',
    '--radius-md': '4px',
    '--radius-lg': '8px',
    '--space-unit': '4px',
    '--shadow-card': 'none',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'minimal',
    hero: 'full-bleed',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  sections: ['announcement', 'hero', 'grid', 'featured', 'footer'],
};
