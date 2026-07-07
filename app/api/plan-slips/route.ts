// อัปโหลดสลิปค่าแพลน (Phase 3 §3.5) — เจ้าของร้านจ่ายค่าแพลนให้ "แพลตฟอร์ม"
// ต่างจาก /api/slips (ลูกค้าจ่ายร้าน): ผู้เรียกต้องเป็นแอดมินร้าน และเงินเข้า PromptPay แพลตฟอร์ม
// อนุญาตแม้ร้าน locked — เพราะนี่คือหน้าทางออกของร้านที่ค้างชำระ (§7.4)

import { NextResponse } from 'next/server';
import { getStoreUser } from '@/lib/auth';
import { createSubscriptionRequest } from '@/lib/billing';
import { IMAGE_MIME_EXT, MAX_IMAGE_BYTES, platformSlipKey, putObject } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContextAllowLocked, TenantNotFoundError } from '@/lib/tenant-context';

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const ctx = await getTenantContextAllowLocked();

    const user = await getStoreUser(ctx);
    if (!user) return bad('กรุณาเข้าสู่ระบบ', 401);

    const form = await req.formData();
    const planId = String(form.get('planId') ?? '').trim();
    const file = form.get('file');

    if (!planId || !(file instanceof File)) return bad('ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง');
    if (!(file.type in IMAGE_MIME_EXT)) return bad('รองรับเฉพาะไฟล์ jpg, png หรือ webp');
    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return bad('ขนาดไฟล์ต้องไม่เกิน 5MB');

    // ตรวจแพลนก่อนเขียนไฟล์
    const db = createAdminClient();
    const { data: plan } = await db
      .from('plans')
      .select('id, is_active')
      .eq('id', planId)
      .maybeSingle();
    if (!plan || !plan.is_active) return bad('ไม่พบแพลนที่เลือก');

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = platformSlipKey(ctx.tenantId, file.type);
    await putObject(key, buffer, file.type);

    const result = await createSubscriptionRequest(ctx.tenantId, planId, key);
    if (!result.ok) return bad(result.error);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenantNotFoundError) return bad(err.message, 404);
    console.error('[api/plan-slips]', err);
    return bad('เกิดข้อผิดพลาดระหว่างอัปโหลดสลิป กรุณาลองใหม่อีกครั้ง', 500);
  }
}
