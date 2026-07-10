'use client';

// จำออร์เดอร์ล่าสุดของลูกค้าเครื่องนี้ (localStorage ต่อร้าน — แบบเดียวกับตะกร้า)
// ใช้โดยกล่อง "สถานะคำสั่งซื้อล่าสุด" บนหน้าแรกธีม Commerce

export interface LastOrderRef {
  orderNumber: string;
  phone: string;
  savedAt: number;
}

export function lastOrderStorageKey(slug: string): string {
  return `shopdash_last_order_${slug}`;
}

export function saveLastOrder(slug: string, orderNumber: string, phone: string): void {
  try {
    window.localStorage.setItem(
      lastOrderStorageKey(slug),
      JSON.stringify({ orderNumber, phone, savedAt: Date.now() } satisfies LastOrderRef),
    );
  } catch {
    // localStorage เต็ม/ถูกปิด — ข้ามได้ ไม่กระทบ flow สั่งซื้อ
  }
}

export function loadLastOrder(slug: string): LastOrderRef | null {
  try {
    const raw = window.localStorage.getItem(lastOrderStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastOrderRef>;
    if (typeof parsed.orderNumber !== 'string' || typeof parsed.phone !== 'string') return null;
    return { orderNumber: parsed.orderNumber, phone: parsed.phone, savedAt: parsed.savedAt ?? 0 };
  } catch {
    return null;
  }
}
