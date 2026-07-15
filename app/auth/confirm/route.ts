// แลก code จากอีเมลรีเซ็ตรหัสผ่าน (PKCE) เป็น session cookie แล้วพาไปหน้าตั้งรหัสผ่านใหม่
// ลิงก์ในอีเมลจาก supabase.auth.resetPasswordForEmail() ชี้มาที่นี่พร้อม ?code=...&next=...

import { NextResponse } from 'next/server';
import { requestOrigin } from '@/lib/request-origin';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin/reset-password';

  // ผ่าน Cloudflare Worker → Vercel เห็น request.url เป็น *.vercel.app; ต้องอ่าน host ร้านจริง
  // จาก x-tenant-host (ไม่งั้น redirect หลุดออกนอกโดเมนร้าน) — ดู lib/request-origin.ts
  const origin = await requestOrigin();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/admin/login?error=ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่อีกครั้ง`,
  );
}
