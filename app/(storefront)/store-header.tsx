'use client';

// Header storefront ตาม wireframe กลุ่ม Basic (§4.6):
// แถบ utility บน (ส่งฟรี/ติดตามออร์เดอร์) + โลโก้ซ้าย + CategoryNav + ค้นหา + ตะกร้าขวา
// โหมด Commerce (ThemeLayout ของธีม t2-store): utility bar ดำ + search box จริง +
// ไอคอนบัญชี/หัวใจ/ตะกร้า + เมนู drawer บนมือถือ (ref T2)

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { CategoryNav } from '@/components/storefront/CategoryNav';
import {
  CartIcon,
  ClockIcon,
  CloseIcon,
  HeartIcon,
  SearchIcon,
  TruckIcon,
  UserIcon,
} from '@/components/storefront/icons';
import type { CategoryItem } from '@/components/storefront/types';
import { useCart } from '@/lib/cart';
import { formatBaht } from '@/lib/format';
import type { CategoryNavVariant, ThemeLayout } from '@/themes/types';

interface UtilityItem {
  icon: 'truck' | 'clock';
  text: string;
}

export function StoreHeader({
  slug,
  storeName,
  logoUrl,
  categories,
  navVariant,
  freeShippingMin,
  layout = {},
  utilityItems = [],
  wishlistEnabled = false,
}: {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  categories: CategoryItem[];
  navVariant: CategoryNavVariant;
  freeShippingMin?: number | null;
  layout?: ThemeLayout;
  /** ข้อความซ้ายของ utility bar โหมด Commerce */
  utilityItems?: UtilityItem[];
  wishlistEnabled?: boolean;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCart(slug);
  const commerce = layout.utilityBar === true;

  // หมายเหตุ: CartDrawer/เมนู drawer ต้องอยู่ "นอก" <header> — backdrop-blur บน header
  // ทำให้มันกลายเป็น containing block ของ position:fixed แล้ว drawer จะสูงเท่า header
  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      {commerce ? (
        /* utility bar ดำ (ref T2): ซ้าย 2 รายการมีไอคอน / ขวา 3 ลิงก์ */
        <div className="bg-primary text-primary-fg">
          <div className="mx-auto flex max-w-(--container-max) items-center justify-between gap-4 px-4 py-1.5 text-xs">
            <span className="flex min-w-0 items-center gap-5">
              {utilityItems.map((item) => (
                <span key={item.text} className="inline-flex items-center gap-1.5 truncate">
                  {item.icon === 'clock' ? <ClockIcon size={13} /> : <TruckIcon size={13} />}
                  {item.text}
                </span>
              ))}
            </span>
            <span className="flex shrink-0 items-center gap-4">
              <Link href="/track" className="transition-opacity hover:opacity-80">
                ติดตามคำสั่งซื้อ
              </Link>
              <Link href="/p/help" className="hidden transition-opacity hover:opacity-80 sm:inline">
                ช่วยเหลือ
              </Link>
              <Link href="/p/contact" className="hidden transition-opacity hover:opacity-80 sm:inline">
                ติดต่อเรา
              </Link>
            </span>
          </div>
        </div>
      ) : (
        /* แถบ utility เดิม — ข้อความส่งฟรีซ้าย + ติดตามคำสั่งซื้อขวา */
        <div className="border-b border-border-soft bg-surface">
          <div className="mx-auto flex max-w-(--container-max) items-center justify-between gap-4 px-4 py-1.5 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5 truncate">
              <TruckIcon size={14} />
              {freeShippingMin != null
                ? `สั่งซื้อครบ ${formatBaht(freeShippingMin)} ส่งฟรีทั่วประเทศ`
                : 'จัดส่งทั่วประเทศ ชำระผ่าน PromptPay'}
            </span>
            <Link href="/track" className="shrink-0 font-medium transition-colors hover:text-primary">
              ติดตามคำสั่งซื้อ
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-(--container-max) items-center gap-4 px-4 py-3.5 lg:gap-6">
        {/* มือถือโหมด Commerce: hamburger เปิด drawer เมนู (DoD §6.5) */}
        {commerce && (
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="เปิดเมนู"
            className="-ml-1 rounded-md p-1.5 text-text md:hidden"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          {logoUrl && (
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border-soft">
              <Image src={logoUrl} alt={storeName} fill sizes="40px" className="object-cover" />
            </span>
          )}
          <span
            className={`truncate font-heading font-bold tracking-tight text-text ${
              commerce ? 'text-lg tracking-wide' : 'text-xl'
            }`}
          >
            {storeName}
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">
          <CategoryNav categories={categories} variant={navVariant} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {commerce && layout.headerSearch ? (
            <>
              {/* search box จริง (ref T2) — ส่งไป /products?q= */}
              <form action="/products" method="GET" role="search" className="relative hidden lg:block">
                <SearchIcon
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  name="q"
                  placeholder="ค้นหาสินค้า, แบรนด์"
                  aria-label="ค้นหาสินค้า"
                  className="w-52 rounded-full border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text placeholder:text-text-muted focus:border-primary focus:bg-bg focus:outline-none"
                />
              </form>
              <Link
                href="/products"
                aria-label="ค้นหาสินค้า"
                className="rounded-full p-2 text-text transition-colors hover:bg-surface lg:hidden"
              >
                <SearchIcon size={19} />
              </Link>
              <Link
                href="/track"
                aria-label="บัญชีของฉัน"
                title="ติดตามคำสั่งซื้อของฉัน"
                className="hidden rounded-full p-2 text-text transition-colors hover:bg-surface sm:block"
              >
                <UserIcon size={19} />
              </Link>
              {wishlistEnabled && (
                <span className="hidden rounded-full p-2 text-text sm:block" title="รายการโปรด">
                  <HeartIcon size={19} />
                </span>
              )}
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                aria-label={`ตะกร้าสินค้า (${cart.count} ชิ้น)`}
                className="relative rounded-full p-2 text-text transition-colors hover:bg-surface"
              >
                <CartIcon size={19} />
                {cart.count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-fg">
                    {cart.count}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/products"
                aria-label="ค้นหาสินค้า"
                className="rounded-full p-2.5 text-text transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <SearchIcon />
              </Link>
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                aria-label={`ตะกร้าสินค้า (${cart.count} ชิ้น)`}
                className="relative rounded-full bg-primary p-2.5 text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <CartIcon />
                {cart.count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-bg bg-accent px-1 text-[11px] font-bold text-primary-fg">
                    {cart.count}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* มือถือ: nav แถวล่างเลื่อนแนวนอน (โหมดปกติ — โหมด Commerce ใช้ drawer แทน) */}
      {!commerce && (
        <div className="border-t border-border-soft px-4 py-2 md:hidden">
          <CategoryNav categories={categories} variant="topbar" />
        </div>
      )}
    </header>

    {/* เมนู drawer มือถือ (โหมด Commerce) */}
    {commerce && menuOpen && (
      <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="เมนู">
        <button type="button" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-scrim" />
        <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-bg shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
            <p className="font-heading text-base font-bold tracking-wide text-text">{storeName}</p>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="ปิด"
              className="rounded-full p-2 text-text-muted hover:bg-surface"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/products"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium text-text hover:bg-surface"
                >
                  สินค้าทั้งหมด
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={c.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-3 py-2.5 text-sm text-text hover:bg-surface"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li className="mt-2 border-t border-border-soft pt-2">
                <Link
                  href="/track"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-sm text-text-muted hover:bg-surface"
                >
                  ติดตามคำสั่งซื้อ
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    )}

    <CartDrawer
      open={cartOpen}
      onClose={() => setCartOpen(false)}
      items={cart.items}
      onUpdateQty={cart.updateQty}
      onRemove={cart.removeItem}
      checkoutHref="/checkout"
      freeShippingMin={freeShippingMin}
    />
    </>
  );
}
