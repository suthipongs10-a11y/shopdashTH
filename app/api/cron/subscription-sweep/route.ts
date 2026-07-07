// Cron รายวัน (§3.6, §7.4) — เดิน state machine ของ tenant อัตโนมัติ:
//   trial   + เลย trial_ends_at            → locked
//   active  + เลย subscription_ends_at     → grace
//   grace   + เลยกำหนด 7 วัน               → locked
//   locked  + ครบ 60 วัน (จาก locked_at)   → archived (soft — ลบจริงเป็นงาน manual §7.4)
// เรียกโดย Vercel Cron: GET พร้อม Authorization: Bearer {CRON_SECRET}

import { NextResponse, type NextRequest } from 'next/server';
import { logTenantEvent } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateTenantCache } from '@/lib/tenant-context';

const GRACE_DAYS = 7;
const ARCHIVE_AFTER_LOCKED_DAYS = 60;

interface SweepTenant {
  id: string;
  slug: string;
  status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  locked_at: string | null;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const now = new Date().toISOString();
  const transitions: { slug: string; from: string; to: string }[] = [];

  async function sweep(
    tenants: SweepTenant[],
    to: 'grace' | 'locked' | 'archived',
    reason: string,
  ): Promise<void> {
    for (const tenant of tenants) {
      const patch: Record<string, unknown> = { status: to };
      if (to === 'locked') patch.locked_at = now;

      // guard ด้วยสถานะเดิม — กันชนกับการแก้มือของ super admin ระหว่าง sweep
      const { data: updated, error } = await db
        .from('tenants')
        .update(patch)
        .eq('id', tenant.id)
        .eq('status', tenant.status)
        .select('id');

      if (!error && (updated ?? []).length > 0) {
        invalidateTenantCache(tenant.slug);
        transitions.push({ slug: tenant.slug, from: tenant.status, to });
        await logTenantEvent(tenant.id, 'tenant_status', 'ok', {
          from: tenant.status,
          to,
          actor: 'cron:subscription-sweep',
          reason,
        });
      }
    }
  }

  // trial หมดอายุ → locked (§5.3: ครบ 7 วันไม่จ่าย)
  const { data: trialExpired } = await db
    .from('tenants')
    .select('id, slug, status, trial_ends_at, subscription_ends_at, locked_at')
    .eq('status', 'trial')
    .lt('trial_ends_at', now);
  await sweep((trialExpired ?? []) as SweepTenant[], 'locked', 'trial expired');

  // active หมดอายุ → grace
  const { data: activeExpired } = await db
    .from('tenants')
    .select('id, slug, status, trial_ends_at, subscription_ends_at, locked_at')
    .eq('status', 'active')
    .lt('subscription_ends_at', now);
  await sweep((activeExpired ?? []) as SweepTenant[], 'grace', 'subscription expired');

  // grace ครบ 7 วันหลังหมดอายุ → locked
  const { data: graceExpired } = await db
    .from('tenants')
    .select('id, slug, status, trial_ends_at, subscription_ends_at, locked_at')
    .eq('status', 'grace')
    .lt('subscription_ends_at', daysAgo(GRACE_DAYS));
  await sweep((graceExpired ?? []) as SweepTenant[], 'locked', `grace period (${GRACE_DAYS}d) over`);

  // locked ครบ 60 วัน → archived (ปิดจาก routing, ข้อมูลยังอยู่)
  const { data: lockedExpired } = await db
    .from('tenants')
    .select('id, slug, status, trial_ends_at, subscription_ends_at, locked_at')
    .eq('status', 'locked')
    .lt('locked_at', daysAgo(ARCHIVE_AFTER_LOCKED_DAYS));
  await sweep(
    (lockedExpired ?? []) as SweepTenant[],
    'archived',
    `locked over ${ARCHIVE_AFTER_LOCKED_DAYS}d`,
  );

  return NextResponse.json({ ok: true, swept_at: now, transitions });
}
