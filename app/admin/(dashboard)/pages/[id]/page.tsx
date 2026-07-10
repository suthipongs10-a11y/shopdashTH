// แก้ไขหน้าเพจ (Phase 6 — flag `custom_pages`)

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';
import { PageForm, type PageFormValues } from '../page-form';

export const dynamic = 'force-dynamic';

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getTenantContext();
  if (!ctx.features.custom_pages) redirect('/admin/pages');

  const db = createAdminClient();
  const { data } = await db
    .from('pages')
    .select('id, slug, title, body_md, show_in_nav, sort_order, status')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle();

  if (!data) notFound();
  const page = data as PageFormValues;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/pages" className="text-xs text-gray-400 hover:text-gray-600">
          ← หน้าเพจทั้งหมด
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">แก้ไข &ldquo;{page.title}&rdquo;</h1>
      </div>
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <PageForm page={page} />
      </section>
    </div>
  );
}
