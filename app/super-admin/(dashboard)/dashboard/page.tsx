// แดชบอร์ดแพลตฟอร์ม (§5.3) — MRR/ARR, ร้านใหม่ต่อเดือน, ใกล้หมดอายุ 30 วัน, churn
// ตัวเลขจาก RPC platform_summary/platform_new_stores (migration 005)

import Link from 'next/link';
import { getPlatformNewStores, getPlatformSummary } from '@/lib/analytics';
import { formatBaht, formatThaiDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { NewStoresChart } from './new-stores-chart';

export const dynamic = 'force-dynamic';

interface ExpiringRow {
  id: string;
  slug: string;
  subscription_ends_at: string;
  plans: { name_th: string } | null;
  stores: { name: string } | null;
}

async function fetchExpiring(): Promise<ExpiringRow[]> {
  const db = createAdminClient();
  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const { data } = await db
    .from('tenants')
    .select('id, slug, subscription_ends_at, plans(name_th), stores(name)')
    .eq('status', 'active')
    .not('subscription_ends_at', 'is', null)
    .gte('subscription_ends_at', now.toISOString())
    .lte('subscription_ends_at', in30.toISOString())
    .order('subscription_ends_at', { ascending: true });
  return (data ?? []) as unknown as ExpiringRow[];
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export default async function PlatformDashboardPage() {
  const [summary, newStores, expiring] = await Promise.all([
    getPlatformSummary(),
    getPlatformNewStores(),
    fetchExpiring(),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">แดชบอร์ดแพลตฟอร์ม</h1>

      {/* รายได้ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="MRR (รายได้ต่อเดือน)" value={formatBaht(summary.mrr)} hint="จากค่าแพลนร้าน active" />
        <StatCard label="ARR (รายได้ต่อปี)" value={formatBaht(summary.arr)} />
        <StatCard
          label="ร้าน active"
          value={summary.active_stores.toLocaleString('th-TH')}
          hint={`ทั้งหมด ${summary.total_stores.toLocaleString('th-TH')} ร้าน`}
        />
        <StatCard
          label="churn 30 วัน"
          value={summary.churned_30d.toLocaleString('th-TH')}
          hint="ร้านที่ถูกล็อก/ปิดใน 30 วัน"
        />
      </div>

      {/* สถานะร้านย่อย */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ทดลองใช้ (trial)" value={summary.trial_stores.toLocaleString('th-TH')} />
        <StatCard label="ผ่อนผัน (grace)" value={summary.grace_stores.toLocaleString('th-TH')} />
        <StatCard label="ถูกล็อก (locked)" value={summary.locked_stores.toLocaleString('th-TH')} />
        <StatCard label="ปิดถาวร (archived)" value={summary.archived_stores.toLocaleString('th-TH')} />
      </div>

      {/* ร้านใหม่ต่อเดือน */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-700">ร้านใหม่ต่อเดือน (12 เดือนล่าสุด)</h2>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <NewStoresChart data={newStores} />
        </div>
      </section>

      {/* ใกล้หมดอายุ 30 วัน */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-700">
          ร้านใกล้หมดอายุใน 30 วัน ({expiring.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          {expiring.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              ไม่มีร้านที่ใกล้หมดอายุใน 30 วันนี้
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">ร้าน</th>
                  <th className="px-4 py-2 font-medium">แพลน</th>
                  <th className="px-4 py-2 font-medium">หมดอายุ</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expiring.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {t.stores?.name ?? t.slug}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.plans?.name_th ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatThaiDate(t.subscription_ends_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/tenants/${t.id}`}
                        className="text-xs font-medium text-gray-900 underline underline-offset-2"
                      >
                        จัดการ
                      </Link>
                    </td>
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
