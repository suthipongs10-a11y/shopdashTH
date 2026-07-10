'use server';

// จัดการรีวิวสินค้า (migration 010) — แอดมินร้านเพิ่ม/ซ่อน/ลบเอง
// (ลูกค้าปลายทางไม่มีบัญชี — ร้านเก็บรีวิวจากไลน์/เฟซบุ๊กมาลงเอง)
// ใช้ supabase server client (JWT) — RLS policy reviews_tenant_rw คุม tenant

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';

export interface ReviewActionState {
  error?: string;
}

export async function addReview(
  productId: string,
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const rating = Number(formData.get('rating'));
  const authorName = String(formData.get('author_name') ?? '').trim();
  const comment = String(formData.get('comment') ?? '').trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'คะแนนต้องอยู่ระหว่าง 1–5 ดาว' };
  }
  if (!authorName) return { error: 'กรุณากรอกชื่อลูกค้าผู้รีวิว' };

  const ctx = await getTenantContext();
  const supabase = await createClient();
  const { error } = await supabase.from('product_reviews').insert({
    tenant_id: ctx.tenantId,
    product_id: productId,
    rating,
    author_name: authorName,
    comment: comment || null,
  });

  if (error) return { error: 'เพิ่มรีวิวไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
  revalidatePath(`/admin/products/${productId}`);
  return {};
}

export async function toggleReviewPublished(
  reviewId: string,
  productId: string,
  publish: boolean,
): Promise<void> {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  await supabase
    .from('product_reviews')
    .update({ is_published: publish })
    .eq('id', reviewId)
    .eq('tenant_id', ctx.tenantId);
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteReview(reviewId: string, productId: string): Promise<void> {
  const ctx = await getTenantContext();
  const supabase = await createClient();
  await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('tenant_id', ctx.tenantId);
  revalidatePath(`/admin/products/${productId}`);
}
