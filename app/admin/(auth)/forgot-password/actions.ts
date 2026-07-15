'use server';

import { requestOrigin } from '@/lib/request-origin';
import { createClient } from '@/lib/supabase/server';

export interface ForgotPasswordState {
  submitted?: boolean;
}

// ตอบผลสำเร็จเสมอไม่ว่าอีเมลจะมีในระบบหรือไม่ — กัน enumeration (เช่นเดียวกับหน้าติดตามออร์เดอร์ §2.1)
export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim();

  if (email) {
    // host ร้านจริงจาก x-tenant-host แม้ผ่าน Cloudflare Worker → Vercel (ดู lib/request-origin.ts)
    const origin = await requestOrigin();
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm?next=/admin/reset-password`,
    });
  }

  return { submitted: true };
}
