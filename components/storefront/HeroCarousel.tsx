'use client';

// Hero carousel (ref T3): หลายสไลด์ + ลูกศร + จุดบอกตำแหน่ง
// เลื่อนอัตโนมัติ 5 วิ หยุดเมื่อ hover (TEMPLATE_SPEC §4) — สูงคงที่กัน CLS
// ทุกภาพ absolute ซ้อนกันแล้ว fade opacity — ไม่มี layout shift

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface HeroSlide {
  imageUrl: string;
  eyebrow?: string;
  headline?: string;
  sub?: string;
  ctaText?: string;
  ctaHref?: string;
}

const AUTO_MS = 5000;

function Arrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'สไลด์ก่อนหน้า' : 'สไลด์ถัดไป'}
      className={`absolute top-1/2 z-[2] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg/80 text-text shadow-card backdrop-blur-sm transition-colors hover:bg-bg md:flex ${
        dir === 'prev' ? 'left-3' : 'right-3'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {dir === 'prev' ? <path d="m15 5-7 7 7 7" /> : <path d="m9 5 7 7-7 7" />}
      </svg>
    </button>
  );
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  // mount รูปเฉพาะสไลด์ที่เคยแสดง — ไม่งั้นรูปใหญ่ทั้ง 3 ใบโหลดพร้อมกันแย่งแบนด์วิดท์กับ LCP
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));
  const pausedRef = useRef(false);

  const go = useCallback(
    (delta: number) => {
      setActive((cur) => {
        const next = (cur + delta + slides.length) % slides.length;
        setMounted((m) => (m.has(next) ? m : new Set(m).add(next)));
        return next;
      });
    },
    [slides.length],
  );

  const goTo = useCallback((i: number) => {
    setMounted((m) => (m.has(i) ? m : new Set(m).add(i)));
    setActive(i);
  }, []);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = setInterval(() => {
      if (!pausedRef.current) go(1);
    }, AUTO_MS);
    return () => clearInterval(timer);
  }, [go, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      className="relative min-h-[300px] w-full overflow-hidden md:aspect-[3/1] md:min-h-[340px]"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      aria-roledescription="carousel"
    >
      {slides.map((slide, i) => (
        <div
          key={`${slide.imageUrl}-${i}`}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === active ? 'z-[1] opacity-100' : 'z-0 opacity-0'
          }`}
          aria-hidden={i !== active}
        >
          {/* crop ชี้บน-ขวา กันหัวคนขาด (DoD §6.5) */}
          {mounted.has(i) && (
            <Image
              src={slide.imageUrl}
              alt={slide.headline ?? 'แบนเนอร์ร้าน'}
              fill
              priority={i === 0}
              className="object-cover object-[70%_20%]"
              sizes="100vw"
            />
          )}
          {/* scrim ขาวจางฝั่งข้อความ — กันตัวหนังสือทับตัวแบบแล้วอ่านไม่ออก (§5.3 อนุญาต scrim บนภาพ) */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/80 via-bg/35 to-transparent" />
          <div className="absolute inset-0">
            <div className="mx-auto flex h-full max-w-(--container-max) flex-col justify-center gap-2.5 px-4 py-10 md:px-6">
              {slide.eyebrow && (
                <p className="text-xs font-semibold tracking-[0.25em] text-text">{slide.eyebrow}</p>
              )}
              {slide.headline && (
                <h2 className="max-w-lg whitespace-pre-line font-heading text-3xl font-bold leading-tight tracking-tight text-text md:text-5xl">
                  {slide.headline}
                </h2>
              )}
              {slide.sub && (
                <p className="max-w-xs whitespace-pre-line text-sm leading-relaxed text-text md:max-w-sm">
                  {slide.sub}
                </p>
              )}
              {slide.ctaText && slide.ctaHref && (
                <Link
                  href={slide.ctaHref}
                  tabIndex={i === active ? 0 : -1}
                  className="mt-2 inline-block w-fit rounded-sm bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-deep"
                >
                  {slide.ctaText}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <Arrow dir="prev" onClick={() => go(-1)} />
          <Arrow dir="next" onClick={() => go(1)} />
          <div className="absolute bottom-3 left-1/2 z-[2] flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`ไปสไลด์ที่ ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === active ? 'w-5 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
