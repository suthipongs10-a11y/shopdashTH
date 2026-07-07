// ส่วน client-safe ของระบบ feature flag (§3.7) — ไม่มี server-only
// ฝั่ง server (resolveFeatures/assertFeature/limit) อยู่ lib/features.ts

export type FeatureKey =
  | 'custom_domain'
  | 'slip_verify_api'
  | 'line_oa'
  | 'discount_codes'
  | 'analytics_dashboard'
  | 'staff_accounts'
  | 'wishlist'
  | 'related_products';

export type FeatureMap = Record<FeatureKey, boolean>;

export const FEATURE_KEYS: FeatureKey[] = [
  'custom_domain',
  'slip_verify_api',
  'line_oa',
  'discount_codes',
  'analytics_dashboard',
  'staff_accounts',
  'wishlist',
  'related_products',
];

export const FEATURE_LABEL_TH: Record<FeatureKey, string> = {
  custom_domain: 'โดเมนของตัวเอง',
  slip_verify_api: 'ตรวจสลิปอัตโนมัติ',
  line_oa: 'แจ้งเตือน LINE OA',
  discount_codes: 'โค้ดส่วนลด',
  analytics_dashboard: 'แดชบอร์ดวิเคราะห์ยอดขาย',
  staff_accounts: 'บัญชี staff เพิ่มเติม',
  wishlist: 'Wishlist',
  related_products: 'สินค้าที่เกี่ยวข้อง',
};
