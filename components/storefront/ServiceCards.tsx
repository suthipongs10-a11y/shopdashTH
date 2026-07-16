// การ์ด "บริการของเรา" 4 ใบ (ref เทมเพลตบริการรถ) — ไอคอน + ชื่อ + คำอธิบาย + ลิงก์
// ใช้ข้อมูลชุดเดียวกับ highlights (HighlightItem + href) — แก้ที่ "เนื้อหาเว็บ" กลุ่มเดียวกัน

import Link from 'next/link';
import { SectionHeading } from '@/components/storefront/SectionHeading';
import {
  ArrowRightIcon,
  HeadsetIcon,
  PackageIcon,
  ShieldIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
} from '@/components/storefront/icons';
import type { HighlightItem } from '@/lib/theme-content';

const ICONS = {
  star: StarIcon,
  shield: ShieldIcon,
  package: PackageIcon,
  headset: HeadsetIcon,
  truck: TruckIcon,
  tag: TagIcon,
} as const;

export function ServiceCards({
  title,
  sub,
  items,
}: {
  title: string;
  sub?: string;
  items: HighlightItem[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4 py-12">
      <SectionHeading eyebrow={sub} title={title} />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 4).map((item) => {
          const Icon = ICONS[item.icon] ?? StarIcon;
          const body = (
            <div className="flex h-full flex-col items-center rounded-(--radius-md) border border-soft bg-surface p-6 text-center shadow-card transition-transform hover:-translate-y-0.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon size={26} />
              </span>
              <h3 className="mt-4 font-heading text-base font-bold text-text">{item.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-text-muted">{item.sub}</p>
              {item.href && (
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  ดูรายละเอียด
                  <ArrowRightIcon size={12} />
                </span>
              )}
            </div>
          );
          return item.href ? (
            <Link key={item.title} href={item.href} className="block h-full">
              {body}
            </Link>
          ) : (
            <div key={item.title} className="h-full">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
