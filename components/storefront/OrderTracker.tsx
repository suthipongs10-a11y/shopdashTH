// แสดงสถานะออร์เดอร์สำหรับลูกค้า (หน้าติดตามออร์เดอร์ — งาน 1.10)
// timeline ตาม state machine §3.6 + เหตุผลสลิปถูกปฏิเสธ (§7.1)

import { CARRIER_TH, ORDER_FLOW, ORDER_STATUS_TH } from '@/lib/orders/status';
import { formatBaht, formatThaiDateTime } from '@/lib/format';
import type { TrackedOrder } from './types';

function StatusTimeline({ status }: { status: TrackedOrder['status'] }) {
  const currentIndex = ORDER_FLOW.indexOf(status);
  return (
    <ol className="space-y-0">
      {ORDER_FLOW.map((step, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <li key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isDone || isCurrent
                    ? 'bg-primary text-primary-fg'
                    : 'border border-border bg-surface text-text-muted'
                }`}
              >
                {isDone ? '✓' : i + 1}
              </span>
              {i < ORDER_FLOW.length - 1 && (
                <span className={`w-px flex-1 ${isDone ? 'bg-primary' : 'bg-border'}`} />
              )}
            </div>
            <p
              className={`pb-6 pt-1 text-sm ${
                isCurrent ? 'font-semibold text-primary' : isDone ? 'text-text' : 'text-text-muted'
              }`}
            >
              {ORDER_STATUS_TH[step]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTracker({ order }: { order: TrackedOrder }) {
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">ออร์เดอร์ {order.orderNumber}</h2>
          <p className="text-sm text-text-muted">สั่งซื้อเมื่อ {formatThaiDateTime(order.createdAt)}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            isCancelled
              ? 'bg-danger-soft text-danger'
              : order.status === 'shipped'
                ? 'bg-success-soft text-success'
                : 'bg-surface text-text'
          }`}
        >
          {ORDER_STATUS_TH[order.status]}
        </span>
      </div>

      {isCancelled ? (
        <div className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-medium">ออร์เดอร์นี้ถูกยกเลิกแล้ว</p>
          {order.cancelledReason && <p className="mt-1">เหตุผล: {order.cancelledReason}</p>}
        </div>
      ) : (
        <StatusTimeline status={order.status} />
      )}

      {order.status === 'pending_payment' && order.lastSlipRejectReason && (
        <div className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger">
          <p className="font-medium">สลิปของคุณถูกปฏิเสธ</p>
          <p className="mt-1">เหตุผล: {order.lastSlipRejectReason}</p>
          <p className="mt-1">กรุณาตรวจสอบและอัปโหลดสลิปใหม่ หรือติดต่อร้านค้า</p>
        </div>
      )}

      {order.status === 'shipped' && order.trackingNumber && (
        <div className="rounded-md bg-surface px-4 py-3 text-sm">
          <p className="font-medium">พัสดุถูกจัดส่งแล้ว</p>
          <p className="mt-1 text-text-muted">
            ขนส่ง: {order.carrier ? CARRIER_TH[order.carrier] : '-'} · เลขพัสดุ:{' '}
            <span className="font-medium text-text">{order.trackingNumber}</span>
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <ul className="divide-y divide-border">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.productName}</p>
                {item.variantLabel && <p className="text-xs text-text-muted">{item.variantLabel}</p>}
              </div>
              <p className="shrink-0 text-text-muted">
                {formatBaht(item.unitPrice)} × {item.qty}
              </p>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-border bg-surface px-4 py-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-text-muted">ยอดรวมสินค้า</dt>
            <dd>{formatBaht(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-muted">ค่าจัดส่ง</dt>
            <dd>{order.shippingFee === 0 ? 'ส่งฟรี' : formatBaht(order.shippingFee)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>ส่วนลด</dt>
              <dd>-{formatBaht(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 font-heading text-base font-semibold">
            <dt>ยอดสุทธิ</dt>
            <dd>{formatBaht(order.totalAmount)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
