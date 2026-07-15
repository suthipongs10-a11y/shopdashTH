// UI kit กลางของ Store Admin — โทน: พื้น gray-50, การ์ดขาว rounded-xl,
// ปุ่มหลัก indigo, สถานะ emerald/amber/rose/sky — ใช้ชุดนี้ทุกหน้าให้หน้าตาเดียวกัน

import type { ReactNode } from 'react';

/* ---------- class strings ใช้ซ้ำ ---------- */

export const btnPrimary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50';

export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50';

export const btnSmall =
  'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50';

export const btnSmallDanger =
  'inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50';

export const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

export const labelClass = 'mb-1.5 block text-sm font-semibold text-gray-800';

export const cardClass = 'rounded-xl border border-gray-300 bg-white shadow-sm';

/* ---------- ตาราง ---------- */

export const tableWrap = 'overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-sm';
export const thClass =
  'whitespace-nowrap border-b border-gray-300 bg-gray-100 px-4 py-3 text-left text-xs font-bold text-gray-700';
export const tdClass = 'border-b border-gray-200 px-4 py-3 text-sm text-gray-800';
export const trHover = 'transition-colors hover:bg-indigo-50/40';

/* ---------- components ---------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm font-medium text-gray-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className = '',
  padded = true,
}: {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`${cardClass} ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-bold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs font-medium text-gray-600">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'violet';

const BADGE_TONES: Record<BadgeTone, string> = {
  success: 'bg-emerald-100 text-emerald-800 ring-emerald-600/30',
  warning: 'bg-amber-100 text-amber-800 ring-amber-600/30',
  danger: 'bg-rose-100 text-rose-800 ring-rose-600/30',
  info: 'bg-sky-100 text-sky-800 ring-sky-600/30',
  neutral: 'bg-gray-100 text-gray-700 ring-gray-500/25',
  violet: 'bg-violet-100 text-violet-800 ring-violet-600/30',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** โทนสีของสถานะออร์เดอร์ — ใช้คู่กับ ORDER_STATUS_TH */
export const ORDER_STATUS_TONE: Record<string, BadgeTone> = {
  pending_payment: 'warning',
  slip_uploaded: 'violet',
  confirmed: 'info',
  packing: 'info',
  shipped: 'success',
  cancelled: 'danger',
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = 'indigo',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose' | 'violet' | 'gray';
}) {
  const tones: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-gray-600">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs font-medium text-gray-500">{sub}</p>}
        </div>
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon?: ReactNode;
  title: string;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      {icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          {icon}
        </span>
      )}
      <p className="text-sm font-bold text-gray-900">{title}</p>
      {sub && <p className="max-w-sm text-xs font-medium leading-relaxed text-gray-600">{sub}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
