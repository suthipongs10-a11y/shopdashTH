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

/** แปลง error ของ SDK เป็นข้อความไทยที่ผู้ใช้อ่านรู้เรื่อง */
export function toThaiError(err: unknown): { message: string; status: number } {
  if (err instanceof MissingApiKeyError) return { message: err.message, status: 400 };
  const raw = err instanceof Error ? err.message : String(err);
  if (/API key not valid|API_KEY_INVALID|401|403/i.test(raw)) {
    return { message: 'คีย์ Google AI Studio ไม่ถูกต้องหรือไม่มีสิทธิ์ใช้โมเดลนี้ ตรวจสอบ GEMINI_API_KEY อีกครั้ง', status: 401 };
  }
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(raw)) {
    return { message: 'ใช้โควตาของ Google AI Studio หมดชั่วคราว รอสักครู่แล้วลองใหม่', status: 429 };
  }
  if (/404|NOT_FOUND|is not found/i.test(raw)) {
    return { message: 'ไม่พบโมเดลที่ระบุ — ตรวจสอบค่า GEMINI_SCRIPT_MODEL หรือ GEMINI_TTS_MODEL', status: 404 };
  }
  if (/fetch failed|ENOTFOUND|ETIMEDOUT|network/i.test(raw)) {
    return { message: 'เชื่อมต่อ Google AI Studio ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', status: 503 };
  }
  return { message: `เรียก Gemini ไม่สำเร็จ: ${raw}`, status: 500 };
}
