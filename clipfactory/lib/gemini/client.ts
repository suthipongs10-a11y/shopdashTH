import 'server-only';
import { GoogleGenAI } from '@google/genai';

export class MissingApiKeyError extends Error {
  constructor() {
    super('ยังไม่ได้ตั้งค่า GEMINI_API_KEY — ขอคีย์ฟรีที่ https://aistudio.google.com/apikey แล้วใส่ในไฟล์ .env.local');
    this.name = 'MissingApiKeyError';
  }
}

let cached: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new MissingApiKeyError();
  if (!cached) cached = new GoogleGenAI({ apiKey });
  return cached;
}

export const SCRIPT_MODEL = process.env.GEMINI_SCRIPT_MODEL?.trim() || 'gemini-2.5-flash';
export const TTS_MODEL = process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-2.5-flash-preview-tts';

/**
 * แปลง error ของ SDK เป็นข้อความไทยที่ผู้ใช้อ่านรู้เรื่อง
 * ข้อความดิบจาก Google เป็น JSON ภาษาอังกฤษทั้งก้อน จึงไม่ส่งต่อให้ผู้ใช้เห็น — log ไว้ฝั่งเซิร์ฟเวอร์แทน
 */
export function toThaiError(err: unknown): { message: string; status: number } {
  if (err instanceof MissingApiKeyError) return { message: err.message, status: 400 };
  if (err instanceof Error && err.name === 'AbortError') {
    return { message: 'ยกเลิกคำขอแล้ว', status: 499 };
  }

  const raw = err instanceof Error ? err.message : String(err);
  const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 0;

  console.error('[gemini]', raw);

  if (status === 401 || status === 403 || /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|UNAUTHENTICATED/i.test(raw)) {
    return { message: 'คีย์ Google AI Studio ไม่ถูกต้องหรือไม่มีสิทธิ์ใช้โมเดลนี้ ตรวจสอบ GEMINI_API_KEY อีกครั้ง', status: 401 };
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|\bquota\b|rate limit/i.test(raw)) {
    return { message: 'ใช้โควตาของ Google AI Studio หมดชั่วคราว รอสักครู่แล้วลองใหม่', status: 429 };
  }
  if (status === 404 || /NOT_FOUND|is not found for API version/i.test(raw)) {
    return { message: 'ไม่พบโมเดลที่ระบุ — ตรวจสอบค่า GEMINI_SCRIPT_MODEL หรือ GEMINI_TTS_MODEL', status: 404 };
  }
  if (status === 400 || /INVALID_ARGUMENT|SAFETY|blocked/i.test(raw)) {
    return { message: 'Gemini ปฏิเสธคำขอนี้ ลองปรับข้อความสินค้าให้สุภาพขึ้นหรือสั้นลงแล้วลองใหม่', status: 400 };
  }
  if (status >= 500 || /UNAVAILABLE|INTERNAL|overloaded/i.test(raw)) {
    return { message: 'ระบบของ Google ไม่พร้อมให้บริการชั่วคราว รอสักครู่แล้วลองใหม่', status: 503 };
  }
  if (/fetch failed|ENOTFOUND|ETIMEDOUT|ECONNRESET|network/i.test(raw)) {
    return { message: 'เชื่อมต่อ Google AI Studio ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', status: 503 };
  }

  // ข้อความที่แอปเราสร้างเองเป็นภาษาไทยอยู่แล้ว ส่งต่อได้
  if (/[\u0E00-\u0E7F]/.test(raw)) return { message: raw, status: 500 };

  return { message: 'เรียก Gemini ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', status: 500 };
}
