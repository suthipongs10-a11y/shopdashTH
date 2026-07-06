'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckoutForm } from '@/components/storefront/CheckoutForm';
import type { CheckoutFormData } from '@/components/storefront/types';
import { cartStorageKey, useCart } from '@/lib/cart';
import { formatBaht } from '@/lib/format';

export function CheckoutClient({
  slug,
  flatShippingFee,
  freeShippingMin,
}: {
  slug: string;
  flatShippingFee: number;
  freeShippingMin: number | null;
}) {
  const router = useRouter();
  const cart = useCart(slug);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const freeShipping = freeShippingMin !== null && cart.subtotal >= freeShippingMin;
  const shippingFee = freeShipping ? 0 : flatShippingFee;
  const total = cart.subtotal + shippingFee;

  async function handleSubmit(data: CheckoutFormData) {
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.items.map((i) => ({
            variantId: i.variantId,
            qty: i.qty,
            expectedUnitPrice: i.unitPrice,
          })),
          customer: data,
        }),
      });
      const json = (await res.json()) as {
        orderNumber?: string;
        error?: string;
        priceChanged?: boolean;
        items?: { variantId: string; unitPrice: number }[];
      };

      if (res.ok && json.orderNumber) {
        cart.clear();
        router.push(`/orders/${json.orderNumber}/pay`);
        return;
      }

      if (json.priceChanged && json.items) {
        // §7.6: server แจ้งราคาใหม่ → อัปเดตตะกร้าให้ตรง แล้วให้ลูกค้ายืนยันยอดใหม่
        const priceMap = new Map(json.items.map((i) => [i.variantId, i.unitPrice]));
        const updated = cart.items.map((i) => ({
          ...i,
          unitPrice: priceMap.get(i.variantId) ?? i.unitPrice,
        }));
        window.localStorage.setItem(cartStorageKey(slug), JSON.stringify(updated));
        window.dispatchEvent(new Event('shopdash:cart'));
      }
      setServerError(json.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } catch {
      setServerError('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-text-muted">ตะกร้าของคุณว่างเปล่า</p>
        <Link
          href="/products"
          className="mt-4 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-fg"
        >
          เลือกซื้อสินค้า
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section>
        <h2 className="mb-3 font-heading text-lg font-semibold">ข้อมูลจัดส่ง</h2>
        <CheckoutForm onSubmit={handleSubmit} submitting={submitting} serverError={serverError} />
      </section>

      <section>
        <h2 className="mb-3 font-heading text-lg font-semibold">สรุปคำสั่งซื้อ</h2>
        <div className="rounded-md border border-border bg-surface p-4">
          <ul className="divide-y divide-border">
            {cart.items.map((item) => (
              <li key={item.variantId} className="flex justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{item.productName}</span>
                  {item.variantLabel && (
                    <span className="text-text-muted"> · {item.variantLabel}</span>
                  )}
                  <span className="text-text-muted"> × {item.qty}</span>
                </span>
                <span className="shrink-0">{formatBaht(item.unitPrice * item.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">ยอดรวมสินค้า</dt>
              <dd>{formatBaht(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">ค่าจัดส่ง</dt>
              <dd>{shippingFee === 0 ? 'ส่งฟรี' : formatBaht(shippingFee)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-heading text-base font-semibold">
              <dt>ยอดสุทธิ</dt>
              <dd>{formatBaht(total)}</dd>
            </div>
          </dl>
          {!freeShipping && freeShippingMin !== null && (
            <p className="mt-2 text-xs text-text-muted">
              สั่งครบ {formatBaht(freeShippingMin)} ส่งฟรี
            </p>
          )}
          <p className="mt-3 text-xs text-text-muted">
            ยอดสุทธิจะถูกคำนวณอีกครั้งโดยระบบก่อนสร้างคำสั่งซื้อ
          </p>
        </div>
      </section>
    </div>
  );
}
