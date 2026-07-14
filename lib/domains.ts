// Custom domain (งาน 4.8 — §2.4 v1.1 + §7.5)
// flow: ร้านกรอกโดเมน → ระบบสร้าง TXT token + แนะนำ DNS → ปุ่ม "ตรวจสอบ DNS" ทำ 3 เช็คแยกข้อ
// สถานะ: pending → verifying → verified → active / error / suspended (§7.2)
// subdomain .shopdashth.com ใช้ได้เสมอ — custom domain เป็น "เพิ่ม" ไม่ใช่ "แทนที่"

import 'server-only';
import { randomBytes } from 'crypto';
import dns from 'dns/promises';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/tenant-context';

// ค่าที่ DNS ของร้านต้องชี้มา (ตาม instruction ของ Vercel §2.4)
export const VERCEL_APEX_A = '76.76.21.21';
export function cnameTarget(): string {
  return `cname.${process.env.ROOT_DOMAIN ?? 'shopdashth.com'}`;
}

const DOMAIN_REGEX = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

export interface CustomDomainRow {
  id: string;
  tenant_id: string;
  domain: string;
  verification_token: string;
  status: 'pending' | 'verifying' | 'verified' | 'active' | 'error' | 'suspended';
  last_error_th: string | null;
  recheck_fail_count: number;
  checked_at: string | null;
}

export async function getCustomDomain(tenantId: string): Promise<CustomDomainRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('custom_domains')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return (data as CustomDomainRow) ?? null;
}

/** ร้านกรอก/เปลี่ยนโดเมน — 1 ร้าน 1 โดเมน (v1.1) เปลี่ยนโดเมน = reset token+สถานะ */
export async function requestCustomDomain(
  ctx: TenantContext,
  rawDomain: string,
): Promise<{ ok: true; row: CustomDomainRow } | { ok: false; error: string }> {
  const domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!DOMAIN_REGEX.test(domain)) {
    return { ok: false, error: 'รูปแบบโดเมนไม่ถูกต้อง เช่น baannoi.com หรือ shop.baannoi.com' };
  }
  const rootDomain = process.env.ROOT_DOMAIN ?? 'shopdashth.com';
  if (domain === rootDomain || domain.endsWith(`.${rootDomain}`)) {
    return { ok: false, error: 'ใช้โดเมนของ ShopDash เป็น custom domain ไม่ได้' };
  }

  const db = createAdminClient();
  const token = randomBytes(16).toString('hex');
  const { data, error } = await db
    .from('custom_domains')
    .upsert(
      {
        tenant_id: ctx.tenantId,
        domain,
        verification_token: token,
        status: 'pending',
        last_error_th: null,
        recheck_fail_count: 0,
        checked_at: null,
      },
      { onConflict: 'tenant_id' },
    )
    .select('*')
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      return { ok: false, error: 'โดเมนนี้ถูกใช้กับร้านอื่นแล้ว' };
    }
    return { ok: false, error: 'บันทึกโดเมนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  }

  await logTenantEvent(ctx.tenantId, 'custom_domain_requested', 'ok', { domain });
  return { ok: true, row: data as CustomDomainRow };
}

export interface DomainCheckItem {
  name: string;
  passed: boolean;
  /** "ค่าที่พบจริง vs ค่าที่ต้องเป็น" (§7.5) */
  detail: string;
}

export interface DomainCheckResult {
  status: CustomDomainRow['status'];
  checks: DomainCheckItem[];
}

async function safeResolveTxt(domain: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(domain)).map((chunks) => chunks.join(''));
  } catch {
    return [];
  }
}

/**
 * ตรวจ DNS 3 เช็คแยกและรายงานแยกข้อ (§7.5):
 * (1) TXT shopdash-verify={token}  (2) CNAME/A ชี้ถูก  (3) HTTPS ตอบสนอง
 */
export async function runDomainChecks(row: CustomDomainRow): Promise<DomainCheckResult> {
  const checks: DomainCheckItem[] = [];
  const expectedTxt = `shopdash-verify=${row.verification_token}`;

  // hook ทดสอบ (แบบเดียวกับ MockSlipVerifier): DOMAIN_VERIFY_MOCK=pass ให้ผ่านทุกเช็ค
  // ใช้เดิน state pending→verifying→active ใน e2e โดยไม่ต้องมีโดเมนจริง — ห้ามตั้งใน production
  if (process.env.DOMAIN_VERIFY_MOCK === 'pass') {
    return {
      status: 'active',
      checks: [
        { name: 'TXT ยืนยันความเป็นเจ้าของ', passed: true, detail: `(mock) พบ "${expectedTxt}"` },
        { name: 'CNAME / A record ชี้เข้าระบบ', passed: true, detail: `(mock) ชี้ไป ${cnameTarget()}` },
        { name: 'HTTPS / ใบรับรอง', passed: true, detail: '(mock) ใช้งานได้' },
      ],
    };
  }

  // ---------- (1) TXT verification ----------
  const txtRecords = await safeResolveTxt(row.domain);
  const txtOk = txtRecords.includes(expectedTxt);
  checks.push({
    name: 'TXT ยืนยันความเป็นเจ้าของ',
    passed: txtOk,
    detail: txtOk
      ? `พบ TXT "${expectedTxt}" ถูกต้อง`
      : txtRecords.length > 0
        ? `พบ TXT ${txtRecords.map((t) => `"${t.slice(0, 40)}"`).join(', ')} — ต้องมี "${expectedTxt}"`
        : `ไม่พบ TXT record — ต้องเพิ่มค่า "${expectedTxt}" ที่โดเมน ${row.domain}`,
  });

  // ---------- (2) CNAME (www/subdomain) หรือ A record (apex) ----------
  const target = cnameTarget();
  let pointOk = false;
  let pointDetail = '';
  try {
    const cnames = await dns.resolveCname(row.domain);
    pointOk = cnames.some((c) => c.toLowerCase() === target);
    pointDetail = pointOk
      ? `พบ CNAME ชี้ไป ${target} ถูกต้อง`
      : `พบ CNAME ชี้ไป ${cnames.join(', ')} — ต้องแก้เป็น ${target}`;
  } catch {
    try {
      const ips = await dns.resolve4(row.domain);
      pointOk = ips.includes(VERCEL_APEX_A);
      pointDetail = pointOk
        ? `พบ A record ${VERCEL_APEX_A} ถูกต้อง`
        : `พบ A record ${ips.join(', ')} — ต้องแก้เป็น ${VERCEL_APEX_A}`;
    } catch {
      pointDetail = `ไม่พบ CNAME/A record — ตั้ง CNAME ชี้ไป ${target} (subdomain) หรือ A record ${VERCEL_APEX_A} (โดเมนหลัก)`;
    }
  }
  checks.push({ name: 'CNAME / A record ชี้เข้าระบบ', passed: pointOk, detail: pointDetail });

  // ---------- (3) HTTPS (ตรวจจาก platform hosting — เช็คเบื้องต้น) ----------
  let httpsOk = false;
  let httpsDetail = '';
  if (pointOk) {
    try {
      const res = await fetch(`https://${row.domain}`, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
      });
      httpsOk = res.status < 500;
      httpsDetail = httpsOk
        ? 'HTTPS ใช้งานได้ (ออกใบรับรองแล้ว)'
        : `HTTPS ตอบ ${res.status} — อาจกำลังออกใบรับรอง รอสักครู่แล้วตรวจใหม่`;
    } catch {
      httpsDetail = 'ยังเชื่อมต่อ HTTPS ไม่ได้ — ใบรับรองอาจกำลังออก (รอได้ถึง 24 ชม. หลัง DNS ถูกต้อง)';
    }
  } else {
    httpsDetail = 'ข้ามการตรวจ — ต้องผ่านเช็ค CNAME/A ก่อน';
  }
  checks.push({ name: 'HTTPS / ใบรับรอง', passed: httpsOk, detail: httpsDetail });

  // ---------- สรุปสถานะ (§7.5): TXT → verified, TXT+ชี้ถูก → active ----------
  let status: CustomDomainRow['status'];
  if (txtOk && pointOk) status = 'active';
  else if (txtOk) status = 'verified';
  else status = 'error';

  return { status, checks };
}

/** รันเช็ค + บันทึกผลลงตาราง — ใช้ทั้งปุ่ม "ตรวจสอบ DNS" และ cron re-check */
export async function checkAndPersistDomain(row: CustomDomainRow): Promise<DomainCheckResult> {
  const db = createAdminClient();
  await db.from('custom_domains').update({ status: 'verifying' }).eq('id', row.id);

  const result = await runDomainChecks(row);
  const failedDetail = result.checks
    .filter((c) => !c.passed)
    .map((c) => `${c.name}: ${c.detail}`)
    .join(' / ');

  await db
    .from('custom_domains')
    .update({
      status: result.status,
      last_error_th: result.status === 'active' ? null : failedDetail || null,
      checked_at: new Date().toISOString(),
      recheck_fail_count: 0, // นับเฉพาะ cron re-check ของโดเมน active (§7.5)
    })
    .eq('id', row.id);

  await logTenantEvent(row.tenant_id, 'custom_domain_check', 'ok', {
    domain: row.domain,
    result: result.status,
  });
  return result;
}
