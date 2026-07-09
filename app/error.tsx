'use client';

// Error boundary ระดับแอป (§5.5 / DoD ข้อ 5) — ไม่โชว์ stack trace ให้ผู้ใช้
import { useEffect } from 'react';

export default function AppError({
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900">เกิดข้อผิดพลาด</h1>
        <p className="mt-2 text-sm text-gray-500">
          ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาโปรดติดต่อผู้ดูแลระบบ
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );
}
