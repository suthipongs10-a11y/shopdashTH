'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckoutForm } from '@/components/storefront/CheckoutForm';
import type { CheckoutFormData } from '@/components/storefront/types';
import { cartStorageKey, useCart } from '@/lib/cart';
import { formatBaht } from '@/lib/format';

interface AppliedDiscount {
  code: string;
  amount: number;
}

export function CheckoutClient({
  slug,
  flatShippingFee,
  freeShippingMin,
  discountEnabled = false,
}: {
  slug: string;
  flatShippingFee: number;
  freeShippingMin: number | null;
  /** ร้านมีฟีเจอร์โค้ดส่วนลด (แพลน Pro ขึ้นไป) — server ตรวจซ้ำเสมอ */
  discountEnabled?: boolean;
}) {
  const router = useRouter();
  const cart = useCart(slug);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);

  const freeShipping = freeShippingMin !== null && cart.subtotal >= freeShippingMin;
  const shippingFee = freeShipping ? 0 : flatShippingFee;
  const discountAmount = discount ? Math.min(discount.amount, cart.subtotal) : 0;
  const total = cart.subtotal + shippingFee - discountAmount;

  async function applyDiscount() {
    if (!discountInput.trim()) return;
    setCheckingDiscount(true);
    setDiscountError(null);
    try {
      const res = await fetch('/api/discounts/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: discountInput,
          items: cart.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; code?: string; amount?: number; error?: string };
      if (res.ok && json.ok && json.code !== undefined && json.amount !== undefined) {
        setDiscount({ code: json.code, amount: json.amount });
      } else {
        setDiscount(null);
        setDiscountError(json.error ?? 'ใช้โค้ดไม่สำเร็จ');
      }
    } catch {
      setDiscountError('เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setCheckingDiscount(false);
    }
  }

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
          discountCode: discount?.code,
        }),
      });
      const json = (await res.json()) as {
        orderNumber?: string;
        payToken?: string;
        error?: string;
        priceChanged?: boolean;
        items?: { variantId: string; unitPrice: number }[];
      };

      if (res.ok && json.orderNumber) {
        cart.clear();
        // token ทำให้หน้าสรุปแสดงข้อมูลจัดส่งเต็ม (ไม่มี token เห็นเฉพาะรายการ+ยอด)
        const tokenParam = json.payToken ? `?t=${json.payToken}` : '';
        router.push(`/orders/${json.orderNumber}/pay${tokenParam}`);
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
      <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
        <p className="text-text-muted">ตะกร้าของคุณว่างเปล่า</p>
        <Link
          href="/products"
          className="inline-block rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          เลือกซื้อสินค้า
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-8 md:grid-cols-2">
      <section>
        <h2 className="mb-4 flex items-center gap-2.5 font-heading text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
            1
          </span>
          ข้อมูลจัดส่ง
        </h2>
        <CheckoutForm onSubmit={handleSubmit} submitting={submitting} serverError={serverError} />
      </section>

      <section className="md:sticky md:top-28">
        <h2 className="mb-4 flex items-center gap-2.5 font-heading text-lg font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-fg">
            2
          </span>
          สรุปคำสั่งซื้อ
        </h2>
        <div className="rounded-lg border border-border bg-surface p-5">
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
          {discountEnabled && (
            <div className="mt-3 border-t border-border pt-3">
              {discount ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-success">
                    ใช้โค้ด <span className="font-medium">{discount.code}</span> แล้ว
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscount(null);
                      setDiscountInput('');
                    }}
                    className="text-xs text-text-muted underline underline-offset-2"
                  >
                    เอาโค้ดออก
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                    placeholder="โค้ดส่วนลด"
                    aria-label="โค้ดส่วนลด"
                    className="min-w-0 flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={applyDiscount}
                    disabled={checkingDiscount || !discountInput.trim()}
                    className="shrink-0 rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-fg disabled:opacity-50"
                  >
                    {checkingDiscount ? 'กำลังตรวจ…' : 'ใช้โค้ด'}
                  </button>
                </div>
              )}
              {discountError && <p className="mt-1 text-xs text-danger">{discountError}</p>}
            </div>
          )}

          <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">ยอดรวมสินค้า</dt>
              <dd>{formatBaht(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">ค่าจัดส่ง</dt>
              <dd>{shippingFee === 0 ? 'ส่งฟรี' : formatBaht(shippingFee)}</dd>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <dt>ส่วนลด ({discount?.code})</dt>
                <dd>-{formatBaht(discountAmount)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-border pt-2 font-heading">
              <dt className="text-base font-semibold">ยอดสุทธิ</dt>
              <dd className="text-2xl font-bold text-primary">{formatBaht(total)}</dd>
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
