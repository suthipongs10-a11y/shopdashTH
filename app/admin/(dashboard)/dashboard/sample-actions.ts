'use server';

// ลบข้อมูลตัวอย่างจาก starter pack ทั้งหมดของร้าน (ปุ่มบนแบนเนอร์แดชบอร์ด)
// ลบเฉพาะแถว is_sample=true — ของที่ลูกค้าสร้างเอง หรือของตัวอย่างที่ลูกค้า "แก้แล้ว"
// (การแก้เคลียร์ flag ใน actions ของ products/categories/pages) ไม่ถูกแตะเด็ดขาด

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';

export interface DeleteSampleState {
  error?: string;
  done?: boolean;
}

export async function deleteSampleData(): Promise<DeleteSampleState> {
  const ctx = await getTenantContext();
  const supabase = await createClient();

  // สินค้าก่อน (รูป/variants/รีวิว หายตาม cascade — order_items เป็น snapshot ไม่มี FK
  // ประวัติออร์เดอร์ทดสอบจึงไม่พัง §3.4)
  const { error: prodError } = await supabase
    .from('products')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('is_sample', true);
  if (prodError) return { error: 'ลบสินค้าตัวอย่างไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  await supabase.from('pages').delete().eq('tenant_id', ctx.tenantId).eq('is_sample', true);

  // หมวดตัวอย่าง: ลบได้เฉพาะหมวดที่ไม่มีสินค้าเหลืออ้างอยู่ (ลูกค้าอาจย้ายสินค้าจริง
  // เข้าหมวดตัวอย่าง) — หมวดที่ยังถูกใช้ให้ถอด flag แทน จะได้ไม่โผล่ในแบนเนอร์อีก
  const { data: usedCategories } = await supabase
    .from('products')
    .select('category_id')
    .eq('tenant_id', ctx.tenantId)
    .not('category_id', 'is', null);
  const usedIds = [...new Set((usedCategories ?? []).map((p) => p.category_id as string))];

  let categoryDelete = supabase
    .from('categories')
    .delete()
    .eq('tenant_id', ctx.tenantId)
    .eq('is_sample', true);
  if (usedIds.length > 0) {
    categoryDelete = categoryDelete.not('id', 'in', `(${usedIds.join(',')})`);
  }
  await categoryDelete;
  await supabase
    .from('categories')
    .update({ is_sample: false })
    .eq('tenant_id', ctx.tenantId)
    .eq('is_sample', true);

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/products');
  revalidatePath('/admin/categories');
  revalidatePath('/admin/pages');
  revalidatePath('/');
  return { done: true };
}
