'use client';

// ตัวกรองแคตตาล็อก — filter ทำฝั่ง server ผ่าน query param (§2.1)
// ?category=<id>&size=M&color=แดง&sort=newest|price_asc|price_desc
// หมายเหตุ: ใช้ useSearchParams — หน้าแม่ต้องครอบด้วย <Suspense>

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const SORT_OPTIONS = [
  { value: 'newest', label: 'ใหม่ล่าสุด' },
  { value: 'price_asc', label: 'ราคาต่ำ → สูง' },
  { value: 'price_desc', label: 'ราคาสูง → ต่ำ' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

const selectClass =
  'rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary';

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

  const hasFilter = ['category', 'size', 'color', 'sort'].some((k) => searchParams.get(k));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="หมวดหมู่"
        className={selectClass}
        value={searchParams.get('category') ?? ''}
        onChange={(e) => update('category', e.target.value)}
      >
        <option value="">ทุกหมวดหมู่</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {sizes.length > 0 && (
        <select
          aria-label="ไซส์"
          className={selectClass}
          value={searchParams.get('size') ?? ''}
          onChange={(e) => update('size', e.target.value)}
        >
          <option value="">ทุกไซส์</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {colors.length > 0 && (
        <select
          aria-label="สี"
          className={selectClass}
          value={searchParams.get('color') ?? ''}
          onChange={(e) => update('color', e.target.value)}
        >
          <option value="">ทุกสี</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      )}

      <select
        aria-label="เรียงตาม"
        className={selectClass}
        value={searchParams.get('sort') ?? 'newest'}
        onChange={(e) => update('sort', e.target.value)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {hasFilter && (
        <button
          type="button"
          onClick={() => router.push(pathname)}
          className="text-sm text-text-muted underline underline-offset-2 hover:text-text"
        >
          ล้างตัวกรอง
        </button>
      )}
    </div>
  );
}
