'use client';

// การ์ดสินค้าแบบ 'toy' (ref Little Joy — ธีมของเล่นเด็ก):
// การ์ดขาวขอบมนใหญ่ + หัวใจ wishlist มุมขวาบน + รูปจัตุรัส → ชื่อ →
// ราคาสี accent หนา → ดาว+จำนวนรีวิว → ปุ่ม "หยิบใส่ตะกร้า" เต็มความกว้าง

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatBahtRange } from '@/lib/format';
import { CartIcon, StarIcon } from './icons';
import { QuickViewPanel } from './QuickView';
import type { ProductCardData } from './types';
import { WishlistButton } from './WishlistButton';

export function ToyProductCard({
  product,
  slug,
  wishlistEnabled = false,
}: {
  product: ProductCardData;
  slug: string;
  wishlistEnabled?: boolean;
}) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const canBuy = (product.variants ?? []).length > 0 && product.inStock;

  return (
    <>
      <div className="group flex h-full flex-col overflow-hidden rounded-lg border border-border-soft bg-bg shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="relative">
          <Link href={product.href} className="block">
            <div className="relative aspect-square w-full overflow-hidden bg-surface">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-text-muted">
                  ไม่มีรูปสินค้า
                </div>
              )}
              {product.badge && (
                <span className="absolute left-2.5 top-2.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-fg shadow-card">
                  {product.badge}
                </span>
              )}
              {!product.inStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-scrim">
                  <span className="rounded-full bg-bg px-3.5 py-1 text-xs font-semibold text-text">
                    สินค้าหมด
                  </span>
                </div>
              )}
            </div>
          </Link>
          <div className="absolute right-2.5 top-2.5">
            <WishlistButton
              productId={product.id}
              enabled={wishlistEnabled}
              storageKey={`shopdash_wishlist_${slug}`}
              variant="floating"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3.5">
          <Link href={product.href} className="block">
            <p className="truncate text-sm font-medium text-text hover:underline">{product.name}</p>
          </Link>
          <p className="font-heading text-base font-semibold text-accent">
            {formatBahtRange(product.priceMin, product.priceMax)}
          </p>
          {product.rating && (
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <span className="flex gap-px text-star" aria-hidden>
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} size={12} />
                ))}
              </span>
              <span>({product.rating.count})</span>
            </p>
          )}
          <div className="mt-auto pt-2">
            {canBuy ? (
              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-90"
              >
                <CartIcon size={14} />
                หยิบใส่ตะกร้า
              </button>
            ) : product.inStock ? (
              <Link
                href={product.href}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-3 py-2 text-xs font-semibold text-primary-fg transition-opacity hover:opacity-90"
              >
                ดูรายละเอียด
              </Link>
            ) : (
              <span className="flex w-full items-center justify-center rounded-full bg-surface px-3 py-2 text-xs font-semibold text-text-muted">
                สินค้าหมด
              </span>
            )}
          </div>
        </div>
      </div>

      {quickViewOpen && (
        <QuickViewPanel product={product} slug={slug} onClose={() => setQuickViewOpen(false)} />
      )}
    </>
  );
}
