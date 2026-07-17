// ธีม "ลิตเติ้ลจอย" (ของเล่น / แม่และเด็ก) — ref ภาพ Little Joy จากเจ้าของ 2026-07-17
// โทนฟ้าอ่อน-ชมพูพาสเทล ขอบมนใหญ่ ฟอนต์ Mitr — hero แผงฟ้า + ปุ่มชมพู,
// การ์ดหมวด pill พาสเทล, การ์ดสินค้ามีดาว+ปุ่ม "หยิบใส่ตะกร้า" สีฟ้า, แถบรีวิวคุณพ่อคุณแม่

import type { ThemePreset } from '../types';

export const preset: ThemePreset = {
  code: 'toys-01',
  nameTh: 'ลิตเติ้ลจอย (ของเล่นเด็ก)',
  tier: 1,
  tokens: {
    '--color-primary': '#ec6a9d', // ชมพู — ปุ่ม "ช้อปเลย" / nav active / badge
    '--color-primary-fg': '#ffffff',
    '--color-secondary': '#dcedfb', // แผงฟ้าอ่อน — hero / แถบ USP / แถบรีวิว
    '--color-bg': '#ffffff',
    '--color-surface': '#eef6fd', // ฟ้าจางมาก — utility bar / พื้นรูปสินค้า
    '--color-text': '#31517c', // น้ำเงินเข้ม — หัวข้อ/ตัวหนังสือหลักตาม ref
    '--color-text-muted': '#7d93af',
    '--color-accent': '#4e8fd5', // ฟ้ากลาง — ปุ่มตะกร้า/ราคา/ปุ่มค้นหา
    '--color-danger': '#dc2626',
    '--color-success': '#3d9e6e',
    '--font-heading': 'Mitr',
    '--font-body': 'Prompt',
    '--text-scale': '1',
    '--radius-sm': '10px',
    '--radius-md': '16px',
    '--radius-lg': '24px',
    '--space-unit': '4px',
    '--shadow-card': '0 2px 10px rgba(91, 141, 197, 0.10)',
    '--container-max': '1280px',
  },
  variants: {
    productCard: 'toy',
    hero: 'split-panel',
    categoryNav: 'topbar',
  },
  featureDefaults: {
    wishlist: true,
    related_products: true,
  },
  sections: ['hero', 'categoryCards', 'featured', 'usp', 'testimonials', 'footer'],
  layout: {
    utilityBar: true,
    utilityBarTone: 'soft',
    headerSearch: true,
    footerVariant: 'full',
  },
};
