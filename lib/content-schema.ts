// Schema เนื้อหาเทมเพลตที่ร้านแก้เองได้จาก /admin/content ("เนื้อหาเว็บ")
// หลักการเดียวกับระบบธีม (§4.1): ไม่มีฟอร์มเฉพาะธีม — มี schema กลางชุดเดียว
// ฟอร์ม generate อัตโนมัติ และแต่ละกลุ่มโชว์เฉพาะเมื่อธีมปัจจุบันใช้ section นั้นจริง
// ค่าเก็บใน stores.theme_overrides.__content (ดู lib/theme-content.ts) — ว่าง = ใช้ default ของธีม

import type { ThemePreset } from '@/themes/types';

export type ContentFieldType =
  | 'text'
  | 'textarea'
  /** URL รูป — อัปโหลดผ่าน R2 (kind: content_image) หรือใช้รูปเดิม */
  | 'image'
  /** เลือกไอคอนจากชุดที่ section รองรับ */
  | 'icon'
  /** textarea ที่แปลงเป็น string[] (หนึ่งบรรทัด = หนึ่งรายการ) */
  | 'lines'
  /** ลิงก์ภายใน (/products) หรือ URL เต็ม */
  | 'href';

export interface ContentIconOption {
  value: string;
  label: string;
}

export interface ContentFieldDef {
  key: string;
  label: string;
  type: ContentFieldType;
  placeholder?: string;
  help?: string;
  iconOptions?: ContentIconOption[];
  /** ใน list: รายการที่ไม่กรอกช่องนี้จะถูกตัดทิ้งตอนบันทึก */
  required?: boolean;
}

export interface ContentGroupDef {
  id: string;
  title: string;
  description?: string;
  /** object = ก้อนเดียว (เช่น hero) / list = หลายรายการ (เช่น สไลด์) /
   *  strings = ข้อความเดี่ยวหลาย key ที่ระดับบนสุดของ __content */
  kind: 'object' | 'list' | 'strings';
  /** key ใน ThemeContent (object/list เท่านั้น) */
  contentKey?: string;
  fields: ContentFieldDef[];
  maxItems?: number;
  /** คำเรียกรายการ เช่น "สไลด์" (list เท่านั้น) */
  itemNoun?: string;
  appliesTo: (preset: ThemePreset) => boolean;
}

/** ส่วนที่ส่งให้ client component ได้ (ตัดฟังก์ชัน appliesTo ออก) */
export type ContentGroupClient = Omit<ContentGroupDef, 'appliesTo'>;
export function toClientGroup(group: ContentGroupDef): ContentGroupClient {
  const { appliesTo: _appliesTo, ...rest } = group;
  return rest;
}

// ---------- ชุดไอคอนต่อ section (ตรงกับ component ที่ render จริง) ----------

const USP_ICONS: ContentIconOption[] = [
  { value: 'truck', label: 'รถส่งของ (จัดส่ง)' },
  { value: 'clock', label: 'นาฬิกา (เวลา/เปลี่ยนคืน)' },
  { value: 'lock', label: 'กุญแจ (ปลอดภัย)' },
  { value: 'headset', label: 'เฮดเซ็ต (บริการลูกค้า)' },
];

const UTILITY_ICONS: ContentIconOption[] = [
  { value: 'truck', label: 'รถส่งของ' },
  { value: 'clock', label: 'นาฬิกา' },
];

const BENEFIT_ICONS: ContentIconOption[] = [
  { value: 'tag', label: 'ป้ายราคา (ส่วนลด)' },
  { value: 'truck', label: 'รถส่งของ (ส่งฟรี)' },
  { value: 'card', label: 'บัตร (การชำระเงิน)' },
];

const HIGHLIGHT_ICONS: ContentIconOption[] = [
  { value: 'star', label: 'ดาว' },
  { value: 'shield', label: 'โล่ (รับประกัน)' },
  { value: 'package', label: 'กล่องพัสดุ' },
  { value: 'headset', label: 'เฮดเซ็ต' },
  { value: 'truck', label: 'รถส่งของ' },
  { value: 'tag', label: 'ป้ายราคา' },
];

// ---------- กลุ่มเนื้อหาทั้งหมด ----------

export const CONTENT_GROUPS: ContentGroupDef[] = [
  // --- Hero (ธีมที่ hero อ่านจาก __content: T1 split-panel / T2 commerce / T4 luxe) ---
  {
    id: 'hero',
    title: 'แบนเนอร์ใหญ่หน้าแรก (Hero)',
    description:
      'หัวข้อ/ข้อความ/ปุ่ม/รูปของแบนเนอร์แรกสุด — เว้นว่าง = ใช้ชื่อร้านและรูปแบนเนอร์จากตั้งค่าร้าน',
    kind: 'object',
    contentKey: 'hero',
    appliesTo: (p) => ['commerce', 'split-panel', 'luxe'].includes(p.variants.hero),
    fields: [
      { key: 'eyebrow', label: 'ข้อความเล็กเหนือหัวข้อ', type: 'text', placeholder: 'NEW COLLECTION' },
      { key: 'headline', label: 'หัวข้อใหญ่', type: 'text', placeholder: 'เช่น SUMMER 2026' },
      { key: 'sub', label: 'ข้อความรอง', type: 'textarea' },
      { key: 'ctaText', label: 'ข้อความปุ่มหลัก', type: 'text', placeholder: 'ช้อปเลย' },
      { key: 'ctaHref', label: 'ลิงก์ปุ่มหลัก', type: 'href', placeholder: '/products' },
      {
        key: 'cta2Text',
        label: 'ข้อความปุ่มที่สอง',
        type: 'text',
        help: 'เฉพาะธีมที่มีปุ่มรอง (เช่น ลุกซ์) — ธีมอื่นไม่แสดง',
      },
      { key: 'cta2Href', label: 'ลิงก์ปุ่มที่สอง', type: 'href' },
      { key: 'imageUrl', label: 'รูปแบนเนอร์', type: 'image' },
    ],
  },
  // --- Hero carousel (T3) ---
  {
    id: 'heroSlides',
    title: 'สไลด์แบนเนอร์หน้าแรก (Carousel)',
    description: 'สไลด์เลื่อนอัตโนมัติ — ต้องมีรูปทุกสไลด์ สไลด์ที่ไม่มีรูปจะไม่แสดง',
    kind: 'list',
    contentKey: 'heroSlides',
    maxItems: 5,
    itemNoun: 'สไลด์',
    appliesTo: (p) => p.variants.hero === 'carousel',
    fields: [
      { key: 'imageUrl', label: 'รูปสไลด์', type: 'image', required: true },
      { key: 'eyebrow', label: 'ข้อความเล็กเหนือหัวข้อ', type: 'text' },
      { key: 'headline', label: 'หัวข้อใหญ่', type: 'text' },
      { key: 'sub', label: 'ข้อความรอง', type: 'textarea' },
      { key: 'ctaText', label: 'ข้อความปุ่ม', type: 'text' },
      { key: 'ctaHref', label: 'ลิงก์ปุ่ม', type: 'href', placeholder: '/products' },
    ],
  },
  // --- แถบ USP (T2/T3/T4) ---
  {
    id: 'usp',
    title: 'แถบจุดเด่นร้าน (USP)',
    description: 'แถวไอคอน 4 ช่องใต้แบนเนอร์ เช่น ส่งฟรี / เปลี่ยนคืนได้ / จ่ายปลอดภัย',
    kind: 'list',
    contentKey: 'usp',
    maxItems: 4,
    itemNoun: 'จุดเด่น',
    appliesTo: (p) => p.sections.includes('usp'),
    fields: [
      { key: 'icon', label: 'ไอคอน', type: 'icon', iconOptions: USP_ICONS },
      { key: 'title', label: 'หัวข้อ', type: 'text', required: true },
      { key: 'sub', label: 'คำอธิบายสั้น', type: 'text' },
    ],
  },
  // --- แถบ utility ดำบนสุด (T2/T3) ---
  {
    id: 'utility',
    title: 'แถบข้อความบนสุด (Utility bar)',
    description: 'แถบเล็กเหนือ header — เว้นว่าง = แสดงเงื่อนไขส่งฟรีจากตั้งค่าร้านอัตโนมัติ',
    kind: 'list',
    contentKey: 'utility',
    maxItems: 2,
    itemNoun: 'ข้อความ',
    appliesTo: (p) => Boolean(p.layout?.utilityBar),
    fields: [
      { key: 'icon', label: 'ไอคอน', type: 'icon', iconOptions: UTILITY_ICONS },
      { key: 'text', label: 'ข้อความ', type: 'text', required: true },
    ],
  },
  // --- แบนเนอร์หมวด 3 ใบ (T2) ---
  {
    id: 'categoryBanners',
    title: 'แบนเนอร์หมวดสินค้า',
    description: 'การ์ดรูปใหญ่ชวนเข้าหมวด — ลิงก์มักชี้ /products?category=<id>',
    kind: 'list',
    contentKey: 'categoryBanners',
    maxItems: 4,
    itemNoun: 'แบนเนอร์',
    appliesTo: (p) => p.sections.includes('categoryBanners'),
    fields: [
      { key: 'imageUrl', label: 'รูปแบนเนอร์', type: 'image', required: true },
      { key: 'title', label: 'ชื่อหมวด', type: 'text', required: true },
      { key: 'sub', label: 'คำอธิบายสั้น', type: 'text' },
      { key: 'href', label: 'ลิงก์', type: 'href', placeholder: '/products' },
    ],
  },
  // --- T2: หัวแถบ "ครบทุกฟังก์ชัน" ---
  {
    id: 'featureBandTitle',
    title: 'หัวข้อแถบฟังก์ชันร้าน',
    kind: 'strings',
    appliesTo: (p) => p.sections.includes('featureBand'),
    fields: [
      {
        key: 'featureBandTitle',
        label: 'หัวข้อ',
        type: 'text',
        placeholder: 'ครบทุกฟังก์ชัน เพื่อการช้อปปิ้งที่ง่ายขึ้น',
      },
    ],
  },
  // --- T1: tagline + ช่องทางแชท + disclaimer ---
  {
    id: 'brandText',
    title: 'ข้อความแบรนด์ใต้โลโก้ (Tagline)',
    kind: 'strings',
    appliesTo: (p) => Boolean(p.layout?.headerContactButtons),
    fields: [
      { key: 'tagline', label: 'Tagline', type: 'text', placeholder: 'BASIC STYLE FOR EVERYDAY' },
    ],
  },
  {
    id: 'contact',
    title: 'ช่องทางแชทสั่งซื้อ (LINE / Facebook)',
    description: 'ใช้กับปุ่มใน header และแถบติดต่อบนหน้าแรก — เว้นช่องไหน = ไม่แสดงช่องนั้น',
    kind: 'object',
    contentKey: 'contact',
    appliesTo: (p) => Boolean(p.layout?.headerContactButtons) || p.sections.includes('contactCta'),
    fields: [
      { key: 'lineUrl', label: 'ลิงก์ LINE', type: 'href', placeholder: 'https://line.me/R/ti/p/@ไอดีร้าน' },
      { key: 'lineLabel', label: 'ป้าย LINE ที่โชว์', type: 'text', placeholder: '@ไอดีร้าน' },
      { key: 'facebookUrl', label: 'ลิงก์ Facebook', type: 'href', placeholder: 'https://facebook.com/ชื่อเพจ' },
      { key: 'facebookLabel', label: 'ป้าย Facebook ที่โชว์', type: 'text' },
    ],
  },
  {
    id: 'disclaimer',
    title: 'แถบแจ้งลูกค้า (โหมดเว็บแนะนำสินค้า)',
    description: 'แสดงเฉพาะร้านที่ปิดระบบสั่งซื้อออนไลน์ — แจ้งลูกค้าว่าสั่งซื้อผ่านแชท',
    kind: 'object',
    contentKey: 'disclaimer',
    appliesTo: (p) => Boolean(p.layout?.headerContactButtons),
    fields: [
      { key: 'text', label: 'ข้อความ', type: 'text', placeholder: 'เว็บไซต์นี้เป็นเพียงเว็บไซต์แนะนำสินค้า' },
      { key: 'highlight', label: 'ข้อความเน้นแดง', type: 'text', placeholder: 'ไม่สามารถสั่งซื้อและชำระเงินได้' },
    ],
  },
  // --- T1: รายการฟีเจอร์ของเว็บ ---
  {
    id: 'featureList',
    title: 'แถบรายการฟีเจอร์ของเว็บ',
    kind: 'list',
    contentKey: 'featureList',
    maxItems: 6,
    itemNoun: 'รายการ',
    appliesTo: (p) => p.sections.includes('featureList'),
    fields: [
      { key: 'title', label: 'หัวข้อ', type: 'text', required: true },
      { key: 'sub', label: 'คำอธิบาย', type: 'text' },
    ],
  },
  {
    id: 'featureListText',
    title: 'ข้อความประกอบแถบรายการฟีเจอร์',
    kind: 'strings',
    appliesTo: (p) => p.sections.includes('featureList'),
    fields: [
      { key: 'featureListTitle', label: 'หัวข้อแถบ', type: 'text', placeholder: 'เว็บไซต์นี้มีฟีเจอร์พื้นฐาน' },
      { key: 'featureListNote', label: 'หมายเหตุท้ายแถบ', type: 'text' },
      { key: 'featureListNoteHighlight', label: 'หมายเหตุเน้นแดง', type: 'text' },
    ],
  },
  // --- T3: วงกลมหมวด / แถบสมาชิก / บทความ / หัวแถบบริการ ---
  {
    id: 'categoryCircles',
    title: 'แถวหมวดวงกลม',
    description: 'วงกลมรูปสินค้าเลื่อนแนวนอนใต้แบนเนอร์',
    kind: 'list',
    contentKey: 'categoryCircles',
    maxItems: 10,
    itemNoun: 'วงกลม',
    appliesTo: (p) => p.sections.includes('categoryCircles'),
    fields: [
      { key: 'imageUrl', label: 'รูป', type: 'image', required: true },
      { key: 'label', label: 'ชื่อใต้วงกลม', type: 'text', required: true },
      { key: 'href', label: 'ลิงก์', type: 'href', placeholder: '/products?category=…' },
    ],
  },
  {
    id: 'memberBar',
    title: 'แถบสมาชิกใต้ header',
    description: 'เนื้อหาโชว์ของธีม (ระบบสมาชิกจริงยังไม่มี) — แก้ข้อความให้ตรงร้าน หรือลบให้ว่างเพื่อซ่อน',
    kind: 'object',
    contentKey: 'memberBar',
    appliesTo: (p) => Boolean(p.layout?.memberBar),
    fields: [
      { key: 'title', label: 'หัวข้อ', type: 'text', placeholder: 'สมาชิก Silver' },
      {
        key: 'items',
        label: 'รายการ (บรรทัดละ 1 รายการ)',
        type: 'lines',
        placeholder: 'คูปองของฉัน 3 ใบ\nคะแนนสะสม 1,250',
      },
    ],
  },
  {
    id: 'memberBenefits',
    title: 'แถบสิทธิ์สมาชิก 3 ช่อง',
    kind: 'list',
    contentKey: 'memberBenefits',
    maxItems: 3,
    itemNoun: 'สิทธิ์',
    appliesTo: (p) => p.sections.includes('memberBenefits'),
    fields: [
      { key: 'icon', label: 'ไอคอน', type: 'icon', iconOptions: BENEFIT_ICONS },
      { key: 'title', label: 'หัวข้อ', type: 'text', required: true },
      { key: 'sub', label: 'คำอธิบาย', type: 'text' },
    ],
  },
  {
    id: 'articles',
    title: 'การ์ดบทความ / Lookbook',
    description: 'ลิงก์มักชี้หน้าเพจของร้าน (/p/ชื่อเพจ) — สร้างเพจได้ที่เมนู "เพจ"',
    kind: 'list',
    contentKey: 'articles',
    maxItems: 6,
    itemNoun: 'บทความ',
    appliesTo: (p) => p.sections.includes('articles'),
    fields: [
      { key: 'imageUrl', label: 'รูปปก', type: 'image', required: true },
      { key: 'title', label: 'ชื่อบทความ', type: 'text', required: true },
      { key: 'date', label: 'วันที่ (ข้อความ)', type: 'text', placeholder: '5 ก.ค. 2569' },
      { key: 'href', label: 'ลิงก์', type: 'href', placeholder: '/p/ชื่อเพจ' },
      { key: 'tag', label: 'ป้ายกำกับ', type: 'text', placeholder: 'LOOKBOOK' },
    ],
  },
  {
    id: 'hubTitles',
    title: 'หัวข้อ section อื่นๆ',
    kind: 'strings',
    appliesTo: (p) => p.sections.includes('articles') || p.sections.includes('serviceBand'),
    fields: [
      { key: 'articlesTitle', label: 'หัวข้อแถบบทความ', type: 'text', placeholder: 'บทความแฟชั่น / Lookbook' },
      { key: 'serviceBandTitle', label: 'หัวข้อแถบระบบและบริการ', type: 'text', placeholder: 'ระบบและบริการของร้าน' },
    ],
  },
  // --- T4: Lookbook / Brand Story / ไฮไลต์ / perks / trust / footer ---
  {
    id: 'lookbook',
    title: 'Lookbook (ครึ่งซ้ายของ section คู่)',
    kind: 'object',
    contentKey: 'lookbook',
    appliesTo: (p) => p.sections.includes('lookbookSplit'),
    fields: [
      { key: 'imageUrl', label: 'รูปใหญ่', type: 'image' },
      { key: 'eyebrow', label: 'ข้อความเล็ก', type: 'text', placeholder: 'LOOKBOOK' },
      { key: 'title', label: 'หัวข้อ', type: 'text' },
      { key: 'sub', label: 'ข้อความรอง', type: 'textarea' },
      { key: 'ctaText', label: 'ข้อความปุ่ม', type: 'text' },
      { key: 'ctaHref', label: 'ลิงก์ปุ่ม', type: 'href' },
    ],
  },
  {
    id: 'brandStory',
    title: 'Brand Story (ครึ่งขวาพื้นเข้ม)',
    kind: 'object',
    contentKey: 'brandStory',
    appliesTo: (p) => p.sections.includes('lookbookSplit'),
    fields: [
      { key: 'eyebrow', label: 'ข้อความเล็ก', type: 'text', placeholder: 'OUR STORY' },
      { key: 'title', label: 'หัวข้อ', type: 'text' },
      { key: 'body', label: 'เนื้อเรื่อง', type: 'textarea' },
      { key: 'ctaText', label: 'ข้อความปุ่ม', type: 'text' },
      { key: 'ctaHref', label: 'ลิงก์ปุ่ม', type: 'href', placeholder: '/p/about' },
    ],
  },
  {
    id: 'highlights',
    title: 'แถบไฮไลต์ 4 ไอคอน',
    kind: 'list',
    contentKey: 'highlights',
    maxItems: 4,
    itemNoun: 'ไฮไลต์',
    appliesTo: (p) => p.sections.includes('highlights'),
    fields: [
      { key: 'icon', label: 'ไอคอน', type: 'icon', iconOptions: HIGHLIGHT_ICONS },
      { key: 'title', label: 'หัวข้อ', type: 'text', required: true },
      { key: 'sub', label: 'คำอธิบาย', type: 'text' },
    ],
  },
  {
    id: 'perks',
    title: 'แถว Size Guide / โค้ดลูกค้าใหม่ / Newsletter',
    description: 'โค้ดส่วนลดต้องมีอยู่จริงในเมนู "โค้ดส่วนลด" ลูกค้าจึงใช้ได้',
    kind: 'object',
    contentKey: 'perks',
    appliesTo: (p) => p.sections.includes('luxePerks'),
    fields: [
      { key: 'sizeGuideTitle', label: 'หัวข้อช่องซ้าย', type: 'text', placeholder: 'Size Guide' },
      { key: 'sizeGuideSub', label: 'คำอธิบายช่องซ้าย', type: 'text' },
      { key: 'sizeGuideHref', label: 'ลิงก์ช่องซ้าย', type: 'href', placeholder: '/p/size-guide' },
      { key: 'welcomeTitle', label: 'หัวข้อช่องกลาง', type: 'text', placeholder: 'ลูกค้าใหม่รับส่วนลด 10%' },
      { key: 'welcomeCode', label: 'โค้ดส่วนลด', type: 'text', placeholder: 'WELCOME10' },
      { key: 'welcomeSub', label: 'เงื่อนไขช่องกลาง', type: 'text' },
      { key: 'newsletterTitle', label: 'หัวข้อช่องขวา', type: 'text', placeholder: 'Newsletter' },
      { key: 'newsletterSub', label: 'คำอธิบายช่องขวา', type: 'text' },
    ],
  },
  {
    id: 'trustFooter',
    title: 'ข้อความความเชื่อมั่น + หัวข้อ footer',
    kind: 'strings',
    appliesTo: (p) => p.sections.includes('trustBar') || p.layout?.footerVariant === 'dark',
    fields: [
      { key: 'trustText', label: 'ข้อความแถบความเชื่อมั่น', type: 'text', placeholder: 'ลูกค้าไว้วางใจกว่า 50,000+ คน' },
      { key: 'whyUsTitle', label: 'หัวข้อ "ทำไมต้องเลือก" ใน footer', type: 'text', placeholder: 'ทำไมต้องเลือก <ชื่อร้าน>' },
    ],
  },
  // --- footer แบบ full (T2/T3): ข้อความ newsletter ---
  {
    id: 'footerText',
    title: 'ข้อความ Newsletter ใน footer',
    kind: 'strings',
    appliesTo: (p) => p.layout?.footerVariant === 'full',
    fields: [
      {
        key: 'newsletterText',
        label: 'ข้อความ',
        type: 'text',
        placeholder: 'รับสิทธิพิเศษและโปรโมชั่นก่อนใครทางอีเมล',
      },
    ],
  },
];

export function groupsForPreset(preset: ThemePreset): ContentGroupDef[] {
  return CONTENT_GROUPS.filter((g) => g.appliesTo(preset));
}

export function getContentGroup(id: string): ContentGroupDef | undefined {
  return CONTENT_GROUPS.find((g) => g.id === id);
}
