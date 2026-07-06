// สถานะออร์เดอร์ + ขนส่ง — label ภาษาไทยใช้ร่วมกันทั้ง storefront และ store admin
// state machine จริงอยู่ lib/orders/transition.ts (งาน 1.9) — ไฟล์นี้เป็นแค่ค่าคงที่/label

export const ORDER_STATUSES = [
  'pending_payment',
  'slip_uploaded',
  'confirmed',
  'packing',
  'shipped',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_TH: Record<OrderStatus, string> = {
  pending_payment: 'รอชำระเงิน',
  slip_uploaded: 'รอตรวจสอบสลิป',
  confirmed: 'ยืนยันคำสั่งซื้อแล้ว',
  packing: 'กำลังแพ็คสินค้า',
  shipped: 'จัดส่งแล้ว',
  cancelled: 'ยกเลิกแล้ว',
};

/** ลำดับขั้นปกติของออร์เดอร์ (ไม่รวม cancelled) — ใช้วาด timeline */
export const ORDER_FLOW: readonly OrderStatus[] = [
  'pending_payment',
  'slip_uploaded',
  'confirmed',
  'packing',
  'shipped',
];

export const CARRIERS = ['thailand_post', 'kerry', 'flash', 'jnt', 'other'] as const;

export type Carrier = (typeof CARRIERS)[number];

export const CARRIER_TH: Record<Carrier, string> = {
  thailand_post: 'ไปรษณีย์ไทย',
  kerry: 'Kerry Express',
  flash: 'Flash Express',
  jnt: 'J&T Express',
  other: 'อื่นๆ',
};
