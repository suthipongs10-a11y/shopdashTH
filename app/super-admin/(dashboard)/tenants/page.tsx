// ตารางร้านทั้งหมด (§2.4 MVP) — ชื่อ, slug, custom domain, แพลน, สถานะ, วันหมดอายุ,
// ยอดขายรวม 30 วัน (อ่านอย่างเดียว), ลิงก์เข้าดูร้าน

import Link from 'next/link';
import { formatBaht, formatThaiDate } from '@/lib/format';
import { TENANT_STATUS_TH, type TenantStatus } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface TenantListRow {
  id: string;
  slug: string;
  status: TenantStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  plans: { code: string; name_th: string } | null;
  stores: { name: string } | null;
  // tenant_id เป็น unique → PostgREST คืน object เดี่ยว/null (ไม่ใช่ array)
  custom_domains: { domain: string; status: string } | null;
}

const STATUS_BADGE: Record<TenantStatus, string> = {
  trial: 'bg-blue-50 text-blue-700',
  active: 'bg-green-50 text-green-700',
  grace: 'bg-yellow-50 text-yellow-700',
  locked: 'bg-red-50 text-red-700',
  archived: 'bg-gray-100 text-gray-500',
};

async function fetchSales30d(tenantIds: string[]): Promise<Map<string, number>> {
  const db = createAdminClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await db
    .from('orders')
    .select('tenant_id, total_amount')
    .in('tenant_id', tenantIds)
    .in('status', ['confirmed', 'packing', 'shipped'])
    .gte('created_at', since);

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    totals.set(row.tenant_id, (totals.get(row.tenant_id) ?? 0) + row.total_amount);
  }
  return totals;
}

export default async function TenantsPage() {
  const db = createAdminClient();
  const { data } = await db
    .from('tenants')
    .select(
      'id, slug, status, trial_ends_at, subscription_ends_at, created_at, plans(code, name_th), stores(name), custom_domains(domain, status)',
    )
    .order('created_at', { ascending: false });

  const tenants = (data ?? []) as unknown as TenantListRow[];
  const sales = tenants.length > 0 ? await fetchSales30d(tenants.map((t) => t.id)) : new Map();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">ร้านค้าทั้งหมด ({tenants.length})</h1>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">ร้าน</th>
              <th className="px-4 py-3 font-medium">subdomain / โดเมน</th>
              <th className="px-4 py-3 font-medium">แพลน</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">หมดอายุ</th>
              <th className="px-4 py-3 text-right font-medium">ยอดขาย 30 วัน</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => {
              const expiry = t.status === 'trial' ? t.trial_ends_at : t.subscription_ends_at;
              const domain =
                t.custom_domains?.status === 'active' ? t.custom_domains.domain : undefined;
              return (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {t.stores?.name ?? '(ยังไม่ตั้งชื่อ)'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.slug}
                    {domain && <span className="ml-2 text-xs text-gray-400">({domain})</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{t.plans?.name_th ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[t.status]}`}
                    >
                      {TENANT_STATUS_TH[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {expiry ? formatThaiDate(expiry) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatBaht(sales.get(t.id) ?? 0)}
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
              );
            })}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  ยังไม่มีร้านค้าในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
