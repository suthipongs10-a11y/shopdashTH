// Layout ของ shopdash.co (หน้า public: landing / pricing / signup)
// ไม่ผูก tenant context — เป็นหน้าแพลตฟอร์มกลาง

import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-gray-900">
            ShopDash
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/#pricing" className="text-gray-600 hover:text-gray-900">
              แพลนราคา
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800"
            >
              เปิดร้านฟรี 7 วัน
            </Link>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-gray-200 py-8 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} ShopDash — แพลตฟอร์มร้านค้าออนไลน์สำหรับร้านค้าไทย
      </footer>
    </div>
  );
}
