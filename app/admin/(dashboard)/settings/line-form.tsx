'use client';

import { useActionState } from 'react';
import { updateLineToken, type SettingsState } from './actions';

export function LineForm({ hasToken }: { hasToken: boolean }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateLineToken,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label htmlFor="line_token" className="mb-1 block text-sm font-medium text-gray-700">
          LINE OA Channel Access Token
        </label>
        <input
          id="line_token"
          name="line_token"
          type="password"
          placeholder={hasToken ? '•••••••• (ตั้งค่าไว้แล้ว — กรอกใหม่เพื่อเปลี่ยน)' : 'วาง token จาก LINE Developers Console'}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-gray-400">
          ระบบจะส่งแจ้งเตือน &ldquo;ออร์เดอร์ใหม่ / สลิปใหม่&rdquo; เข้า LINE OA นี้ —
          แนะนำใช้ OA แยกสำหรับทีมงานร้าน (ข้อความส่งแบบ broadcast ถึงผู้ติดตามทุกคนของ OA) ·
          เว้นว่างแล้วบันทึก = ปิดการแจ้งเตือน
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึก token'}
        </button>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">บันทึกแล้ว</p>}
      </div>
    </form>
  );
}
