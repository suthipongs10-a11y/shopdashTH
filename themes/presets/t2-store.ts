// ธีม T2 "STORE" — เดโม่แพลนร้านค้า ฿3,900 (TEMPLATE_SPEC §3.2, ตาม ref: WEAR.STORE)
// Commerce Premium: พื้นขาวจริง, ink #111214, radius 12/8, เงาจางมาก, IBM Plex Sans Thai

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 't2-store',
  nameTh: 'สโตร์ (Commerce)',
  tier: 2,
  tokens: {
    '--color-primary': '#111214',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f5f1e8', // แถบ FeatureBand พื้นครีม (ref)
    '--color-bg': '#ffffff',
    '--color-surface': '#f7f7f7',
    '--color-text': '#111214',
    '--color-text-muted': '#6b6f76',
    '--color-accent': '#111214',
    '--color-danger': '#d6453d',
    '--color-success': '#1e9e57', // timeline สถานะออร์เดอร์สีเขียว (ref)
    '--font-heading': 'IBM Plex Sans Thai',
    '--font-body': 'IBM Plex Sans Thai',
    '--text-scale': '1',
    '--radius-sm': '8px', // ปุ่ม (§2)
    '--radius-md': '12px', // การ์ด (§2)
    '--radius-lg': '12px', // ห้ามเกิน 12px (§5.4)
    '--space-unit': '4px',
    '--shadow-card': '0 1px 3px rgba(0,0,0,.06)',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'store',
    hero: 'commerce',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  sections: ['hero', 'usp', 'featured', 'categoryBanners', 'tools', 'featureBand', 'footer'],
  layout: {
    utilityBar: true,
    headerSearch: true,
    footerVariant: 'full',
    demoRatings: true,
  },
};
