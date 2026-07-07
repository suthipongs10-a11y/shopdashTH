'use server';

import { revalidatePath } from 'next/cache';
import { getStoreUser, userRole } from '@/lib/auth';
import { requestCustomDomain } from '@/lib/domains';
import { assertFeature, FeatureDisabledError } from '@/lib/features';
import { getTenantContext } from '@/lib/tenant-context';

export interface DomainActionState {
  error?: string;
  success?: boolean;
}

export async function submitDomain(
  _prev: DomainActionState,
  formData: FormData,
): Promise<DomainActionState> {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  if (!user || userRole(user) !== 'store_owner') {
    return { error: 'เฉพาะเจ้าของร้านเท่านั้นที่ตั้งค่าโดเมนได้' };
  }
  try {
    assertFeature(ctx, 'custom_domain');
  } catch (err) {
    if (err instanceof FeatureDisabledError) return { error: err.message };
    throw err;
  }

  const result = await requestCustomDomain(ctx, String(formData.get('domain') ?? ''));
  if (!result.ok) return { error: result.error };

  revalidatePath('/admin/domain');
  return { success: true };
}
