// สร้างออร์เดอร์จาก checkout (§2.1, 1.7) — เรียกจาก /api/checkout เท่านั้น (service role)
// กติกาเหล็ก: ราคา/ยอดคำนวณจาก DB เสมอ ห้ามเชื่อ payload จาก client (§8.5 ข้อ 7)
// สต๊อกยัง "ไม่ตัด" ตอนสร้างออร์เดอร์ — ตัดตอน confirmed (§2.3) แต่ปฏิเสธถ้าสต๊อกไม่พอ ณ ตอนสั่ง

import 'server-only';
import {
  consumeDiscountCode,
  releaseDiscountCode,
  validateDiscountCode,
} from '@/lib/discounts';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TenantContext } from '@/lib/tenant-context';
import { variantLabel } from '@/lib/variants';

const PHONE_PATTERN = /^0[0-9]{9}$/;
const ORDER_NUMBER_MAX_ATTEMPTS = 5;

export interface CheckoutItemInput {
  variantId: string;
  qty: number;
  /** ราคาที่ลูกค้าเห็นในตะกร้า — ใช้ตรวจ "ราคาเปลี่ยนระหว่างเปิดหน้า" (§7.6) */
  expectedUnitPrice: number;
}

export interface CheckoutCustomerInput {
  shipName: string;
  shipPhone: string;
  shipAddress: string;
  note?: string;
}

export type CreateOrderResult =
  | { ok: true; orderNumber: string; totalAmount: number }
  | { ok: false; status: number; error: string }
  | {
      ok: false;
      status: 409;
      error: string;
      priceChanged: true;
      items: { variantId: string; unitPrice: number }[];
    };

interface VariantRow {
  id: string;
  size: string | null;
  color: string | null;
  price_override: number | null;
  stock: number;
  is_enabled: boolean;
  products: { id: string; name: string; base_price: number; status: string };
}

/** วันที่ YYMMDD ตามเวลาไทย (§7.6 วันตัดยอด = เที่ยงคืน Asia/Bangkok) */
function bangkokYYMMDD(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}${get('month')}${get('day')}`;
}

export async function createOrder(
  ctx: TenantContext,
  items: CheckoutItemInput[],
  customer: CheckoutCustomerInput,
  discountCode?: string,
): Promise<CreateOrderResult> {
  // ---------- validate input ----------
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, error: 'ตะกร้าสินค้าว่างเปล่า' };
  }
  if (
    items.some(
      (i) =>
        typeof i.variantId !== 'string' ||
        !Number.isInteger(i.qty) ||
        i.qty <= 0 ||
        typeof i.expectedUnitPrice !== 'number',
    )
  ) {
    return { ok: false, status: 400, error: 'รายการสินค้าไม่ถูกต้อง' };
  }
  const shipName = customer.shipName?.trim();
  const shipPhone = customer.shipPhone?.trim();
  const shipAddress = customer.shipAddress?.trim();
  if (!shipName) return { ok: false, status: 400, error: 'กรุณากรอกชื่อผู้รับ' };
  if (!PHONE_PATTERN.test(shipPhone ?? '')) {
    return { ok: false, status: 400, error: 'เบอร์โทรต้องเป็นเบอร์มือถือ 10 หลัก ขึ้นต้นด้วย 0' };
  }
  if (!shipAddress || shipAddress.length < 10) {
    return { ok: false, status: 400, error: 'กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน' };
  }

  const db = createAdminClient();

  // ---------- โหลด variant + ราคาจริงจาก DB ----------
  const variantIds = items.map((i) => i.variantId);
  const { data: variantRows, error: variantError } = await db
    .from('product_variants')
    .select(
      'id, size, color, price_override, stock, is_enabled, products!inner(id, name, base_price, status)',
    )
    .eq('tenant_id', ctx.tenantId)
    .in('id', variantIds);

  if (variantError) {
    return { ok: false, status: 500, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
  }

  const variants = new Map(
    ((variantRows ?? []) as unknown as VariantRow[]).map((v) => [v.id, v]),
  );

  const lines: {
    variantId: string;
    productName: string;
    variantLabel: string | null;
    unitPrice: number;
    qty: number;
  }[] = [];

  for (const item of items) {
    const v = variants.get(item.variantId);
    if (!v || !v.is_enabled || v.products.status !== 'published') {
      return {
        ok: false,
        status: 400,
        error: 'มีสินค้าบางรายการถูกปิดขายแล้ว กรุณาลบออกจากตะกร้า',
      };
    }
    // DoD ข้อ 4: กันยิง API ตรงตอนสต๊อกไม่พอ
    if (v.stock < item.qty) {
      const label = v.size || v.color ? ` (${variantLabel(v.size, v.color)})` : '';
      return {
        ok: false,
        status: 400,
        error: `สินค้า "${v.products.name}"${label} มีไม่เพียงพอ (คงเหลือ ${v.stock} ชิ้น)`,
      };
    }
    lines.push({
      variantId: v.id,
      productName: v.products.name,
      variantLabel: v.size || v.color ? variantLabel(v.size, v.color) : null,
      unitPrice: v.price_override ?? v.products.base_price,
      qty: item.qty,
    });
  }

  // ---------- ราคาเปลี่ยนระหว่างลูกค้าเปิดหน้า (§7.6) ----------
  const changed = items.filter((item) => {
    const line = lines.find((l) => l.variantId === item.variantId);
    return line !== undefined && line.unitPrice !== item.expectedUnitPrice;
  });
  if (changed.length > 0) {
    return {
      ok: false,
      status: 409,
      error: 'ราคาสินค้ามีการเปลี่ยนแปลง กรุณาตรวจสอบยอดใหม่แล้วยืนยันอีกครั้ง',
      priceChanged: true,
      items: lines.map((l) => ({ variantId: l.variantId, unitPrice: l.unitPrice })),
    };
  }

  // ---------- ยอดเงิน (server คำนวณเองทั้งหมด) ----------
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
  const freeShipping =
    ctx.store.free_shipping_min !== null && subtotal >= ctx.store.free_shipping_min;
  const shippingFee = freeShipping ? 0 : ctx.store.flat_shipping_fee;

  // ---------- โค้ดส่วนลด (P4 §2.1 — validate ฝั่ง server + กันโควตา atomic) ----------
  let discount = 0;
  let discountCodeId: string | null = null;
  if (discountCode?.trim()) {
    const validation = await validateDiscountCode(ctx, discountCode, subtotal);
    if (!validation.ok) return { ok: false, status: 400, error: validation.reason };

    // กันโควตาก่อนสร้างออร์เดอร์ — ยิงพร้อมกันหลาย request ผ่านได้ตามโควตาเป๊ะ
    const consumed = await consumeDiscountCode(ctx.tenantId, validation.discountId);
    if (!consumed) return { ok: false, status: 400, error: 'โค้ดนี้ถูกใช้ครบจำนวนแล้ว' };
    discount = validation.amount;
    discountCodeId = validation.discountId;
  }
  // ถ้าออร์เดอร์สร้างไม่สำเร็จหลังจากนี้ ต้องคืนโควตา (compensation)
  const failWithRelease = async (result: CreateOrderResult): Promise<CreateOrderResult> => {
    if (discountCodeId) await releaseDiscountCode(ctx.tenantId, discountCodeId);
    return result;
  };

  const totalAmount = subtotal + shippingFee - discount;

  // ---------- dedupe ลูกค้าด้วยเบอร์โทร (§7.6: อัปเดตชื่อเป็นค่าล่าสุด) ----------
  const { data: customerRow, error: customerError } = await db
    .from('customers')
    .upsert(
      { tenant_id: ctx.tenantId, phone: shipPhone, name: shipName },
      { onConflict: 'tenant_id,phone' },
    )
    .select('id')
    .single();

  if (customerError || !customerRow) {
    return failWithRelease({
      ok: false,
      status: 500,
      error: 'บันทึกข้อมูลลูกค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
    });
  }

  // ---------- gen order_number: {SLUGCAPS}-{YYMMDD}-{running 4 หลัก/วัน/ร้าน} ----------
  const prefix = `${ctx.slug.toUpperCase()}-${bangkokYYMMDD()}`;
  for (let attempt = 0; attempt < ORDER_NUMBER_MAX_ATTEMPTS; attempt++) {
    const { count } = await db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', ctx.tenantId)
      .like('order_number', `${prefix}-%`);

    const running = (count ?? 0) + 1 + attempt;
    const orderNumber = `${prefix}-${String(running).padStart(4, '0')}`;

    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        tenant_id: ctx.tenantId,
        order_number: orderNumber,
        customer_id: customerRow.id,
        status: 'pending_payment',
        subtotal,
        shipping_fee: shippingFee,
        discount,
        discount_code_id: discountCodeId,
        total_amount: totalAmount,
        ship_name: shipName,
        ship_phone: shipPhone,
        ship_address: shipAddress,
        note: customer.note?.trim() || null,
      })
      .select('id')
      .single();

    if (orderError) {
      if (orderError.code === '23505') continue; // เลขชนจาก race — ลองเลขถัดไป
      return failWithRelease({
        ok: false,
        status: 500,
        error: 'สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      });
    }

    // snapshot ชื่อ/ราคา ณ เวลาสั่ง (§3.4)
    const { error: itemsError } = await db.from('order_items').insert(
      lines.map((l) => ({
        tenant_id: ctx.tenantId,
        order_id: order.id,
        variant_id: l.variantId,
        product_name: l.productName,
        variant_label: l.variantLabel,
        unit_price: l.unitPrice,
        qty: l.qty,
      })),
    );

    if (itemsError) {
      await db.from('orders').delete().eq('id', order.id).eq('tenant_id', ctx.tenantId);
      return failWithRelease({
        ok: false,
        status: 500,
        error: 'สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      });
    }

    return { ok: true, orderNumber, totalAmount };
  }

  return failWithRelease({ ok: false, status: 500, error: 'ระบบหนาแน่น กรุณาลองใหม่อีกครั้ง' });
}
