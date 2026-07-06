// แลก code จากอีเมลรีเซ็ตรหัสผ่าน (PKCE) เป็น session cookie แล้วพาไปหน้าตั้งรหัสผ่านใหม่
// ลิงก์ในอีเมลจาก supabase.auth.resetPasswordForEmail() ชี้มาที่นี่พร้อม ?code=...&next=...

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin/reset-password';

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
