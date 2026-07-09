'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from './actions';

interface NavItem {
  href: string;
  label: string;
  ownerOnly?: boolean;
}

// เมนูฟีเจอร์ flagged (ส่วนลด/staff/โดเมน) แสดงตาม flag — ในหน้าเองก็มี guard ซ้ำอีกชั้น
const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', label: 'แดชบอร์ด' },
  { href: '/admin/orders', label: 'ออร์เดอร์' },
  { href: '/admin/slips', label: 'ตรวจสลิป' },
  { href: '/admin/products', label: 'สินค้า' },
  { href: '/admin/categories', label: 'หมวดหมู่' },
  { href: '/admin/customers', label: 'ลูกค้า' },
  { href: '/admin/discounts', label: 'ส่วนลด' },
  { href: '/admin/theme', label: 'ธีมร้าน' },
  { href: '/admin/domain', label: 'โดเมน', ownerOnly: true },
  { href: '/admin/staff', label: 'Staff', ownerOnly: true },
  { href: '/admin/settings', label: 'ตั้งค่าร้าน', ownerOnly: true },
  { href: '/admin/plan', label: 'แพลนของฉัน', ownerOnly: true },
];

export function Nav({ storeName, isOwner = true }: { storeName: string; isOwner?: boolean }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => isOwner || !item.ownerOnly);

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">{storeName}</span>
          <nav className="flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            {items.map((item) => {
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
        <form action={logout}>
          <button type="submit" className="text-sm text-gray-500 hover:text-gray-900">
            ออกจากระบบ
          </button>
        </form>
      </div>
    </header>
  );
}
