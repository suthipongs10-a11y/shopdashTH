// แดชบอร์ด Store Admin (§5.2) — สรุปพื้นฐานทุกแพลน + กราฟ/สินค้าขายดีเฉพาะแพลนที่เปิด
// analytics_dashboard (Pro/Premium §5.1). ตัวเลขทั้งหมดนับเฉพาะออร์เดอร์ยืนยันแล้ว (confirmed+)

import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  AlertIcon,
  BahtIcon,
  BoxIcon,
  CheckCircleIcon,
  ClockIcon,
  OrdersIcon,
  SlipIcon,
  StarIcon,
} from '@/components/admin/icons';
import { Badge, btnPrimary, Card, EmptyState, PageHeader, tdClass, thClass, trHover } from '@/components/admin/ui';
import {
  getLowStockVariants,
  getStoreDailySales,
  getStoreOrderStatusCounts,
  getStoreSalesSummary,
  getStoreTopProducts,
  getStoreWeeklySales,
  type DailySalesPoint,
  type TopProduct,
  type WeeklySalesPoint,
} from '@/lib/analytics';
import { formatBaht } from '@/lib/format';
import { ORDER_STATUS_TH, type OrderStatus } from '@/lib/orders/status';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/tenant-context';
import { getThemeContent } from '@/lib/theme-content';
import { SalesCharts } from './sales-charts';
import { SampleDataBanner } from './sample-data-banner';

export const dynamic = 'force-dynamic';

/* ---------- ไอคอนเล็กเฉพาะหน้านี้ ---------- */

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/* ---------- Stat tile: การ์ด gradient พาสเทล + icon chip ลอย ---------- */

type TileTone = 'emerald' | 'indigo' | 'violet';

const TILE: Record<TileTone, { grad: string; chip: string; blob: string }> = {
  emerald: {
    grad: 'from-emerald-50 to-white',
    chip: 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600',
    blob: 'bg-emerald-200/50',
  },
  indigo: {
    grad: 'from-indigo-50 to-white',
    chip: 'bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600',
    blob: 'bg-indigo-200/50',
  },
  violet: {
    grad: 'from-violet-50 to-white',
    chip: 'bg-gradient-to-br from-violet-100 to-violet-50 text-violet-600',
    blob: 'bg-violet-200/50',
  },
};

function StatTile({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ReactNode;
  tone: TileTone;
}) {
  const t = TILE[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br ${t.grad} p-5 shadow-sm`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full ${t.blob} blur-2xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-gray-600">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{value}</p>
          {sub && <p className="mt-1.5 text-xs font-medium text-gray-500">{sub}</p>}
        </div>
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-4 ring-white/80 ${t.chip}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

/* ---------- ออร์เดอร์ค้างต่อสถานะ ---------- */

const PIPELINE: {
  status: OrderStatus;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'amber' | 'violet' | 'sky' | 'indigo';
}[] = [
  { status: 'pending_payment', icon: ClockIcon, tone: 'amber' },
  { status: 'slip_uploaded', icon: SlipIcon, tone: 'violet' },
  { status: 'confirmed', icon: CheckCircleIcon, tone: 'sky' },
  { status: 'packing', icon: BoxIcon, tone: 'indigo' },
];

const PIPE_STYLES: Record<string, { chip: string; grad: string }> = {
  amber: { chip: 'bg-amber-100 text-amber-600', grad: 'from-amber-50 to-white' },
  violet: { chip: 'bg-violet-100 text-violet-600', grad: 'from-violet-50 to-white' },
  sky: { chip: 'bg-sky-100 text-sky-600', grad: 'from-sky-50 to-white' },
  indigo: { chip: 'bg-indigo-100 text-indigo-600', grad: 'from-indigo-50 to-white' },
};

/* ---------- เหรียญอันดับสินค้าขายดี ---------- */

const RANK_STYLES: Record<number, string> = {
  0: 'bg-amber-100 text-amber-700 ring-amber-200',
  1: 'bg-slate-100 text-slate-600 ring-slate-300',
  2: 'bg-orange-100 text-orange-700 ring-orange-200',
};

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const full = ctx.features.analytics_dashboard;

  const supabase = await createClient();
  const [summary, statusCounts, lowStock, { count: sampleCount }, { count: ownProductCount }] =
    await Promise.all([
      getStoreSalesSummary(ctx.tenantId),
      getStoreOrderStatusCounts(ctx.tenantId),
      getLowStockVariants(ctx.tenantId),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', ctx.tenantId)
        .eq('is_sample', true),
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', ctx.tenantId)
        .eq('is_sample', false),
    ]);

  // onboarding checklist — โชว์จนกว่าจะครบ 3 ข้อ (ร้านใหม่เห็นทางไปต่อชัดๆ)
  const promptpaySet = !!ctx.store.promptpay_id?.trim();
  // ร้านโหมดแชท (pack ธุรกิจบริการ / T1 ปิดขายผ่านเว็บโดยเจตนา) — ไม่ต้องนู้ดเรื่อง PromptPay
  // แต่หัวใจของโหมดนี้คือช่องทางติดต่อ (โซเชียล/LINE) แทน
  const chatMode = ctx.featureOverrides?.['online_ordering'] === false;
  const contentForChecklist = getThemeContent(ctx.store.theme_overrides);
  const hasContactChannel =
    Object.values(contentForChecklist.socials ?? {}).some((v) => !!v) ||
    !!contentForChecklist.contact?.lineUrl ||
    !!contentForChecklist.contact?.facebookUrl;
  const onboardingSteps = [
    chatMode
      ? {
          done: hasContactChannel,
          label: 'เพิ่มช่องทางติดต่อ (LINE / โซเชียล)',
          sub: 'ร้านโหมดแนะนำบริการ — ลูกค้าติดต่องานผ่านแชท ตั้งลิงก์ที่ ตั้งค่าร้าน > โซเชียลของร้าน หรือ เนื้อหาเว็บ',
          href: '/admin/settings',
        }
      : {
          done: promptpaySet,
          label: 'ตั้ง PromptPay รับเงิน',
          sub: promptpaySet
            ? 'ร้านรับเงินได้แล้ว'
            : 'สำคัญที่สุด — ระหว่างยังไม่ตั้ง ระบบปิดปุ่มสั่งซื้อบนหน้าร้านให้ชั่วคราว',
          href: '/admin/settings',
        },
    {
      done: (ownProductCount ?? 0) > 0,
      label: 'มีสินค้าของคุณเองอย่างน้อย 1 ชิ้น',
      sub: 'แก้สินค้าตัวอย่างให้เป็นของคุณ หรือเพิ่มสินค้าใหม่',
      href: '/admin/products',
    },
    {
      done: !!ctx.store.address?.trim(),
      label: 'ใส่ที่อยู่/ข้อมูลติดต่อร้าน',
      sub: 'แสดงท้ายหน้าร้านให้ลูกค้าเชื่อถือและติดต่อได้',
      href: '/admin/settings',
    },
  ];
  const onboardingIncomplete = onboardingSteps.some((s) => !s.done);

  let daily: DailySalesPoint[] = [];
  let weekly: WeeklySalesPoint[] = [];
  let top: TopProduct[] = [];
  if (full) {
    [daily, weekly, top] = await Promise.all([
      getStoreDailySales(ctx.tenantId),
      getStoreWeeklySales(ctx.tenantId),
      getStoreTopProducts(ctx.tenantId),
    ]);
  }

  const totalPending = PIPELINE.reduce((sum, p) => sum + (statusCounts[p.status] ?? 0), 0);
  const maxRev = Math.max(...top.map((p) => p.revenue), 1);

  return (
    <div className="space-y-8">
      <PageHeader title="แดชบอร์ด" description="ข้อมูล 30 วันล่าสุด (เวลาไทย)" />

      {/* ยังไม่ตั้ง PromptPay = รับเงินไม่ได้ — เตือนแรงสุดก่อนทุกอย่าง (ยกเว้นร้านโหมดแชทที่ปิดขายผ่านเว็บโดยเจตนา) */}
      {!promptpaySet && !chatMode && (
        <div className="rounded-xl border-2 border-rose-300 bg-rose-50 px-4 py-3.5">
          <p className="text-sm font-bold text-rose-800">
            ⚠️ ร้านของคุณยังรับเงินไม่ได้ — ยังไม่ได้ตั้ง PromptPay
          </p>
          <p className="mt-1 text-sm font-medium text-rose-700">
            ระบบปิดปุ่มสั่งซื้อบนหน้าร้านให้ชั่วคราว (ลูกค้ายังเข้าชมสินค้าได้ปกติ) —
            ตั้งเบอร์ PromptPay ของร้านที่{' '}
            <Link href="/admin/settings" className="font-bold underline">
              ตั้งค่าร้าน
            </Link>{' '}
            แล้วปุ่มสั่งซื้อจะเปิดให้อัตโนมัติทันที
          </p>
        </div>
      )}

      {/* onboarding checklist — 3 ก้าวแรกของร้านใหม่ */}
      {onboardingIncomplete && (
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
          <p className="text-sm font-bold text-indigo-900">
            เริ่มต้นร้านให้พร้อมขาย (
            {onboardingSteps.filter((s) => s.done).length}/{onboardingSteps.length})
          </p>
          <ul className="mt-3 space-y-2.5">
            {onboardingSteps.map((step) => (
              <li key={step.label} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    step.done
                      ? 'bg-emerald-500 text-white'
                      : 'border-2 border-indigo-300 bg-white text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 text-sm">
                  <Link
                    href={step.href}
                    className={`font-semibold ${
                      step.done ? 'text-gray-400 line-through' : 'text-gray-900 hover:text-indigo-600'
                    }`}
                  >
                    {step.label}
                  </Link>
                  {!step.done && <span className="block text-xs font-medium text-gray-500">{step.sub}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ข้อมูลตัวอย่างจาก starter pack — โชว์จนกว่าจะแก้เป็นของจริง/ลบหมด */}
      {(sampleCount ?? 0) > 0 && <SampleDataBanner productCount={sampleCount ?? 0} />}

      {/* การ์ดตัวเลขสรุป — นับเฉพาะออร์เดอร์ยืนยันแล้ว */}
      <div className={`grid gap-4 sm:grid-cols-2 ${full ? 'lg:grid-cols-3' : ''}`}>
        <StatTile
          label="ยอดขาย 30 วัน"
          value={formatBaht(summary.revenue)}
          sub="เฉพาะออร์เดอร์ที่ยืนยันแล้ว"
          icon={<BahtIcon size={22} />}
          tone="emerald"
        />
        <StatTile
          label="ออร์เดอร์ 30 วัน"
          value={summary.order_count.toLocaleString('th-TH')}
          icon={<OrdersIcon size={22} />}
          tone="indigo"
        />
        {full && (
          <StatTile
            label="ยอดเฉลี่ยต่อออร์เดอร์"
            value={formatBaht(summary.avg_order_value)}
            icon={<StarIcon size={20} />}
            tone="violet"
          />
        )}
      </div>

      {/* ออร์เดอร์ค้างต่อสถานะ */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900">ออร์เดอร์ที่ต้องดำเนินการ</h2>
          {totalPending > 0 && (
            <span className="text-xs font-medium text-gray-500">
              ค้างรวม {totalPending.toLocaleString('th-TH')} รายการ
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PIPELINE.map(({ status, icon: Icon, tone }) => {
            const s = PIPE_STYLES[tone];
            const count = statusCounts[status] ?? 0;
            return (
              <Link
                key={status}
                href={`/admin/orders?status=${status}`}
                className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br ${s.grad} p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ring-4 ring-white/70 ${s.chip}`}
                  >
                    <Icon size={18} />
                  </span>
                  <ChevronRight className="text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-gray-500" />
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
                  {count.toLocaleString('th-TH')}
                </p>
                <p className="mt-0.5 text-xs font-medium text-gray-500 group-hover:text-gray-700">
                  {ORDER_STATUS_TH[status]}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* กราฟ + สินค้าขายดี (เฉพาะแพลนที่เปิด analytics_dashboard) */}
      {full ? (
        <>
          <SalesCharts daily={daily} weekly={weekly} />

          <Card
            title="สินค้าขายดี"
            description="เรียงตามยอดขาย 30 วันล่าสุด"
            padded={false}
          >
            {top.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-violet-50 text-violet-500">
                  <StarIcon size={20} />
                </span>
                <p className="text-sm font-medium text-gray-500">ยังไม่มีข้อมูลการขายในช่วง 30 วันนี้</p>
              </div>
            ) : (
              <ol className="divide-y divide-gray-100">
                {top.map((p, i) => (
                  <li key={p.product_name} className="flex items-center gap-4 px-5 py-3.5">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1 ring-inset ${
                        RANK_STYLES[i] ?? 'bg-indigo-50 text-indigo-500 ring-indigo-100'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{p.product_name}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400"
                          style={{ width: `${Math.max((p.revenue / maxRev) * 100, 4)}%` }}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-gray-900">{formatBaht(p.revenue)}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{p.qty.toLocaleString('th-TH')} ชิ้น</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-white p-8 text-center shadow-sm">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" />
          <div className="relative">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-600 shadow-sm ring-4 ring-white/80">
              <StarIcon size={22} />
            </span>
            <p className="text-sm font-semibold text-gray-800">
              กราฟยอดขายรายวัน/รายสัปดาห์ และสินค้าขายดี มีในแพลน Pro ขึ้นไป
            </p>
            <p className="mt-1 text-xs text-gray-500">
              ปลดล็อกการวิเคราะห์ยอดขายแบบเต็มเพื่อดูแนวโน้มและสินค้าทำเงิน
            </p>
            <Link href="/admin/plan" className={`${btnPrimary} mt-5`}>
              อัปเกรดแพลน
            </Link>
          </div>
        </div>
      )}

      {/* แถบเตือนสต๊อกใกล้หมด */}
      <Card
        title="สต๊อกใกล้หมด"
        description="ต่ำกว่าเกณฑ์เตือนที่ตั้งไว้ต่อตัวเลือกสินค้า"
        actions={lowStock.length > 0 ? <Badge tone="warning">{lowStock.length} รายการ</Badge> : undefined}
        padded={false}
      >
        {lowStock.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState icon={<CheckCircleIcon size={22} />} title="สต๊อกทุกรายการอยู่ในระดับปกติ" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className={thClass}>สินค้า</th>
                  <th className={thClass}>ตัวเลือก</th>
                  <th className={`${thClass} text-right`}>คงเหลือ</th>
                  <th className={`${thClass} text-right`}>เกณฑ์เตือน</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((v) => (
                  <tr key={`${v.productId}-${v.label}`} className={trHover}>
                    <td className={tdClass}>
                      <Link
                        href={`/admin/products/${v.productId}`}
                        className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                      >
                        {v.productName}
                      </Link>
                    </td>
                    <td className={`${tdClass} text-gray-500`}>{v.label}</td>
                    <td className={`${tdClass} text-right`}>
                      {v.stock === 0 ? (
                        <Badge tone="danger">
                          <AlertIcon size={11} />
                          หมด
                        </Badge>
                      ) : (
                        <Badge tone="warning">เหลือ {v.stock.toLocaleString('th-TH')}</Badge>
                      )}
                    </td>
                    <td className={`${tdClass} text-right text-gray-400`}>{v.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
