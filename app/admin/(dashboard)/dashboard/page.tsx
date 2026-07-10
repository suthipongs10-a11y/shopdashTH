// แดชบอร์ด Store Admin (§5.2) — สรุปพื้นฐานทุกแพลน + กราฟ/สินค้าขายดีเฉพาะแพลนที่เปิด
// analytics_dashboard (Pro/Premium §5.1). ตัวเลขทั้งหมดนับเฉพาะออร์เดอร์ยืนยันแล้ว (confirmed+)

import Link from 'next/link';
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
import {
  Badge,
  btnPrimary,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  tdClass,
  thClass,
  trHover,
} from '@/components/admin/ui';
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
import { getTenantContext } from '@/lib/tenant-context';
import { SalesCharts } from './sales-charts';

export const dynamic = 'force-dynamic';

// สถานะที่ต้อง "ตามงาน" (ยังไม่ปิดจบ) — แสดงเป็นการ์ดค้างต่อสถานะ
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

const PIPE_TONES: Record<string, string> = {
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  sky: 'bg-sky-50 text-sky-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};

export default async function DashboardPage() {
  const ctx = await getTenantContext();
  const full = ctx.features.analytics_dashboard;

  const [summary, statusCounts, lowStock] = await Promise.all([
    getStoreSalesSummary(ctx.tenantId),
    getStoreOrderStatusCounts(ctx.tenantId),
    getLowStockVariants(ctx.tenantId),
  ]);

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

  return (
    <div className="space-y-8">
      <PageHeader title="แดชบอร์ด" description="ข้อมูล 30 วันล่าสุด (เวลาไทย)" />

      {/* การ์ดตัวเลขสรุป — นับเฉพาะออร์เดอร์ยืนยันแล้ว */}
      <div className={`grid gap-4 sm:grid-cols-2 ${full ? 'lg:grid-cols-3' : ''}`}>
        <StatCard
          label="ยอดขาย 30 วัน"
          value={formatBaht(summary.revenue)}
          sub="เฉพาะออร์เดอร์ที่ยืนยันแล้ว"
          icon={<BahtIcon size={20} />}
          tone="emerald"
        />
        <StatCard
          label="ออร์เดอร์ 30 วัน"
          value={summary.order_count.toLocaleString('th-TH')}
          icon={<OrdersIcon size={20} />}
          tone="indigo"
        />
        {full && (
          <StatCard
            label="ยอดเฉลี่ยต่อออร์เดอร์"
            value={formatBaht(summary.avg_order_value)}
            icon={<StarIcon size={18} />}
            tone="violet"
          />
        )}
      </div>

      {/* ออร์เดอร์ค้างต่อสถานะ */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">ออร์เดอร์ที่ต้องดำเนินการ</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PIPELINE.map(({ status, icon: Icon, tone }) => (
            <Link
              key={status}
              href={`/admin/orders?status=${status}`}
              className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <span
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${PIPE_TONES[tone]}`}
              >
                <Icon size={18} />
              </span>
              <p className="text-2xl font-bold tracking-tight text-gray-900">
                {(statusCounts[status] ?? 0).toLocaleString('th-TH')}
              </p>
              <p className="mt-0.5 text-xs text-gray-500 group-hover:text-indigo-600">
                {ORDER_STATUS_TH[status]}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* กราฟ + สินค้าขายดี (เฉพาะแพลนที่เปิด analytics_dashboard) */}
      {full ? (
        <>
          <SalesCharts daily={daily} weekly={weekly} />

          <Card title="สินค้าขายดี (30 วัน)" padded={false}>
            {top.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">
                ยังไม่มีข้อมูลการขายในช่วง 30 วันนี้
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className={thClass}>#</th>
                    <th className={thClass}>สินค้า</th>
                    <th className={`${thClass} text-right`}>จำนวนที่ขาย</th>
                    <th className={`${thClass} text-right`}>ยอดขาย</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((p, i) => (
                    <tr key={p.product_name} className={trHover}>
                      <td className={`${tdClass} text-gray-400`}>{i + 1}</td>
                      <td className={`${tdClass} font-medium text-gray-900`}>{p.product_name}</td>
                      <td className={`${tdClass} text-right`}>
                        {p.qty.toLocaleString('th-TH')} ชิ้น
                      </td>
                      <td className={`${tdClass} text-right font-semibold text-gray-900`}>
                        {formatBaht(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-8 text-center">
          <p className="text-sm font-medium text-gray-700">
            กราฟยอดขายรายวัน/รายสัปดาห์ และสินค้าขายดี มีในแพลน Pro ขึ้นไป
          </p>
          <Link href="/admin/plan" className={`${btnPrimary} mt-4`}>
            อัปเกรดแพลน
          </Link>
        </div>
      )}

      {/* แถบเตือนสต๊อกใกล้หมด */}
      <Card
        title="สต๊อกใกล้หมด"
        description="ต่ำกว่าเกณฑ์เตือนที่ตั้งไว้ต่อตัวเลือกสินค้า"
        padded={false}
      >
        {lowStock.length === 0 ? (
          <div className="px-4 py-8">
            <EmptyState
              icon={<CheckCircleIcon size={22} />}
              title="สต๊อกทุกรายการอยู่ในระดับปกติ"
            />
          </div>
        ) : (
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
        )}
      </Card>
    </div>
  );
}
