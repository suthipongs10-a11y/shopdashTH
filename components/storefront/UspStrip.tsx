// แถบ USP 4 ไอคอน (TEMPLATE_SPEC §0.3 / ref T2: ใต้ hero) — ไอคอนซ้าย + หัวหนา + บรรทัดรองเทา

import type { UspItem } from '@/lib/theme-content';
import { ClockIcon, HeadsetIcon, LockIcon, ShieldIcon, TagIcon, TruckIcon } from './icons';

const ICONS = {
  truck: TruckIcon,
  clock: ClockIcon,
  lock: LockIcon,
  headset: HeadsetIcon,
  tag: TagIcon,
  shield: ShieldIcon,
} as const;

export function UspStrip({
  items,
  tone = 'plain',
}: {
  items: UspItem[];
  /** 'band' = พื้นเทาอ่อน (ref T4) / 'plain' = ขาวมีเส้นคั่น (ref T2) */
  tone?: 'plain' | 'band';
}) {
  if (items.length === 0) return null;
  return (
    <section className={tone === 'band' ? 'bg-secondary' : 'border-b border-border-soft'}>
      <div className="mx-auto grid max-w-(--container-max) grid-cols-2 gap-x-4 gap-y-5 px-4 py-6 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? TruckIcon;
          return (
            <div key={item.title} className="flex items-center gap-3">
              <Icon size={26} className="shrink-0 text-text" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">{item.title}</p>
                <p className="truncate text-xs text-text-muted">{item.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
