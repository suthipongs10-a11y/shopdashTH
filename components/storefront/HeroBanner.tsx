import Image from 'next/image';
import Link from 'next/link';
import type { HeroVariant } from '@/themes/types';

interface HeroBannerProps {
  variant?: HeroVariant;
  imageUrl?: string;
  headline?: string;
  subline?: string;
  ctaText?: string;
  ctaHref?: string;
}

function HeroImage({ imageUrl, alt }: { imageUrl?: string; alt: string }) {
  if (!imageUrl) {
    return <div className="absolute inset-0 bg-surface" />;
  }
  return <Image src={imageUrl} alt={alt} fill priority className="object-cover" sizes="100vw" />;
}

function Cta({ text, href }: { text?: string; href?: string }) {
  if (!text || !href) return null;
  return (
    <Link
      href={href}
      className="inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-fg transition-opacity hover:opacity-90"
    >
      {text}
    </Link>
  );
}

export function HeroBanner({
  variant = 'boxed',
  imageUrl,
  headline,
  subline,
  ctaText,
  ctaHref,
}: HeroBannerProps) {
  if (!imageUrl && !headline) return null;
  const alt = headline ?? 'แบนเนอร์ร้าน';

  if (variant === 'split') {
    return (
      <section className="mx-auto grid max-w-(--container-max) items-center gap-8 px-4 py-10 md:grid-cols-2">
        <div className="space-y-4">
          {headline && <h1 className="font-heading text-3xl font-semibold md:text-4xl">{headline}</h1>}
          {subline && <p className="text-text-muted">{subline}</p>}
          <Cta text={ctaText} href={ctaHref} />
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
          <HeroImage imageUrl={imageUrl} alt={alt} />
        </div>
      </section>
    );
  }

  const overlay = (headline || ctaText) && (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-scrim p-6 text-center">
      {headline && (
        <h1 className="font-heading text-3xl font-semibold text-primary-fg md:text-4xl">
          {headline}
        </h1>
      )}
      {subline && <p className="text-primary-fg">{subline}</p>}
      <Cta text={ctaText} href={ctaHref} />
    </div>
  );

  if (variant === 'full-bleed') {
    return (
      <section className="relative aspect-[21/9] min-h-64 w-full overflow-hidden">
        <HeroImage imageUrl={imageUrl} alt={alt} />
        {overlay}
      </section>
    );
  }

  // boxed (ดีฟอลต์กลุ่ม Basic)
  return (
    <section className="mx-auto max-w-(--container-max) px-4 pt-6">
      <div className="relative aspect-[21/9] min-h-48 overflow-hidden rounded-lg">
        <HeroImage imageUrl={imageUrl} alt={alt} />
        {overlay}
      </div>
    </section>
  );
}
