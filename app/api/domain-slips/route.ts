// อัปโหลดสลิปค่าบริการโดเมน (฿590/ปี — migration 017) — ร้านจ่ายให้ "แพลตฟอร์ม"
// pattern เดียวกับ /api/plan-slips: แอดมินร้านเท่านั้น, ไฟล์เข้า R2 path slips/ (ห้าม public URL)

import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getStoreUser } from '@/lib/auth';
import { attachDomainSlip, getOpenRequest } from '@/lib/domain-requests';
import { notifyPlatformDomainSlip } from '@/lib/platform/line';
import { IMAGE_MIME_EXT, MAX_IMAGE_BYTES, platformSlipKey, putObject } from '@/lib/r2';
import { getTenantContext, TenantNotFoundError } from '@/lib/tenant-context';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContext();
    const user = await getStoreUser(ctx);
    if (!user) return bad('กรุณาเข้าสู่ระบบ', 401);

    const form = await req.formData();
    const requestId = String(form.get('requestId') ?? '').trim();
    const file = form.get('file');

    if (!requestId || !(file instanceof File)) return bad('ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง');
    if (!(file.type in IMAGE_MIME_EXT)) return bad('รองรับเฉพาะไฟล์ jpg, png หรือ webp');
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return bad('ขนาดไฟล์ต้องไม่เกิน 5MB');

    // ตรวจว่าคำขอเป็นของร้านนี้และยังรอชำระอยู่ ก่อนเขียนไฟล์
    const open = await getOpenRequest(ctx.tenantId);
    if (!open || open.id !== requestId || open.status !== 'awaiting_payment') {
      return bad('คำขอนี้ไม่อยู่ในสถานะรอชำระเงิน กรุณารีเฟรชหน้า');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash('sha256').update(buffer).digest('hex');
    const key = platformSlipKey(ctx.tenantId, file.type);
    await putObject(key, buffer, file.type);

    const result = await attachDomainSlip(ctx.tenantId, requestId, key, fileHash);
    if (!result.ok) return bad(result.error);

    void notifyPlatformDomainSlip({
      storeName: ctx.store.name,
      slug: ctx.slug,
      domain: open.domain,
      kind: open.kind,
      amount: open.amount,
    }).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenantNotFoundError) return bad(err.message, 404);
    console.error('[api/domain-slips]', err);
    return bad('เกิดข้อผิดพลาดระหว่างอัปโหลดสลิป กรุณาลองใหม่อีกครั้ง', 500);
  }
}
