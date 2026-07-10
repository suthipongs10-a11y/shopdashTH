// เนื้อหา section ชุด Commerce Premium (hero/usp/banners/tools/featureBand/footer)
// เก็บใน stores.theme_overrides.__content (jsonb เดิม — resolveThemeStyle ไม่อ่าน key นี้
// เพราะกรองเฉพาะ THEME_TOKEN_NAMES) — ไม่ระบุ = ใช้ค่า default ภาษาไทยด้านล่าง

export interface HeroContent {
  eyebrow: string;
  headline: string;
  sub: string;
  ctaText: string;
  ctaHref: string;
  /** URL รูป (จาก R2 หรือ path static เช่น /demo/t2/hero-01.jpg) */
  imageUrl?: string;
}

export interface UspItem {
  icon: 'truck' | 'clock' | 'lock' | 'headset';
  title: string;
  sub: string;
}

export interface CategoryBanner {
  title: string;
  sub: string;
  imageUrl: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: { label: string; href: string }[];
}

export interface ThemeContent {
  hero?: Partial<HeroContent>;
  usp?: UspItem[];
  categoryBanners?: CategoryBanner[];
  /** แถบ utility ดำบนสุด — ข้อความซ้าย 2 รายการ */
  utility?: { icon: 'truck' | 'clock'; text: string }[];
  featureBandTitle?: string;
  footerLinkGroups?: FooterLinkGroup[];
  newsletterText?: string;
}

export const DEFAULT_USP: UspItem[] = [
  { icon: 'truck', title: 'ส่งฟรีทั่วไทย', sub: 'เมื่อช้อปครบตามเงื่อนไข' },
  { icon: 'clock', title: 'เปลี่ยน/คืนสินค้าได้', sub: 'ภายใน 14 วัน' },
  { icon: 'lock', title: 'ชำระเงินปลอดภัย', sub: 'PromptPay ตรวจสอบทุกรายการ' },
  { icon: 'headset', title: 'บริการลูกค้า', sub: 'ทุกวัน 09.00 - 18.00 น.' },
];

export const DEFAULT_FEATURE_BAND_TITLE = 'ครบทุกฟังก์ชัน เพื่อการช้อปปิ้งที่ง่ายขึ้น';

/** อ่าน __content จาก theme_overrides แบบปลอดภัย (jsonb — เชื่อไม่ได้ 100%) */
export function getThemeContent(overrides: Record<string, unknown> | null | undefined): ThemeContent {
  const raw = overrides?.['__content'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as ThemeContent;
}
