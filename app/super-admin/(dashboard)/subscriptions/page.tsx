// คิวอนุมัติสลิปค่าแพลน (§5.3 ข้อ 10) — เรียงเก่าสุดก่อน, รูปสลิปผ่าน presigned GET เท่านั้น

import { formatThaiDate, formatThaiDateTime } from '@/lib/format';
import { presignGetUrl } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { SubscriptionReviewCard, type SubscriptionReviewItem } from './subscription-review-card';

export const dynamic = 'force-dynamic';

interface PendingSubRow {
  id: string;
  amount: number;
  slip_r2_key: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
  plans: { name_th: string } | null;
  tenants: {
    slug: string;
    stores: { name: string } | null;
    plans: { name_th: string } | null;
  } | null;
}

export default async function SubscriptionsQueuePage() {
  const db = createAdminClient();
  const { data } = await db
    .from('tenant_subscriptions')
    .select(
      'id, amount, slip_r2_key, period_start, period_end, created_at, plans(name_th), tenants(slug, stores(name), plans(name_th))',
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const rows = (data ?? []) as unknown as PendingSubRow[];

  const items: SubscriptionReviewItem[] = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      storeName: row.tenants?.stores?.name ?? row.tenants?.slug ?? '-',
      slug: row.tenants?.slug ?? '-',
      planName: row.plans?.name_th ?? '-',
      currentPlanName: row.tenants?.plans?.name_th ?? '-',
      amount: row.amount,
      slipUrl: row.slip_r2_key ? await presignGetUrl(row.slip_r2_key) : null,
      createdAtText: formatThaiDateTime(row.created_at),
      periodText: `${formatThaiDate(row.period_start)} – ${formatThaiDate(row.period_end)}`,
    })),
  );

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold text-gray-900">คิวสลิปค่าแพลน</h1>
      <p className="mb-6 text-sm text-gray-500">
        สลิปที่ร้านค้าจ่ายค่าแพลนให้แพลตฟอร์ม — อนุมัติแล้วร้านจะ active และขยายอายุ 1 ปีทันที
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          ไม่มีสลิปรอตรวจ
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <SubscriptionReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
