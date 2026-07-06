// แปลง preset + theme_overrides ของร้าน → inline style (CSS custom properties)

import type { CSSProperties } from 'react';
import { FONT_VAR } from './fonts';
import { THEME_TOKEN_NAMES, type ThemeFontName, type ThemePreset, type ThemeTokens } from './types';

const FONT_TOKENS = new Set<string>(['--font-heading', '--font-body']);

function isThemeFontName(value: string): value is ThemeFontName {
  return value in FONT_VAR;
}

/**
 * รวม token ของ preset กับ stores.theme_overrides (jsonb — เชื่อไม่ได้ 100%)
 * - รับเฉพาะ key ที่เป็น token จริงตาม §4.2 (กัน inject property อื่น)
 * - token ฟอนต์เก็บเป็น "ชื่อฟอนต์" → แปลงเป็น var(--font-*) ของ next/font
 *   ชื่อฟอนต์นอก allowlist ถูกทิ้ง (fallback เป็นค่าของ preset)
 */
export function resolveThemeStyle(
  preset: ThemePreset,
  overrides: Record<string, unknown> = {},
): CSSProperties {
  const tokens: ThemeTokens = { ...preset.tokens };

  for (const name of THEME_TOKEN_NAMES) {
    const value = overrides[name];
    if (typeof value === 'string' && value.trim() !== '') {
      if (FONT_TOKENS.has(name) && !isThemeFontName(value)) continue;
      tokens[name] = value;
    }
  }

  const style: Record<string, string> = {};
  for (const [name, value] of Object.entries(tokens)) {
    style[name] = FONT_TOKENS.has(name) && isThemeFontName(value) ? FONT_VAR[value] : value;
  }
  return style as CSSProperties;
}
