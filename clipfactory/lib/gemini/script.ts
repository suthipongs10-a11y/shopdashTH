import 'server-only';
import { Type } from '@google/genai';
import { getGemini, SCRIPT_MODEL } from './client';
import type { FormatTemplate, GeneratedScript, Platform, ProductInput } from '../types';

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: 'ข้อความ overlay ที่ค้างบนจอทั้งคลิป ไม่เกิน 9 คำไทย',
    },
    hooks: {
      type: Type.ARRAY,
      description: '5 เวอร์ชันของประโยคเปิด 3 วินาทีแรก ต้องต่างกันเชิงมุมมอง ไม่ใช่แค่สลับคำ',
      items: { type: Type.STRING },
    },
    scenes: {
      type: Type.ARRAY,
      description: 'ซีนหลักของคลิป ไม่รวม hook และไม่รวม CTA',
      items: {
        type: Type.OBJECT,
        properties: {
          vo: { type: Type.STRING, description: 'ประโยคที่เสียงพากย์พูด ภาษาพูดจริง' },
          caption: { type: Type.STRING, description: 'ข้อความบนจอ สั้นกว่า vo เสมอ ไม่เกิน 8 คำ' },
          durationSec: { type: Type.NUMBER, description: 'ความยาวซีนเป็นวินาที' },
        },
        required: ['vo', 'caption', 'durationSec'],
      },
    },
    cta: { type: Type.STRING, description: 'ประโยคปิดที่ชี้ให้กดตะกร้า ไม่เกิน 10 คำ' },
    postCaption: {
      type: Type.STRING,
      description:
        'แคปชั่นสำหรับใช้ตอนโพสต์คลิป 1-3 บรรทัด ภาษาพูด ชวนคุย ไม่ต้องใส่แฮชแท็ก และไม่ต้องซ้ำกับ hook',
    },
    hashtags: {
      type: Type.ARRAY,
      description: 'แฮชแท็กไทย 5-8 ตัว ไม่ต้องใส่เครื่องหมาย #',
      items: { type: Type.STRING },
    },
  },
  required: ['headline', 'hooks', 'scenes', 'cta', 'postCaption', 'hashtags'],
} as const;

/** กฎกลางที่ใช้กับทุกเทมเพลต — ถอดจากงานวิจัย */
const GLOBAL_RULES = [
  'เขียนเป็นภาษาไทยพูดจริงแบบคนคุยกัน ห้ามใช้ภาษาเขียนทางการ',
  'ห้ามขึ้นต้นด้วยคำทักทายทุกชนิด และห้ามแนะนำตัว',
  'ประโยคต้องสั้น ไม่เกิน 16 คำต่อประโยค เพราะคนดูมีเวลาแค่ไม่กี่วินาที',
  'ห้ามอ้างสรรพคุณเกินจริง ห้ามอ้างผลทางการแพทย์ ห้ามใช้คำว่า "อันดับ 1" "ดีที่สุด" "รักษาได้"',
  'ใช้เฉพาะข้อมูลสินค้าที่ได้รับ ห้ามแต่งคุณสมบัติหรือราคาขึ้นเอง',
  'โทนต้องเหมือนคนธรรมดารีวิวของที่ใช้จริง ไม่ใช่โฆษณาแบรนด์',
];

/** เวลาที่เหลือให้เนื้อหา หลังหัก hook 3 วิ และ CTA 2 วิ — ทุกสูตรมี CTA บนจอเสมอ */
function bodyBudgetOf(targetSec: number): number {
  return Math.max(4, targetSec - 3 - 2);
}

function buildPrompt(
  product: ProductInput,
  template: FormatTemplate,
  platform: Platform,
  targetSec: number,
): string {
  const bodySec = bodyBudgetOf(targetSec);
  const [minScenes, maxScenes] = template.sceneCount;

  const platformNote =
    platform === 'shopee'
      ? 'แพลตฟอร์ม Shopee Video: คนดูตั้งใจมาซื้ออยู่แล้ว ให้ตรงประเด็นเร็ว เน้นเห็นผลไว และซีนสุดท้ายควรเอ่ยถึงคูปองหรือส่วนลด'
      : 'แพลตฟอร์ม TikTok: คนดูมาเสพความบันเทิง ต้องแย่งความสนใจ hook ต้องแรงกว่าปกติ';

  return [
    'คุณคือครีเอเตอร์สายรีวิวสินค้าชาวไทยที่ทำคลิปปักตะกร้าจนยอดขายดีมาแล้วหลายร้อยคลิป',
    'งานของคุณคือเขียนสคริปต์คลิปสั้นแนวตั้งสำหรับปักตะกร้าสินค้า 1 ชิ้น',
    '',
    '## สินค้า',
    `ชื่อ: ${product.name}`,
    `ราคา: ${product.price || 'ไม่ระบุ'}`,
    `หมวด: ${product.category || 'ไม่ระบุ'}`,
    `กลุ่มลูกค้า: ${product.audience || 'ผู้ซื้อออนไลน์ชาวไทยทั่วไป'}`,
    `จุดขาย:`,
    ...product.sellingPoints.filter(Boolean).map((p) => `- ${p}`),
    '',
    '## สูตรคลิปที่ต้องใช้',
    `ชื่อสูตร: ${template.nameTh}`,
    `โครงสร้างที่ต้องทำตาม: ${template.brief.structure}`,
    `กฎของ hook: ${template.brief.hookRule}`,
    'กฎเฉพาะสูตรนี้:',
    ...template.brief.rules.map((r) => `- ${r}`),
    '',
    '## ข้อกำหนดความยาว',
    `คลิปรวมประมาณ ${targetSec} วินาที`,
    `hook กินเวลา 3 วินาทีแรก, CTA ปิดท้าย 2 วินาที, เนื้อหาหลักรวมกันประมาณ ${bodySec} วินาที`,
    `ต้องมีซีนเนื้อหา ${minScenes} ถึง ${maxScenes} ซีน และผลรวม durationSec ของทุกซีนต้องใกล้เคียง ${bodySec} วินาที`,
    '',
    '## กฎกลางที่ห้ามฝ่าฝืน',
    ...GLOBAL_RULES.map((r) => `- ${r}`),
    '',
    `## บริบทแพลตฟอร์ม`,
    platformNote,
    '',
    'ส่งผลลัพธ์เป็น JSON ตาม schema ที่กำหนดเท่านั้น',
  ].join('\n');
}

function normalize(raw: unknown, targetSec: number, template: FormatTemplate): GeneratedScript {
  const obj = raw as Partial<GeneratedScript>;
  const scenes = (obj.scenes ?? [])
    .filter((s) => s && typeof s.caption === 'string')
    .map((s) => ({
      vo: template.audio === 'music-only' ? '' : String(s.vo ?? '').trim(),
      caption: String(s.caption ?? '').trim(),
      durationSec: Number.isFinite(s.durationSec) && s.durationSec > 0 ? Number(s.durationSec) : 2.5,
    }));

  if (scenes.length === 0) {
    throw new Error('โมเดลไม่ได้ส่งซีนกลับมา ลองกดสร้างใหม่อีกครั้ง');
  }

  // ปรับสเกลเวลาให้ผลรวมตรงกับความยาวเป้าหมาย
  const bodyBudget = bodyBudgetOf(targetSec);
  const sum = scenes.reduce((a, s) => a + s.durationSec, 0);
  const factor = sum > 0 ? bodyBudget / sum : 1;
  for (const s of scenes) s.durationSec = Math.round(s.durationSec * factor * 100) / 100;

  const hooks = (obj.hooks ?? []).map((h) => String(h).trim()).filter(Boolean);

  return {
    headline: String(obj.headline ?? '').trim() || scenes[0].caption,
    hooks: hooks.length ? hooks.slice(0, 5) : [scenes[0].caption],
    scenes,
    cta: String(obj.cta ?? '').trim() || 'กดตะกร้าเหลืองข้างล่างได้เลย',
    postCaption: String(obj.postCaption ?? '').trim(),
    hashtags: (obj.hashtags ?? []).map((h) => String(h).replace(/^#/, '').trim()).filter(Boolean),
  };
}

export async function generateScript(args: {
  product: ProductInput;
  template: FormatTemplate;
  platform: Platform;
  targetSec: number;
  signal?: AbortSignal;
}): Promise<GeneratedScript> {
  const { product, template, platform, targetSec, signal } = args;
  const ai = getGemini();

  const res = await ai.models.generateContent({
    model: SCRIPT_MODEL,
    contents: buildPrompt(product, template, platform, targetSec),
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA as never,
      temperature: 1.1,
      ...(signal ? { abortSignal: signal } : {}),
    },
  });

  const text = res.text;
  if (!text) throw new Error('Gemini ไม่ได้ส่งข้อความกลับมา');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('ผลลัพธ์จาก Gemini ไม่ใช่ JSON ที่อ่านได้ ลองกดสร้างใหม่อีกครั้ง');
  }

  return normalize(parsed, targetSec, template);
}
