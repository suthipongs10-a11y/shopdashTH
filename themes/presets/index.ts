// Registry ของ preset ทั้งหมดในโค้ด — Phase 1 มีเฉพาะ basic-01
// (ธีม 2–10 เพิ่มใน Phase 4 งาน 4.1 — ห้ามสร้างล่วงหน้า)

import type { ThemePreset } from '../types';
import { preset as basic01 } from './basic-01';

export const THEME_PRESETS: Record<string, ThemePreset> = {
  [basic01.code]: basic01,
};

export const DEFAULT_THEME_CODE = basic01.code;

/** คืน preset ตาม code — ไม่รู้จัก code ให้ fallback เป็น basic-01 */
export function getPreset(code: string): ThemePreset {
  return THEME_PRESETS[code] ?? basic01;
}
