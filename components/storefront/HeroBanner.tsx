import Image from 'next/image';
import Link from 'next/link';
import type { HeroVariant } from '@/themes/types';
import { ArrowRightIcon, QrIcon, TruckIcon } from './icons';

interface HeroBannerProps {
  variant?: HeroVariant;
  imageUrl?: string;
  headline?: string;
  subline?: string;
  ctaText?: string;
  ctaHref?: string;
  /** ข้อความเล็กเหนือ headline (variant 'commerce' — เช่น "NEW COLLECTION") */
  eyebrow?: string;
}

function Cta({ text, href, onDark = false }: { text?: string; href?: string; onDark?: boolean }) {
  if (!text || !href) return null;
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg ${
        onDark ? 'bg-bg text-text' : 'bg-primary text-primary-fg'
      }`}
    >
      {text}
      <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/* แผงตกแต่งกรณีร้านยังไม่มีรูปแบนเนอร์ — gradient จากสีธีม + วงแสง ไม่ใช่กล่องเทาโล่งๆ */
function DecorPanel({
  headline,
  subline,
  ctaText,
  ctaHref,
  rounded,
}: {
  headline?: string;
  subline?: string;
  ctaText?: string;
  ctaHref?: string;
  rounded?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-deep ${
        rounded ? 'rounded-lg' : ''
      }`}
    >
      {/* วงแสงตกแต่ง — สีจาก token hero-glow (อนุพันธ์ของ primary-fg) */}
      <div className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-hero-glow blur-2xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-16 h-96 w-96 rounded-full bg-hero-glow blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-8 h-24 w-24 rounded-full border border-hero-glow" />
      <div className="pointer-events-none absolute bottom-10 left-1/4 h-14 w-14 rounded-full border border-hero-glow" />

      <div className="relative mx-auto flex min-h-[340px] max-w-3xl flex-col items-center justify-center gap-5 px-6 py-16 text-center md:min-h-[400px]">
        {headline && (
          <h1 className="font-heading text-4xl font-bold tracking-tight text-primary-fg md:text-5xl">
            {headline}
          </h1>
        )}
        <p className="max-w-xl text-base text-primary-fg/80">
          {subline ?? 'ช้อปออนไลน์ง่ายๆ ชำระผ่าน PromptPay จัดส่งถึงบ้านทั่วไทย'}
        </p>
        <div className="mt-2">
          <Cta text={ctaText} href={ctaHref} onDark />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-primary-fg/70">
          <span className="inline-flex items-center gap-1.5">
            <QrIcon size={15} /> สแกนจ่ายผ่าน PromptPay
          </span>
          <span className="inline-flex items-center gap-1.5">
            <TruckIcon size={15} /> จัดส่งทั่วประเทศ
          </span>
        </div>
      </div>
    </div>
  );
}

export function HeroBanner({
  variant = 'boxed',
  imageUrl,
  headline,
  subline,
  ctaText,
  ctaHref,
  eyebrow,
}: HeroBannerProps) {
  if (!imageUrl && !headline) return null;
  const alt = headline ?? 'แบนเนอร์ร้าน';

  // 'commerce' (ref T2): full-bleed ภาพคนขวา ข้อความชิดซ้ายบนภาพ (ไม่มี scrim ตัวหนังสือเข้ม)
  if (variant === 'commerce' && imageUrl) {
    return (
      <section className="relative min-h-[300px] w-full overflow-hidden md:aspect-[3/1] md:min-h-[360px]">
        {/* ชี้ตำแหน่ง crop ไปด้านบน-ขวา — กันหัวคนขาดตอน crop แนวกว้าง (DoD §6.5) */}
        <Image
          src={imageUrl}
          alt={alt}
          fill
          priority
          className="object-cover object-[78%_18%]"
          sizes="100vw"
        />
        <div className="absolute inset-0">
          <div className="mx-auto flex h-full max-w-(--container-max) flex-col justify-center gap-2.5 px-4 py-10 md:gap-3">
            {eyebrow && (
              <p className="text-xs font-semibold tracking-[0.25em] text-text">{eyebrow}</p>
            )}
            {headline && (
              <h1 className="max-w-lg font-heading text-4xl font-bold leading-none tracking-tight text-text md:text-6xl">
                {headline}
              </h1>
            )}
            {subline && (
              <p className="max-w-xs whitespace-pre-line text-sm leading-relaxed text-text md:max-w-sm md:text-base">
                {subline}
              </p>
            )}
            {ctaText && ctaHref && (
              <Link
                href={ctaHref}
                className="mt-2 inline-block w-fit rounded-sm bg-primary px-7 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-deep"
              >
                {ctaText}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ไม่มีรูป → แผงตกแต่งจากสีธีม (ทุก variant)
  if (!imageUrl) {
    const panel = (
      <DecorPanel
        headline={headline}
        subline={subline}
        ctaText={ctaText}
        ctaHref={ctaHref}
        rounded={variant !== 'full-bleed'}
      />
    );
    if (variant === 'full-bleed') return <section>{panel}</section>;
    return <section className="mx-auto max-w-(--container-max) px-4 pt-6">{panel}</section>;
  }

  if (variant === 'split') {
    return (
      <section className="mx-auto grid max-w-(--container-max) items-center gap-10 px-4 py-12 md:grid-cols-2">
        <div className="space-y-5">
          {headline && (
            <h1 className="font-heading text-4xl font-bold tracking-tight md:text-5xl">
              {headline}
            </h1>
          )}
          {subline && <p className="text-lg text-text-muted">{subline}</p>}
          <Cta text={ctaText} href={ctaHref} />
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg shadow-card">
          <Image src={imageUrl} alt={alt} fill priority className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
      </section>
    );
  }

  const overlay = (headline || ctaText) && (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-t from-scrim via-scrim/50 to-scrim/20 p-6 text-center">
      {headline && (
        <h1 className="font-heading text-3xl font-bold tracking-tight text-primary-fg drop-shadow-sm md:text-5xl">
          {headline}
        </h1>
      )}
      {subline && <p className="max-w-xl text-primary-fg/90">{subline}</p>}
      <div className="mt-1">
        <Cta text={ctaText} href={ctaHref} onDark />
      </div>
    </div>
  );

  if (variant === 'full-bleed') {
    return (
      <section className="relative aspect-[21/9] min-h-72 w-full overflow-hidden">
        <Image src={imageUrl} alt={alt} fill priority className="object-cover" sizes="100vw" />
        {overlay}
      </section>
    );
  }

  // boxed (ดีฟอลต์กลุ่ม Basic)
  return (
    <section className="mx-auto max-w-(--container-max) px-4 pt-6">
      <div className="relative aspect-[21/9] min-h-56 overflow-hidden rounded-lg shadow-card">
        <Image src={imageUrl} alt={alt} fill priority className="object-cover" sizes="100vw" />
        {overlay}
      </div>
    </section>
  );
}
