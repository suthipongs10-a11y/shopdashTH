'use client';

import { useTransition } from 'react';
import { deleteDiscount, toggleDiscount } from './actions';

export function DiscountRowActions({
  discountId,
  isActive,
}: {
  discountId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => toggleDiscount(discountId, !isActive))}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
      >
        {isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm('ลบโค้ดนี้?')) startTransition(() => deleteDiscount(discountId));
        }}
        className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
      >
        ลบ
      </button>
    </div>
  );
}
