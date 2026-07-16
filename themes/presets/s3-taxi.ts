// ธีม S3 "แท็กซี่เซอร์วิส" — เทมเพลตแท็กซี่/รถรับจ้าง (ref: แท็กซี่ไทยเซอร์วิส)
// ขาว + น้ำเงินแท็กซี่ — hero มีแผงจอง, แพ็กเกจยอดนิยม = บริการจริงจากแคตตาล็อก,
// ประเภทรถ, ขั้นตอนจอง 4 ข้อ (featureList), รีวิวลูกค้า

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 's3-taxi',
  nameTh: 'แท็กซี่เซอร์วิส (รถรับจ้าง)',
  tier: 1,
  tokens: {
    '--color-primary': '#1656b8', // น้ำเงินแท็กซี่
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#eaf2fb',
    '--color-bg': '#ffffff',
    '--color-surface': '#ffffff',
    '--color-text': '#16233a',
    '--color-text-muted': '#5d6b80',
    '--color-accent': '#f0b90b', // เหลืองแท็กซี่
    '--color-danger': '#d6453d',
    '--color-success': '#1e9e57',
    '--font-heading': 'Kanit',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '16px',
    '--space-unit': '4px',
    '--shadow-card': '0 1px 6px rgba(22,35,58,.1)',
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
  // ref: hero+แผงจอง → 4 จุดเด่น → แพ็กเกจยอดนิยม (บริการจริง) → ประเภทรถ → วิธีจอง 4 ขั้น → รีวิว → CTA
  sections: [
    'serviceHero',
    'usp',
    'featured',
    'vehicles',
    'featureList',
    'testimonials',
    'contactCta',
    'footer',
  ],
  layout: {
    footerVariant: 'dark', // footer น้ำเงินตาม ref
    mobileDrawer: true,
    headerContactButtons: true,
  },
};
