'use server';

// หน้าเพจ/บทความของร้าน (Phase 6 — flag `custom_pages`, แพลนธุรกิจขึ้นไป)
// server ตรวจ flag ซ้ำทุก action — ห้ามเชื่อ UI (§3.7)

import { revalidatePath } from 'next/cache';
import { getStoreUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, type TenantContext } from '@/lib/tenant-context';

export interface PageActionState {
  error?: string;
  done?: boolean;
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,49}$/;
// กันชนกับ path จริงของ storefront ไม่จำเป็น (เพจอยู่ใต้ /p/{slug}) — จองไว้เฉพาะคำระบบ
const RESERVED_SLUGS = ['admin', 'api'];

async function requireCtx(): Promise<{ ctx: TenantContext } | { error: string }> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { error: 'กรุณาเข้าสู่ระบบ' };
  if (!ctx.features.custom_pages) {
    return { error: 'ฟีเจอร์หน้าเพจ/บทความใช้ได้กับแพลนธุรกิจขึ้นไป — อัปเกรดแพลนเพื่อเปิดใช้' };
  }
  return { ctx };
}

function parsePageForm(formData: FormData):
  | { error: string }
  | {
      fields: {
        slug: string;
        title: string;
        body_md: string | null;
        show_in_nav: boolean;
        sort_order: number;
        status: 'draft' | 'published';
      };
    } {
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body_md') ?? '').trim();
  const sortOrder = Number(formData.get('sort_order') ?? 0);
  const status = String(formData.get('status') ?? 'draft');

  if (!SLUG_PATTERN.test(slug)) {
    return { error: 'slug ต้องเป็น a-z 0-9 หรือ - ยาว 1–50 ตัว เช่น about-us' };
  }
  if (RESERVED_SLUGS.includes(slug)) return { error: `ใช้ slug "${slug}" ไม่ได้ (คำสงวนของระบบ)` };
  if (!title) return { error: 'กรุณากรอกชื่อหน้า' };
  if (!Number.isInteger(sortOrder)) return { error: 'ลำดับต้องเป็นจำนวนเต็ม' };
  if (status !== 'draft' && status !== 'published') return { error: 'สถานะไม่ถูกต้อง' };

  return {
    fields: {
      slug,
      title,
      body_md: body || null,
      show_in_nav: formData.get('show_in_nav') === 'on',
      sort_order: sortOrder,
      status,
    },
  };
}

export async function createPage(
  _prev: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const auth = await requireCtx();
  if ('error' in auth) return { error: auth.error };

  const parsed = parsePageForm(formData);
  if ('error' in parsed) return { error: parsed.error };

  const db = createAdminClient();
  const { error } = await db
    .from('pages')
    .insert({ tenant_id: auth.ctx.tenantId, ...parsed.fields });

  if (error) {
    if (error.code === '23505') return { error: `slug "${parsed.fields.slug}" ถูกใช้แล้วในร้านนี้` };
    return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  }

  revalidatePath('/admin/pages');
  revalidatePath('/');
  return { done: true };
}

export async function updatePage(
  pageId: string,
  _prev: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const auth = await requireCtx();
  if ('error' in auth) return { error: auth.error };

  const parsed = parsePageForm(formData);
  if ('error' in parsed) return { error: parsed.error };

  const db = createAdminClient();
  const { error } = await db
    .from('pages')
    .update({ ...parsed.fields, is_sample: false, updated_at: new Date().toISOString() })
    .eq('id', pageId)
    .eq('tenant_id', auth.ctx.tenantId);

  if (error) {
    if (error.code === '23505') return { error: `slug "${parsed.fields.slug}" ถูกใช้แล้วในร้านนี้` };
    return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  }

  revalidatePath('/admin/pages');
  revalidatePath(`/p/${parsed.fields.slug}`);
  revalidatePath('/');
  return { done: true };
}

export async function deletePage(pageId: string): Promise<void> {
  const auth = await requireCtx();
  if ('error' in auth) return;

  const db = createAdminClient();
  await db.from('pages').delete().eq('id', pageId).eq('tenant_id', auth.ctx.tenantId);
  revalidatePath('/admin/pages');
  revalidatePath('/');
}
