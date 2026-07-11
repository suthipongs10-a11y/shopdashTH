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
  /** ปุ่มรองแบบลิงก์ขีดเส้นใต้ (variant 'luxe' — ref T4) */
  cta2Text?: string;
  cta2Href?: string;
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
  cta2Text,
  cta2Href,
}: HeroBannerProps) {
  if (!imageUrl && !headline) return null;
  const alt = headline ?? 'แบนเนอร์ร้าน';

  // 'luxe' (ref T4): แผงเข้มเต็มกว้าง — headline serif ขาว 64px ซ้าย + ภาพแฟชั่นโทนเข้มขวา
  // ปุ่มขาว + ปุ่มลิงก์ขีดเส้นใต้ / รูป portrait กลืนกับพื้น ink ด้วย gradient
  if (variant === 'luxe' && imageUrl) {
    return (
      <section className="bg-primary">
        <div className="mx-auto grid max-w-(--container-max) md:min-h-[560px] md:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-center gap-5 px-6 py-14 md:px-10 md:py-20">
            {eyebrow && (
              <p className="text-xs font-medium tracking-[0.35em] text-primary-fg/60">{eyebrow}</p>
            )}
            {headline && (
              <h1 className="whitespace-pre-line font-heading text-4xl leading-tight text-primary-fg md:text-[64px] md:leading-[1.08]">
                {headline}
              </h1>
            )}
            {subline && (
              <p className="max-w-md text-sm leading-relaxed text-primary-fg/70 md:text-base">
                {subline}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-6">
              {ctaText && ctaHref && (
                <Link
                  href={ctaHref}
                  className="bg-bg px-8 py-3.5 text-sm font-semibold tracking-wide text-text transition-opacity hover:opacity-90"
                >
                  {ctaText}
                </Link>
              )}
              {cta2Text && cta2Href && (
                <Link
                  href={cta2Href}
                  className="border-b border-primary-fg/50 pb-0.5 text-sm font-medium tracking-wide text-primary-fg transition-colors hover:border-primary-fg"
                >
                  {cta2Text}
                </Link>
              )}
            </div>
          </div>
          <div className="relative min-h-80 md:min-h-[560px]">
            {/* portrait โทนเข้ม — crop ชี้บนกันหัวขาด (DoD §6.5) */}
            <Image
              src={imageUrl}
              alt={alt}
              fill
              priority
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 48vw"
            />
            {/* gradient ซ้าย+ล่างกลืนภาพเข้ากับพื้น ink (§5.3 อนุญาต scrim บนภาพ) */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-primary to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-primary to-transparent md:hidden" />
          </div>
        </div>
      </section>
    );
  }

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

  // 'split-panel' (ref T1): แผงพื้นสี secondary ใบเดียว — ข้อความซ้าย รูปนายแบบขวากลืนกับพื้น
  if (variant === 'split-panel' && imageUrl) {
    return (
      <section className="mx-auto max-w-(--container-max) px-4 pt-4">
        <div className="grid overflow-hidden rounded-md bg-secondary md:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col justify-center gap-4 px-7 py-10 md:px-12 md:py-16">
            {eyebrow && (
              <p className="text-xs font-semibold tracking-[0.2em] text-text-muted">{eyebrow}</p>
            )}
            {headline && (
              <h1 className="whitespace-pre-line font-heading text-3xl font-bold leading-tight tracking-tight text-text md:text-[40px] md:leading-[1.15]">
                {headline}
              </h1>
            )}
            {subline && <p className="text-sm text-text-muted md:text-base">{subline}</p>}
            {ctaText && ctaHref && (
              <Link
                href={ctaHref}
                className="mt-2 inline-block w-fit rounded-sm bg-primary px-8 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-deep"
              >
                {ctaText}
              </Link>
            )}
          </div>
          {/* รูปชิดขอบล่างของแผง — gradient ซ้ายช่วยกลืนรูปเข้ากับพื้น secondary (ref) */}
          <div className="relative min-h-64 md:min-h-[380px]">
            <Image
              src={imageUrl}
              alt={alt}
              fill
              priority
              className="object-cover object-top"
              sizes="(max-width: 768px) 100vw, 45vw"
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-secondary to-transparent" />
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
