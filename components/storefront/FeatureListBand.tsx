// แถบครีม "ฟีเจอร์ของเว็บ" (ref T1) — หัวข้อกลาง + รายการมีเลขข้อ 4 ช่อง
// + หมายเหตุใต้แถบ (เช่น "ไม่มีระบบตะกร้า ไม่มีการชำระเงินออนไลน์" — โหมดเว็บแนะนำสินค้า)

import type { FeatureListItem } from '@/lib/theme-content';
import { BagIcon, ChatIcon, HomeIcon, InfoIcon, PageIcon } from './icons';

const ICONS = [HomeIcon, BagIcon, PageIcon, ChatIcon];

export function FeatureListBand({
  title,
  items,
  note,
  noteHighlight,
}: {
  title: string;
  items: FeatureListItem[];
  note?: string | null;
  /** ส่วนท้ายของ note ที่เน้นสีแดง เช่น "ไม่มีการชำระเงินออนไลน์" */
  noteHighlight?: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="rounded-md bg-secondary px-6 py-10 md:px-10">
        <h2 className="text-center font-heading text-xl font-bold tracking-tight text-text md:text-2xl">
          {title}
        </h2>
        <div className="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <div
                key={item.title}
                className={`flex items-start gap-3.5 lg:px-4 ${
                  i > 0 ? 'lg:border-l lg:border-border-soft' : ''
                }`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-text">
                    {i + 1}. {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">{item.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
        {(note || noteHighlight) && (
          <p className="mt-8 flex flex-wrap items-center justify-center gap-1.5 border-t border-border-soft pt-5 text-center text-xs text-text-muted">
            <InfoIcon size={13} className="shrink-0" />
            {note && <span>{note}</span>}
            {noteHighlight && <span className="font-semibold text-danger">{noteHighlight}</span>}
          </p>
        )}
      </div>
    </section>
  );
}
