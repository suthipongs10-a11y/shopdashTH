'use client';

// การ์ดตรวจสลิปค่าแพลน — ยอดตัวใหญ่เทียบรูปสลิป (หลักการเดียวกับคิวสลิปออร์เดอร์ §7.1)

import Image from 'next/image';
import { useActionState, useState } from 'react';
import {
  approveSubscriptionAction,
  rejectSubscriptionAction,
  type SubscriptionActionState,
} from './actions';

export interface SubscriptionReviewItem {
  id: string;
  storeName: string;
  slug: string;
  planName: string;
  currentPlanName: string;
  amount: number;
  slipUrl: string | null;
  createdAtText: string;
  periodText: string;
}

export function SubscriptionReviewCard({ item }: { item: SubscriptionReviewItem }) {
  const [approveState, approveAction, approvePending] = useActionState<
    SubscriptionActionState,
    FormData
  >(approveSubscriptionAction.bind(null, item.id), {});
  const [rejectState, rejectAction, rejectPending] = useActionState<
    SubscriptionActionState,
    FormData
  >(rejectSubscriptionAction.bind(null, item.id), {});
  const [showReject, setShowReject] = useState(false);

  const pending = approvePending || rejectPending;
  const error = approveState.error ?? rejectState.error;

  if (approveState.done || rejectState.done) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-500">
        {approveState.done
          ? `อนุมัติค่าแพลนร้าน ${item.storeName} แล้ว — ร้าน active ทันที`
          : `ปฏิเสธสลิปร้าน ${item.storeName} แล้ว`}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap gap-6">
        <div className="w-56 shrink-0">
          {item.slipUrl ? (
            <a href={item.slipUrl} target="_blank" rel="noreferrer">
              <Image
                src={item.slipUrl}
                alt={`สลิปค่าแพลนร้าน ${item.storeName}`}
                width={224}
                height={300}
                unoptimized
                className="w-full rounded-md border border-gray-200 object-contain"
              />
            </a>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400">
              ไม่มีไฟล์สลิป
            </div>
          )}
        </div>

        <div className="min-w-60 flex-1 space-y-2">
          <p className="text-sm text-gray-500">
            ร้าน <span className="font-medium text-gray-900">{item.storeName}</span> ({item.slug})
          </p>
          <p className="text-3xl font-bold text-gray-900">
            ฿{item.amount.toLocaleString('th-TH')}
          </p>
          <p className="text-sm text-gray-600">
            แพลนที่ขอ: <span className="font-medium">{item.planName}</span>
            {item.planName !== item.currentPlanName && (
              <span className="text-gray-400"> (ปัจจุบัน {item.currentPlanName})</span>
            )}
          </p>
          <p className="text-xs text-gray-400">
            รอบ {item.periodText} · ส่งเมื่อ {item.createdAtText}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <form action={approveAction}>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {approvePending ? 'กำลังอนุมัติ…' : 'อนุมัติ — ร้าน active ทันที'}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setShowReject((s) => !s)}
              className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              ปฏิเสธ…
            </button>
          </div>

          {showReject && (
            <form action={rejectAction} className="flex flex-wrap items-end gap-2 pt-1">
              <div className="min-w-64 flex-1">
                <label
                  htmlFor={`reason-${item.id}`}
                  className="mb-1 block text-xs font-medium text-gray-500"
                >
                  เหตุผลที่ปฏิเสธ (ร้านจะเห็นข้อความนี้)
                </label>
                <input
                  id={`reason-${item.id}`}
                  name="reason"
                  required
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="เช่น ยอดเงินไม่ตรงกับค่าแพลน"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectPending ? 'กำลังปฏิเสธ…' : 'ยืนยันปฏิเสธ'}
              </button>
            </form>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
