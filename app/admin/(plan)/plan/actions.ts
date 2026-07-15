'use server';

import { revalidatePath } from 'next/cache';
import { getStoreUser, userRole } from '@/lib/auth';
import { downgradePlan } from '@/lib/billing';
import { getTenantContextAllowLocked } from '@/lib/tenant-context';

export interface DowngradeState {
  error?: string;
  done?: boolean;
}

// ดาวน์เกรดแพลน (ฟรี, self-service §7.2) — เฉพาะเจ้าของร้าน
export async function downgradeAction(
  planId: string,
  _prev: DowngradeState,
  _formData: FormData,
): Promise<DowngradeState> {
  const ctx = await getTenantContextAllowLocked();
  const user = await getStoreUser(ctx);
  if (!user || userRole(user) !== 'store_owner') {
    return { error: 'เฉพาะเจ้าของร้านเท่านั้นที่เปลี่ยนแพลนได้' };
  }

  const result = await downgradePlan(ctx.tenantId, planId);
  if (!result.ok) return { error: result.error };

  revalidatePath('/admin/plan');
  return { done: true };
}
