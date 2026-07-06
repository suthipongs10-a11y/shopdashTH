'use client';

// Header storefront ตาม wireframe กลุ่ม Basic (§4.6):
// โลโก้/ชื่อร้านซ้าย + CategoryNav + ไอคอนตะกร้าขวา (เปิด CartDrawer)

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { CategoryNav } from '@/components/storefront/CategoryNav';
import type { CategoryItem } from '@/components/storefront/types';
import { useCart } from '@/lib/cart';
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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-(--container-max) items-center justify-between gap-6 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {logoUrl && (
            <span className="relative h-8 w-8 overflow-hidden rounded-md">
              <Image src={logoUrl} alt={storeName} fill sizes="32px" className="object-cover" />
            </span>
          )}
          <span className="font-heading text-lg font-semibold">{storeName}</span>
        </Link>

        <div className="hidden min-w-0 flex-1 md:block">
          <CategoryNav categories={categories} variant={navVariant} />
        </div>

        <button
          type="button"
          onClick={() => setCartOpen(true)}
          aria-label={`ตะกร้าสินค้า (${cart.count} ชิ้น)`}
          className="relative rounded-md border border-border p-2 hover:bg-surface"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
          {cart.count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-fg">
              {cart.count}
            </span>
          )}
        </button>
      </div>

      {/* มือถือ: nav อยู่แถวล่าง เลื่อนแนวนอน */}
      <div className="border-t border-border px-4 py-2 md:hidden">
        <CategoryNav categories={categories} variant="topbar" />
      </div>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart.items}
        onUpdateQty={cart.updateQty}
        onRemove={cart.removeItem}
        checkoutHref="/checkout"
        freeShippingMin={freeShippingMin}
      />
    </header>
  );
}
