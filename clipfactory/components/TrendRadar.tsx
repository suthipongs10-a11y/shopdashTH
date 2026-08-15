'use client';

import { useMemo, useState } from 'react';
import { campaignLabel, upcomingCampaigns, type UpcomingCampaign } from '@/lib/campaigns';
import { CATEGORIES, TEMPLATE_BY_ID } from '@/lib/templates';
import type { TrendCard, TrendReport } from '@/lib/types';
import { ErrorNote, Pill, Spinner } from './ui';

const CONFIDENCE: Record<TrendCard['confidence'], { labelTh: string; tone: 'accent' | 'default' | 'warn' }> = {
  high: { labelTh: 'มีหลักฐานชัด', tone: 'accent' },
  medium: { labelTh: 'พอมีหลักฐาน', tone: 'default' },
  low: { labelTh: 'เป็นการคาดเดา', tone: 'warn' },
};

const KIND_ICON: Record<UpcomingCampaign['kind'], string> = {
  'double-date': '🔥',
  payday: '💸',
  festival: '🎉',
  seasonal: '📅',
};

/** ปฏิทินแคมเปญ — คำนวณจากวันที่ล้วน ไม่ต้องเรียก API */
function CampaignStrip({ onPick }: { onPick: (c: UpcomingCampaign) => void }) {
  const campaigns = useMemo(() => upcomingCampaigns(new Date(), 45).slice(0, 6), []);
  if (!campaigns.length) return null;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label mb-0">แคมเปญที่กำลังจะมา</span>
        <span className="text-[10px] text-[var(--color-muted)]">คลิปสูตรดีลทำ outlier ได้สูงสุด แต่ตายเมื่อจบแคมเปญ</span>
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {campaigns.map((c) => (
          <li key={`${c.nameTh}-${c.date.toISOString()}`} className="flex-none">
            <button
              type="button"
              onClick={() => onPick(c)}
              className={`flex w-[168px] flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition ${
                c.isActionable || c.isLive
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/[0.07]'
                  : 'border-[var(--color-line)] bg-[var(--color-panel-2)] hover:border-[var(--color-accent)]'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold">
                  {KIND_ICON[c.kind]} {c.nameTh}
                </span>
                <span
                  className={`mono text-[10px] ${
                    c.isLive || c.isActionable ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'
                  }`}
                >
                  {campaignLabel(c)}
                </span>
              </span>
              <span className="text-[10px] leading-relaxed text-[var(--color-muted)]">{c.noteTh}</span>
              {c.isActionable && !c.isLive ? (
                <span className="text-[10px] font-semibold text-[var(--color-accent)]">ถึงเวลาเริ่มทำคลิปแล้ว</span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendRadar({
  report,
  busy,
  error,
  onSearch,
  onUseTrend,
  onDismissError,
}: {
  report: TrendReport | null;
  busy: boolean;
  error: string;
  onSearch: (query: string) => void;
  onUseTrend: (trend: TrendCard) => void;
  onDismissError: () => void;
}) {
  const [query, setQuery] = useState('');

  return (
    <div className="grid gap-5">
      <CampaignStrip onPick={(c) => setQuery(`สินค้าขายดีช่วงแคมเปญ ${c.nameTh}`)} />

      <div>
        <label className="label" htmlFor="trend-q">
          อยากรู้ว่าอะไรกำลังมาแรงในหมวดไหน
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="trend-q"
            className="field min-w-[220px] flex-1"
            list="trend-cats"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim() && !busy) onSearch(query.trim());
            }}
            placeholder="เช่น สกินแคร์ · ของใช้ในบ้าน · ของกินเล่น"
            disabled={busy}
          />
          <datalist id="trend-cats">
            {CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSearch(query.trim())}
            disabled={busy || query.trim().length < 2}
          >
            {busy ? 'กำลังค้น…' : 'ค้นเทรนด์ตอนนี้'}
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
          Gemini จะค้น Google สดเพื่อดูว่าตอนนี้มีอะไรมาแรงในไทย แล้วสรุปเป็นมุมทำคลิปให้
          — ใช้เวลาราวครึ่งนาที
        </p>
        {busy ? (
          <div className="mt-3">
            <Spinner label="กำลังค้นข้อมูลล่าสุดจากเว็บ" />
          </div>
        ) : null}
      </div>

      <ErrorNote message={error} onDismiss={onDismissError} />

      {report ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="label mb-0">
              เทรนด์สำหรับ “{report.queryTh}” — {report.trends.length} รายการ
            </span>
            <span className="mono text-[10px] text-[var(--color-muted)]">ค้นเมื่อ {report.searchedAt}</span>
          </div>

          {report.trends.map((t, i) => {
            const tpl = t.templateId ? TEMPLATE_BY_ID.get(t.templateId) : null;
            const conf = CONFIDENCE[t.confidence];
            return (
              <article
                key={`${t.title}-${i}`}
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold">{t.title}</h3>
                  <Pill tone={conf.tone}>{conf.labelTh}</Pill>
                </div>

                <dl className="mt-2.5 grid gap-2 text-[11px] leading-relaxed">
                  <div>
                    <dt className="text-[var(--color-muted)]">ทำไมมาแรงตอนนี้</dt>
                    <dd className="text-[var(--color-ink-soft)]">{t.whyNowTh}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-muted)]">มุมเล่าที่แนะนำ</dt>
                    <dd className="text-[var(--color-ink-soft)]">{t.angleTh}</dd>
                  </div>
                </dl>

                {t.productIdeas.length ? (
                  <div className="mt-2.5">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      สินค้าที่เกาะเทรนด์นี้ได้
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {t.productIdeas.map((p) => (
                        <Pill key={p}>{p}</Pill>
                      ))}
                    </div>
                  </div>
                ) : null}

                {t.hookExamples.length ? (
                  <div className="mt-2.5">
                    <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                      ตัวอย่าง hook 3 วิแรก
                    </span>
                    <ul className="grid gap-1">
                      {t.hookExamples.map((h) => (
                        <li key={h} className="text-[11px] text-[var(--color-ink-soft)]">
                          “{h}”
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => onUseTrend(t)}>
                    ทำคลิปจากเทรนด์นี้
                  </button>
                  {tpl ? <Pill tone="accent">สูตรที่แนะนำ · {tpl.nameTh}</Pill> : null}
                  {t.hashtags.length ? (
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1.5 text-xs"
                      onClick={() => navigator.clipboard?.writeText(t.hashtags.map((h) => `#${h}`).join(' '))}
                    >
                      คัดลอกแฮชแท็ก ({t.hashtags.length})
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}

          {report.sources.length ? (
            <details className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
              <summary className="cursor-pointer text-[11px] text-[var(--color-muted)]">
                แหล่งอ้างอิงที่ใช้ค้น ({report.sources.length})
              </summary>
              <ul className="mt-2 grid gap-1">
                {report.sources.map((s) => (
                  <li key={s.url} className="truncate text-[11px]">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-ink-soft)] underline decoration-[var(--color-accent)] underline-offset-2"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
            เทรนด์มาจากการค้นเว็บ ไม่ใช่ข้อมูลยอดวิวจริงจากแพลตฟอร์ม — ใช้เป็นทิศทาง
            แล้วตรวจกับสิ่งที่เห็นในฟีดจริงอีกครั้งก่อนลงมือ
          </p>
        </div>
      ) : null}
    </div>
  );
}
