// คิวคำขอโดเมน (บริการ ฿590/ปี — migration 017) — Super Admin จัดการทุกขั้นตอนให้ร้าน
// สองคิว: รอตรวจสลิป (เก่าสุดก่อน) + กำลังดำเนินการ / ท้ายหน้า: โดเมนใกล้หมดอายุ + ประวัติล่าสุด

import { RENEWAL_WINDOW_DAYS, type DomainRequestRow } from '@/lib/domain-requests';
import { formatThaiDate, formatThaiDateTime } from '@/lib/format';
import { presignGetUrl } from '@/lib/r2';
import { createAdminClient } from '@/lib/supabase/admin';
import { DomainRequestCard, type DomainRequestItem } from './domain-request-card';

export const dynamic = 'force-dynamic';

interface RequestRowJoined extends DomainRequestRow {
  tenants: { slug: string; stores: { name: string } | null } | null;
}

const HISTORY_STATUS_TH: Record<string, string> = {
  completed: 'เสร็จสิ้น',
  rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิก',
};

async function toItem(row: RequestRowJoined): Promise<DomainRequestItem> {
  return {
    id: row.id,
    storeName: row.tenants?.stores?.name ?? row.tenants?.slug ?? '-',
    slug: row.tenants?.slug ?? '-',
    domain: row.domain,
    kind: row.kind,
    amount: row.amount,
    status: row.status as 'slip_uploaded' | 'in_progress',
    note: row.note,
    slipUrl: row.slip_r2_key ? await presignGetUrl(row.slip_r2_key) : null,
    createdAtText: formatThaiDateTime(row.created_at),
  };
}

export default async function DomainRequestsPage() {
  const db = createAdminClient();
  const select = 'id, tenant_id, kind, domain, note, amount, status, slip_r2_key, reject_reason_th, created_at, tenants(slug, stores(name))';

  const soonCutoff = new Date(Date.now() + RENEWAL_WINDOW_DAYS * 86_400_000).toISOString();
  const [{ data: pendingData }, { data: workingData }, { data: historyData }, { data: expiringData }] =
    await Promise.all([
      db.from('domain_requests').select(select).eq('status', 'slip_uploaded').order('created_at', { ascending: true }),
      db.from('domain_requests').select(select).eq('status', 'in_progress').order('created_at', { ascending: true }),
      db
        .from('domain_requests')
        .select(select)
        .in('status', ['completed', 'rejected', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(15),
      db
        .from('custom_domains')
        .select('domain, service_ends_at, tenants(slug, stores(name))')
        .eq('managed', true)
        .not('service_ends_at', 'is', null)
        .lte('service_ends_at', soonCutoff)
        .order('service_ends_at', { ascending: true }),
    ]);

  const pending = await Promise.all(((pendingData ?? []) as unknown as RequestRowJoined[]).map(toItem));
  const working = await Promise.all(((workingData ?? []) as unknown as RequestRowJoined[]).map(toItem));
  const history = (historyData ?? []) as unknown as RequestRowJoined[];
  const expiring = (expiringData ?? []) as unknown as {
    domain: string;
    service_ends_at: string;
    tenants: { slug: string; stores: { name: string } | null } | null;
  }[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-xl font-semibold text-gray-900">คำขอโดเมน</h1>
        <p className="text-sm text-gray-500">
          บริการโดเมนส่วนตัว ฿590/ปี — ทีมงานจดโดเมน/ตั้ง DNS/เชื่อม Vercel ให้ร้าน แล้วกด
          "ทำเสร็จ" เพื่อเปิดใช้
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          รอตรวจสลิป {pending.length > 0 && <span className="text-rose-600">({pending.length})</span>}
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            ไม่มีสลิปรอตรวจ
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((item) => (
              <DomainRequestCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          กำลังดำเนินการ {working.length > 0 && <span className="text-indigo-600">({working.length})</span>}
        </h2>
        {working.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            ไม่มีงานค้าง
          </div>
        ) : (
          <div className="space-y-4">
            {working.map((item) => (
              <DomainRequestCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {expiring.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            โดเมนใกล้หมดอายุ (ภายใน {RENEWAL_WINDOW_DAYS} วัน)
          </h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-300 bg-white text-sm shadow-sm">
            {expiring.map((d) => (
              <li key={d.domain} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="font-medium text-gray-900">{d.domain}</span>
                <span className="text-xs text-gray-500">
                  {d.tenants?.stores?.name ?? d.tenants?.slug ?? '-'}
                </span>
                <span className="ml-auto text-xs font-medium text-amber-700">
                  หมดอายุ {formatThaiDate(d.service_ends_at)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            ร้านจะเห็นปุ่ม "ต่ออายุ ฿590/ปี" ในหลังร้านของตัวเองช่วงนี้ — ถ้าร้านไม่ต่อ ให้ติดต่อร้านก่อนปิดโดเมน
          </p>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">ประวัติล่าสุด</h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-300 bg-white text-sm shadow-sm">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <span className="font-medium text-gray-900">{r.domain}</span>
                <span className="text-xs text-gray-500">
                  {r.tenants?.stores?.name ?? r.tenants?.slug ?? '-'} ·{' '}
                  {r.kind === 'renewal' ? 'ต่ออายุ' : 'จดใหม่'}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    r.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : r.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {HISTORY_STATUS_TH[r.status] ?? r.status}
                </span>
                {r.reject_reason_th && (
                  <span className="text-xs text-rose-600">— {r.reject_reason_th}</span>
                )}
                <span className="ml-auto text-xs text-gray-400">
                  {formatThaiDateTime(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
