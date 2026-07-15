// หน้า "แพลนของฉัน" (§2.3 [P3]) — แพลนปัจจุบัน, วันหมดอายุ, จ่ายค่าแพลน/ขออัปเกรด
// ผ่าน PromptPay QR "ของแพลตฟอร์ม" + อัปสลิป (§5.3 ข้อ 9–10) — เข้าได้แม้ร้าน locked

import Link from 'next/link';
import { computePlanCharge, isRenewalTenant, type PlanChargeInfo } from '@/lib/billing';
import { formatBaht, formatThaiDate, formatThaiDateTime } from '@/lib/format';
import { getPlatformPromptpay } from '@/lib/platform-settings';
import { generatePromptpayQrSvg } from '@/lib/promptpay';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContextAllowLocked } from '@/lib/tenant-context';
import { DowngradeButton } from './downgrade-button';
import { PlanSlipUploader } from './plan-slip-uploader';

// ป้ายราคาบนปุ่มเลือกแพลน — ต่างกันตามชนิด (ปีแรก/ต่ออายุ/อัปเกรดส่วนต่าง/ลดแพลน)
function chargeLabel(c: PlanChargeInfo): string {
  switch (c.kind) {
    case 'first':
      return `${formatBaht(c.amount)}/ปีแรก`;
    case 'renewal':
      return `${formatBaht(c.amount)}/ปี (ต่ออายุ)`;
    case 'upgrade':
      return `อัปเกรด +${formatBaht(c.amount)}`;
    case 'downgrade':
      return 'ลดแพลน · ฟรี';
  }
}

export const dynamic = 'force-dynamic';

interface PlanOption {
  id: string;
  code: string;
  name_th: string;
  price_yearly: number;
  price_renewal: number | null;
}

interface SubHistoryRow {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason_th: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
  plans: { name_th: string } | null;
}

const STATUS_NOTICE: Record<string, { tone: string; text: string }> = {
  trial: {
    tone: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    text: 'ร้านอยู่ในช่วงทดลองใช้ — ชำระค่าแพลนด้านล่างเพื่อใช้งานต่อหลังหมดช่วงทดลอง',
  },
  grace: {
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
    text: 'แพลนหมดอายุแล้ว (อยู่ในช่วงผ่อนผัน 7 วัน) — กรุณาชำระค่าแพลนเพื่อใช้งานต่อเนื่อง',
  },
  locked: {
    tone: 'border-rose-200 bg-rose-50 text-red-800',
    text: 'ร้านถูกระงับเนื่องจากค้างชำระค่าแพลน — หน้าร้านปิดชั่วคราว ชำระแล้วระบบจะเปิดให้ทันทีที่อนุมัติ',
  },
};

export default async function MyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: selectedCode } = await searchParams;
  const ctx = await getTenantContextAllowLocked();

  const db = createAdminClient();
  const [{ data: plansData }, { data: subsData }, renewal] = await Promise.all([
    db
      .from('plans')
      .select('id, code, name_th, price_yearly, price_renewal')
      .eq('is_active', true)
      .order('price_yearly'),
    db
      .from('tenant_subscriptions')
      .select(
        'id, amount, status, reject_reason_th, period_start, period_end, created_at, plans(name_th)',
      )
      .eq('tenant_id', ctx.tenantId)
      .order('created_at', { ascending: false })
      .limit(10),
    isRenewalTenant(ctx.tenantId),
  ]);

  const plans = (plansData ?? []) as PlanOption[];
  const subs = (subsData ?? []) as unknown as SubHistoryRow[];

  // แพลนที่จะจ่าย: default = แพลนปัจจุบัน / เลือกแพลนอื่น = ขออัปเกรด/ดาวน์เกรด (§2.3)
  const payPlan = plans.find((p) => p.code === selectedCode)
    ?? plans.find((p) => p.id === ctx.plan.id)
    ?? plans[0];

  const pendingSub = subs.find((s) => s.status === 'pending');
  const lastRejected = !pendingSub && subs[0]?.status === 'rejected' ? subs[0] : undefined;

  // คิดยอด + ชนิด (ปีแรก/ต่ออายุ/อัปเกรดส่วนต่าง/ลดแพลน) เทียบกับแพลนปัจจุบัน
  const payCharge: PlanChargeInfo | null = payPlan
    ? computePlanCharge(ctx.plan, payPlan, renewal)
    : null;
  const payAmount = payCharge?.amount ?? 0;

  const { id: platformPromptpayId, name: platformPromptpayName } = await getPlatformPromptpay();
  let qrSvg: string | null = null;
  if (payPlan && platformPromptpayId && !pendingSub && payAmount > 0) {
    try {
      qrSvg = await generatePromptpayQrSvg(platformPromptpayId, payAmount);
    } catch {
      qrSvg = null;
    }
  }

  const expiry = ctx.status === 'trial' ? ctx.trialEndsAt : ctx.subscriptionEndsAt;
  const notice = STATUS_NOTICE[ctx.status];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">แพลนของฉัน</h1>

      {notice && (
        <div className={`rounded-md border-2 p-4 text-sm font-medium ${notice.tone}`}>
          {notice.text}
        </div>
      )}

      <section className="rounded-xl border border-gray-300 bg-white shadow-sm p-5">
        <h2 className="mb-3 text-base font-bold text-gray-900">แพลนปัจจุบัน</h2>
        <p className="text-lg font-bold text-gray-900">
          {ctx.plan.name_th}{' '}
          <span className="text-sm font-medium text-gray-600">
            (ปีแรก {formatBaht(ctx.plan.price_yearly)}
            {ctx.plan.price_renewal !== null &&
              ` · ค่าดูแลรายปี ${formatBaht(ctx.plan.price_renewal)}`}
            )
          </span>
        </p>
        <p className="mt-1 text-sm font-medium text-gray-600">
          {ctx.status === 'trial'
            ? `ช่วงทดลองใช้ถึง ${expiry ? formatThaiDate(expiry) : '-'}`
            : `ใช้งานได้ถึง ${expiry ? formatThaiDate(expiry) : '-'}`}
        </p>
      </section>

      <section className="rounded-xl border border-gray-300 bg-white shadow-sm p-5">
        <h2 className="mb-3 text-base font-bold text-gray-900">
          ชำระค่าแพลน / ต่ออายุ / เปลี่ยนแพลน
        </h2>

        {pendingSub ? (
          <div className="rounded-md border-2 border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            ส่งสลิปแล้ว ({formatBaht(pendingSub.amount)} — แพลน {pendingSub.plans?.name_th}) กำลังรอ
            ShopDash ตรวจสอบ อนุมัติแล้วร้านจะใช้งานได้ทันที
          </div>
        ) : (
          <>
            {lastRejected && (
              <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                สลิปก่อนหน้าถูกปฏิเสธ: {lastRejected.reject_reason_th ?? 'ไม่ระบุเหตุผล'} —
                กรุณาส่งสลิปใหม่
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {plans.map((p) => {
                const active = payPlan?.id === p.id;
                return (
                  <Link
                    key={p.id}
                    href={`/admin/plan?plan=${p.code}`}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      active
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-gray-500'
                    }`}
                  >
                    {p.name_th} · {chargeLabel(computePlanCharge(ctx.plan, p, renewal))}
                    {p.id === ctx.plan.id && ' (ปัจจุบัน)'}
                  </Link>
                );
              })}
            </div>

            {payPlan &&
              payCharge &&
              (payCharge.kind === 'downgrade' ? (
                <DowngradeButton
                  planId={payPlan.id}
                  planName={payPlan.name_th}
                  amount={`${formatBaht(payPlan.price_renewal ?? payPlan.price_yearly)}/ปี`}
                />
              ) : (
                <div className="flex flex-wrap items-start gap-6">
                  <div className="w-52 shrink-0">
                    {qrSvg ? (
                      <>
                        {/* SVG จาก lib ฝั่ง server — ไม่ใช่ user input */}
                        <div
                          className="rounded-md border border-gray-200 p-2"
                          dangerouslySetInnerHTML={{ __html: qrSvg }}
                        />
                        <p className="mt-2 text-center text-xs text-gray-500">
                          PromptPay: {platformPromptpayName}
                        </p>
                      </>
                    ) : (
                      <div className="flex h-52 items-center justify-center rounded-md border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400">
                        ยังไม่สามารถสร้าง QR ได้ (แพลตฟอร์มยังไม่ตั้งค่า PromptPay)
                      </div>
                    )}
                  </div>
                  <div className="min-w-64 flex-1 space-y-4">
                    <p className="text-sm font-medium text-gray-600">
                      {payCharge.kind === 'upgrade' ? (
                        <>
                          อัปเกรดเป็นแพลน <b>{payPlan.name_th}</b> — สแกนจ่ายส่วนต่าง{' '}
                          <span className="text-xl font-bold text-gray-900">
                            {formatBaht(payAmount)}
                          </span>{' '}
                          (อายุเริ่มนับใหม่ 1 ปีจากวันอนุมัติ)
                        </>
                      ) : payCharge.kind === 'renewal' ? (
                        <>
                          ต่ออายุแพลน <b>{payPlan.name_th}</b> — สแกนจ่าย{' '}
                          <span className="text-xl font-bold text-gray-900">
                            {formatBaht(payAmount)}
                          </span>{' '}
                          (ค่าดูแลรายปี)
                        </>
                      ) : (
                        <>
                          สแกนจ่าย{' '}
                          <span className="text-xl font-bold text-gray-900">
                            {formatBaht(payAmount)}
                          </span>{' '}
                          สำหรับแพลน <b>{payPlan.name_th}</b> 1 ปี (ปีแรก รวมค่าจัดทำร้าน)
                        </>
                      )}{' '}
                      แล้วแนบสลิปด้านล่าง — ทีมงานตรวจสอบแล้วจะเปิดใช้งานให้ทันที
                    </p>
                    <PlanSlipUploader planId={payPlan.id} />
                  </div>
                </div>
              ))}
          </>
        )}
      </section>

      {subs.length > 0 && (
        <section className="rounded-xl border border-gray-300 bg-white shadow-sm p-5">
          <h2 className="mb-3 text-base font-bold text-gray-900">ประวัติการชำระ</h2>
          <ul className="space-y-2 text-sm">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-gray-500">{formatThaiDateTime(s.created_at)}</span>
                <span className="font-semibold text-gray-800">
                  {s.plans?.name_th} · {formatBaht(s.amount)}
                </span>
                {s.status === 'approved' && (
                  <span className="font-semibold text-emerald-700">
                    อนุมัติแล้ว (ถึง {formatThaiDate(s.period_end)})
                  </span>
                )}
                {s.status === 'pending' && (
                  <span className="font-semibold text-amber-700">รอตรวจสอบ</span>
                )}
                {s.status === 'rejected' && (
                  <span className="font-semibold text-rose-600">
                    ปฏิเสธ — {s.reject_reason_th ?? ''}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
