'use client';

// แบนเนอร์ "ร้านของคุณกำลังแสดงข้อมูลตัวอย่าง" บนแดชบอร์ด — โชว์จนกว่าของตัวอย่าง
// จะถูกแก้เป็นของจริงหรือลบหมด ชี้ทางลูกค้าใหม่: แก้ของที่มี ง่ายกว่าสร้างจากศูนย์

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { deleteSampleData } from './sample-actions';

export function SampleDataBanner({ productCount }: { productCount: number }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSampleData();
      if (result.error) setError(result.error);
      setConfirming(false);
    });
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-sky-900">
            <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
              ตัวอย่าง
            </span>
            ร้านของคุณกำลังแสดงสินค้าตัวอย่าง {productCount.toLocaleString('th-TH')} รายการ
          </p>
          <p className="mt-1.5 text-sm text-sky-800">
            เราจัดร้านตัวอย่างไว้ให้เห็นภาพว่าร้านจริงหน้าตาเป็นอย่างไร —
            ลองแก้สินค้าตัวอย่างให้เป็นสินค้าของคุณได้เลย (แก้แล้วระบบถือเป็นสินค้าจริงทันที)
            หรือเมื่อพร้อมเปิดร้าน ก็ลบข้อมูลตัวอย่างทั้งหมดได้ในคลิกเดียว
          </p>
          {error && <p className="mt-1.5 text-sm font-medium text-rose-600">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700"
          >
            แก้สินค้าให้เป็นของฉัน
          </Link>
          {confirming ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5">
              <span className="text-xs font-semibold text-rose-700">ลบทั้งหมดแน่ใจไหม?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {pending ? 'กำลังลบ…' : 'ยืนยันลบ'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-md px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-white"
              >
                ยกเลิก
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 hover:border-rose-300 hover:text-rose-600"
            >
              ลบข้อมูลตัวอย่างทั้งหมด
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
