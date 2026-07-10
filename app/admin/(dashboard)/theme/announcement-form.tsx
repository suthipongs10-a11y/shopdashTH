'use client';

import { useActionState } from 'react';
import { setAnnouncementText, type ThemeActionState } from './actions';

export function AnnouncementForm({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<ThemeActionState, FormData>(
    setAnnouncementText,
    {},
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <label
          htmlFor="announcement_text"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          ข้อความประกาศบนหน้าร้าน (แสดงเมื่อธีมมีแถบประกาศ — กลุ่ม Pro ขึ้นไป)
        </label>
        <input
          id="announcement_text"
          name="announcement_text"
          defaultValue={current ?? ''}
          placeholder="เช่น ส่งฟรีเมื่อสั่งครบ ฿500 🎉"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : 'บันทึกประกาศ'}
      </button>
      {state.error && <p className="w-full text-sm text-rose-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-emerald-700">บันทึกแล้ว</p>}
    </form>
  );
}
