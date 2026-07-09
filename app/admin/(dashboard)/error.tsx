'use client';

// Error boundary ของ Store Admin (§5.5)
import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-gray-900">เกิดข้อผิดพลาด</h1>
      <p className="mt-2 text-sm text-gray-500">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}
