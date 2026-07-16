// Health check ของ infrastructure — ใช้ 2 ที่:
// (ก) แผง "สถานะระบบ" บนแดชบอร์ด Super Admin (รายละเอียด + latency + คำแนะนำ)
// (ข) /api/health สำหรับ uptime monitor ภายนอก (ตอบสั้น ไม่เปิดเผยรายละเอียดภายใน)
//
// ทุก check มี timeout ของตัวเอง — service ใดล่มต้องไม่ทำให้ check ที่เหลือค้างตาม

import 'server-only';
import { putObject } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';

export interface HealthCheck {
  key: 'database' | 'auth' | 'r2' | 'config';
  label: string;
  ok: boolean;
  latencyMs: number | null;
  /** รายละเอียดโชว์เฉพาะ Super Admin — ห้ามส่งออกทาง /api/health */
  detail: string;
}

export interface HealthReport {
  ok: boolean;
  checkedAt: string;
  checks: HealthCheck[];
}

const CHECK_TIMEOUT_MS = 5_000;

async function withTimeout<T>(run: () => Promise<T>): Promise<T> {
  return Promise.race([
    run(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${CHECK_TIMEOUT_MS / 1000}s`)), CHECK_TIMEOUT_MS),
    ),
  ]);
}

function errText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Postgres ผ่าน Supabase REST — query เบาสุดที่พิสูจน์ว่า DB ตอบจริง */
async function checkDatabase(): Promise<HealthCheck> {
  const started = Date.now();
  try {
    await withTimeout(async () => {
      const db = createAdminClient();
      const { error } = await db.from('plans').select('id', { count: 'exact', head: true });
      if (error) throw new Error(error.message);
    });
    return {
      key: 'database',
      label: 'Supabase Database',
      ok: true,
      latencyMs: Date.now() - started,
      detail: 'query ตาราง plans สำเร็จ',
    };
  } catch (err) {
    return {
      key: 'database',
      label: 'Supabase Database',
      ok: false,
      latencyMs: Date.now() - started,
      detail: errText(err),
    };
  }
}

/** Supabase Auth (GoTrue) — admin API แยก service จาก Postgres จึงเช็คแยก */
async function checkAuth(): Promise<HealthCheck> {
  const started = Date.now();
  try {
    await withTimeout(async () => {
      const db = createAdminClient();
      const { error } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw new Error(error.message);
    });
    return {
      key: 'auth',
      label: 'Supabase Auth',
      ok: true,
      latencyMs: Date.now() - started,
      detail: 'admin API ตอบปกติ (ระบบ login ร้านค้าใช้งานได้)',
    };
  } catch (err) {
    return {
      key: 'auth',
      label: 'Supabase Auth',
      ok: false,
      latencyMs: Date.now() - started,
      detail: errText(err),
    };
  }
}

/** R2 — เขียนไฟล์เล็กๆ ทับที่เดิม (health/ping.txt) พิสูจน์ทั้ง credential และ network
 *  ครอบคลุมกรณีอัปสลิป (server เขียนตรง) — presigned upload ฝั่ง client ใช้ credential ชุดเดียวกัน */
async function checkR2(): Promise<HealthCheck> {
  const started = Date.now();
  try {
    await withTimeout(() =>
      putObject('health/ping.txt', Buffer.from(new Date().toISOString()), 'text/plain'),
    );
    return {
      key: 'r2',
      label: 'Cloudflare R2',
      ok: true,
      latencyMs: Date.now() - started,
      detail: 'เขียนไฟล์ทดสอบสำเร็จ (อัปโหลดรูป/สลิปใช้งานได้)',
    };
  } catch (err) {
    return {
      key: 'r2',
      label: 'Cloudflare R2',
      ok: false,
      latencyMs: Date.now() - started,
      detail: errText(err),
    };
  }
}

/** ความพร้อมของการตั้งค่าสำคัญ — ไม่ใช่ availability แต่พังแล้วอาการเหมือนระบบล่ม */
async function checkConfig(): Promise<HealthCheck> {
  const problems: string[] = [];
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from('platform_settings')
      .select('promptpay_id, line_channel_access_token')
      .eq('id', 1)
      .maybeSingle();

    const promptpay =
      (!error ? (data?.promptpay_id as string | null) : null)?.trim() ||
      process.env.PLATFORM_PROMPTPAY_ID?.trim();
    if (!promptpay) problems.push('ยังไม่ตั้ง PromptPay แพลตฟอร์ม (ร้านจ่ายค่าแพลนไม่ได้)');

    const line =
      (!error ? (data?.line_channel_access_token as string | null) : null)?.trim() ||
      process.env.PLATFORM_LINE_CHANNEL_TOKEN?.trim();
    if (!line) problems.push('ยังไม่ตั้ง LINE แจ้งเตือนเจ้าของแพลตฟอร์ม');

    if (!process.env.CRON_SECRET?.trim()) problems.push('ยังไม่ตั้ง CRON_SECRET (cron sweep ไม่ทำงาน)');
  } catch (err) {
    problems.push(errText(err));
  }

  return {
    key: 'config',
    label: 'การตั้งค่าแพลตฟอร์ม',
    ok: problems.length === 0,
    latencyMs: null,
    detail: problems.length === 0 ? 'PromptPay / LINE / CRON_SECRET ครบ' : problems.join(' · '),
  };
}

/** รายงานเต็ม (Super Admin) — รันทุก check ขนานกัน */
export async function getHealthReport(): Promise<HealthReport> {
  const checks = await Promise.all([checkDatabase(), checkAuth(), checkR2(), checkConfig()]);
  return {
    // config ไม่นับเป็น "ระบบล่ม" — /api/health ต้องไม่แดงเพราะยังไม่ได้ตั้ง LINE
    ok: checks.filter((c) => c.key !== 'config').every((c) => c.ok),
    checkedAt: new Date().toISOString(),
    checks,
  };
}

// ---------- cache สำหรับ /api/health (endpoint public — กันโดนยิงถี่แล้วสร้างโหลดจริง) ----------

const CACHE_TTL_MS = 30_000;

interface CachedReport {
  report: HealthReport;
  at: number;
}

const globalCache = globalThis as unknown as { __healthCache?: CachedReport };

export async function getHealthReportCached(): Promise<HealthReport> {
  const hit = globalCache.__healthCache;
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.report;
  const report = await getHealthReport();
  globalCache.__healthCache = { report, at: Date.now() };
  return report;
}
