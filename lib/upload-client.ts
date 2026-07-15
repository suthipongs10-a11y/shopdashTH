'use client';

// ฝั่ง client ของ flow อัปโหลดรูป (§3.9):
// แปลงรูปเป็น webp + resize ≤ 1600px ด้วย canvas → ขอ presigned URL จาก
// /api/upload → PUT ตรงเข้า R2 → คืน key ให้ผู้เรียกเอาไป insert ลงตาราง
// ใช้กับรูปสินค้า/โลโก้/แบนเนอร์เท่านั้น — สลิปห้ามแปลง (ส่งไฟล์ต้นฉบับเข้า /api/slips)

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.85;

export class UploadError extends Error {}

/** แปลงรูปเป็น webp และย่อด้านยาวสุดไม่เกิน 1600px */
export async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new UploadError('เบราว์เซอร์ไม่รองรับการแปลงรูป');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
    );
    if (!blob) throw new UploadError('แปลงรูปเป็น webp ไม่สำเร็จ');
    return blob;
  } finally {
    bitmap.close();
  }
}

export type UploadKind = 'product_image' | 'branding_logo' | 'branding_banner' | 'content_image';

export interface UploadedImage {
  key: string;
  publicUrl: string;
}

/** แปลงรูป → ขอ presigned URL → PUT เข้า R2 — โยน UploadError พร้อมข้อความไทยเมื่อพลาด */
export async function uploadImage(
  kind: UploadKind,
  file: File,
  productId?: string,
): Promise<UploadedImage> {
  const webp = await toWebp(file);

  const presignRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, contentType: 'image/webp', size: webp.size, productId }),
  });
  const presign = (await presignRes.json()) as {
    uploadUrl?: string;
    key?: string;
    publicUrl?: string;
    error?: string;
  };
  if (!presignRes.ok || !presign.uploadUrl || !presign.key || !presign.publicUrl) {
    throw new UploadError(presign.error ?? 'ขอสิทธิ์อัปโหลดไม่สำเร็จ');
  }

  let putRes: Response;
  try {
    putRes = await fetch(presign.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/webp' },
      body: webp,
    });
  } catch {
    // fetch reject (ไม่ใช่ตอบ !ok) = ถูกบล็อกระดับ network/CORS ก่อนถึง R2
    // มักเกิดเมื่อ CORS ของ bucket ยังไม่อนุญาต origin ของโดเมนร้าน (§3.9)
    throw new UploadError(
      'อัปโหลดถูกบล็อก — ที่เก็บรูป (R2) ยังไม่อนุญาตโดเมนนี้ (CORS) กรุณาแจ้งผู้ดูแลระบบตั้งค่า CORS ของ bucket',
    );
  }
  if (!putRes.ok) {
    throw new UploadError('อัปโหลดไฟล์เข้าที่เก็บรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }

  return { key: presign.key, publicUrl: presign.publicUrl };
}
