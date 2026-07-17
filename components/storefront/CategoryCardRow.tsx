// การ์ดหมวดหมู่ (ref Little Joy — ธีมของเล่นเด็ก): การ์ดขาวขอบมน
// รูปสี่เหลี่ยมมนด้านบน + ชื่อหมวดกลาง + ปุ่ม pill พาสเทลสลับสีต่อใบ
// ใช้ข้อมูล content.categoryBanners (แก้ได้ที่หน้า "เนื้อหาเว็บ" ใน admin)

import Image from 'next/image';
import Link from 'next/link';
import type { CategoryBanner } from '@/lib/theme-content';
import { HeartIcon } from './icons';

// สลับโทน pill ต่อใบ — ทุกสีมาจาก token อนุพันธ์ (ห้าม hardcode §8.5)
const PILL_TONES = [
  'bg-accent-soft text-accent',
  'bg-primary-soft text-primary',
  'bg-success-soft text-success',
  'bg-star-soft text-badge-best',
] as const;

export function CategoryCardRow({
  title,
  banners,
}: {
  title?: string;
  banners: CategoryBanner[];
}) {
  if (banners.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4 py-10">
      {title && (
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <HeartIcon size={16} className="text-primary" aria-hidden />
          <h2 className="font-heading text-2xl font-semibold text-text">{title}</h2>
          <HeartIcon size={16} className="text-accent" aria-hidden />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {banners.map((b, i) => (
          <Link
            key={b.title}
            href={b.href}
            className="group flex flex-col items-center gap-3 rounded-lg border border-border-soft bg-bg p-4 pb-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-surface">
              <Image
                src={b.imageUrl}
                alt={b.title}
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
            </div>
            <p className="text-center text-sm font-semibold text-text">{b.title}</p>
            <span
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-transform group-hover:scale-105 ${PILL_TONES[i % PILL_TONES.length]}`}
            >
              ดูทั้งหมด
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
