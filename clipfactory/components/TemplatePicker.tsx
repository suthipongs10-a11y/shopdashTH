'use client';

import { useMemo, useState } from 'react';
import { suggestTemplates } from '@/lib/templates';
import type { FormatTemplate, Platform, TemplateId } from '@/lib/types';
import { Pill } from './ui';

const AUDIO_LABEL: Record<FormatTemplate['audio'], string> = {
  'voice-only': 'เสียงพูดล้วน',
  'voice+music': 'พูด + เพลงเบา',
  'music-only': 'เพลงล้วน ไม่มีเสียงพูด',
};

export function TemplatePicker({
  category,
  platform,
  selected,
  onSelect,
}: {
  category: string;
  platform: Platform;
  selected: TemplateId | null;
  onSelect: (t: FormatTemplate) => void;
}) {
  const [expanded, setExpanded] = useState<TemplateId | null>(null);
  const ordered = useMemo(() => suggestTemplates(category), [category]);
  const available = ordered.filter((t) => t.platforms.includes(platform));
  const unavailable = ordered.filter((t) => !t.platforms.includes(platform));

  const renderCard = (t: FormatTemplate, disabled: boolean) => {
    const isOpen = expanded === t.id;
    const isSel = selected === t.id;
    return (
      <div
        key={t.id}
        className={`rounded-lg border transition ${
          isSel
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/[0.07]'
            : 'border-[var(--color-line)] bg-[var(--color-panel-2)]'
        } ${disabled ? 'opacity-45' : ''}`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(t)}
          className="flex w-full items-start gap-3 p-3.5 text-left disabled:cursor-not-allowed"
        >
          <span
            className={`mono mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded text-[11px] font-bold ${
              isSel ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]' : 'bg-[var(--color-line)] text-[var(--color-muted)]'
            }`}
          >
            {String(t.rank).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">{t.nameTh}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-muted)]">{t.taglineTh}</span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <Pill tone="accent">
                {t.derived.durationSec === 'inferred' ? '~ ' : ''}
                {t.durationSec[0]}–{t.durationSec[1]} วิ
              </Pill>
              <Pill>
                {t.derived.audio === 'inferred' ? '~ ' : ''}
                {AUDIO_LABEL[t.audio]}
              </Pill>
              {t.loop ? <Pill>วนลูป</Pill> : null}
              {t.warningTh ? <Pill tone="warn">มีข้อจำกัด</Pill> : null}
            </span>
          </span>
        </button>

        <div className="border-t border-[var(--color-line-soft)] px-3.5 py-2">
          <button
            type="button"
            onClick={() => setExpanded(isOpen ? null : t.id)}
            className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            aria-expanded={isOpen}
          >
            {isOpen ? 'ซ่อนหลักฐาน ▲' : `ดูคลิปจริงที่ใช้สูตรนี้ (${t.evidence.length}) ▼`}
          </button>
          {isOpen ? (
            <div className="mt-2 grid gap-1.5 pb-1">
              {t.warningTh ? (
                <p className="mb-1 text-[11px] leading-relaxed text-[var(--color-danger)]">⚠ {t.warningTh}</p>
              ) : null}
              {t.evidence.map((e) => (
                <div key={e.handle} className="flex items-baseline justify-between gap-3 text-[11px]">
                  <span className="mono flex-none text-[var(--color-ink-soft)]">{e.handle}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--color-muted)]">{e.note}</span>
                  <span className="mono flex-none text-[var(--color-ink)]">{e.views}</span>
                  <span className="mono flex-none font-bold text-[var(--color-accent)]">{e.outlier}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-2.5">
      <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
        ค่าที่ขึ้นต้นด้วย <span className="mono">~</span> คือค่าที่เราอนุมานเอง งานวิจัยไม่ได้ระบุไว้ ·
        ค่าที่ไม่มีเครื่องหมายวัดจากคลิปจริงในหลักฐานใต้แต่ละสูตร
      </p>
      {available.map((t) => renderCard(t, false))}
      {unavailable.length ? (
        <>
          <p className="mt-2 text-[11px] text-[var(--color-muted)]">
            สูตรที่ไม่เหมาะกับ {platform === 'shopee' ? 'Shopee Video' : 'TikTok'}
          </p>
          {unavailable.map((t) => renderCard(t, true))}
        </>
      ) : null}
    </div>
  );
}
