// ธีม S2 "ทราเวลคาร์" — เทมเพลตรถรับส่ง/เหมาเดินทาง โทนสว่าง (ref: ไทยทราเวลคาร์)
// ขาว + น้ำเงิน + เหลืองทอง — hero มีแผงจอง, เส้นทางยอดนิยม+ราคา, ประเภทรถ, รีวิว, FAQ

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 's2-travel',
  nameTh: 'ทราเวลคาร์ (รถรับส่ง-เหมา)',
  tier: 1,
  tokens: {
    '--color-primary': '#15559f', // น้ำเงินเข้ม
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#edf5fd', // แถบพื้นฟ้าอ่อน
    '--color-bg': '#ffffff',
    '--color-surface': '#ffffff',
    '--color-text': '#14263d',
    '--color-text-muted': '#5b6b7e',
    '--color-accent': '#e8a923', // เหลืองทอง (ปุ่มรอง/ดาว)
    '--color-danger': '#d6453d',
    '--color-success': '#1e9e57',
    '--font-heading': 'Prompt',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '10px',
    '--radius-md': '14px',
    '--radius-lg': '18px',
    '--space-unit': '4px',
    '--shadow-card': '0 2px 10px rgba(20,38,61,.08)',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'bordered',
    hero: 'boxed', // ไม่ได้ใช้ — ใช้ section serviceHero
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: false,
    related_products: false,
  },
  // ref: hero+แผงจอง → บริการของเรา → เส้นทางยอดนิยม → ประเภทรถ → รีวิว → แถบมั่นใจ → FAQ → CTA
  sections: [
    'serviceHero',
    'serviceCards',
    'routes',
    'vehicles',
    'testimonials',
    'usp',
    'faq',
    'contactCta',
    'footer',
  ],
  layout: {
    footerVariant: 'dark', // dark ใช้สี primary = footer น้ำเงินตาม ref
    mobileDrawer: true,
    headerContactButtons: true,
  },
};
