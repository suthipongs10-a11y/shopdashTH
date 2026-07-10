'use client';

// กล่อง "สถานะคำสั่งซื้อล่าสุด" (ref T2) — ข้อมูลจริง:
// อ่านออร์เดอร์ล่าสุดของเครื่องนี้จาก localStorage (บันทึกตอน checkout สำเร็จ)
// → ยิง /api/orders/status (เลขออร์เดอร์+เบอร์โทร ต้องตรงคู่ — กติกาเดียวกับหน้า /track)
// ยังไม่เคยสั่งซื้อ → โชว์ timeline ตัวอย่างพร้อมป้าย "ตัวอย่าง"

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CARRIER_TH, ORDER_FLOW, ORDER_STATUS_TH, type Carrier, type OrderStatus } from '@/lib/orders/status';
import { formatThaiDate } from '@/lib/format';
import { loadLastOrder } from '@/lib/last-order';
import { CheckIcon } from './icons';

interface LiveOrder {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  carrier: Carrier | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
}

/** timeline แนวนอน n จุด — จุดที่ผ่านวงเขียวติ๊กถูก เส้นเขียวเชื่อมถึงขั้นปัจจุบัน (ref) */
function StepTimeline({ steps, doneCount }: { steps: readonly string[]; doneCount: number }) {
  const n = steps.length;
  const edge = 50 / n; // จุดแรก/จุดสุดท้ายอยู่กลางคอลัมน์ — เส้นเริ่ม/จบตรงนั้น
  return (
    <div className="relative mt-5">
      <div
        className="absolute top-3 h-0.5 -translate-y-1/2 bg-border"
        style={{ left: `${edge}%`, right: `${edge}%` }}
      />
      {doneCount > 1 && (
        <div
          className="absolute top-3 h-0.5 -translate-y-1/2 bg-success"
          style={{ left: `${edge}%`, width: `${((doneCount - 1) / n) * 100}%` }}
        />
      )}
      <div className="relative flex items-start">
        {steps.map((step, i) => {
          const done = i < doneCount;
          return (
            <div key={step} className="flex flex-1 flex-col items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  done ? 'bg-success text-primary-fg' : 'border border-border bg-surface text-text-muted'
                }`}
              >
                {done ? <CheckIcon size={13} /> : i + 1}
              </span>
              <p className={`mt-1.5 text-center text-[11px] leading-tight ${done ? 'text-text' : 'text-text-muted'}`}>
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FLOW_STEPS = ORDER_FLOW.map((s) => ORDER_STATUS_TH[s]);
const SAMPLE_STEPS = ['รับออเดอร์', 'กำลังจัดเตรียม', 'กำลังจัดส่ง', 'จัดส่งสำเร็จ'] as const;

export function LatestOrderStatus({
  slug,
  sampleOrderNumber,
}: {
  slug: string;
  sampleOrderNumber: string;
}) {
  const [order, setOrder] = useState<LiveOrder | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const last = loadLastOrder(slug);
    if (!last) {
      setChecked(true);
      return;
    }
    const params = new URLSearchParams({ num: last.orderNumber, phone: last.phone });
    fetch(`/api/orders/status?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { found?: boolean; order?: LiveOrder } | null) => {
        if (json?.found && json.order) setOrder(json.order);
      })
      .catch(() => undefined)
      .finally(() => setChecked(true));
  }, [slug]);

  const isReal = order !== null;
  const cancelled = order?.status === 'cancelled';
  const doneCount = order && !cancelled ? ORDER_FLOW.indexOf(order.status) + 1 : 0;

  return (
    <div className="rounded-md border border-border-soft bg-bg p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base font-semibold text-text">สถานะคำสั่งซื้อล่าสุด</h3>
        {!isReal && checked && (
          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted">
            ตัวอย่าง
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text">
          คำสั่งซื้อ{' '}
          <span className="font-semibold">#{order?.orderNumber ?? sampleOrderNumber}</span>{' '}
          <span className="ml-1 text-xs text-text-muted">
            {formatThaiDate(order?.createdAt ?? new Date().toISOString())}
          </span>
        </p>
        {cancelled ? (
          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
            ยกเลิกแล้ว
          </span>
        ) : (
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            {order ? ORDER_STATUS_TH[order.status] : 'กำลังจัดส่ง'}
          </span>
        )}
      </div>

      {isReal ? (
        !cancelled && <StepTimeline steps={FLOW_STEPS} doneCount={doneCount} />
      ) : (
        <StepTimeline steps={SAMPLE_STEPS} doneCount={3} />
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-soft pt-3 text-xs text-text-muted">
        {isReal ? (
          <>
            {order.carrier && (
              <span>
                ขนส่ง: <span className="font-medium text-text">{CARRIER_TH[order.carrier]}</span>
              </span>
            )}
            {order.trackingNumber &&
              (order.trackingUrl ? (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-link hover:underline"
                >
                  หมายเลขติดตาม: {order.trackingNumber}
                </a>
              ) : (
                <span>
                  หมายเลขติดตาม: <span className="font-medium text-link">{order.trackingNumber}</span>
                </span>
              ))}
            {!order.carrier && !order.trackingNumber && !cancelled && (
              <span>ร้านจะแจ้งเลขพัสดุเมื่อจัดส่งแล้ว</span>
            )}
            <Link
              href={`/track?num=${encodeURIComponent(order.orderNumber)}`}
              className="ml-auto font-medium text-link hover:underline"
            >
              ดูรายละเอียด
            </Link>
          </>
        ) : (
          <>
            <span>
              ขนส่ง: <span className="font-medium text-text">Kerry Express</span>
            </span>
            <span>
              หมายเลขติดตาม: <span className="font-medium text-link">KEX123456789TH</span>
            </span>
            <Link href="/track" className="ml-auto font-medium text-link hover:underline">
              ดูรายละเอียด
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
