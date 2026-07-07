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

/** ต่ออายุจากวันหมดอายุเดิมถ้ายังไม่หมด — ไม่ปรับเศษวันที่จ่ายก่อนกำหนดทิ้ง */
function computePeriod(currentEndsAt: string | null): { start: Date; end: Date } {
  const now = Date.now();
  const base = currentEndsAt ? Math.max(now, new Date(currentEndsAt).getTime()) : now;
  return { start: new Date(base), end: new Date(base + YEAR_MS) };
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
    .select('id, price_yearly, is_active')
    .eq('id', planId)
    .single();
  if (!plan || !plan.is_active) return { ok: false, error: 'ไม่พบแพลนที่เลือก' };

  const { data: tenant } = await db
    .from('tenants')
    .select('subscription_ends_at')
    .eq('id', tenantId)
    .single();
  if (!tenant) return { ok: false, error: 'ไม่พบร้านค้า' };

  const period = computePeriod(tenant.subscription_ends_at);
  const { error } = await db.from('tenant_subscriptions').insert({
    tenant_id: tenantId,
    plan_id: planId,
    amount: plan.price_yearly,
    slip_r2_key: slipR2Key,
    status: 'pending',
    period_start: period.start.toISOString(),
    period_end: period.end.toISOString(),
  });
  if (error) return { ok: false, error: 'บันทึกคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  await logTenantEvent(tenantId, 'subscription_request', 'ok', {
    plan_id: planId,
    amount: plan.price_yearly,
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
  approvedBy: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();

  const { data: sub } = await db
    .from('tenant_subscriptions')
    .select('id, tenant_id, plan_id, status')
    .eq('id', subscriptionId)
    .single();
  if (!sub) return { ok: false, error: 'ไม่พบคำขอ' };
  if (sub.status !== 'pending') return { ok: false, error: 'คำขอนี้ถูกตัดสินไปแล้ว' };

  const { data: tenant } = await db
    .from('tenants')
    .select('slug, subscription_ends_at')
    .eq('id', sub.tenant_id)
    .single();
  if (!tenant) return { ok: false, error: 'ไม่พบร้านค้า' };

  const period = computePeriod(tenant.subscription_ends_at);
  const now = new Date().toISOString();

  // กันอนุมัติซ้อน: อัปเดตเฉพาะเมื่อยัง pending
  const { data: updated, error: subError } = await db
    .from('tenant_subscriptions')
    .update({
      status: 'approved',
      approved_by: approvedBy,
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
    actor: approvedBy,
  });
  return { ok: true };
}

/** super admin ปฏิเสธสลิปค่าแพลน — เก็บแถวไว้เป็นหลักฐาน ร้านส่งใหม่ได้ */
export async function rejectSubscription(
  subscriptionId: string,
  reason: string,
  rejectedBy: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!reason.trim()) return { ok: false, error: 'กรุณากรอกเหตุผลที่ปฏิเสธ' };

  const db = createAdminClient();
  const { data: updated, error } = await db
    .from('tenant_subscriptions')
    .update({
      status: 'rejected',
      reject_reason_th: reason.trim(),
      approved_by: rejectedBy, // ผู้ตัดสิน (ใช้ช่องเดียวกัน — approved_at ว่างแยกแยะได้)
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
    actor: rejectedBy,
  });
  return { ok: true };
}
