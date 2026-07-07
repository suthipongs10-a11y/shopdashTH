// View-model types ของ component library storefront (§4.3)
// components รับข้อมูลพร้อมแสดงผล (URL รูปประกอบแล้ว) — ไม่ query DB เอง

import type { Carrier, OrderStatus } from '@/lib/orders/status';

export interface ProductCardData {
  id: string;
  name: string;
  href: string;
  /** ราคาต่ำสุด-สูงสุดของ variant ที่เปิดขาย (บาทเต็ม) */
  priceMin: number;
  priceMax?: number;
  imageUrl?: string;
  /** ป้ายบน card เช่น "ใหม่" / "ขายดี" (ธีมกลุ่ม Professional ขึ้นไป) */
  badge?: string;
  inStock: boolean;
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
