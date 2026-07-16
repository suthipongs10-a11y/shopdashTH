// การ์ดเส้นทางยอดนิยม (ref S2 "ไทยทราเวลคาร์") — content-driven: รูป + ชื่อเส้นทาง
// + เวลาเดินทาง + ราคาเริ่มต้น — เลื่อนแนวนอนบนมือถือ, 5 คอลัมน์บน desktop

import Image from 'next/image';
import Link from 'next/link';
import { SectionHeading } from '@/components/storefront/SectionHeading';
import { ClockIcon } from '@/components/storefront/icons';
import type { RouteCardContent } from '@/lib/theme-content';

export function RouteCards({ title, items }: { title: string; items: RouteCardContent[] }) {
  return (
    <section className="mx-auto max-w-(--container-max) px-4 py-12">
      <SectionHeading title={title} />
      <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {items.map((r) => {
          const card = (
            <article className="w-56 shrink-0 snap-start overflow-hidden rounded-(--radius-md) border border-soft bg-surface shadow-card transition-transform hover:-translate-y-0.5 lg:w-auto">
              <div className="relative aspect-[16/10] bg-secondary">
                <Image
                  src={r.imageUrl}
                  alt={r.title}
                  fill
                  sizes="(max-width: 1024px) 224px, 240px"
                  className="object-cover"
                />
              </div>
              <div className="p-3.5">
                <h3 className="font-heading text-sm font-bold text-text">{r.title}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                  {r.duration ? (
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon size={12} />
                      {r.duration}
                    </span>
                  ) : (
                    <span />
                  )}
                  {typeof r.priceFrom === 'number' && (
                    <span>
                      เริ่มต้น{' '}
                      <b className="font-heading text-sm text-primary">
                        {r.priceFrom.toLocaleString('th-TH')}
                      </b>{' '}
                      บาท
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
          return r.href ? (
            <Link key={r.title} href={r.href} className="contents">
              {card}
            </Link>
          ) : (
            <div key={r.title} className="contents">
              {card}
            </div>
          );
        })}
      </div>
    </section>
  );
}
