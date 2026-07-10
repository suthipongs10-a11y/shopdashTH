'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  inviteStaffAction,
  removeStaffAction,
  setStaffDisabledAction,
  type StaffActionState,
} from './actions';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

export function InviteStaffForm() {
  const [state, formAction, pending] = useActionState<StaffActionState, FormData>(
    inviteStaffAction,
    {},
  );

  return (
    <form action={formAction} className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">เพิ่ม staff ใหม่</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-medium text-gray-500">
            อีเมล staff
          </label>
          <input id="email" name="email" type="email" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-medium text-gray-500">
            รหัสผ่านเริ่มต้น (อย่างน้อย 8 ตัว)
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            className={inputClass}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        staff ใช้งานได้ทุกอย่างยกเว้น ตั้งค่าร้าน / แพลน / จัดการ staff
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังเพิ่ม…' : 'เพิ่ม staff'}
        </button>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      </div>
    </form>
  );
}

export function StaffRowActions({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<StaffActionState>) =>
    startTransition(async () => {
      const result = await fn();
      setError(result.error ?? null);
    });

  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setStaffDisabledAction(userId, !disabled))}
        className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
      >
        {disabled ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm('ลบบัญชี staff นี้ถาวร?')) run(() => removeStaffAction(userId));
        }}
        className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-50"
      >
        ลบ
      </button>
    </div>
  );
}
