'use server';

// บริการโดเมนส่วนตัว ฿590/ปี — ร้านส่งคำขอ/ยกเลิก/ขอต่ออายุ (ทีมงานแพลตฟอร์มจัดการให้)

import { revalidatePath } from 'next/cache';
import { getStoreUser, userRole } from '@/lib/auth';
import {
  cancelDomainRequest,
  createDomainRequest,
} from '@/lib/domain-requests';
import { getCustomDomain } from '@/lib/domains';
import { assertFeature, FeatureDisabledError } from '@/lib/features';
import { getTenantContext, type TenantContext } from '@/lib/tenant-context';

export interface DomainActionState {
  error?: string;
  success?: boolean;
}

async function ownerContext(): Promise<
  { ok: true; ctx: TenantContext } | { ok: false; error: string }
> {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  if (!user || userRole(user) !== 'store_owner') {
    return { ok: false, error: 'เฉพาะเจ้าของร้านเท่านั้นที่จัดการโดเมนได้' };
  }
  try {
    assertFeature(ctx, 'custom_domain');
  } catch (err) {
    if (err instanceof FeatureDisabledError) return { ok: false, error: err.message };
    throw err;
  }
  return { ok: true, ctx };
}

/** ส่งคำขอจดโดเมนใหม่ */
export async function requestDomainAction(
  _prev: DomainActionState,
  formData: FormData,
): Promise<DomainActionState> {
  const guard = await ownerContext();
  if (!guard.ok) return { error: guard.error };

  const result = await createDomainRequest(guard.ctx, {
    domain: String(formData.get('domain') ?? ''),
    note: String(formData.get('note') ?? ''),
    kind: 'new',
  });
  if (!result.ok) return { error: result.error };

  revalidatePath('/admin/domain');
  return { success: true };
}

/** ขอต่ออายุโดเมนเดิม (โดเมนที่แพลตฟอร์มดูแลอยู่) */
export async function renewDomainAction(
  _prev: DomainActionState,
  _formData: FormData,
): Promise<DomainActionState> {
  const guard = await ownerContext();
  if (!guard.ok) return { error: guard.error };

  const current = await getCustomDomain(guard.ctx.tenantId);
  if (!current || !current.managed) {
    return { error: 'ไม่พบโดเมนที่ระบบดูแลอยู่ — ติดต่อทีมงานหากต้องการความช่วยเหลือ' };
  }

  const result = await createDomainRequest(guard.ctx, {
    domain: current.domain,
    kind: 'renewal',
  });
  if (!result.ok) return { error: result.error };

  revalidatePath('/admin/domain');
  return { success: true };
}

/** ยกเลิกคำขอที่ยังไม่ชำระเงิน */
export async function cancelRequestAction(
  requestId: string,
  _prev: DomainActionState,
  _formData: FormData,
): Promise<DomainActionState> {
  const guard = await ownerContext();
  if (!guard.ok) return { error: guard.error };

  const result = await cancelDomainRequest(guard.ctx, requestId);
  if (!result.ok) return { error: result.error };

  revalidatePath('/admin/domain');
  return { success: true };
}
