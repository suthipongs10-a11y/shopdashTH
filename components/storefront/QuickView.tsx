'use client';

// Quick-view panel (ref T2 มุมขวา): เลือกสี/ไซส์/จำนวน + เพิ่มลงตะกร้า/ซื้อเลย
// เปิดจากปุ่มถุงบนการ์ดสินค้า (การ์ดแบบ 'store') — desktop เป็น panel ลอยขวา, มือถือ bottom sheet

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useCart } from '@/lib/cart';
import { colorFromName, isKnownColor } from '@/lib/color-names';
import { variantLabel } from '@/lib/variants';
import { CloseIcon } from './icons';
import type { ProductCardData } from './types';
import { useVariantLabels } from './variant-labels-context';

function uniq<T>(values: (T | null)[]): T[] {
  return [...new Set(values.filter((v): v is T => v !== null))];
}

export function QuickViewPanel({
  product,
  slug,
  onClose,
}: {
  product: ProductCardData;
  slug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const cart = useCart(slug);
  const labels = useVariantLabels(); // ป้ายมิติ variant ของร้าน (ไซส์/สี หรือ ช่วงวัย/แบบ ฯลฯ)
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const sizes = useMemo(() => uniq(variants.map((v) => v.size)), [variants]);
  const colors = useMemo(() => uniq(variants.map((v) => v.color)), [variants]);
  // มิติ "สี" ที่ค่าไม่ใช่สีจริง (เช่น แบบ: หมี/กระต่าย) → ชิปข้อความแทนจุดสี
  const colorsAsDots = colors.length > 0 && colors.every(isKnownColor);

  // เปิดมาพร้อมเลือกตัวแรกที่มีสต๊อกให้เลย (ref แสดง state เลือกแล้ว: สี เบจ + ไซส์ M)
  const firstInStock = useMemo(() => variants.find((v) => v.stock > 0) ?? variants[0], [variants]);
  const [size, setSize] = useState<string | null>(firstInStock?.size ?? null);
  const [color, setColor] = useState<string | null>(firstInStock?.color ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const needSize = sizes.length > 0;
  const needColor = colors.length > 0;
  const selected =
    (!needSize || size !== null) && (!needColor || color !== null)
      ? (variants.find(
          (v) => (v.size ?? null) === (needSize ? size : null) && (v.color ?? null) === (needColor ? color : null),
        ) ?? null)
      : null;
  const canAdd = selected !== null && selected.stock > 0;
  const price = selected ? selected.price : product.priceMin;

  function addToCart(): boolean {
    if (!selected || !canAdd) return false;
    cart.addItem({
      variantId: selected.id,
      productId: product.id,
      productName: product.name,
      variantLabel:
        selected.size || selected.color ? variantLabel(selected.size, selected.color) : undefined,
      unitPrice: selected.price,
      qty: Math.min(qty, selected.stock),
      imageUrl: product.imageUrl,
      maxQty: selected.stock,
    });
    return true;
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`ตัวเลือกสินค้า ${product.name}`}>
      <button type="button" aria-label="ปิด" onClick={onClose} className="absolute inset-0 bg-scrim" />
      <div className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-lg bg-bg p-5 shadow-lg sm:inset-auto sm:right-6 sm:top-24 sm:w-80 sm:rounded-md">
        <div className="flex items-start justify-between gap-3">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-surface sm:w-full">
            {product.imageUrl && (
              <Image src={product.imageUrl} alt={product.name} fill sizes="320px" className="object-cover" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-bg/95 text-text-muted shadow-card hover:text-text"
          >
            <CloseIcon size={15} />
          </button>
        </div>

        <p className="mt-3 text-sm font-medium text-text">{product.name}</p>
        <p className="mt-0.5 text-base font-bold text-text">{price.toLocaleString('th-TH')} บาท</p>

        {needColor && (
          <div className="mt-3">
            <p className="text-xs text-text-muted">
              {labels.color}
              {colorsAsDots && color ? `: ${color}` : ''}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {colors.map((c) =>
                colorsAsDots ? (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(color === c ? null : c)}
                    aria-label={`${labels.color} ${c}`}
                    aria-pressed={color === c}
                    className={`h-7 w-7 rounded-full border border-border ${
                      color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg' : ''
                    }`}
                    style={{ backgroundColor: colorFromName(c) }}
                  />
                ) : (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(color === c ? null : c)}
                    aria-pressed={color === c}
                    className={`rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      color === c
                        ? 'border-primary bg-primary text-primary-fg'
                        : 'border-border text-text hover:border-primary'
                    }`}
                  >
                    {c}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {needSize && (
          <div className="mt-3">
            <p className="text-xs text-text-muted">{labels.size}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(size === s ? null : s)}
                  aria-pressed={size === s}
                  className={`min-w-10 rounded-sm border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    size === s
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-border text-text hover:border-primary'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3">
          <p className="text-xs text-text-muted">จำนวน</p>
          <div className="mt-1.5 inline-flex items-center rounded-sm border border-border">
            <button
              type="button"
              aria-label="ลดจำนวน"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              className="px-3 py-1.5 text-sm disabled:opacity-40"
            >
              −
            </button>
            <span className="min-w-9 text-center text-sm">{qty}</span>
            <button
              type="button"
              aria-label="เพิ่มจำนวน"
              onClick={() => setQty(selected ? Math.min(selected.stock, qty + 1) : qty + 1)}
              disabled={selected !== null && qty >= selected.stock}
              className="px-3 py-1.5 text-sm disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {!selected && (needSize || needColor) && (
          <p className="mt-2 text-xs text-text-muted">กรุณาเลือกตัวเลือกสินค้าให้ครบ</p>
        )}
        {selected && selected.stock <= 0 && <p className="mt-2 text-xs text-danger">สินค้าหมด</p>}

        <div className="mt-4 space-y-2">
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              if (addToCart()) {
                setAdded(true);
                setTimeout(() => setAdded(false), 2000);
              }
            }}
            className="w-full rounded-sm bg-primary py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {added ? '✓ เพิ่มลงตะกร้าแล้ว' : 'เพิ่มลงตะกร้า'}
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => {
              if (addToCart()) router.push('/checkout');
            }}
            className="w-full rounded-sm border border-primary py-2.5 text-sm font-semibold text-text transition-colors hover:bg-primary-soft disabled:opacity-50"
          >
            ซื้อเลย
          </button>
        </div>
      </div>
    </div>
  );
}
