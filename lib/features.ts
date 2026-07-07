// Feature flag resolution (§3.7) — ฟังก์ชันเดียวใช้ทั้งระบบ (ฝั่ง server)
// ฐานจากแพลน (realtime) → ธีม override ฟีเจอร์หน้าร้าน → super admin override รายร้านชนะทุกอย่าง
// กติกา: UI ซ่อนปุ่ม + server ตรวจซ้ำทุกครั้ง — route ที่ flagged ต้องเรียก assertFeature ก่อนทำงาน
// ค่าคงที่/type ที่ client ใช้ได้อยู่ lib/features-shared.ts

import 'server-only';
import { FEATURE_KEYS, FEATURE_LABEL_TH, type FeatureKey, type FeatureMap } from '@/lib/features-shared';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanRow, TenantContext } from '@/lib/tenant-context';

export type { FeatureKey, FeatureMap } from '@/lib/features-shared';
export { FEATURE_KEYS, FEATURE_LABEL_TH } from '@/lib/features-shared';

function pickKnown(source: Record<string, unknown> | null | undefined): Partial<FeatureMap> {
  const out: Partial<FeatureMap> = {};
  if (!source) return out;
  for (const key of FEATURE_KEYS) {
    if (typeof source[key] === 'boolean') out[key] = source[key] as boolean;
  }
  return out;
}

export function resolveFeatures(
  plan: Pick<PlanRow, 'features'>,
  tenant: { feature_overrides: Record<string, unknown> },
  theme: { feature_defaults: Record<string, unknown> | null },
): FeatureMap {
  const base = Object.fromEntries(FEATURE_KEYS.map((k) => [k, false])) as FeatureMap;
  return {
    ...base,
    ...pickKnown(plan.features), // ฐานจากแพลน (realtime — เปลี่ยนแพลนมีผลทันที)
    ...pickKnown(theme.feature_defaults), // ธีมเปิด/ปิดฟีเจอร์หน้าร้าน (wishlist ฯลฯ §4.4)
    ...pickKnown(tenant.feature_overrides), // super admin override รายร้าน ชนะทุกอย่าง
  };
}

/** โยนเมื่อฟีเจอร์ไม่เปิดในแพลนของร้าน — route handler แปลงเป็น 403 พร้อมข้อความไทย */
export class FeatureDisabledError extends Error {
  readonly featureKey: FeatureKey;
  constructor(key: FeatureKey) {
    super(`ฟีเจอร์ "${FEATURE_LABEL_TH[key]}" ไม่เปิดใช้งานในแพลนของร้านคุณ กรุณาอัปเกรดแพลน`);
    this.name = 'FeatureDisabledError';
    this.featureKey = key;
  }
}

export function assertFeature(ctx: TenantContext, key: FeatureKey): void {
  if (!ctx.features[key]) throw new FeatureDisabledError(key);
}

/** โยนเมื่อร้านชน limit ของแพลน (§5.1) — ตรวจใน service layer ตอน create */
export class PlanLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

/**
 * ตรวจ limit จำนวนสินค้าตามแพลนก่อน insert (§5.1) — max_products = -1 คือไม่จำกัด
 * นโยบาย §7.2: เกิน limit = ห้าม "สร้างเพิ่ม" เท่านั้น ของเดิมไม่หาย
 */
export async function assertUnderProductLimit(ctx: TenantContext): Promise<void> {
  const max = ctx.plan.max_products;
  if (max < 0) return;

  const db = createAdminClient();
  const { count, error } = await db
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId);

  if (error) throw new Error(`นับจำนวนสินค้าไม่สำเร็จ: ${error.message}`);
  if ((count ?? 0) >= max) {
    throw new PlanLimitError(
      `แพลน ${ctx.plan.name_th} เพิ่มสินค้าได้สูงสุด ${max} รายการ (ตอนนี้มี ${count} รายการ) — อัปเกรดแพลนเพื่อเพิ่มสินค้าได้มากขึ้น`,
    );
  }
}

/** ตรวจ limit จำนวนรูปต่อสินค้าตามแพลน (§5.1) */
export async function assertUnderImageLimit(ctx: TenantContext, productId: string): Promise<void> {
  const max = ctx.plan.max_images_per_product;
  if (max < 0) return;

  const db = createAdminClient();
  const { count, error } = await db
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.tenantId)
    .eq('product_id', productId);

  if (error) throw new Error(`นับจำนวนรูปไม่สำเร็จ: ${error.message}`);
  if ((count ?? 0) >= max) {
    throw new PlanLimitError(
      `แพลน ${ctx.plan.name_th} ใส่รูปได้สูงสุด ${max} รูปต่อสินค้า — อัปเกรดแพลนเพื่อเพิ่มรูปได้มากขึ้น`,
    );
  }
}
