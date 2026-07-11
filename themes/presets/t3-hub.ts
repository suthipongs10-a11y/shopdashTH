// ธีม T3 "HUB" — เดโม่แพลนธุรกิจ ฿7,900 (TEMPLATE_SPEC §3.3, ตาม ref: FASHION HUB)
// บุคลิก marketplace: ความหนาแน่นสูง, การ์ด 5 คอลัมน์ + sidebar ฟิลเตอร์,
// accent แดง #D6453D ใช้กับ SALE เท่านั้น (= token danger — badge/ราคา ลดราคา)

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 't3-hub',
  nameTh: 'ฮับ (Marketplace)',
  tier: 2,
  tokens: {
    '--color-primary': '#111214',
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#f4f2ee', // แถบสมาชิก/ServiceBand พื้นครีมอ่อน
    '--color-bg': '#ffffff',
    '--color-surface': '#f7f7f7',
    '--color-text': '#111214',
    '--color-text-muted': '#6b6f76',
    '--color-accent': '#d6453d', // §3.3: ใช้กับ SALE เท่านั้น (การ์ดใช้ danger ซึ่งค่าเดียวกัน)
    '--color-danger': '#d6453d',
    '--color-success': '#1e9e57', // สถานะสต๊อก "พร้อมส่ง" + timeline ออร์เดอร์
    '--font-heading': 'IBM Plex Sans Thai',
    '--font-body': 'IBM Plex Sans Thai',
    '--text-scale': '1',
    '--radius-sm': '8px',
    '--radius-md': '12px',
    '--radius-lg': '12px',
    '--space-unit': '4px',
    '--shadow-card': '0 1px 3px rgba(0,0,0,.06)',
    '--container-max': '1360px', // กว้างกว่า T2 — sidebar 240px + grid 5 คอลัมน์
  },
  variants: {
    productCard: 'hub',
    hero: 'carousel',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  // ref T3 ไล่บน→ล่าง: carousel → วงกลมหมวด → sidebar+grid → แถบสมาชิก
  // → สินค้าแนะนำเลื่อนแนวนอน → บทความ → แถบ 8 ไอคอน → footer(payment)
  sections: [
    'hero',
    'categoryCircles',
    'homeCatalog',
    'memberBenefits',
    'featuredScroller',
    'articles',
    'serviceBand',
    'footer',
  ],
  layout: {
    utilityBar: true,
    headerSearch: true,
    footerVariant: 'full',
    memberBar: true,
    catalogSidebar: true,
    footerPayments: true,
  },
};
