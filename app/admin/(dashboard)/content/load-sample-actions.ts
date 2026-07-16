'use server';

// ปุ่ม "เติมเนื้อหาตัวอย่าง" ในหน้า /admin/content — สำหรับร้านเก่าที่ signup ก่อนระบบ starter store
// หรือร้านที่สลับมาใช้ธีมชุด Commerce แล้วเจอหน้าโล่ง: เติมทั้งเนื้อหา (hero/แบนเนอร์) + สินค้า
// ตัวอย่างชุดเดียวกับที่ร้านใหม่ได้ตอน signup แล้วค่อยแก้เป็นของตัวเอง
//
// ปลอดภัยกับร้านที่มีของจริงอยู่แล้ว: seedStarterPack merge __content (ไม่ทับสีธีม/socials)
// และ action นี้ล้างเฉพาะ is_sample เดิมก่อน (กันกดซ้ำแล้วสินค้าซ้อน) — ของจริงไม่ถูกแตะ

import { revalidatePath } from 'next/cache';
import { getStoreUser } from '@/lib/auth';
import { seedStarterPack } from '@/lib/starter-pack';
import { getStarterPack } from '@/lib/starter-packs';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, invalidateTenantCache } from '@/lib/tenant-context';

export interface LoadSampleState {
  error?: string;
  done?: boolean;
}

export async function loadStarterSample(
  _prev: LoadSampleState,
  formData: FormData,
): Promise<LoadSampleState> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { error: 'กรุณาเข้าสู่ระบบ' };

  const packCode = String(formData.get('pack_code') ?? '').trim() || undefined;
  const pack = getStarterPack(packCode); // ไม่รู้จัก/asset ไม่ครบ = fallback แฟชั่น
  const db = createAdminClient();

  // ---------- ล้างของตัวอย่างเดิมก่อน (FK-safe) กันกดซ้ำแล้วสินค้าซ้อน ----------
  // สินค้าก่อน (รูป/variants/รีวิว หายตาม cascade), เพจถัดมา
  await db.from('products').delete().eq('tenant_id', ctx.tenantId).eq('is_sample', true);
  await db.from('pages').delete().eq('tenant_id', ctx.tenantId).eq('is_sample', true);
  // หมวดตัวอย่าง: ลบเฉพาะที่ไม่มีสินค้าจริงอ้างอยู่ (ร้านอาจย้ายสินค้าจริงเข้าหมวดตัวอย่าง)
  // ที่ยังถูกใช้ → ถอด flag แทน จะได้ไม่ชน FK และไม่ค้างเป็นตัวอย่าง
  const { data: used } = await db
    .from('products')
    .select('category_id')
    .eq('tenant_id', ctx.tenantId)
    .not('category_id', 'is', null);
  const usedIds = [...new Set((used ?? []).map((p) => p.category_id as string))];
  let del = db.from('categories').delete().eq('tenant_id', ctx.tenantId).eq('is_sample', true);
  if (usedIds.length > 0) del = del.not('id', 'in', `(${usedIds.join(',')})`);
  await del;
  await db
    .from('categories')
    .update({ is_sample: false })
    .eq('tenant_id', ctx.tenantId)
    .eq('is_sample', true);

  // ---------- เติมชุดตัวอย่าง (เนื้อหา __content merge + สินค้า/หมวด/รีวิว/เพจ) ----------
  const result = await seedStarterPack(db, ctx.tenantId, {
    customPages: ctx.features.custom_pages === true,
    packCode: pack.code,
  });
  if (!result.ok) {
    return { error: `เติมเนื้อหาตัวอย่างไม่สำเร็จ: ${result.error}` };
  }

  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/content');
  revalidatePath('/admin/products');
  revalidatePath('/admin/dashboard');
  revalidatePath('/');
  return { done: true };
}
