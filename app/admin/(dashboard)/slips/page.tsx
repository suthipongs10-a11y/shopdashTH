// คิวอนุมัติสลิปแบบ manual — ดีฟอลต์ของทุกแพลน (§2.2)
// เรียงเก่าสุดก่อน / รูปสลิปเสิร์ฟผ่าน presigned GET อายุ 15 นาที (§3.9)

import { formatBaht, formatThaiDateTime } from '@/lib/format';
import { presignGetUrl } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { SlipReviewCard } from './slip-review-card';

interface PendingSlipRow {
  id: string;
  r2_key: string;
  created_at: string;
  orders: { order_number: string; total_amount: number; ship_name: string };
}

export default async function SlipsQueuePage() {
  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data } = await db
    .from('payment_slips')
    .select('id, r2_key, created_at, orders!inner(order_number, total_amount, ship_name)')
    .eq('tenant_id', ctx.tenantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const slips = (data ?? []) as unknown as PendingSlipRow[];
  const cards = await Promise.all(
    slips.map(async (slip) => ({
      slip,
      imageUrl: await presignGetUrl(slip.r2_key),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-gray-900">คิวตรวจสอบสลิป</h1>
        <p className="text-sm text-gray-500">{slips.length} รายการรอตรวจ</p>
      </div>

      {cards.length === 0 ? (
        <p className="rounded-md border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
          ไม่มีสลิปรอตรวจสอบ 🎉
        </p>
      ) : (
        <div className="space-y-4">
          {cards.map(({ slip, imageUrl }) => (
            <SlipReviewCard
              key={slip.id}
              slipId={slip.id}
              orderNumber={slip.orders.order_number}
              amount={formatBaht(slip.orders.total_amount)}
              shipName={slip.orders.ship_name}
              uploadedAt={formatThaiDateTime(slip.created_at)}
              imageUrl={imageUrl}
              accountName={ctx.store.promptpay_account_name}
              promptpayId={ctx.store.promptpay_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
