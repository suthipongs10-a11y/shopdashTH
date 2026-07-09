'use client';

// Error boundary ของ storefront (§5.5) — อยู่ใน ThemeScope ใช้ token ของธีมร้านได้
import { useEffect } from 'react';

export default function StorefrontError({
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
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading text-2xl font-semibold text-text">เกิดข้อผิดพลาด</h1>
      <p className="mt-2 text-sm text-text-muted">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
      >
        ลองใหม่อีกครั้ง
      </button>
    </div>
  );
}
