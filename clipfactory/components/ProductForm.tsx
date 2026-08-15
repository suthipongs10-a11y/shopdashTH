'use client';

import { CATEGORIES } from '@/lib/templates';
import type { ProductInput } from '@/lib/types';

export function ProductForm({
  value,
  onChange,
}: {
  value: ProductInput;
  onChange: (next: ProductInput) => void;
}) {
  const set = <K extends keyof ProductInput>(key: K, v: ProductInput[K]) => onChange({ ...value, [key]: v });

  const setPoint = (i: number, text: string) => {
    const next = [...value.sellingPoints];
    next[i] = text;
    set('sellingPoints', next);
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-name">
            ชื่อสินค้า <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="p-name"
            className="field"
            value={value.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="เช่น ผงซักผ้าขาว ขจัดคราบฝังลึก"
          />
        </div>
        <div>
          <label className="label" htmlFor="p-price">
            ราคา
          </label>
          <input
            id="p-price"
            className="field"
            value={value.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="เช่น 129 บาท"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-cat">
            หมวดสินค้า
          </label>
          <input
            id="p-cat"
            className="field"
            list="cat-list"
            value={value.category}
            onChange={(e) => set('category', e.target.value)}
            placeholder="เลือกหรือพิมพ์เอง"
          />
          <datalist id="cat-list">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="mt-1 text-[11px] text-[var(--color-muted)]">ใช้แนะนำสูตรคลิปที่เข้ากับสินค้า</p>
        </div>
        <div>
          <label className="label" htmlFor="p-aud">
            กลุ่มลูกค้า
          </label>
          <input
            id="p-aud"
            className="field"
            value={value.audience}
            onChange={(e) => set('audience', e.target.value)}
            placeholder="เช่น แม่บ้าน อายุ 25-45"
          />
        </div>
      </div>

      <div>
        <span className="label">จุดขาย (ใส่ 2–3 ข้อกำลังดี)</span>
        <div className="grid gap-2">
          {value.sellingPoints.map((p, i) => (
            <input
              key={i}
              className="field"
              value={p}
              onChange={(e) => setPoint(i, e.target.value)}
              placeholder={
                ['เช่น ขจัดคราบกาแฟใน 10 นาที', 'เช่น ไม่ต้องขยี้ ไม่ทำลายเนื้อผ้า', 'เช่น 1 ถุงใช้ได้ 30 ครั้ง'][i] ??
                'จุดขายเพิ่มเติม'
              }
              aria-label={`จุดขายข้อที่ ${i + 1}`}
            />
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="btn-ghost px-3 py-1 text-xs"
            onClick={() => set('sellingPoints', [...value.sellingPoints, ''])}
            disabled={value.sellingPoints.length >= 6}
          >
            + เพิ่มจุดขาย
          </button>
          {value.sellingPoints.length > 1 ? (
            <button
              type="button"
              className="btn-ghost px-3 py-1 text-xs"
              onClick={() => set('sellingPoints', value.sellingPoints.slice(0, -1))}
            >
              − ลบข้อสุดท้าย
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="p-url">
          ลิงก์สินค้า (ไม่บังคับ — ใช้เก็บอ้างอิงตอนไปปักตะกร้า)
        </label>
        <input
          id="p-url"
          className="field"
          value={value.url}
          onChange={(e) => set('url', e.target.value)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
