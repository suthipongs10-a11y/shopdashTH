// หน้าชำระเงินหลังสร้างออร์เดอร์ (§2.1): PromptPay QR dynamic + เลขออร์เดอร์ + อัปสลิป
// QR สร้างจาก promptpay_id ของร้านนี้เท่านั้น (§1.2)

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QrPaymentPanel } from '@/components/storefront/QrPaymentPanel';
import { ORDER_STATUS_TH, type OrderStatus } from '@/lib/orders/status';
import { formatBaht } from '@/lib/format';
import { generatePromptpayQrSvg, isValidPromptpayId } from '@/lib/promptpay';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { SlipUploadClient } from './slip-upload-client';

interface PayOrderRow {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  order_items: { product_name: string; variant_label: string | null; unit_price: number; qty: number }[];
}

export default async function PayPage({ params }: { params: Promise<{ num: string }> }) {
  const { num } = await params;
  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data } = await db
    .from('orders')
    .select(
      'id, order_number, status, subtotal, shipping_fee, discount, total_amount, ' +
        'order_items(product_name, variant_label, unit_price, qty)',
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('order_number', num)
    .single();

  if (!data) notFound();
  const order = data as unknown as PayOrderRow;
  const status = order.status as OrderStatus;

  // เหตุผลสลิปที่ถูกปฏิเสธล่าสุด (§7.1 — ลูกค้าต้องเห็นเหตุผล)
  let rejectReason: string | null = null;
  if (status === 'pending_payment') {
    const { data: lastRejected } = await db
      .from('payment_slips')
      .select('reject_reason_th')
      .eq('tenant_id', ctx.tenantId)
      .eq('order_id', order.id)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    rejectReason = lastRejected?.reject_reason_th ?? null;
  }

  const summary = (
    <section className="rounded-md border border-border bg-bg p-4">
      <h2 className="mb-2 text-sm font-medium text-text-muted">รายการสินค้า</h2>
      <ul className="divide-y divide-border text-sm">
        {(order.order_items ?? []).map((item, i) => (
          <li key={i} className="flex justify-between gap-3 py-2">
            <span>
              {item.product_name}
              {item.variant_label && <span className="text-text-muted"> · {item.variant_label}</span>}
              <span className="text-text-muted"> × {item.qty}</span>
            </span>
            <span>{formatBaht(item.unit_price * item.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
        <div className="flex justify-between text-text-muted">
          <dt>ค่าจัดส่ง</dt>
          <dd>{order.shipping_fee === 0 ? 'ส่งฟรี' : formatBaht(order.shipping_fee)}</dd>
        </div>
        <div className="flex justify-between font-heading font-semibold">
          <dt>ยอดสุทธิ</dt>
          <dd>{formatBaht(order.total_amount)}</dd>
        </div>
      </dl>
    </section>
  );

  const trackLink = (
    <p className="text-center text-sm text-text-muted">
      ติดตามสถานะได้ที่{' '}
      <Link href="/track" className="underline underline-offset-2 hover:text-text">
        หน้าติดตามคำสั่งซื้อ
      </Link>{' '}
      ด้วยเลขออร์เดอร์และเบอร์โทรของคุณ
    </p>
  );

  // ---------- สถานะอื่นที่ไม่ใช่รอชำระ ----------
  if (status !== 'pending_payment') {
    return (
      <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
        <div className="rounded-md bg-surface p-6 text-center">
          <h1 className="font-heading text-xl font-semibold">ออร์เดอร์ {order.order_number}</h1>
          <p className="mt-2 text-sm">
            สถานะ: <span className="font-medium">{ORDER_STATUS_TH[status]}</span>
          </p>
          {status === 'slip_uploaded' && (
            <p className="mt-2 text-sm text-text-muted">
              เราได้รับสลิปของคุณแล้ว ร้านกำลังตรวจสอบ — โดยปกติใช้เวลาไม่นาน
            </p>
          )}
        </div>
        {summary}
        {trackLink}
      </main>
    );
  }

  // ---------- รอชำระเงิน: QR + อัปสลิป ----------
  const promptpayId = ctx.store.promptpay_id;
  const canPay = promptpayId !== null && isValidPromptpayId(promptpayId);
  const qrSvg = canPay ? await generatePromptpayQrSvg(promptpayId, order.total_amount) : null;

  return (
    <main className="mx-auto max-w-lg space-y-6 px-4 py-10">
      {rejectReason && (
        <div className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-medium">สลิปก่อนหน้าถูกปฏิเสธ</p>
          <p className="mt-1">เหตุผล: {rejectReason}</p>
          <p className="mt-1">กรุณาตรวจสอบและอัปโหลดสลิปที่ถูกต้องอีกครั้ง</p>
        </div>
      )}

      {qrSvg ? (
        <QrPaymentPanel
          orderNumber={order.order_number}
          amount={order.total_amount}
          qrSvg={qrSvg}
          accountName={ctx.store.promptpay_account_name}
          promptpayId={promptpayId}
        />
      ) : (
        <div className="rounded-md bg-danger-soft px-4 py-6 text-center text-sm text-danger">
          ร้านค้ายังไม่ได้ตั้งค่าบัญชี PromptPay — กรุณาติดต่อร้านโดยตรงเพื่อชำระเงิน
        </div>
      )}

      <section>
        <h2 className="mb-3 font-heading text-lg font-semibold">อัปโหลดสลิปโอนเงิน</h2>
        <SlipUploadClient orderNumber={order.order_number} />
      </section>

      {summary}
      {trackLink}
    </main>
  );
}
