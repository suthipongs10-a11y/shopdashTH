'use client';

import { useActionState } from 'react';
import { savePlatformLineToken, savePlatformPromptpay, type SettingsActionState } from './actions';

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

export function PlatformPromptpayForm({
  promptpayId,
  promptpayName,
}: {
  promptpayId: string;
  promptpayName: string;
}) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    savePlatformPromptpay,
    {},
  );

  return (
    <form action={formAction} className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">บัญชีรับเงินค่าแพลน (PromptPay)</h2>
      <p className="mt-1 text-sm font-medium text-gray-600">
        ร้านค้าจ่ายค่าแพลนเข้าบัญชีนี้ — ระบบสร้าง QR ยอดตามแพลนให้อัตโนมัติในหน้า “แพลนของฉัน”
      </p>

      <div className="mt-4 rounded-md border-2 border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-800">
        ⚠️ ต้องเป็น <b>PromptPay ID</b> = เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก ที่ผูกพร้อมเพย์ไว้
        <b> ไม่ใช่เลขบัญชีธนาคาร</b> (ถ้าใส่เลขบัญชี เงินจะไม่เข้า)
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="promptpay_id" className="mb-1 block text-xs font-bold text-gray-700">
            PromptPay ID
          </label>
          <input
            id="promptpay_id"
            name="promptpay_id"
            defaultValue={promptpayId}
            placeholder="เช่น 0812345678 หรือ 1234567890123"
            inputMode="numeric"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="promptpay_name" className="mb-1 block text-xs font-bold text-gray-700">
            ชื่อบัญชี (โชว์ให้ร้านเทียบ)
          </label>
          <input
            id="promptpay_name"
            name="promptpay_name"
            defaultValue={promptpayName}
            placeholder="เช่น ธนากร ไพรศรี"
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
        {state.error && <p className="text-sm font-semibold text-rose-600">{state.error}</p>}
        {state.done && (
          <p className="text-sm font-semibold text-emerald-700">บันทึกแล้ว — มีผลกับทุกร้านทันที</p>
        )}
      </div>
    </form>
  );
}

export function PlatformLineForm({ hasToken }: { hasToken: boolean }) {
  const [state, formAction, pending] = useActionState<SettingsActionState, FormData>(
    savePlatformLineToken,
    {},
  );

  return (
    <form action={formAction} className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">แจ้งเตือน LINE (ของคุณ — เจ้าของแพลตฟอร์ม)</h2>
      <p className="mt-1 text-sm font-medium text-gray-600">
        ระบบส่งข้อความเข้า LINE OA นี้เมื่อ <b>มีร้านสมัครใหม่</b> และ{' '}
        <b>มีสลิปค่าแพลนเข้าคิวรอตรวจ</b> — ลูกค้า trial มี 7 วัน ยิ่งอนุมัติเร็ว conversion ยิ่งดี
      </p>
      <p className="mt-2 text-xs font-medium text-gray-500">
        ใช้ Channel access token (long-lived) ของ LINE OA ส่วนตัวที่คุณ follow ไว้ — สร้างได้ที่
        LINE Developers Console &gt; Messaging API — ระบบส่งแบบ broadcast ถึงผู้ติดตามทุกคนของ OA นั้น
      </p>

      <div className="mt-4">
        <label htmlFor="line_token" className="mb-1 block text-xs font-bold text-gray-700">
          Channel access token {hasToken && <span className="text-emerald-700">(ตั้งค่าแล้ว — กรอกใหม่เพื่อเปลี่ยน, เว้นว่างแล้วบันทึกเพื่อปิด)</span>}
        </label>
        <input
          id="line_token"
          name="line_token"
          type="password"
          autoComplete="off"
          placeholder={hasToken ? '••••••••••••••••' : 'วาง token ที่นี่'}
          className={inputClass}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
        {state.error && <p className="text-sm font-semibold text-rose-600">{state.error}</p>}
        {state.done && <p className="text-sm font-semibold text-emerald-700">บันทึกแล้ว</p>}
      </div>
    </form>
  );
}
