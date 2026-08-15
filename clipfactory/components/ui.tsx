'use client';

import type { ReactNode } from 'react';

export function Section({
  step,
  title,
  hint,
  done,
  children,
  action,
}: {
  step: number;
  title: string;
  hint?: string;
  done?: boolean;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span
            className={`mono mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${
              done
                ? 'bg-[var(--color-ok)] text-[var(--color-accent-ink)]'
                : 'border border-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            {done ? '✓' : String(step).padStart(2, '0')}
          </span>
          <div>
            <h2 className="text-base font-bold">{title}</h2>
            {hint ? <p className="mt-0.5 text-xs text-[var(--color-muted)]">{hint}</p> : null}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ErrorNote({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mt-3 flex items-start justify-between gap-3 rounded-lg border border-[var(--color-danger)]/45 bg-[var(--color-danger)]/10 px-3 py-2.5 text-xs leading-relaxed text-[var(--color-danger)]"
    >
      <span>{message}</span>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="flex-none font-bold" aria-label="ปิดข้อความ">
          ✕
        </button>
      ) : null}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-[var(--color-muted)]">
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]"
        aria-hidden
      />
      {label}
    </span>
  );
}

export function Bar({ ratio, label }: { ratio: number; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div className="w-full">
      {label ? (
        <div className="mb-1 flex justify-between text-[11px] text-[var(--color-muted)]">
          <span>{label}</span>
          <span className="mono">{pct}%</span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
        <div
          className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'accent' | 'warn' }) {
  const tones = {
    default: 'border-[var(--color-line)] text-[var(--color-ink-soft)]',
    accent: 'border-[var(--color-accent)] text-[var(--color-accent)]',
    warn: 'border-[var(--color-danger)] text-[var(--color-danger)]',
  } as const;
  return (
    <span className={`mono rounded border px-1.5 py-0.5 text-[10px] tracking-wide ${tones[tone]}`}>{children}</span>
  );
}
