'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { superLogout } from './actions';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'แดชบอร์ด' },
  { href: '/tenants', label: 'ร้านค้า' },
  { href: '/subscriptions', label: 'คิวสลิปค่าแพลน' },
  { href: '/plans', label: 'จัดการแพลน' },
  { href: '/settings', label: 'ตั้งค่า' },
];

export function SuperNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b-2 border-gray-300 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">
            ShopDash{' '}
            <span className="rounded bg-gray-900 px-1.5 py-0.5 text-xs font-semibold text-white">
              Platform
            </span>
          </span>
          <nav className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? 'bg-indigo-600 font-bold text-white'
                      : 'font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs font-medium text-gray-600 sm:inline">{email}</span>
          <form action={superLogout}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
