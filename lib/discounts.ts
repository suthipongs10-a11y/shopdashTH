// โค้ดส่วนลด (งาน 4.4) — validate ฝั่ง server เสมอ (§2.1)
// กันโควตาเกินด้วย RPC consume_discount_code (atomic update ... where used_count < max_uses)

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/tenant-context';

export interface DiscountRow {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export type DiscountValidation =
  | { ok: true; discountId: string; code: string; amount: number }
  | { ok: false; reason: string };

export function normalizeDiscountCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** คำนวณยอดส่วนลดจาก subtotal — ไม่เกิน subtotal (ยอดรวมห้ามติดลบ) */
export function discountAmount(row: Pick<DiscountRow, 'type' | 'value'>, subtotal: number): number {
  const amount = row.type === 'percent' ? Math.floor((subtotal * row.value) / 100) : row.value;
  return Math.min(Math.max(amount, 0), subtotal);
}

/**
 * ตรวจโค้ดกับกติกาทั้งหมด (วันเริ่ม-หมดอายุ, โควตา, ยอดขั้นต่ำ §2.1)
 * ยังไม่กันโควตา — กันจริงตอน consumeDiscountCode ก่อน insert ออร์เดอร์
 */
export async function validateDiscountCode(
  ctx: TenantContext,
  rawCode: string,
  subtotal: number,
): Promise<DiscountValidation> {
  if (!ctx.features.discount_codes) {
    return { ok: false, reason: 'ร้านนี้ไม่รองรับโค้ดส่วนลด' };
  }
  const code = normalizeDiscountCode(rawCode);
  if (!code) return { ok: false, reason: 'กรุณากรอกโค้ดส่วนลด' };

  const db = createAdminClient();
  const { data } = await db
    .from('discount_codes')
    .select('*')
    .eq('tenant_id', ctx.tenantId)
    .eq('code', code)
    .maybeSingle();

  const row = data as DiscountRow | null;
  if (!row || !row.is_active) return { ok: false, reason: 'ไม่พบโค้ดส่วนลดนี้' };

  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    return { ok: false, reason: 'โค้ดนี้ยังไม่เริ่มใช้งาน' };
  }
  if (row.ends_at && new Date(row.ends_at).getTime() < now) {
    return { ok: false, reason: 'โค้ดนี้หมดอายุแล้ว' };
  }
  if (row.max_uses !== null && row.used_count >= row.max_uses) {
    return { ok: false, reason: 'โค้ดนี้ถูกใช้ครบจำนวนแล้ว' };
  }
  if (row.min_order !== null && subtotal < row.min_order) {
    return {
      ok: false,
      reason: `โค้ดนี้ใช้ได้เมื่อยอดสั่งซื้อครบ ฿${row.min_order.toLocaleString('th-TH')}`,
    };
  }

  return { ok: true, discountId: row.id, code: row.code, amount: discountAmount(row, subtotal) };
}

/** กันโควตา 1 สิทธิ์แบบ atomic — คืน false เมื่อโควตาหมดพอดี (race) */
export async function consumeDiscountCode(tenantId: string, discountId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db.rpc('consume_discount_code', {
    p_tenant_id: tenantId,
    p_discount_id: discountId,
  });
  if (error) throw new Error(`consume_discount_code failed: ${error.message}`);
  return data === true;
}

/** คืนโควตาเมื่อออร์เดอร์สร้างไม่สำเร็จหลังกันโควตาไปแล้ว */
export async function releaseDiscountCode(tenantId: string, discountId: string): Promise<void> {
  const db = createAdminClient();
  await db.rpc('release_discount_code', { p_tenant_id: tenantId, p_discount_id: discountId });
}
