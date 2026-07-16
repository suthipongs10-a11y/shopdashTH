// Seed ข้อมูลตัวอย่าง (Starter Store) ให้ร้านที่เพิ่งถูก provision — แก้ปัญหา empty state:
// ลูกค้า trial เปิดหน้าร้านครั้งแรกต้องเห็นร้านสวยพร้อมสินค้า/รูป/เนื้อหาครบ ไม่ใช่หน้าว่าง
// แล้วค่อยแก้ทีละส่วนเป็นของตัวเอง (ทุกแถว flag is_sample — มีปุ่มลบทั้งหมดในแดชบอร์ด)
//
// ถูกเรียกเป็น step สุดท้ายของ provisionTenant แบบ non-fatal: seed พลาด = ร้านยังใช้ได้
// (ได้ร้านเปล่าแบบเดิม) — ห้ามทำให้ signup ล้มเพราะของตกแต่ง

import 'server-only';
import { getStarterPack } from '@/lib/starter-packs';
import type { StarterProduct } from '@/lib/starter-packs/types';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { ThemeContent } from '@/lib/theme-content';

type AdminDb = ReturnType<typeof createAdminClient>;

export type SeedResult = { ok: true } | { ok: false; error: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

/** variants ของสินค้าหนึ่งตัว = ทุก combination ของ sizes × colors + tweak รายตัว */
function buildVariantRows(tenantId: string, productId: string, p: StarterProduct) {
  const rows: {
    tenant_id: string;
    product_id: string;
    size: string | null;
    color: string | null;
    price_override: number | null;
    stock: number;
    is_enabled: boolean;
  }[] = [];
  for (const size of p.sizes) {
    for (const color of p.colors) {
      const tweak = p.variant_tweaks?.find((t) => t.size === size && t.color === color);
      rows.push({
        tenant_id: tenantId,
        product_id: productId,
        size,
        color,
        price_override: tweak?.price_override ?? p.price_override ?? null,
        stock: tweak?.stock ?? p.stock,
        is_enabled: true,
      });
    }
  }
  return rows;
}

export async function seedStarterPack(
  db: AdminDb,
  tenantId: string,
  opts: { customPages: boolean; packCode?: string | null },
): Promise<SeedResult> {
  // ไม่รู้จัก code / asset ไม่ครบ = fallback เป็น pack แฟชั่น (ห้ามได้ร้านเปล่า)
  const pack = getStarterPack(opts.packCode);
  try {
    // ---------- หมวดหมู่ ----------
    const { data: cats, error: catError } = await db
      .from('categories')
      .insert(
        pack.categories.map((name, i) => ({
          tenant_id: tenantId,
          name,
          sort_order: i,
          is_sample: true,
        })),
      )
      .select('id, name');
    if (catError || !cats) throw new Error(`categories: ${catError?.message ?? 'no rows'}`);
    const categoryIdByName = new Map(cats.map((c) => [c.name as string, c.id as string]));

    // ---------- สินค้า (backdate created_at ให้ป้าย NEW ของธีม T3 ไม่ขึ้นทุกตัว) ----------
    const { data: prods, error: prodError } = await db
      .from('products')
      .insert(
        pack.products.map((p) => ({
          tenant_id: tenantId,
          category_id: categoryIdByName.get(p.category) ?? null,
          name: p.name,
          description_md: p.description_md,
          base_price: p.base_price,
          status: 'published',
          is_featured: p.is_featured ?? false,
          is_sample: true,
          created_at: daysAgoIso(p.created_days_ago),
        })),
      )
      .select('id, name');
    if (prodError || !prods) throw new Error(`products: ${prodError?.message ?? 'no rows'}`);
    const productIdByName = new Map(prods.map((p) => [p.name as string, p.id as string]));

    // ---------- รูป / variants / รีวิว ----------
    const imageRows: { tenant_id: string; product_id: string; r2_key: string; sort_order: number }[] = [];
    const variantRows: ReturnType<typeof buildVariantRows> = [];
    const reviewRows: {
      tenant_id: string;
      product_id: string;
      rating: number;
      author_name: string;
      comment: string;
      is_published: boolean;
      created_at: string;
    }[] = [];

    for (const p of pack.products) {
      const productId = productIdByName.get(p.name);
      if (!productId) throw new Error(`product id missing: ${p.name}`);
      p.images.forEach((key, i) =>
        imageRows.push({ tenant_id: tenantId, product_id: productId, r2_key: key, sort_order: i }),
      );
      variantRows.push(...buildVariantRows(tenantId, productId, p));
      for (const r of p.reviews) {
        reviewRows.push({
          tenant_id: tenantId,
          product_id: productId,
          rating: r.rating,
          author_name: r.author,
          comment: r.comment,
          is_published: true,
          created_at: daysAgoIso(r.daysAgo),
        });
      }
    }

    const { error: imgError } = await db.from('product_images').insert(imageRows);
    if (imgError) throw new Error(`product_images: ${imgError.message}`);
    const { error: varError } = await db.from('product_variants').insert(variantRows);
    if (varError) throw new Error(`product_variants: ${varError.message}`);
    const { error: revError } = await db.from('product_reviews').insert(reviewRows);
    if (revError) throw new Error(`product_reviews: ${revError.message}`);

    // ---------- เพจ — เฉพาะแพลนที่แก้เพจเองได้ (custom_pages) ไม่งั้นลูกค้าติดเนื้อหาที่แก้ไม่ได้ ----------
    if (opts.customPages && pack.pages.length > 0) {
      const { error: pageError } = await db.from('pages').insert(
        pack.pages.map((page) => ({
          tenant_id: tenantId,
          slug: page.slug,
          title: page.title,
          body_md: page.body_md,
          show_in_nav: true,
          sort_order: page.sort_order,
          status: 'published',
          is_sample: true,
        })),
      );
      if (pageError) throw new Error(`pages: ${pageError.message}`);
    }

    // ---------- เนื้อหาเทมเพลต (__content) — คีย์ครบ T1-T4 ธีมไหนไม่ใช้ก็เพิกเฉย ----------
    // ร้านเพิ่งถูกสร้าง theme_overrides = {} เสมอ จึงเขียนทับได้ตรงๆ
    // บทความ (T3) ลิงก์ไป /p/{slug} — ใส่เฉพาะเมื่อ seed เพจจริง กันลิงก์ 404
    const content: ThemeContent = {
      ...pack.content,
      ...(opts.customPages ? pack.contentWithPages : {}),
    };
    const { error: storeError } = await db
      .from('stores')
      .update({ theme_overrides: { __content: content } })
      .eq('tenant_id', tenantId);
    if (storeError) throw new Error(`stores.__content: ${storeError.message}`);

    return { ok: true };
  } catch (err) {
    // เก็บกวาดแถวที่ seed ค้างครึ่งทาง — ให้ร้าน fallback เป็นร้านเปล่าสะอาดๆ แบบเดิม
    // (products ลบแล้ว images/variants/reviews หายตาม cascade)
    await db.from('products').delete().eq('tenant_id', tenantId).eq('is_sample', true);
    await db.from('categories').delete().eq('tenant_id', tenantId).eq('is_sample', true);
    await db.from('pages').delete().eq('tenant_id', tenantId).eq('is_sample', true);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
