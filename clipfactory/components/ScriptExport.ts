import type { FormatTemplate, GeneratedScript, Timeline } from '@/lib/types';

/**
 * สคริปต์ถ่ายทำแบบข้อความ — สำหรับคนที่อยากถ่ายเอง
 * งานวิจัยชี้ว่าคลิปที่ถ่ายเองจริงชนะคลิปที่ดูสังเคราะห์ เครื่องมือจึงต้องรองรับทางนี้ด้วย
 */
export function buildShotList(args: {
  productName: string;
  template: FormatTemplate;
  script: GeneratedScript;
  hookIndex: number;
  timeline: Timeline;
}): string {
  const { productName, template, script, hookIndex, timeline } = args;
  const hook = script.hooks[hookIndex] ?? script.hooks[0] ?? '';

  const lines: string[] = [
    `สคริปต์ถ่ายทำ — ${productName || 'ไม่ระบุชื่อสินค้า'}`,
    `สูตร: ${template.nameTh}`,
    `ความยาวรวม: ${timeline.totalSec.toFixed(1)} วินาที · ${timeline.shots.length} ช็อต`,
    `ข้อความค้างบนจอ: ${script.headline}`,
    '',
    'กติกาของสูตรนี้',
    ...template.brief.rules.map((r) => `  - ${r}`),
    '',
    '─'.repeat(52),
    '',
  ];

  // จับช็อตย่อยที่มาจากบรรทัดเดียวกันให้แสดงเป็นบล็อกเดียว
  const blocks: { start: number; end: number; caption: string; kind: string }[] = [];
  for (const shot of timeline.shots) {
    const last = blocks[blocks.length - 1];
    if (last && last.caption === shot.caption && last.kind === shot.kind) last.end = shot.endSec;
    else blocks.push({ start: shot.startSec, end: shot.endSec, caption: shot.caption, kind: shot.kind });
  }

  const voFor = (kind: string, bodyIndex: number): string => {
    if (kind === 'hook') return hook;
    if (kind === 'cta') return script.cta;
    return script.scenes[bodyIndex]?.vo ?? '';
  };

  let bodyIndex = 0;
  const label: Record<string, string> = { hook: 'HOOK', body: 'เนื้อหา', cta: 'CTA' };

  for (const b of blocks) {
    const vo = voFor(b.kind, bodyIndex);
    if (b.kind === 'body') bodyIndex++;
    lines.push(`[${b.start.toFixed(1)}–${b.end.toFixed(1)} วิ] ${label[b.kind] ?? b.kind}`);
    lines.push(`  ขึ้นจอ : ${b.caption || '(ไม่มีข้อความ)'}`);
    if (vo) lines.push(`  พูดว่า : ${vo}`);
    lines.push('');
  }

  lines.push('─'.repeat(52), '');
  if (script.postCaption) lines.push('แคปชั่นตอนโพสต์', script.postCaption, '');
  if (script.hashtags.length) lines.push('แฮชแท็ก', script.hashtags.map((h) => `#${h}`).join(' '), '');
  lines.push(
    'เช็คก่อนถ่าย',
    '  - 3 วินาทีแรกห้ามทักทาย เข้าเรื่องทันที',
    '  - กล้องนิ่งได้ ไม่ต้องขยับตาม',
    '  - เว้นพื้นที่ล่าง 25% และขวา 15% ไว้ให้ UI ของแอป',
    `  - เปลี่ยนภาพทุก ~${template.visual.cutEverySec} วินาที`,
  );

  return lines.join('\n');
}
