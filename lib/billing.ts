// Billing ค่าแพลน (Phase 3 งาน 3.5) — ร้านจ่ายแพลตฟอร์มผ่าน PromptPay ของแพลตฟอร์ม + สลิป
// flow: ร้านอัปสลิป → แถว tenant_subscriptions (pending) → super admin อนุมัติ →
//        tenants.status='active' + ขยาย subscription_ends_at 1 ปี (§5.3 ข้อ 10–11)

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { invalidateTenantCache } from '@/lib/tenant-context';

export interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  amount: number;
  slip_r2_key: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason_th: string | null;
  approved_by: string | null;
  approved_at: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * ต่ออายุจากวันหมดอายุเดิมถ้ายังไม่หมด — ไม่ปรับเศษวันที่จ่ายก่อนกำหนดทิ้ง
 * reset=true (อัปเกรด/เปลี่ยนแพลน): เริ่มนับใหม่ 1 ปีจากวันนี้ ไม่ต่อจากของเดิม
 */
function computePeriod(currentEndsAt: string | null, reset = false): { start: Date; end: Date } {
  const now = Date.now();
  const base = reset || !currentEndsAt ? now : Math.max(now, new Date(currentEndsAt).getTime());
  return { start: new Date(base), end: new Date(base + YEAR_MS) };
}

/**
 * ร้านนี้เป็น "ลูกค้าต่ออายุ" หรือยัง — เคยมี subscription อนุมัติแล้วอย่างน้อย 1 ใบ
 * = จ่ายรอบถัดไปคิด "ค่าดูแลรายปี" (price_renewal) แทนราคาปีแรกซึ่งรวมค่าจัดทำ
 */
export async function isRenewalTenant(tenantId: string): Promise<boolean> {
  const db = createAdminClient();
  const { count } = await db
    .from('tenant_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'approved');
  return (count ?? 0) > 0;
}

/** ยอดที่ต้องชำระของแพลน — ปีแรก = price_yearly, ต่ออายุ = price_renewal (null = เท่าปีแรก) */
export function planChargeAmount(
  plan: { price_yearly: number; price_renewal: number | null },
  isRenewal: boolean,
): number {
  return isRenewal ? (plan.price_renewal ?? plan.price_yearly) : plan.price_yearly;
}

export type PlanChargeKind = 'first' | 'renewal' | 'upgrade' | 'downgrade';

export interface PlanChargeInfo {
  kind: PlanChargeKind;
  amount: number; // บาทที่ต้องจ่าย (downgrade = 0)
  resetPeriod: boolean; // true = อายุเริ่มนับใหม่ 1 ปีจากวันอนุมัติ
}

interface PlanPricing {
  id: string;
  price_yearly: number;
  price_renewal: number | null;
}

/**
 * คิดยอด + วิธีนับอายุ เมื่อร้านจะจ่าย/เปลี่ยนแพลน (กติกาเจ้าของ 2026-07-15 — ดู DECISIONS)
 * - จ่ายครั้งแรก (ยังไม่เคยอนุมัติ): ราคาปีแรกเต็ม, อายุ 1 ปีจากวันอนุมัติ
 * - ต่ออายุแพลนเดิม: ค่าดูแลรายปี, อายุต่อจากวันหมดอายุเดิม
 * - อัปเกรด (แพลนใหม่แพงกว่า): จ่ายส่วนต่างราคาปีแรก, อายุเริ่มนับใหม่ 1 ปี
 * - ดาวน์เกรด (แพลนใหม่ถูกกว่า): ฟรี ไม่คืนเงิน อายุคงเดิม (§7.2)
 */
export function computePlanCharge(
  current: PlanPricing,
  selected: PlanPricing,
  isRenewal: boolean,
): PlanChargeInfo {
  if (!isRenewal) {
    return { kind: 'first', amount: selected.price_yearly, resetPeriod: false };
  }
  if (selected.id === current.id) {
    return {
      kind: 'renewal',
      amount: selected.price_renewal ?? selected.price_yearly,
      resetPeriod: false,
    };
  }
  if (selected.price_yearly > current.price_yearly) {
    return {
      kind: 'upgrade',
      amount: Math.max(0, selected.price_yearly - current.price_yearly),
      resetPeriod: true,
    };
  }
  return { kind: 'downgrade', amount: 0, resetPeriod: false };
}

/**
 * ร้านส่งคำขอชำระค่าแพลน (แนบสลิป) — กันคำขอ pending ซ้อน (ทีละใบ เหมือนกติกาสลิปออร์เดอร์ §7.3)
 * planId = แพลนที่ต้องการ (ต่ออายุแพลนเดิม หรือขออัปเกรดเป็นแพลนอื่น §2.3)
 */
export async function createSubscriptionRequest(
  tenantId: string,
  planId: string,
  slipR2Key: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();

  const { data: pending } = await db
    .from('tenant_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .limit(1);
  if ((pending ?? []).length > 0) {
    return { ok: false, error: 'มีสลิปรอตรวจสอบอยู่แล้ว กรุณารอผลก่อนส่งใหม่' };
  }

  const { data: plan } = await db
    .from('plans')
    .select('id, price_yearly, price_renewal, is_active')
    .eq('id', planId)
    .single();
  if (!plan || !plan.is_active) return { ok: false, error: 'ไม่พบแพลนที่เลือก' };

  const { data: tenant } = await db
    .from('tenants')
    .select('subscription_ends_at, plan_id, plans(id, price_yearly, price_renewal)')
    .eq('id', tenantId)
    .single();
  if (!tenant || !tenant.plans) return { ok: false, error: 'ไม่พบร้านค้า' };

  // คิดยอด (ปีแรก/ต่ออายุ/อัปเกรดส่วนต่าง) ตามแพลนปัจจุบัน — ตัดสิน server ไม่เชื่อ client
  const renewal = await isRenewalTenant(tenantId);
  const charge = computePlanCharge(tenant.plans as unknown as PlanPricing, plan, renewal);
  if (charge.kind === 'downgrade') {
    return { ok: false, error: 'การลดแพลนไม่ต้องแนบสลิป — กดปุ่มเปลี่ยนแพลนได้เลย' };
  }

  const period = computePeriod(tenant.subscription_ends_at, charge.resetPeriod);
  const { error } = await db.from('tenant_subscriptions').insert({
    tenant_id: tenantId,
    plan_id: planId,
    amount: charge.amount,
    slip_r2_key: slipR2Key,
    status: 'pending',
    period_start: period.start.toISOString(),
    period_end: period.end.toISOString(),
  });
  if (error) return { ok: false, error: 'บันทึกคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  await logTenantEvent(tenantId, 'subscription_request', 'ok', {
    plan_id: planId,
    amount: charge.amount,
    kind: charge.kind,
  });
  return { ok: true };
}

/**
 * super admin อนุมัติสลิปค่าแพลน → ร้าน active ทันที (§5.3 ข้อ 11)
 * ถ้าแพลนในคำขอต่างจากแพลนปัจจุบัน = อัปเกรด/ดาวน์เกรดพร้อมกัน (เปลี่ยน plan_id ด้วย)
 * period คำนวณใหม่ ณ เวลาอนุมัติ (ต่อจากวันหมดอายุเดิมถ้ายังไม่หมด)
 */
export async function approveSubscription(
  subscriptionId: string,
  approvedById: string, // auth user id (uuid) — คอลัมน์ approved_by เป็น uuid
  actorLabel?: string, // ชื่อ/อีเมลไว้อ่านใน audit log
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();

  const { data: sub } = await db
    .from('tenant_subscriptions')
    .select('id, tenant_id, plan_id, status, plans(price_yearly)')
    .eq('id', subscriptionId)
    .single();
  if (!sub) return { ok: false, error: 'ไม่พบคำขอ' };
  if (sub.status !== 'pending') return { ok: false, error: 'คำขอนี้ถูกตัดสินไปแล้ว' };

  const { data: tenant } = await db
    .from('tenants')
    .select('slug, subscription_ends_at, plan_id, plans(price_yearly)')
    .eq('id', sub.tenant_id)
    .single();
  if (!tenant) return { ok: false, error: 'ไม่พบร้านค้า' };

  // อัปเกรด (เปลี่ยนเป็นแพลนแพงกว่า) → อายุเริ่มนับใหม่ 1 ปี; ต่ออายุ/ครั้งแรก → ต่อจากเดิม
  const subPrice = (sub.plans as unknown as { price_yearly: number } | null)?.price_yearly ?? 0;
  const curPrice = (tenant.plans as unknown as { price_yearly: number } | null)?.price_yearly ?? 0;
  const isUpgrade = sub.plan_id !== tenant.plan_id && subPrice > curPrice;
  const period = computePeriod(tenant.subscription_ends_at, isUpgrade);
  const now = new Date().toISOString();

  // กันอนุมัติซ้อน: อัปเดตเฉพาะเมื่อยัง pending
  const { data: updated, error: subError } = await db
    .from('tenant_subscriptions')
    .update({
      status: 'approved',
      approved_by: approvedById,
      approved_at: now,
      period_start: period.start.toISOString(),
      period_end: period.end.toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('status', 'pending')
    .select('id');
  if (subError || (updated ?? []).length === 0) {
    return { ok: false, error: 'อนุมัติไม่สำเร็จ (คำขออาจถูกตัดสินไปแล้ว)' };
  }

  const { error: tenantError } = await db
    .from('tenants')
    .update({
      status: 'active',
      plan_id: sub.plan_id,
      subscription_ends_at: period.end.toISOString(),
      locked_at: null,
    })
    .eq('id', sub.tenant_id);
  if (tenantError) return { ok: false, error: `อัปเดตร้านไม่สำเร็จ: ${tenantError.message}` };

  invalidateTenantCache(tenant.slug);
  await logTenantEvent(sub.tenant_id, 'subscription_approved', 'ok', {
    subscription_id: subscriptionId,
    plan_id: sub.plan_id,
    period_end: period.end.toISOString(),
    actor: actorLabel ?? approvedById,
  });
  return { ok: true };
}

/** super admin ปฏิเสธสลิปค่าแพลน — เก็บแถวไว้เป็นหลักฐาน ร้านส่งใหม่ได้ */
export async function rejectSubscription(
  subscriptionId: string,
  reason: string,
  rejectedById: string, // auth user id (uuid)
  actorLabel?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!reason.trim()) return { ok: false, error: 'กรุณากรอกเหตุผลที่ปฏิเสธ' };

  const db = createAdminClient();
  const { data: updated, error } = await db
    .from('tenant_subscriptions')
    .update({
      status: 'rejected',
      reject_reason_th: reason.trim(),
      approved_by: rejectedById, // ผู้ตัดสิน (ใช้ช่องเดียวกัน — approved_at ว่างแยกแยะได้)
    })
    .eq('id', subscriptionId)
    .eq('status', 'pending')
    .select('id, tenant_id');
  if (error || (updated ?? []).length === 0) {
    return { ok: false, error: 'ปฏิเสธไม่สำเร็จ (คำขออาจถูกตัดสินไปแล้ว)' };
  }

  await logTenantEvent(updated![0].tenant_id, 'subscription_rejected', 'ok', {
    subscription_id: subscriptionId,
    reason: reason.trim(),
    actor: actorLabel ?? rejectedById,
  });
  return { ok: true };
}

/**
 * ดาวน์เกรดแพลน (self-service, ฟรี §7.2) — ร้านเปลี่ยนเป็นแพลนถูกกว่าได้ทันที
 * ไม่คืนเงินส่วนต่าง, อายุใช้งานคงเดิม (ไม่แตะ subscription_ends_at), feature flag คำนวณใหม่เอง
 */
export async function downgradePlan(
  tenantId: string,
  planId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();

  // กันดาวน์เกรดขณะมีสลิปรอตรวจ (กันสถานะสับสน)
  const { data: pending } = await db
    .from('tenant_subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .limit(1);
  if ((pending ?? []).length > 0) {
    return { ok: false, error: 'มีสลิปรอตรวจสอบอยู่ กรุณารอผลก่อนเปลี่ยนแพลน' };
  }

  const { data: plan } = await db
    .from('plans')
    .select('id, price_yearly, is_active')
    .eq('id', planId)
    .single();
  if (!plan || !plan.is_active) return { ok: false, error: 'ไม่พบแพลนที่เลือก' };

  const { data: tenant } = await db
    .from('tenants')
    .select('slug, plan_id, plans(price_yearly)')
    .eq('id', tenantId)
    .single();
  if (!tenant || !tenant.plans) return { ok: false, error: 'ไม่พบร้านค้า' };

  const currentPrice = (tenant.plans as unknown as { price_yearly: number }).price_yearly;
  if (planId === tenant.plan_id) return { ok: false, error: 'เป็นแพลนปัจจุบันอยู่แล้ว' };
  if (plan.price_yearly >= currentPrice) {
    return { ok: false, error: 'แพลนนี้ไม่ใช่การลดแพลน — กรุณาชำระส่วนต่างผ่านการอัปเกรด' };
  }

  const { error } = await db.from('tenants').update({ plan_id: planId }).eq('id', tenantId);
  if (error) return { ok: false, error: `เปลี่ยนแพลนไม่สำเร็จ: ${error.message}` };

  invalidateTenantCache(tenant.slug);
  await logTenantEvent(tenantId, 'plan_downgraded', 'ok', { plan_id: planId });
  return { ok: true };
}
