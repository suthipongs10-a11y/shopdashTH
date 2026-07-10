// หน้า "แพลนของฉัน" (§2.3 [P3]) — แพลนปัจจุบัน, วันหมดอายุ, จ่ายค่าแพลน/ขออัปเกรด
// ผ่าน PromptPay QR "ของแพลตฟอร์ม" + อัปสลิป (§5.3 ข้อ 9–10) — เข้าได้แม้ร้าน locked

import Link from 'next/link';
import { isRenewalTenant, planChargeAmount } from '@/lib/billing';
import { formatBaht, formatThaiDate, formatThaiDateTime } from '@/lib/format';
import { generatePromptpayQrSvg } from '@/lib/promptpay';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContextAllowLocked } from '@/lib/tenant-context';
import { PlanSlipUploader } from './plan-slip-uploader';

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
    tone: 'border-blue-200 bg-blue-50 text-blue-800',
    text: 'ร้านอยู่ในช่วงทดลองใช้ — ชำระค่าแพลนด้านล่างเพื่อใช้งานต่อหลังหมดช่วงทดลอง',
  },
  grace: {
    tone: 'border-yellow-300 bg-yellow-50 text-yellow-800',
    text: 'แพลนหมดอายุแล้ว (อยู่ในช่วงผ่อนผัน 7 วัน) — กรุณาชำระค่าแพลนเพื่อใช้งานต่อเนื่อง',
  },
  locked: {
    tone: 'border-red-300 bg-red-50 text-red-800',
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

  // ปีแรก = ราคาเต็ม (รวมค่าจัดทำ) / เคยชำระแล้ว = ค่าดูแลรายปี
  const payAmount = payPlan ? planChargeAmount(payPlan, renewal) : 0;

  const platformPromptpayId = process.env.PLATFORM_PROMPTPAY_ID ?? '';
  const platformPromptpayName = process.env.PLATFORM_PROMPTPAY_NAME ?? 'ShopDash';
  let qrSvg: string | null = null;
  if (payPlan && platformPromptpayId && !pendingSub) {
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
      <h1 className="text-xl font-semibold text-gray-900">แพลนของฉัน</h1>

      {notice && <div className={`rounded-md border p-4 text-sm ${notice.tone}`}>{notice.text}</div>}

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">แพลนปัจจุบัน</h2>
        <p className="text-lg font-medium text-gray-900">
          {ctx.plan.name_th}{' '}
          <span className="text-sm font-normal text-gray-400">
            (ปีแรก {formatBaht(ctx.plan.price_yearly)}
            {ctx.plan.price_renewal !== null &&
              ` · ค่าดูแลรายปี ${formatBaht(ctx.plan.price_renewal)}`}
            )
          </span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {ctx.status === 'trial'
            ? `ช่วงทดลองใช้ถึง ${expiry ? formatThaiDate(expiry) : '-'}`
            : `ใช้งานได้ถึง ${expiry ? formatThaiDate(expiry) : '-'}`}
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          ชำระค่าแพลน / ต่ออายุ / เปลี่ยนแพลน
        </h2>

        {pendingSub ? (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            ส่งสลิปแล้ว ({formatBaht(pendingSub.amount)} — แพลน {pendingSub.plans?.name_th}) กำลังรอ
            ShopDash ตรวจสอบ อนุมัติแล้วร้านจะใช้งานได้ทันที
          </div>
        ) : (
          <>
            {lastRejected && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
                    {p.name_th} · {formatBaht(planChargeAmount(p, renewal))}
                    {renewal && p.price_renewal !== null ? '/ปี (ต่ออายุ)' : '/ปีแรก'}
                    {p.id === ctx.plan.id && ' (ปัจจุบัน)'}
                  </Link>
                );
              })}
            </div>

            {payPlan && (
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
                  <p className="text-sm text-gray-600">
                    สแกนจ่าย <span className="text-xl font-bold text-gray-900">{formatBaht(payAmount)}</span>{' '}
                    สำหรับแพลน <span className="font-medium">{payPlan.name_th}</span> 1 ปี
                    {renewal ? ' (ค่าดูแลรายปี)' : ' (ปีแรก รวมค่าจัดทำร้าน)'}
                    แล้วแนบสลิปด้านล่าง — ทีมงานตรวจสอบแล้วจะเปิดใช้งานให้ทันที
                  </p>
                  <PlanSlipUploader planId={payPlan.id} />
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {subs.length > 0 && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">ประวัติการชำระ</h2>
          <ul className="space-y-2 text-sm">
            {subs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-gray-400">{formatThaiDateTime(s.created_at)}</span>
                <span className="text-gray-700">
                  {s.plans?.name_th} · {formatBaht(s.amount)}
                </span>
                {s.status === 'approved' && (
                  <span className="text-green-700">
                    อนุมัติแล้ว (ถึง {formatThaiDate(s.period_end)})
                  </span>
                )}
                {s.status === 'pending' && <span className="text-yellow-700">รอตรวจสอบ</span>}
                {s.status === 'rejected' && (
                  <span className="text-red-600">ปฏิเสธ — {s.reject_reason_th ?? ''}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
