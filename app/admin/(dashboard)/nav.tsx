'use client';

// Sidebar ของ Store Admin — เมนูจัดกลุ่ม + ไอคอน, active เป็น pill ขาวบนพื้นเข้ม
// desktop: คอลัมน์ซ้าย sticky เต็มสูง / mobile: topbar + drawer ซ้าย

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  CategoriesIcon,
  CloseIcon,
  ContentIcon,
  CustomersIcon,
  DashboardIcon,
  DiscountIcon,
  DomainIcon,
  ExternalIcon,
  LogoutIcon,
  MenuIcon,
  OrdersIcon,
  PagesIcon,
  PlanIcon,
  ProductsIcon,
  SettingsIcon,
  SlipIcon,
  StaffIcon,
  ThemeIcon,
} from '@/components/admin/icons';
import { logout } from './actions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  ownerOnly?: boolean;
}

interface NavGroup {
  title: string | null;
  items: NavItem[];
}

// เมนูฟีเจอร์ flagged (ส่วนลด/staff/โดเมน) แสดงตาม role — ในหน้าเองมี guard ซ้ำอีกชั้น
const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [{ href: '/admin/dashboard', label: 'แดชบอร์ด', icon: DashboardIcon }],
  },
  {
    title: 'การขาย',
    items: [
      { href: '/admin/orders', label: 'ออร์เดอร์', icon: OrdersIcon },
      { href: '/admin/slips', label: 'ตรวจสลิป', icon: SlipIcon },
      { href: '/admin/customers', label: 'ลูกค้า', icon: CustomersIcon },
    ],
  },
  {
    title: 'สินค้า',
    items: [
      { href: '/admin/products', label: 'สินค้า', icon: ProductsIcon },
      { href: '/admin/categories', label: 'หมวดหมู่', icon: CategoriesIcon },
      { href: '/admin/discounts', label: 'โค้ดส่วนลด', icon: DiscountIcon },
    ],
  },
  {
    title: 'หน้าร้าน',
    items: [
      { href: '/admin/theme', label: 'ธีมร้าน', icon: ThemeIcon },
      { href: '/admin/content', label: 'เนื้อหาเว็บ', icon: ContentIcon },
      { href: '/admin/pages', label: 'เพจ', icon: PagesIcon },
      { href: '/admin/domain', label: 'โดเมน', icon: DomainIcon, ownerOnly: true },
    ],
  },
  {
    title: 'ร้านของฉัน',
    items: [
      { href: '/admin/staff', label: 'ทีมงาน', icon: StaffIcon, ownerOnly: true },
      { href: '/admin/settings', label: 'ตั้งค่าร้าน', icon: SettingsIcon, ownerOnly: true },
      { href: '/admin/plan', label: 'แพลนของฉัน', icon: PlanIcon, ownerOnly: true },
    ],
  },
];

function SidebarContent({
  storeName,
  isOwner,
  userEmail,
  onNavigate,
}: {
  storeName: string;
  isOwner: boolean;
  userEmail?: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-gray-900 text-gray-300">
      {/* หัวร้าน */}
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
          {storeName.replace(/[^A-Za-zก-๙0-9]/g, '').slice(0, 1).toUpperCase() || 'S'}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{storeName}</p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-white"
          >
            เปิดหน้าร้าน
            <ExternalIcon size={11} />
          </a>
        </div>
      </div>

      {/* เมนู */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => isOwner || !i.ownerOnly);
          if (items.length === 0) return null;
          return (
            <div key={group.title ?? 'main'}>
              {group.title && (
                <p className="mb-1 px-2.5 text-[11px] font-semibold tracking-wider text-gray-500">
                  {group.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          active
                            ? 'bg-white/10 font-semibold text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-gray-100'
                        }`}
                      >
                        <Icon size={17} className={active ? 'text-indigo-400' : 'text-gray-500'} />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* ผู้ใช้ + ออกจากระบบ */}
      <div className="border-t border-white/10 px-3 py-3">
        {userEmail && (
          <p className="mb-2 truncate px-2.5 text-xs text-gray-500" title={userEmail}>
            {userEmail}
          </p>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100"
          >
            <LogoutIcon size={17} className="text-gray-500" />
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  );
}

export function Nav({
  storeName,
  isOwner = true,
  userEmail,
}: {
  storeName: string;
  isOwner?: boolean;
  userEmail?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
        <SidebarContent storeName={storeName} isOwner={isOwner} userEmail={userEmail} />
      </aside>

      {/* mobile topbar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
          className="-ml-1 rounded-lg p-1.5 text-gray-600 hover:bg-gray-100"
        >
          <MenuIcon size={20} />
        </button>
        <span className="truncate text-sm font-semibold text-gray-900">{storeName}</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="เปิดหน้าร้าน"
          className="ml-auto rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <ExternalIcon size={17} />
        </a>
      </header>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="เมนู">
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-gray-900/60"
          />
          <div className="absolute left-0 top-0 h-full w-64">
            <SidebarContent
              storeName={storeName}
              isOwner={isOwner}
              userEmail={userEmail}
              onNavigate={() => setOpen(false)}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิด"
              className="absolute -right-11 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
