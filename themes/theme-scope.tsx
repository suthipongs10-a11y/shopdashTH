// ขอบเขตธีมของ storefront — layout (งาน 1.6) ครอบทุกหน้าด้วยคอมโพเนนต์นี้
// ทำหน้าที่: ประกาศ token ทั้งหมดเป็น CSS variables + เปิดใช้ฟอนต์ next/font

import { resolveThemeStyle } from './apply';
import { themeFontVariables } from './fonts';
import { getPreset } from './presets';

export function ThemeScope({
  themeCode,
  overrides,
  children,
}: {
  themeCode: string;
  /** stores.theme_overrides (ธีม prem-01/02 ให้ร้านแก้ token เองได้ — §4.6) */
  overrides?: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const preset = getPreset(themeCode);
  return (
    <div
      data-theme={preset.code}
      style={resolveThemeStyle(preset, overrides)}
      className={`${themeFontVariables} flex min-h-screen flex-col bg-bg font-body text-base text-text antialiased`}
    >
      {children}
    </div>
  );
}
