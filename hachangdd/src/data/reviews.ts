/**
 * รีวิวจากลูกค้าจริงเท่านั้น
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  กติกา (ห้ามฝ่าฝืน — ดู CLAUDE.md §8)
 *  1. ห้ามแต่งรีวิวขึ้นเอง ห้ามลอกรีวิวจากเว็บอื่น ห้ามใส่รีวิว "ตัวอย่าง"
 *     ไว้ก่อนแล้วค่อยเปลี่ยนทีหลัง — ถ้ายังไม่มีรีวิวจริง ให้ปล่อย array ว่าง
 *     (ส่วนรีวิวจะไม่ถูก render และไม่มี schema ออกไปเลย)
 *  2. ทุกรายการต้องมาจากลูกค้าที่ใช้บริการจริง และขออนุญาตเผยแพร่แล้ว
 *  3. ใช้ชื่อย่อ เช่น "คุณสมชาย ก." ไม่ต้องลงชื่อ-นามสกุลเต็มหรือเบอร์โทร
 *  4. `verified: true` ใส่ได้เฉพาะรีวิวที่ตรวจสอบย้อนกลับได้ว่ามีงานจริง
 *     (มีวันที่ทำงาน + ช่างที่ไปทำ) — ใช้เป็นเงื่อนไขคำนวณคะแนนเฉลี่ย
 *
 *  หมายเหตุเรื่อง SEO: รีวิวที่เจ้าของเว็บลงเองเกี่ยวกับธุรกิจตัวเอง
 *  (self-serving review) Google ไม่แสดงดาวใน search result ตั้งแต่ปี 2019
 *  ประโยชน์จริงของส่วนนี้คือ conversion + ความน่าเชื่อถือ (E-E-A-T)
 *  ถ้าอยากได้ดาวใน Google ต้องเป็นรีวิวใน Google Business Profile ของช่างจริง
 * ═══════════════════════════════════════════════════════════════════════
 */

export type ReviewSource = 'line' | 'facebook' | 'google' | 'phone' | 'onsite';

export type Review = {
  id: string;
  /** ชื่อย่อของลูกค้า เช่น "คุณสมชาย ก." */
  author: string;
  /** 1–5 */
  rating: number;
  /** วันที่รีวิว รูปแบบ YYYY-MM-DD (ค.ศ.) */
  date: string;
  body: string;
  serviceSlug: string;
  provinceSlug: string;
  /** อำเภอที่ไปทำงานจริง — ใช้จับคู่รีวิวขึ้นหน้าอำเภอนั้น */
  districtSlug: string;
  /** ตำบล/ย่าน (ถ้าลูกค้ายินดีให้ระบุ) */
  areaTh?: string;
  source: ReviewSource;
  /** ตรวจสอบย้อนกลับได้ว่ามีงานจริง */
  verified: boolean;
  /** สิ่งที่ทำให้ครั้งนั้น เช่น "ล้างแอร์ผนัง 2 เครื่อง" */
  jobSummary?: string;
};

/** ยังไม่มีรีวิวจริง — ห้ามเติมรีวิวสมมติลงมาโดยเด็ดขาด */
export const reviews: Review[] = [];

/** ต้องมีรีวิวที่ verified อย่างน้อยเท่านี้ ถึงจะแสดงคะแนนเฉลี่ย + AggregateRating */
export const MIN_REVIEWS_FOR_RATING = 3;

export function reviewsFor(opts: {
  serviceSlug?: string;
  provinceSlug?: string;
  districtSlug?: string;
  limit?: number;
}): Review[] {
  const list = reviews
    .filter((r) => (opts.serviceSlug ? r.serviceSlug === opts.serviceSlug : true))
    .filter((r) => (opts.provinceSlug ? r.provinceSlug === opts.provinceSlug : true))
    .filter((r) => (opts.districtSlug ? r.districtSlug === opts.districtSlug : true))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return opts.limit ? list.slice(0, opts.limit) : list;
}

export type Aggregate = { ratingValue: number; reviewCount: number };

/** คืน null เมื่อรีวิวที่ยืนยันแล้วยังไม่ถึงเกณฑ์ — ไม่ปัดเศษให้ดูดีเกินจริง */
export function aggregateFor(opts: {
  serviceSlug?: string;
  provinceSlug?: string;
  districtSlug?: string;
}): Aggregate | null {
  const verified = reviewsFor(opts).filter((r) => r.verified);
  if (verified.length < MIN_REVIEWS_FOR_RATING) return null;
  const sum = verified.reduce((acc, r) => acc + r.rating, 0);
  return {
    ratingValue: Math.round((sum / verified.length) * 10) / 10,
    reviewCount: verified.length,
  };
}
