'use client';

// ชิ้นส่วน client ของหน้า "โดเมนของตัวเอง" (บริการ ฿590/ปี — ทีมงานจัดการให้):
// ฟอร์มส่งคำขอ / อัปสลิป (pattern เดียวกับสลิปค่าแพลน §7.3 ปุ่ม disable ระหว่างส่ง) /
// ปุ่มยกเลิกคำขอ / ปุ่มขอต่ออายุ

import { useRouter } from 'next/navigation';
import { useActionState, useRef, useState } from 'react';
import {
  cancelRequestAction,
  renewDomainAction,
  requestDomainAction,
  type DomainActionState,
} from './actions';

const IDLE: DomainActionState = {};

export function DomainRequestForm() {
  const [state, formAction, pending] = useActionState(requestDomainAction, IDLE);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="domain" className="mb-1 block text-sm font-medium text-gray-700">
          ชื่อโดเมนที่ต้องการ
        </label>
        <input
          id="domain"
          name="domain"
          required
          placeholder="เช่น baannoi.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">
          ชื่อโดเมนขึ้นอยู่กับความว่าง — ทีมงานจะตรวจสอบให้ก่อนดำเนินการ ถ้าไม่ว่างจะติดต่อกลับ
        </p>
      </div>
      <div>
        <label htmlFor="note" className="mb-1 block text-sm font-medium text-gray-700">
          หมายเหตุถึงทีมงาน (ไม่บังคับ)
        </label>
        <input
          id="note"
          name="note"
          placeholder="เช่น ชื่อสำรองถ้าโดเมนแรกไม่ว่าง หรือเบอร์/LINE สำหรับติดต่อกลับ"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? 'กำลังส่งคำขอ…' : 'ส่งคำขอโดเมน'}
      </button>
    </form>
  );
}

export function DomainSlipUploader({ requestId }: { requestId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('กรุณาเลือกไฟล์สลิป');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.set('requestId', requestId);
      form.set('file', file);
      const res = await fetch('/api/domain-slips', { method: 'POST', body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
      router.refresh();
    } catch {
      setError('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="domain-slip" className="mb-1 block text-sm font-medium text-gray-700">
          แนบสลิปโอนเงิน (jpg / png / webp ไม่เกิน 5MB)
        </label>
        <input
          id="domain-slip"
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="submit"
        disabled={uploading}
        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {uploading ? 'กำลังอัปโหลด…' : 'ส่งสลิปให้ทีมงานตรวจสอบ'}
      </button>
    </form>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  const [state, formAction, pending] = useActionState(
    cancelRequestAction.bind(null, requestId),
    IDLE,
  );
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm('ยกเลิกคำขอโดเมนนี้?')) e.preventDefault();
      }}
      className="inline"
    >
      {state.error && <p className="mb-2 text-sm text-rose-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-gray-400 underline underline-offset-2 hover:text-rose-600 disabled:opacity-50"
      >
        {pending ? 'กำลังยกเลิก…' : 'ยกเลิกคำขอ'}
      </button>
    </form>
  );
}

export function RenewDomainButton() {
  const [state, formAction, pending] = useActionState(renewDomainAction, IDLE);
  return (
    <form action={formAction}>
      {state.error && <p className="mb-2 text-sm text-rose-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {pending ? 'กำลังสร้างคำขอ…' : 'ต่ออายุโดเมน ฿590/ปี'}
      </button>
    </form>
  );
}
