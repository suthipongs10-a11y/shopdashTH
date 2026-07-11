// การ์ดบทความแฟชั่น / Lookbook 3 ใบมีวันที่ (ref T3)
// href ชี้หน้าเพจจริงของร้าน (/p/slug — ตาราง pages) รูป/วันที่มาจาก __content

import Image from 'next/image';
import Link from 'next/link';
import type { ArticleCard } from '@/lib/theme-content';
import { ArrowRightIcon, ClockIcon } from './icons';

export function ArticleCards({ articles }: { articles: ArticleCard[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {articles.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group overflow-hidden rounded-md border border-border-soft bg-bg shadow-card transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,.08)]"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-surface">
            <Image
              src={a.imageUrl}
              alt={a.title}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover object-top transition-transform duration-400 ease-out group-hover:scale-[1.04]"
            />
            {a.tag && (
              <span className="absolute left-2.5 top-2.5 rounded-full bg-bg/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-text backdrop-blur-sm">
                {a.tag}
              </span>
            )}
          </div>
          <div className="p-4">
            <p className="flex items-center gap-1.5 text-xs text-text-muted">
              <ClockIcon size={13} />
              {a.date}
            </p>
            <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-text">
              {a.title}
            </p>
            <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-text-muted transition-colors group-hover:text-text">
              อ่านต่อ
              <ArrowRightIcon size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
