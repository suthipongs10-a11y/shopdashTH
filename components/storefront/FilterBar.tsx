'use client';

// ตัวกรองแคตตาล็อก — filter ทำฝั่ง server ผ่าน query param (§2.1)
// ?category=<id>&size=M&color=แดง&q=<คำค้น>&sort=newest|price_asc|price_desc
// ค้นหา (q) ใช้ pg_trgm ILIKE ฝั่ง server (§5.4)
// หมายเหตุ: ใช้ useSearchParams — หน้าแม่ต้องครอบด้วย <Suspense>

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ChevronDownIcon, SearchIcon } from './icons';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'ใหม่ล่าสุด' },
  { value: 'price_asc', label: 'ราคาต่ำ → สูง' },
  { value: 'price_desc', label: 'ราคาสูง → ต่ำ' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

// select แบบ custom — ซ่อนลูกศร default แล้ววาง chevron เอง ให้เข้าธีมทุกร้าน
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        className="appearance-none rounded-full border border-border bg-bg py-2 pl-4 pr-9 text-sm font-medium text-text transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDownIcon
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
      />
    </span>
  );
}

export function FilterBar({
  categories,
  sizes,
  colors,
}: {
  categories: { id: string; name: string }[];
  sizes: string[];
  colors: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // เปลี่ยนตัวกรองแล้วกลับหน้าแรกเสมอ
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearAll() {
    setQ('');
    router.push(pathname);
  }

  const hasFilter = ['category', 'size', 'color', 'sort', 'q'].some((k) => searchParams.get(k));

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update('q', q.trim());
        }}
        className="flex gap-2"
        role="search"
      >
        <span className="relative w-full max-w-sm">
          <SearchIcon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหาสินค้า…"
            aria-label="ค้นหาสินค้า"
            className="w-full rounded-full border border-border bg-bg py-2.5 pl-10 pr-4 text-sm text-text transition-colors placeholder:text-text-muted hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary-ring"
          />
        </span>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-fg shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          ค้นหา
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          label="หมวดหมู่"
          value={searchParams.get('category') ?? ''}
          onChange={(v) => update('category', v)}
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </FilterSelect>

        {sizes.length > 0 && (
          <FilterSelect
            label="ไซส์"
            value={searchParams.get('size') ?? ''}
            onChange={(v) => update('size', v)}
          >
            <option value="">ทุกไซส์</option>
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </FilterSelect>
        )}

        {colors.length > 0 && (
          <FilterSelect
            label="สี"
            value={searchParams.get('color') ?? ''}
            onChange={(v) => update('color', v)}
          >
            <option value="">ทุกสี</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FilterSelect>
        )}

        <FilterSelect
          label="เรียงตาม"
          value={searchParams.get('sort') ?? 'newest'}
          onChange={(v) => update('sort', v)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </FilterSelect>

        {hasFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full px-3 py-1.5 text-sm text-text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            ✕ ล้างตัวกรอง
          </button>
        )}
      </div>
    </div>
  );
}
