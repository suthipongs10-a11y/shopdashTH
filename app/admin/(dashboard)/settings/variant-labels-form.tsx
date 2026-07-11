'use client';

// ป้ายชื่อมิติตัวเลือกสินค้า (variant) — ร้านนอกกลุ่มเสื้อผ้า (ของเล่น/แม่และเด็ก ฯลฯ)
// เปลี่ยนคำ "ไซส์/สี" เป็นคำของหมวดตัวเอง เช่น ช่วงวัย/แบบ — มีผลทั้งหน้าร้านและหลังร้าน
// ค่า variant เดิมไม่ถูกแตะ (ยังอยู่คอลัมน์ size/color) เปลี่ยนเฉพาะป้ายที่โชว์

import { useActionState, useState } from 'react';
import {
  DEFAULT_VARIANT_LABELS,
  VARIANT_LABEL_PRESETS,
  type VariantLabels,
} from '@/lib/theme-content';
import { updateVariantLabels, type SettingsState } from './actions';

export function VariantLabelsForm({ values }: { values: VariantLabels }) {
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    updateVariantLabels,
    {},
  );
  const [size, setSize] = useState(values.size ?? DEFAULT_VARIANT_LABELS.size);
  const [color, setColor] = useState(values.color ?? DEFAULT_VARIANT_LABELS.color);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {VARIANT_LABEL_PRESETS.map((p) => {
          const active = p.size === size && p.color === color;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setSize(p.size);
                setColor(p.color);
              }}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-600'
              }`}
            >
              {p.name} ({p.size}/{p.color})
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="variant_label_size" className="mb-1 block text-sm font-medium text-gray-700">
            ชื่อมิติที่ 1
          </label>
          <input
            id="variant_label_size"
            name="variant_label_size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            maxLength={20}
            placeholder={DEFAULT_VARIANT_LABELS.size}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="variant_label_color" className="mb-1 block text-sm font-medium text-gray-700">
            ชื่อมิติที่ 2
          </label>
          <input
            id="variant_label_color"
            name="variant_label_color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            maxLength={20}
            placeholder={DEFAULT_VARIANT_LABELS.color}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        คำนี้จะใช้แทน "ไซส์" และ "สี" ทั้งหน้าร้าน (ตัวกรอง/หน้าสินค้า) และหลังร้าน (ตาราง variant)
        — ตัวเลือกสินค้าที่ตั้งไว้แล้วไม่หาย เว้นว่าง = กลับเป็นค่าเริ่มต้น
      </p>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกชื่อตัวเลือก'}
        </button>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-700">บันทึกแล้ว — มีผลทั้งหน้าร้านและหลังร้านทันที</p>}
      </div>
    </form>
  );
}
