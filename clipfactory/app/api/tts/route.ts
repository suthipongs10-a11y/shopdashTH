import { NextResponse } from 'next/server';
import { synthesize, VOICE_STYLES } from '@/lib/gemini/tts';
import { toThaiError } from '@/lib/gemini/client';
import { VOICES } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VOICE_NAMES = new Set(VOICES.map((v) => v.name));

export async function POST(req: Request) {
  let body: { text?: string; voiceName?: string; styleId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'รูปแบบคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: 'ไม่มีข้อความให้อ่าน' }, { status: 400 });
  if (text.length > 4000) {
    return NextResponse.json({ error: 'ข้อความยาวเกินไป (สูงสุด 4000 ตัวอักษรต่อครั้ง)' }, { status: 400 });
  }

  const voiceName = body.voiceName && VOICE_NAMES.has(body.voiceName) ? body.voiceName : 'Kore';
  const style = VOICE_STYLES.find((s) => s.id === body.styleId) ?? VOICE_STYLES[0];

  try {
    const { wav, durationSec, sampleRate } = await synthesize({
      text,
      voiceName,
      styleTh: style.promptTh,
    });
    return new NextResponse(new Uint8Array(wav), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(wav.length),
        'X-Duration-Sec': durationSec.toFixed(3),
        'X-Sample-Rate': String(sampleRate),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const { message, status } = toThaiError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
