// หน้าสรุปคำสั่งซื้อ + ชำระเงิน (§2.1 + Billing v2 order summary)
// - QR สร้างจาก promptpay_id ของร้านนี้เท่านั้น ยอดตรง orders.total_amount (§1.2)
// - เลขออร์เดอร์เดาได้ ({SLUG}-{YYMMDD}-{run}) — ข้อมูลจัดส่ง (ชื่อ/เบอร์/ที่อยู่)
//   แสดงเฉพาะเมื่อลิงก์มี ?t={public_token} ตรงกับออร์เดอร์ (ดู DECISIONS)
//   ไม่มี token เห็นเฉพาะรายการสินค้า+ยอด (พฤติกรรมเดิมของหน้า pay)

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { QrPaymentPanel } from '@/components/storefront/QrPaymentPanel';
import { trackingUrl } from '@/lib/carriers';
import { CARRIER_TH, ORDER_STATUS_TH, type Carrier, type OrderStatus } from '@/lib/orders/status';
import { formatBaht, formatThaiDateTime } from '@/lib/format';
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
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  note: string | null;
  carrier: string | null;
  tracking_number: string | null;
  created_at: string;
  public_token: string;
  order_items: { product_name: string; variant_label: string | null; unit_price: number; qty: number }[];
}

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ num: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ num }, { t: token }] = await Promise.all([params, searchParams]);
  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data } = await db
    .from('orders')
    .select(
      'id, order_number, status, subtotal, shipping_fee, discount, total_amount, ' +
        'ship_name, ship_phone, ship_address, note, carrier, tracking_number, created_at, public_token, ' +
        'order_items(product_name, variant_label, unit_price, qty)',
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('order_number', num)
    .single();

  if (!data) notFound();
  const order = data as unknown as PayOrderRow;
  const status = order.status as OrderStatus;
  // ลิงก์ที่มี token ตรง = ลิงก์ส่วนตัวของลูกค้า → เห็นข้อมูลจัดส่งเต็ม
  const verified = typeof token === 'string' && token.length > 0 && token === order.public_token;

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

  const store = ctx.store;
  const shipTrackUrl = trackingUrl(order.carrier, order.tracking_number);

  // ---------- ส่วนหัว: ร้าน + เลขออร์เดอร์ + วันเวลา + สถานะ ----------
  const header = (
    <section className="rounded-lg border border-border bg-surface p-5">
      <p className="text-sm text-text-muted">{store.name}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-heading text-xl font-semibold">
          คำสั่งซื้อ {order.order_number}
        </h1>
        <span className="rounded-full bg-bg px-3 py-1 text-sm font-medium">
          {ORDER_STATUS_TH[status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-text-muted">
        สั่งซื้อเมื่อ {formatThaiDateTime(order.created_at)}
      </p>
    </section>
  );

  // ---------- รายการสินค้า + สรุปยอด (ครบทุกบรรทัด: รวมสินค้า/ส่วนลด/ค่าส่ง/สุทธิ) ----------
  const summary = (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h2 className="mb-3 font-heading font-semibold">รายการสินค้าที่สั่งซื้อ</h2>
      <ul className="divide-y divide-border text-sm">
        {(order.order_items ?? []).map((item, i) => (
          <li key={i} className="flex justify-between gap-3 py-2">
            <span>
              <span className="font-medium">{item.product_name}</span>
              {item.variant_label && <span className="text-text-muted"> · {item.variant_label}</span>}
              <span className="block text-text-muted">
                {formatBaht(item.unit_price)} × {item.qty} ชิ้น
              </span>
            </span>
            <span className="shrink-0">{formatBaht(item.unit_price * item.qty)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between text-text-muted">
          <dt>รวมค่าสินค้า</dt>
          <dd>{formatBaht(order.subtotal)}</dd>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between text-success">
            <dt>ส่วนลด</dt>
            <dd>-{formatBaht(order.discount)}</dd>
          </div>
        )}
        <div className="flex justify-between text-text-muted">
          <dt>ค่าจัดส่ง</dt>
          <dd>{order.shipping_fee === 0 ? 'ส่งฟรี' : formatBaht(order.shipping_fee)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-heading text-base font-semibold">
          <dt>ยอดชำระสุทธิ</dt>
          <dd>{formatBaht(order.total_amount)}</dd>
        </div>
      </dl>
    </section>
  );

  // ---------- ข้อมูลจัดส่ง — เฉพาะลิงก์ที่มี token (กันคนเดาเลขออร์เดอร์เห็นที่อยู่) ----------
  const shippingInfo = verified ? (
    <section className="rounded-lg border border-border bg-surface p-5 text-sm">
      <h2 className="mb-2 font-heading font-semibold">ที่อยู่จัดส่ง</h2>
      <p className="font-medium">{order.ship_name}</p>
      <p className="text-text-muted">{order.ship_phone}</p>
      <p className="mt-1 whitespace-pre-wrap text-text-muted">{order.ship_address}</p>
      {order.note && (
        <p className="mt-2 rounded-md bg-bg px-3 py-2 text-text-muted">
          หมายเหตุถึงร้าน: {order.note}
        </p>
      )}
    </section>
  ) : (
    <p className="text-center text-xs text-text-muted">
      ข้อมูลจัดส่งแสดงเฉพาะในลิงก์ส่วนตัวที่ได้รับหลังสั่งซื้อ — หรือตรวจสอบได้ที่หน้า{' '}
      <Link href="/track" className="underline underline-offset-2">
        ติดตามคำสั่งซื้อ
      </Link>{' '}
      ด้วยเลขออร์เดอร์ + เบอร์โทร
    </p>
  );

  // ---------- รอบจัดส่ง / นโยบายร้าน ----------
  const shippingPolicy = (store.order_cutoff_time || store.shipping_note_th) && (
    <section className="rounded-lg border border-border bg-surface p-5 text-sm">
      <h2 className="mb-2 font-heading font-semibold">การจัดส่ง</h2>
      {store.order_cutoff_time && (
        <p>
          ร้านตัดรอบจัดส่งทุกวันเวลา{' '}
          <span className="font-semibold">{store.order_cutoff_time} น.</span> — คำสั่งซื้อที่ยืนยัน
          การชำระเงินก่อนเวลาตัดรอบ จะถูกจัดส่งภายในรอบของวันนั้น
          หลังเวลาตัดรอบจะจัดส่งในรอบถัดไป
        </p>
      )}
      {store.shipping_note_th && (
        <p className="mt-2 whitespace-pre-wrap text-text-muted">{store.shipping_note_th}</p>
      )}
    </section>
  );

  // ---------- ข้อมูลติดต่อร้าน ----------
  const storeContact = (store.phone || store.address) && (
    <section className="rounded-lg border border-border bg-surface p-5 text-sm">
      <h2 className="mb-2 font-heading font-semibold">ติดต่อร้าน</h2>
      <p className="font-medium">{store.name}</p>
      {store.phone && <p className="text-text-muted">โทร {store.phone}</p>}
      {store.address && (
        <p className="mt-1 whitespace-pre-wrap text-text-muted">{store.address}</p>
      )}
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
      <main className="mx-auto max-w-lg space-y-5 px-4 py-10">
        {header}

        {status === 'slip_uploaded' && (
          <div className="rounded-lg bg-surface p-4 text-center text-sm text-text-muted">
            เราได้รับสลิปของคุณแล้ว ร้านกำลังตรวจสอบ — โดยปกติใช้เวลาไม่นาน
          </div>
        )}
        {(status === 'shipped' || order.tracking_number) && order.tracking_number && (
          <div className="rounded-lg border border-border bg-surface p-4 text-center text-sm">
            <p>
              จัดส่งโดย{' '}
              <span className="font-medium">
                {order.carrier ? CARRIER_TH[order.carrier as Carrier] : '-'}
              </span>{' '}
              · เลขพัสดุ <span className="font-medium">{order.tracking_number}</span>
            </p>
            {shipTrackUrl && (
              <a
                href={shipTrackUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm underline underline-offset-2"
              >
                เปิดหน้าติดตามพัสดุของขนส่ง ↗
              </a>
            )}
          </div>
        )}

        {summary}
        {shippingInfo}
        {shippingPolicy}
        {storeContact}
        {trackLink}
      </main>
    );
  }

  // ---------- รอชำระเงิน: QR ยอดตรงออร์เดอร์ + อัปสลิป ----------
  const promptpayId = store.promptpay_id;
  const canPay = promptpayId !== null && isValidPromptpayId(promptpayId);
  const qrSvg = canPay ? await generatePromptpayQrSvg(promptpayId, order.total_amount) : null;

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 py-10">
      {header}

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
          accountName={store.promptpay_account_name}
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
      {shippingInfo}
      {shippingPolicy}
      {storeContact}
      {trackLink}
    </main>
  );
}
