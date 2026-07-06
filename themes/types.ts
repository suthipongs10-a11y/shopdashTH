// Types ของระบบธีม (CLAUDE.md §4)

export const THEME_TOKEN_NAMES = [
  '--color-primary',
  '--color-primary-fg',
  '--color-secondary',
  '--color-bg',
  '--color-surface',
  '--color-text',
  '--color-text-muted',
  '--color-accent',
  '--color-danger',
  '--color-success',
  '--font-heading',
  '--font-body',
  '--text-scale',
  '--radius-sm',
  '--radius-md',
  '--radius-lg',
  '--space-unit',
  '--shadow-card',
  '--container-max',
] as const;

export type ThemeTokenName = (typeof THEME_TOKEN_NAMES)[number];
export type ThemeTokens = Record<ThemeTokenName, string>;

/** ฟอนต์ที่อนุญาต (§4.2) — โหลดผ่าน next/font ใน themes/fonts.ts */
export type ThemeFontName =
  | 'Prompt'
  | 'Sarabun'
  | 'Kanit'
  | 'Noto Sans Thai'
  | 'Mitr'
  | 'Bai Jamjuree'
  | 'IBM Plex Sans Thai';

export type ProductCardVariant = 'minimal' | 'bordered' | 'overlay';
export type HeroVariant = 'full-bleed' | 'boxed' | 'split';
export type CategoryNavVariant = 'topbar' | 'pills' | 'sidebar';

export type ThemeSection =
  | 'announcement'
  | 'hero'
  | 'featured'
  | 'categories'
  | 'grid'
  | 'footer';

/** ฟีเจอร์หน้าร้านที่ธีมเปิด/ปิดได้ (merge ใน resolveFeatures() §3.7) */
export interface ThemeFeatureDefaults {
  wishlist?: boolean;
  related_products?: boolean;
}

export interface ThemeVariants {
  productCard: ProductCardVariant;
  hero: HeroVariant;
  categoryNav: CategoryNavVariant;
}

export interface ThemePreset {
  code: string;
  tier: 1 | 2 | 3;
  tokens: ThemeTokens;
  variants: ThemeVariants;
  featureDefaults: ThemeFeatureDefaults;
  /** ลำดับ section ของหน้าแรก storefront */
  sections: ThemeSection[];
}
