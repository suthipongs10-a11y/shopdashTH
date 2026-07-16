'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';

export interface CategoryActionState {
  error?: string;
}

const DUPLICATE_NAME_ERROR = 'มีหมวดหมู่ชื่อนี้อยู่แล้ว';

export async function createCategory(
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'กรุณากรอกชื่อหมวดหมู่' };

  const ctx = await getTenantContext();
  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from('categories')
    .select('sort_order')
    .eq('tenant_id', ctx.tenantId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from('categories').insert({
    tenant_id: ctx.tenantId,
    name,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  });

  if (error) {
    return { error: error.code === '23505' ? DUPLICATE_NAME_ERROR : 'เพิ่มหมวดหมู่ไม่สำเร็จ' };
  }
  revalidatePath('/admin/categories');
  return {};
}

export async function renameCategory(
  id: string,
  _prevState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'กรุณากรอกชื่อหมวดหมู่' };

  const ctx = await getTenantContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .update({ name, is_sample: false })
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);

  if (error) {
    return { error: error.code === '23505' ? DUPLICATE_NAME_ERROR : 'บันทึกไม่สำเร็จ' };
  }
  revalidatePath('/admin/categories');
  return {};
}

export async function deleteCategory(id: string): Promise<CategoryActionState> {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId);

  if (error) {
    return {
      error:
        error.code === '23503'
          ? 'ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมีสินค้าอยู่ในหมวดหมู่นี้'
          : 'ลบหมวดหมู่ไม่สำเร็จ',
    };
  }
  revalidatePath('/admin/categories');
  return {};
}

export async function moveCategory(id: string, direction: 'up' | 'down'): Promise<void> {
  const ctx = await getTenantContext();
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, sort_order')
    .eq('tenant_id', ctx.tenantId)
    .order('sort_order', { ascending: true });

  if (!categories) return;
  const index = categories.findIndex((c) => c.id === id);
  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= categories.length) return;

  const current = categories[index];
  const swap = categories[swapIndex];

  await Promise.all([
    supabase
      .from('categories')
      .update({ sort_order: swap.sort_order })
      .eq('id', current.id)
      .eq('tenant_id', ctx.tenantId),
    supabase
      .from('categories')
      .update({ sort_order: current.sort_order })
      .eq('id', swap.id)
      .eq('tenant_id', ctx.tenantId),
  ]);
  revalidatePath('/admin/categories');
}
