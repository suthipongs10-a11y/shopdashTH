export type TemplateId =
  | 'listicle'
  | 'problem-solution'
  | 'deal'
  | 'trust'
  | 'haul'
  | 'before-after'
  | 'proof-test'
  | 'beat-sync'
  | 'seller-pov';

export type Platform = 'tiktok' | 'shopee';

export type AudioMix = 'voice-only' | 'voice+music' | 'music-only';

export type CaptionStyle = 'static-line' | 'dynamic';

/** หลักฐานคลิปจริงจากงานวิจัย — โชว์ในตัวเลือกเทมเพลตเพื่อให้ผู้ใช้เชื่อมั่น */
export interface Evidence {
  handle: string;
  note: string;
  views: string;
  outlier: string;
}

/**
 * เทมเพลตคือ "ข้อมูล" ไม่ใช่โค้ด — เพิ่ม/แก้สูตรใหม่ได้โดยไม่ต้องแตะ engine
 * ทุกค่าถอดมาจาก research/tiktok-shopee-video/README.md
 */
export interface FormatTemplate {
  id: TemplateId;
  rank: number;
  nameTh: string;
  taglineTh: string;
  /** ช่วงความยาวที่ชนะจริงในข้อมูล (วินาที) */
  durationSec: [number, number];
  /** ความยาวเริ่มต้นที่ใช้ generate */
  targetSec: number;
  audio: AudioMix;
  captionStyle: CaptionStyle;
  /** จำนวนซีนที่เหมาะสม */
  sceneCount: [number, number];
  loop: boolean;
  /** หมวดสินค้าที่เข้ากัน */
  bestFor: string[];
  platforms: Platform[];
  evidence: Evidence[];
  /** ข้อจำกัดที่ต้องเตือนผู้ใช้ */
  warningTh?: string;
  /** บรีฟที่ป้อนให้โมเดลตอนเขียนสคริปต์ */
  brief: {
    structure: string;
    hookRule: string;
    rules: string[];
  };
  visual: {
    kenBurns: 'in' | 'out' | 'alternate' | 'none';
    cutEverySec: number;
    /** แสดง headline ค้างทั้งคลิป (สูตร listicle) */
    titleCard: boolean;
    /** ตัดภาพตามจังหวะ ไม่มีเสียงพูด */
    beatSync?: boolean;
  };
}

export interface ProductInput {
  name: string;
  price: string;
  sellingPoints: string[];
  category: string;
  url: string;
  audience: string;
}

export interface Scene {
  /** สิ่งที่เสียงพากย์พูด */
  vo: string;
  /** ข้อความที่ขึ้นบนจอ (สั้นกว่า vo เสมอ) */
  caption: string;
  durationSec: number;
}

export interface GeneratedScript {
  /** ข้อความ overlay ที่ค้างทั้งคลิป */
  headline: string;
  /** 5 เวอร์ชันของ 3 วินาทีแรก */
  hooks: string[];
  scenes: Scene[];
  cta: string;
  hashtags: string[];
}

/** เสียงพากย์ 1 บรรทัด (hook / ซีน / CTA) พร้อมความยาวจริงที่ได้จาก Gemini TTS */
export interface VoiceSegment {
  /** 'hook' | 'scene-0' | 'cta' */
  key: string;
  text: string;
  /** object URL ของไฟล์ wav */
  url: string;
  durationSec: number;
}

/** ซีนที่คำนวณเวลาเริ่ม-จบแล้ว พร้อมจับคู่กับรูป */
export interface TimelineShot {
  startSec: number;
  endSec: number;
  caption: string;
  assetIndex: number;
  kind: 'hook' | 'body' | 'cta';
}

export interface Timeline {
  shots: TimelineShot[];
  totalSec: number;
}

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  /** เว้นพื้นที่ให้ UI ของแพลตฟอร์ม (สัดส่วนของความสูง/ความกว้าง) */
  safeBottom: number;
  safeRight: number;
  safeTop: number;
  headline: string;
  showSafeGuides: boolean;
  theme: ClipTheme;
}

export interface ClipTheme {
  bg: string;
  captionBg: string;
  captionFg: string;
  headlineBg: string;
  headlineFg: string;
  accent: string;
  fontFamily: string;
}

export const DEFAULT_THEME: ClipTheme = {
  bg: '#0B0D11',
  captionBg: 'rgba(0,0,0,0.62)',
  captionFg: '#FFFFFF',
  headlineBg: '#F5C518',
  headlineFg: '#14171F',
  accent: '#F5C518',
  fontFamily:
    '"IBM Plex Sans Thai","Noto Sans Thai","Sarabun","Leelawadee UI","Loma",system-ui,sans-serif',
};

/** ค่ามาตรฐาน 9:16 พร้อม safe zone จากงานวิจัย (ล่าง 25% / ขวา 15%) */
export const DEFAULT_RENDER: Omit<RenderOptions, 'headline' | 'theme'> = {
  width: 1080,
  height: 1920,
  fps: 30,
  safeBottom: 0.25,
  safeRight: 0.15,
  safeTop: 0.1,
  showSafeGuides: false,
};

export interface GeminiVoice {
  name: string;
  descTh: string;
}

/** เสียงของ Gemini TTS ที่อ่านภาษาไทยได้ดี (คัดมาแล้ว) */
export const VOICES: GeminiVoice[] = [
  { name: 'Kore', descTh: 'หญิง · หนักแน่น น่าเชื่อถือ — เหมาะรีวิวจริงจัง' },
  { name: 'Leda', descTh: 'หญิง · สดใส วัยรุ่น — เหมาะบิวตี้/แฟชั่น' },
  { name: 'Aoede', descTh: 'หญิง · นุ่ม เป็นกันเอง — เหมาะของใช้ในบ้าน' },
  { name: 'Zephyr', descTh: 'หญิง · สว่าง เร็ว — เหมาะคลิปดีล/คูปอง' },
  { name: 'Puck', descTh: 'ชาย · สดใส มีพลัง — เหมาะป้ายยาเร็วๆ' },
  { name: 'Charon', descTh: 'ชาย · ทุ้ม ให้ข้อมูล — เหมาะคลิปเตือนภัย' },
  { name: 'Fenrir', descTh: 'ชาย · เข้ม ตื่นเต้น — เหมาะ proof test' },
  { name: 'Orus', descTh: 'ชาย · มั่นคง เป็นทางการ — เหมาะสายไอที/เครื่องใช้ไฟฟ้า' },
];
