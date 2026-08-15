import 'server-only';
import { Type } from '@google/genai';
import { getGemini, SCRIPT_MODEL } from './client';
import { TEMPLATES } from '../templates';
import type { Platform, TrendCard, TrendReport } from '../types';

/**
 * ค้นเทรนด์ที่กำลังมาแรง แล้วแปลงเป็นการ์ดที่กดทำคลิปต่อได้ทันที
 *
 * ทำสองขั้นเพราะ Gemini ใช้ googleSearch พร้อม responseSchema ในคำขอเดียวกันไม่ได้
 *   1. ค้นจริงด้วย Google Search grounding → ได้รายงานเป็นข้อความ + แหล่งอ้างอิง
 *   2. เรียกอีกครั้งเพื่อจัดรูปเป็น JSON ตาม schema
 */

const TEMPLATE_MENU = TEMPLATES.map((t) => `${t.id} = ${t.nameTh} (${t.taglineTh})`).join('\n');

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    trends: {
      type: Type.ARRAY,
      description: 'เทรนด์ที่ใช้ทำคลิปขายของได้จริง 3-6 รายการ เรียงจากที่น่าลงมือทำที่สุด',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'ชื่อเทรนด์สั้นๆ ภาษาไทย ไม่เกิน 12 คำ' },
          whyNowTh: { type: Type.STRING, description: 'ทำไมถึงมาแรงตอนนี้ อ้างอิงจากข้อมูลที่ค้นเจอ 1-2 ประโยค' },
          angleTh: { type: Type.STRING, description: 'มุมเล่าที่แนะนำสำหรับคลิปขายของ 1-2 ประโยค' },
          productIdeas: {
            type: Type.ARRAY,
            description: 'ประเภทสินค้าที่เกาะเทรนด์นี้ได้ 2-4 อย่าง',
            items: { type: Type.STRING },
          },
          hookExamples: {
            type: Type.ARRAY,
            description: 'ตัวอย่างประโยคเปิด 3 วินาทีแรก 2-3 อัน ภาษาพูดจริง ห้ามทักทาย',
            items: { type: Type.STRING },
          },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          templateId: {
            type: Type.STRING,
            description: 'id ของสูตรคลิปที่เข้ากับเทรนด์นี้ที่สุด ต้องเลือกจากรายการที่ให้ไว้เท่านั้น',
          },
          confidence: {
            type: Type.STRING,
            description: 'high เมื่อมีหลักฐานชัดจากที่ค้นเจอ, medium เมื่อพอมี, low เมื่อเป็นการคาดเดา',
          },
        },
        required: ['title', 'whyNowTh', 'angleTh', 'productIdeas', 'hookExamples', 'hashtags', 'templateId', 'confidence'],
      },
    },
  },
  required: ['trends'],
} as const;

function researchPrompt(queryTh: string, platform: Platform, todayIso: string): string {
  const platformName = platform === 'shopee' ? 'Shopee Video' : 'TikTok / TikTok Shop';
  return [
    `วันนี้คือ ${todayIso}`,
    `ค้นข้อมูลล่าสุดว่าตอนนี้บน ${platformName} ในประเทศไทย มีอะไรกำลังมาแรงเกี่ยวกับ "${queryTh}"`,
    '',
    'สิ่งที่ต้องค้นและสรุป:',
    '1. หัวข้อ กระแส หรือมุมคอนเทนต์ที่ครีเอเตอร์ไทยกำลังทำกันเยอะในช่วง 30 วันล่าสุด',
    '2. สินค้าหรือประเภทสินค้าที่กำลังขายดีในหมวดนี้',
    '3. แคมเปญหรือโปรโมชันที่กำลังจัดอยู่หรือกำลังจะมา',
    '4. รูปแบบการเปิดคลิป (hook) ที่เห็นซ้ำๆ ในคลิปที่ยอดดี',
    '5. แฮชแท็กที่กำลังใช้กันเยอะ',
    '',
    'ข้อกำหนด:',
    '- เน้นข้อมูลของประเทศไทยเท่านั้น ไม่เอาเทรนด์ต่างประเทศที่ยังไม่เข้าไทย',
    '- ระบุให้ชัดว่าข้อมูลไหนมาจากแหล่งที่ค้นเจอ ข้อมูลไหนเป็นการอนุมานของคุณเอง',
    '- ถ้าค้นไม่เจอข้อมูลที่สดพอ ให้บอกตรงๆ ว่าไม่เจอ ห้ามแต่งขึ้นมา',
    '- ตอบเป็นภาษาไทย',
  ].join('\n');
}

function structurePrompt(report: string, queryTh: string): string {
  return [
    'ด้านล่างคือรายงานผลการค้นเทรนด์ จัดให้เป็นการ์ดเทรนด์ที่ครีเอเตอร์เอาไปทำคลิปขายของได้ทันที',
    '',
    'กฎ:',
    '- ใช้เฉพาะข้อมูลที่ปรากฏในรายงาน ห้ามเพิ่มเทรนด์ที่ไม่ได้กล่าวถึง',
    '- ตั้ง confidence เป็น low ถ้ารายงานบอกว่าเป็นการอนุมานหรือไม่มีแหล่งยืนยัน',
    '- hookExamples ต้องเป็นภาษาพูดจริง ห้ามขึ้นต้นด้วยคำทักทาย',
    '- ห้ามใส่คำโฆษณาเกินจริง',
    '',
    'templateId ต้องเลือกจากรายการนี้เท่านั้น:',
    TEMPLATE_MENU,
    '',
    `หัวข้อที่ผู้ใช้ค้น: ${queryTh}`,
    '',
    '--- รายงาน ---',
    report,
    '--- จบรายงาน ---',
  ].join('\n');
}

const VALID_IDS = new Set(TEMPLATES.map((t) => t.id));

export async function researchTrends(args: {
  queryTh: string;
  platform: Platform;
  todayIso: string;
  signal?: AbortSignal;
}): Promise<TrendReport> {
  const { queryTh, platform, todayIso, signal } = args;
  const ai = getGemini();

  // ── ขั้นที่ 1: ค้นจริงด้วย Google Search
  const grounded = await ai.models.generateContent({
    model: SCRIPT_MODEL,
    contents: researchPrompt(queryTh, platform, todayIso),
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.4,
      ...(signal ? { abortSignal: signal } : {}),
    },
  });

  const report = grounded.text?.trim();
  if (!report) throw new Error('ค้นเทรนด์ไม่สำเร็จ Gemini ไม่ได้ส่งผลลัพธ์กลับมา');

  // เก็บแหล่งอ้างอิงที่ Gemini ใช้จริง เพื่อให้ผู้ใช้ตรวจสอบเองได้
  const chunks = grounded.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: { title: string; url: string }[] = [];
  for (const c of chunks) {
    const url = c.web?.uri;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title: c.web?.title || url, url });
  }

  // ── ขั้นที่ 2: จัดรูปเป็นการ์ด
  const structured = await ai.models.generateContent({
    model: SCRIPT_MODEL,
    contents: structurePrompt(report, queryTh),
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA as never,
      temperature: 0.2,
      ...(signal ? { abortSignal: signal } : {}),
    },
  });

  const text = structured.text;
  if (!text) throw new Error('จัดรูปผลการค้นไม่สำเร็จ ลองค้นใหม่อีกครั้ง');

  let parsed: { trends?: unknown[] };
  try {
    parsed = JSON.parse(text) as { trends?: unknown[] };
  } catch {
    throw new Error('อ่านผลลัพธ์จาก Gemini ไม่ได้ ลองค้นใหม่อีกครั้ง');
  }

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const arr = (v: unknown, max: number, itemMax: number) =>
    (Array.isArray(v) ? v : []).slice(0, max).map((x) => str(x, itemMax)).filter(Boolean);

  const trends: TrendCard[] = (parsed.trends ?? [])
    .map((raw) => {
      const t = raw as Record<string, unknown>;
      const id = str(t.templateId, 40);
      const conf = str(t.confidence, 10);
      return {
        title: str(t.title, 120),
        whyNowTh: str(t.whyNowTh, 400),
        angleTh: str(t.angleTh, 400),
        productIdeas: arr(t.productIdeas, 6, 80),
        hookExamples: arr(t.hookExamples, 4, 160),
        hashtags: arr(t.hashtags, 8, 40).map((h) => h.replace(/^#/, '')),
        templateId: VALID_IDS.has(id as never) ? (id as TrendCard['templateId']) : null,
        confidence: (conf === 'high' || conf === 'low' ? conf : 'medium') as TrendCard['confidence'],
      } satisfies TrendCard;
    })
    .filter((t) => t.title.length > 0);

  if (trends.length === 0) {
    throw new Error('ไม่พบเทรนด์ที่ชัดเจนพอสำหรับหัวข้อนี้ ลองใช้คำค้นที่กว้างขึ้น');
  }

  return { searchedAt: todayIso, queryTh, trends, sources: sources.slice(0, 12) };
}
