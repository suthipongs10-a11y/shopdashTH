// ออก presigned PUT URL สำหรับอัปโหลดรูปเข้า R2 (§3.9)
// เฉพาะ store admin ที่ login แล้ว — ตรวจ auth + tenant + MIME + ขนาด ก่อนออก URL
// หมายเหตุ: สลิปไม่ผ่าน route นี้ — guest ส่งไฟล์เข้า /api/slips (งาน 1.8) ให้ server เขียนเอง

import { NextResponse } from 'next/server';
import {
  brandingKey,
  IMAGE_MIME_EXT,
  MAX_IMAGE_BYTES,
  PRESIGNED_PUT_EXPIRES_SECONDS,
  presignPutUrl,
  productImageKey,
  publicR2Url,
} from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext, TenantNotFoundError } from '@/lib/tenant-context';

const KINDS = ['product_image', 'branding_logo', 'branding_banner'] as const;
type UploadKind = (typeof KINDS)[number];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UploadRequestBody {
  kind: UploadKind;
  contentType: string;
  size: number;
  /** จำเป็นเมื่อ kind = product_image */
  productId?: string;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  // Phase 1: สิทธิ์ = user ที่ login (มี user เดียวคือแอดมินร้าน demo)
  // Phase 2 จะตรวจ role + tenant จาก app_metadata เพิ่ม
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์' }, { status: 401 });
  }

  let body: UploadRequestBody;
  try {
    body = (await req.json()) as UploadRequestBody;
  } catch {
    return badRequest('รูปแบบคำขอไม่ถูกต้อง');
  }

  if (!KINDS.includes(body.kind)) {
    return badRequest('ประเภทการอัปโหลดไม่ถูกต้อง');
  }
  if (!(body.contentType in IMAGE_MIME_EXT)) {
    return badRequest('รองรับเฉพาะไฟล์ jpg, png หรือ webp');
  }
  if (!Number.isInteger(body.size) || body.size <= 0 || body.size > MAX_IMAGE_BYTES) {
    return badRequest('ขนาดไฟล์ต้องไม่เกิน 5MB');
  }
  // รูปสินค้า/แบรนดิ้งถูกแปลงเป็น webp + resize ≤1600px ฝั่ง client ก่อนอัป (§3.9)
  if (body.contentType !== 'image/webp') {
    return badRequest('รูปต้องถูกแปลงเป็น webp ก่อนอัปโหลด');
  }

  try {
    const ctx = await getTenantContext();

    let key: string;
    if (body.kind === 'product_image') {
      if (!body.productId || !UUID_PATTERN.test(body.productId)) {
        return badRequest('ต้องระบุ productId ของสินค้า');
      }
      key = productImageKey(ctx.tenantId, body.productId, body.contentType);
    } else {
      key = brandingKey(ctx.tenantId, body.kind === 'branding_logo' ? 'logo' : 'banner');
    }

    const uploadUrl = await presignPutUrl(key, body.contentType, body.size);
    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl: publicR2Url(key),
      expiresIn: PRESIGNED_PUT_EXPIRES_SECONDS,
    });
  } catch (err) {
    if (err instanceof TenantNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error('[api/upload]', err);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเตรียมอัปโหลด กรุณาลองใหม่อีกครั้ง' },
      { status: 500 },
    );
  }
}
