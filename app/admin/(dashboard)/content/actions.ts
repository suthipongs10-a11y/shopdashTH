'use server';

// บันทึกเนื้อหาเทมเพลตจากหน้า /admin/content ลง theme_overrides.__content
// validate ทุกค่าตาม schema กลาง (lib/content-schema.ts) — ห้ามเชื่อ payload จาก client
// สิทธิ์: owner + staff (งานคอนเทนต์รายวัน — ระดับเดียวกับเปลี่ยนธีม/ข้อความประกาศ)

import { revalidatePath } from 'next/cache';
import { getStoreUser } from '@/lib/auth';
import { getContentGroup, type ContentFieldDef } from '@/lib/content-schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, invalidateTenantCache } from '@/lib/tenant-context';
import { getPreset } from '@/themes/presets';

export interface ContentActionState {
  error?: string;
  success?: boolean;
}

const TEXT_MAX = 200;
const TEXTAREA_MAX = 2000;
const HREF_MAX = 300;
const IMAGE_MAX = 500;
const LINES_MAX_ITEMS = 6;
const PAYLOAD_MAX = 50_000;

/** รูปต้องมาจาก R2 ของระบบหรือ path ภายใน (/demo/…) — URL นอกระบบใช้กับ next/image ไม่ได้ */
function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith('/')) return true;
  const base = process.env.R2_PUBLIC_BASE_URL;
  return Boolean(base && url.startsWith(base));
}

function isAllowedHref(url: string): boolean {
  return url.startsWith('/') || /^https?:\/\/.+/.test(url);
}

/** คืนค่า string ที่ผ่าน validate แล้ว หรือ null = ทิ้งค่านี้ / โยนข้อความ error เมื่อค่าผิดรูป */
function sanitizeField(field: ContentFieldDef, raw: unknown): string | string[] | null {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;
  switch (field.type) {
    case 'text':
      return value.slice(0, TEXT_MAX);
    case 'textarea':
      return value.slice(0, TEXTAREA_MAX);
    case 'href':
      if (!isAllowedHref(value)) {
        throw new Error(`ลิงก์ "${field.label}" ต้องขึ้นต้นด้วย / หรือ https://`);
      }
      return value.slice(0, HREF_MAX);
    case 'image':
      if (!isAllowedImageUrl(value)) {
        throw new Error(`รูป "${field.label}" ต้องอัปโหลดผ่านระบบเท่านั้น`);
      }
      return value.slice(0, IMAGE_MAX);
    case 'icon':
      if (!(field.iconOptions ?? []).some((o) => o.value === value)) return null;
      return value;
    case 'lines':
      return value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, LINES_MAX_ITEMS)
        .map((line) => line.slice(0, 120));
  }
}

function sanitizeRecord(
  fields: ContentFieldDef[],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const value = sanitizeField(field, raw[field.key]);
    if (value !== null && (typeof value === 'string' || value.length > 0)) {
      out[field.key] = value;
    }
  }
  return out;
}

export async function saveContentGroup(
  groupId: string,
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const ctx = await getTenantContext();
  if (!(await getStoreUser(ctx))) return { error: 'กรุณาเข้าสู่ระบบ' };

  const group = getContentGroup(groupId);
  if (!group) return { error: 'ไม่พบส่วนเนื้อหาที่ระบุ' };
  // กันยิงตรง: ธีมปัจจุบันต้องใช้ section นี้จริง (UI ก็กรองอยู่แล้ว — server ตรวจซ้ำ)
  if (!group.appliesTo(getPreset(ctx.store.theme_code))) {
    return { error: 'ธีมปัจจุบันไม่ได้ใช้ส่วนเนื้อหานี้' };
  }

  const rawPayload = String(formData.get('payload') ?? '');
  if (rawPayload.length > PAYLOAD_MAX) return { error: 'เนื้อหายาวเกินไป' };
  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload || '{}');
  } catch {
    return { error: 'รูปแบบข้อมูลไม่ถูกต้อง กรุณารีเฟรชหน้าแล้วลองใหม่' };
  }

  // สร้างค่าใหม่ตามชนิดกลุ่ม
  let objectValue: Record<string, unknown> | null = null;
  let listValue: Record<string, unknown>[] | null = null;
  let stringsValue: Record<string, unknown> | null = null;
  try {
    if (group.kind === 'list') {
      if (!Array.isArray(payload)) return { error: 'รูปแบบข้อมูลไม่ถูกต้อง' };
      listValue = payload
        .slice(0, group.maxItems ?? 10)
        .map((item) =>
          sanitizeRecord(group.fields, (item ?? {}) as Record<string, unknown>),
        )
        // ตัดรายการว่าง + รายการที่ขาดช่องบังคับ (เช่น สไลด์ไม่มีรูป)
        .filter(
          (item) =>
            Object.keys(item).length > 0 &&
            group.fields.every((f) => !f.required || item[f.key] !== undefined),
        );
    } else {
      if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return { error: 'รูปแบบข้อมูลไม่ถูกต้อง' };
      }
      const record = sanitizeRecord(group.fields, payload as Record<string, unknown>);
      if (group.kind === 'object') objectValue = record;
      else stringsValue = record;
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'ข้อมูลไม่ถูกต้อง' };
  }

  // merge เข้ากับ __content เดิม (อ่านสดจาก DB — pattern เดียวกับ socials/variantLabels)
  const db = createAdminClient();
  const { data: row, error: readErr } = await db
    .from('stores')
    .select('theme_overrides')
    .eq('tenant_id', ctx.tenantId)
    .single();
  if (readErr) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  const overrides = (row.theme_overrides ?? {}) as Record<string, unknown>;
  const contentRaw = overrides['__content'];
  const content =
    contentRaw && typeof contentRaw === 'object' && !Array.isArray(contentRaw)
      ? { ...(contentRaw as Record<string, unknown>) }
      : {};

  if (group.kind === 'strings') {
    // ข้อความเดี่ยวระดับบนสุด — ค่าว่าง = ลบ key (กลับไปใช้ default ของธีม)
    for (const field of group.fields) {
      if (stringsValue && stringsValue[field.key] !== undefined) {
        content[field.key] = stringsValue[field.key];
      } else {
        delete content[field.key];
      }
    }
  } else {
    const key = group.contentKey!;
    const value = group.kind === 'list' ? listValue : objectValue;
    if (value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) {
      content[key] = value;
    } else {
      delete content[key];
    }
  }

  const { error } = await db
    .from('stores')
    .update({ theme_overrides: { ...overrides, __content: content } })
    .eq('tenant_id', ctx.tenantId);
  if (error) return { error: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };

  invalidateTenantCache(ctx.slug);
  revalidatePath('/admin/content');
  revalidatePath('/');
  return { success: true };
}
