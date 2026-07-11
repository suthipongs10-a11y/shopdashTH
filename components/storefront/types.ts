// View-model types ของ component library storefront (§4.3)
// components รับข้อมูลพร้อมแสดงผล (URL รูปประกอบแล้ว) — ไม่ query DB เอง

import type { Carrier, OrderStatus } from '@/lib/orders/status';

/** variant สำหรับ QuickView (ธีม Commerce) — โครงเดียวกับ StorefrontVariant ใน lib/catalog */
export interface QuickViewVariant {
  id: string;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
}

export interface ProductCardData {
  id: string;
  name: string;
  href: string;
  /** ราคาต่ำสุด-สูงสุดของ variant ที่เปิดขาย (บาทเต็ม) */
  priceMin: number;
  priceMax?: number;
  imageUrl?: string;
  /** รูปที่สอง — โชว์ตอน hover (ธีม Commerce, TEMPLATE_SPEC §4) */
  hoverImageUrl?: string;
  /** ป้ายบน card เช่น "ใหม่" / "ขายดี" (ธีมกลุ่ม Professional ขึ้นไป) */
  badge?: string;
  /** ราคาก่อนลด (base_price) — มีค่าเมื่อ variant ถูกตั้ง price_override ต่ำกว่า */
  compareAtPrice?: number;
  /** เปอร์เซ็นต์ส่วนลด (badge "-20%" ธีม marketplace) */
  salePercent?: number;
  /** ลงขายภายใน 14 วัน (badge "NEW") */
  isNew?: boolean;
  inStock: boolean;
  /** จุดสีของ variant (ค่า CSS จาก lib/color-names) — การ์ดแบบ 'store' */
  colors?: string[];
  /** คะแนนรีวิวจริงจาก product_reviews (migration 010) — ไม่มีรีวิว = ไม่มีดาว */
  rating?: { score: string; count: number };
  /** ข้อมูล variant สำหรับ QuickView panel — เฉพาะการ์ดแบบ 'store' */
  variants?: QuickViewVariant[];
}

export interface CategoryItem {
  id: string;
  name: string;
  href: string;
}

/** รายการในตะกร้า — โครงเดียวกับที่ lib/cart.ts (งาน 1.6) เก็บใน localStorage */
export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel?: string;
  unitPrice: number;
  qty: number;
  imageUrl?: string;
  /** สต๊อกคงเหลือ ณ เวลาหยิบใส่ตะกร้า — จำกัดปุ่มเพิ่มจำนวน */
  maxQty?: number;
}

export interface CheckoutFormData {
  shipName: string;
  shipPhone: string;
  shipAddress: string;
  note?: string;
}

export interface TrackedOrderItem {
  productName: string;
  variantLabel?: string | null;
  unitPrice: number;
  qty: number;
}

/** ข้อมูลออร์เดอร์สำหรับหน้าติดตาม (ลูกค้าเห็น) */
export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  items: TrackedOrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  carrier?: Carrier | null;
  trackingNumber?: string | null;
  /** ลิงก์หน้า tracking ของขนส่ง (P4 — null เมื่อ carrier ไม่รองรับ) */
  trackingUrl?: string | null;
  /** เหตุผลที่สลิปล่าสุดถูกปฏิเสธ (แสดงเมื่อกลับมาเป็น pending_payment — §7.1) */
  lastSlipRejectReason?: string | null;
  /** เหตุผลยกเลิก (เมื่อ status = cancelled) */
  cancelledReason?: string | null;
}
