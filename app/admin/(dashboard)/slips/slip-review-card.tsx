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
}: {
  slipId: string;
  orderNumber: string;
  amount: string;
  shipName: string;
  uploadedAt: string;
  imageUrl: string;
  accountName: string | null;
  promptpayId: string | null;
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
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        {/* รูปสลิป */}
        <a href={imageUrl} target="_blank" rel="noreferrer" title="เปิดรูปเต็ม">
          <div className="relative h-64 w-full overflow-hidden rounded-md border border-gray-200 bg-gray-50">
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
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
            <p className="text-gray-500">บัญชีที่ต้องได้รับเงิน (เทียบกับสลิป)</p>
            <p className="font-medium text-gray-900">{accountName ?? '-'}</p>
            {promptpayId && <p className="text-gray-500">PromptPay: {promptpayId}</p>}
          </div>

          {decided ? (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {approveState.success ?? rejectState.success}
            </p>
          ) : rejecting ? (
            <form action={rejectAction} className="space-y-2">
              <select
                name="preset_reason"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={rejectPending}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {rejectPending ? 'กำลังบันทึก…' : 'ยืนยันปฏิเสธสลิป'}
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm"
                >
                  กลับ
                </button>
              </div>
            </form>
          ) : (
            <div className="flex gap-2">
              <form action={approveAction}>
                <button
                  type="submit"
                  disabled={approvePending}
                  className="rounded-md bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
                >
                  {approvePending ? 'กำลังอนุมัติ…' : '✓ อนุมัติ — ยอดถูกต้อง'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className="rounded-md border border-red-300 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                ปฏิเสธ…
              </button>
            </div>
          )}
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        </div>
      </div>
    </div>
  );
}
