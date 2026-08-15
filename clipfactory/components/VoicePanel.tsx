'use client';

import { VOICES } from '@/lib/types';
import type { VoiceSegment } from '@/lib/types';
import { Bar, Pill, Spinner } from './ui';

/** ต้องตรงกับ VOICE_STYLES ใน lib/gemini/tts.ts */
export const STYLE_OPTIONS = [
  { id: 'natural', labelTh: 'คุยธรรมดา (แนะนำ)' },
  { id: 'energetic', labelTh: 'กระตือรือร้น เร็ว' },
  { id: 'calm', labelTh: 'นุ่ม ให้ข้อมูล' },
  { id: 'gossip', labelTh: 'เล่าแบบเมาท์' },
];

export function VoicePanel({
  voiceName,
  styleId,
  segments,
  busy,
  progress,
  onVoice,
  onStyle,
  onGenerate,
  lineCount,
}: {
  voiceName: string;
  styleId: string;
  segments: VoiceSegment[];
  busy: boolean;
  progress: { done: number; total: number; current: string } | null;
  onVoice: (v: string) => void;
  onStyle: (s: string) => void;
  onGenerate: () => void;
  lineCount: number;
}) {
  const totalSec = segments.reduce((a, s) => a + s.durationSec, 0);

  return (
    <div className="grid gap-4">
      <p className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3 text-xs leading-relaxed text-[var(--color-ink-soft)]">
        ไม่ต้องพูดเอง — Gemini TTS จาก Google AI Studio จะอ่านสคริปต์ให้เป็นเสียงไทย
        ระบบสร้างเสียงแยกทีละบรรทัด เพื่อให้ข้อความบนจอตรงกับเสียงพอดี
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="v-voice">
            เสียงผู้พากย์
          </label>
          <select id="v-voice" className="field" value={voiceName} onChange={(e) => onVoice(e.target.value)}>
            {VOICES.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} — {v.descTh}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="v-style">
            โทนการพูด
          </label>
          <select id="v-style" className="field" value={styleId} onChange={(e) => onStyle(e.target.value)}>
            {STYLE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.labelTh}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={onGenerate} disabled={busy || lineCount === 0}>
          {segments.length ? 'สร้างเสียงใหม่ทั้งหมด' : `สร้างเสียงพากย์ ${lineCount} บรรทัด`}
        </button>
        {busy && progress ? <Spinner label={`กำลังอ่านบรรทัดที่ ${progress.done + 1}/${progress.total}`} /> : null}
        {!busy && segments.length ? (
          <Pill tone="accent">รวม {totalSec.toFixed(1)} วินาที</Pill>
        ) : null}
      </div>

      {busy && progress ? (
        <div>
          <Bar ratio={progress.total ? progress.done / progress.total : 0} />
          {progress.current ? (
            <p className="mt-1.5 truncate text-[11px] text-[var(--color-muted)]">“{progress.current}”</p>
          ) : null}
        </div>
      ) : null}

      {segments.length ? (
        <div className="grid gap-1.5">
          {segments.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2"
            >
              <span className="mono flex-none text-[10px] uppercase tracking-wider text-[var(--color-muted)]">
                {s.key}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-ink-soft)]">{s.text}</span>
              <span className="mono flex-none text-[10px] text-[var(--color-muted)]">{s.durationSec.toFixed(1)}s</span>
              <audio controls src={s.url} className="h-7 w-40 flex-none" preload="none" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
