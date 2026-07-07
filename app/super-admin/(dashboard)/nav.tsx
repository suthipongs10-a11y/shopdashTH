'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { superLogout } from './actions';

const NAV_ITEMS = [
  { href: '/tenants', label: 'ร้านค้า' },
  { href: '/subscriptions', label: 'คิวสลิปค่าแพลน' },
  { href: '/plans', label: 'จัดการแพลน' },
];

export function SuperNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">
            ShopDash <span className="rounded bg-gray-900 px-1.5 py-0.5 text-xs text-white">Platform</span>
          </span>
          <nav className="flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm ${
                    active ? 'font-medium text-gray-900' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-gray-400 sm:inline">{email}</span>
          <form action={superLogout}>
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
