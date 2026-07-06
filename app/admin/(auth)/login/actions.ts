'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export interface LoginState {
  error?: string;
}

// ข้อความ error รวมทุกกรณี (อีเมล/รหัสผ่านผิด) — กัน enumeration ว่าอีเมลไหนมีในระบบ
const GENERIC_ERROR = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: GENERIC_ERROR };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: GENERIC_ERROR };
  }

  redirect('/admin/products');
}
