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
  FacebookLogoIcon,
  HeartIcon,
  LineLogoIcon,
  SearchIcon,
  TruckIcon,
  UserIcon,
} from '@/components/storefront/icons';
import type { CategoryItem } from '@/components/storefront/types';
import { useCart } from '@/lib/cart';
import { formatBaht } from '@/lib/format';
import type { ContactChannels } from '@/lib/theme-content';
import type { CategoryNavVariant, ThemeLayout } from '@/themes/types';

interface UtilityItem {
  icon: 'truck' | 'clock';
  text: string;
}

export function StoreHeader({
  slug,
  storeName,
  tagline,
  logoUrl,
  categories,
  navVariant,
  freeShippingMin,
  layout = {},
  utilityItems = [],
  wishlistEnabled = false,
  orderingEnabled = true,
  contact,
}: {
  slug: string;
  storeName: string;
  /** ข้อความเล็กใต้โลโก้ (ref T1 เช่น "BASIC STYLE FOR EVERYDAY") */
  tagline?: string | null;
  logoUrl?: string | null;
  categories: CategoryItem[];
  navVariant: CategoryNavVariant;
  freeShippingMin?: number | null;
  layout?: ThemeLayout;
  /** ข้อความซ้ายของ utility bar โหมด Commerce */
  utilityItems?: UtilityItem[];
  wishlistEnabled?: boolean;
  /** flag online_ordering — ปิด = ร้านขายผ่านแชท ไม่มีตะกร้า (ref T1) */
  orderingEnabled?: boolean;
  /** ช่องทางแชท (ปุ่ม LINE/FB เมื่อ layout.headerContactButtons) */
  contact?: ContactChannels;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cart = useCart(slug);
  const commerce = layout.utilityBar === true;
  const contactButtons = layout.headerContactButtons === true;
  // เมนูมือถือเป็น drawer: โหมด Commerce/ปุ่มแชท หรือธีมที่ตั้ง layout.mobileDrawer (ref T4)
  const drawerNav = commerce || contactButtons || layout.mobileDrawer === true;

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
      ) : contactButtons ? null : (
        /* แถบ utility เดิม — ข้อความส่งฟรีซ้าย + ติดตามคำสั่งซื้อขวา
           (โหมดปุ่มแชท ref T1 ไม่มีแถบนี้ — แถบประกาศดำด้านบนทำหน้าที่แทน) */
        <div className="border-b border-border-soft bg-surface">
          <div className="mx-auto flex max-w-(--container-max) items-center justify-between gap-4 px-4 py-1.5 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5 truncate">
              <TruckIcon size={14} />
              {freeShippingMin != null
                ? `สั่งซื้อครบ ${formatBaht(freeShippingMin)} ส่งฟรีทั่วประเทศ`
                : 'จัดส่งทั่วประเทศ ชำระผ่าน PromptPay'}
            </span>
            {orderingEnabled && (
              <Link href="/track" className="shrink-0 font-medium transition-colors hover:text-primary">
                ติดตามคำสั่งซื้อ
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-(--container-max) items-center gap-4 px-4 py-3.5 lg:gap-6">
        {/* มือถือ: hamburger เปิด drawer เมนู (DoD §6.5) */}
        {drawerNav && (
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
          <span className="min-w-0">
            <span
              className={`block truncate font-heading text-text ${
                layout.logoWide
                  ? 'text-xl font-medium uppercase tracking-[0.3em]' // โลโก้ตัวโปร่ง (ref T4)
                  : commerce
                    ? 'text-lg font-bold tracking-wide'
                    : 'text-xl font-bold tracking-tight'
              }`}
            >
              {storeName}
            </span>
            {tagline && (
              <span className="block truncate text-[10px] font-medium tracking-[0.18em] text-text-muted">
                {tagline}
              </span>
            )}
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">
          <CategoryNav categories={categories} variant={navVariant} />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* ปุ่มช่องทางแชท (ref T1) — เต็มบน desktop, ไอคอนกลมบนมือถือ */}
          {contactButtons && contact?.lineUrl && (
            <>
              <a
                href={contact.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-sm bg-brand-line px-3.5 py-2 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-90 lg:inline-flex"
              >
                <LineLogoIcon size={15} />
                ติดต่อสั่งซื้อ (LINE)
              </a>
              <a
                href={contact.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ติดต่อสั่งซื้อผ่าน LINE"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-line text-primary-fg lg:hidden"
              >
                <LineLogoIcon size={17} />
              </a>
            </>
          )}
          {contactButtons && contact?.facebookUrl && (
            <>
              <a
                href={contact.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-sm bg-brand-facebook px-3.5 py-2 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-90 lg:inline-flex"
              >
                <FacebookLogoIcon size={15} />
                ข้อความ (Facebook)
              </a>
              <a
                href={contact.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="ส่งข้อความผ่าน Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-facebook text-primary-fg lg:hidden"
              >
                <FacebookLogoIcon size={17} />
              </a>
            </>
          )}

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
              {orderingEnabled && (
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
              )}
            </>
          ) : (
            <>
              {!contactButtons && (
                <Link
                  href="/products"
                  aria-label="ค้นหาสินค้า"
                  className="rounded-full p-2.5 text-text transition-colors hover:bg-primary-soft hover:text-primary"
                >
                  <SearchIcon />
                </Link>
              )}
              {orderingEnabled && (
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
              )}
            </>
          )}
        </div>
      </div>

      {/* มือถือ: nav แถวล่างเลื่อนแนวนอน (โหมดปกติ — โหมดที่มี drawer ไม่ต้องมี) */}
      {!drawerNav && (
        <div className="border-t border-border-soft px-4 py-2 md:hidden">
          <CategoryNav categories={categories} variant="topbar" />
        </div>
      )}
    </header>

    {/* เมนู drawer มือถือ */}
    {drawerNav && menuOpen && (
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
              {/* โหมดปุ่มแชท: รายการใน categories เป็นลิงก์หน้าอยู่แล้ว (มีรวมสินค้า) — ไม่ต้องเติมซ้ำ */}
              {!contactButtons && (
                <li>
                  <Link
                    href="/products"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-3 py-2.5 text-sm font-medium text-text hover:bg-surface"
                  >
                    สินค้าทั้งหมด
                  </Link>
                </li>
              )}
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
              {orderingEnabled && (
                <li className="mt-2 border-t border-border-soft pt-2">
                  <Link
                    href="/track"
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-md px-3 py-2.5 text-sm text-text-muted hover:bg-surface"
                  >
                    ติดตามคำสั่งซื้อ
                  </Link>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </div>
    )}

    {orderingEnabled && (
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart.items}
        onUpdateQty={cart.updateQty}
        onRemove={cart.removeItem}
        checkoutHref="/checkout"
        freeShippingMin={freeShippingMin}
      />
    )}
    </>
  );
}
