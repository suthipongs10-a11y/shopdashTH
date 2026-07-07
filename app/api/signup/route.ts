// POST /api/signup — auto-provisioning (§5.3) เรียกจากหน้า public signup เท่านั้น
// service role — validate ทุกอย่างฝั่ง server ไม่เชื่อ client

import { NextResponse, type NextRequest } from 'next/server';
import { checkSlug, provisionTenant } from '@/lib/provisioning';

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

  return NextResponse.json({ ok: true, slug: result.slug });
}

// GET /api/signup?slug=xxx — เช็ค slug ว่างแบบ realtime ระหว่างพิมพ์
export async function GET(req: NextRequest) {
  const slug = (req.nextUrl.searchParams.get('slug') ?? '').trim().toLowerCase();
  if (!slug) return NextResponse.json({ available: false, reason: 'กรุณากรอกชื่อ subdomain' });
  const result = await checkSlug(slug);
  return NextResponse.json(result);
}
