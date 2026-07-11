'use client';

// Sidebar ฟิลเตอร์แบบ marketplace (ref T3) — ทุกตัวกรองทำงานจริงฝั่ง server ผ่าน query param:
// ?category=id1,id2 (checkbox หลายหมวด) &q= &price_min= &price_max= &size= &color= &instock=1
// desktop: คอลัมน์ซ้ายติดหน้า / mobile: ปุ่ม "ตัวกรอง" เปิด drawer เต็มจอ (เนื้อหาเดียวกัน)

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { colorFromName, isKnownColor } from '@/lib/color-names';
import { CheckIcon, ChevronDownIcon, CloseIcon, SearchIcon } from './icons';
import { useVariantLabels } from './variant-labels-context';

export interface SidebarCategory {
  id: string;
  name: string;
}

/** ปุ่มช่วงราคาสำเร็จรูป (ref: slider ราคา + ปุ่มช่วงราคา) */
const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: 'ต่ำกว่า 500', max: 499 },
  { label: '500 – 1,000', min: 500, max: 1000 },
  { label: '1,000 – 2,000', min: 1000, max: 2000 },
  { label: 'มากกว่า 2,000', min: 2001 },
];

const SLIDER_MAX = 3000;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[13px] font-bold text-text">{children}</p>
  );
}

function FilterSections({
  categories,
  sizes,
  colors,
  basePath,
  onNavigate,
}: {
  categories: SidebarCategory[];
  sizes: string[];
  colors: string[];
  basePath: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const labels = useVariantLabels(); // ป้ายมิติ variant ของร้าน (ไซส์/สี หรือ ช่วงวัย/แบบ ฯลฯ)
  // มิติ "สี" ที่ค่าไม่ใช่สีจริง (เช่น แบบ: หมี/กระต่าย) จุดสีเทาแยกไม่ออก — ใช้ชิปข้อความแทน
  const colorsAsDots = colors.length > 0 && colors.every(isKnownColor);
  const [q, setQ] = useState(searchParams.get('q') ?? '');

  const selectedCats = (searchParams.get('category') ?? '').split(',').filter(Boolean);
  const activeSize = searchParams.get('size') ?? '';
  const activeColor = searchParams.get('color') ?? '';
  const inStockOnly = searchParams.get('instock') === '1';
  const priceMin = searchParams.get('price_min');
  const priceMax = searchParams.get('price_max');
  const [sliderVal, setSliderVal] = useState(priceMax ? Number(priceMax) : SLIDER_MAX);
  // sync ตอน URL เปลี่ยนจากปุ่มช่วงราคา/ล้างตัวกรอง
  useEffect(() => {
    setSliderVal(priceMax ? Number(priceMax) : SLIDER_MAX);
  }, [priceMax]);
  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  function push(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
    onNavigate?.();
  }

  function toggleCategory(id: string) {
    push((p) => {
      const next = selectedCats.includes(id)
        ? selectedCats.filter((c) => c !== id)
        : [...selectedCats, id];
      if (next.length > 0) {
        p.set('category', next.join(','));
      } else {
        p.delete('category');
      }
    });
  }

  function setPriceRange(min?: number, max?: number) {
    push((p) => {
      if (min != null) {
        p.set('price_min', String(min));
      } else {
        p.delete('price_min');
      }
      if (max != null) {
        p.set('price_max', String(max));
      } else {
        p.delete('price_max');
      }
    });
  }

  const activeRange = PRICE_RANGES.findIndex(
    (r) =>
      (r.min != null ? String(r.min) === priceMin : priceMin == null) &&
      (r.max != null ? String(r.max) === priceMax : priceMax == null),
  );

  const hasFilter =
    selectedCats.length > 0 ||
    activeSize ||
    activeColor ||
    inStockOnly ||
    priceMin ||
    priceMax ||
    searchParams.get('q');

  return (
    <div className="space-y-6">
      {/* ค้นหา (แพลตฟอร์มไม่มี entity แบรนด์ — ใช้ค้นหาชื่อสินค้าแทนช่องค้นแบรนด์ของ ref) */}
      <div>
        <SectionTitle>ค้นหา</SectionTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            push((p) => {
              const term = q.trim();
              if (term) {
                p.set('q', term);
              } else {
                p.delete('q');
              }
            });
          }}
          role="search"
          className="relative"
        >
          <SearchIcon
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ชื่อสินค้า…"
            aria-label="ค้นหาสินค้า"
            className="w-full rounded-sm border border-border bg-bg py-2 pl-9 pr-3 text-[13px] text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary-ring"
          />
        </form>
      </div>

      {/* หมวดหมู่ — checkbox เลือกหลายหมวด */}
      {categories.length > 0 && (
        <div>
          <SectionTitle>หมวดหมู่</SectionTitle>
          <ul className="space-y-2">
            {categories.map((c) => {
              const checked = selectedCats.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className="group flex w-full items-center gap-2.5 text-left text-[13px] text-text"
                  >
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                        checked
                          ? 'border-primary bg-primary text-primary-fg'
                          : 'border-border bg-bg group-hover:border-primary'
                      }`}
                    >
                      {checked && <CheckIcon size={11} />}
                    </span>
                    <span className={checked ? 'font-medium' : ''}>{c.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ราคา — slider เพดานราคา + ปุ่มช่วงสำเร็จรูป */}
      <div>
        <SectionTitle>ราคา</SectionTitle>
        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          step={100}
          value={sliderVal}
          onChange={(e) => setSliderVal(Number(e.target.value))}
          onMouseUp={() => setPriceRange(undefined, sliderVal >= SLIDER_MAX ? undefined : sliderVal)}
          onTouchEnd={() => setPriceRange(undefined, sliderVal >= SLIDER_MAX ? undefined : sliderVal)}
          aria-label="เพดานราคา"
          className="w-full accent-primary"
        />
        <p className="mt-1 text-xs text-text-muted">
          0 – {sliderVal >= SLIDER_MAX ? `${SLIDER_MAX.toLocaleString('th-TH')}+` : sliderVal.toLocaleString('th-TH')} บาท
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {PRICE_RANGES.map((r, i) => (
            <button
              key={r.label}
              type="button"
              onClick={() =>
                activeRange === i ? setPriceRange(undefined, undefined) : setPriceRange(r.min, r.max)
              }
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeRange === i
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-border bg-bg text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* สี — จุดสีจริงจาก variant ของร้าน (มิติที่ไม่ใช่สีจริง → ชิปข้อความ) */}
      {colors.length > 0 && (
        <div>
          <SectionTitle>{labels.color}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {colors.map((name) => {
              const selected = activeColor === name;
              return colorsAsDots ? (
                <button
                  key={name}
                  type="button"
                  title={name}
                  aria-label={`${labels.color} ${name}`}
                  aria-pressed={selected}
                  onClick={() => push((p) => (selected ? p.delete('color') : p.set('color', name)))}
                  className={`h-6 w-6 rounded-full border border-border transition-all ${
                    selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: colorFromName(name) }}
                />
              ) : (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => push((p) => (selected ? p.delete('color') : p.set('color', name)))}
                  className={`rounded-[4px] border px-2 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-border bg-bg text-text hover:border-primary'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
          {colorsAsDots && activeColor && (
            <p className="mt-1.5 text-xs text-text-muted">เลือก: {activeColor}</p>
          )}
        </div>
      )}

      {/* ไซส์ — ชิป */}
      {sizes.length > 0 && (
        <div>
          <SectionTitle>{labels.size}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {sizes.map((s) => {
              const selected = activeSize === s;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => push((p) => (selected ? p.delete('size') : p.set('size', s)))}
                  className={`min-w-9 rounded-[4px] border px-2 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-primary bg-primary text-primary-fg'
                      : 'border-border bg-bg text-text hover:border-primary'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* สต๊อก */}
      <div>
        <SectionTitle>สต๊อก</SectionTitle>
        <button
          type="button"
          onClick={() => push((p) => (inStockOnly ? p.delete('instock') : p.set('instock', '1')))}
          className="group flex items-center gap-2.5 text-[13px] text-text"
        >
          <span
            aria-hidden
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
              inStockOnly
                ? 'border-primary bg-primary text-primary-fg'
                : 'border-border bg-bg group-hover:border-primary'
            }`}
          >
            {inStockOnly && <CheckIcon size={11} />}
          </span>
          พร้อมส่งเท่านั้น
        </button>
      </div>

      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push(basePath);
            onNavigate?.();
          }}
          className="w-full rounded-sm border border-border py-2 text-xs font-medium text-text-muted transition-colors hover:border-danger hover:text-danger"
        >
          ล้างตัวกรองทั้งหมด
        </button>
      )}
    </div>
  );
}

export function CatalogSidebar({
  categories,
  sizes,
  colors,
  basePath = '/products',
  mobileTrigger = true,
}: {
  categories: SidebarCategory[];
  sizes: string[];
  colors: string[];
  basePath?: string;
  /** ปุ่ม "ตัวกรองสินค้า" บนมือถือ — ปิดบนหน้าแรก (ให้กรองที่ /products) */
  mobileTrigger?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* desktop: คอลัมน์ซ้าย */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-md border border-border-soft bg-bg p-4 shadow-card">
          <p className="mb-4 border-b border-border-soft pb-3 text-sm font-bold text-text">
            ตัวกรองสินค้า
          </p>
          <FilterSections categories={categories} sizes={sizes} colors={colors} basePath={basePath} />
        </div>
      </aside>

      {/* mobile: ปุ่มเปิด drawer */}
      <div className={mobileTrigger ? 'lg:hidden' : 'hidden'}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex w-full items-center justify-between rounded-sm border border-border bg-bg px-4 py-2.5 text-sm font-medium text-text"
        >
          ตัวกรองสินค้า
          <ChevronDownIcon size={15} className="text-text-muted" />
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="ตัวกรองสินค้า">
            <button
              type="button"
              aria-label="ปิดตัวกรอง"
              className="absolute inset-0 bg-scrim"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-[85%] max-w-sm animate-drawer-in overflow-y-auto bg-bg p-5 shadow-lg">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-base font-bold text-text">ตัวกรองสินค้า</p>
                <button
                  type="button"
                  aria-label="ปิด"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text"
                >
                  <CloseIcon size={15} />
                </button>
              </div>
              <FilterSections
                categories={categories}
                sizes={sizes}
                colors={colors}
                basePath={basePath}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** แถวบนของ grid: จำนวนผลลัพธ์ + เรียงตาม (ใช้คู่กับ CatalogSidebar) */
export function CatalogSortBar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-text-muted">
        พบ <span className="font-semibold text-text">{total.toLocaleString('th-TH')}</span> รายการ
      </p>
      <span className="relative inline-flex">
        <select
          aria-label="เรียงตาม"
          value={searchParams.get('sort') ?? 'newest'}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams);
            if (e.target.value === 'newest') {
              params.delete('sort');
            } else {
              params.set('sort', e.target.value);
            }
            params.delete('page');
            const qs = params.toString();
            router.push(qs ? `${pathname}?${qs}` : pathname);
          }}
          className="appearance-none rounded-sm border border-border bg-bg py-1.5 pl-3 pr-8 text-[13px] font-medium text-text focus:border-primary focus:outline-none"
        >
          <option value="newest">ใหม่ล่าสุด</option>
          <option value="price_asc">ราคาต่ำ → สูง</option>
          <option value="price_desc">ราคาสูง → ต่ำ</option>
        </select>
        <ChevronDownIcon
          size={14}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </span>
    </div>
  );
}
