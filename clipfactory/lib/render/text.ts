/**
 * ตัดบรรทัดข้อความไทยบน canvas
 *
 * ภาษาไทยไม่มีช่องว่างระหว่างคำ การตัดตามช่องว่างจึงใช้ไม่ได้
 * ใช้ Intl.Segmenter granularity 'word' ซึ่งใน Chromium ตัดคำไทยด้วยพจนานุกรมได้จริง
 * ถ้าเบราว์เซอร์ไม่รองรับ จะถอยไปตัดทีละตัวอักษร (ยังอ่านออก แค่ไม่สวยเท่า)
 */

type Measurer = { measureText(t: string): { width: number } };

let segmenter: Intl.Segmenter | null | undefined;

function getSegmenter(): Intl.Segmenter | null {
  if (segmenter !== undefined) return segmenter;
  try {
    segmenter = new Intl.Segmenter('th', { granularity: 'word' });
  } catch {
    segmenter = null;
  }
  return segmenter;
}

/** แยกข้อความเป็นชิ้นที่ตัดบรรทัดได้ โดยไม่ทำให้สระ/วรรณยุกต์หลุดจากพยัญชนะ */
export function segments(text: string): string[] {
  const seg = getSegmenter();
  if (seg) {
    const out: string[] = [];
    for (const s of seg.segment(text)) out.push(s.segment);
    return out.filter((s) => s.length > 0);
  }
  // fallback: ตัดตาม grapheme cluster แบบหยาบ — รวมอักขระผสม (U+0E31–U+0E3A, U+0E47–U+0E4E) เข้ากับตัวหน้า
  const out: string[] = [];
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    const isCombining =
      (code >= 0x0e31 && code <= 0x0e3a) || (code >= 0x0e47 && code <= 0x0e4e);
    if (isCombining && out.length > 0) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

export function wrapText(ctx: Measurer, text: string, maxWidth: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (ctx.measureText(trimmed).width <= maxWidth) return [trimmed];

  const parts = segments(trimmed);
  const lines: string[] = [];
  let line = '';

  for (const part of parts) {
    const next = line + part;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line.trimEnd());
      // ไม่ขึ้นบรรทัดใหม่ด้วยช่องว่าง
      line = part.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/**
 * หาขนาดฟอนต์ที่ใหญ่ที่สุดที่ยังใส่ข้อความได้ในกล่องที่กำหนด
 * ใช้กับ caption เพื่อให้ประโยคสั้นตัวใหญ่ ประโยคยาวตัวเล็กลงอัตโนมัติ
 */
export function fitText(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  opts: {
    maxWidth: number;
    maxHeight: number;
    fontFamily: string;
    weight: number;
    maxSize: number;
    minSize: number;
    lineHeight: number;
  },
): { lines: string[]; fontSize: number } {
  for (let size = opts.maxSize; size >= opts.minSize; size -= 2) {
    ctx.font = `${opts.weight} ${size}px ${opts.fontFamily}`;
    const lines = wrapText(ctx, text, opts.maxWidth);
    if (lines.length * size * opts.lineHeight <= opts.maxHeight) {
      return { lines, fontSize: size };
    }
  }
  ctx.font = `${opts.weight} ${opts.minSize}px ${opts.fontFamily}`;
  return { lines: wrapText(ctx, text, opts.maxWidth), fontSize: opts.minSize };
}
