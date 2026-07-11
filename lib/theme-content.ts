// เนื้อหา section ชุด Commerce Premium (hero/usp/banners/tools/featureBand/footer)
// เก็บใน stores.theme_overrides.__content (jsonb เดิม — resolveThemeStyle ไม่อ่าน key นี้
// เพราะกรองเฉพาะ THEME_TOKEN_NAMES) — ไม่ระบุ = ใช้ค่า default ภาษาไทยด้านล่าง

export interface HeroContent {
  eyebrow: string;
  headline: string;
  sub: string;
  ctaText: string;
  ctaHref: string;
  /** ปุ่มรอง (ref T4: ปุ่มขาว + ปุ่มลิงก์) */
  cta2Text?: string;
  cta2Href?: string;
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

/** ช่องทางแชทของร้าน (ref T1 — ร้านที่ปิดการขายผ่าน LINE/Facebook) */
export interface ContactChannels {
  lineUrl?: string;
  /** ป้ายที่โชว์ เช่น "@simplewear" */
  lineLabel?: string;
  facebookUrl?: string;
  facebookLabel?: string;
}

/** ลิงก์โซเชียลของร้าน (ปุ่มวงกลมใน footer) — แก้ได้จากหน้าตั้งค่าร้าน */
export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  line?: string;
  tiktok?: string;
  youtube?: string;
}

export const SOCIAL_KEYS = ['facebook', 'instagram', 'line', 'tiktok', 'youtube'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];

/** ป้ายชื่อมิติตัวเลือกสินค้า (variant) — ค่ายังเก็บในคอลัมน์ size/color เดิมเสมอ
 *  เปลี่ยนเฉพาะป้ายที่โชว์ ให้ร้านนอกกลุ่มแฟชั่น (ของเล่น/แม่และเด็ก) ใช้คำของตัวเองได้
 *  เช่น ช่วงวัย/แบบ — แก้จากหน้าตั้งค่าร้าน, ว่าง = ไซส์/สี */
export interface VariantLabels {
  size?: string;
  color?: string;
}

export const DEFAULT_VARIANT_LABELS: Readonly<Required<VariantLabels>> = {
  size: 'ไซส์',
  color: 'สี',
};

/** ชุดป้ายสำเร็จรูปตามกลุ่มสินค้า (ปุ่มลัดในหน้าตั้งค่า — กรอกเองได้เสมอ) */
export const VARIANT_LABEL_PRESETS: { name: string; size: string; color: string }[] = [
  { name: 'เสื้อผ้า / แฟชั่น', size: 'ไซส์', color: 'สี' },
  { name: 'ของเล่นเด็ก', size: 'ช่วงวัย', color: 'แบบ' },
  { name: 'ของใช้แม่และเด็ก', size: 'ขนาด', color: 'แบบ' },
  { name: 'รองเท้า / กระเป๋า', size: 'ไซส์', color: 'สี' },
];

export function resolveVariantLabels(content: ThemeContent): Required<VariantLabels> {
  return {
    size: content.variantLabels?.size?.trim() || DEFAULT_VARIANT_LABELS.size,
    color: content.variantLabels?.color?.trim() || DEFAULT_VARIANT_LABELS.color,
  };
}

export interface FeatureListItem {
  title: string;
  sub: string;
}

/* --- ชุด T3 "HUB" (TEMPLATE_SPEC §3.3 — marketplace) --- */

/** วงกลมหมวดในแถวเลื่อนแนวนอน — href ชี้ /products?category=... หรือฟิลเตอร์อื่น */
export interface CategoryCircle {
  label: string;
  imageUrl: string;
  href: string;
}

/** แถบสมาชิกใต้ header — ระบบสมาชิกจริงเป็น Future จึงเป็นเนื้อหาโชว์ของธีม */
export interface MemberBarContent {
  /** เช่น "สมาชิก Silver" */
  title: string;
  /** เช่น ["คูปองของฉัน 3 ใบ", "คะแนนสะสม 1,250"] */
  items: string[];
}

export interface MemberBenefit {
  icon: 'tag' | 'truck' | 'card';
  title: string;
  sub: string;
}

/** การ์ดบทความ/Lookbook — href ชี้หน้าเพจจริง (/p/slug) */
export interface ArticleCard {
  title: string;
  imageUrl: string;
  /** วันที่แบบข้อความไทย เช่น "5 ก.ค. 2569" */
  date: string;
  href: string;
  tag?: string;
}

/* --- ชุด T4 "LUXÉ" (TEMPLATE_SPEC §3.4) --- */

/** ครึ่ง Lookbook ของ split section — ภาพเต็ม + ข้อความทับ */
export interface LookbookContent {
  imageUrl: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  ctaText?: string;
  ctaHref?: string;
}

/** ครึ่ง Brand Story — พื้น ink ตัวขาว + ลิงก์อ่านต่อ */
export interface BrandStoryContent {
  eyebrow?: string;
  title: string;
  body: string;
  ctaText?: string;
  ctaHref?: string;
}

export interface HighlightItem {
  icon: 'star' | 'shield' | 'package' | 'headset' | 'truck' | 'tag';
  title: string;
  sub: string;
}

/** แถว Size Guide / โค้ดลูกค้าใหม่ / newsletter (ref T4) */
export interface LuxePerksContent {
  sizeGuideTitle?: string;
  sizeGuideSub?: string;
  sizeGuideHref?: string;
  welcomeTitle?: string;
  /** โค้ดจริงในตาราง discount_codes — ลูกค้ากรอกตอน checkout ได้เลย */
  welcomeCode?: string;
  welcomeSub?: string;
  newsletterTitle?: string;
  newsletterSub?: string;
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
  /* --- ชุด T1 "SIMPLE" --- */
  /** ข้อความเล็กใต้โลโก้ เช่น "BASIC STYLE FOR EVERYDAY" */
  tagline?: string;
  contact?: ContactChannels;
  /** ลิงก์โซเชียล (footer ทุกธีม) — เขียนจากหน้าตั้งค่าร้าน */
  socials?: SocialLinks;
  /** ป้ายชื่อมิติ variant (ทุกธีม) — เขียนจากหน้าตั้งค่าร้าน */
  variantLabels?: VariantLabels;
  featureListTitle?: string;
  featureList?: FeatureListItem[];
  /** หมายเหตุใต้ featureList เช่น "ไม่มีระบบตะกร้า" */
  featureListNote?: string;
  /** ส่วนท้าย note ที่เน้นแดง เช่น "ไม่มีการชำระเงินออนไลน์" */
  featureListNoteHighlight?: string;
  /** แถบเตือนใต้ header (โหมดเว็บแนะนำสินค้า — สั่งซื้อไม่ได้) */
  disclaimer?: { text: string; highlight?: string };
  /* --- ชุด T3 "HUB" --- */
  /** สไลด์ hero carousel (ref T3) — ใช้เมื่อ variant hero = 'carousel' */
  heroSlides?: Partial<HeroContent>[];
  categoryCircles?: CategoryCircle[];
  memberBar?: MemberBarContent;
  memberBenefits?: MemberBenefit[];
  articlesTitle?: string;
  articles?: ArticleCard[];
  serviceBandTitle?: string;
  /* --- ชุด T4 "LUXÉ" --- */
  lookbook?: LookbookContent;
  brandStory?: BrandStoryContent;
  highlights?: HighlightItem[];
  perks?: LuxePerksContent;
  /** ข้อความความเชื่อมั่นในแถบ payment เช่น "ลูกค้าไว้วางใจกว่า 50,000+ คน" */
  trustText?: string;
  /** หัวแถบ "ทำไมต้องเลือก" ใน footer ดำ */
  whyUsTitle?: string;
}

export const DEFAULT_USP: UspItem[] = [
  { icon: 'truck', title: 'ส่งฟรีทั่วไทย', sub: 'เมื่อช้อปครบตามเงื่อนไข' },
  { icon: 'clock', title: 'เปลี่ยน/คืนสินค้าได้', sub: 'ภายใน 14 วัน' },
  { icon: 'lock', title: 'ชำระเงินปลอดภัย', sub: 'PromptPay ตรวจสอบทุกรายการ' },
  { icon: 'headset', title: 'บริการลูกค้า', sub: 'ทุกวัน 09.00 - 18.00 น.' },
];

export const DEFAULT_FEATURE_BAND_TITLE = 'ครบทุกฟังก์ชัน เพื่อการช้อปปิ้งที่ง่ายขึ้น';

export const DEFAULT_FEATURE_LIST_TITLE = 'เว็บไซต์นี้มีฟีเจอร์พื้นฐาน';

export const DEFAULT_FEATURE_LIST: FeatureListItem[] = [
  { title: 'หน้าแรก', sub: 'แสดงสินค้าแนะนำและข้อมูลแบรนด์เบื้องต้น' },
  { title: 'หน้ารวมสินค้า', sub: 'รวมสินค้าทั้งหมด แยกหมวดหมู่' },
  { title: 'หน้ารายละเอียดสินค้า', sub: 'ดูรายละเอียดสินค้า ภาพ และข้อมูลครบถ้วน' },
  { title: 'ปุ่มติดต่อสั่งซื้อ', sub: 'ติดต่อสั่งซื้อผ่าน LINE หรือ Facebook' },
];

/** อ่าน __content จาก theme_overrides แบบปลอดภัย (jsonb — เชื่อไม่ได้ 100%) */
export function getThemeContent(overrides: Record<string, unknown> | null | undefined): ThemeContent {
  const raw = overrides?.['__content'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as ThemeContent;
}
