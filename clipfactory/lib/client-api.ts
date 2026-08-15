'use client';

import type { GeneratedScript, Platform, ProductInput, TemplateId, VoiceSegment } from './types';

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) return body.error;
  } catch {
    /* ไม่ใช่ JSON */
  }
  return `เกิดข้อผิดพลาด (HTTP ${res.status})`;
}

export async function requestScript(args: {
  product: ProductInput;
  templateId: TemplateId;
  platform: Platform;
  targetSec: number;
  signal?: AbortSignal;
}): Promise<GeneratedScript> {
  const res = await fetch('/api/script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: args.product,
      templateId: args.templateId,
      platform: args.platform,
      targetSec: args.targetSec,
    }),
    signal: args.signal,
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { script: GeneratedScript };
  return data.script;
}

export async function requestVoiceLine(args: {
  text: string;
  voiceName: string;
  styleId: string;
  signal?: AbortSignal;
}): Promise<{ url: string; durationSec: number }> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: args.text, voiceName: args.voiceName, styleId: args.styleId }),
    signal: args.signal,
  });
  if (!res.ok) throw new Error(await readError(res));

  const blob = await res.blob();
  const headerDur = Number(res.headers.get('X-Duration-Sec'));
  const durationSec = Number.isFinite(headerDur) && headerDur > 0 ? headerDur : 0;
  return { url: URL.createObjectURL(blob), durationSec };
}

/**
 * สร้างเสียงพากย์ทีละบรรทัด — ทำแบบทีละตัวเพื่อไม่ให้ชน rate limit ของ Google AI Studio
 * และเพื่อให้ผู้ใช้เห็นความคืบหน้าจริง
 */
export async function synthesizeLines(args: {
  lines: { key: string; text: string }[];
  voiceName: string;
  styleId: string;
  onProgress?: (done: number, total: number, currentText: string) => void;
  signal?: AbortSignal;
}): Promise<VoiceSegment[]> {
  const out: VoiceSegment[] = [];
  const total = args.lines.length;

  for (let i = 0; i < total; i++) {
    const line = args.lines[i];
    args.onProgress?.(i, total, line.text);
    const { url, durationSec } = await requestVoiceLine({
      text: line.text,
      voiceName: args.voiceName,
      styleId: args.styleId,
      signal: args.signal,
    });
    out.push({ key: line.key, text: line.text, url, durationSec });
  }

  args.onProgress?.(total, total, '');
  return out;
}

/** อ่านความยาวจริงของไฟล์เสียงจากเบราว์เซอร์ เผื่อ header ไม่มา */
export async function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const a = new Audio();
    a.preload = 'metadata';
    a.onloadedmetadata = () => resolve(Number.isFinite(a.duration) ? a.duration : 0);
    a.onerror = () => resolve(0);
    a.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** ชื่อไฟล์ที่ปลอดภัยกับทุกระบบไฟล์ */
export function safeFilename(base: string, suffix: string): string {
  const clean = base
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48)
    .replace(/^-+|-+$/g, '');
  return `${clean || 'clip'}-${suffix}.mp4`;
}
