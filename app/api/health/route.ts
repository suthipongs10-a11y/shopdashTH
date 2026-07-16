// GET /api/health — สำหรับ uptime monitor ภายนอก (UptimeRobot ฯลฯ ดู DEPLOYMENT.md)
// public: ตอบแค่ ok/degraded ต่อ service — "ห้าม" ส่ง detail ภายใน (error message/latency
// ละเอียดอยู่ที่แผงสถานะใน Super Admin เท่านั้น)
// ตัวรายงาน cache 30s ฝั่ง server — โดนยิงถี่ก็ไม่สร้างโหลดไปที่ Supabase/R2 จริง

import { NextResponse, type NextRequest } from 'next/server';
import { getHealthReportCached } from '@/lib/platform/health';
import { clientIp, isRateLimited, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (await isRateLimited(`health:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const report = await getHealthReportCached();
  const body = {
    ok: report.ok,
    checkedAt: report.checkedAt,
    services: Object.fromEntries(
      report.checks.filter((c) => c.key !== 'config').map((c) => [c.key, c.ok ? 'ok' : 'down']),
    ),
  };
  // monitor ทั่วไปตัดสินจาก HTTP status — ล่มบางส่วน = 503
  return NextResponse.json(body, { status: report.ok ? 200 : 503 });
}
