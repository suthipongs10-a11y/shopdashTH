import 'server-only';
import { getGemini, TTS_MODEL } from './client';

/** Gemini TTS คืน PCM ดิบ ต้องหุ้ม header WAV เองก่อนส่งให้เบราว์เซอร์ */
function pcmToWav(pcm: Buffer, sampleRate: number, channels = 1, bitsPerSample = 16): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // ขนาด fmt chunk
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/** ดึง sample rate จาก mimeType เช่น audio/L16;codec=pcm;rate=24000 */
function parseRate(mimeType: string | undefined): number {
  const m = mimeType?.match(/rate=(\d+)/);
  return m ? Number(m[1]) : 24000;
}

export interface SynthesizeArgs {
  text: string;
  voiceName: string;
  /** คำสั่งกำกับน้ำเสียง เช่น "พูดเร็ว กระตือรือร้น เหมือนกำลังเล่าให้เพื่อนฟัง" */
  styleTh?: string;
  signal?: AbortSignal;
}

export interface SynthesizedAudio {
  wav: Buffer;
  sampleRate: number;
  durationSec: number;
}

export async function synthesize({ text, voiceName, styleTh, signal }: SynthesizeArgs): Promise<SynthesizedAudio> {
  const clean = text.trim();
  if (!clean) throw new Error('ไม่มีข้อความให้อ่าน');

  const ai = getGemini();
  // Gemini TTS รับคำสั่งกำกับน้ำเสียงเป็นภาษาธรรมชาตินำหน้าข้อความได้
  const prompt = styleTh ? `${styleTh}:\n${clean}` : clean;

  const res = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: prompt,
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      ...(signal ? { abortSignal: signal } : {}),
    },
  });

  const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const b64 = part?.inlineData?.data;
  if (!b64) throw new Error('Gemini TTS ไม่ได้ส่งไฟล์เสียงกลับมา ลองเปลี่ยนเสียงหรือลองใหม่อีกครั้ง');

  const sampleRate = parseRate(part?.inlineData?.mimeType);
  const pcm = Buffer.from(b64, 'base64');
  if (pcm.length < 2) throw new Error('ไฟล์เสียงที่ได้จาก Gemini ว่างเปล่า ลองเปลี่ยนเสียงหรือลองใหม่อีกครั้ง');
  const durationSec = pcm.length / (sampleRate * 2); // 16-bit mono

  return { wav: pcmToWav(pcm, sampleRate), sampleRate, durationSec };
}

/** โทนเสียงสำเร็จรูป ให้คนที่พูดไม่เก่งเลือกใช้ได้ทันที */
export const VOICE_STYLES: { id: string; labelTh: string; promptTh: string }[] = [
  {
    id: 'natural',
    labelTh: 'คุยธรรมดา (แนะนำ)',
    promptTh: 'อ่านข้อความต่อไปนี้ด้วยน้ำเสียงเป็นกันเองเหมือนกำลังเล่าให้เพื่อนฟัง จังหวะปกติ ไม่เหมือนโฆษณา',
  },
  {
    id: 'energetic',
    labelTh: 'กระตือรือร้น เร็ว',
    promptTh: 'อ่านข้อความต่อไปนี้ด้วยน้ำเสียงตื่นเต้น กระตือรือร้น พูดเร็วกระชับ แต่ยังฟังชัด',
  },
  {
    id: 'calm',
    labelTh: 'นุ่ม ให้ข้อมูล',
    promptTh: 'อ่านข้อความต่อไปนี้ด้วยน้ำเสียงนุ่ม สุภาพ ให้ความรู้สึกน่าเชื่อถือ จังหวะช้าลงเล็กน้อย',
  },
  {
    id: 'gossip',
    labelTh: 'เล่าแบบเมาท์',
    promptTh: 'อ่านข้อความต่อไปนี้ด้วยน้ำเสียงเหมือนกำลังเมาท์เรื่องเด็ดให้เพื่อนสนิทฟัง มีอารมณ์ร่วม',
  },
];
