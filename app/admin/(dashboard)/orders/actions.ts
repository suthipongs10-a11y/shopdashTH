'use server';

// Server actions ฝั่ง Store Admin: อนุมัติ/ปฏิเสธสลิป + เปลี่ยนสถานะออร์เดอร์
// ทุกการเปลี่ยน status ผ่าน lib/orders/transition.ts เท่านั้น (§8.5 ข้อ 4)

import { revalidatePath } from 'next/cache';
import { getStoreUser } from '@/lib/auth';
import { CARRIERS, type Carrier } from '@/lib/orders/status';
import { transitionOrder, TransitionError } from '@/lib/orders/transition';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';

export interface OrderActionState {
  error?: string;
  success?: string;
}

// server actions เรียกตรงได้โดยไม่ผ่าน layout — ต้องตรวจ owner/staff ของร้านนี้ทุกครั้ง
async function requireAdminUser(): Promise<string> {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  if (!user) throw new TransitionError('กรุณาเข้าสู่ระบบ');
  return user.id;
}

function revalidateOrderPaths(orderId: string) {
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/slips');
}

// ---------- คิวสลิป (§2.2) ----------

export async function approveSlip(
  slipId: string,
  _prevState: OrderActionState,
): Promise<OrderActionState> {
  try {
    const reviewerId = await requireAdminUser();
    const ctx = await getTenantContext();
    const db = createAdminClient();

    const { data: slip } = await db
      .from('payment_slips')
      .select('id, order_id, status')
      .eq('id', slipId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (!slip) return { error: 'ไม่พบสลิป' };
    if (slip.status !== 'pending') return { error: 'สลิปนี้ถูกตัดสินไปแล้ว' };

    // transition ก่อน (ตัดสต๊อกในตัว) — ถ้าสต๊อกไม่พอ สลิปยังค้างคิวไว้ให้จัดการต่อ
    await transitionOrder(ctx.tenantId, slip.order_id, 'confirmed');

    await db
      .from('payment_slips')
      .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
      .eq('id', slipId)
      .eq('tenant_id', ctx.tenantId);

    revalidateOrderPaths(slip.order_id);
    return { success: 'อนุมัติสลิปแล้ว — ออร์เดอร์ยืนยันและตัดสต๊อกเรียบร้อย' };
  } catch (err) {
    return { error: err instanceof TransitionError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
}

export async function rejectSlip(
  slipId: string,
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const presetReason = String(formData.get('preset_reason') ?? '').trim();
  const extraNote = String(formData.get('extra_note') ?? '').trim();
  const reason = [presetReason, extraNote].filter(Boolean).join(' — ');
  if (!reason) return { error: 'กรุณาเลือกหรือกรอกเหตุผลที่ปฏิเสธ' };

  try {
    const reviewerId = await requireAdminUser();
    const ctx = await getTenantContext();
    const db = createAdminClient();

    const { data: slip } = await db
      .from('payment_slips')
      .select('id, order_id, status')
      .eq('id', slipId)
      .eq('tenant_id', ctx.tenantId)
      .single();

    if (!slip) return { error: 'ไม่พบสลิป' };
    if (slip.status !== 'pending') return { error: 'สลิปนี้ถูกตัดสินไปแล้ว' };

    await db
      .from('payment_slips')
      .update({
        status: 'rejected',
        reject_reason_th: reason,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', slipId)
      .eq('tenant_id', ctx.tenantId);

    // ออร์เดอร์กลับไปรอชำระ — ลูกค้าเห็นเหตุผลและอัปสลิปใหม่ได้ (§7.1)
    await transitionOrder(ctx.tenantId, slip.order_id, 'pending_payment');

    revalidateOrderPaths(slip.order_id);
    return { success: 'ปฏิเสธสลิปแล้ว — ออร์เดอร์กลับเป็นรอชำระเงิน' };
  } catch (err) {
    return { error: err instanceof TransitionError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
}

// ---------- เปลี่ยนสถานะออร์เดอร์ ----------

export async function markPacking(
  orderId: string,
  _prevState: OrderActionState,
): Promise<OrderActionState> {
  try {
    await requireAdminUser();
    const ctx = await getTenantContext();
    await transitionOrder(ctx.tenantId, orderId, 'packing');
    revalidateOrderPaths(orderId);
    return { success: 'เปลี่ยนสถานะเป็นกำลังแพ็คสินค้าแล้ว' };
  } catch (err) {
    return { error: err instanceof TransitionError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
}

export async function markShipped(
  orderId: string,
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const carrier = String(formData.get('carrier') ?? '') as Carrier;
  const trackingNumber = String(formData.get('tracking_number') ?? '').trim();

  if (!CARRIERS.includes(carrier)) return { error: 'กรุณาเลือกขนส่ง' };
  if (!trackingNumber) return { error: 'กรุณากรอกเลขพัสดุ' };

  try {
    await requireAdminUser();
    const ctx = await getTenantContext();
    await transitionOrder(ctx.tenantId, orderId, 'shipped', { carrier, trackingNumber });
    revalidateOrderPaths(orderId);
    return { success: 'บันทึกการจัดส่งแล้ว' };
  } catch (err) {
    return { error: err instanceof TransitionError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
}

export async function cancelOrder(
  orderId: string,
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) return { error: 'กรุณากรอกเหตุผลในการยกเลิก' };

  try {
    await requireAdminUser();
    const ctx = await getTenantContext();
    await transitionOrder(ctx.tenantId, orderId, 'cancelled', { reason });
    revalidateOrderPaths(orderId);
    return { success: 'ยกเลิกออร์เดอร์แล้ว' };
  } catch (err) {
    return { error: err instanceof TransitionError ? err.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่' };
  }
}
