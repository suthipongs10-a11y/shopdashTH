import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// PromptPay ของแพลตฟอร์ม (บัญชีรับเงินค่าแพลนจากร้าน §1.2)
// ลำดับความสำคัญ: ค่าใน DB (super admin ตั้งจาก UI) → env → ค่าว่าง
// อ่านผ่าน service role — ข้าม RLS; ตาราง platform_settings อาจยังไม่มีถ้ายังไม่รัน migration 011

export interface PlatformPromptpay {
  id: string;
  name: string;
}

interface RawSettings {
  promptpay_id: string | null;
  promptpay_name: string | null;
}

async function readRaw(): Promise<RawSettings | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('platform_settings')
    .select('promptpay_id, promptpay_name')
    .eq('id', 1)
    .maybeSingle();
  if (error) return null; // ตารางยังไม่มี / อ่านไม่ได้ → ใช้ fallback env
  return (data as RawSettings | null) ?? null;
}

/** ค่าที่ระบบใช้จริง (DB ก่อน แล้วค่อย env) — ใช้ในหน้าแพลนเพื่อสร้าง QR */
export async function getPlatformPromptpay(): Promise<PlatformPromptpay> {
  const raw = await readRaw();
  const id = raw?.promptpay_id?.trim() || process.env.PLATFORM_PROMPTPAY_ID?.trim() || '';
  const name =
    raw?.promptpay_name?.trim() || process.env.PLATFORM_PROMPTPAY_NAME?.trim() || 'ShopDash';
  return { id, name };
}

/** ค่าที่เก็บใน DB จริงๆ (ว่าง = ยังไม่เคยตั้ง) — ใช้เติมฟอร์มหน้าตั้งค่า */
export async function getPlatformPromptpayStored(): Promise<PlatformPromptpay> {
  const raw = await readRaw();
  return {
    id: raw?.promptpay_id?.trim() ?? '',
    name: raw?.promptpay_name?.trim() ?? '',
  };
}

/** มี LINE token ของแพลตฟอร์มตั้งไว้ไหม (DB หรือ env) — ใช้โชว์สถานะในหน้าตั้งค่า */
export async function hasPlatformLineToken(): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('platform_settings')
    .select('line_channel_access_token')
    .eq('id', 1)
    .maybeSingle();
  const fromDb = !error ? (data?.line_channel_access_token as string | null) : null;
  return !!(fromDb?.trim() || process.env.PLATFORM_LINE_CHANNEL_TOKEN?.trim());
}
