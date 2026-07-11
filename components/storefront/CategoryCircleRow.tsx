// แถวหมวดวงกลมรูปสินค้า 9–10 วง เลื่อนแนวนอนได้ (ref T3 — marketplace)
// รูปมาจาก __content (หมวดใน DB ไม่มีคอลัมน์รูป) — ลิงก์ชี้ /products?category=... จริง

import Image from 'next/image';
import Link from 'next/link';
import type { CategoryCircle } from '@/lib/theme-content';

export function CategoryCircleRow({ circles }: { circles: CategoryCircle[] }) {
  if (circles.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="scrollbar-none -mx-1 flex snap-x gap-1 overflow-x-auto px-1 pb-1 sm:justify-between sm:gap-2">
        {circles.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group flex w-[76px] shrink-0 snap-start flex-col items-center gap-1.5 sm:w-auto"
          >
            <span className="relative block h-16 w-16 overflow-hidden rounded-full border border-border-soft bg-surface transition-all group-hover:border-primary md:h-[74px] md:w-[74px]">
              <Image
                src={c.imageUrl}
                alt={c.label}
                fill
                sizes="80px"
                className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            <span className="max-w-full truncate text-xs text-text transition-colors group-hover:font-medium">
              {c.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
