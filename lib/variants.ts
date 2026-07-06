// Variant matrix helpers (§2.3 — "กำหนดชุดไซส์ × ชุดสี → ระบบ generate variants ให้")

/** แปลง "S, M, L" → ["S","M","L"] — ตัดช่องว่าง, ทิ้งค่าว่าง, ตัดค่าซ้ำ */
export function parseDimensionList(input: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of input.split(',')) {
    const value = raw.trim();
    if (value && !seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

export interface VariantCombo {
  size: string | null;
  color: string | null;
}

/** cartesian product ของไซส์ × สี — มิติที่ไม่ระบุ (array ว่าง) แทนด้วย [null] */
export function buildVariantCombos(sizes: string[], colors: string[]): VariantCombo[] {
  const sizeOptions: (string | null)[] = sizes.length > 0 ? sizes : [null];
  const colorOptions: (string | null)[] = colors.length > 0 ? colors : [null];
  const combos: VariantCombo[] = [];
  for (const size of sizeOptions) {
    for (const color of colorOptions) {
      combos.push({ size, color });
    }
  }
  return combos;
}

export function variantLabel(size: string | null, color: string | null): string {
  return [size, color].filter(Boolean).join(' / ') || '-';
}
