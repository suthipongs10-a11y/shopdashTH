// อัปโหลดสลิปโอนเงิน (§2.2) — guest ส่ง multipart เข้า route นี้
// server เขียน R2 เอง (service role) — ไฟล์ต้นฉบับ ห้ามแปลง (หลักฐานการเงิน §3.9)
// กันซ้ำ 2 ชั้น (§7.3): ออร์เดอร์มีสลิป pending อยู่ → ปฏิเสธ / SHA-256 ซ้ำใน tenant → ปฏิเสธ

import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { notifyNewSlip } from '@/lib/line';
import { transitionOrder, TransitionError } from '@/lib/orders/transition';
import { getSlipVerifier } from '@/lib/slip-verify';
import { clientIp, isRateLimited, RATE_LIMIT_MESSAGE } from '@/lib/rate-limit';
import type { TenantContext } from '@/lib/tenant-context';
import { IMAGE_MIME_EXT, MAX_IMAGE_BYTES, putObject, slipKey } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext, TenantNotFoundError } from '@/lib/tenant-context';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Slip Verify อัตโนมัติ (§2.2 v1.1 + §7.1) — เฉพาะแพลนที่มี flag `slip_verify_api`
 * ผ่าน → auto-approve (confirmed + ตัดสต๊อก) / ไม่ผ่านทุกกรณี → "ตกคิว manual" พร้อมเหตุผล
 * (ห้าม reject อัตโนมัติ — กัน false negative ทำร้ายลูกค้าจริง)
 * คืน true เมื่อ auto-approve สำเร็จ
 */
async function tryAutoVerify(
  ctx: TenantContext,
  input: {
    slipId: string;
    orderId: string;
    orderNumber: string;
    expectedAmount: number;
    fileHash: string;
    buffer: Buffer;
    mimeType: string;
  },
): Promise<boolean> {
  if (!ctx.features.slip_verify_api) return false;
  const db = createAdminClient();

  try {
    const verifier = getSlipVerifier();
    const result = await verifier.verify({
      tenantId: ctx.tenantId,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      expectedAmount: input.expectedAmount,
      expectedPromptpayId: ctx.store.promptpay_id,
      fileHash: input.fileHash,
      fileBuffer: input.buffer,
      mimeType: input.mimeType,
    });

    // เก็บผลลง payment_slips.auto_verify_result เสมอ (flag auto_verify_failed อ่านจากตรงนี้)
    await db
      .from('payment_slips')
      .update({
        auto_verify_result: {
          provider: verifier.providerName,
          verified: result.verified,
          reason_th: result.reason_th ?? null,
          transaction_ref: result.transactionRef ?? null,
          checked_at: new Date().toISOString(),
          raw: result.raw ?? null,
        },
      })
      .eq('id', input.slipId)
      .eq('tenant_id', ctx.tenantId);

    if (!result.verified) return false; // ตกคิว manual พร้อมเหตุผล

    // auto-approve: ตัดสต๊อกก่อน (transition อาจ fail ถ้าสต๊อกไม่พอ → ตกคิว manual)
    await transitionOrder(ctx.tenantId, input.orderId, 'confirmed');
    await db
      .from('payment_slips')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', input.slipId)
      .eq('tenant_id', ctx.tenantId)
      .eq('status', 'pending');
    return true;
  } catch (err) {
    // verify/transition ล้ม = ตกคิว manual — ห้ามทำให้การอัปสลิปล้ม
    console.error('[api/slips] auto-verify failed', err);
    return false;
  }
}

export async function POST(req: Request) {
  if (isRateLimited(`slips:${clientIp(req)}`, 6, 60_000)) {
    return bad(RATE_LIMIT_MESSAGE, 429);
  }

  try {
    const ctx = await getTenantContext();
    const db = createAdminClient();

    const form = await req.formData();
    const orderNumber = String(form.get('orderNumber') ?? '').trim();
    const file = form.get('file');

    if (!orderNumber || !(file instanceof File)) {
      return bad('ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง');
    }
    if (!(file.type in IMAGE_MIME_EXT)) {
      return bad('รองรับเฉพาะไฟล์ jpg, png หรือ webp');
    }
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return bad('ขนาดไฟล์ต้องไม่เกิน 5MB');
    }

    const { data: order } = await db
      .from('orders')
      .select('id, status, total_amount')
      .eq('tenant_id', ctx.tenantId)
      .eq('order_number', orderNumber)
      .single();

    if (!order) return bad('ไม่พบคำสั่งซื้อ', 404);
    if (order.status !== 'pending_payment') {
      return bad('คำสั่งซื้อนี้ไม่ได้อยู่ในสถานะรอชำระเงิน');
    }

    // §7.3: มีสลิปรอตรวจอยู่แล้ว → ปฏิเสธใบใหม่จนกว่าใบเดิมถูกตัดสิน
    const { count: pendingCount } = await db
      .from('payment_slips')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('order_id', order.id)
      .eq('status', 'pending');

    if ((pendingCount ?? 0) > 0) {
      return bad('มีสลิปรอการตรวจสอบอยู่แล้ว กรุณารอร้านตรวจสอบก่อน');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash('sha256').update(buffer).digest('hex');

    // เช็คซ้ำก่อนอัปโหลด (fast path) — unique index ยังกัน race ให้อีกชั้น
    const { count: dupCount } = await db
      .from('payment_slips')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .eq('file_hash', fileHash);

    if ((dupCount ?? 0) > 0) {
      return bad('สลิปนี้ถูกใช้ไปแล้ว กรุณาตรวจสอบหรือติดต่อร้านค้า');
    }

    const key = slipKey(ctx.tenantId, order.id, file.type);
    await putObject(key, buffer, file.type);

    const { data: slipRow, error: insertError } = await db
      .from('payment_slips')
      .insert({
        tenant_id: ctx.tenantId,
        order_id: order.id,
        r2_key: key,
        file_hash: fileHash,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !slipRow) {
      if (insertError?.code === '23505') {
        return bad('สลิปนี้ถูกใช้ไปแล้ว กรุณาตรวจสอบหรือติดต่อร้านค้า');
      }
      console.error('[api/slips] insert failed', insertError);
      return bad('บันทึกสลิปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 500);
    }

    await transitionOrder(ctx.tenantId, order.id, 'slip_uploaded');

    // ---------- Slip Verify อัตโนมัติ (งาน 4.6 — เฉพาะแพลนที่มี slip_verify_api) ----------
    const autoApproved = await tryAutoVerify(ctx, {
      slipId: slipRow.id,
      orderId: order.id,
      orderNumber,
      expectedAmount: order.total_amount,
      fileHash,
      buffer,
      mimeType: file.type,
    });

    // แจ้งเตือน LINE (P4 — fire-and-forget, fail แล้วไม่กระทบสลิป)
    await notifyNewSlip(ctx, orderNumber);

    return NextResponse.json({ ok: true, autoApproved });
  } catch (err) {
    if (err instanceof TenantNotFoundError) return bad(err.message, 404);
    if (err instanceof TransitionError) return bad(err.message, 409);
    console.error('[api/slips]', err);
    return bad('เกิดข้อผิดพลาดระหว่างอัปโหลดสลิป กรุณาลองใหม่อีกครั้ง', 500);
  }
}
