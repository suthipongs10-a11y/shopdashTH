import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { drawFrame, type Drawable } from './draw';
import { audioDataChunks, MIX_CHANNELS, MIX_SAMPLE_RATE } from './audio';
import type { RenderOptions, Timeline } from '../types';

export interface RenderProgress {
  phase: 'video' | 'audio' | 'mux';
  ratio: number;
  labelTh: string;
}

export class UnsupportedBrowserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedBrowserError';
  }
}

export function checkSupport(): { ok: boolean; reasonTh?: string } {
  if (typeof window === 'undefined') return { ok: false, reasonTh: 'เรนเดอร์ได้เฉพาะในเบราว์เซอร์' };
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') {
    return {
      ok: false,
      reasonTh:
        'เบราว์เซอร์นี้ยังไม่รองรับ WebCodecs ซึ่งจำเป็นต่อการสร้างไฟล์ mp4 — กรุณาใช้ Google Chrome หรือ Microsoft Edge เวอร์ชันล่าสุด',
    };
  }
  if (typeof OffscreenCanvas === 'undefined') {
    return { ok: false, reasonTh: 'เบราว์เซอร์นี้ไม่รองรับ OffscreenCanvas — กรุณาใช้ Chrome หรือ Edge' };
  }
  return { ok: true };
}

/**
 * ไล่หา codec ที่เครื่องรองรับจริง
 *
 * H.264 คือตัวที่ TikTok และ Shopee รับแน่นอน — Chrome และ Edge ตัวจริงมีให้ครบ
 * แต่ Chromium บางรุ่น (เช่นที่มากับ Linux บางดิสโทร) ไม่มีตัวเข้ารหัสลิขสิทธิ์
 * จึงถอยไป VP9 เพื่อให้ยังได้ไฟล์ออกมา แล้วค่อยเตือนผู้ใช้ว่าอาจต้องแปลงก่อนอัปโหลด
 */
const VIDEO_CANDIDATES: { codec: string; family: 'avc' | 'vp9' }[] = [
  { codec: 'avc1.640034', family: 'avc' },
  { codec: 'avc1.640033', family: 'avc' },
  { codec: 'avc1.4d0034', family: 'avc' },
  { codec: 'avc1.4d0033', family: 'avc' },
  { codec: 'avc1.42003d', family: 'avc' },
  { codec: 'avc1.42E033', family: 'avc' },
  { codec: 'vp09.00.51.08', family: 'vp9' },
  { codec: 'vp09.00.41.08', family: 'vp9' },
  { codec: 'vp09.00.10.08', family: 'vp9' },
];

interface PickedVideo {
  config: VideoEncoderConfig;
  family: 'avc' | 'vp9';
}

async function pickVideoCodec(
  width: number,
  height: number,
  fps: number,
  bitrate: number,
): Promise<PickedVideo | null> {
  for (const candidate of VIDEO_CANDIDATES) {
    for (const accel of ['prefer-hardware', 'prefer-software'] as const) {
      const config: VideoEncoderConfig = {
        codec: candidate.codec,
        width,
        height,
        framerate: fps,
        bitrate,
        hardwareAcceleration: accel,
        ...(candidate.family === 'avc' ? { avc: { format: 'avc' as const } } : {}),
      };
      try {
        const res = await VideoEncoder.isConfigSupported(config);
        if (res.supported && res.config) {
          return { config: res.config as VideoEncoderConfig, family: candidate.family };
        }
      } catch {
        /* ลองตัวถัดไป */
      }
    }
  }
  return null;
}

interface PickedAudio {
  config: AudioEncoderConfig;
  family: 'aac' | 'opus';
}

const AUDIO_CANDIDATES: { codec: string; family: 'aac' | 'opus' }[] = [
  { codec: 'mp4a.40.2', family: 'aac' },
  { codec: 'opus', family: 'opus' },
];

async function pickAudioCodec(sampleRate: number, channels: number): Promise<PickedAudio | null> {
  for (const candidate of AUDIO_CANDIDATES) {
    const config: AudioEncoderConfig = {
      codec: candidate.codec,
      sampleRate,
      numberOfChannels: channels,
      bitrate: 128_000,
    };
    try {
      const res = await AudioEncoder.isConfigSupported(config);
      if (res.supported && res.config) return { config: res.config as AudioEncoderConfig, family: candidate.family };
    } catch {
      /* ลองตัวถัดไป */
    }
  }
  return null;
}

const idle = () => new Promise<void>((r) => setTimeout(r, 0));

export interface RenderArgs {
  timeline: Timeline;
  images: Drawable[];
  options: RenderOptions;
  audio?: AudioBuffer | null;
  productName?: string;
  onProgress?: (p: RenderProgress) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
  videoCodec: 'avc' | 'vp9';
  audioCodec: 'aac' | 'opus' | null;
  /** คำเตือนภาษาไทยเมื่อไฟล์ที่ได้อาจไม่ผ่านการอัปโหลดตรงๆ */
  warningTh: string | null;
}

/**
 * เรนเดอร์คลิปเป็นไฟล์ mp4 ในเบราว์เซอร์ล้วน — ไม่ต้องติดตั้ง ffmpeg
 * ปกติได้ H.264 + AAC ซึ่งอัปโหลดขึ้น TikTok และ Shopee ได้ทันที
 */
export async function renderClip(args: RenderArgs): Promise<RenderResult> {
  const { timeline, images, options, audio, productName, onProgress, signal } = args;

  const support = checkSupport();
  if (!support.ok) throw new UnsupportedBrowserError(support.reasonTh!);

  const { width, height, fps } = options;
  const totalSec = Math.max(0.5, timeline.totalSec);
  const totalFrames = Math.max(1, Math.round(totalSec * fps));
  const bitrate = Math.round(width * height * fps * 0.13);

  const picked = await pickVideoCodec(width, height, fps, bitrate);
  if (!picked) {
    throw new UnsupportedBrowserError(
      'เบราว์เซอร์นี้เข้ารหัสวิดีโอไม่ได้เลย — กรุณาใช้ Google Chrome หรือ Microsoft Edge เวอร์ชันล่าสุด',
    );
  }
  const videoConfig = picked.config;

  const pickedAudio = audio ? await pickAudioCodec(MIX_SAMPLE_RATE, MIX_CHANNELS) : null;
  const audioConfig = pickedAudio?.config ?? null;

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: picked.family, width, height, frameRate: fps },
    ...(pickedAudio
      ? { audio: { codec: pickedAudio.family, numberOfChannels: MIX_CHANNELS, sampleRate: MIX_SAMPLE_RATE } }
      : {}),
    fastStart: 'in-memory',
  });

  let encodeError: Error | null = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encodeError = e instanceof Error ? e : new Error(String(e));
    },
  });
  videoEncoder.configure(videoConfig);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('สร้างพื้นที่วาดภาพไม่สำเร็จ');

  const keyEvery = Math.max(1, Math.round(fps * 2));

  for (let f = 0; f < totalFrames; f++) {
    if (signal?.aborted) {
      videoEncoder.close();
      throw new DOMException('ยกเลิกการเรนเดอร์แล้ว', 'AbortError');
    }
    if (encodeError) throw encodeError;

    const t = f / fps;
    drawFrame(ctx, t, timeline, images, options, productName);

    const frame = new VideoFrame(canvas, {
      timestamp: Math.round((f * 1_000_000) / fps),
      duration: Math.round(1_000_000 / fps),
    });
    videoEncoder.encode(frame, { keyFrame: f % keyEvery === 0 });
    frame.close();

    // กันคิวล้นและปล่อยให้ UI อัปเดตได้
    if (videoEncoder.encodeQueueSize > 12) {
      while (videoEncoder.encodeQueueSize > 6) await idle();
    }
    if (f % 6 === 0) {
      onProgress?.({ phase: 'video', ratio: f / totalFrames, labelTh: 'กำลังเรนเดอร์ภาพ' });
      await idle();
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  if (encodeError) throw encodeError;

  if (audio && audioConfig) {
    onProgress?.({ phase: 'audio', ratio: 0, labelTh: 'กำลังเข้ารหัสเสียง' });

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        encodeError = e instanceof Error ? e : new Error(String(e));
      },
    });
    audioEncoder.configure(audioConfig);

    let done = 0;
    const totalChunks = Math.ceil(audio.length / 1024);
    for (const chunk of audioDataChunks(audio)) {
      if (signal?.aborted) {
        audioEncoder.close();
        throw new DOMException('ยกเลิกการเรนเดอร์แล้ว', 'AbortError');
      }
      if (encodeError) throw encodeError;

      const data = new AudioData({
        format: 'f32-planar',
        sampleRate: audio.sampleRate,
        numberOfFrames: chunk.frames,
        numberOfChannels: audio.numberOfChannels,
        timestamp: chunk.timestampUs,
        data: chunk.data,
      });
      audioEncoder.encode(data);
      data.close();

      done++;
      if (audioEncoder.encodeQueueSize > 24) {
        while (audioEncoder.encodeQueueSize > 12) await idle();
      }
      if (done % 40 === 0) {
        onProgress?.({ phase: 'audio', ratio: done / totalChunks, labelTh: 'กำลังเข้ารหัสเสียง' });
        await idle();
      }
    }

    await audioEncoder.flush();
    audioEncoder.close();
    if (encodeError) throw encodeError;
  }

  onProgress?.({ phase: 'mux', ratio: 1, labelTh: 'กำลังประกอบไฟล์ mp4' });
  muxer.finalize();

  const buffer = (muxer.target as ArrayBufferTarget).buffer;
  if (!buffer) throw new Error('ประกอบไฟล์ mp4 ไม่สำเร็จ');

  const warnings: string[] = [];
  if (picked.family !== 'avc') {
    warnings.push(
      'เบราว์เซอร์นี้ไม่มีตัวเข้ารหัส H.264 ระบบจึงใช้ VP9 แทน — ไฟล์เล่นได้ปกติ แต่ TikTok และ Shopee อาจไม่รับ แนะนำให้เปิดงานนี้ใน Google Chrome หรือ Microsoft Edge แล้วเรนเดอร์ใหม่',
    );
  }
  if (audio && !audioConfig) {
    warnings.push('เบราว์เซอร์นี้เข้ารหัสเสียงไม่ได้ ไฟล์ที่ได้จึงไม่มีเสียง');
  } else if (pickedAudio && pickedAudio.family !== 'aac') {
    warnings.push('เบราว์เซอร์นี้ไม่มีตัวเข้ารหัส AAC ระบบจึงใช้ Opus แทน — บางแพลตฟอร์มอาจไม่รับเสียงรูปแบบนี้');
  }

  return {
    blob: new Blob([buffer], { type: 'video/mp4' }),
    videoCodec: picked.family,
    audioCodec: pickedAudio?.family ?? null,
    warningTh: warnings.length ? warnings.join(' · ') : null,
  };
}
