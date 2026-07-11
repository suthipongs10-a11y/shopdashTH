// split section คู่ (ref T4): Lookbook (ภาพเต็ม + ข้อความทับ) / Brand Story (พื้น ink ตัวขาว)

import Image from 'next/image';
import Link from 'next/link';
import type { BrandStoryContent, LookbookContent } from '@/lib/theme-content';
import { ArrowRightIcon } from './icons';

export function LookbookSplit({
  lookbook,
  brandStory,
}: {
  lookbook?: LookbookContent;
  brandStory?: BrandStoryContent;
}) {
  if (!lookbook && !brandStory) return null;
  return (
    <section className="grid md:grid-cols-2">
      {lookbook && (
        <div className="relative min-h-[420px] overflow-hidden md:min-h-[540px]">
          <Image
            src={lookbook.imageUrl}
            alt={lookbook.title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover object-top"
          />
          {/* scrim ล่างให้ตัวหนังสือขาวอ่านออก (§5.3 อนุญาต scrim บนภาพ) */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-scrim via-scrim/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 md:p-12">
            {lookbook.eyebrow && (
              <p className="text-xs font-medium tracking-[0.3em] text-primary-fg/80">
                {lookbook.eyebrow}
              </p>
            )}
            <h2 className="mt-2 font-heading text-3xl text-primary-fg md:text-4xl">
              {lookbook.title}
            </h2>
            {lookbook.sub && <p className="mt-2 max-w-sm text-sm text-primary-fg/85">{lookbook.sub}</p>}
            {lookbook.ctaText && lookbook.ctaHref && (
              <Link
                href={lookbook.ctaHref}
                className="mt-5 inline-flex items-center gap-2 border-b border-primary-fg/60 pb-0.5 text-sm font-medium tracking-wide text-primary-fg transition-colors hover:border-primary-fg"
              >
                {lookbook.ctaText}
                <ArrowRightIcon size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
      {brandStory && (
        <div className="flex min-h-[420px] items-center bg-primary md:min-h-[540px]">
          <div className="mx-auto max-w-lg px-8 py-14 md:px-12">
            {brandStory.eyebrow && (
              <p className="text-xs font-medium tracking-[0.3em] text-primary-fg/60">
                {brandStory.eyebrow}
              </p>
            )}
            <h2 className="mt-3 font-heading text-3xl leading-snug text-primary-fg md:text-4xl">
              {brandStory.title}
            </h2>
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-primary-fg/75">
              {brandStory.body}
            </p>
            {brandStory.ctaText && brandStory.ctaHref && (
              <Link
                href={brandStory.ctaHref}
                className="mt-7 inline-flex items-center gap-2 border-b border-primary-fg/60 pb-0.5 text-sm font-medium tracking-wide text-primary-fg transition-colors hover:border-primary-fg"
              >
                {brandStory.ctaText}
                <ArrowRightIcon size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
