// Custom domain (งาน 4.8 — §2.4 v1.1 + §7.5)
// flow: ร้านกรอกโดเมน → ระบบสร้าง TXT token + แนะนำ DNS → ปุ่ม "ตรวจสอบ DNS" ทำ 3 เช็คแยกข้อ
// สถานะ: pending → verifying → verified → active / error / suspended (§7.2)
// subdomain .shopdashth.com ใช้ได้เสมอ — custom domain เป็น "เพิ่ม" ไม่ใช่ "แทนที่"

import 'server-only';
import dns from 'dns/promises';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';

// ค่าที่ DNS ต้องชี้มา (ตาม instruction ของ Vercel §2.4) — โชว์ใน checklist ของ super admin
// หมายเหตุ 2026-07-17: flow self-service เดิมถูกแทนด้วย "คำขอโดเมน" (lib/domain-requests.ts,
// แอดมินจัดการ DNS ให้ ฿590/ปี) — ฟังก์ชันตรวจ DNS ในไฟล์นี้ยังใช้: เครื่องมือ super admin + cron
export const VERCEL_APEX_A = '76.76.21.21';
export function cnameTarget(): string {
  return `cname.${process.env.ROOT_DOMAIN ?? 'shopdashth.com'}`;
}

export interface CustomDomainRow {
  id: string;
  tenant_id: string;
  domain: string;
  verification_token: string;
  status: 'pending' | 'verifying' | 'verified' | 'active' | 'error' | 'suspended';
  last_error_th: string | null;
  recheck_fail_count: number;
  checked_at: string | null;
  /** โดเมนที่แพลตฟอร์มจด/ดูแลให้ (บริการ ฿590/ปี — migration 017) */
  managed: boolean;
  /** วันหมดอายุบริการรายปี (เฉพาะ managed) */
  service_ends_at: string | null;
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
 * opts.skipTxt: โดเมนที่แพลตฟอร์มจด/ดูแลเอง (managed) ไม่ต้องยืนยันความเป็นเจ้าของด้วย TXT
 * — สถานะวัดจากเช็ค CNAME/A อย่างเดียว (ไม่งั้น cron จะตีโดเมน managed เป็น error ผิดๆ)
 */
export async function runDomainChecks(
  row: CustomDomainRow,
  opts: { skipTxt?: boolean } = {},
): Promise<DomainCheckResult> {
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

  // ---------- (1) TXT verification (ข้ามเมื่อ managed — ระบบเป็นคนจดโดเมนเอง) ----------
  let txtOk = true;
  if (opts.skipTxt) {
    checks.push({
      name: 'TXT ยืนยันความเป็นเจ้าของ',
      passed: true,
      detail: 'ข้าม — โดเมนที่ระบบดูแลเอง ไม่ต้องยืนยันความเป็นเจ้าของ',
    });
  } else {
    const txtRecords = await safeResolveTxt(row.domain);
    txtOk = txtRecords.includes(expectedTxt);
    checks.push({
      name: 'TXT ยืนยันความเป็นเจ้าของ',
      passed: txtOk,
      detail: txtOk
        ? `พบ TXT "${expectedTxt}" ถูกต้อง`
        : txtRecords.length > 0
          ? `พบ TXT ${txtRecords.map((t) => `"${t.slice(0, 40)}"`).join(', ')} — ต้องมี "${expectedTxt}"`
          : `ไม่พบ TXT record — ต้องเพิ่มค่า "${expectedTxt}" ที่โดเมน ${row.domain}`,
    });
  }

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
