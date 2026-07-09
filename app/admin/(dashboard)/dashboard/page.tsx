// แดชบอร์ด Store Admin (§5.2) — สรุปพื้นฐานทุกแพลน + กราฟ/สินค้าขายดีเฉพาะแพลนที่เปิด
// analytics_dashboard (Pro/Premium §5.1). ตัวเลขทั้งหมดนับเฉพาะออร์เดอร์ยืนยันแล้ว (confirmed+)

import Link from 'next/link';
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
const PIPELINE: OrderStatus[] = ['pending_payment', 'slip_uploaded', 'confirmed', 'packing'];

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

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
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-gray-900">แดชบอร์ด</h1>
        <span className="text-xs text-gray-400">ข้อมูล 30 วันล่าสุด (เวลาไทย)</span>
      </div>

      {/* การ์ดตัวเลขสรุป — นับเฉพาะออร์เดอร์ยืนยันแล้ว */}
      <div className={`grid gap-4 sm:grid-cols-2 ${full ? 'lg:grid-cols-3' : ''}`}>
        <StatCard label="ยอดขาย 30 วัน" value={formatBaht(summary.revenue)} hint="เฉพาะออร์เดอร์ที่ยืนยันแล้ว" />
        <StatCard label="ออร์เดอร์ 30 วัน" value={summary.order_count.toLocaleString('th-TH')} />
        {full && (
          <StatCard label="ยอดเฉลี่ยต่อออร์เดอร์" value={formatBaht(summary.avg_order_value)} />
        )}
      </div>

      {/* ออร์เดอร์ค้างต่อสถานะ */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-700">ออร์เดอร์ที่ต้องดำเนินการ</h2>
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {PIPELINE.map((s) => (
            <Link
              key={s}
              href={`/admin/orders?status=${s}`}
              className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:bg-gray-50"
            >
              <p className="text-2xl font-semibold text-gray-900">
                {(statusCounts[s] ?? 0).toLocaleString('th-TH')}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{ORDER_STATUS_TH[s]}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* กราฟ + สินค้าขายดี (เฉพาะแพลนที่เปิด analytics_dashboard) */}
      {full ? (
        <>
          <SalesCharts daily={daily} weekly={weekly} />

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-gray-700">สินค้าขายดี (30 วัน)</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              {top.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-gray-500">
                  ยังไม่มีข้อมูลการขายในช่วง 30 วันนี้
                </p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">#</th>
                      <th className="px-4 py-2 font-medium">สินค้า</th>
                      <th className="px-4 py-2 text-right font-medium">จำนวนที่ขาย</th>
                      <th className="px-4 py-2 text-right font-medium">ยอดขาย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {top.map((p, i) => (
                      <tr key={p.product_name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.product_name}</td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {p.qty.toLocaleString('th-TH')} ชิ้น
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatBaht(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
          <p className="text-sm text-gray-600">
            กราฟยอดขายรายวัน/รายสัปดาห์ และสินค้าขายดี มีในแพลน Pro ขึ้นไป
          </p>
          <Link
            href="/admin/plan"
            className="mt-3 inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            อัปเกรดแพลน
          </Link>
        </div>
      )}

      {/* แถบเตือนสต๊อกใกล้หมด */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-700">สต๊อกใกล้หมด</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          {lowStock.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              สต๊อกทุกรายการอยู่ในระดับปกติ
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">สินค้า</th>
                  <th className="px-4 py-2 font-medium">ตัวเลือก</th>
                  <th className="px-4 py-2 text-right font-medium">คงเหลือ</th>
                  <th className="px-4 py-2 text-right font-medium">เกณฑ์เตือน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStock.map((v) => (
                  <tr key={`${v.productId}-${v.label}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${v.productId}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {v.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{v.label}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`font-medium ${v.stock === 0 ? 'text-red-600' : 'text-yellow-700'}`}
                      >
                        {v.stock.toLocaleString('th-TH')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{v.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
