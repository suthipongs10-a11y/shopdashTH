// Service layer ฝั่งแพลตฟอร์ม (Phase 3) — จัดการ tenant โดย super admin / cron
// ทุกการเปลี่ยนสถานะ/แพลนเขียน audit log ลง provisioning_logs (§7.4)
// เรียกได้จาก server เท่านั้น (service role)

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateTenantCache, type PlanRow } from '@/lib/tenant-context';

export type TenantStatus = 'trial' | 'active' | 'grace' | 'locked' | 'archived';

export const TENANT_STATUS_TH: Record<TenantStatus, string> = {
  trial: 'ทดลองใช้',
  active: 'ใช้งานอยู่',
  grace: 'เลยกำหนดชำระ (ผ่อนผัน)',
  locked: 'ถูกระงับ',
  archived: 'ปิดถาวร',
};

export interface TenantAdminRow {
  id: string;
  slug: string;
  status: TenantStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  locked_at: string | null;
  feature_overrides: Record<string, unknown>;
  created_at: string;
  plans: PlanRow;
  stores: { name: string; theme_code: string; promptpay_id: string | null } | null;
  // tenant_id เป็น unique → PostgREST คืน object เดี่ยว/null (ไม่ใช่ array)
  custom_domains: { domain: string; status: string } | null;
}

/** audit log ลง provisioning_logs — ใช้ทั้ง provisioning จริงและเหตุการณ์จัดการร้าน */
export async function logTenantEvent(
  tenantId: string | null,
  step: string,
  status: 'ok' | 'error',
  detail: Record<string, unknown> = {},
): Promise<void> {
  const db = createAdminClient();
  await db.from('provisioning_logs').insert({ tenant_id: tenantId, step, status, detail });
}

export async function fetchTenantById(tenantId: string): Promise<TenantAdminRow | null> {
  const db = createAdminClient();
  const { data } = await db
    .from('tenants')
    .select(
      'id, slug, status, trial_ends_at, subscription_ends_at, locked_at, feature_overrides, created_at, plans(*), stores(name, theme_code, promptpay_id), custom_domains(domain, status)',
    )
    .eq('id', tenantId)
    .maybeSingle();
  return (data as unknown as TenantAdminRow) ?? null;
}

/**
 * เปลี่ยนสถานะร้าน + เขียน audit log + ล้าง cache — super admin ทำมือได้ทุก transition (§7.4)
 * ตั้ง/ล้าง locked_at อัตโนมัติ เพื่อใช้กับกติกา "locked ครบ 60 วัน → archived"
 */
export async function setTenantStatus(
  tenantId: string,
  to: TenantStatus,
  actor: string,
  reason?: string,
): Promise<void> {
  const db = createAdminClient();
  const { data: tenant } = await db
    .from('tenants')
    .select('slug, status')
    .eq('id', tenantId)
    .single();
  if (!tenant) throw new Error('ไม่พบร้านค้า');

  const patch: Record<string, unknown> = { status: to };
  if (to === 'locked') patch.locked_at = new Date().toISOString();
  if (to === 'active' || to === 'trial' || to === 'grace') patch.locked_at = null;

  const { error } = await db.from('tenants').update(patch).eq('id', tenantId);
  if (error) throw new Error(`เปลี่ยนสถานะร้านไม่สำเร็จ: ${error.message}`);

  invalidateTenantCache(tenant.slug);
  await logTenantEvent(tenantId, 'tenant_status', 'ok', {
    from: tenant.status,
    to,
    actor,
    reason: reason ?? null,
  });
}

export interface DowngradePrecheck {
  ok: boolean;
  warnings: string[];
  productCount: number;
  staffCount: number;
}

/**
 * Pre-check ก่อนดาวน์เกรด (§7.2) — สรุปสิ่งที่จะเกินหลังเปลี่ยนแพลน
 * นโยบาย: ข้อมูลเดิมไม่หาย เกิน limit = ห้ามสร้างเพิ่มเท่านั้น
 */
export async function downgradePrecheck(
  tenantId: string,
  newPlan: PlanRow,
): Promise<DowngradePrecheck> {
  const db = createAdminClient();
  const warnings: string[] = [];

  const { count: productCount } = await db
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);
  const products = productCount ?? 0;
  if (newPlan.max_products >= 0 && products > newPlan.max_products) {
    warnings.push(
      `ร้านมีสินค้า ${products} รายการ เกิน limit ของแพลนใหม่ (${newPlan.max_products}) — สินค้าเดิมยังขายได้ แต่เพิ่มใหม่ไม่ได้จนกว่าจะต่ำกว่า limit`,
    );
  }

  const { data: store } = await db
    .from('stores')
    .select('theme_code')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  let themeTier = 1;
  if (store?.theme_code) {
    const { data: theme } = await db
      .from('theme_registry')
      .select('tier, name_th')
      .eq('code', store.theme_code)
      .maybeSingle();
    themeTier = theme?.tier ?? 1;
    if (themeTier > newPlan.allowed_theme_tier) {
      warnings.push(
        `ธีมปัจจุบัน "${theme?.name_th ?? store.theme_code}" (tier ${themeTier}) เกินสิทธิ์แพลนใหม่ — จะถูกเปลี่ยนเป็นธีมพื้นฐาน (basic-01) อัตโนมัติ`,
      );
    }
  }

  const { data: domains } = await db
    .from('custom_domains')
    .select('domain, status')
    .eq('tenant_id', tenantId);
  const activeDomain = (domains ?? []).find((d) => d.status !== 'suspended');
  const newPlanFeatures = (newPlan.features ?? {}) as Record<string, unknown>;
  if (activeDomain && newPlanFeatures.custom_domain !== true) {
    warnings.push(
      `ร้านใช้ custom domain "${activeDomain.domain}" อยู่ แต่แพลนใหม่ไม่รองรับ — โดเมนจะถูกพักการใช้งาน (subdomain .shopdash.co ยังใช้ได้ปกติ)`,
    );
  }

  // staff = users ใน tenant ที่ role store_staff — Phase 3 ยังไม่มีระบบเชิญ staff (P4)
  // นับจาก auth ไม่ได้โดยตรงผ่านตาราง จึงข้ามการนับจริง (จะเติมใน P4 พร้อมงาน 4.9)
  const staffCount = 0;

  return { ok: warnings.length === 0, warnings, productCount: products, staffCount };
}

/**
 * เปลี่ยนแพลนร้าน — flag คำนวณ realtime จาก plan (§5.2) จึง update plan_id จุดเดียวมีผลทันที
 * บังคับผลข้างเคียงของดาวน์เกรดตาม §7.2 (ธีมเกิน tier → fallback, custom domain → suspended)
 */
export async function changeTenantPlan(
  tenantId: string,
  newPlanId: string,
  actor: string,
): Promise<void> {
  const db = createAdminClient();

  const { data: tenant } = await db
    .from('tenants')
    .select('slug, plan_id, plans(code, name_th)')
    .eq('id', tenantId)
    .single();
  if (!tenant) throw new Error('ไม่พบร้านค้า');

  const { data: newPlan } = await db
    .from('plans')
    .select('*')
    .eq('id', newPlanId)
    .single();
  if (!newPlan) throw new Error('ไม่พบแพลนที่เลือก');
  const plan = newPlan as PlanRow;

  const { error } = await db.from('tenants').update({ plan_id: newPlanId }).eq('id', tenantId);
  if (error) throw new Error(`เปลี่ยนแพลนไม่สำเร็จ: ${error.message}`);

  // ผลข้างเคียงดาวน์เกรด (§7.2)
  const { data: store } = await db
    .from('stores')
    .select('id, theme_code')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (store) {
    const { data: theme } = await db
      .from('theme_registry')
      .select('tier')
      .eq('code', store.theme_code)
      .maybeSingle();
    if ((theme?.tier ?? 1) > plan.allowed_theme_tier) {
      await db.from('stores').update({ theme_code: 'basic-01' }).eq('id', store.id);
    }
  }
  const planFeatures = (plan.features ?? {}) as Record<string, unknown>;
  if (planFeatures.custom_domain !== true) {
    await db
      .from('custom_domains')
      .update({ status: 'suspended' })
      .eq('tenant_id', tenantId)
      .neq('status', 'suspended');
  }

  // staff เกิน limit ใหม่ → disable login คนล่าสุดก่อน (ไม่ลบ §7.2)
  if (plan.max_staff >= 0) {
    const { listStaff, setStaffDisabled } = await import('@/lib/staff');
    const staff = (await listStaff(tenantId)).filter((s) => !s.disabled);
    const excess = staff.slice(plan.max_staff); // เรียงตามวันที่เพิ่ม — ตัดจากท้าย
    for (const member of excess) {
      await setStaffDisabled(tenantId, member.id, true);
    }
  }

  invalidateTenantCache(tenant.slug);
  await logTenantEvent(tenantId, 'plan_change', 'ok', {
    from_plan_id: tenant.plan_id,
    to_plan_id: newPlanId,
    to_plan_code: plan.code,
    actor,
  });
}

/** super admin เปิด/ปิดฟีเจอร์รายร้านทับค่าแพลน (§3.7 ชนะทุกอย่าง) */
export async function setFeatureOverrides(
  tenantId: string,
  overrides: Record<string, boolean>,
  actor: string,
): Promise<void> {
  const db = createAdminClient();
  const { data: tenant } = await db
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .single();
  if (!tenant) throw new Error('ไม่พบร้านค้า');

  const { error } = await db
    .from('tenants')
    .update({ feature_overrides: overrides })
    .eq('id', tenantId);
  if (error) throw new Error(`บันทึก overrides ไม่สำเร็จ: ${error.message}`);

  invalidateTenantCache(tenant.slug);
  await logTenantEvent(tenantId, 'feature_overrides', 'ok', { overrides, actor });
}
