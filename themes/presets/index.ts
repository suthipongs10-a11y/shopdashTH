// Registry ของ preset ทั้งหมดในโค้ด — ครบ 10 ธีมตาม §4.5 (Phase 4 งาน 4.1)

import type { ThemePreset } from '../types';
import { preset as basic01 } from './basic-01';
import { preset as basic02 } from './basic-02';
import { preset as basic03 } from './basic-03';
import { preset as prof01 } from './prof-01';
import { preset as prof02 } from './prof-02';
import { preset as prof03 } from './prof-03';
import { preset as pro01 } from './pro-01';
import { preset as pro02 } from './pro-02';
import { preset as prem01 } from './prem-01';
import { preset as prem02 } from './prem-02';
import { preset as one01 } from './one-01';

/** เรียงตามตาราง §4.5 */
export const THEME_PRESET_LIST: ThemePreset[] = [
  basic01,
  basic02,
  basic03,
  prof01,
  prof02,
  prof03,
  pro01,
  pro02,
  prem01,
  prem02,
  one01,
];

export const THEME_PRESETS: Record<string, ThemePreset> = Object.fromEntries(
  THEME_PRESET_LIST.map((p) => [p.code, p]),
);

export const DEFAULT_THEME_CODE = basic01.code;

/** คืน preset ตาม code — ไม่รู้จัก code ให้ fallback เป็น basic-01 */
export function getPreset(code: string): ThemePreset {
  return THEME_PRESETS[code] ?? basic01;
}
