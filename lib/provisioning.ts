// Auto-provisioning pipeline (§5.3) — สร้างร้านใหม่จากหน้า signup ในขั้นตอนเดียว
// ทุก step เขียน provisioning_logs / step ใด fail → rollback ทุกอย่างที่สร้างไปแล้ว (ข้อ 8)
// supabase-js ไม่มี transaction ข้าม Auth+DB จึงใช้ compensation แบบเดียวกับ stock (DECISIONS)

import 'server-only';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { seedStarterPack } from '@/lib/starter-pack';
import { createAdminClient } from '@/lib/supabase/admin';

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{2,29}$/;

// §7.6 — slug ที่ห้ามใช้เป็น subdomain ร้าน
export const RESERVED_SLUGS = new Set([
  'admin',
  'www',
  'api',
  'app',
  'mail',
  'shop',
  'demo',
  'blog',
  'help',
  'docs',
  'status',
]);

export type SlugCheck =
  | { available: true }
  | { available: false; reason: string };

/** ตรวจ slug: รูปแบบ + reserved + ยังว่างในตาราง tenants */
export async function checkSlug(slug: string): Promise<SlugCheck> {
  if (!SLUG_REGEX.test(slug)) {
    return {
      available: false,
      reason: 'ต้องเป็นตัวอักษรอังกฤษพิมพ์เล็ก/ตัวเลข/ขีดกลาง ยาว 3–30 ตัว และขึ้นต้นด้วยตัวอักษรหรือตัวเลข',
    };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { available: false, reason: 'ชื่อนี้ถูกสงวนไว้สำหรับระบบ กรุณาเลือกชื่ออื่น' };
  }
  const db = createAdminClient();
  const { data } = await db.from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (data) return { available: false, reason: 'ชื่อนี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น' };
  return { available: true };
}

export interface ProvisionInput {
  storeName: string;
  slug: string;
  email: string;
  password: string;
  phone: string;
  planId: string;
}

export type ProvisionResult =
  | { ok: true; tenantId: string; slug: string }
  | { ok: false; error: string };

const TRIAL_DAYS = 7;

// ธีมเริ่มต้นตามแพลน — ให้ตรงกับเทมเพลตที่หน้า landing ใช้ขายแพลนนั้น (ลูกค้าเห็นภาพไหน
// ตอนตัดสินใจสมัคร ต้องได้ภาพนั้น) — แพลนอื่น/แพลนเก่า fallback เป็น basic-01
const STARTER_THEME_BY_PLAN: Record<string, string> = {
  'p1-start': 't1-simple',
  'p2-shop': 't2-store',
  'p3-business': 't3-hub',
  'p4-premium': 't4-luxe',
};

export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  const db = createAdminClient();
  const { storeName, slug, email, password, phone, planId } = input;

  // ---------- validate ก่อนสร้างอะไรทั้งนั้น ----------
  const slugCheck = await checkSlug(slug);
  if (!slugCheck.available) return { ok: false, error: slugCheck.reason };

  const { data: plan } = await db
    .from('plans')
    .select('id, code, is_active, features')
    .eq('id', planId)
    .maybeSingle();
  if (!plan || !plan.is_active) return { ok: false, error: 'ไม่พบแพลนที่เลือก' };

  // สิ่งที่สร้างแล้ว — ไว้ rollback ถ้า step ถัดไป fail
  let userId: string | null = null;
  let tenantId: string | null = null;

  async function rollback(failedStep: string, cause: string): Promise<void> {
    await logTenantEvent(tenantId, `provision:${failedStep}`, 'error', { slug, cause });
    if (tenantId) {
      // ลบลูกก่อนแม่ — products (ตัวอย่าง) อ้าง categories, categories/stores อ้าง tenant
      await db.from('products').delete().eq('tenant_id', tenantId);
      await db.from('pages').delete().eq('tenant_id', tenantId);
      await db.from('categories').delete().eq('tenant_id', tenantId);
      await db.from('stores').delete().eq('tenant_id', tenantId);
      await db.from('tenants').delete().eq('id', tenantId);
    }
    if (userId) await db.auth.admin.deleteUser(userId);
    await logTenantEvent(tenantId, 'provision:rollback', 'ok', { slug, failed_step: failedStep });
  }

  // ---------- step 3: สร้าง auth user ----------
  const { data: created, error: userError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone },
  });
  if (userError || !created.user) {
    const duplicate = userError?.message.toLowerCase().includes('already');
    return {
      ok: false,
      error: duplicate
        ? 'อีเมลนี้ถูกใช้สมัครแล้ว หากเป็นของคุณ กรุณาเข้าสู่ระบบหรือใช้เมนูลืมรหัสผ่าน'
        : 'สร้างบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    };
  }
  userId = created.user.id;
  await logTenantEvent(null, 'provision:auth_user', 'ok', { slug, user_id: userId });

  // ---------- step 4: INSERT tenants (trial 7 วัน) ----------
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: tenant, error: tenantError } = await db
    .from('tenants')
    .insert({ slug, plan_id: planId, status: 'trial', trial_ends_at: trialEndsAt })
    .select('id')
    .single();
  if (tenantError || !tenant) {
    await rollback('tenant', tenantError?.message ?? 'no row');
    // 23505 = slug ชนกันพอดี (race กับคนสมัครพร้อมกัน)
    return {
      ok: false,
      error:
        tenantError?.code === '23505'
          ? 'ชื่อนี้เพิ่งถูกใช้ไป กรุณาเลือกชื่ออื่น'
          : 'สร้างร้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    };
  }
  const newTenantId: string = tenant.id;
  tenantId = newTenantId;
  await logTenantEvent(tenantId, 'provision:tenant', 'ok', { slug, plan_id: planId });

  // ---------- step 5: ฝัง tenant_id + role ลง app_metadata ----------
  const { error: metaError } = await db.auth.admin.updateUserById(userId, {
    app_metadata: { tenant_id: tenantId, role: 'store_owner' },
  });
  if (metaError) {
    await rollback('app_metadata', metaError.message);
    return { ok: false, error: 'ตั้งค่าบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  }
  await logTenantEvent(tenantId, 'provision:app_metadata', 'ok', { user_id: userId });

  // ---------- step 6: INSERT stores (ธีมเริ่มต้นตามแพลน — ตรงกับภาพที่หน้า landing ขาย) ----------
  const themeCode = STARTER_THEME_BY_PLAN[plan.code as string] ?? 'basic-01';
  const { error: storeError } = await db.from('stores').insert({
    tenant_id: tenantId,
    name: storeName,
    phone,
    theme_code: themeCode,
  });
  if (storeError) {
    await rollback('store', storeError.message);
    return { ok: false, error: 'สร้างข้อมูลร้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  }
  await logTenantEvent(tenantId, 'provision:store', 'ok', { name: storeName, theme_code: themeCode });

  // ---------- step 7: Starter Store — seed ข้อมูลตัวอย่างเต็มร้าน (non-fatal) ----------
  // ลูกค้า trial ต้องเห็นร้านสวยพร้อมสินค้า/รูป/เนื้อหาทันที ไม่ใช่หน้าว่าง — ถ้า seed พลาด
  // ห้ามล้ม signup: fallback เป็นหมวดเปล่า "สินค้าทั้งหมด" แบบเดิม (§5.3 เดิม) แล้ว log ไว้
  const features = (plan.features ?? {}) as Record<string, boolean>;
  const seeded = await seedStarterPack(db, tenantId, {
    customPages: features.custom_pages === true,
  });
  if (seeded.ok) {
    await logTenantEvent(tenantId, 'provision:starter_pack', 'ok', { pack: 'fashion' });
  } else {
    await logTenantEvent(tenantId, 'provision:starter_pack', 'error', { cause: seeded.error });
    const { error: categoryError } = await db
      .from('categories')
      .insert({ tenant_id: tenantId, name: 'สินค้าทั้งหมด', sort_order: 0 });
    if (categoryError) {
      await rollback('category', categoryError.message);
      return { ok: false, error: 'สร้างหมวดหมู่เริ่มต้นไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
    }
    await logTenantEvent(tenantId, 'provision:category', 'ok', { fallback: true });
  }

  await logTenantEvent(tenantId, 'provision:done', 'ok', { slug, trial_ends_at: trialEndsAt });
  return { ok: true, tenantId: newTenantId, slug };
}
