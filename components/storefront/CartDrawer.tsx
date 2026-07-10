'use client';

// ตะกร้าแบบ slide-over — เต็มจอบนมือถือ (§4.6), ปุ่ม checkout ติดล่างเสมอ
// state ของตะกร้าอยู่ที่ผู้เรียก (lib/cart.ts + localStorage — งาน 1.6)

import Image from 'next/image';
import Link from 'next/link';
import { formatBaht } from '@/lib/format';
import { CartIcon, CloseIcon } from './icons';
import type { CartItem } from './types';

export function CartDrawer({
  open,
  onClose,
  items,
  onUpdateQty,
  onRemove,
  checkoutHref,
  freeShippingMin,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (variantId: string, qty: number) => void;
  onRemove: (variantId: string) => void;
  checkoutHref: string;
  /** ยอดขั้นต่ำส่งฟรีของร้าน (null = ไม่มี) — โชว์ nudge ในตะกร้า */
  freeShippingMin?: number | null;
}) {
  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const untilFreeShipping =
    freeShippingMin != null && subtotal > 0 && subtotal < freeShippingMin
      ? freeShippingMin - subtotal
      : null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ตะกร้าสินค้า">
      <button
        type="button"
        aria-label="ปิดตะกร้า"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-scrim"
      />
      <div className="absolute right-0 top-0 flex h-full w-full animate-drawer-in flex-col bg-bg shadow-lg sm:max-w-md sm:border-l sm:border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <CartIcon size={19} className="text-primary" />
            ตะกร้าสินค้า
            {items.length > 0 && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                {items.reduce((sum, i) => sum + i.qty, 0)} ชิ้น
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface hover:text-text"
          >
            <CloseIcon size={17} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-text-muted">
              <CartIcon size={24} />
            </span>
            <p className="text-text-muted">ตะกร้าของคุณว่างเปล่า</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              เลือกซื้อสินค้าต่อ
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-4">
              {items.map((item) => {
                const atMax = item.maxQty != null && item.qty >= item.maxQty;
                return (
                  <li key={item.variantId} className="flex gap-3 py-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface">
                      {item.imageUrl && (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.productName}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-text-muted">{item.variantLabel}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-md border border-border">
                          <button
                            type="button"
                            aria-label="ลดจำนวน"
                            onClick={() => onUpdateQty(item.variantId, item.qty - 1)}
                            disabled={item.qty <= 1}
                            className="px-2.5 py-1 text-sm disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="min-w-8 text-center text-sm">{item.qty}</span>
                          <button
                            type="button"
                            aria-label="เพิ่มจำนวน"
                            onClick={() => onUpdateQty(item.variantId, item.qty + 1)}
                            disabled={atMax}
                            className="px-2.5 py-1 text-sm disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-medium">
                          {formatBaht(item.unitPrice * item.qty)}
                        </p>
                      </div>
                      {atMax && (
                        <p className="mt-1 text-xs text-danger">ครบตามจำนวนสต๊อกที่มีแล้ว</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(item.variantId)}
                      aria-label={`ลบ ${item.productName}`}
                      className="self-start text-xs text-text-muted underline underline-offset-2 hover:text-danger"
                    >
                      ลบ
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="space-y-3 border-t border-border p-4">
              {untilFreeShipping !== null && (
                <p className="rounded-md bg-primary-soft px-3 py-2 text-xs font-medium text-primary">
                  🚚 ซื้อเพิ่มอีก {formatBaht(untilFreeShipping)} รับสิทธิ์ส่งฟรี
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-muted">ยอดรวมสินค้า</span>
                <span className="font-heading text-xl font-bold text-primary">
                  {formatBaht(subtotal)}
                </span>
              </div>
              <p className="text-xs text-text-muted">ค่าจัดส่งคำนวณในขั้นตอนชำระเงิน</p>
              <Link
                href={checkoutHref}
                className="block rounded-full bg-primary py-3.5 text-center text-sm font-semibold text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                สั่งซื้อและชำระเงิน →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
