import 'server-only';
import { Type } from '@google/genai';
import { getGemini, SCRIPT_MODEL } from './client';
import type { ProductInput } from '../types';

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: 'ชื่อสินค้าแบบกระชับ ตัดคำโปรโมชันและอิโมจิออก' },
    price: { type: Type.STRING, description: 'ราคาพร้อมหน่วย เช่น "129 บาท" ถ้าไม่พบให้เว้นว่าง' },
    category: {
      type: Type.STRING,
      description: 'หมวดสินค้าเป็นภาษาไทยคำเดียว เช่น ความงาม ของใช้ในบ้าน แฟชั่น ไอที ของกิน',
    },
    audience: { type: Type.STRING, description: 'กลุ่มลูกค้าที่น่าจะซื้อ เช่น "แม่บ้าน อายุ 25-45"' },
    sellingPoints: {
      type: Type.ARRAY,
      description: 'จุดขาย 2-3 ข้อ แต่ละข้อเป็นประโยคสั้นที่เป็นประโยชน์กับคนซื้อ ไม่ใช่คำโฆษณาลอยๆ',
      items: { type: Type.STRING },
    },
    url: { type: Type.STRING, description: 'ลิงก์สินค้าถ้าพบในข้อความ ถ้าไม่พบให้เว้นว่าง' },
  },
  required: ['name', 'price', 'category', 'audience', 'sellingPoints', 'url'],
} as const;

/**
 * แยกข้อมูลสินค้าจากข้อความที่ผู้ใช้ copy มาจากแอป TikTok Shop หรือ Shopee
 *
 * ตั้งใจไม่ไป scrape หน้าเว็บ เพราะทั้งสองแพลตฟอร์ม render ด้วย JS และมีระบบกันบอท
 * การให้ผู้ใช้กดแชร์แล้ววางข้อความเชื่อถือได้กว่ามาก และใช้ได้กับทุกแพลตฟอร์ม
 */
export async function parseProduct(raw: string, signal?: AbortSignal): Promise<ProductInput> {
  const ai = getGemini();

  const prompt = [
    'ด้านล่างคือข้อความที่ผู้ใช้คัดลอกมาจากหน้าสินค้าในแอปช้อปปิ้ง อาจมีอิโมจิ คำโปรโมชัน หรือข้อความรกปนมา',
    'หน้าที่ของคุณคือแยกข้อมูลสินค้าออกมาให้เป็นระเบียบ',
    '',
    'กฎ:',
    '- ใช้เฉพาะข้อมูลที่ปรากฏในข้อความ ห้ามแต่งคุณสมบัติหรือราคาขึ้นเอง',
    '- ถ้าไม่พบข้อมูลช่องไหน ให้ส่งค่าว่าง ห้ามเดา',
    '- จุดขายให้เขียนใหม่เป็นภาษาพูดที่คนซื้อเข้าใจง่าย แต่ต้องอิงจากข้อมูลจริงในข้อความเท่านั้น',
    '- ห้ามใส่คำโฆษณาเกินจริง เช่น "ดีที่สุด" "อันดับ 1"',
    '',
    '--- ข้อความจากผู้ใช้ ---',
    raw,
    '--- จบข้อความ ---',
  ].join('\n');

  const res = await ai.models.generateContent({
    model: SCRIPT_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA as never,
      temperature: 0.2,
      ...(signal ? { abortSignal: signal } : {}),
    },
  });

  const text = res.text;
  if (!text) throw new Error('Gemini ไม่ได้ส่งข้อมูลกลับมา');

  let parsed: Partial<ProductInput>;
  try {
    parsed = JSON.parse(text) as Partial<ProductInput>;
  } catch {
    throw new Error('อ่านผลลัพธ์จาก Gemini ไม่ได้ ลองวางข้อความใหม่อีกครั้ง');
  }

  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const points = Array.isArray(parsed.sellingPoints) ? parsed.sellingPoints : [];

  return {
    name: str(parsed.name, 200),
    price: str(parsed.price, 60),
    category: str(parsed.category, 60),
    audience: str(parsed.audience, 200),
    url: str(parsed.url, 500),
    sellingPoints: points.slice(0, 6).map((p) => str(p, 200)).filter(Boolean),
  };
}
