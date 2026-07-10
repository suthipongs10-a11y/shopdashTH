// แบนเนอร์หมวด 3 ใบ (ref T2) — รูปเต็มใบ ข้อความซ้าย + ปุ่มดำเล็ก "ช้อปเลย"

import Image from 'next/image';
import Link from 'next/link';
import type { CategoryBanner } from '@/lib/theme-content';

export function CategoryBannerRow({ banners }: { banners: CategoryBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((b) => (
          <Link
            key={b.title}
            href={b.href}
            className="group relative block aspect-[3/2] overflow-hidden rounded-md shadow-card"
          >
            <Image
              src={b.imageUrl}
              alt={b.title}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            {/* scrim ด้านซ้ายให้อ่านข้อความออก (gradient บนภาพ = ข้อยกเว้น §5.3) */}
            <div className="absolute inset-0 bg-gradient-to-r from-bg/95 via-bg/55 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center gap-1.5 p-5">
              <p className="font-heading text-xl font-bold text-text">{b.title}</p>
              <p className="text-xs text-text-muted">{b.sub}</p>
              <span className="mt-2 inline-block w-fit rounded-sm bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-fg transition-colors group-hover:bg-primary-deep">
                ช้อปเลย
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
