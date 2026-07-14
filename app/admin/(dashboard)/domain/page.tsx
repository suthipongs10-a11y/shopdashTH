// Custom domain (งาน 4.8 — §2.4 v1.1) — เจ้าของร้าน + แพลนที่มีฟีเจอร์ custom_domain

import { getStoreUser, userRole } from '@/lib/auth';
import { cnameTarget, getCustomDomain, VERCEL_APEX_A } from '@/lib/domains';
import { formatThaiDateTime } from '@/lib/format';
import { getTenantContext } from '@/lib/tenant-context';
import { DomainForm, VerifyButton } from './domain-client';

export const dynamic = 'force-dynamic';

const STATUS_TH: Record<string, { label: string; tone: string }> = {
  pending: { label: 'รอตั้งค่า DNS', tone: 'bg-gray-100 text-gray-600' },
  verifying: { label: 'กำลังตรวจสอบ', tone: 'bg-indigo-50 text-indigo-700' },
  verified: { label: 'ยืนยันเจ้าของแล้ว (รอชี้ DNS)', tone: 'bg-amber-50 text-amber-700' },
  active: { label: 'ใช้งานได้', tone: 'bg-emerald-50 text-emerald-700' },
  error: { label: 'ตั้งค่าไม่ถูกต้อง', tone: 'bg-rose-50 text-rose-700' },
  suspended: { label: 'พักการใช้งาน (ตามแพลน)', tone: 'bg-gray-100 text-gray-500' },
};

const REGISTRAR_GUIDES = [
  { name: 'GoDaddy', url: 'https://th.godaddy.com/help/manage-dns-records-680' },
  { name: 'Namecheap', url: 'https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/' },
  { name: 'Cloudflare', url: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/' },
];

export default async function DomainPage() {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);

  if (user && userRole(user) !== 'store_owner') {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        เฉพาะเจ้าของร้านเท่านั้นที่ตั้งค่าโดเมนได้
      </div>
    );
  }

  if (!ctx.features.custom_domain) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h1 className="text-lg font-semibold text-gray-900">โดเมนของตัวเอง</h1>
        <p className="mt-2 text-sm text-gray-500">
          ฟีเจอร์นี้ใช้ได้กับแพลน Pro ขึ้นไป —{' '}
          <a href="/admin/plan" className="font-medium text-gray-900 underline underline-offset-2">
            อัปเกรดแพลน
          </a>{' '}
          เพื่อเปิดใช้งาน
        </p>
      </div>
    );
  }

  const domain = await getCustomDomain(ctx.tenantId);
  const status = domain ? STATUS_TH[domain.status] : null;
  const rootDomain = process.env.ROOT_DOMAIN ?? 'shopdashth.com';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">โดเมนของตัวเอง</h1>
        <p className="mt-1 text-sm text-gray-500">
          subdomain {ctx.slug}.{rootDomain} ยังใช้งานได้ปกติเสมอ — custom domain เป็นการเพิ่มช่องทาง
          ไม่ใช่แทนที่
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
        <DomainForm currentDomain={domain?.domain ?? null} />
      </section>

      {domain && (
        <>
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900">{domain.domain}</h2>
              {status && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${status.tone}`}>
                  {status.label}
                </span>
              )}
              {domain.checked_at && (
                <span className="text-xs text-gray-400">
                  ตรวจล่าสุด {formatThaiDateTime(domain.checked_at)}
                </span>
              )}
            </div>

            {domain.last_error_th && domain.status !== 'active' && (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {domain.last_error_th}
              </p>
            )}

            <h3 className="mb-2 text-sm font-medium text-gray-700">
              ตั้งค่า DNS ที่ผู้ให้บริการโดเมนของคุณ (registrar):
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="py-2 pr-4 font-medium">ประเภท</th>
                    <th className="py-2 pr-4 font-medium">Host/Name</th>
                    <th className="py-2 font-medium">ค่า (Value)</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">TXT</td>
                    <td className="py-2 pr-4">@ (หรือชื่อโดเมน)</td>
                    <td className="py-2 break-all">shopdash-verify={domain.verification_token}</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">CNAME</td>
                    <td className="py-2 pr-4">www (หรือ subdomain ที่ใช้)</td>
                    <td className="py-2">{cnameTarget()}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">A</td>
                    <td className="py-2 pr-4">@ (เฉพาะโดเมนหลักไม่มี www)</td>
                    <td className="py-2">{VERCEL_APEX_A}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              คู่มือการตั้งค่า DNS:{' '}
              {REGISTRAR_GUIDES.map((g, i) => (
                <span key={g.name}>
                  {i > 0 && ' · '}
                  <a href={g.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    {g.name}
                  </a>
                </span>
              ))}
            </p>
          </section>

          {domain.status !== 'suspended' && (
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
              <VerifyButton />
            </section>
          )}
        </>
      )}
    </div>
  );
}
