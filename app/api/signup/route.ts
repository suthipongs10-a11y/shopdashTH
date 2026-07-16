// POST /api/signup — auto-provisioning (§5.3) เรียกจากหน้า public signup เท่านั้น
// service role — validate ทุกอย่างฝั่ง server ไม่เชื่อ client

import { NextResponse, type NextRequest } from 'next/server';
import { notifyPlatformNewTenant } from '@/lib/platform/line';
import { checkSlug, provisionTenant } from '@/lib/provisioning';
import { clientIp, isRateLimited, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

interface SignupBody {
  storeName?: string;
  slug?: string;
  email?: string;
  password?: string;
  phone?: string;
  planId?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0\d{8,9}$/;

export async function POST(req: NextRequest) {
  // สมัครร้านสร้าง auth user + แถวหลายตาราง — จำกัดแน่นกว่าตัวอื่น
  if (isRateLimited(`signup:${clientIp(req)}`, 5, 3_600_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
  }

  const storeName = (body.storeName ?? '').trim();
  const slug = (body.slug ?? '').trim().toLowerCase();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';
  const phone = (body.phone ?? '').trim();
  const planId = (body.planId ?? '').trim();

  if (!storeName) return NextResponse.json({ error: 'กรุณากรอกชื่อร้าน' }, { status: 400 });
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'รูปแบบอีเมลไม่ถูกต้อง' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' }, { status: 400 });
  }
  if (!PHONE_REGEX.test(phone)) {
    return NextResponse.json(
      { error: 'เบอร์โทรต้องเป็นตัวเลข 9–10 หลัก ขึ้นต้นด้วย 0' },
      { status: 400 },
    );
  }
  if (!planId) return NextResponse.json({ error: 'กรุณาเลือกแพลน' }, { status: 400 });

  const result = await provisionTenant({ storeName, slug, email, password, phone, planId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // แจ้งเจ้าของแพลตฟอร์มทาง LINE (fire-and-forget — ห้ามหน่วง response ของลูกค้า)
  void (async () => {
    const db = createAdminClient();
    const { data: plan } = await db.from('plans').select('name_th').eq('id', planId).maybeSingle();
    await notifyPlatformNewTenant({
      storeName,
      slug: result.slug,
      planName: (plan?.name_th as string | undefined) ?? planId,
      email,
    });
  })().catch(() => undefined);

  return NextResponse.json({ ok: true, slug: result.slug });
}

// GET /api/signup?slug=xxx — เช็ค slug ว่างแบบ realtime ระหว่างพิมพ์
export async function GET(req: NextRequest) {
  // เช็ค slug realtime (debounce ฝั่ง client 400ms) — เพดานกันยิง scan
  if (isRateLimited(`slug-check:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!slug) return NextResponse.json({ available: false, reason: 'กรุณากรอกชื่อ subdomain' });
  const result = await checkSlug(slug);
  return NextResponse.json(result);
}
