// แจ้งเตือน LINE OA ของร้าน (งาน 4.5 — feature flag `line_oa`)
// fire-and-forget: ความล้มเหลวของ LINE ห้ามทำให้ checkout/สลิปล้ม — แค่ log (§6 DoD 4)
// หมายเหตุ: ใช้ Messaging API broadcast — ร้านควรใช้ OA แยกสำหรับแจ้งเตือนภายใน (ดู DECISIONS)

import 'server-only';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import type { TenantContext } from '@/lib/tenant-context';

const LINE_BROADCAST_URL = 'https://api.line.me/v2/bot/message/broadcast';

/**
 * ส่งข้อความเข้า LINE OA ของร้าน — ไม่ throw เด็ดขาด
 * คืน true เมื่อส่งสำเร็จ (ไว้ตรวจใน log/test)
 */
export async function sendLineMessage(
  ctx: TenantContext,
  event: string,
  text: string,
): Promise<boolean> {
  if (!ctx.features.line_oa) return false;
  const token = ctx.store.line_channel_access_token;
  if (!token) return false;

  try {
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
      console.error(`[line] ${event} failed: ${res.status} ${detail.slice(0, 200)}`);
      await logTenantEvent(ctx.tenantId, 'line_notify', 'error', {
        event,
        status: res.status,
        detail: detail.slice(0, 500),
      });
      return false;
    }

    await logTenantEvent(ctx.tenantId, 'line_notify', 'ok', { event });
    return true;
  } catch (err) {
    console.error(`[line] ${event} failed:`, err);
    await logTenantEvent(ctx.tenantId, 'line_notify', 'error', {
      event,
      detail: err instanceof Error ? err.message : String(err),
    }).catch(() => undefined);
    return false;
  }
}

export async function notifyNewOrder(
  ctx: TenantContext,
  orderNumber: string,
  totalAmount: number,
): Promise<void> {
  await sendLineMessage(
    ctx,
    'new_order',
    `🛒 ออร์เดอร์ใหม่ ${orderNumber}\nยอด ฿${totalAmount.toLocaleString('th-TH')} — รอลูกค้าชำระเงิน`,
  );
}

export async function notifyNewSlip(ctx: TenantContext, orderNumber: string): Promise<void> {
  await sendLineMessage(
    ctx,
    'new_slip',
    `💸 มีสลิปใหม่รอตรวจสอบ\nออร์เดอร์ ${orderNumber} — เข้าไปตรวจที่หลังร้าน > ตรวจสลิป`,
  );
}
