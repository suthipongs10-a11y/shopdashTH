// แถวเครื่องมือ 3 กล่อง (ref T2): ติดตามคำสั่งซื้อ / สถานะคำสั่งซื้อล่าสุด / วิธีชำระเงิน
// กล่องกลางกว้างกว่า (~1 : 1.6 : 1 ตาม ref) — สถานะเป็นข้อมูลจริง (LatestOrderStatus)

import Link from 'next/link';
import { LatestOrderStatus } from './LatestOrderStatus';
import { BankIcon, CashIcon, CreditCardIcon, QrIcon } from './icons';

function TrackBox() {
  return (
    <div className="rounded-md border border-border-soft bg-bg p-5 shadow-card">
      <h3 className="font-heading text-base font-semibold text-text">ติดตามคำสั่งซื้อ</h3>
      <form action="/track" method="GET" className="mt-4 space-y-2.5">
        <input
          name="num"
          placeholder="กรอกหมายเลขคำสั่งซื้อ"
          aria-label="หมายเลขคำสั่งซื้อ"
          className="w-full rounded-sm border border-border bg-bg px-3.5 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-ring"
        />
        <button
          type="submit"
          className="w-full rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-deep"
        >
          ติดตาม
        </button>
      </form>
      <Link
        href="/track"
        className="mt-3 inline-block text-xs text-text-muted underline underline-offset-2 hover:text-text"
      >
        ดูประวัติคำสั่งซื้อทั้งหมด
      </Link>
    </div>
  );
}

const PAYMENT_METHODS = [
  { icon: CreditCardIcon, label: 'บัตรเครดิต / เดบิต', logos: true },
  { icon: BankIcon, label: 'โอนเงินผ่านธนาคาร', logos: false },
  { icon: QrIcon, label: 'พร้อมเพย์', logos: false },
  { icon: CashIcon, label: 'เก็บเงินปลายทาง', logos: false },
];

function PaymentBox() {
  return (
    <div className="rounded-md border border-border-soft bg-bg p-5 shadow-card">
      <h3 className="font-heading text-base font-semibold text-text">วิธีการชำระเงิน</h3>
      <ul className="mt-4 space-y-3.5">
        {PAYMENT_METHODS.map(({ icon: Icon, label, logos }) => (
          <li key={label} className="flex items-center gap-3 text-sm text-text">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border-soft bg-surface text-text">
              <Icon size={16} />
            </span>
            <span className="min-w-0 flex-1">{label}</span>
            {logos && (
              <span className="flex shrink-0 items-center gap-1">
                <span className="rounded-[3px] border border-border-soft px-1 py-0.5 text-[9px] font-bold italic text-brand-visa">
                  VISA
                </span>
                <span className="rounded-[3px] border border-border-soft px-1 py-0.5 text-[9px] font-bold text-brand-mastercard">
                  MC
                </span>
                <span className="rounded-[3px] border border-border-soft px-1 py-0.5 text-[9px] font-bold text-brand-jcb">
                  JCB
                </span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ToolsRow({ slug, sampleOrderNumber }: { slug: string; sampleOrderNumber: string }) {
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr_1fr]">
        <TrackBox />
        <LatestOrderStatus slug={slug} sampleOrderNumber={sampleOrderNumber} />
        <PaymentBox />
      </div>
    </section>
  );
}
