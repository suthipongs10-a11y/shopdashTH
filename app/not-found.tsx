import Link from 'next/link';

// 404 ระดับแอป (§5.5) — ภาษาไทย ไม่มี stack trace
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold text-gray-900">404</h1>
        <p className="mt-2 text-sm text-gray-500">ไม่พบหน้าที่คุณค้นหา</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
