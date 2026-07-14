// Layout ของ shopdashth.com (หน้า public: landing / pricing / signup)
// ไม่ผูก tenant context — เป็นหน้าแพลตฟอร์มกลาง (ธีม/token ของ storefront ไม่เกี่ยวกับหน้านี้)

import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const sans = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'shopdashth.com';

export const metadata: Metadata = {
  metadataBase: new URL(`https://${ROOT_DOMAIN}`),
  title: 'ShopDash — เปิดร้านออนไลน์ของคุณเอง รับเงินเข้าบัญชีร้านเต็มจำนวน',
  description:
    'ระบบร้านค้าออนไลน์สำหรับร้านค้าไทย — หน้าร้านสวยพร้อมใช้ รับชำระผ่าน PromptPay เข้าบัญชีร้านโดยตรง ไม่หักค่าคอมต่อออร์เดอร์ จัดการสินค้า สต๊อก และออร์เดอร์ในที่เดียว ทดลองฟรี 7 วัน',
  openGraph: {
    title: 'ShopDash — เปิดร้านออนไลน์ของคุณเอง',
    description:
      'หน้าร้านสวยพร้อมใช้ + PromptPay เข้าบัญชีร้านโดยตรง ไม่หักค่าคอมต่อออร์เดอร์ ทดลองฟรี 7 วัน',
    type: 'website',
    locale: 'th_TH',
  },
};

const NAV = [
  { href: '/#templates', label: 'เทมเพลต' },
  { href: '/#features', label: 'ฟีเจอร์' },
  { href: '/#pricing', label: 'ราคา' },
  { href: '/#faq', label: 'คำถามที่พบบ่อย' },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();

  return (
    <div className={`${sans.className} min-h-screen bg-white text-slate-700 antialiased`}>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              S
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">ShopDash</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className="text-slate-600 hover:text-slate-900">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              เปิดร้านฟรี 7 วัน
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
                S
              </span>
              <span className="font-bold text-slate-900">ShopDash</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              ระบบร้านค้าออนไลน์สำหรับร้านค้าไทย เช่าใช้รายปี ไม่หักค่าคอมมิชชันต่อออร์เดอร์
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">ผลิตภัณฑ์</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li>
                <a href="/#templates" className="hover:text-slate-900">
                  เทมเพลตหน้าร้าน
                </a>
              </li>
              <li>
                <a href="/#features" className="hover:text-slate-900">
                  ฟีเจอร์ทั้งหมด
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-slate-900">
                  แพ็กเกจและราคา
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">เริ่มต้นใช้งาน</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li>
                <Link href="/signup" className="hover:text-slate-900">
                  เปิดร้านใหม่ (ฟรี 7 วัน)
                </Link>
              </li>
              <li>
                <a href="/#faq" className="hover:text-slate-900">
                  คำถามที่พบบ่อย
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">การชำระเงิน</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              ลูกค้าของร้านชำระผ่าน PromptPay QR แล้วอัปโหลดสลิป — เงินเข้าบัญชีของร้านโดยตรง
              ShopDash ไม่แตะเงินก้อนนี้
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          © {year} ShopDash · {ROOT_DOMAIN}
        </div>
      </footer>
    </div>
  );
}
