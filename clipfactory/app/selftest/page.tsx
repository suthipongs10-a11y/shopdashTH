'use client';

import { useCallback, useEffect, useState } from 'react';
import { checkSupport, renderClip } from '@/lib/render/encode';
import { DEFAULT_RENDER, DEFAULT_THEME, type RenderOptions, type Timeline } from '@/lib/types';
import { Bar, ErrorNote, Pill } from '@/components/ui';

interface Check {
  id: string;
  labelTh: string;
  status: 'pending' | 'running' | 'pass' | 'fail';
  detail?: string;
}

const INITIAL: Check[] = [
  { id: 'support', labelTh: 'เบราว์เซอร์รองรับ WebCodecs', status: 'pending' },
  { id: 'canvas', labelTh: 'วาดภาพและตัวอักษรไทยบน canvas', status: 'pending' },
  { id: 'audio', labelTh: 'สร้างและผสมเสียง', status: 'pending' },
  { id: 'render', labelTh: 'เรนเดอร์ไฟล์ mp4', status: 'pending' },
  { id: 'mp4', labelTh: 'ไฟล์ที่ได้เป็น mp4 ที่ถูกต้อง', status: 'pending' },
];

/** ไทม์ไลน์จำลอง 3 ช็อต สำหรับทดสอบระบบโดยไม่ต้องเรียก Gemini */
function demoTimeline(): Timeline {
  const captions = [
    '5 อย่างที่ซื้อแล้วไม่เสียดายเงิน',
    'ข้อแรก ผงซักผ้าขจัดคราบฝังลึก',
    'กดตะกร้าเหลืองข้างล่างได้เลย',
  ];
  const shots = captions.map((caption, i) => ({
    startSec: i * 0.8,
    endSec: (i + 1) * 0.8,
    caption,
    assetIndex: i,
    kind: (i === 0 ? 'hook' : i === captions.length - 1 ? 'cta' : 'body') as 'hook' | 'body' | 'cta',
  }));
  return { shots, totalSec: shots.length * 0.8 };
}

async function demoImage(seed: number): Promise<ImageBitmap> {
  const c = new OffscreenCanvas(720, 1280);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 720, 1280);
  g.addColorStop(0, `hsl(${seed * 55 + 20} 55% 42%)`);
  g.addColorStop(1, `hsl(${seed * 55 + 70} 45% 18%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 720, 1280);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(360, 520, 200, 0, Math.PI * 2);
  ctx.fill();
  return c.transferToImageBitmap();
}

async function demoAudio(seconds: number): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * 48000), 48000);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 220;
  gain.gain.value = 0.08;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(0);
  osc.stop(seconds);
  return ctx.startRendering();
}

export default function SelfTestPage() {
  const [checks, setChecks] = useState<Check[]>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [ratio, setRatio] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [summary, setSummary] = useState<string | null>(null);

  const mark = useCallback((id: string, status: Check['status'], detail?: string) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, status, detail } : c)));
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    setError('');
    setWarning('');
    setSummary(null);
    setVideoUrl(null);
    setChecks(INITIAL.map((c) => ({ ...c, status: 'pending' as const })));

    try {
      mark('support', 'running');
      const support = checkSupport();
      if (!support.ok) {
        mark('support', 'fail', support.reasonTh);
        throw new Error(support.reasonTh);
      }
      mark('support', 'pass');

      mark('canvas', 'running');
      const images = await Promise.all([demoImage(0), demoImage(1), demoImage(2)]);
      if (!images.every((b) => b.width > 0)) throw new Error('สร้างภาพทดสอบไม่สำเร็จ');
      mark('canvas', 'pass', `${images.length} ภาพ ${images[0].width}×${images[0].height}`);

      const timeline = demoTimeline();

      mark('audio', 'running');
      const audio = await demoAudio(timeline.totalSec);
      mark('audio', 'pass', `${audio.numberOfChannels} ช่อง · ${audio.sampleRate} Hz · ${audio.duration.toFixed(1)} วิ`);

      mark('render', 'running');
      const options: RenderOptions = {
        ...DEFAULT_RENDER,
        headline: 'ทดสอบระบบ ClipFactory',
        showSafeGuides: false,
        theme: DEFAULT_THEME,
      };
      const started = performance.now();
      const { blob, videoCodec, audioCodec, warningTh } = await renderClip({
        timeline,
        images,
        options,
        audio,
        productName: 'สินค้าทดสอบ',
        onProgress: (p) => setRatio(p.phase === 'video' ? p.ratio * 0.85 : 0.85 + p.ratio * 0.15),
      });
      const elapsed = (performance.now() - started) / 1000;
      mark(
        'render',
        'pass',
        `${(blob.size / 1024).toFixed(0)} KB · ${videoCodec.toUpperCase()}${
          audioCodec ? ` + ${audioCodec.toUpperCase()}` : ' (ไม่มีเสียง)'
        } · ใช้เวลา ${elapsed.toFixed(1)} วิ`,
      );
      if (warningTh) setWarning(warningTh);

      mark('mp4', 'running');
      const head = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
      const tag = String.fromCharCode(...head.slice(4, 8));
      if (tag !== 'ftyp') throw new Error(`ไฟล์ที่ได้ไม่ใช่ mp4 (พบ "${tag}")`);
      if (blob.size < 1024) throw new Error('ไฟล์ที่ได้เล็กผิดปกติ');
      mark('mp4', 'pass', `ftyp box ถูกต้อง · ${blob.type}`);

      setVideoUrl(URL.createObjectURL(blob));
      setSummary(`ผ่านทั้งหมด — เครื่องนี้สร้างคลิปได้ (ไฟล์ทดสอบ ${(blob.size / 1024).toFixed(0)} KB)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setChecks((prev) => prev.map((c) => (c.status === 'running' ? { ...c, status: 'fail', detail: msg } : c)));
    } finally {
      setBusy(false);
      setRatio(0);
    }
  }, [mark]);

  // เปิดให้สคริปต์ทดสอบอัตโนมัติอ่านผลได้
  useEffect(() => {
    const w = window as unknown as { __selftest?: unknown };
    w.__selftest = { checks, busy, summary, error, warning, run };
  }, [checks, busy, summary, error, warning, run]);

  const allPass = checks.every((c) => c.status === 'pass');

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold">ทดสอบระบบเรนเดอร์</h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-soft)]">
        หน้านี้สร้างคลิปทดสอบสั้นๆ ในเครื่องคุณโดยไม่เรียก Gemini และไม่ใช้อินเทอร์เน็ต
        ใช้ตรวจว่าเบราว์เซอร์ของคุณเรนเดอร์ mp4 ได้ก่อนลงมือทำคลิปจริง
      </p>

      <button type="button" className="btn-primary mt-5" onClick={run} disabled={busy} data-testid="run">
        {busy ? 'กำลังทดสอบ…' : 'เริ่มทดสอบ'}
      </button>

      {busy ? (
        <div className="mt-4">
          <Bar ratio={ratio} label="กำลังเรนเดอร์คลิปทดสอบ" />
        </div>
      ) : null}

      <ul className="mt-6 grid gap-2" data-testid="checks">
        {checks.map((c) => (
          <li
            key={c.id}
            data-check={c.id}
            data-status={c.status}
            className="flex items-start gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3"
          >
            <span
              className={`mono mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded text-[11px] font-bold ${
                c.status === 'pass'
                  ? 'bg-[var(--color-ok)] text-[var(--color-accent-ink)]'
                  : c.status === 'fail'
                    ? 'bg-[var(--color-danger)] text-[var(--color-accent-ink)]'
                    : 'bg-[var(--color-line)] text-[var(--color-muted)]'
              }`}
            >
              {c.status === 'pass' ? '✓' : c.status === 'fail' ? '✕' : c.status === 'running' ? '…' : '·'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{c.labelTh}</span>
              {c.detail ? (
                <span className="mono mt-0.5 block text-[11px] text-[var(--color-muted)]">{c.detail}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      {summary ? (
        <p
          data-testid="summary"
          className="mt-5 rounded-lg border border-[var(--color-ok)]/45 bg-[var(--color-ok)]/10 px-4 py-3 text-sm text-[var(--color-ok)]"
        >
          {summary}
        </p>
      ) : null}

      <ErrorNote message={error} />

      {warning ? (
        <p
          data-testid="warning"
          className="mt-3 rounded-lg border border-[var(--color-accent)]/45 bg-[var(--color-accent)]/10 px-4 py-3 text-xs leading-relaxed text-[var(--color-accent)]"
        >
          {warning}
        </p>
      ) : null}

      {videoUrl ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="label mb-0">คลิปทดสอบที่ได้</span>
            {allPass ? <Pill tone="accent">พร้อมใช้งาน</Pill> : null}
          </div>
          <video src={videoUrl} controls className="h-auto w-full max-w-[240px] rounded-xl" data-testid="video" />
        </div>
      ) : null}

      <a href="/" className="mt-8 inline-block text-xs text-[var(--color-muted)] underline">
        ← กลับไปหน้าสร้างคลิป
      </a>
    </main>
  );
}
