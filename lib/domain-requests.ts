// บริการโดเมนส่วนตัว ฿590/ปี (migration 017) — เจ้าของแพลตฟอร์มจัดการให้ทุกขั้นตอน
// flow: ร้านส่งคำขอ (awaiting_payment) → อัปสลิป (slip_uploaded) → แอดมินอนุมัติ (in_progress)
//       → แอดมินจดโดเมน/ตั้ง DNS/เชื่อม Vercel เสร็จ → completed → custom_domains active
// เขียนทุกอย่างผ่าน service role — RLS ให้ร้านอ่านของตัวเองเท่านั้น

import 'server-only';
import { randomBytes } from 'crypto';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/tenant-context';

/** ค่าบริการต่อปี (บาท) — รวมค่าจดโดเมนปีแรก/ค่าต่ออายุ + การตั้งค่าทั้งหมด */
export const DOMAIN_SERVICE_PRICE_YEARLY = 590;

/** ต่ออายุล่วงหน้าได้เมื่อเหลืออายุบริการไม่เกินกี่วัน */
export const RENEWAL_WINDOW_DAYS = 45;

const DOMAIN_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export type DomainRequestKind = 'new' | 'renewal';
export type DomainRequestStatus =
  | 'awaiting_payment'
  | 'slip_uploaded'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled';

/** คำขอที่ยังไม่จบ — มีได้ทีละ 1 คำขอต่อร้าน */
const OPEN_STATUSES: DomainRequestStatus[] = ['awaiting_payment', 'slip_uploaded', 'in_progress'];

export interface DomainRequestRow {
  id: string;
  tenant_id: string;
  kind: DomainRequestKind;
  domain: string;
  note: string | null;
  amount: number;
  status: DomainRequestStatus;
  slip_r2_key: string | null;
  slip_file_hash: string | null;
  reject_reason_th: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export function normalizeDomainInput(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

export function validateDomainName(domain: string): string | null {
  if (!DOMAIN_REGEX.test(domain)) {
    return 'รูปแบบโดเมนไม่ถูกต้อง เช่น baannoi.com หรือ baannoishop.co';
  }
  const rootDomain = process.env.ROOT_DOMAIN ?? 'shopdashth.com';
  if (domain === rootDomain || domain.endsWith(`.${rootDomain}`)) {
    return 'ใช้โดเมนของ ShopDash เป็นโดเมนส่วนตัวไม่ได้';
  }
  return null;
}

/** คำขอที่ยังไม่จบของร้าน (มีได้ทีละ 1) */
export async function getOpenRequest(tenantId: string): Promise<DomainRequestRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('domain_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', OPEN_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DomainRequestRow) ?? null;
}

export async function listRequests(tenantId: string, limit = 10): Promise<DomainRequestRow[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('domain_requests')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as DomainRequestRow[];
}

/** ร้านส่งคำขอ (จดใหม่ หรือ ต่ออายุ) — สถานะเริ่ม awaiting_payment */
export async function createDomainRequest(
  ctx: TenantContext,
  args: { domain: string; note?: string; kind?: DomainRequestKind },
): Promise<{ ok: true; row: DomainRequestRow } | { ok: false; error: string }> {
  const domain = normalizeDomainInput(args.domain);
  const invalid = validateDomainName(domain);
  if (invalid) return { ok: false, error: invalid };

  const open = await getOpenRequest(ctx.tenantId);
  if (open) {
    return { ok: false, error: 'มีคำขอโดเมนที่กำลังดำเนินการอยู่แล้ว — ติดตามสถานะได้ที่หน้านี้' };
  }

  const db = createAdminClient();

  // โดเมนซ้ำกับร้านอื่นที่ใช้งานอยู่ — บอกตั้งแต่ตอนขอ ไม่ให้เสียเงินฟรี
  const { data: taken } = await db
    .from('custom_domains')
    .select('tenant_id')
    .eq('domain', domain)
    .maybeSingle();
  if (taken && taken.tenant_id !== ctx.tenantId) {
    return { ok: false, error: 'โดเมนนี้ถูกใช้กับร้านอื่นในระบบแล้ว กรุณาเลือกชื่ออื่น' };
  }

  const { data, error } = await db
    .from('domain_requests')
    .insert({
      tenant_id: ctx.tenantId,
      kind: args.kind ?? 'new',
      domain,
      note: args.note?.trim() || null,
      amount: DOMAIN_SERVICE_PRICE_YEARLY,
    })
    .select('*')
    .single();
  if (error || !data) return { ok: false, error: 'บันทึกคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  await logTenantEvent(ctx.tenantId, 'domain_request_created', 'ok', {
    domain,
    kind: args.kind ?? 'new',
  });
  return { ok: true, row: data as DomainRequestRow };
}

/** ร้านยกเลิกคำขอ — เฉพาะที่ยังไม่จ่ายเงิน */
export async function cancelDomainRequest(
  ctx: TenantContext,
  requestId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from('domain_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'awaiting_payment')
    .select('id')
    .maybeSingle();
  if (!data) return { ok: false, error: 'ยกเลิกได้เฉพาะคำขอที่ยังไม่ชำระเงิน' };
  await logTenantEvent(ctx.tenantId, 'domain_request_cancelled', 'ok', { requestId });
  return { ok: true };
}

/** แนบสลิปเข้าคำขอ (เรียกจาก /api/domain-slips หลังอัปไฟล์เข้า R2 แล้ว) */
export async function attachDomainSlip(
  tenantId: string,
  requestId: string,
  slipR2Key: string,
  fileHash: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('domain_requests')
    .update({ status: 'slip_uploaded', slip_r2_key: slipR2Key, slip_file_hash: fileHash })
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .eq('status', 'awaiting_payment')
    .select('id')
    .maybeSingle();
  if (error?.code === '23505') {
    return { ok: false, error: 'สลิปนี้ถูกใช้ไปแล้ว กรุณาตรวจสอบหรือติดต่อทีมงาน' };
  }
  if (error || !data) {
    return { ok: false, error: 'คำขอนี้ไม่อยู่ในสถานะรอชำระเงิน กรุณารีเฟรชหน้า' };
  }
  await logTenantEvent(tenantId, 'domain_request_slip', 'ok', { requestId });
  return { ok: true };
}

// ---------- ฝั่ง Super Admin ----------

/** อนุมัติสลิป → เริ่มดำเนินการ (แอดมินไปจดโดเมน/ตั้งค่าต่อ) */
export async function approveDomainSlip(
  requestId: string,
  adminId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from('domain_requests')
    .update({ status: 'in_progress', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'slip_uploaded')
    .select('tenant_id, domain')
    .maybeSingle();
  if (!data) return { ok: false, error: 'คำขอนี้ไม่อยู่ในสถานะรอตรวจสลิป' };
  await logTenantEvent(data.tenant_id, 'domain_request_approved', 'ok', { requestId });
  return { ok: true };
}

/** ปฏิเสธคำขอ (สลิปไม่ถูกต้อง / โดเมนไม่ว่าง ฯลฯ) — เหตุผลโชว์ให้ร้านเห็น */
export async function rejectDomainRequest(
  requestId: string,
  adminId: string,
  reasonTh: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const reason = reasonTh.trim();
  if (!reason) return { ok: false, error: 'กรุณากรอกเหตุผลที่ปฏิเสธ (ร้านค้าจะเห็นข้อความนี้)' };
  const db = createAdminClient();
  const { data } = await db
    .from('domain_requests')
    .update({
      status: 'rejected',
      reject_reason_th: reason,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('status', ['slip_uploaded', 'in_progress'])
    .select('tenant_id')
    .maybeSingle();
  if (!data) return { ok: false, error: 'คำขอนี้ไม่อยู่ในสถานะที่ปฏิเสธได้' };
  await logTenantEvent(data.tenant_id, 'domain_request_rejected', 'ok', { requestId, reason });
  return { ok: true };
}

/**
 * แอดมินทำงานเสร็จ (จดโดเมน + DNS + Vercel แล้ว) → completed
 * - kind 'new': upsert custom_domains เป็น active + managed + อายุบริการ 1 ปี
 * - kind 'renewal': ขยาย service_ends_at +1 ปีจาก max(วันนี้, วันหมดเดิม)
 */
export async function completeDomainRequest(
  requestId: string,
  adminId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();
  const { data: req } = await db
    .from('domain_requests')
    .select('*')
    .eq('id', requestId)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (!req) return { ok: false, error: 'คำขอนี้ไม่อยู่ในสถานะกำลังดำเนินการ' };
  const row = req as DomainRequestRow;

  const yearMs = 365 * 24 * 60 * 60 * 1000;
  if (row.kind === 'renewal') {
    const { data: current } = await db
      .from('custom_domains')
      .select('id, service_ends_at')
      .eq('tenant_id', row.tenant_id)
      .maybeSingle();
    if (!current) return { ok: false, error: 'ไม่พบโดเมนเดิมของร้านที่จะต่ออายุ' };
    const base = Math.max(
      Date.now(),
      current.service_ends_at ? new Date(current.service_ends_at).getTime() : 0,
    );
    const { error } = await db
      .from('custom_domains')
      .update({
        managed: true,
        service_ends_at: new Date(base + yearMs).toISOString(),
        status: 'active',
      })
      .eq('id', current.id);
    if (error) return { ok: false, error: 'ต่ออายุโดเมนไม่สำเร็จ กรุณาลองใหม่' };
  } else {
    // จดใหม่ — เข้าตาราง custom_domains เป็น active ทันที (แอดมินตั้ง DNS ถูกแล้ว)
    // middleware lookup ใช้แถวนี้ route โดเมน → ร้าน (1 ร้าน 1 โดเมน: upsert ทับของเดิม)
    const { error } = await db.from('custom_domains').upsert(
      {
        tenant_id: row.tenant_id,
        domain: row.domain,
        verification_token: randomBytes(16).toString('hex'),
        status: 'active',
        managed: true,
        service_ends_at: new Date(Date.now() + yearMs).toISOString(),
        last_error_th: null,
        recheck_fail_count: 0,
        checked_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' },
    );
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'โดเมนนี้ถูกใช้กับร้านอื่นแล้ว — ปฏิเสธคำขอพร้อมแจ้งร้านแทน' };
      }
      return { ok: false, error: 'บันทึกโดเมนไม่สำเร็จ กรุณาลองใหม่' };
    }
  }

  await db
    .from('domain_requests')
    .update({
      status: 'completed',
      reviewed_by: adminId,
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  await logTenantEvent(row.tenant_id, 'domain_request_completed', 'ok', {
    requestId,
    domain: row.domain,
    kind: row.kind,
  });
  return { ok: true };
}
