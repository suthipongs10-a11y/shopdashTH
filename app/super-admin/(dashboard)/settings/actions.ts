'use server';

import { revalidatePath } from 'next/cache';
import { getSuperAdminUser } from '@/lib/auth';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { isValidPromptpayId } from '@/lib/promptpay';
import { createAdminClient } from '@/lib/supabase/admin';

export interface SettingsActionState {
  error?: string;
  done?: boolean;
}

export async function savePlatformPromptpay(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const id = String(formData.get('promptpay_id') ?? '').trim();
  const name = String(formData.get('promptpay_name') ?? '').trim();

  if (!isValidPromptpayId(id)) {
    return {
      error:
        'PromptPay ID ต้องเป็นเบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก (ที่ผูกพร้อมเพย์ไว้ — ไม่ใช่เลขบัญชีธนาคาร)',
    };
  }
  if (!name) return { error: 'กรุณากรอกชื่อบัญชี (โชว์ให้ร้านเทียบตอนจ่าย)' };

  const db = createAdminClient();
  const { error } = await db
    .from('platform_settings')
    .upsert({ id: 1, promptpay_id: id, promptpay_name: name, updated_at: new Date().toISOString() });

  if (error) {
    return { error: `บันทึกไม่สำเร็จ: ${error.message} (ตรวจว่ารัน migration 011 บน Supabase แล้ว)` };
  }

  await logTenantEvent(null, 'platform_promptpay_updated', 'ok', { actor: user.email ?? user.id });
  revalidatePath('/settings');
  return { done: true };
}
