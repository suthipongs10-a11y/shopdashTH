'use client';

import { useActionState } from 'react';
import { updatePassword, type ResetPasswordState } from './actions';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState<ResetPasswordState, FormData>(
    updatePassword,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-600">ตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          รหัสผ่านใหม่
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-700">
          ยืนยันรหัสผ่านใหม่
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          className={inputClass}
        />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? 'กำลังบันทึก…' : 'ตั้งรหัสผ่านใหม่'}
      </button>
    </form>
  );
}
