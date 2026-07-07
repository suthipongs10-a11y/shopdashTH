'use server';

import { redirect } from 'next/navigation';
import { userRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export interface SuperLoginState {
  error?: string;
}

// ข้อความ error เดียวทุกกรณี — กัน enumeration
const GENERIC_ERROR = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

export async function superLogin(
  _prevState: SuperLoginState,
  formData: FormData,
): Promise<SuperLoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: GENERIC_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: GENERIC_ERROR };

  // เฉพาะ role super_admin เท่านั้น — บัญชีร้านค้า login ที่นี่ไม่ได้
  if (userRole(data.user) !== 'super_admin') {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  redirect('/tenants');
}
