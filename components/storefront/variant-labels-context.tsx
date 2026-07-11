'use client';

// ป้ายชื่อมิติ variant ของร้าน (ไซส์/สี หรือคำที่ร้านตั้งเอง เช่น ช่วงวัย/แบบ)
// layout ฝั่ง server resolve จาก theme_overrides.__content แล้ว provide ครั้งเดียว —
// client component ทุกตัว (FilterBar/QuickView/VariantSelector/CatalogSidebar) อ่านผ่าน hook

import { createContext, useContext } from 'react';
import { DEFAULT_VARIANT_LABELS, type VariantLabels } from '@/lib/theme-content';

const VariantLabelsContext = createContext<Required<VariantLabels>>(DEFAULT_VARIANT_LABELS);

export function VariantLabelsProvider({
  labels,
  children,
}: {
  labels: Required<VariantLabels>;
  children: React.ReactNode;
}) {
  return <VariantLabelsContext.Provider value={labels}>{children}</VariantLabelsContext.Provider>;
}

export function useVariantLabels(): Required<VariantLabels> {
  return useContext(VariantLabelsContext);
}
