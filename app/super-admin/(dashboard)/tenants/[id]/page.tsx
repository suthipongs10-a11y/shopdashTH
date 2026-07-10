// หน้า detail ร้าน (§2.4) — ข้อมูลร้าน + เปลี่ยนสถานะ/แพลน + feature overrides +
// ประวัติ subscription + audit log ต่อร้าน

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatBaht, formatThaiDate, formatThaiDateTime } from '@/lib/format';
import { resolveFeatures } from '@/lib/features';
import { fetchTenantById, TENANT_STATUS_TH } from '@/lib/platform/tenant-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { OverridesPanel, PlanPanel, StatusPanel, TrialPanel } from './tenant-panels';

export const dynamic = 'force-dynamic';

function tenantBaseUrl(slug: string): string {
  if (process.env.NODE_ENV === 'development') return `http://${slug}.localhost:3000`;
  return `https://${slug}.${process.env.ROOT_DOMAIN ?? 'shopdash.co'}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await fetchTenantById(id);
  if (!tenant) notFound();

  const db = createAdminClient();
  const [{ data: plans }, { data: subs }, { data: logs }, { data: themeRow }] = await Promise.all([
    db.from('plans').select('id, name_th, price_yearly').eq('is_active', true).order('price_yearly'),
    db
      .from('tenant_subscriptions')
      .select('id, amount, status, reject_reason_th, period_start, period_end, approved_at, created_at, plans(name_th)')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    db
      .from('provisioning_logs')
      .select('id, step, status, detail, created_at')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    db
      .from('theme_registry')
      .select('feature_defaults')
      .eq('code', tenant.stores?.theme_code ?? 'basic-01')
      .maybeSingle(),
  ]);

  const resolved = resolveFeatures(
    tenant.plans,
    { feature_overrides: tenant.feature_overrides ?? {} },
    { feature_defaults: (themeRow?.feature_defaults as Record<string, unknown> | null) ?? null },
  );

  const baseUrl = tenantBaseUrl(tenant.slug);
  const expiry = tenant.status === 'trial' ? tenant.trial_ends_at : tenant.subscription_ends_at;

  interface SubRow {
    id: string;
    amount: number;
    status: string;
    reject_reason_th: string | null;
    period_start: string;
    period_end: string;
    approved_at: string | null;
    created_at: string;
    plans: { name_th: string } | null;
  }
  const subRows = (subs ?? []) as unknown as SubRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/tenants" className="text-xs text-gray-400 hover:text-gray-600">
            ← ร้านค้าทั้งหมด
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            {tenant.stores?.name ?? tenant.slug}
          </h1>
          <p className="text-sm text-gray-500">
            {tenant.slug} · แพลน {tenant.plans.name_th} · สถานะ {TENANT_STATUS_TH[tenant.status]}
            {expiry && ` · หมดอายุ ${formatThaiDate(expiry)}`}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a
            href={baseUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
          >
            เปิดหน้าร้าน ↗
          </a>
          <a
            href={`${baseUrl}/admin`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-100"
          >
            เปิดหลังร้าน ↗
          </a>
        </div>
      </div>

      <Section title="สถานะร้าน (lock / unlock / เปลี่ยนมือ)">
        <StatusPanel tenantId={tenant.id} currentStatus={tenant.status} />
        {tenant.locked_at && (
          <p className="mt-2 text-xs text-gray-400">
            ถูกระงับเมื่อ {formatThaiDateTime(tenant.locked_at)} — เกิน 60 วันจะถูกปิดถาวรโดย cron
          </p>
        )}
        <div className="mt-4 border-t border-gray-100 pt-4">
          <TrialPanel tenantId={tenant.id} trialEndsAt={tenant.trial_ends_at} />
          {tenant.trial_ends_at && (
            <p className="mt-1 text-xs text-gray-400">
              ทดลองใช้ถึง {formatThaiDateTime(tenant.trial_ends_at)}
            </p>
          )}
        </div>
      </Section>

      <Section title="แพลน">
        <PlanPanel tenantId={tenant.id} currentPlanId={tenant.plans.id} plans={plans ?? []} />
      </Section>

      <Section title="Feature overrides รายร้าน (ชนะค่าแพลน/ธีม)">
        <OverridesPanel
          tenantId={tenant.id}
          overrides={tenant.feature_overrides ?? {}}
          resolved={resolved}
        />
      </Section>

      <Section title="ประวัติการชำระค่าแพลน">
        {subRows.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีรายการ</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 font-medium">วันที่ส่ง</th>
                <th className="py-2 font-medium">แพลน</th>
                <th className="py-2 font-medium">ยอด</th>
                <th className="py-2 font-medium">รอบ</th>
                <th className="py-2 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {subRows.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 text-gray-500">{formatThaiDateTime(s.created_at)}</td>
                  <td className="py-2 text-gray-700">{s.plans?.name_th ?? '-'}</td>
                  <td className="py-2 text-gray-900">{formatBaht(s.amount)}</td>
                  <td className="py-2 text-gray-500">
                    {formatThaiDate(s.period_start)} – {formatThaiDate(s.period_end)}
                  </td>
                  <td className="py-2">
                    {s.status === 'approved' && (
                      <span className="text-green-700">อนุมัติแล้ว</span>
                    )}
                    {s.status === 'pending' && <span className="text-yellow-700">รอตรวจ</span>}
                    {s.status === 'rejected' && (
                      <span className="text-red-600" title={s.reject_reason_th ?? ''}>
                        ปฏิเสธ
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Audit log">
        {(logs ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีรายการ</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {(logs ?? []).map((log) => (
              <li key={log.id} className="flex gap-3">
                <span className="shrink-0 text-gray-400">{formatThaiDateTime(log.created_at)}</span>
                <span className={log.status === 'ok' ? 'text-gray-700' : 'text-red-600'}>
                  <span className="font-medium">{log.step}</span>{' '}
                  <span className="break-all text-gray-500">{JSON.stringify(log.detail)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
