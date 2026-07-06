'use server';

import { redirect } from 'next/navigation';
import { userRole, userTenantId } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';

export interface LoginState {
  error?: string;
}

// ข้อความ error รวมทุกกรณี (อีเมล/รหัสผ่านผิด/คนละร้าน) — กัน enumeration
const GENERIC_ERROR = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: GENERIC_ERROR };
  }

  const ctx = await getTenantContext();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: GENERIC_ERROR };
  }

  // Phase 2 (§2.4): login ต้อง scope ตาม tenant ของ host —
  // บัญชีร้าน A ใช้ที่ host ร้าน B ไม่ได้ (ตอบ error เดียวกัน กันเดาว่าบัญชีมีจริง)
  const role = userRole(data.user);
  const isStoreRole = role === 'store_owner' || role === 'store_staff';
  if (!isStoreRole || userTenantId(data.user) !== ctx.tenantId) {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  redirect('/admin/products');
}
