// ถอด QR จากรูปสลิปโอนเงิน (Phase 6 — ชั้นกันสลิปซ้ำแบบ in-house, ดู DECISIONS)
//
// สลิปจริงจากแอปธนาคารมี mini-QR (มาตรฐาน Verify Slip) ฝัง "เลขอ้างอิงธุรกรรม"
// — payload ของ QR ไม่เปลี่ยนไม่ว่ารูปจะถูก crop/แคปหน้าจอใหม่กี่รอบ
// จึงใช้เป็นตัวระบุธุรกรรมที่แข็งแรงกว่า SHA-256 ของไฟล์ (§7.3)
//
// ขอบเขต: ตรวจ "ซ้ำ" ได้ แต่พิสูจน์ "เงินเข้าจริง" ไม่ได้ (ต้องถามธนาคารผ่าน
// Slip Verify API ภายนอก) — ผลถอดจึงช่วยคิว manual เท่านั้น ห้าม auto-approve

import 'server-only';
import jsQR from 'jsqr';
import sharp from 'sharp';

export interface SlipQrResult {
  /** payload ดิบของ QR — ตัวระบุธุรกรรม (null = หา/ถอด QR ไม่ได้) */
  payload: string | null;
  /** เลขอ้างอิงธุรกรรม (parse best-effort จาก payload — null = parse ไม่ได้) */
  ref: string | null;
}

// ลองหลายสเกล — QR เล็กในรูปใหญ่บางทีถอดติดที่สเกลเดียว
const ATTEMPT_WIDTHS = [1000, 1600, 700];

/** ถอด QR จาก buffer รูปสลิป — ไม่ throw (ผิดพลาด = คืน null ทั้งคู่) */
export async function decodeSlipQr(buffer: Buffer): Promise<SlipQrResult> {
  for (const width of ATTEMPT_WIDTHS) {
    try {
      const { data, info } = await sharp(buffer)
        .resize({ width, withoutEnlargement: true })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
      const code = jsQR(pixels, info.width, info.height);
      const payload = code?.data?.trim();
      if (payload) return { payload, ref: parseTransRef(payload) };
    } catch {
      // รูปเสีย/format แปลก — ลองสเกลถัดไป สุดท้ายคืน null
    }
  }
  return { payload: null, ref: null };
}

/** parse EMVCo TLV string → map tag→value (คืน null เมื่อโครงสร้างไม่ครบ) */
function parseTlv(s: string): Map<string, string> | null {
  const map = new Map<string, string>();
  let i = 0;
  while (i + 4 <= s.length) {
    const len = Number(s.slice(i + 2, i + 4));
    if (!Number.isInteger(len) || len < 0 || i + 4 + len > s.length) return null;
    map.set(s.slice(i, i + 2), s.slice(i + 4, i + 4 + len));
    i += 4 + len;
  }
  return i === s.length ? map : null;
}

/**
 * ดึงเลขอ้างอิงธุรกรรมจาก payload mini-QR ของสลิปธนาคารไทย (best-effort)
 * โครงสร้าง: TLV ชั้นนอก tag "00" = ข้อมูลธุรกรรม → TLV ชั้นใน tag "02" = transaction ref
 */
export function parseTransRef(payload: string): string | null {
  const top = parseTlv(payload);
  const inner = top?.get('00');
  if (!inner) return null;
  const ref = parseTlv(inner)?.get('02')?.trim();
  return ref && /^[A-Za-z0-9]{8,40}$/.test(ref) ? ref : null;
}
