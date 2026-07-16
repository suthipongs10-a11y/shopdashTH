// คำถามที่พบบ่อย (ref S2) — accordion ด้วย <details> ล้วน ไม่ต้องใช้ JS
// content-driven: ร้านแก้คำถาม-คำตอบเองได้ที่ "เนื้อหาเว็บ"

import { SectionHeading } from '@/components/storefront/SectionHeading';
import { ChevronDownIcon } from '@/components/storefront/icons';
import type { FaqItemContent } from '@/lib/theme-content';

export function FaqList({ title, items }: { title: string; items: FaqItemContent[] }) {
  return (
    <section className="mx-auto max-w-(--container-max) px-4 py-12">
      <SectionHeading title={title} />
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {items.map((f) => (
          <details
            key={f.q}
            className="group rounded-(--radius-md) border border-soft bg-surface px-4 py-3 shadow-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDownIcon
                size={16}
                className="shrink-0 text-text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-2 border-t border-soft pt-2 text-sm leading-relaxed text-text-muted">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
