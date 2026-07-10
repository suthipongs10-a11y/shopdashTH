// แถวเครื่องมือ 3 กล่อง (ref T2): ติดตามคำสั่งซื้อ / สถานะคำสั่งซื้อล่าสุด (ตัวอย่าง) / วิธีชำระเงิน
// กล่องกลางกว้างกว่า (~1 : 1.6 : 1 ตาม ref)

import Link from 'next/link';
import { BankIcon, CashIcon, CheckIcon, CreditCardIcon, QrIcon } from './icons';

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

// timeline สถานะ (ตัวอย่างประกอบ — เดโม่ให้ลูกค้าร้านเห็นหน้าตาระบบจริง)
const DEMO_STEPS = ['รับออเดอร์', 'กำลังจัดเตรียม', 'กำลังจัดส่ง', 'จัดส่งสำเร็จ'];
const DEMO_DONE = 3; // ผ่านแล้ว 3 ขั้น

function StatusBox({ orderNumber, orderDate }: { orderNumber: string; orderDate: string }) {
  return (
    <div className="rounded-md border border-border-soft bg-bg p-5 shadow-card">
      <h3 className="font-heading text-base font-semibold text-text">สถานะคำสั่งซื้อล่าสุด</h3>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text">
          คำสั่งซื้อ <span className="font-semibold">#{orderNumber}</span>{' '}
          <span className="ml-1 text-xs text-text-muted">{orderDate}</span>
        </p>
        <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
          กำลังจัดส่ง
        </span>
      </div>

      {/* timeline แนวนอน 4 จุด — จุดที่ผ่านวงเขียวติ๊กถูก เส้นเขียวเชื่อมถึงขั้นปัจจุบัน (ref) */}
      <div className="relative mt-5">
        <div className="absolute left-[12.5%] right-[12.5%] top-3 h-0.5 -translate-y-1/2 bg-border" />
        <div
          className="absolute left-[12.5%] top-3 h-0.5 -translate-y-1/2 bg-success"
          style={{ width: `${((DEMO_DONE - 1) / DEMO_STEPS.length) * 100}%` }}
        />
        <div className="relative flex items-start">
          {DEMO_STEPS.map((step, i) => {
            const done = i < DEMO_DONE;
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

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-soft pt-3 text-xs text-text-muted">
        <span>
          ขนส่ง: <span className="font-medium text-text">Kerry Express</span>
        </span>
        <span>
          หมายเลขติดตาม: <span className="font-medium text-link">KEX123456789TH</span>
        </span>
        <Link href="/track" className="ml-auto font-medium text-link hover:underline">
          ดูรายละเอียด
        </Link>
      </div>
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

export function ToolsRow({ demoOrderNumber, demoOrderDate }: { demoOrderNumber: string; demoOrderDate: string }) {
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr_1fr]">
        <TrackBox />
        <StatusBox orderNumber={demoOrderNumber} orderDate={demoOrderDate} />
        <PaymentBox />
      </div>
    </section>
  );
}
