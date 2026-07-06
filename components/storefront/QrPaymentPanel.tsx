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
    <section className="rounded-lg border border-border bg-surface p-6 text-center">
      <h2 className="font-heading text-lg font-semibold">สแกนจ่ายด้วย PromptPay</h2>
      <p className="mt-1 text-sm text-text-muted">เลขที่ออร์เดอร์ {orderNumber}</p>

      <div
        className="mx-auto mt-4 w-56 rounded-md bg-bg p-3 [&>svg]:h-auto [&>svg]:w-full"
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
    </section>
  );
}
