// รีวิวสินค้าฝั่ง storefront — คะแนนจริงจากตาราง product_reviews (migration 010)
// สรุปคะแนนอ่านจาก view product_rating_summary (นับเฉพาะ is_published)

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface RatingSummary {
  score: string; // "4.7" — ทศนิยม 1 ตำแหน่ง ตรงกับ view
  count: number;
}

export interface ProductReview {
  id: string;
  rating: number;
  authorName: string;
  comment: string | null;
  createdAt: string;
}

/** สรุปคะแนนหลายสินค้าในครั้งเดียว — ใช้แปะดาวบนการ์ด (lib/catalog) */
export async function fetchRatingSummaries(
  tenantId: string,
  productIds: string[],
): Promise<Map<string, RatingSummary>> {
  const map = new Map<string, RatingSummary>();
  if (productIds.length === 0) return map;

  const db = createAdminClient();
  const { data } = await db
    .from('product_rating_summary')
    .select('product_id, review_count, avg_rating')
    .eq('tenant_id', tenantId)
    .in('product_id', productIds);

  for (const row of data ?? []) {
    map.set(row.product_id, {
      score: Number(row.avg_rating).toFixed(1),
      count: row.review_count,
    });
  }
  return map;
}

/** รีวิว published ของสินค้าหนึ่งตัว + สรุปคะแนน — หน้าสินค้า */
export async function fetchProductReviews(
  tenantId: string,
  productId: string,
  limit = 12,
): Promise<{ summary: RatingSummary | null; reviews: ProductReview[] }> {
  const db = createAdminClient();
  const [summaries, { data: rows }] = await Promise.all([
    fetchRatingSummaries(tenantId, [productId]),
    db
      .from('product_reviews')
      .select('id, rating, author_name, comment, created_at')
      .eq('tenant_id', tenantId)
      .eq('product_id', productId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  return {
    summary: summaries.get(productId) ?? null,
    reviews: (rows ?? []).map((r) => ({
      id: r.id,
      rating: r.rating,
      authorName: r.author_name,
      comment: r.comment,
      createdAt: r.created_at,
    })),
  };
}
