/**
 * ทดสอบตรรกะไทม์ไลน์ — ไม่ต้องใช้เบราว์เซอร์
 *
 *   node --experimental-strip-types scripts/test-timeline.ts
 *
 * เน้นกรณีที่เคยพัง: บรรทัดที่มีข้อความบนจอซ้ำกัน ต้องยังจับคู่กับเสียงถูกบรรทัด
 */
import { buildTimeline, voiceLines } from '../lib/render/timeline.ts';
import { clampDuration, durationRange, getTemplate, suggestTemplates, TEMPLATES } from '../lib/templates.ts';
import { campaignLabel, upcomingCampaigns } from '../lib/campaigns.ts';
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
    postCaption: 'แคปชั่นทดสอบ',
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

console.log('\nCTA ต้องมีทุกสูตร');
{
  for (const id of ['listicle', 'beat-sync', 'trust'] as const) {
    const t = getTemplate(id);
    const s = script(['หนึ่ง', 'สอง']);
    const tl = buildTimeline({ script: s, hookIndex: 0, template: t, voice: [], imageCount: 2 });
    check(`${id}: มีช็อต CTA`, tl.shots.some((sh) => sh.kind === 'cta'));
  }
}

console.log('\nช่วงความยาวตามแพลตฟอร์ม');
{
  const shopeeTemplates = TEMPLATES.filter((t) => t.platforms.includes('shopee'));
  check(
    'ทุกสูตรที่เปิดให้ Shopee มีช่วงความยาวที่อยู่ใน 10–30 วิได้',
    shopeeTemplates.every((t) => {
      const [min, max] = durationRange(t, 'shopee');
      return min >= 10 && max <= 30 && min <= max;
    }),
    shopeeTemplates.map((t) => `${t.id}:${durationRange(t, 'shopee').join('-')}`).join(' '),
  );
  check(
    'คุมค่าที่ผู้ใช้กรอกเกินช่วงได้',
    clampDuration(getTemplate('listicle'), 'shopee', 999) <= 30 &&
      clampDuration(getTemplate('listicle'), 'shopee', 1) >= 10,
  );
}

console.log('\nหมวดสินค้าที่งานวิจัยจัดกลุ่มเดียวกัน');
{
  const beauty = suggestTemplates('ความงาม').slice(0, 4).map((t) => t.id);
  const skincare = suggestTemplates('สกินแคร์').slice(0, 4).map((t) => t.id);
  check('สกินแคร์ ได้ listicle ติดอันดับต้น เหมือน ความงาม', skincare.includes('listicle'), skincare.join(','));
  check('ทั้งสองคำให้ชุดสูตรกลุ่มเดียวกัน', beauty[0] === skincare[0], `${beauty[0]} vs ${skincare[0]}`);
}

console.log('\nสูตรที่ไม่มีเสียงพูด (beat-sync)');
{
  const t = getTemplate('beat-sync');
  const s = script(['ราคา 99', 'ส่งฟรี', 'ชิ้นที่สอง 1 บาท']);
  check('ไม่มีบรรทัดเสียงให้สร้าง', voiceLines(s, 0, t).length === 0);

  const tl = buildTimeline({ script: s, hookIndex: 0, template: t, voice: [], imageCount: 4 });
  check('ยังมี CTA ขึ้นบนจอ แม้ไม่มีเสียงอ่าน', tl.shots.some((sh) => sh.caption === s.cta));
  check('CTA เป็นช็อตสุดท้าย', tl.shots[tl.shots.length - 1].kind === 'cta');
  check('มีบรรทัด = hook + ซีน + cta', tl.lines.length === 2 + s.scenes.length, String(tl.lines.length));
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

console.log('\nปฏิทินแคมเปญ');
{
  // 15 ส.ค. — 8.8 ผ่านไปแล้ว ตัวถัดไปควรเป็นเงินออก 25 ส.ค. แล้วตามด้วย 9.9
  const now = new Date(2026, 7, 15);
  const list = upcomingCampaigns(now, 45);

  check('มีแคมเปญในช่วง 45 วันข้างหน้า', list.length > 0, String(list.length));
  check('เรียงจากใกล้ที่สุดไปไกลที่สุด', list.every((c, i) => i === 0 || c.daysUntil >= list[i - 1].daysUntil));
  check('ไม่มีแคมเปญที่เลยมาแล้ว (ยกเว้นเงินออกที่ยังลากอยู่)',
    list.every((c) => c.daysUntil >= 0 || c.kind === 'payday'));

  const names = list.map((c) => c.nameTh);
  check('เจอ 9.9 ในช่วง 45 วัน', names.includes('9.9'), names.slice(0, 6).join(', '));
  check('ไม่เจอ 8.8 เพราะผ่านไปแล้ว', !names.includes('8.8'));

  const nine = list.find((c) => c.nameTh === '9.9')!;
  check('9.9 อยู่อีก 25 วัน', nine.daysUntil === 25, String(nine.daysUntil));
  check('9.9 ยังไม่ถึงเวลาลงมือ (lead 10 วัน)', !nine.isActionable);

  // ขยับมาวันที่ 1 ก.ย. — เหลือ 8 วัน ควรเตือนให้เริ่มทำคลิปแล้ว
  const soon = upcomingCampaigns(new Date(2026, 8, 1), 45).find((c) => c.nameTh === '9.9')!;
  check('เหลือ 8 วันแล้วขึ้นสถานะถึงเวลาลงมือ', soon.isActionable, `daysUntil=${soon.daysUntil}`);
  check('ป้ายบอกจำนวนวันถูกต้อง', campaignLabel(soon) === 'อีก 8 วัน', campaignLabel(soon));

  // วันแม่ 12 ส.ค. ต้องโผล่ล่วงหน้าตั้งแต่ปลายเดือน ก.ค.
  const july = upcomingCampaigns(new Date(2026, 6, 30), 45).map((c) => c.nameTh);
  check('วันแม่โผล่ล่วงหน้าตั้งแต่ปลาย ก.ค.', july.includes('วันแม่'), july.slice(0, 5).join(', '));

  // ข้ามปี — 31 ธ.ค. ต้องเห็นปีใหม่ของปีถัดไป
  const dec = upcomingCampaigns(new Date(2026, 11, 20), 30).map((c) => c.nameTh);
  check('ข้ามปีแล้วยังเจอปีใหม่', dec.includes('ปีใหม่'), dec.slice(0, 6).join(', '));
}

console.log(failed === 0 ? '\n✓ ผ่านทั้งหมด\n' : `\n✕ ไม่ผ่าน ${failed} ข้อ\n`);
process.exit(failed === 0 ? 0 : 1);
