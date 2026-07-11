// ส่วน client-safe ของระบบ feature flag (§3.7) — ไม่มี server-only
// ฝั่ง server (resolveFeatures/assertFeature/limit) อยู่ lib/features.ts

export type FeatureKey =
  | 'custom_domain'
  | 'slip_verify_api'
  | 'line_oa'
  | 'discount_codes'
  | 'analytics_dashboard'
  | 'staff_accounts'
  | 'theme_customize'
  | 'custom_pages'
  | 'wishlist'
  | 'related_products'
  /** ระบบสั่งซื้อ+ชำระเงินบนเว็บ — default เปิด; ปิดเมื่อร้านขายผ่านแชท (ref T1) */
  | 'online_ordering';

export type FeatureMap = Record<FeatureKey, boolean>;

export const FEATURE_KEYS: FeatureKey[] = [
  'custom_domain',
  'slip_verify_api',
  'line_oa',
  'discount_codes',
  'analytics_dashboard',
  'staff_accounts',
  'theme_customize',
  'custom_pages',
  'wishlist',
  'related_products',
  'online_ordering',
];

export const FEATURE_LABEL_TH: Record<FeatureKey, string> = {
  custom_domain: 'โดเมนของตัวเอง',
  slip_verify_api: 'ตรวจสลิปอัตโนมัติ',
  line_oa: 'แจ้งเตือน LINE OA',
  discount_codes: 'โค้ดส่วนลด',
  analytics_dashboard: 'แดชบอร์ดวิเคราะห์ยอดขาย',
  staff_accounts: 'บัญชี staff เพิ่มเติม',
  theme_customize: 'ปรับแต่งธีมเอง (สี/ฟอนต์)',
  custom_pages: 'หน้าเพจ/บทความ',
  wishlist: 'Wishlist',
  related_products: 'สินค้าที่เกี่ยวข้อง',
  online_ordering: 'ระบบสั่งซื้อบนเว็บ (ตะกร้า + PromptPay)',
};
