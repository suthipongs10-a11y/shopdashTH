// Cloudflare R2 helper (§3.9) — bucket เดียว, เก็บเฉพาะ r2_key ใน Postgres
// - รูปสินค้า/แบรนดิ้ง: อัปโหลดผ่าน presigned PUT (อายุ 5 นาที), เสิร์ฟผ่าน public bucket domain
// - สลิป: ข้อมูลอ่อนไหว — server เขียนเอง (putObject) และเสิร์ฟผ่าน presigned GET
//   อายุ 15 นาทีเท่านั้น ห้ามประกอบ public URL เด็ดขาด

import 'server-only';
import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const PRESIGNED_PUT_EXPIRES_SECONDS = 5 * 60; // §3.9
export const SLIP_GET_EXPIRES_SECONDS = 15 * 60; // §3.9

/** MIME ที่ยอมรับสำหรับรูปทุกประเภทในระบบ */
export const IMAGE_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB (§2.2)

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

let client: S3Client | null = null;

function r2Client(): S3Client {
  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${requiredEnv('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY'),
    },
    // AWS SDK ≥3.729 แนบ x-amz-checksum-crc32 (ของ body ว่าง) ลง presigned URL
    // โดยดีฟอลต์ → R2 ปฏิเสธไฟล์จริงเพราะ checksum ไม่ตรง — ปิดไว้
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return client;
}

function bucket(): string {
  return process.env.R2_BUCKET ?? 'shopdash-prod';
}

// ---------- key builders (path convention §3.9) ----------

export function productImageKey(tenantId: string, productId: string, mime: string): string {
  return `products/${tenantId}/${productId}/${randomUUID()}.${IMAGE_MIME_EXT[mime]}`;
}

export function slipKey(tenantId: string, orderId: string, mime: string): string {
  return `slips/${tenantId}/${orderId}/${randomUUID()}.${IMAGE_MIME_EXT[mime]}`;
}

export function brandingKey(tenantId: string, kind: 'logo' | 'banner'): string {
  return `branding/${tenantId}/${kind}.webp`;
}

/** สลิปค่าแพลนที่ร้านจ่ายให้แพลตฟอร์ม (Phase 3) — อยู่ใต้ slips/ จึงถูกกัน public URL อัตโนมัติ */
export function platformSlipKey(tenantId: string, mime: string): string {
  return `slips/platform/${tenantId}/${randomUUID()}.${IMAGE_MIME_EXT[mime]}`;
}

/** key นี้เป็นสลิปหรือไม่ — สลิปห้ามเสิร์ฟผ่าน public URL */
export function isSlipKey(key: string): boolean {
  return key.startsWith('slips/');
}

// ---------- URLs ----------

/** URL สาธารณะสำหรับรูปสินค้า/แบรนดิ้ง — ห้ามใช้กับสลิป */
export function publicR2Url(key: string): string {
  if (isSlipKey(key)) {
    throw new Error('Slip files must be served via presigned GET URL only');
  }
  return `${requiredEnv('R2_PUBLIC_BASE_URL')}/${key}`;
}

/**
 * Presigned PUT สำหรับ client อัปโหลดตรงเข้า R2 (อายุ 5 นาที)
 * contentLength ถูกเซ็นรวมใน signature — client ต้องส่งไฟล์ขนาดตรงตามที่ขอ
 */
export async function presignPutUrl(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<string> {
  return getSignedUrl(
    r2Client(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: PRESIGNED_PUT_EXPIRES_SECONDS },
  );
}

/** Presigned GET อายุสั้นสำหรับไฟล์อ่อนไหว (สลิป) — ผู้เรียกต้องตรวจสิทธิ์ก่อน */
export async function presignGetUrl(
  key: string,
  expiresIn: number = SLIP_GET_EXPIRES_SECONDS,
): Promise<string> {
  return getSignedUrl(r2Client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn,
  });
}

/** เขียนไฟล์จากฝั่ง server — ใช้กับสลิปที่รับผ่าน /api/slips (งาน 1.8) */
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}
