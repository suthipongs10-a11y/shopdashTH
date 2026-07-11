// แถว 3 กล่อง (ref T4): Size Guide / โค้ดส่วนลดลูกค้าใหม่ / newsletter
// โค้ดส่วนลดเป็นของจริงในตาราง discount_codes — ลูกค้ากรอกตอน checkout ได้เลย

import Link from 'next/link';
import type { LuxePerksContent } from '@/lib/theme-content';
import { ArrowRightIcon, ClipboardIcon, TagIcon } from './icons';

export function LuxePerksRow({ perks }: { perks: LuxePerksContent }) {
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Size Guide */}
        <div className="flex flex-col items-center border border-border-soft px-6 py-10 text-center">
          <ClipboardIcon size={26} className="text-text" />
          <p className="mt-4 font-heading text-lg text-text">
            {perks.sizeGuideTitle ?? 'Size Guide'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
            {perks.sizeGuideSub ?? 'ตารางไซส์ละเอียดทุกรายการ วัดสัดส่วนก่อนสั่งซื้อ'}
          </p>
          <Link
            href={perks.sizeGuideHref ?? '/p/size-guide'}
            className="mt-5 inline-flex items-center gap-1.5 border-b border-text/50 pb-0.5 text-sm font-medium text-text transition-colors hover:border-text"
          >
            ดูตารางไซส์
            <ArrowRightIcon size={13} />
          </Link>
        </div>

        {/* โค้ดลูกค้าใหม่ */}
        <div className="flex flex-col items-center border border-border-soft bg-secondary px-6 py-10 text-center">
          <TagIcon size={26} className="text-text" />
          <p className="mt-4 font-heading text-lg text-text">
            {perks.welcomeTitle ?? 'ส่วนลดลูกค้าใหม่'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
            {perks.welcomeSub ?? 'ลด 10% สำหรับคำสั่งซื้อแรก กรอกโค้ดในหน้าชำระเงิน'}
          </p>
          {perks.welcomeCode && (
            <p className="mt-5 border border-dashed border-text/40 bg-bg px-6 py-2 font-heading text-base font-semibold tracking-[0.2em] text-text">
              {perks.welcomeCode}
            </p>
          )}
        </div>

        {/* Newsletter */}
        <div className="flex flex-col items-center justify-center border border-border-soft px-6 py-10 text-center">
          <p className="font-heading text-lg text-text">
            {perks.newsletterTitle ?? 'Newsletter'}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
            {perks.newsletterSub ?? 'รับข่าวคอลเลกชันใหม่และสิทธิพิเศษก่อนใคร'}
          </p>
          <form className="mt-5 flex w-full max-w-xs" action="#" aria-label="สมัครรับข่าวสาร">
            <input
              type="email"
              placeholder="อีเมลของคุณ"
              aria-label="อีเมล"
              className="min-w-0 flex-1 border border-border bg-bg px-3 py-2.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 bg-primary px-4 py-2.5 text-xs font-semibold tracking-wide text-primary-fg transition-colors hover:bg-primary-deep"
            >
              สมัคร
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
