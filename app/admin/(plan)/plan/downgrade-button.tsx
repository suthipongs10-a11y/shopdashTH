'use client';

// ปุ่มดาวน์เกรด (ฟรี) — ยืนยันก่อนเปลี่ยน แล้ว refresh ให้เห็นแพลนใหม่

import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { downgradeAction, type DowngradeState } from './actions';

export function DowngradeButton({
  planId,
  planName,
  amount,
}: {
  planId: string;
  planName: string;
  amount: string; // ยอดค่าดูแลรายปีของแพลนใหม่ (ไว้บอกลูกค้า)
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<DowngradeState, FormData>(
    downgradeAction.bind(null, planId),
    {},
  );

  useEffect(() => {
    if (state.done) router.refresh();
  }, [state.done, router]);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(`ยืนยันเปลี่ยนเป็นแพลน "${planName}"?\nไม่มีค่าใช้จ่าย ไม่คืนเงินส่วนต่าง และวันหมดอายุคงเดิม`)) {
          e.preventDefault();
        }
      }}
      className="rounded-md border-2 border-gray-300 bg-gray-50 p-4"
    >
      <p className="text-sm font-medium text-gray-700">
        การลดแพลนไม่มีค่าใช้จ่าย — เปลี่ยนได้ทันที <b>ไม่คืนเงินส่วนต่าง</b> และ
        <b> วันหมดอายุคงเดิม</b> (ปีถัดไปคิด {amount})
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'กำลังเปลี่ยน…' : `ยืนยันเปลี่ยนเป็น ${planName}`}
      </button>
      {state.error && <p className="mt-2 text-sm font-semibold text-rose-600">{state.error}</p>}
    </form>
  );
}
