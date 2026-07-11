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

export type ProductCardVariant = 'minimal' | 'bordered' | 'overlay' | 'store' | 'simple' | 'hub';
export type HeroVariant = 'full-bleed' | 'boxed' | 'split' | 'commerce' | 'split-panel' | 'carousel';
export type CategoryNavVariant = 'topbar' | 'pills' | 'sidebar';

export type ThemeSection =
  | 'announcement'
  | 'hero'
  | 'featured'
  | 'categories'
  | 'grid'
  /** แคตตาล็อกเต็มบนหน้าแรก (ธีม one-page — แพลนเริ่มต้น) */
  | 'catalog'
  /** การ์ดติดต่อร้าน (ที่อยู่/โทร) บนหน้าแรก (ธีม one-page) */
  | 'contact'
  /* --- ชุด Commerce Premium (TEMPLATE_SPEC — ธีม t2-store ขึ้นไป) --- */
  /** แถบ USP 4 ไอคอน (ส่งฟรี/คืนได้/จ่ายปลอดภัย/บริการลูกค้า) */
  | 'usp'
  /** แบนเนอร์หมวด 3 ใบ (รูป + ชื่อหมวด + ปุ่ม) */
  | 'categoryBanners'
  /** แถวเครื่องมือ 3 กล่อง (ติดตามคำสั่งซื้อ / สถานะล่าสุด / วิธีชำระเงิน) */
  | 'tools'
  /** แถบ "ครบทุกฟังก์ชัน" 5 ไอคอนพื้นครีม */
  | 'featureBand'
  /* --- ชุด T1 "SIMPLE" (TEMPLATE_SPEC §3.1) --- */
  /** แถบ CTA คู่ LINE/Facebook พื้นเขียวอ่อน */
  | 'contactCta'
  /** แถบครีม "ฟีเจอร์ของเว็บ" รายการมีเลขข้อ + หมายเหตุ */
  | 'featureList'
  /* --- ชุด T3 "HUB" (TEMPLATE_SPEC §3.3 — marketplace) --- */
  /** แถวหมวดวงกลมรูปสินค้า 9–10 วง เลื่อนแนวนอนได้ */
  | 'categoryCircles'
  /** บล็อกแคตตาล็อกหน้าแรก: sidebar ฟิลเตอร์ + grid 5 คอลัมน์ (ฟิลเตอร์พาไป /products) */
  | 'homeCatalog'
  /** แถบสิทธิ์สมาชิก 3 ช่อง (ส่วนลด/ส่งฟรี/ผ่อน 0%) */
  | 'memberBenefits'
  /** แถวสินค้าแนะนำเลื่อนแนวนอน */
  | 'featuredScroller'
  /** การ์ดบทความ/Lookbook 3 ใบมีวันที่ */
  | 'articles'
  /** แถบ "ระบบและบริการ" 8 ไอคอน */
  | 'serviceBand'
  | 'footer';

/** โครง layout ระดับธีม (header/footer) — ค่า default = พฤติกรรมเดิมของทุกธีม */
export interface ThemeLayout {
  /** แถบ utility ดำบนสุด (ของ ref T2) แทนแถบส่งฟรีแบบเดิม */
  utilityBar?: boolean;
  /** ช่องค้นหาจริงใน header (แทนไอคอนแว่นขยาย) */
  headerSearch?: boolean;
  /** footer แบบเต็ม: newsletter + คอลัมน์ลิงก์ + social (ref T2) */
  footerVariant?: 'simple' | 'full';
  /** ปุ่ม LINE/Facebook ใน header (ref T1 — ร้านที่ขายผ่านแชท) */
  headerContactButtons?: boolean;
  /** แถบสมาชิกใต้ header (ref T3 — สมาชิก Silver / คูปอง / คะแนน) */
  memberBar?: boolean;
  /** หน้า /products แบบ 2 คอลัมน์: sidebar ฟิลเตอร์ + grid 5 คอลัมน์ (ref T3) */
  catalogSidebar?: boolean;
  /** แถวโลโก้ช่องทางชำระเงินใน footer แบบ full (ref T3) */
  footerPayments?: boolean;
}

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
  nameTh: string;
  tier: 1 | 2 | 3;
  tokens: ThemeTokens;
  variants: ThemeVariants;
  featureDefaults: ThemeFeatureDefaults;
  /** ลำดับ section ของหน้าแรก storefront */
  sections: ThemeSection[];
  /** ธีม 9–10 (§4.6): ร้านแก้ token หลักเองได้จากหน้า "ปรับแต่งธีม" */
  customizable?: boolean;
  /** โครง header/footer — ไม่ระบุ = พฤติกรรมเดิม */
  layout?: ThemeLayout;
}
