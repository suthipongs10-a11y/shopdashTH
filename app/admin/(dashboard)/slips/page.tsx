// คิวอนุมัติสลิปแบบ manual — ดีฟอลต์ของทุกแพลน (§2.2)
// เรียงเก่าสุดก่อน / รูปสลิปเสิร์ฟผ่าน presigned GET อายุ 15 นาที (§3.9)

import { AlertIcon, CheckCircleIcon } from '@/components/admin/icons';
import { EmptyState, PageHeader } from '@/components/admin/ui';
import { formatBaht, formatThaiDateTime } from '@/lib/format';
import { presignGetUrl } from '@/lib/r2';
import { parseTransRef } from '@/lib/slip-qr';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { SlipReviewCard } from './slip-review-card';

interface PendingSlipRow {
  id: string;
  r2_key: string;
  created_at: string;
  qr_payload: string | null;
  qr_scanned: boolean;
  auto_verify_result: { verified?: boolean; reason_th?: string | null } | null;
  orders: { order_number: string; total_amount: number; ship_name: string };
}

export default async function SlipsQueuePage() {
  const ctx = await getTenantContext();
  const db = createAdminClient();

  const { data } = await db
    .from('payment_slips')
    .select(
      'id, r2_key, created_at, qr_payload, qr_scanned, auto_verify_result, orders!inner(order_number, total_amount, ship_name)',
    )
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
      <PageHeader
        title="คิวตรวจสอบสลิป"
        description={
          slips.length > 0 ? `${slips.length} รายการรอตรวจ — เรียงเก่าสุดก่อน` : 'ไม่มีรายการค้าง'
        }
      />

      {/* คำเตือนหลัก — ระบบเช็คสลิปเป็นแค่ด่านแรก เงินเข้าจริงต้องเช็คจากธนาคารเอง */}
      <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
        <AlertIcon size={20} className="mt-0.5 shrink-0 text-rose-500" />
        <div>
          <p className="font-bold text-rose-700">
            ก่อนกดอนุมัติทุกครั้ง — ตรวจสอบเงินเข้าบัญชีด้วยตัวเองให้แน่ชัด
          </p>
          <p className="mt-1 text-sm leading-relaxed text-rose-700">
            เปิดแอปธนาคาร/ข้อความแจ้งเตือนเงินเข้าของธนาคาร เช็คว่า{' '}
            <strong>ยอดเงินเข้าตรงกับออร์เดอร์จริง</strong> — ระบบตรวจสลิปของ ShopDash
            เป็นเพียงการคัดกรองเบื้องต้น (กันสลิปซ้ำ/สลิปไม่มี QR){' '}
            <strong>ไม่สามารถยืนยันว่าเงินเข้าบัญชีแล้ว</strong>
          </p>
        </div>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={<CheckCircleIcon size={22} />}
          title="ไม่มีสลิปรอตรวจสอบ"
          sub="เมื่อลูกค้าอัปโหลดสลิปใหม่ รายการจะขึ้นที่นี่ทันที"
        />
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
              // เลขอ้างอิงธุรกรรมจาก QR — parse ไม่ได้ให้โชว์ payload ช่วงต้นแทน
              qrRef={
                slip.qr_payload
                  ? (parseTransRef(slip.qr_payload) ?? `${slip.qr_payload.slice(0, 28)}…`)
                  : null
              }
              qrMissing={slip.qr_scanned && !slip.qr_payload}
              autoVerifyFailedReason={
                slip.auto_verify_result?.verified === false
                  ? (slip.auto_verify_result.reason_th ?? 'ไม่ทราบเหตุผล')
                  : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
