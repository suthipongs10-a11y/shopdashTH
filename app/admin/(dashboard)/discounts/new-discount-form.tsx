'use client';

import { useActionState } from 'react';
import { createDiscount, type DiscountActionState } from './actions';

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm';

export function NewDiscountForm() {
  const [state, formAction, pending] = useActionState<DiscountActionState, FormData>(
    createDiscount,
    {},
  );

  return (
    <form action={formAction} className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">สร้างโค้ดส่วนลดใหม่</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="code" className="mb-1 block text-xs font-medium text-gray-500">
            โค้ด (A–Z, 0–9)
          </label>
          <input
            id="code"
            name="code"
            required
            placeholder="SAVE50"
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label htmlFor="type" className="mb-1 block text-xs font-medium text-gray-500">
            ประเภท
          </label>
          <select id="type" name="type" className={inputClass}>
            <option value="fixed">ลดเป็นจำนวนเงิน (บาท)</option>
            <option value="percent">ลดเป็นเปอร์เซ็นต์ (%)</option>
          </select>
        </div>
        <div>
          <label htmlFor="value" className="mb-1 block text-xs font-medium text-gray-500">
            มูลค่า
          </label>
          <input id="value" name="value" type="number" min={1} required className={inputClass} />
        </div>
        <div>
          <label htmlFor="min_order" className="mb-1 block text-xs font-medium text-gray-500">
            ยอดขั้นต่ำ (บาท — เว้นว่าง = ไม่จำกัด)
          </label>
          <input id="min_order" name="min_order" type="number" min={1} className={inputClass} />
        </div>
        <div>
          <label htmlFor="max_uses" className="mb-1 block text-xs font-medium text-gray-500">
            จำกัดจำนวนครั้ง (เว้นว่าง = ไม่จำกัด)
          </label>
          <input id="max_uses" name="max_uses" type="number" min={1} className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="starts_at" className="mb-1 block text-xs font-medium text-gray-500">
              เริ่มใช้
            </label>
            <input id="starts_at" name="starts_at" type="date" className={inputClass} />
          </div>
          <div>
            <label htmlFor="ends_at" className="mb-1 block text-xs font-medium text-gray-500">
              หมดอายุ
            </label>
            <input id="ends_at" name="ends_at" type="date" className={inputClass} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'กำลังสร้าง…' : 'สร้างโค้ด'}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">สร้างโค้ดแล้ว</p>}
      </div>
    </form>
  );
}
