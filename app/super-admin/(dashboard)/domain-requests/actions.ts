'use server';

// จัดการคำขอโดเมน (บริการ ฿590/ปี — migration 017) ฝั่ง Super Admin

import { revalidatePath } from 'next/cache';
import { getSuperAdminUser } from '@/lib/auth';
import {
  approveDomainSlip,
  completeDomainRequest,
  rejectDomainRequest,
} from '@/lib/domain-requests';
import { getCustomDomain, runDomainChecks, type DomainCheckItem } from '@/lib/domains';
import { createAdminClient } from '@/lib/supabase/admin';

export interface DomainAdminActionState {
  error?: string;
  done?: boolean;
  /** ผลตรวจ DNS (เฉพาะ action ตรวจ DNS) */
  checks?: DomainCheckItem[];
}

export async function approveDomainSlipAction(
  requestId: string,
  _prev: DomainAdminActionState,
  _formData: FormData,
): Promise<DomainAdminActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const result = await approveDomainSlip(requestId, user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath('/domain-requests');
  return { done: true };
}

export async function rejectDomainRequestAction(
  requestId: string,
  _prev: DomainAdminActionState,
  formData: FormData,
): Promise<DomainAdminActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const result = await rejectDomainRequest(requestId, user.id, String(formData.get('reason') ?? ''));
  if (!result.ok) return { error: result.error };

  revalidatePath('/domain-requests');
  return { done: true };
}

export async function completeDomainRequestAction(
  requestId: string,
  _prev: DomainAdminActionState,
  _formData: FormData,
): Promise<DomainAdminActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const result = await completeDomainRequest(requestId, user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath('/domain-requests');
  revalidatePath('/tenants');
  return { done: true };
}

/** เครื่องมือตรวจ DNS ของโดเมนในคำขอ — ใช้เช็คงานตัวเองก่อนกด "ทำเสร็จ"
 *  (flow managed ข้ามเช็ค TXT — ระบบเป็นคนจดโดเมนเอง ดู CNAME/A + HTTPS เป็นหลัก) */
export async function checkRequestDnsAction(
  requestId: string,
  _prev: DomainAdminActionState,
  _formData: FormData,
): Promise<DomainAdminActionState> {
  const user = await getSuperAdminUser();
  if (!user) return { error: 'ไม่มีสิทธิ์ดำเนินการ' };

  const db = createAdminClient();
  const { data: req } = await db
    .from('domain_requests')
    .select('tenant_id, domain')
    .eq('id', requestId)
    .maybeSingle();
  if (!req) return { error: 'ไม่พบคำขอ' };

  const existing = await getCustomDomain(req.tenant_id);
  const result = await runDomainChecks(
    {
      id: existing?.id ?? requestId,
      tenant_id: req.tenant_id,
      domain: req.domain,
      verification_token: existing?.verification_token ?? '',
      status: existing?.status ?? 'pending',
      last_error_th: null,
      recheck_fail_count: 0,
      checked_at: null,
      managed: existing?.managed ?? true,
      service_ends_at: existing?.service_ends_at ?? null,
    },
    { skipTxt: true },
  );
  return { checks: result.checks };
}
