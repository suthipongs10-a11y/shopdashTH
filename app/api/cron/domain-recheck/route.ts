// Cron รายวัน (§7.5) — re-check โดเมนสถานะ active: DNS หายภายหลัง fail 3 วันติด →
// เปลี่ยนเป็น error + แจ้งร้าน (log) — ห้ามลบแถวเอง

import { NextResponse, type NextRequest } from 'next/server';
import { runDomainChecks, type CustomDomainRow } from '@/lib/domains';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';

const FAIL_DAYS_BEFORE_ERROR = 3;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data } = await db.from('custom_domains').select('*').eq('status', 'active');
  const domains = (data ?? []) as CustomDomainRow[];

  const results: { domain: string; ok: boolean; failCount: number }[] = [];

  for (const row of domains) {
    // โดเมน managed (แพลตฟอร์มจดเอง) ไม่มี TXT ยืนยันเจ้าของ — วัดจาก CNAME/A พอ
    const check = await runDomainChecks(row, { skipTxt: row.managed });
    const stillOk = check.status === 'active';
    const failCount = stillOk ? 0 : row.recheck_fail_count + 1;
    const becameError = !stillOk && failCount >= FAIL_DAYS_BEFORE_ERROR;

    const failedDetail = check.checks
      .filter((c) => !c.passed)
      .map((c) => `${c.name}: ${c.detail}`)
      .join(' / ');

    await db
      .from('custom_domains')
      .update({
        // ยังไม่ครบ 3 วัน → คงสถานะ active ไว้ก่อน (DNS อาจสะดุดชั่วคราว)
        status: becameError ? 'error' : 'active',
        recheck_fail_count: failCount,
        last_error_th: stillOk ? null : failedDetail || 'DNS ตรวจไม่ผ่าน',
        checked_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (becameError) {
      // แจ้งร้าน (LINE/อีเมล) — MVP: เขียน audit log ให้ super admin/ร้านเห็นในระบบ
      await logTenantEvent(row.tenant_id, 'custom_domain_broken', 'error', {
        domain: row.domain,
        detail: failedDetail,
      });
    }
    results.push({ domain: row.domain, ok: stillOk, failCount });
  }

  return NextResponse.json({ ok: true, checked: results.length, results });
}
