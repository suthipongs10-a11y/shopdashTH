// โครงหน้าเอกสารทางกฎหมายของแพลตฟอร์ม (privacy / terms) — ใช้ layout landing เดิม

import type { ReactNode } from 'react';

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">ปรับปรุงล่าสุด: {updated}</p>
      <div className="prose-sm mt-8 space-y-6 text-[15px] leading-relaxed text-slate-700">
        {children}
      </div>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-bold text-slate-900">{heading}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
