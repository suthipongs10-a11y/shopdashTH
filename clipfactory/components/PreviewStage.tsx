'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { drawFrame, type Drawable } from '@/lib/render/draw';
import type { RenderOptions, Timeline } from '@/lib/types';

export interface VoiceCue {
  startSec: number;
  url: string;
}

/** พรีวิว 9:16 พร้อมเส้นเขตปลอดภัย และเล่นเสียงพากย์ตามจังหวะจริง */
export function PreviewStage({
  timeline,
  images,
  options,
  productName,
  cues,
}: {
  timeline: Timeline;
  images: Drawable[];
  options: RenderOptions;
  productName: string;
  cues: VoiceCue[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  // rAF ที่ self-schedule จะจับ closure ของเฟรมที่สร้างมัน — เก็บตัวล่าสุดไว้ใน ref กันพรีวิวค้าง
  const tickRef = useRef<() => void>(() => {});
  const startedAtRef = useRef(0);
  const audiosRef = useRef<HTMLAudioElement[]>([]);
  const firedRef = useRef<Set<number>>(new Set());

  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);

  const total = Math.max(0.1, timeline.totalSec);

  const paint = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawFrame(ctx, time, timeline, images, options, productName);
    },
    [timeline, images, options, productName],
  );

  const stopAudio = useCallback(() => {
    for (const a of audiosRef.current) {
      a.pause();
      a.currentTime = 0;
    }
    audiosRef.current = [];
    firedRef.current.clear();
  }, []);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlaying(false);
    stopAudio();
  }, [stopAudio]);

  // วาดใหม่ทุกครั้งที่ข้อมูลเปลี่ยน (ตอนหยุดอยู่)
  useEffect(() => {
    if (!playing) paint(Math.min(t, total));
  }, [paint, playing, t, total]);

  useEffect(() => () => stop(), [stop]);

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    if (elapsed >= total) {
      paint(total);
      setT(total);
      stop();
      return;
    }

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      if (!firedRef.current.has(i) && elapsed >= cue.startSec) {
        firedRef.current.add(i);
        const audio = new Audio(cue.url);
        audio.play().catch(() => {
          /* เบราว์เซอร์บล็อกเสียงอัตโนมัติ — ไม่เป็นไร ภาพยังเล่นต่อ */
        });
        audiosRef.current.push(audio);
      }
    }

    paint(elapsed);
    setT(elapsed);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [cues, paint, stop, total]);

  tickRef.current = tick;

  const play = useCallback(() => {
    stopAudio();
    startedAtRef.current = performance.now();
    setPlaying(true);
    rafRef.current = requestAnimationFrame(() => tickRef.current());
  }, [stopAudio]);

  return (
    <div className="grid gap-3">
      <div className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-xl border border-[var(--color-line)] bg-black">
        <canvas
          ref={canvasRef}
          width={options.width}
          height={options.height}
          className="block h-auto w-full"
          aria-label="พรีวิวคลิป"
        />
      </div>

      <div className="mx-auto flex w-full max-w-[300px] items-center gap-3">
        <button
          type="button"
          className="btn-ghost flex-none px-3 py-1.5 text-xs"
          onClick={() => (playing ? stop() : play())}
        >
          {playing ? '■ หยุด' : '▶ เล่น'}
        </button>
        <input
          type="range"
          min={0}
          max={total}
          step={0.05}
          value={Math.min(t, total)}
          onChange={(e) => {
            if (playing) stop();
            setT(Number(e.target.value));
          }}
          className="h-1 flex-1 accent-[var(--color-accent)]"
          aria-label="เลื่อนดูตำแหน่งในคลิป"
        />
        <span className="mono flex-none text-[11px] text-[var(--color-muted)]">
          {t.toFixed(1)} / {total.toFixed(1)}s
        </span>
      </div>
    </div>
  );
}
