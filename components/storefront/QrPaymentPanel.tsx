// แผงชำระเงิน PromptPay — แสดง QR dynamic ยอดตามออร์เดอร์ (§2.2)
// QR ถูก generate ฝั่ง server (lib/promptpay.ts — งาน 1.8) แล้วส่งมาเป็น SVG string

import { formatBaht } from '@/lib/format';

export function QrPaymentPanel({
  orderNumber,
  amount,
  qrSvg,
  accountName,
  promptpayId,
}: {
  orderNumber: string;
  amount: number;
  /** SVG markup ของ QR (สร้างจาก promptpay-qr + qrcode ฝั่ง server) */
  qrSvg: string;
  /** ชื่อบัญชี PromptPay ของร้าน — ให้ลูกค้าเทียบก่อนโอน */
  accountName?: string | null;
  promptpayId?: string | null;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface text-center shadow-card">
      <div className="bg-primary px-6 py-3">
        <h2 className="font-heading text-lg font-semibold text-primary-fg">
          สแกนจ่ายด้วย PromptPay
        </h2>
        <p className="text-xs text-primary-fg/80">เลขที่ออร์เดอร์ {orderNumber}</p>
      </div>
      <div className="p-6 pt-5">

      <div
        className="mx-auto w-56 rounded-lg border border-border-soft bg-bg p-3 shadow-card [&>svg]:h-auto [&>svg]:w-full"
        role="img"
        aria-label={`QR PromptPay ยอดชำระ ${formatBaht(amount)}`}
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />

      <p className="mt-4 text-sm text-text-muted">ยอดที่ต้องชำระ</p>
      <p className="font-heading text-4xl font-bold text-primary">{formatBaht(amount)}</p>

      {(accountName || promptpayId) && (
        <div className="mt-4 rounded-md bg-bg px-4 py-3 text-sm">
          {accountName && (
            <p>
              ชื่อบัญชี: <span className="font-medium">{accountName}</span>
            </p>
          )}
          {promptpayId && (
            <p className="text-text-muted">PromptPay: {promptpayId}</p>
          )}
        </div>
      )}

      <ol className="mx-auto mt-4 max-w-xs list-decimal space-y-1 pl-5 text-left text-sm text-text-muted">
        <li>เปิดแอปธนาคาร แล้วสแกน QR ด้านบน</li>
        <li>ตรวจชื่อบัญชีและยอดเงินให้ตรงก่อนกดโอน</li>
        <li>อัปโหลดสลิปด้านล่างเพื่อยืนยันการชำระเงิน</li>
      </ol>
      </div>
    </section>
  );
}
