'use client';

import { useActionState } from 'react';
import { inputClass, labelClass } from '@/components/admin/ui';
import { login, type LoginState } from './actions';

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          อีเมล
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          รหัสผ่าน
        </label>
        <input id="password" name="password" type="password" required className={inputClass} />
      </div>
      {state.error && (
        <p className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
      </button>
      <a
        href="/admin/forgot-password"
        className="block text-center text-sm text-gray-500 underline underline-offset-2 hover:text-gray-700"
      >
        ลืมรหัสผ่าน?
      </a>
    </form>
  );
}
