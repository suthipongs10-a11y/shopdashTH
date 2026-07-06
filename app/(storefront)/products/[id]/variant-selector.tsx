'use client';

// เลือก variant (ไซส์/สี) → ราคา+สต๊อกอัปเดตตาม variant ที่เลือก
// ปุ่มหยิบใส่ตะกร้า disabled เมื่อ variant นั้นสต๊อก 0 (§2.1 + DoD ข้อ 4)

import { useMemo, useState } from 'react';
import type { StorefrontVariant } from '@/lib/catalog';
import { useCart } from '@/lib/cart';
import { formatBaht, formatBahtRange } from '@/lib/format';
import { variantLabel } from '@/lib/variants';

function uniqueDims(variants: StorefrontVariant[], key: 'size' | 'color'): string[] {
  return [...new Set(variants.map((v) => v[key]).filter((v): v is string => v !== null))];
}

export function VariantSelector({
  slug,
  productId,
  productName,
  imageUrl,
  variants,
}: {
  slug: string;
  productId: string;
  productName: string;
  imageUrl?: string;
  variants: StorefrontVariant[];
}) {
  const sizes = useMemo(() => uniqueDims(variants, 'size'), [variants]);
  const colors = useMemo(() => uniqueDims(variants, 'color'), [variants]);

  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useCart(slug);

  const needSize = sizes.length > 0;
  const needColor = colors.length > 0;
  const selected =
    (!needSize || size !== null) && (!needColor || color !== null)
      ? (variants.find(
          (v) => (v.size ?? null) === (needSize ? size : null) && (v.color ?? null) === (needColor ? color : null),
        ) ?? null)
      : null;

  const inCartQty = selected
    ? (cart.items.find((i) => i.variantId === selected.id)?.qty ?? 0)
    : 0;
  const remaining = selected ? Math.max(0, selected.stock - inCartQty) : 0;
  const selectionComplete = (!needSize || size !== null) && (!needColor || color !== null);
  const outOfStock = selectionComplete && selected !== null && remaining <= 0;
  const canAdd = selected !== null && remaining > 0;

  const prices = variants.map((v) => v.price);
  const priceText = selected
    ? formatBaht(selected.price)
    : prices.length > 0
      ? formatBahtRange(Math.min(...prices), Math.max(...prices))
      : '-';

  function stockForDim(key: 'size' | 'color', value: string): number {
    return variants
      .filter((v) => v[key] === value)
      .filter((v) => {
        const other = key === 'size' ? 'color' : 'size';
        const otherValue = key === 'size' ? color : size;
        return otherValue === null || v[other] === otherValue;
      })
      .reduce((sum, v) => sum + v.stock, 0);
  }

  function handleAdd() {
    if (!selected || !canAdd) return;
    cart.addItem({
      variantId: selected.id,
      productId,
      productName,
      variantLabel:
        selected.size || selected.color ? variantLabel(selected.size, selected.color) : undefined,
      unitPrice: selected.price,
      qty: Math.min(qty, remaining),
      imageUrl,
      maxQty: selected.stock,
    });
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 2500);
  }

  const dimButton = (active: boolean, disabled: boolean) =>
    `rounded-md border px-4 py-2 text-sm transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-fg'
        : disabled
          ? 'cursor-not-allowed border-border text-text-muted line-through opacity-50'
          : 'border-border hover:border-primary'
    }`;

  return (
    <div className="space-y-5">
      <p className="font-heading text-2xl font-semibold text-primary">{priceText}</p>

      {needSize && (
        <div>
          <p className="mb-2 text-sm font-medium">ไซส์</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(size === s ? null : s)}
                className={dimButton(size === s, stockForDim('size', s) === 0)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {needColor && (
        <div>
          <p className="mb-2 text-sm font-medium">สี</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(color === c ? null : c)}
                className={dimButton(color === c, stockForDim('color', c) === 0)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && remaining > 0 && (
        <p className="text-sm text-text-muted">
          เหลือ {remaining.toLocaleString('th-TH')} ชิ้น
          {inCartQty > 0 && ` (อยู่ในตะกร้าแล้ว ${inCartQty})`}
        </p>
      )}
      {outOfStock && <p className="text-sm font-medium text-danger">สินค้าหมด</p>}
      {!selectionComplete && (
        <p className="text-sm text-text-muted">กรุณาเลือก{needSize && !size ? 'ไซส์' : ''}{needSize && !size && needColor && !color ? 'และ' : ''}{needColor && !color ? 'สี' : ''}</p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-border">
          <button
            type="button"
            aria-label="ลดจำนวน"
            onClick={() => setQty(Math.max(1, qty - 1))}
            disabled={qty <= 1}
            className="px-3 py-2 disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-10 text-center">{qty}</span>
          <button
            type="button"
            aria-label="เพิ่มจำนวน"
            onClick={() => setQty(Math.min(remaining || 1, qty + 1))}
            disabled={!selected || qty >= remaining}
            className="px-3 py-2 disabled:opacity-40"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="flex-1 rounded-md bg-primary py-3 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {outOfStock ? 'สินค้าหมด' : added ? '✓ เพิ่มลงตะกร้าแล้ว' : 'หยิบใส่ตะกร้า'}
        </button>
      </div>
    </div>
  );
}
