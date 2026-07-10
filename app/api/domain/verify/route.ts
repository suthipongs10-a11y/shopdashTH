// POST /api/domain/verify — ปุ่ม "ตรวจสอบ DNS" (งาน 4.8 §7.5)
// ตรวจสิทธิ์: เจ้าของร้าน + แพลนมีฟีเจอร์ custom_domain (server ตรวจเสมอ — DoD 6)

import { NextResponse } from 'next/server';
import { getStoreUser, userRole } from '@/lib/auth';
import { isRateLimited, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { checkAndPersistDomain, getCustomDomain } from '@/lib/domains';
import { getTenantContext, TenantNotFoundError } from '@/lib/tenant-context';

export async function POST() {
  try {
    const ctx = await getTenantContext();
    const user = await getStoreUser(ctx);
    if (!user || userRole(user) !== 'store_owner') {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบด้วยบัญชีเจ้าของร้าน' }, { status: 401 });
    }
    if (!ctx.features.custom_domain) {
      return NextResponse.json(
        { error: 'ฟีเจอร์ custom domain ใช้ได้กับแพลน Pro ขึ้นไป' },
        { status: 403 },
      );
    }

    // DNS lookup จริงหลายรายการต่อคลิก — จำกัดต่อร้าน
    if (isRateLimited(`domain-verify:${ctx.tenantId}`, 10, 600_000)) {
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const row = await getCustomDomain(ctx.tenantId);
    if (!row) return NextResponse.json({ error: 'ยังไม่ได้ตั้งค่าโดเมน' }, { status: 404 });
    if (row.status === 'suspended') {
      return NextResponse.json(
        { error: 'โดเมนถูกพักการใช้งานตามแพลนปัจจุบัน — อัปเกรดแพลนเพื่อเปิดใช้อีกครั้ง' },
        { status: 403 },
      );
    }

    const result = await checkAndPersistDomain(row);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error('[api/domain/verify]', err);
    return NextResponse.json(
      { error: 'ตรวจสอบ DNS ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' },
      { status: 500 },
    );
  }
}
