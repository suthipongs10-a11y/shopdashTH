// State machine ของออร์เดอร์ (§3.6) — จุดเดียวในระบบที่อนุญาตให้แก้ orders.status
// ห้าม update คอลัมน์ status ตรงๆ จากที่อื่นเด็ดขาด (§8.5 ข้อ 4)
//
// side effects:
//   → confirmed                    : ตัดสต๊อก (update ... where stock >= qty เช็ค affected
//                                    — §7.6 กัน race) + insert stock_movements
//   confirmed/packing → cancelled  : คืนสต๊อก + insert stock_movements
//   → shipped                      : ต้องมี carrier + tracking_number
//
// หมายเหตุ transaction: supabase-js ไม่มี multi-statement transaction —
// ใช้วิธีตัดสต๊อกทีละ variant แล้ว "ชดเชยคืน" รายการที่ตัดไปแล้วถ้าตัวใดตัวหนึ่งไม่พอ
// (บันทึกเหตุผลใน DECISIONS.md)

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Carrier, OrderStatus } from '@/lib/orders/status';

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransitionError';
  }
}

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['slip_uploaded', 'cancelled'],
  slip_uploaded: ['confirmed', 'pending_payment', 'cancelled'],
  confirmed: ['packing', 'cancelled'],
  packing: ['shipped', 'cancelled'],
  shipped: [], // จบ — ห้ามย้อน (§3.6)
  cancelled: [],
};

export interface TransitionOptions {
  /** บังคับเมื่อ to = cancelled */
  reason?: string;
  /** บังคับเมื่อ to = shipped */
  carrier?: Carrier;
  trackingNumber?: string;
}

interface OrderItemRow {
  variant_id: string;
  product_name: string;
  qty: number;
}

async function adjustStock(
  tenantId: string,
  orderId: string,
  items: OrderItemRow[],
  direction: 'deduct' | 'restore',
  reason: string,
): Promise<void> {
  const db = createAdminClient();
  const done: OrderItemRow[] = [];

  for (const item of items) {
    if (direction === 'deduct') {
      // atomic ต่อแถว: ตัดเฉพาะเมื่อสต๊อกพอ แล้วเช็คว่ามีแถวถูกแก้จริง (§7.6)
      const { data: current } = await db
        .from('product_variants')
        .select('stock')
        .eq('id', item.variant_id)
        .eq('tenant_id', tenantId)
        .single();

      const { data: updated } =
        current && current.stock >= item.qty
          ? await db
              .from('product_variants')
              .update({ stock: current.stock - item.qty })
              .eq('id', item.variant_id)
              .eq('tenant_id', tenantId)
              .eq('stock', current.stock) // optimistic lock กัน race
              .select('id')
          : { data: [] };

      if (!updated || updated.length === 0) {
        // สต๊อกไม่พอ/ชน race — คืนรายการที่ตัดไปแล้วทั้งหมด
        for (const d of done) {
          const { data: row } = await db
            .from('product_variants')
            .select('stock')
            .eq('id', d.variant_id)
            .eq('tenant_id', tenantId)
            .single();
          if (row) {
            await db
              .from('product_variants')
              .update({ stock: row.stock + d.qty })
              .eq('id', d.variant_id)
              .eq('tenant_id', tenantId);
          }
        }
        throw new TransitionError(
          `สต๊อกสินค้า "${item.product_name}" ไม่เพียงพอ (ต้องการ ${item.qty} ชิ้น) — ` +
            'กรุณาตรวจสอบสต๊อกก่อนยืนยันออร์เดอร์',
        );
      }
      done.push(item);
    } else {
      const { data: row } = await db
        .from('product_variants')
        .select('stock')
        .eq('id', item.variant_id)
        .eq('tenant_id', tenantId)
        .single();
      // variant อาจถูกลบไปแล้ว (สินค้าโดนลบ) — ข้ามการคืนแต่ยัง log movement
      if (row) {
        await db
          .from('product_variants')
          .update({ stock: row.stock + item.qty })
          .eq('id', item.variant_id)
          .eq('tenant_id', tenantId);
      }
    }
  }

  // audit ทุกการตัด/คืน (§3.4 stock_movements)
  await db.from('stock_movements').insert(
    items.map((item) => ({
      tenant_id: tenantId,
      variant_id: item.variant_id,
      order_id: orderId,
      delta: direction === 'deduct' ? -item.qty : item.qty,
      reason,
    })),
  );
}

/**
 * เปลี่ยนสถานะออร์เดอร์ตาม state machine — โยน TransitionError เมื่อผิดกติกา
 */
export async function transitionOrder(
  tenantId: string,
  orderId: string,
  to: OrderStatus,
  opts: TransitionOptions = {},
): Promise<void> {
  const db = createAdminClient();

  const { data: order } = await db
    .from('orders')
    .select('id, status, order_items(variant_id, product_name, qty)')
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .single();

  if (!order) throw new TransitionError('ไม่พบออร์เดอร์');
  const from = order.status as OrderStatus;

  if (!ALLOWED[from].includes(to)) {
    throw new TransitionError(`เปลี่ยนสถานะจาก "${from}" เป็น "${to}" ไม่ได้`);
  }

  const updates: Record<string, unknown> = { status: to };

  if (to === 'shipped') {
    if (!opts.carrier || !opts.trackingNumber?.trim()) {
      throw new TransitionError('ต้องระบุขนส่งและเลขพัสดุก่อนเปลี่ยนเป็นจัดส่งแล้ว');
    }
    updates.carrier = opts.carrier;
    updates.tracking_number = opts.trackingNumber.trim();
  }

  if (to === 'cancelled') {
    if (!opts.reason?.trim()) {
      throw new TransitionError('ต้องระบุเหตุผลในการยกเลิกออร์เดอร์');
    }
    updates.cancelled_reason = opts.reason.trim();
  }

  const items = (order.order_items ?? []) as OrderItemRow[];

  // ตัดสต๊อกก่อนเปลี่ยนสถานะ — ถ้าไม่พอ transition ล้มทั้งอัน (สถานะไม่ขยับ)
  if (to === 'confirmed') {
    await adjustStock(tenantId, orderId, items, 'deduct', 'order_confirmed');
  }
  // ยกเลิกออร์เดอร์ที่ตัดสต๊อกไปแล้ว (confirmed/packing) → คืนสต๊อก (§3.6)
  if (to === 'cancelled' && (from === 'confirmed' || from === 'packing')) {
    await adjustStock(tenantId, orderId, items, 'restore', 'order_cancelled_restore');
  }

  // optimistic concurrency: อัปเดตเฉพาะเมื่อสถานะยังเป็น from อยู่
  const { data: updated } = await db
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .eq('status', from)
    .select('id');

  if (!updated || updated.length === 0) {
    // สถานะถูกคนอื่นเปลี่ยนไปก่อน — ชดเชย side effect ที่ทำไปแล้ว
    if (to === 'confirmed') {
      await adjustStock(tenantId, orderId, items, 'restore', 'confirm_conflict_rollback');
    }
    throw new TransitionError('ออร์เดอร์ถูกอัปเดตโดยผู้อื่นพร้อมกัน กรุณารีเฟรชแล้วลองใหม่');
  }
}
