// แถบสิทธิ์สมาชิก 3 ช่อง (ref T3): ส่วนลด 10% / ส่งฟรี / ผ่อน 0%

import { CreditCardIcon, TagIcon, TruckIcon } from './icons';
import type { MemberBenefit } from '@/lib/theme-content';

const ICONS = { tag: TagIcon, truck: TruckIcon, card: CreditCardIcon } as const;

export function MemberBenefitsBand({ benefits }: { benefits: MemberBenefit[] }) {
  if (benefits.length === 0) return null;
  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {benefits.map((b) => {
          const Icon = ICONS[b.icon];
          return (
            <div
              key={b.title}
              className="flex items-center gap-3.5 rounded-md border border-border-soft bg-secondary px-5 py-4 shadow-card"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg text-text">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text">{b.title}</p>
                <p className="mt-0.5 truncate text-xs text-text-muted">{b.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
