'use client';

// อัปโหลดสลิปค่าแพลน — ปุ่ม disable ระหว่างส่ง (กันกดรัว §7.3) แล้ว refresh ให้เห็นสถานะรอตรวจ

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export function PlanSlipUploader({ planId }: { planId: string }) {
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
      form.set('planId', planId);
      form.set('file', file);
      const res = await fetch('/api/plan-slips', { method: 'POST', body: form });
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
        <label htmlFor="plan-slip" className="mb-1 block text-sm font-medium text-gray-700">
          แนบสลิปโอนเงิน (jpg / png / webp ไม่เกิน 5MB)
        </label>
        <input
          id="plan-slip"
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
        {uploading ? 'กำลังอัปโหลด…' : 'ส่งสลิปให้ ShopDash ตรวจสอบ'}
      </button>
    </form>
  );
}
