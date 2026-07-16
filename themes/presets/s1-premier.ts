// ธีม S1 "พรีเมียร์ ไดรฟ์" — เทมเพลตบริการรถหรู (ref: สยาม พรีเมียร์ ไดรฟ์)
// กรมท่าเข้ม + ทอง + หัวเรื่อง serif — hero มีแผงจองการเดินทาง, การ์ดรถ spec ชิป,
// รีวิวลูกค้า, แถบความมั่นใจ — โหมดธุรกิจบริการ (คู่กับ pack transport/aircon/handyman)

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 's1-premier',
  nameTh: 'พรีเมียร์ ไดรฟ์ (บริการรถหรู)',
  tier: 2,
  tokens: {
    '--color-primary': '#c9a45c', // ทอง
    '--color-primary-fg': '#101a33',
    '--color-secondary': '#0a1226', // พื้นแถบเข้มสุด (hero/แถบรีวิว)
    '--color-bg': '#0f1a33', // กรมท่าเข้ม
    '--color-surface': '#16234280', // การ์ดโปร่งบนพื้นเข้ม (hex+alpha)
    '--color-text': '#f1ecdf',
    '--color-text-muted': '#98a2ba',
    '--color-accent': '#e6c98a',
    '--color-danger': '#e0655c',
    '--color-success': '#4fae7d',
    '--font-heading': 'Noto Serif Thai',
    '--font-body': 'Sarabun',
    '--text-scale': '1',
    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '16px',
    '--space-unit': '4px',
    '--shadow-card': '0 10px 30px rgba(0,0,0,.35)',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'bordered',
    hero: 'boxed', // ไม่ได้ใช้ — หน้าแรกใช้ section serviceHero แทน
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: false,
    related_products: false,
  },
  // ref: hero+แผงจอง → บริการของเรา → รถของเรา → ลูกค้าพูดถึงเรา → ความมั่นใจ → CTA → footer
  sections: ['serviceHero', 'serviceCards', 'vehicles', 'testimonials', 'usp', 'contactCta', 'footer'],
  layout: {
    // footer 'simple' บนพื้นกรมเข้ม (dark variant ใช้สี primary = จะกลายเป็นทอง — ไม่ตรง ref)
    footerVariant: 'simple',
    mobileDrawer: true,
    headerContactButtons: true, // ปุ่มโทร/LINE ใน header ตาม ref
  },
};
