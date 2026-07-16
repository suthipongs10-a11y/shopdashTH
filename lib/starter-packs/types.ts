// ชนิดข้อมูลของ starter pack (ข้อมูลตัวอย่างที่ seed ให้ร้านใหม่) — data ล้วน ไม่มี logic
// pack ใหม่ = ไฟล์ data ใหม่ + ลงทะเบียนใน index.ts เท่านั้น (pipeline ไม่ต้องแตะ)

import type { ThemeContent } from '@/lib/theme-content';

export interface StarterReview {
  rating: number;
  author: string;
  comment: string;
  /** สร้าง created_at ย้อนหลังกี่วัน (กระจายให้ดูเป็นรีวิวสะสมจริง) */
  daysAgo: number;
}

export interface StarterVariantTweak {
  size: string | null;
  color: string | null;
  stock?: number;
  price_override?: number;
}

export interface StarterProduct {
  name: string;
  description_md: string;
  /** ชื่อหมวดใน pack (ต้องตรงกับ categories ของ pack) */
  category: string;
  base_price: number;
  is_featured?: boolean;
  /** static paths — รูปแรกคือรูปหลัก รูปถัดไปคือรูป hover/แกลเลอรี */
  images: string[];
  /** มิติ variant — [null] = สินค้าไม่มีมิตินั้น (ป้ายชื่อมิติเปลี่ยนได้ผ่าน content.variantLabels) */
  sizes: (string | null)[];
  colors: (string | null)[];
  /** สต๊อกต่อ variant (ค่าเดียวใช้ทุก combination) */
  stock: number;
  /** ราคา override ทุก variant (ใส่ต่ำกว่า base_price = ป้ายลดราคาบนธีม T3) */
  price_override?: number;
  /** ปรับ variant รายตัว เช่น ตั้งสต๊อกต่ำให้เห็นแถบเตือนบนแดชบอร์ด */
  variant_tweaks?: StarterVariantTweak[];
  /** วันที่สร้างย้อนหลังกี่วัน — ≤14 วัน = ป้าย NEW บนธีม T3 */
  created_days_ago: number;
  /** รีวิว ≥15 รายการ = ป้าย BEST บนธีม T3 */
  reviews: StarterReview[];
}

export interface StarterPage {
  slug: string;
  title: string;
  body_md: string;
  sort_order: number;
}

export interface StarterPack {
  code: string;
  /** ชื่อโชว์ในตัวเลือก "ร้านคุณขายอะไร" หน้า signup */
  nameTh: string;
  /** flag ที่ pack ตั้งให้ร้าน (merge ลง tenants.feature_overrides) — เช่น pack กลุ่มธุรกิจ
   *  บริการปิด online_ordering ให้เว็บเป็นโหมด "แนะนำบริการ + ติดต่อผ่านแชท" (ref T1)
   *  super admin แก้คืนได้รายร้านจากหน้า feature overrides เดิม */
  featureOverrides?: Record<string, boolean>;
  /** ไฟล์รูปที่ pack ต้องใช้ (relative จาก public/) — ใช้เช็คว่า asset ครบก่อนเปิดให้เลือก */
  requiredAssets: string[];
  categories: string[];
  products: StarterProduct[];
  /** seed เฉพาะแพลนที่มี flag custom_pages (สร้าง/แก้เพจไม่ได้ = อย่ายัดเพจให้) */
  pages: StarterPage[];
  /** เนื้อหาเทมเพลต — เขียนคีย์ครบทั้ง T1-T4 ธีมไหนไม่ใช้ก็เพิกเฉย (สลับธีมแล้วรอด) */
  content: ThemeContent;
  /** ใส่เพิ่มใน content เมื่อร้านมีเพจ (บทความ T3 ลิงก์ไป /p/{slug} จริง) */
  contentWithPages: Partial<ThemeContent>;
}
