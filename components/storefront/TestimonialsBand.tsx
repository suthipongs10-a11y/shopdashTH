// แถบ "ลูกค้าของเรา พูดถึงเรา" (ref เทมเพลตบริการรถทั้ง 3) — content-driven
// การ์ดคำพูด + ชื่อ + บทบาท พร้อมดาว 5 ดวง (รีวิวที่ร้านคัดมาโชว์ — แก้ได้ที่ "เนื้อหาเว็บ")

import { SectionHeading } from '@/components/storefront/SectionHeading';
import { HeartIcon, StarIcon } from '@/components/storefront/icons';
import type { TestimonialContent } from '@/lib/theme-content';

export function TestimonialsBand({
  title,
  items,
  centered = false,
}: {
  title: string;
  items: TestimonialContent[];
  /** หัวข้อจัดกลาง + หัวใจประดับ (ธีมของเล่นเด็ก — ref Little Joy) */
  centered?: boolean;
}) {
  return (
    <section className="bg-secondary">
      <div className="mx-auto max-w-(--container-max) px-4 py-12">
        {centered ? (
          <div className="flex items-center justify-center gap-2.5">
            <h2 className="font-heading text-2xl font-semibold text-text">{title}</h2>
            <HeartIcon size={16} className="text-primary" aria-hidden />
          </div>
        ) : (
          <SectionHeading title={title} />
        )}
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {items.slice(0, 3).map((t) => (
            <figure
              key={t.author}
              className="flex h-full flex-col rounded-(--radius-md) border border-soft bg-surface p-5 shadow-card"
            >
              {/* ดาวรีวิวสีเดียวทุกธีมตาม token --color-star (TEMPLATE_SPEC §2) */}
              <div className="flex gap-0.5 text-star" aria-label="5 ดาว">
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} size={14} />
                ))}
              </div>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-text">
                “{t.text}”
              </blockquote>
              <figcaption className="mt-4 border-t border-soft pt-3">
                <p className="text-sm font-bold text-text">{t.author}</p>
                {t.role && <p className="text-xs text-text-muted">{t.role}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
