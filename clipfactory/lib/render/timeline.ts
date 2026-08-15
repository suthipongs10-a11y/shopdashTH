import type { FormatTemplate, GeneratedScript, Timeline, TimelineShot, VoiceSegment } from '../types';

/** ช่องว่างหายใจท้ายแต่ละบรรทัดเสียงพากย์ */
const PAD_SEC = 0.28;

export function voiceKey(kind: 'hook' | 'cta' | 'scene', index = 0): string {
  return kind === 'scene' ? `scene-${index}` : kind;
}

interface Line {
  kind: TimelineShot['kind'];
  caption: string;
  fallbackSec: number;
  key: string;
}

function linesOf(script: GeneratedScript, hookIndex: number, template: FormatTemplate): Line[] {
  const hook = script.hooks[hookIndex] ?? script.hooks[0] ?? script.headline;
  const out: Line[] = [
    { kind: 'hook', caption: hook, fallbackSec: 3, key: voiceKey('hook') },
    ...script.scenes.map((s, i) => ({
      kind: 'body' as const,
      caption: s.caption,
      fallbackSec: Math.max(1, s.durationSec),
      key: voiceKey('scene', i),
    })),
  ];
  // สูตรที่ไม่มีเสียงพูดไม่ต้องมีซีน CTA แยก เพราะไม่มีเวลาให้อ่าน
  if (template.audio !== 'music-only') {
    out.push({ kind: 'cta', caption: script.cta, fallbackSec: 2, key: voiceKey('cta') });
  }
  return out;
}

/**
 * สร้างไทม์ไลน์จากสคริปต์
 * ถ้ามีเสียงพากย์แล้ว จะใช้ความยาวจริงของไฟล์เสียงเพื่อให้ซับตรงกับเสียงเป๊ะ
 * ถ้ายังไม่มี จะใช้ความยาวประมาณการจากสคริปต์
 */
export function buildTimeline(args: {
  script: GeneratedScript;
  hookIndex: number;
  template: FormatTemplate;
  voice?: VoiceSegment[] | null;
  imageCount: number;
}): Timeline {
  const { script, hookIndex, template, voice, imageCount } = args;
  const byKey = new Map((voice ?? []).map((v) => [v.key, v]));
  const lines = linesOf(script, hookIndex, template);

  const base: { kind: TimelineShot['kind']; caption: string; dur: number }[] = lines.map((l) => {
    const seg = byKey.get(l.key);
    const dur = seg && seg.durationSec > 0 ? seg.durationSec + PAD_SEC : l.fallbackSec;
    return { kind: l.kind, caption: l.caption, dur: Math.max(0.6, dur) };
  });

  // กฎจากงานวิจัย: เปลี่ยนภาพทุก cutEverySec วินาที — ซอยซีนยาวเป็นช็อตย่อย
  const cut = Math.max(0.8, template.visual.cutEverySec);
  const expanded: { kind: TimelineShot['kind']; caption: string; dur: number }[] = [];
  for (const b of base) {
    const pieces = Math.max(1, Math.ceil(b.dur / cut - 0.01));
    const each = b.dur / pieces;
    for (let i = 0; i < pieces; i++) expanded.push({ kind: b.kind, caption: b.caption, dur: each });
  }

  const shots: TimelineShot[] = [];
  let t = 0;
  const n = Math.max(1, imageCount);
  expanded.forEach((e, i) => {
    shots.push({
      startSec: Math.round(t * 1000) / 1000,
      endSec: Math.round((t + e.dur) * 1000) / 1000,
      caption: e.caption,
      assetIndex: i % n,
      kind: e.kind,
    });
    t += e.dur;
  });

  return { shots, totalSec: Math.round(t * 1000) / 1000 };
}

/**
 * จุดเริ่มของแต่ละ "บรรทัด" ในไทม์ไลน์
 * ช็อตย่อยที่ถูกซอยจากบรรทัดเดียวกันใช้ caption เดียวกัน จึงนับเฉพาะตอนที่ caption เปลี่ยน
 */
export function lineStarts(timeline: Timeline): number[] {
  const starts: number[] = [];
  let last: string | null = null;
  for (const shot of timeline.shots) {
    if (shot.caption !== last) {
      starts.push(shot.startSec);
      last = shot.caption;
    }
  }
  return starts;
}

/** ลำดับคีย์เสียงพากย์ ต้องตรงกับลำดับบรรทัดที่ buildTimeline สร้าง */
export function orderedVoiceKeys(sceneCount: number, hasCta: boolean): string[] {
  const keys = [voiceKey('hook')];
  for (let i = 0; i < sceneCount; i++) keys.push(voiceKey('scene', i));
  if (hasCta) keys.push(voiceKey('cta'));
  return keys;
}

/** รายการบรรทัดที่ต้องส่งไปสร้างเสียงพากย์ */
export function voiceLines(
  script: GeneratedScript,
  hookIndex: number,
  template: FormatTemplate,
): { key: string; text: string }[] {
  if (template.audio === 'music-only') return [];
  const hook = script.hooks[hookIndex] ?? script.hooks[0] ?? script.headline;
  return [
    { key: voiceKey('hook'), text: hook },
    ...script.scenes.map((s, i) => ({ key: voiceKey('scene', i), text: s.vo || s.caption })),
    { key: voiceKey('cta'), text: script.cta },
  ].filter((l) => l.text.trim().length > 0);
}
