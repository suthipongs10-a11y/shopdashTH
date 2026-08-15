import type { Timeline, VoiceSegment } from '../types';

export const MIX_SAMPLE_RATE = 48000;
export const MIX_CHANNELS = 2;

type AnyAudioContext = AudioContext | OfflineAudioContext;

let sharedCtx: AudioContext | null = null;

function decodeCtx(): AudioContext {
  if (!sharedCtx) {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

export async function decodeAudio(data: ArrayBuffer, ctx: AnyAudioContext = decodeCtx()): Promise<AudioBuffer> {
  // decodeAudioData ในบางเบราว์เซอร์ยัง detach ArrayBuffer เดิม จึงส่งสำเนาไปแทน
  return ctx.decodeAudioData(data.slice(0));
}

export async function fetchAudio(url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('โหลดไฟล์เสียงไม่สำเร็จ');
  return decodeAudio(await res.arrayBuffer());
}

/**
 * ประกอบเสียงพากย์ทุกบรรทัดเข้ากับไทม์ไลน์ แล้วผสมเพลงประกอบ (ถ้ามี)
 * ผลลัพธ์คือ AudioBuffer เดียวความยาวเท่าคลิป พร้อมส่งเข้า AudioEncoder
 */
export async function buildMixedAudio(args: {
  timeline: Timeline;
  voice: VoiceSegment[];
  music?: AudioBuffer | null;
  musicGain?: number;
  /** สูตร voice-only ชนะด้วยเสียงพูดล้วน — ห้ามผสมเพลงแม้ผู้ใช้จะแนบไฟล์มา */
  allowMusic?: boolean;
}): Promise<AudioBuffer | null> {
  const { timeline, voice } = args;
  const music = args.allowMusic === false ? null : (args.music ?? null);
  if (!voice.length && !music) return null;

  const totalSec = Math.max(0.5, timeline.totalSec);
  const OfflineCtor: typeof OfflineAudioContext =
    window.OfflineAudioContext ??
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;

  const offline = new OfflineCtor(
    MIX_CHANNELS,
    Math.ceil(totalSec * MIX_SAMPLE_RATE),
    MIX_SAMPLE_RATE,
  );

  // ── เสียงพากย์: วางตามเวลาเริ่มที่ไทม์ไลน์บอกไว้ตรงๆ อ้างอิงด้วย key ไม่ใช่ลำดับ
  const byKey = new Map(voice.map((v) => [v.key, v]));
  const voiceGain = offline.createGain();
  voiceGain.gain.value = 1;
  voiceGain.connect(offline.destination);

  for (const line of timeline.lines) {
    const seg = byKey.get(line.key);
    if (!seg || line.startSec >= totalSec) continue;
    try {
      const buf = await fetchAudio(seg.url);
      const src = offline.createBufferSource();
      src.buffer = buf;
      src.connect(voiceGain);
      src.start(line.startSec);
    } catch {
      // ข้ามบรรทัดที่โหลดไม่ได้ ดีกว่าล้มทั้งคลิป
    }
  }

  // ── เพลงประกอบ: เบาลงเมื่อมีเสียงพูด และ fade out ท้ายคลิป
  if (music) {
    const gainValue = args.musicGain ?? (voice.length ? 0.16 : 0.85);
    const g = offline.createGain();
    g.gain.value = gainValue;
    g.gain.setValueAtTime(gainValue, Math.max(0, totalSec - 1.2));
    g.gain.linearRampToValueAtTime(0.0001, totalSec);
    g.connect(offline.destination);

    // วนเพลงให้ยาวพอคลุมคลิปเสมอ — จำนวนรอบคำนวณจากความยาวจริง ไม่ใช่ค่าคงที่
    const loopLen = Math.max(0.05, music.duration);
    const maxLoops = Math.ceil(totalSec / loopLen) + 1;
    let at = 0;
    let guard = 0;
    while (at < totalSec && guard++ < maxLoops) {
      const src = offline.createBufferSource();
      src.buffer = music;
      src.connect(g);
      src.start(at);
      at += music.duration;
    }
  }

  return offline.startRendering();
}

/** แปลง AudioBuffer เป็นชุด AudioData สำหรับ AudioEncoder (f32-planar) */
export function* audioDataChunks(
  buffer: AudioBuffer,
  framesPerChunk = 1024,
): Generator<{ data: Float32Array<ArrayBuffer>; frames: number; timestampUs: number }> {
  const channels = buffer.numberOfChannels;
  const total = buffer.length;
  const planes: Float32Array[] = [];
  for (let c = 0; c < channels; c++) planes.push(buffer.getChannelData(c));

  for (let offset = 0; offset < total; offset += framesPerChunk) {
    const frames = Math.min(framesPerChunk, total - offset);
    const out = new Float32Array(frames * channels);
    for (let c = 0; c < channels; c++) {
      out.set(planes[c].subarray(offset, offset + frames), c * frames);
    }
    yield {
      data: out,
      frames,
      timestampUs: Math.round((offset / buffer.sampleRate) * 1_000_000),
    };
  }
}
