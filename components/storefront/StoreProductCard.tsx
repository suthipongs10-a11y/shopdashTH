'use client';

// การ์ดสินค้าแบบ 'store' (Commerce Premium — ref T2) anatomy ตาม §0.4:
// รูป 3:4 (hover สลับรูปที่สอง+ซูม) → จุดสี → ชื่อ → ราคาหนา → ดาว+จำนวนรีวิว
// + badge "ใหม่" มุมซ้ายบน + หัวใจ wishlist มุมขวาบน + ปุ่มถุงเปิด QuickView

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { BagIcon, StarIcon } from './icons';
import { QuickViewPanel } from './QuickView';
import type { ProductCardData } from './types';
import { WishlistButton } from './WishlistButton';

// ref T2 เขียนราคาแบบ "490 บาท" (ไม่ใช่ ฿490)
function bahtText(min: number, max?: number): string {
  const f = (n: number) => n.toLocaleString('th-TH');
  return max != null && max !== min ? `${f(min)}–${f(max)} บาท` : `${f(min)} บาท`;
}

export function StoreProductCard({
  product,
  slug,
  wishlistEnabled = false,
}: {
  product: ProductCardData;
  slug: string;
  wishlistEnabled?: boolean;
}) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const hasQuickView = (product.variants ?? []).length > 0 && product.inStock;

  return (
    <>
      <div className="group">
        {/* โซนรูป + overlay ทั้งหมด */}
        <div className="relative">
          <Link href={product.href} className="block">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md border border-border-soft bg-surface transition-shadow duration-300 group-hover:shadow-[0_4px_16px_rgba(0,0,0,.08)]">
              {product.imageUrl ? (
                <>
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className={`object-cover transition duration-400 ease-out group-hover:scale-[1.04] ${
                      product.hoverImageUrl ? 'group-hover:opacity-0' : ''
                    }`}
                  />
                  {product.hoverImageUrl && (
                    <Image
                      src={product.hoverImageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, 20vw"
                      className="object-cover opacity-0 transition duration-400 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
                    />
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-text-muted">
                  ไม่มีรูปสินค้า
                </div>
              )}

              {product.badge && (
                <span className="absolute left-2.5 top-2.5 rounded-full border border-border-soft bg-bg px-2.5 py-0.5 text-[11px] font-semibold text-text shadow-card">
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

          {/* หัวใจ wishlist มุมขวาบน (ref: ทุกใบ) */}
          <div className="absolute right-2.5 top-2.5">
            <WishlistButton
              productId={product.id}
              enabled={wishlistEnabled}
              storageKey={`shopdash_wishlist_${slug}`}
              variant="floating"
            />
          </div>

          {/* ปุ่มถุง → QuickView (โผล่ตอน hover บน desktop / โชว์เสมอบนมือถือ) */}
          {hasQuickView && (
            <button
              type="button"
              onClick={() => setQuickViewOpen(true)}
              aria-label={`ดูตัวเลือก ${product.name}`}
              title="ดูตัวเลือกสินค้า"
              className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-fg shadow-card transition-all hover:bg-primary-deep sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
            >
              <BagIcon size={16} />
            </button>
          )}
        </div>

        <div className="mt-2.5 space-y-1 px-0.5">
          {(product.colors ?? []).length > 0 && (
            <div className="flex items-center gap-1.5">
              {(product.colors ?? []).slice(0, 4).map((c, i) => (
                <span
                  key={`${c}-${i}`}
                  className={`h-3.5 w-3.5 rounded-full border border-border ${i === 0 ? 'ring-1 ring-text ring-offset-1 ring-offset-bg' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
          <Link href={product.href} className="block">
            <p className="truncate text-[15px] font-medium text-text hover:underline">{product.name}</p>
          </Link>
          <p className="text-base font-bold text-text">
            {bahtText(product.priceMin, product.priceMax)}
          </p>
          {product.rating && (
            <p className="flex items-center gap-1 text-xs text-text-muted">
              <StarIcon size={13} className="text-star" />
              <span className="font-medium text-text">{product.rating.score}</span>
              <span>({product.rating.count})</span>
            </p>
          )}
        </div>
      </div>

      {quickViewOpen && (
        <QuickViewPanel product={product} slug={slug} onClose={() => setQuickViewOpen(false)} />
      )}
    </>
  );
}
