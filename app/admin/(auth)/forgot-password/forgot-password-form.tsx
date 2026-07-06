'use client';

import { useActionState } from 'react';
import { requestPasswordReset, type ForgotPasswordState } from './actions';

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.submitted) {
    return (
      <p className="text-sm text-gray-700">
        หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว
        กรุณาตรวจสอบกล่องจดหมาย (รวมถึงถังขยะ/สแปม)
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-gray-600">กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          อีเมล
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {pending ? 'กำลังส่ง…' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}
      </button>
      <a
        href="/admin/login"
        className="block text-center text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
      >
        กลับหน้าเข้าสู่ระบบ
      </a>
    </form>
  );
}
