import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ให้ UI รู้ล่วงหน้าว่าตั้งค่าคีย์แล้วหรือยัง จะได้เตือนก่อนผู้ใช้เสียเวลากรอก */
export async function GET() {
  return NextResponse.json({
    hasKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
    scriptModel: process.env.GEMINI_SCRIPT_MODEL?.trim() || 'gemini-2.5-flash',
    ttsModel: process.env.GEMINI_TTS_MODEL?.trim() || 'gemini-2.5-flash-preview-tts',
  });
}
