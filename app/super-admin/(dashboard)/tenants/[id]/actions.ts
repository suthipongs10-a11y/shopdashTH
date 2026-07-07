'use server';

import { revalidatePath } from 'next/cache';
import { getSuperAdminUser } from '@/lib/auth';
import type { FeatureKey } from '@/lib/features';
import {
  changeTenantPlan,
  downgradePrecheck,
  fetchTenantById,
  setFeatureOverrides,
  setTenantStatus,
  type TenantStatus,
} from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanRow } from '@/lib/tenant-context';

async function requireSuperAdmin() {
  const user = await getSuperAdminUser();
  if (!user) throw new Error('ไม่มีสิทธิ์ดำเนินการ');
  return user;
}

// ---------- เปลี่ยนสถานะ (lock/unlock มือ §2.4) ----------

export interface StatusActionState {
  error?: string;
  done?: boolean;
}

const MANUAL_STATUSES: TenantStatus[] = ['trial', 'active', 'grace', 'locked', 'archived'];

export async function superSetTenantStatus(
  tenantId: string,
  _prev: StatusActionState,
  formData: FormData,
): Promise<StatusActionState> {
  try {
    const user = await requireSuperAdmin();
    const to = String(formData.get('status') ?? '') as TenantStatus;
    const reason = String(formData.get('reason') ?? '').trim();
    if (!MANUAL_STATUSES.includes(to)) return { error: 'สถานะไม่ถูกต้อง' };

    await setTenantStatus(tenantId, to, user.email ?? user.id, reason || undefined);
    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath('/tenants');
    return { done: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'ดำเนินการไม่สำเร็จ' };
  }
}

// ---------- เปลี่ยนแพลน + pre-check ดาวน์เกรด (§7.2) ----------

export interface PlanChangeState {
  error?: string;
  done?: boolean;
  /** มี warnings = ต้องกดยืนยันรับทราบก่อน (§7.2) */
  warnings?: string[];
  pendingPlanId?: string;
}

export async function superChangePlan(
  tenantId: string,
  _prev: PlanChangeState,
  formData: FormData,
): Promise<PlanChangeState> {
  try {
    const user = await requireSuperAdmin();
    const planId = String(formData.get('plan_id') ?? '');
    const confirmed = formData.get('confirmed') === '1';
    if (!planId) return { error: 'กรุณาเลือกแพลน' };

    const tenant = await fetchTenantById(tenantId);
    if (!tenant) return { error: 'ไม่พบร้านค้า' };
    if (tenant.plans.id === planId) return { error: 'ร้านใช้แพลนนี้อยู่แล้ว' };

    const db = createAdminClient();
    const { data: newPlan } = await db.from('plans').select('*').eq('id', planId).single();
    if (!newPlan) return { error: 'ไม่พบแพลนที่เลือก' };

    // pre-check ก่อนเสมอ — มี warning และยังไม่ยืนยัน = หยุดรอ super admin รับทราบ
    if (!confirmed) {
      const check = await downgradePrecheck(tenantId, newPlan as PlanRow);
      if (!check.ok) return { warnings: check.warnings, pendingPlanId: planId };
    }

    await changeTenantPlan(tenantId, planId, user.email ?? user.id);
    revalidatePath(`/tenants/${tenantId}`);
    revalidatePath('/tenants');
    return { done: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'เปลี่ยนแพลนไม่สำเร็จ' };
  }
}

// ---------- Feature overrides รายร้าน (§3.7) ----------

export interface OverridesState {
  error?: string;
  done?: boolean;
}

const OVERRIDE_KEYS: FeatureKey[] = [
  'custom_domain',
  'slip_verify_api',
  'line_oa',
  'discount_codes',
  'analytics_dashboard',
  'staff_accounts',
  'wishlist',
  'related_products',
];

export async function superSaveOverrides(
  tenantId: string,
  _prev: OverridesState,
  formData: FormData,
): Promise<OverridesState> {
  try {
    const user = await requireSuperAdmin();
    const overrides: Record<string, boolean> = {};
    for (const key of OVERRIDE_KEYS) {
      const value = String(formData.get(`override_${key}`) ?? 'inherit');
      if (value === 'on') overrides[key] = true;
      if (value === 'off') overrides[key] = false;
      // 'inherit' = ไม่ใส่ key → ใช้ค่าจากแพลน/ธีมตาม resolveFeatures
    }
    await setFeatureOverrides(tenantId, overrides, user.email ?? user.id);
    revalidatePath(`/tenants/${tenantId}`);
    return { done: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'บันทึกไม่สำเร็จ' };
  }
}
