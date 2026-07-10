'use client';

// ฟอร์มปรับแต่งธีม (§4.6) — แก้สีหลัก/สีรอง/ฟอนต์/ความโค้งมุม เขียนลง stores.theme_overrides

import { useActionState } from 'react';
import { resetThemeOverrides, saveThemeOverrides, type ThemeActionState } from '../actions';

export interface CustomizeDefaults {
  primary: string;
  accent: string;
  radiusMd: string;
  fontHeading: string;
  fontBody: string;
}

export function CustomizeForm({
  defaults,
  fontNames,
}: {
  /** ค่าที่มีผลตอนนี้ (preset + overrides เดิม) */
  defaults: CustomizeDefaults;
  fontNames: string[];
}) {
  const [state, formAction, pending] = useActionState<ThemeActionState, FormData>(
    saveThemeOverrides,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="--color-primary" className="mb-1 block text-sm font-medium text-gray-700">
            สีหลักของร้าน
          </label>
          <input
            id="--color-primary"
            name="--color-primary"
            type="color"
            defaultValue={defaults.primary}
            className="h-10 w-full cursor-pointer rounded-lg border border-gray-300"
          />
        </div>
        <div>
          <label htmlFor="--color-accent" className="mb-1 block text-sm font-medium text-gray-700">
            สีเน้น (badge / ไฮไลต์)
          </label>
          <input
            id="--color-accent"
            name="--color-accent"
            type="color"
            defaultValue={defaults.accent}
            className="h-10 w-full cursor-pointer rounded-lg border border-gray-300"
          />
        </div>
        <div>
          <label htmlFor="--font-heading" className="mb-1 block text-sm font-medium text-gray-700">
            ฟอนต์หัวข้อ
          </label>
          <select
            id="--font-heading"
            name="--font-heading"
            defaultValue={defaults.fontHeading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {fontNames.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="--font-body" className="mb-1 block text-sm font-medium text-gray-700">
            ฟอนต์เนื้อหา
          </label>
          <select
            id="--font-body"
            name="--font-body"
            defaultValue={defaults.fontBody}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {fontNames.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="--radius-md" className="mb-1 block text-sm font-medium text-gray-700">
            ความโค้งมุม (เช่น 0px, 8px, 16px)
          </label>
          <input
            id="--radius-md"
            name="--radius-md"
            defaultValue={defaults.radiusMd}
            pattern="\d{1,2}px"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-700">บันทึกแล้ว — หน้าร้านอัปเดตทันที</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกการปรับแต่ง'}
        </button>
        <button
          type="button"
          onClick={() => resetThemeOverrides()}
          className="rounded-lg border border-gray-300 px-5 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          คืนค่าธีมเดิม
        </button>
      </div>
    </form>
  );
}
