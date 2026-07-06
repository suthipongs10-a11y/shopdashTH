'use client';

// ตะกร้าฝั่งลูกค้า — เก็บใน localStorage key: shopdash_cart_{tenant_slug} (§2.1)
// ไม่ผูก account (guest checkout) — ราคาใน cart เป็นแค่ค่าที่ลูกค้าเห็น
// server จะคำนวณราคาจริงจาก DB ใหม่ตอน checkout เสมอ (§7.6)

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { CartItem } from '@/components/storefront/types';

const CART_EVENT = 'shopdash:cart';

export function cartStorageKey(slug: string): string {
  return `shopdash_cart_${slug}`;
}

function readRaw(key: string): string {
  if (typeof window === 'undefined') return '[]';
  return window.localStorage.getItem(key) ?? '[]';
}

function parseItems(raw: string): CartItem[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CartItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as CartItem).variantId === 'string' &&
        typeof (item as CartItem).unitPrice === 'number' &&
        typeof (item as CartItem).qty === 'number',
    );
  } catch {
    return [];
  }
}

function writeItems(key: string, items: CartItem[]): void {
  window.localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener('storage', callback); // sync ข้ามแท็บ
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function useCart(slug: string) {
  const key = cartStorageKey(slug);
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => '[]',
  );
  const items = useMemo(() => parseItems(raw), [raw]);

  const addItem = useCallback(
    (item: CartItem) => {
      const current = parseItems(readRaw(key));
      const existing = current.find((i) => i.variantId === item.variantId);
      let next: CartItem[];
      if (existing) {
        const merged = existing.qty + item.qty;
        const capped = item.maxQty != null ? Math.min(merged, item.maxQty) : merged;
        next = current.map((i) =>
          i.variantId === item.variantId ? { ...item, qty: capped } : i,
        );
      } else {
        next = [...current, item];
      }
      writeItems(key, next);
    },
    [key],
  );

  const updateQty = useCallback(
    (variantId: string, qty: number) => {
      const current = parseItems(readRaw(key));
      const next = current
        .map((i) => {
          if (i.variantId !== variantId) return i;
          const capped = i.maxQty != null ? Math.min(qty, i.maxQty) : qty;
          return { ...i, qty: Math.max(1, capped) };
        })
        .filter((i) => i.qty > 0);
      writeItems(key, next);
    },
    [key],
  );

  const removeItem = useCallback(
    (variantId: string) => {
      writeItems(
        key,
        parseItems(readRaw(key)).filter((i) => i.variantId !== variantId),
      );
    },
    [key],
  );

  const clear = useCallback(() => writeItems(key, []), [key]);

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return { items, addItem, updateQty, removeItem, clear, subtotal, count };
}
