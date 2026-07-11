// แถบไฮไลต์ 4 ไอคอนเส้นบาง (ref T4) — พื้นขาว จังหวะหายใจกว้าง ไม่มีกรอบ/พื้นสี

import type { HighlightItem } from '@/lib/theme-content';
import {
  HeadsetIcon,
  PackageIcon,
  ShieldIcon,
  StarIcon,
  TagIcon,
  TruckIcon,
} from './icons';

const ICONS = {
  star: StarIcon,
  shield: ShieldIcon,
  package: PackageIcon,
  headset: HeadsetIcon,
  truck: TruckIcon,
  tag: TagIcon,
} as const;

export function HighlightsBand({ items }: { items: HighlightItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 border-y border-border-soft py-12 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon] ?? StarIcon;
          return (
            <div key={item.title} className="flex flex-col items-center text-center">
              {item.icon === 'star' ? (
                // ดาวแบบเส้น (default เป็น filled — ใช้กับเรตติ้ง)
                <StarIcon size={28} filled={false} className="text-text" />
              ) : (
                <Icon size={28} className="text-text" />
              )}
              <p className="mt-4 text-sm font-medium tracking-wide text-text">{item.title}</p>
              <p className="mt-1.5 max-w-48 text-xs leading-relaxed text-text-muted">{item.sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
