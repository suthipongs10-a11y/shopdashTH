// หน้าเพจ/บทความของร้าน (Phase 6) — แสดงเฉพาะ status='published'
// เนื้อหาแสดงแบบ pre-wrap (แนวเดียวกับคำอธิบายสินค้า) — สี/ฟอนต์จาก token เท่านั้น

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { formatThaiDate } from '@/lib/format';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTenantContext } from '@/lib/tenant-context';

interface PublicPageRow {
  title: string;
  body_md: string | null;
  updated_at: string;
}

async function fetchPage(slug: string): Promise<PublicPageRow | null> {
  const ctx = await getTenantContext();
  const db = createAdminClient();
  const { data } = await db
    .from('pages')
    .select('title, body_md, updated_at')
    .eq('tenant_id', ctx.tenantId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  return (data as PublicPageRow | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug } = await params;
    const page = await fetchPage(slug);
    if (!page) return {};
    return {
      title: page.title,
      description: page.body_md?.slice(0, 160) ?? page.title,
    };
  } catch {
    return {};
  }
}

export default async function StorePagePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <article>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{page.title}</h1>
        <p className="mt-2 text-xs text-text-muted">
          อัปเดตล่าสุด {formatThaiDate(page.updated_at)}
        </p>
        <hr className="my-6 border-border-soft" />
        {page.body_md && (
          <div className="whitespace-pre-wrap text-[calc(1rem*var(--text-scale))] leading-relaxed">
            {page.body_md}
          </div>
        )}
      </article>
    </main>
  );
}
