'use client';

import type { GeneratedScript } from '@/lib/types';
import { Pill } from './ui';

export function ScriptPanel({
  script,
  hookIndex,
  onHookIndex,
  onChange,
  audioless,
}: {
  script: GeneratedScript;
  hookIndex: number;
  onHookIndex: (i: number) => void;
  onChange: (next: GeneratedScript) => void;
  audioless: boolean;
}) {
  const setScene = (i: number, patch: Partial<GeneratedScript['scenes'][number]>) => {
    const scenes = script.scenes.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange({ ...script, scenes });
  };

  const setHook = (i: number, text: string) => {
    const hooks = script.hooks.map((h, idx) => (idx === i ? text : h));
    onChange({ ...script, hooks });
  };

  return (
    <div className="grid gap-5">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="label mb-0">Hook 3 วินาทีแรก — เลือก 1 เวอร์ชัน</span>
          <Pill tone="accent">{script.hooks.length} เวอร์ชัน</Pill>
        </div>
        <div className="grid gap-2">
          {script.hooks.map((h, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition ${
                hookIndex === i
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/[0.07]'
                  : 'border-[var(--color-line)] bg-[var(--color-panel-2)]'
              }`}
            >
              <input
                type="radio"
                name="hook"
                checked={hookIndex === i}
                onChange={() => onHookIndex(i)}
                className="mt-2 flex-none accent-[var(--color-accent)]"
                aria-label={`เลือก hook เวอร์ชันที่ ${i + 1}`}
              />
              <input
                className="field border-0 bg-transparent px-0 py-1 focus:ring-0"
                value={h}
                onChange={(e) => setHook(i, e.target.value)}
                onFocus={() => onHookIndex(i)}
              />
              <span className="mono mt-2 flex-none text-[10px] text-[var(--color-muted)]">{h.length}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="s-headline">
          ข้อความค้างบนจอทั้งคลิป
        </label>
        <input
          id="s-headline"
          className="field"
          value={script.headline}
          onChange={(e) => onChange({ ...script, headline: e.target.value })}
        />
      </div>

      <div>
        <span className="label">ซีนเนื้อหา</span>
        <div className="grid gap-2.5">
          {script.scenes.map((s, i) => (
            <div key={i} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="mono text-[11px] text-[var(--color-muted)]">ซีน {String(i + 1).padStart(2, '0')}</span>
                <span className="mono text-[11px] text-[var(--color-muted)]">{s.durationSec.toFixed(1)} วิ</span>
              </div>
              <div className="grid gap-2">
                <div>
                  <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                    ข้อความบนจอ
                  </span>
                  <input className="field" value={s.caption} onChange={(e) => setScene(i, { caption: e.target.value })} />
                </div>
                {!audioless ? (
                  <div>
                    <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      เสียงพากย์พูดว่า
                    </span>
                    <textarea
                      className="field resize-y"
                      rows={2}
                      value={s.vo}
                      onChange={(e) => setScene(i, { vo: e.target.value })}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!audioless ? (
        <div>
          <label className="label" htmlFor="s-cta">
            ประโยคปิด (CTA)
          </label>
          <input
            id="s-cta"
            className="field"
            value={script.cta}
            onChange={(e) => onChange({ ...script, cta: e.target.value })}
          />
        </div>
      ) : null}

      {script.hashtags.length ? (
        <div>
          <span className="label">แฮชแท็กที่แนะนำ</span>
          <div className="flex flex-wrap gap-1.5">
            {script.hashtags.map((h) => (
              <Pill key={h}>#{h}</Pill>
            ))}
          </div>
          <button
            type="button"
            className="btn-ghost mt-2 px-3 py-1 text-xs"
            onClick={() => navigator.clipboard?.writeText(script.hashtags.map((h) => `#${h}`).join(' '))}
          >
            คัดลอกแฮชแท็ก
          </button>
        </div>
      ) : null}
    </div>
  );
}
