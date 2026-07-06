'use client';

// ปุ่ม wishlist — เก็บ localStorage ต่อร้าน, render เฉพาะเมื่อ feature เปิด
// (ธีมระดับ Pro ขึ้นไป — §2.1) เปิดใช้จริง Phase 4

import { useEffect, useState } from 'react';

function readWishlist(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function WishlistButton({
  productId,
  enabled,
  storageKey,
}: {
  productId: string;
  enabled: boolean;
  /** เช่น shopdash_wishlist_{tenant_slug} */
  storageKey: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (enabled) setSaved(readWishlist(storageKey).includes(productId));
  }, [enabled, storageKey, productId]);

  if (!enabled) return null;

  function toggle() {
    const list = readWishlist(storageKey);
    const next = saved ? list.filter((id) => id !== productId) : [...list, productId];
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    setSaved(!saved);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
      title={saved ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
      className={`rounded-md border border-border p-2 transition-colors hover:border-danger ${
        saved ? 'text-danger' : 'text-text-muted'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    </button>
  );
}
