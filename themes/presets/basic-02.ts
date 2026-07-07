// ธีม 2/10 — "พาสเทลหวาน" (tier 1 Starter) — §4.5
// โทนชมพู-ครีม radius ใหญ่ เหมาะเสื้อผ้าผู้หญิง/ของเด็ก

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'basic-02',
  nameTh: 'พาสเทลหวาน',
  tier: 1,
  tokens: {
    '--color-primary': '#ec4899',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#fdf2f8',
    '--color-bg': '#fffbf7',
    '--color-surface': '#fdf2f8',
    '--color-text': '#4a3540',
    '--color-text-muted': '#a58a97',
    '--color-accent': '#f472b6',
    '--color-danger': '#dc2626',
    '--color-success': '#16a34a',
    '--font-heading': 'Prompt',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '10px',
    '--radius-md': '16px',
    '--radius-lg': '24px',
    '--space-unit': '4px',
    '--shadow-card': '0 2px 8px rgba(236, 72, 153, 0.08)',
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
  sections: ['hero', 'featured', 'categories', 'grid', 'footer'],
};
