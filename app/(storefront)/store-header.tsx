'use client';

// Header storefront ตาม wireframe กลุ่ม Basic (§4.6):
// แถบ utility บน (ส่งฟรี/ติดตามออร์เดอร์) + โลโก้ซ้าย + CategoryNav + ค้นหา + ตะกร้าขวา

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { CategoryNav } from '@/components/storefront/CategoryNav';
import { CartIcon, SearchIcon, TruckIcon } from '@/components/storefront/icons';
import type { CategoryItem } from '@/components/storefront/types';
import { useCart } from '@/lib/cart';
import { formatBaht } from '@/lib/format';
import type { CategoryNavVariant } from '@/themes/types';

export function StoreHeader({
  slug,
  storeName,
  logoUrl,
  categories,
  navVariant,
  freeShippingMin,
}: {
  slug: string;
  storeName: string;
  logoUrl?: string | null;
  categories: CategoryItem[];
  navVariant: CategoryNavVariant;
  freeShippingMin?: number | null;
}) {
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart(slug);

  // หมายเหตุ: CartDrawer ต้องอยู่ "นอก" <header> — backdrop-blur บน header
  // ทำให้มันกลายเป็น containing block ของ position:fixed แล้ว drawer จะสูงเท่า header
  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      {/* แถบ utility — ข้อความส่งฟรีซ้าย + ติดตามคำสั่งซื้อขวา */}
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

      <div className="mx-auto flex max-w-(--container-max) items-center justify-between gap-6 px-4 py-3.5">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2.5">
          {logoUrl && (
            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border-soft">
              <Image src={logoUrl} alt={storeName} fill sizes="40px" className="object-cover" />
            </span>
          )}
          <span className="truncate font-heading text-xl font-bold tracking-tight text-text">
            {storeName}
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">
          <CategoryNav categories={categories} variant={navVariant} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
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
        </div>
      </div>

      {/* มือถือ: nav อยู่แถวล่าง เลื่อนแนวนอน */}
      <div className="border-t border-border-soft px-4 py-2 md:hidden">
        <CategoryNav categories={categories} variant="topbar" />
      </div>
    </header>

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
