'use client';

// ปุ่มเปลี่ยนสถานะตาม state machine (§3.6) — แสดงเฉพาะ transition ที่ทำได้จากสถานะปัจจุบัน

import { useActionState, useState } from 'react';
import { CARRIERS, CARRIER_TH, type OrderStatus } from '@/lib/orders/status';
import { cancelOrder, markPacking, markShipped, type OrderActionState } from '../actions';

const initial: OrderActionState = {};

export function OrderActionsPanel({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [cancelling, setCancelling] = useState(false);
  const [packState, packAction, packPending] = useActionState(markPacking.bind(null, orderId), initial);
  const [shipState, shipAction, shipPending] = useActionState(markShipped.bind(null, orderId), initial);
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelOrder.bind(null, orderId),
    initial,
  );

  const canCancel = ['pending_payment', 'slip_uploaded', 'confirmed', 'packing'].includes(status);
  const error = packState.error ?? shipState.error ?? cancelState.error;
  const success = packState.success ?? shipState.success ?? cancelState.success;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white shadow-sm p-4">
      <h2 className="text-sm font-medium text-gray-500">จัดการออร์เดอร์</h2>

      {status === 'slip_uploaded' && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          มีสลิปรอตรวจสอบ — อนุมัติ/ปฏิเสธได้ที่หน้า <a href="/admin/slips" className="underline">คิวตรวจสอบสลิป</a>
        </p>
      )}

      {status === 'confirmed' && (
        <form action={packAction}>
          <button
            type="submit"
            disabled={packPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {packPending ? 'กำลังบันทึก…' : 'เริ่มแพ็คสินค้า'}
          </button>
        </form>
      )}

      {status === 'packing' && (
        <form action={shipAction} className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <select name="carrier" required defaultValue="" className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="" disabled>
                เลือกขนส่ง…
              </option>
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {CARRIER_TH[c]}
                </option>
              ))}
            </select>
            <input
              name="tracking_number"
              required
              placeholder="เลขพัสดุ"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={shipPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {shipPending ? 'กำลังบันทึก…' : 'บันทึกจัดส่งแล้ว'}
          </button>
        </form>
      )}

      {status === 'shipped' && (
        <p className="text-sm text-gray-500">ออร์เดอร์จัดส่งแล้ว — จบขั้นตอน</p>
      )}
      {status === 'cancelled' && <p className="text-sm text-rose-600">ออร์เดอร์นี้ถูกยกเลิกแล้ว</p>}

      {canCancel &&
        (cancelling ? (
          <form action={cancelAction} className="space-y-2 border-t border-gray-100 pt-3">
            <input
              name="reason"
              required
              placeholder="เหตุผลในการยกเลิก (ลูกค้าจะเห็นข้อความนี้)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={cancelPending}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {cancelPending ? 'กำลังยกเลิก…' : 'ยืนยันยกเลิกออร์เดอร์'}
              </button>
              <button
                type="button"
                onClick={() => setCancelling(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
              >
                กลับ
              </button>
            </div>
            {status === 'confirmed' || status === 'packing' ? (
              <p className="text-xs text-gray-500">ยกเลิกแล้วระบบจะคืนสต๊อกสินค้าอัตโนมัติ</p>
            ) : null}
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCancelling(true)}
            className="text-sm text-rose-600 underline underline-offset-2 hover:text-red-500"
          >
            ยกเลิกออร์เดอร์นี้…
          </button>
        ))}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </div>
  );
}
