// การ์ดรถ (รถของเรา / ประเภทรถของเรา — ref เทมเพลตบริการรถทั้ง 3) — content-driven
// spec เป็นชิปข้อความ เช่น "10 ที่นั่ง" "8 กระเป๋า" "Wi-Fi" — ราคาเริ่มต้นใส่หรือไม่ก็ได้

import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/components/storefront/SectionHeading';
import type { VehicleCardContent } from '@/lib/theme-content';

export function VehicleCards({
  title,
  sub,
  items,
}: {
  title: string;
  sub?: string;
  items: VehicleCardContent[];
}) {
  return (
    <section className="mx-auto max-w-(--container-max) px-4 py-12">
      <SectionHeading eyebrow={sub} title={title} />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((v) => {
          const card = (
            <article className="flex h-full flex-col overflow-hidden rounded-(--radius-md) border border-soft bg-surface shadow-card transition-transform hover:-translate-y-0.5">
              <div className="relative aspect-[4/3] bg-secondary">
                <Image
                  src={v.imageUrl}
                  alt={v.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-heading text-base font-bold text-text">{v.title}</h3>
                {v.subtitle && <p className="mt-0.5 text-xs text-text-muted">{v.subtitle}</p>}
                {(v.specs?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {v.specs!.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-soft bg-bg px-2 py-0.5 text-[11px] font-medium text-text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between pt-4">
                  {typeof v.priceFrom === 'number' ? (
                    <p className="text-sm text-text-muted">
                      เริ่มต้น{' '}
                      <span className="font-heading text-lg font-bold text-primary">
                        {v.priceFrom.toLocaleString('th-TH')}
                      </span>{' '}
                      บาท
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="rounded-(--radius-sm) border border-primary px-3 py-1.5 text-xs font-semibold text-primary">
                    ดูรายละเอียด
                  </span>
                </div>
              </div>
            </article>
          );
          return v.href ? (
            <Link key={v.title} href={v.href} className="block h-full">
              {card}
            </Link>
          ) : (
            <div key={v.title} className="h-full">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
