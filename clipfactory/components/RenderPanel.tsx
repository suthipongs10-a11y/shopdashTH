'use client';

import { useRef } from 'react';
import { Bar, Pill } from './ui';

export interface RenderedClip {
  id: string;
  /** ลำดับ hook ที่ใช้เรนเดอร์คลิปนี้ (เริ่มที่ 0) */
  hookIndex: number;
  labelTh: string;
  hookText: string;
  blob: Blob;
  url: string;
  sizeMB: string;
  durationSec: number;
}

export function RenderPanel({
  supportReason,
  busy,
  progressLabel,
  progressRatio,
  hookCount,
  showGuides,
  musicName,
  results,
  onToggleGuides,
  onPickMusic,
  onClearMusic,
  onRenderOne,
  onRenderAll,
  onCancel,
  onDownload,
  onDownloadAll,
}: {
  supportReason: string | null;
  busy: boolean;
  progressLabel: string;
  progressRatio: number;
  hookCount: number;
  showGuides: boolean;
  musicName: string | null;
  results: RenderedClip[];
  onToggleGuides: (v: boolean) => void;
  onPickMusic: (f: File) => void;
  onClearMusic: () => void;
  onRenderOne: () => void;
  onRenderAll: () => void;
  onCancel: () => void;
  onDownload: (c: RenderedClip) => void;
  onDownloadAll: () => void;
}) {
  const musicRef = useRef<HTMLInputElement>(null);

  if (supportReason) {
    return (
      <div className="rounded-lg border border-[var(--color-danger)]/45 bg-[var(--color-danger)]/10 p-4 text-sm leading-relaxed text-[var(--color-danger)]">
        {supportReason}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2.5 text-xs">
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(e) => onToggleGuides(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          <span>
            แสดงเส้นเขตปลอดภัยในพรีวิว
            <span className="mt-0.5 block text-[10px] text-[var(--color-muted)]">ไฟล์ที่ส่งออกจะไม่มีเส้นนี้</span>
          </span>
        </label>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] px-3 py-2.5 text-xs">
          {musicName ? (
            <>
              <span className="min-w-0 flex-1 truncate">🎵 {musicName}</span>
              <button type="button" onClick={onClearMusic} className="flex-none text-[var(--color-danger)]">
                ลบ
              </button>
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1 text-[var(--color-muted)]">ยังไม่ได้ใส่เพลงประกอบ</span>
              <button type="button" onClick={() => musicRef.current?.click()} className="flex-none underline">
                เลือกไฟล์
              </button>
            </>
          )}
          <input
            ref={musicRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickMusic(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
        ใช้เพลงจากคลังเพลงเชิงพาณิชย์ของแพลตฟอร์มเท่านั้น — เพลงลิขสิทธิ์ทั่วไปจะทำให้คลิปถูกปิดเสียงหรือถูกจำกัดการมองเห็น
      </p>

      <div className="flex flex-wrap gap-2.5">
        <button type="button" className="btn-primary" onClick={onRenderOne} disabled={busy}>
          เรนเดอร์คลิปนี้
        </button>
        <button type="button" className="btn-ghost" onClick={onRenderAll} disabled={busy || hookCount < 2}>
          เรนเดอร์ทุก hook ({hookCount} คลิป)
        </button>
        {busy ? (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            ยกเลิก
          </button>
        ) : null}
      </div>

      {busy ? <Bar ratio={progressRatio} label={progressLabel} /> : null}

      {results.length ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="label mb-0">ไฟล์ที่เรนเดอร์แล้ว</span>
            {results.length > 1 ? (
              <button type="button" className="btn-ghost px-3 py-1 text-xs" onClick={onDownloadAll}>
                ดาวน์โหลดทั้งหมด
              </button>
            ) : null}
          </div>
          {results.map((r) => (
            <div key={r.id} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">{r.labelTh}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted)]">“{r.hookText}”</p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  <Pill>{r.sizeMB} MB</Pill>
                  <Pill>{r.durationSec.toFixed(1)}s</Pill>
                  <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={() => onDownload(r)}>
                    ดาวน์โหลด
                  </button>
                </div>
              </div>
              <video src={r.url} controls className="mt-2.5 h-auto w-full max-w-[220px] rounded-lg" preload="metadata" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
