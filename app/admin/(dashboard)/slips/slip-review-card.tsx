'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import { approveSlip, rejectSlip, type OrderActionState } from '../orders/actions';

// เหตุผลสำเร็จรูปตาม §7.1
const REJECT_REASONS = ['ยอดเงินไม่ตรงกับออร์เดอร์', 'สลิปไม่ชัดเจน', 'ไม่ใช่บัญชีของร้าน', 'สงสัยสลิปปลอม'];

const initial: OrderActionState = {};

export function SlipReviewCard({
  slipId,
  orderNumber,
  amount,
  shipName,
  uploadedAt,
  imageUrl,
  accountName,
  promptpayId,
  qrRef,
  qrMissing = false,
  autoVerifyFailedReason,
}: {
  slipId: string;
  orderNumber: string;
  amount: string;
  shipName: string;
  uploadedAt: string;
  imageUrl: string;
  accountName: string | null;
  promptpayId: string | null;
  /** เลขอ้างอิงธุรกรรมจาก QR บนสลิป — ใช้ค้นเทียบในแอปธนาคาร */
  qrRef?: string | null;
  /** ระบบสแกนแล้วไม่พบ QR — สลิปจริงจากแอปธนาคารมี QR เสมอ */
  qrMissing?: boolean;
  /** P4: ผลตรวจอัตโนมัติไม่ผ่าน — โชว์ flag + เหตุผลให้แอดมินพิจารณาเอง (§7.1) */
  autoVerifyFailedReason?: string | null;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [approveState, approveAction, approvePending] = useActionState(
    approveSlip.bind(null, slipId),
    initial,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectSlip.bind(null, slipId),
    initial,
  );

  const state = rejecting ? rejectState : approveState;
  const decided = approveState.success || rejectState.success;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        {/* รูปสลิป */}
        <a href={imageUrl} target="_blank" rel="noreferrer" title="เปิดรูปเต็ม">
          <div className="relative h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 transition-shadow hover:shadow-md">
            <Image src={imageUrl} alt={`สลิปออร์เดอร์ ${orderNumber}`} fill unoptimized className="object-contain" />
          </div>
        </a>

        {/* ข้อมูลเทียบ (§7.1: ยอดออร์เดอร์ตัวใหญ่ + บัญชีร้าน + เวลาอัปโหลด) */}
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-500">ออร์เดอร์ {orderNumber} · {shipName}</p>
            <p className="text-3xl font-bold text-gray-900">{amount}</p>
            <p className="text-xs text-gray-400">อัปโหลดเมื่อ {uploadedAt}</p>
          </div>
          {qrMissing && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
              ⚠️ ไม่พบ QR ในสลิป — สลิปจริงจากแอปธนาคารมี QR เสมอ ตรวจอย่างระมัดระวัง
            </p>
          )}
          {qrRef && (
            <p className="rounded-lg bg-gray-50 px-3.5 py-2.5 text-xs text-gray-500">
              เลขอ้างอิงธุรกรรม (จาก QR): <span className="font-mono text-gray-900">{qrRef}</span>
              <span className="ml-1">— ใช้ค้นเทียบรายการเงินเข้าในแอปธนาคารได้</span>
            </p>
          )}
          {autoVerifyFailedReason && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              ⚠️ ตรวจอัตโนมัติไม่ผ่าน: {autoVerifyFailedReason}
            </p>
          )}
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-2.5 text-sm">
            <p className="text-gray-500">บัญชีที่ต้องได้รับเงิน (เทียบกับสลิป)</p>
            <p className="font-medium text-gray-900">{accountName ?? '-'}</p>
            {promptpayId && <p className="text-gray-500">PromptPay: {promptpayId}</p>}
          </div>

          {decided ? (
            <p className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700">
              {approveState.success ?? rejectState.success}
            </p>
          ) : rejecting ? (
            <form action={rejectAction} className="space-y-2">
              <select
                name="preset_reason"
                required
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                defaultValue=""
              >
                <option value="" disabled>
                  เลือกเหตุผลที่ปฏิเสธ…
                </option>
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                name="extra_note"
                placeholder="ข้อความเพิ่มเติมถึงลูกค้า (ถ้ามี)"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={rejectPending}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-50"
                >
                  {rejectPending ? 'กำลังบันทึก…' : 'ยืนยันปฏิเสธสลิป'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  กลับ
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold text-rose-600">
                เช็คเงินเข้า {amount} ในแอปธนาคารของคุณก่อน — อย่าเชื่อรูปสลิปอย่างเดียว
              </p>
              <div className="flex gap-2">
                <form action={approveAction}>
                  <button
                    type="submit"
                    disabled={approvePending}
                    className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {approvePending ? 'กำลังอนุมัติ…' : '✓ อนุมัติ — เช็คเงินเข้าแล้ว'}
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setRejecting(true)}
                  className="rounded-lg border border-rose-200 bg-white px-5 py-2 text-sm font-medium text-rose-600 shadow-sm hover:bg-rose-50"
                >
                  ปฏิเสธ…
                </button>
              </div>
            </div>
          )}
          {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        </div>
      </div>
    </div>
  );
}
