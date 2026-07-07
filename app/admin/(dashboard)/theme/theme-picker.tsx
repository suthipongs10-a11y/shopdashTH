'use client';

// การ์ดเลือกธีม — โชว์ swatch สีจาก token ของ preset, ล็อกตาม tier ของแพลน
// (server ตรวจ tier ซ้ำใน action เสมอ)

import { useActionState } from 'react';
import { setStoreTheme, type ThemeActionState } from './actions';

export interface ThemeCardData {
  code: string;
  nameTh: string;
  tier: number;
  colors: string[]; // [primary, accent, bg, surface]
  fontHeading: string;
  customizable: boolean;
}

const TIER_LABEL: Record<number, string> = { 1: 'Starter', 2: 'Pro', 3: 'Premium' };

export function ThemePicker({
  themes,
  currentCode,
  allowedTier,
}: {
  themes: ThemeCardData[];
  currentCode: string;
  allowedTier: number;
}) {
  const [state, formAction, pending] = useActionState<ThemeActionState, FormData>(
    setStoreTheme,
    {},
  );

  return (
    <div>
      {state.error && <p className="mb-4 text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="mb-4 text-sm text-green-700">เปลี่ยนธีมแล้ว — หน้าร้านอัปเดตทันที</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => {
          const locked = theme.tier > allowedTier;
          const active = theme.code === currentCode;
          return (
            <div
              key={theme.code}
              className={`rounded-lg border bg-white p-4 ${
                active ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
              } ${locked ? 'opacity-60' : ''}`}
            >
              <div className="mb-3 flex h-16 overflow-hidden rounded-md border border-gray-100">
                {theme.colors.map((c, i) => (
                  <div key={`${theme.code}-${i}`} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{theme.nameTh}</p>
                  <p className="text-xs text-gray-400">
                    {theme.code} · ฟอนต์ {theme.fontHeading} · tier {TIER_LABEL[theme.tier]}
                    {theme.customizable && ' · ปรับแต่งได้'}
                  </p>
                </div>
                {active ? (
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-xs text-white">
                    ใช้อยู่
                  </span>
                ) : locked ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                    🔒 {TIER_LABEL[theme.tier]}
                  </span>
                ) : (
                  <form action={formAction}>
                    <input type="hidden" name="theme_code" value={theme.code} />
                    <button
                      type="submit"
                      disabled={pending}
                      className="rounded-md border border-gray-900 px-3 py-1 text-xs font-medium text-gray-900 hover:bg-gray-900 hover:text-white disabled:opacity-50"
                    >
                      ใช้ธีมนี้
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
