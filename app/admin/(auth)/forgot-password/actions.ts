'use server';

import { headers } from 'next/headers';
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
    const host = (await headers()).get('host');
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `http://${host}/auth/confirm?next=/admin/reset-password`,
    });
  }

  return { submitted: true };
}
