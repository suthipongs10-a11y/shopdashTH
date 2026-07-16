// แจ้งเตือน LINE OA ของ "แพลตฟอร์ม" (ต่างจาก lib/line.ts ที่เป็น OA ของร้าน):
// เจ้าของแพลตฟอร์มต้องรู้ทันทีเมื่อ (ก) มีร้าน signup ใหม่ (ข) มีสลิปค่าแพลนเข้าคิว
// เพราะลูกค้า trial มีเวลา 7 วัน — การตอบช้าช่วงนี้คือจุดเสีย conversion ที่แพงที่สุด
//
// fire-and-forget เหมือน OA ร้าน: ล้มเหลว = log อย่างเดียว ห้ามกระทบ signup/อัปสลิป

import 'server-only';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';

const LINE_BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';

/** token: DB (super admin ตั้งจาก UI — migration 013) → env → ไม่มี = ข้ามเงียบๆ */
async function platformLineToken(): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from('platform_settings')
    .select('line_channel_access_token')
    .eq('id', 1)
    .maybeSingle();
  const fromDb = !error ? (data?.line_channel_access_token as string | null) : null;
  return fromDb?.trim() || process.env.PLATFORM_LINE_CHANNEL_TOKEN?.trim() || null;
}

export async function sendPlatformLineMessage(event: string, text: string): Promise<boolean> {
  try {
    const token = await platformLineToken();
    if (!token) return false;

    const res = await fetch(LINE_BROADCAST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: [{ type: 'text', text }] }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[platform-line] ${event} failed: ${res.status} ${detail.slice(0, 200)}`);
      await logTenantEvent(null, 'platform_line_notify', 'error', {
        event,
        status: res.status,
        detail: detail.slice(0, 500),
      }).catch(() => undefined);
      return false;
    }

    await logTenantEvent(null, 'platform_line_notify', 'ok', { event }).catch(() => undefined);
    return true;
  } catch (err) {
    console.error(`[platform-line] ${event} failed:`, err);
    return false;
  }
}

export async function notifyPlatformNewTenant(args: {
  storeName: string;
  slug: string;
  planName: string;
  email: string;
}): Promise<void> {
  await sendPlatformLineMessage(
    'new_tenant',
    `🎉 ร้านใหม่สมัคร ShopDash\nร้าน: ${args.storeName}\nโดเมน: ${args.slug}\nแพลน: ${args.planName}\nอีเมล: ${args.email}\n(trial 7 วันเริ่มนับแล้ว)`,
  );
}

export async function notifyPlatformPlanSlip(args: {
  storeName: string;
  slug: string;
  planName: string;
  amount: number;
}): Promise<void> {
  await sendPlatformLineMessage(
    'plan_slip',
    `💸 สลิปค่าแพลนเข้าคิวรอตรวจ\nร้าน: ${args.storeName} (${args.slug})\nแพลน: ${args.planName}\nยอด: ฿${args.amount.toLocaleString('th-TH')}\nตรวจที่ Super Admin > อนุมัติค่าแพลน`,
  );
}
