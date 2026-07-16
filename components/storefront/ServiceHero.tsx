// Hero ของเทมเพลตบริการรถ (S1/S2/S3): รูปพื้นหลังเต็มกว้าง + ข้อความซ้าย + แผงจองขวา
// (ref ทั้ง 3 เทมเพลต) — สีจาก token; แผงจองเป็น InquiryPanel (client, เปิด LINE/โทร)

import Image from 'next/image';
import { InquiryPanel } from '@/components/storefront/InquiryPanel';
import { CheckIcon } from '@/components/storefront/icons';
import type { HeroContent, InquiryContent } from '@/lib/theme-content';

export function ServiceHero({
  hero,
  storeName,
  inquiry,
  lineUrl,
  phone,
  badges,
}: {
  hero?: Partial<HeroContent>;
  storeName: string;
  inquiry?: InquiryContent;
  lineUrl?: string;
  phone?: string | null;
  /** ชิปใต้ headline เช่น ["ตรงเวลา","ปลอดภัย","เป็นส่วนตัว"] */
  badges?: string[];
}) {
  return (
    <section className="relative overflow-hidden bg-secondary">
      {hero?.imageUrl && (
        <>
          <Image
            src={hero.imageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* scrim ให้ตัวหนังสืออ่านออกบนทุกรูป */}
          <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/50 to-secondary/20" />
        </>
      )}
      <div className="relative mx-auto max-w-(--container-max) px-4 py-10 md:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {hero?.eyebrow && (
              <p className="text-sm font-medium tracking-wide text-primary">{hero.eyebrow}</p>
            )}
            <h1 className="mt-2 font-heading text-3xl font-bold leading-tight text-text md:text-5xl">
              {hero?.headline ?? storeName}
            </h1>
            {hero?.sub && (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-text-muted md:text-lg">
                {hero.sub}
              </p>
            )}
            {(badges?.length ?? 0) > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {badges!.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full border border-soft bg-surface/80 px-3 py-1 text-xs font-semibold text-text"
                  >
                    <CheckIcon size={12} className="text-primary" />
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="lg:justify-self-end lg:min-w-[340px]">
            <InquiryPanel inquiry={inquiry} lineUrl={lineUrl} phone={phone} />
          </div>
        </div>
      </div>
    </section>
  );
}
