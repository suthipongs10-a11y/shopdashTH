// ลิงก์ติดตามพัสดุต่อขนส่ง (งาน 4.7) — แค่ deep link ไปหน้า tracking ของขนส่ง
// ไม่ integrate API ขนส่งจริง (Future ตาม §2.3)

import type { Carrier } from '@/lib/orders/status';

const TRACKING_URL_TEMPLATE: Partial<Record<Carrier, string>> = {
  thailand_post: 'https://track.thailandpost.co.th/?trackNumber={tracking}',
  kerry: 'https://th.kerryexpress.com/th/track/?track={tracking}',
  flash: 'https://www.flashexpress.com/fle/tracking?se={tracking}',
  jnt: 'https://www.jtexpress.co.th/service/track?billcode={tracking}',
  // other: ไม่มีลิงก์ — แสดงเลขพัสดุเฉยๆ
};

/** คืน URL หน้า tracking ของขนส่ง — null เมื่อไม่รองรับ (carrier = other) */
export function trackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!carrier || !trackingNumber) return null;
  const template = TRACKING_URL_TEMPLATE[carrier as Carrier];
  if (!template) return null;
  return template.replace('{tracking}', encodeURIComponent(trackingNumber.trim()));
}
