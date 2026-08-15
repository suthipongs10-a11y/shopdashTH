/**
 * ทดสอบตรรกะไทม์ไลน์ — ไม่ต้องใช้เบราว์เซอร์
 *
 *   node --experimental-strip-types scripts/test-timeline.ts
 *
 * เน้นกรณีที่เคยพัง: บรรทัดที่มีข้อความบนจอซ้ำกัน ต้องยังจับคู่กับเสียงถูกบรรทัด
 */
import { buildTimeline, voiceLines } from '../lib/render/timeline.ts';
import { getTemplate } from '../lib/templates.ts';
import type { GeneratedScript, VoiceSegment } from '../lib/types.ts';

let failed = 0;

function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✕ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function script(captions: string[]): GeneratedScript {
  return {
    headline: 'หัวเรื่อง',
    hooks: ['hook หนึ่ง', 'hook สอง'],
    scenes: captions.map((caption) => ({ vo: `พูดว่า ${caption}`, caption, durationSec: 2 })),
    cta: 'กดตะกร้าเลย',
    hashtags: ['ของดีบอกต่อ'],
  };
}

function voiceFor(s: GeneratedScript, hasCta: boolean, dur = 2): VoiceSegment[] {
  const segs: VoiceSegment[] = [{ key: 'hook', text: s.hooks[0], url: 'blob:hook', durationSec: dur }];
  s.scenes.forEach((_, i) => segs.push({ key: `scene-${i}`, text: '', url: `blob:s${i}`, durationSec: dur }));
  if (hasCta) segs.push({ key: 'cta', text: s.cta, url: 'blob:cta', durationSec: dur });
  return segs;
}

console.log('\nไทม์ไลน์: บรรทัดที่ข้อความบนจอซ้ำกัน');
{
  // เคสที่เคยทำให้เสียงเลื่อนทั้งแถวและบรรทัดสุดท้ายไปกองที่วินาทีที่ 0
  const t = getTemplate('listicle');
  const s = script(['ซ้ำกัน', 'ซ้ำกัน', 'ไม่ซ้ำ']);
  const voice = voiceFor(s, true);
  const tl = buildTimeline({ script: s, hookIndex: 0, template: t, voice, imageCount: 3 });

  check('มีบรรทัดครบเท่าจำนวนเสียง', tl.lines.length === voice.length, `${tl.lines.length} vs ${voice.length}`);
  check(
    'คีย์ของบรรทัดเรียงตรงกับลำดับเสียง',
    tl.lines.map((l) => l.key).join(',') === voice.map((v) => v.key).join(','),
    tl.lines.map((l) => l.key).join(','),
  );
  check(
    'เวลาเริ่มของทุกบรรทัดเรียงจากน้อยไปมาก',
    tl.lines.every((l, i) => i === 0 || l.startSec > tl.lines[i - 1].startSec),
  );
  check('ไม่มีบรรทัดใดนอกจากบรรทัดแรกที่เริ่มที่ 0', tl.lines.slice(1).every((l) => l.startSec > 0));
  check('บรรทัดสุดท้ายอยู่ก่อนจบคลิป', tl.lines[tl.lines.length - 1].startSec < tl.totalSec);
}

console.log('\nไทม์ไลน์: ความยาวมาจากไฟล์เสียงจริง');
{
  const t = getTemplate('listicle');
  const s = script(['หนึ่ง', 'สอง']);
  const voice = voiceFor(s, true, 3);
  const tl = buildTimeline({ script: s, hookIndex: 0, template: t, voice, imageCount: 2 });
  // 4 บรรทัด × (3 วิ + pad 0.28)
  const expected = 4 * 3.28;
  check('ความยาวรวมตรงกับผลรวมเสียง + pad', Math.abs(tl.totalSec - expected) < 0.05, `${tl.totalSec} vs ${expected}`);
  check('ช็อตต่อเนื่องไม่มีช่องว่าง', tl.shots.every((sh, i) => i === 0 || Math.abs(sh.startSec - tl.shots[i - 1].endSec) < 0.01));
}

console.log('\nสูตรที่ไม่มีเสียงพูด (beat-sync)');
{
  const t = getTemplate('beat-sync');
  const s = script(['ราคา 99', 'ส่งฟรี', 'ชิ้นที่สอง 1 บาท']);
  check('ไม่มีบรรทัดเสียงให้สร้าง', voiceLines(s, 0, t).length === 0);

  const tl = buildTimeline({ script: s, hookIndex: 0, template: t, voice: [], imageCount: 4 });
  check('ไม่มีบรรทัด cta', !tl.lines.some((l) => l.key === 'cta'));
  check('มีบรรทัด = hook + ซีน', tl.lines.length === 1 + s.scenes.length, String(tl.lines.length));
  check('ซอยช็อตถี่ตามจังหวะของสูตร', tl.shots.length > tl.lines.length);
  check(
    'ทุกช็อตสั้นกว่าหรือเท่าจังหวะตัดที่กำหนด',
    tl.shots.every((sh) => sh.endSec - sh.startSec <= t.visual.cutEverySec + 0.01),
  );
}

console.log('\nสลับ hook แล้วบรรทัดยังตรง');
{
  const t = getTemplate('listicle');
  const s = script(['หนึ่ง', 'สอง']);
  const voice = voiceFor(s, true);
  const a = buildTimeline({ script: s, hookIndex: 0, template: t, voice, imageCount: 2 });
  const b = buildTimeline({ script: s, hookIndex: 1, template: t, voice, imageCount: 2 });
  check('เปลี่ยน hook แล้วโครงบรรทัดเท่าเดิม', a.lines.length === b.lines.length);
  check('ข้อความ hook เปลี่ยนตามที่เลือก', a.shots[0].caption !== b.shots[0].caption);
}

console.log('\nไม่มีเสียงเลย ใช้ค่าประมาณจากสคริปต์');
{
  const t = getTemplate('problem-solution');
  const s = script(['หนึ่ง', 'สอง', 'สาม']);
  const tl = buildTimeline({ script: s, hookIndex: 0, template: t, voice: [], imageCount: 1 });
  check('ยังสร้างไทม์ไลน์ได้', tl.shots.length > 0 && tl.totalSec > 0);
  check('รูปเดียวถูกวนใช้ได้ ไม่พัง', tl.shots.every((sh) => sh.assetIndex === 0));
}

console.log(failed === 0 ? '\n✓ ผ่านทั้งหมด\n' : `\n✕ ไม่ผ่าน ${failed} ข้อ\n`);
process.exit(failed === 0 ? 0 : 1);
