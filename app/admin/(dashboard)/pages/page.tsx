// หน้าเพจ/บทความของร้าน (Phase 6) — flag `custom_pages` (แพลนธุรกิจขึ้นไป)

import Link from 'next/link';
import { formatThaiDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { deletePage } from './actions';
import { PageForm } from './page-form';

export const dynamic = 'force-dynamic';

interface PageListRow {
  id: string;
  slug: string;
  title: string;
  show_in_nav: boolean;
  sort_order: number;
  status: 'draft' | 'published';
  updated_at: string;
}

export default async function PagesAdminPage() {
  const ctx = await getTenantContext();

  if (!ctx.features.custom_pages) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
        <h1 className="text-lg font-semibold text-gray-900">หน้าเพจ / บทความ</h1>
        <p className="mt-2 text-sm text-gray-500">
          สร้างหน้า &ldquo;เกี่ยวกับเรา&rdquo; วิธีสั่งซื้อ หรือบทความของร้าน — ใช้ได้กับแพลนธุรกิจขึ้นไป{' '}
          <a href="/admin/plan" className="font-medium text-gray-900 underline underline-offset-2">
            อัปเกรดแพลน
          </a>{' '}
          เพื่อเปิดใช้งาน
        </p>
      </div>
    );
  }

  const db = createAdminClient();
  const { data } = await db
    .from('pages')
    .select('id, slug, title, show_in_nav, sort_order, status, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .order('sort_order')
    .order('created_at');
  const rows = (data ?? []) as PageListRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">หน้าเพจ / บทความ</h1>
        <p className="mt-1 text-sm text-gray-500">
          หน้าเผยแพร่จะอยู่ที่ /p/&#123;slug&#125; ของหน้าร้าน — เลือก &ldquo;แสดงลิงก์ใน footer&rdquo;
          เพื่อให้ลูกค้าเห็นจากทุกหน้า
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">สร้างหน้าใหม่</h2>
        <PageForm />
      </section>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th className="px-4 py-3 font-medium">ชื่อหน้า</th>
              <th className="px-4 py-3 font-medium">ลิงก์</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 font-medium">footer</th>
              <th className="px-4 py-3 font-medium">แก้ไขล่าสุด</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มีหน้าเพจ — สร้างหน้าแรกด้านบน เช่น &ldquo;เกี่ยวกับเรา&rdquo;
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/pages/${row.id}`}
                    className="font-medium text-gray-900 underline-offset-2 hover:underline"
                  >
                    {row.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {row.status === 'published' ? (
                    <a
                      href={`/p/${row.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      /p/{row.slug} ↗
                    </a>
                  ) : (
                    <>/p/{row.slug}</>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.status === 'published' ? (
                    <span className="text-green-700">เผยแพร่</span>
                  ) : (
                    <span className="text-gray-400">ฉบับร่าง</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{row.show_in_nav ? 'แสดง' : '—'}</td>
                <td className="px-4 py-3 text-gray-400">{formatThaiDate(row.updated_at)}</td>
                <td className="px-4 py-3 text-right">
                  <form action={deletePage.bind(null, row.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      ลบ
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
