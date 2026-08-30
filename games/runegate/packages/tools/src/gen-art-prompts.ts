/**
 * Art Prompt Generator (Phase 3) — สร้าง prompt สำหรับให้ AI วาดสไปรท์ทุกตัวในเกม
 *
 *   npm run art-prompts                     # เขียนลง art/prompts/
 *   npm run art-prompts -- --out somewhere
 *
 * ที่มาของข้อมูล: `content/heroes|enemies|turrets.json` + `content/art_briefs.json`
 * เพิ่มตัวละครใหม่ในคอนเทนต์ → เขียน art brief → รันคำสั่งนี้ → ได้ prompt ครบชุดทันที
 * สเปกเฟรม/ทิศ/ท่า ต้องตรงกับ ART_GUIDE.md และ pack-sprites.ts เสมอ
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  artBriefById,
  enemies,
  heroes,
  turrets,
  type ArtBrief,
  type Element,
  type SpriteRecipe,
} from '@runegate/data';

/* ---------- สเปกที่ต้องตรงกับ ART_GUIDE.md ---------- */
const FRAME_W = 96;
const FRAME_H = 128;
const FEET_Y = 120;
const OUTLINE = '#181222';
const RIM = '#7fd4e8';
const MAX_COLORS = 12;

const ANIMS = [
  { key: 'idle', frames: 2, fps: 3, loop: true, th: 'ยืนเฉย', th_note: 'ลูปหายใจสั้นๆ แทบไม่ขยับ' },
  { key: 'walk', frames: 4, fps: 8, loop: true, th: 'เดิน', th_note: 'ลูปเดินที่ต่อกลับเฟรมแรกได้เนียน' },
  { key: 'attack', frames: 3, fps: 11, loop: false, th: 'โจมตี', th_note: 'เงื้อ → ปะทะ → ตามน้ำหนัก' },
  { key: 'death', frames: 3, fps: 7, loop: false, th: 'ตาย', th_note: 'สะดุ้ง → ทรุด → ล้มนิ่ง' },
] as const;

const DIRECTIONS = [
  { row: 0, th: 'หันหน้าเข้าหากล้อง', en: 'facing the camera in full front view, both eyes visible, chest square to the viewer' },
  { row: 1, th: 'หน้าเฉียง (เฉียงไปทางขวาของภาพ)', en: 'three-quarter front view turned toward the lower-right of the frame, roughly 45 degrees, face still visible' },
  { row: 2, th: 'ด้านข้าง (หันไปทางขวาของภาพ)', en: 'full side profile facing the right edge of the frame, only one eye visible' },
  { row: 3, th: 'หลังเฉียง (เฉียงขึ้นทางขวาของภาพ)', en: 'three-quarter rear view turned away toward the upper-right of the frame, face NOT visible, back of the shoulder toward the viewer' },
  { row: 4, th: 'หันหลัง', en: 'full back view, only the back of the head and body visible, face NOT visible' },
] as const;

/** ความสูงตัวละครในเฟรม (px) ต่อชนิดร่าง — ตรงกับ BODY_HEIGHT_PX ฝั่ง render */
const BODY_HEIGHT_PX: Record<SpriteRecipe['body'], number> = {
  humanoid: 67,
  hulk: 65,
  beast: 46,
  insect: 46,
  floating: 60,
  spirit: 60,
  catapult: 64,
  cannon: 38,
  arcane: 55,
};

const BODY_EN: Record<SpriteRecipe['body'], string> = {
  humanoid: 'an upright humanoid standing on two legs',
  hulk: 'a hulking oversized humanoid, very broad shoulders and short neck',
  beast: 'a four-legged beast with its back roughly at knee height of a man',
  insect: 'a low multi-legged creature with a hard shell',
  floating: 'a winged creature hovering clear of the ground',
  spirit: 'an incorporeal spirit with no legs, trailing off into mist below the waist',
  catapult: 'a static siege engine on a wooden frame, no crew figure',
  cannon: 'a static gun emplacement on a metal mount, no crew figure',
  arcane: 'a floating arcane construct of stone and light, no legs',
};

const ELEMENT_EN: Record<Element, string> = {
  water: 'cool blue water motif — faint droplets and a wet sheen on the highlights',
  fire: 'fire motif — ember specks and hot orange rim on the lower edges',
  wind: 'wind motif — thin pale-green curls of moving air trailing behind',
  light: 'holy light motif — a warm gold glow on the upper surfaces',
  dark: 'shadow motif — violet-black smoke clinging to the lower silhouette',
};

const ELEMENT_TH: Record<Element, string> = {
  water: 'น้ำ', fire: 'ไฟ', wind: 'ลม', light: 'แสง', dark: 'มืด',
};

const WEAPON_EN: Record<SpriteRecipe['weapon'], string> = {
  none: 'no weapon in hand',
  sword: 'a straight one-handed sword',
  bow: 'a longbow',
  staff: 'a tall wooden staff',
  dagger: 'a short dagger',
  hammer: 'a heavy two-handed hammer',
  claw: 'clawed gauntlets or natural claws',
  spear: 'a long spear',
};

interface Entry {
  id: string;
  name_th: string;
  kind: 'hero' | 'enemy' | 'turret';
  folder: string;
  sprite: SpriteRecipe;
  element: Element;
  /** บรรทัดบอกบทบาท (ไทย) */
  role_th: string;
  /** บรรทัดบอกบทบาท (อังกฤษ ใส่ใน prompt) */
  role_en: string;
  brief: ArtBrief;
}

function titleCase(id: string): string {
  return id
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function collect(): Entry[] {
  const out: Entry[] = [];
  const brief = (id: string): ArtBrief => {
    const b = artBriefById.get(id);
    if (!b) throw new Error(`[art-prompts] ไม่มี art brief ของ "${id}" — เติมใน content/art_briefs.json`);
    return b;
  };

  for (const h of heroes) {
    out.push({
      id: h.id, name_th: h.name_th, kind: 'hero', folder: 'heroes', sprite: h.sprite, element: h.element,
      role_th: `ฮีโร่ ★${h.rarity} · ${h.class} · ธาตุ${ELEMENT_TH[h.element]} · ${h.pos === 'melee' ? 'ระยะประชิด' : 'ระยะไกล'}`,
      role_en: `a playable ${h.rarity}-star ${h.class} hero of the ${h.element} element, ${h.pos === 'melee' ? 'a front-line melee defender' : 'a ranged support unit'}`,
      brief: brief(h.id),
    });
  }
  for (const e of enemies) {
    const tier = e.tier === 'mvp' ? 'บอส MVP' : e.tier === 'elite' ? 'มินิบอส' : 'ธรรมดา';
    const tierEn = e.tier === 'mvp' ? 'a chapter boss (MVP) — the most visually dominant enemy in the game' : e.tier === 'elite' ? 'a mini-boss, clearly larger and meaner than the rank-and-file' : 'a rank-and-file enemy that appears in large numbers';
    out.push({
      id: e.id, name_th: e.name_th, kind: 'enemy', folder: 'enemies', sprite: e.sprite, element: e.element,
      role_th: `ศัตรูระดับ${tier} · เผ่า${e.race} · ธาตุ${ELEMENT_TH[e.element]}${e.traits.length ? ` · ${e.traits.join(', ')}` : ''}`,
      role_en: `${tierEn}; race: ${e.race}, ${e.element} element${e.traits.length ? `, traits: ${e.traits.join(', ')}` : ''}`,
      brief: brief(e.id),
    });
  }
  for (const t of turrets) {
    out.push({
      id: t.id, name_th: t.name_th, kind: 'turret', folder: 'turrets', sprite: t.sprite, element: t.element,
      role_th: `เครื่องยิงขั้น ${t.tier} · ธาตุ${ELEMENT_TH[t.element]}`,
      role_en: `a tier-${t.tier} defensive turret emplacement built by the player, an inanimate machine with no crew`,
      brief: brief(t.id),
    });
  }
  return out;
}

/* ---------- ชิ้นส่วนของ prompt ---------- */

function styleBlock(): string {
  return [
    `Style: hand-crafted 2D pixel-art game sprite for an isometric tower-defence game, in the tradition of Ragnarok Online unit sprites and Arknights operator sprites. One single character only, centred, full body from head to feet, nothing else in the image.`,
    `Camera: three-quarter overhead view, camera about 32 degrees above the horizon, near-orthographic (no wide-angle distortion, no foreshortening tricks).`,
    `Line work: a solid 2 px dark outline in ${OUTLINE} around the entire silhouette. Hard pixel edges, no soft anti-aliased halo against the background.`,
    `Lighting: one key light from the upper LEFT; a thin cool rim light in ${RIM} along the upper-right edge only.`,
    `Colour: at most ${MAX_COLORS} flat colours including the outline. Cel shading with at most 2 shadow steps. No gradients, no airbrush, no photo texture, no noise.`,
    `Background: fully transparent. If transparency is not available, use one completely flat #FF00FF magenta background with no gradient and no shading so it can be keyed out.`,
    `Do NOT draw a ground shadow, floor, ground plane, grass, stone platform, pedestal, base or any scenery — the game renders its own shadow underneath.`,
    `Do NOT add text, letters, numbers, logos, watermarks, signatures, frames, borders or drop shadows.`,
    `Readability rule: the solid silhouette alone must identify this character when shrunk to 64 pixels tall.`,
    `Symmetry rule: the game mirrors the right-facing sprites to produce the left-facing ones, so all side and three-quarter views must face the RIGHT side of the frame, and the design must carry no one-sided marks (no eyepatch, no single scar, no lettering, no single-shoulder emblem). A weapon or shield changing hands when mirrored is fine.`,
  ].join('\n');
}

const NEGATIVE = [
  'photorealistic, 3d render, octane, unreal engine, blurry, soft focus, depth of field,',
  'painterly brush texture, watercolour, gradient background, sky, scenery, landscape, floor, ground, grass, platform, pedestal, base, ground shadow, cast shadow, drop shadow,',
  'text, letters, numbers, watermark, signature, logo, ui elements, health bar, frame, border, panel,',
  'multiple characters, crowd, duplicate character, extra limbs, extra heads, deformed hands,',
  'cropped body, cut off feet, cut off head, character touching the frame edge,',
  'anti-aliased halo, semi-transparent edge pixels, jpeg artifacts, low contrast outline, muddy colours',
].join(' ');

function characterBlock(e: Entry): string {
  const p = e.sprite.palette;
  return [
    `Character: "${titleCase(e.id)}" — ${e.role_en}.`,
    `Body type: ${BODY_EN[e.sprite.body]}. Weapon: ${WEAPON_EN[e.sprite.weapon]}.`,
    `Silhouette: ${e.brief.silhouette}.`,
    `Details: ${e.brief.details}.`,
    `Element cue: ${ELEMENT_EN[e.element]} — keep it subtle, it must not break the silhouette.`,
    `Palette anchors (use these exact hex values as the dominant colours): primary ${p.main}, accent/trim ${p.accent}, skin or fur ${p.skin}, outline ${OUTLINE}, rim light ${RIM}.`,
    `Proportion: the character must fill about ${targetHeight(e)} px of a ${FRAME_W}x${FRAME_H} frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.`,
  ].join('\n');
}

function targetHeight(e: Entry): number {
  return Math.min(112, Math.round(BODY_HEIGHT_PX[e.sprite.body] * e.sprite.scale));
}

/** ตัวกว้าง/ตัวใหญ่ต้องใช้ตารางแทนแถวเดียว ไม่งั้นช่องแคบจนวาดไม่ลง */
function isWide(e: Entry): boolean {
  return ['hulk', 'beast', 'insect', 'catapult', 'cannon'].includes(e.sprite.body) || e.sprite.scale >= 1.2;
}

function layoutFor(e: Entry, frames: number): { canvas: string; cells: string } {
  if (isWide(e)) {
    if (frames <= 2) return { canvas: '1024 x 1024', cells: `${frames} equal columns side by side (each cell 512 x 1024)` };
    return { canvas: '1024 x 1024', cells: `a 2 x 2 grid read left-to-right then top-to-bottom${frames === 3 ? ', leaving the bottom-right cell completely empty' : ''} (each cell 512 x 512)` };
  }
  const w = frames === 2 ? 768 : frames === 3 ? 512 : 384;
  return { canvas: '1536 x 1024', cells: `${frames} equal columns side by side (each cell ${w} x 1024)` };
}

function turnaroundPrompt(e: Entry): string {
  return [
    styleBlock(),
    '',
    characterBlock(e),
    '',
    `Task: a five-view character turnaround on ONE image, canvas 1536 x 1024, five equal columns side by side (each cell 307 x 1024).`,
    `All five cells show the SAME character at the SAME scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the viewing angle changes. Standing neutral idle pose in every cell.`,
    DIRECTIONS.map((d, i) => `Column ${i + 1}: ${d.en}.`).join('\n'),
    `Leave a clear gap between columns. Do not draw dividing lines, labels or numbers.`,
  ].join('\n');
}

/** ชนิดการเคลื่อนไหว — เครื่องจักรไม่เดิน วิญญาณไม่มีขา จังหวะเฟรมจึงต่างกัน */
type Motion = 'legged' | 'floating' | 'machine';
function motionOf(e: Entry): Motion {
  if (e.sprite.body === 'catapult' || e.sprite.body === 'cannon') return 'machine';
  if (e.sprite.body === 'spirit' || e.sprite.body === 'floating' || e.sprite.body === 'arcane') return 'floating';
  return 'legged';
}

/** จังหวะรายเฟรม (ภาษาอังกฤษ เพราะอยู่ใน prompt) */
function beatsFor(e: Entry, animKey: string): string[] {
  const m = motionOf(e);
  if (animKey === 'idle') {
    if (m === 'machine') return ['at rest, fully loaded and ready', 'a barely visible settle, everything 1 px lower'];
    if (m === 'floating') return ['at the top of its hovering bob', 'at the bottom of its hovering bob, 2 px lower, trailing wisps hanging'];
    return ['weight on both feet, breathing in, the body 1 px higher', 'breathing out, the body 1 px lower, shoulders dropped slightly'];
  }
  if (animKey === 'walk') {
    if (m === 'machine') return [
      'at rest', 'a 1 px settle downward', 'back at rest', 'a 1 px lean the other way — this machine does not walk, it only idles',
    ];
    if (m === 'floating') return [
      'drifting forward at the top of the bob', 'mid-drift, slightly lower, trailing wisps stretched behind',
      'at the bottom of the bob, leaning into the direction of travel', 'rising again through the middle of the bob',
    ];
    return [
      'contact pose: leading leg forward and planted, opposite arm swung forward',
      'passing pose: legs together, the whole body at its highest point',
      'contact pose mirrored: the other leg forward, the other arm swung forward',
      'passing pose again, the body at its highest point',
    ];
  }
  if (animKey === 'attack') {
    if (m === 'machine') return [
      'charging or loading, the moving part drawn back to its limit',
      'the firing frame: muzzle flash or the arm released, the strongest and brightest frame',
      'recoil settling back toward the rest position, smoke curling off',
    ];
    return [
      'wind-up: weight shifted back, the weapon or claws drawn back to their limit',
      'impact: the strongest frame, the body driven forward, the weapon at the point of contact',
      'follow-through: the momentum carried all the way through, just before returning to the idle stance',
    ];
  }
  if (m === 'machine') return [
    'the first failure: a crack opens and sparks fly, the frame still upright',
    'the structure breaking apart, pieces separating and falling',
    'a collapsed wreck resting on the ground, no longer recognisable as working',
  ];
  return [
    'flinching from the killing blow, off balance, head snapped back',
    'halfway down, collapsing, the weapon already falling free',
    'fully down on the ground and motionless (the game fades it out afterwards)',
  ];
}

function animPrompt(e: Entry, anim: (typeof ANIMS)[number], dir: (typeof DIRECTIONS)[number]): string {
  const layout = layoutFor(e, anim.frames);
  const action =
    anim.key === 'attack' ? `Attack action: ${e.brief.attack}.`
    : anim.key === 'death' ? `Death action: ${e.brief.death}.`
    : anim.key === 'walk' ? `Walk cycle: a natural repeating walk. ${e.sprite.body === 'spirit' || e.sprite.body === 'floating' || e.sprite.body === 'arcane' ? 'This character floats — it bobs up and down and drifts forward instead of taking steps.' : e.sprite.body === 'catapult' || e.sprite.body === 'cannon' ? 'This is a machine that does not walk — instead show a very small idle settle/recoil sway so the frames still loop.' : 'Legs alternate, arms counter-swing, body rises at mid-step.'}`
    : `Idle: a small breathing loop, almost still.`;
  return [
    styleBlock(),
    '',
    characterBlock(e),
    '',
    `Task: a ${anim.frames}-frame ${anim.key} animation strip of this character, ALL frames seen ${dir.en}.`,
    `Canvas ${layout.canvas}, ${layout.cells}. Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.`,
    action,
    `Frame breakdown:`,
    ...beatsFor(e, anim.key).slice(0, anim.frames).map((b, i) => `  Frame ${i + 1}: ${b}`),
    anim.key === 'idle' || anim.key === 'walk' ? `The last frame must lead cleanly back into the first frame (seamless loop).` : `This animation plays once and does not loop.`,
    `Do not draw dividing lines, labels, numbers or motion-blur streaks between the cells.`,
  ].join('\n');
}

function singleFramePrompt(e: Entry): string {
  return [
    styleBlock(),
    '',
    characterBlock(e),
    '',
    `Task: ONE single frame, canvas 1024 x 1024, the character alone and centred.`,
    `View: {ใส่ประโยคทิศจากตารางด้านบน}.`,
    `Pose: {อธิบายท่าเฟรมนั้น เช่น "mid-stride, right leg forward, arms counter-swinging"}.`,
    `Match the reference image exactly in costume, colour and proportion — this frame replaces one cell of an existing strip.`,
  ].join('\n');
}

function frameChecklist(): string {
  const lines: string[] = [];
  for (const anim of ANIMS) {
    for (const d of DIRECTIONS) {
      for (let f = 0; f < anim.frames; f++) lines.push(`${anim.key}_${d.row}_${f}.png`);
    }
  }
  return lines.join('\n');
}

function characterDoc(e: Entry): string {
  const p = e.sprite.palette;
  const layoutNote = isWide(e)
    ? 'ตัวนี้กว้าง/ใหญ่ → ใช้ผังแบบตาราง 1024×1024 (ช่องแถวเดียวจะแคบเกินไป)'
    : 'ตัวนี้สัดส่วนคนปกติ → ใช้ผังแถวเดียว 1536×1024';

  const out: string[] = [];
  out.push(`# ${e.name_th} — \`${e.id}\``);
  out.push('');
  out.push(`> ${e.role_th}`);
  out.push('');
  out.push('| หัวข้อ | ค่า |');
  out.push('|---|---|');
  out.push(`| ชนิดร่าง | \`${e.sprite.body}\` · อาวุธ \`${e.sprite.weapon}\` · scale ${e.sprite.scale} |`);
  out.push(`| ความสูงในเฟรม | ~${targetHeight(e)} px จากเฟรม ${FRAME_W}×${FRAME_H} (เท้าอยู่ที่ y=${FEET_Y}) |`);
  out.push(`| พาเลตต์ | หลัก \`${p.main}\` · ตัดขอบ \`${p.accent}\` · ผิว/ขน \`${p.skin}\` |`);
  out.push(`| ผังภาพ | ${layoutNote} |`);
  out.push(`| จำนวนไฟล์ | 60 ไฟล์ (12 เฟรม × 5 ทิศ) → \`art/src/${e.id}/\` |`);
  out.push('');
  out.push('---');
  out.push('');
  out.push('## ทิศทั้ง 5 (ใช้แทนที่ในทุก prompt ด้านล่าง)');
  out.push('');
  out.push('| แถว | ทิศ | ประโยคที่ใส่ใน prompt |');
  out.push('|---|---|---|');
  for (const d of DIRECTIONS) out.push(`| ${d.row} | ${d.th} | \`${d.en}\` |`);
  out.push('');
  out.push('> ทิศซ้ายทั้งหมดเกมพลิกเอง — **ทุกภาพต้องหันไปทางขวาของเฟรมเท่านั้น**');
  out.push('');
  out.push('---');
  out.push('');
  out.push('## PROMPT 1 — ภาพต้นแบบ (ทำก่อนเสมอ ใช้เป็นภาพอ้างอิงของทุก prompt ถัดไป)');
  out.push('');
  out.push('ขนาด **1024 × 1024**');
  out.push('');
  out.push('```text');
  out.push(styleBlock());
  out.push('');
  out.push(characterBlock(e));
  out.push('');
  out.push('Task: ONE single reference illustration of this character alone, standing in a neutral idle pose, seen facing the camera in full front view. Centre it on the canvas with clear space around it.');
  out.push('This image is the master reference: every later frame must match it exactly in costume, colour and proportion.');
  out.push('```');
  out.push('');
  out.push('## PROMPT 2 — เทิร์นอะราวด์ 5 ทิศ (แนบภาพจาก PROMPT 1 เป็นภาพอ้างอิง)');
  out.push('');
  out.push('ขนาด **1536 × 1024**');
  out.push('');
  out.push('```text');
  out.push(turnaroundPrompt(e));
  out.push('```');
  out.push('');
  out.push('---');
  out.push('');
  out.push('## PROMPT 3–6 — สไปรท์ชีตรายท่า');
  out.push('');
  out.push('**แต่ละ prompt ต้องรัน 5 ครั้ง (ทิศละครั้ง)** โดยเปลี่ยนประโยคหลัง `ALL frames seen` เป็นประโยคทิศจากตารางข้างบน');
  out.push('และแนบภาพเทิร์นอะราวด์จาก PROMPT 2 เป็นภาพอ้างอิงทุกครั้ง — รวม 4 ท่า × 5 ทิศ = **20 ภาพต่อตัวละคร**');
  out.push('');
  for (let i = 0; i < ANIMS.length; i++) {
    const a = ANIMS[i]!;
    const layout = layoutFor(e, a.frames);
    out.push(`### PROMPT ${3 + i} — \`${a.key}\` (${a.th}) · ${a.frames} เฟรม · ${layout.canvas}`);
    out.push('');
    out.push(`${a.th_note} · ${a.fps} fps · ${a.loop ? 'วนซ้ำ' : 'เล่นครั้งเดียว'}`);
    out.push('');
    out.push('```text');
    out.push(animPrompt(e, a, DIRECTIONS[0]!));
    out.push('```');
    out.push('');
  }
  out.push('---');
  out.push('');
  out.push('## PROMPT 7 — เฟรมเดี่ยว (ไว้ซ่อมเฉพาะเฟรมที่ออกมาไม่ดี)');
  out.push('');
  out.push('```text');
  out.push(singleFramePrompt(e));
  out.push('```');
  out.push('');
  out.push('## Negative prompt (ใส่ทุกครั้งถ้าเครื่องมือรองรับ)');
  out.push('');
  out.push('```text');
  out.push(NEGATIVE);
  out.push('```');
  out.push('');
  out.push('---');
  out.push('');
  out.push('## ไฟล์ที่ต้องได้ครบ 60 ไฟล์');
  out.push('');
  out.push(`วางไว้ที่ \`art/src/${e.id}/\` ขนาดไฟล์ละ **${FRAME_W}×${FRAME_H} px, PNG-32 พื้นหลังโปร่งใส**`);
  out.push('');
  out.push('```');
  out.push(frameChecklist());
  out.push('```');
  out.push('');
  out.push('ตรวจด้วย `npm run pack-sprites` — ขาดไฟล์ไหนหรือขนาดผิด มันจะบอกชื่อไฟล์ให้');
  return out.join('\n');
}

function styleDoc(): string {
  return [
    '# 00 — STYLE BLOCK กลาง',
    '',
    'บล็อกนี้ถูกใส่ไว้ในทุก prompt ของทุกตัวละครแล้ว — ไฟล์นี้มีไว้ให้ดูรวมๆ และให้แก้ที่เดียวเวลาจะปรับสไตล์ทั้งเกม',
    '(แก้ที่ `packages/tools/src/gen-art-prompts.ts` แล้วรัน `npm run art-prompts` ใหม่ prompt ทั้ง 63 ตัวจะอัปเดตตาม)',
    '',
    '## Style block',
    '',
    '```text',
    styleBlock(),
    '```',
    '',
    '## Negative prompt',
    '',
    '```text',
    NEGATIVE,
    '```',
    '',
    '## ตัวเลขที่ห้ามเปลี่ยน',
    '',
    '| หัวข้อ | ค่า | เหตุผล |',
    '|---|---|---|',
    `| ขนาดเฟรม | ${FRAME_W} × ${FRAME_H} px | packer ปฏิเสธไฟล์ขนาดอื่น |`,
    `| เท้าตัวละคร | y = ${FEET_Y} | เกมวางเงาและยึดตำแหน่งจากเส้นนี้ |`,
    `| สีเส้นขอบ | \`${OUTLINE}\` | ให้ทุกตัวอยู่ในเกมเดียวกัน |`,
    `| rim light | \`${RIM}\` | สีรูนของเกม |`,
    `| จำนวนสี | ≤ ${MAX_COLORS} | คุมให้ดูเป็นชุดเดียว และไฟล์เล็ก |`,
    '| ทิศที่วาด | 5 (0–4) | อีก 3 ทิศเกมพลิกเอง |',
    '| ท่า/เฟรม | idle 2 · walk 4 · attack 3 · death 3 | ตรงกับ manifest ใน `pack-sprites.ts` |',
    '',
    '## ท่าและจังหวะเฟรม',
    '',
    '| ท่า | เฟรม | fps | วนซ้ำ | จังหวะ |',
    '|---|---|---|---|---|',
    ...ANIMS.map((a) => `| \`${a.key}\` (${a.th}) | ${a.frames} | ${a.fps} | ${a.loop ? '✔' : '✘'} | ${a.th_note} |`),
  ].join('\n');
}

function readmeDoc(list: Entry[]): string {
  const heroesN = list.filter((e) => e.kind === 'hero').length;
  const enemiesN = list.filter((e) => e.kind === 'enemy').length;
  const turretsN = list.filter((e) => e.kind === 'turret').length;
  const totalFrames = list.length * 60;
  return [
    '# PROMPT PACK — สไปรท์ทั้งเกม RUNEGATE',
    '',
    `ไฟล์ทั้งหมดในโฟลเดอร์นี้ **สร้างอัตโนมัติ** ด้วย \`npm run art-prompts\` — ห้ามแก้มือ`,
    'ถ้าจะแก้ ให้แก้ที่ `packages/data/content/art_briefs.json` (คำบรรยายตัวละคร) หรือ',
    '`packages/tools/src/gen-art-prompts.ts` (สไตล์/ผังภาพ) แล้วรันใหม่',
    '',
    '## มีอะไรบ้าง',
    '',
    '| โฟลเดอร์ | จำนวน | ไฟล์ที่ต้องวาด |',
    '|---|---|---|',
    `| \`heroes/\` | ${heroesN} | ${heroesN * 60} เฟรม |`,
    `| \`enemies/\` | ${enemiesN} | ${enemiesN * 60} เฟรม |`,
    `| \`turrets/\` | ${turretsN} | ${turretsN * 60} เฟรม |`,
    `| **รวม** | **${list.length} ตัว** | **${totalFrames.toLocaleString('th-TH')} เฟรม** |`,
    '',
    'แต่ละไฟล์ตัวละครมี prompt 7 ชุด: ภาพต้นแบบ 1 · เทิร์นอะราวด์ 1 · สไปรท์ชีตรายท่า 4 (ท่าละ 5 ทิศ) · เฟรมเดี่ยวไว้ซ่อม 1',
    `ถ้าทำครบทุกตัว = **${list.length} × 22 ภาพ ≈ ${(list.length * 22).toLocaleString('th-TH')} ครั้งที่ gen**`,
    '',
    '## ลำดับงานที่ควรทำ (ต่อ 1 ตัวละคร)',
    '',
    '1. **PROMPT 1** → ได้ภาพต้นแบบ 1 ภาพ · ถ้าไม่ถูกใจให้ gen ใหม่จนพอใจ **ก่อน** ไปขั้นต่อไป (ทุกภาพหลังจากนี้อ้างอิงจากมัน)',
    '2. **PROMPT 2** → เทิร์นอะราวด์ 5 ทิศ (แนบภาพจากข้อ 1 เป็น reference) · ตรวจว่าทั้ง 5 ช่องเป็นตัวเดียวกันจริง',
    '3. **PROMPT 3–6** → ท่าละ 5 ทิศ รวม 20 ภาพ (แนบเทิร์นอะราวด์เป็น reference ทุกครั้ง)',
    '4. **ตัดเฟรม**: ครอปแต่ละช่อง → ปรับให้เท้าอยู่เส้นเดียวกัน → ย่อเป็น 96×128 px ด้วยวิธี **nearest neighbour** (ห้ามใช้ bilinear ไม่งั้นขอบจะฟุ้ง)',
    '5. **เก็บงานใน Aseprite**: ลดสีให้เหลือ ≤12 สี · ทำเส้นขอบให้หนา 2 px สม่ำเสมอ · ลบพิกเซลกึ่งโปร่งใสที่ขอบทิ้ง',
    '6. บันทึกตามชื่อไฟล์ในเช็คลิสต์ท้ายไฟล์ตัวละคร → `npm run pack-sprites` → เปิดเกมดูได้เลย',
    '',
    '## ทางลัดถ้าไม่อยาก gen 22 ภาพต่อตัว',
    '',
    'gen แค่ **PROMPT 1 + PROMPT 2** (2 ภาพ) แล้วเอา 5 ทิศไปทำแอนิเมชันเองใน Aseprite',
    '(ยืดตัวขึ้น-ลง 1 px สำหรับ idle · เลื่อนขา/แขนสำหรับ walk · เอียงตัว + ย้ายอาวุธสำหรับ attack · ล้มลงสำหรับ death)',
    `เหลือแค่ ${list.length * 2} ภาพ และคุมความสม่ำเสมอได้ง่ายกว่ามาก — วิธีนี้เป็นวิธีที่สตูดิโอ 2D ส่วนใหญ่ใช้จริง`,
    '',
    '## ข้อควรรู้เรื่องโมเดลสร้างภาพ',
    '',
    '- โมเดลสร้างภาพ **วาดพิกเซลอาร์ตขนาดเล็กตรงๆ ไม่เก่ง** — ให้ gen ใหญ่แล้วย่อลงเสมอ (nearest neighbour)',
    '- ถ้าโมเดลทำพื้นหลังโปร่งใสไม่ได้ ให้สั่งพื้นหลัง **#FF00FF ทึบเรียบ** แล้วค่อยคีย์สีออก (prompt สั่งไว้ให้แล้ว)',
    '- **ห้ามให้มีเงาใต้ตัว** เด็ดขาด เกมวาดเงาเอง ถ้าติดมาจะเห็นเป็นคราบดำใต้ตัวละคร',
    '- ช่องในสไปรท์ชีตมักหลุดสเกล — ตอนครอปให้เทียบความสูงหัวกับเฟรมแรกเสมอ',
    '- ทุกภาพที่หันข้าง **ต้องหันไปทางขวา** ถ้าได้ภาพหันซ้ายมาให้พลิกเอา (เกมพลิกซ้ายเอง)',
    '',
    '## เช็คก่อนส่งเข้าเกม',
    '',
    '- [ ] ขนาด 96×128 px ทุกไฟล์ · PNG-32 · พื้นหลังโปร่งใสจริง (ไม่ใช่สีขาว)',
    '- [ ] เท้าอยู่ที่ y=120 เท่ากันทุกเฟรม (เอาเฟรม idle_0_0 เป็นไม้บรรทัด)',
    '- [ ] ไม่มีเงาใต้ตัว ไม่มีขอบสีขาวฟุ้ง ไม่มีพิกเซลกึ่งโปร่งใสตามขอบ',
    '- [ ] ย่อดูที่ 64 px แล้วยังบอกได้ว่าเป็นตัวอะไร',
    '- [ ] `npm run pack-sprites` ผ่านโดยไม่มีคำเตือน แล้ว `npm run art-status` ขึ้นว่าตัวนี้มีอาร์ตจริงแล้ว',
    '',
    'สเปกเต็ม (ขนาด/ชื่อไฟล์/สไตล์) อยู่ใน `../../ART_GUIDE.md` · บล็อกสไตล์กลางอยู่ใน `00-STYLE.md`',
  ].join('\n');
}

function indexDoc(list: Entry[]): string {
  const section = (kind: Entry['kind'], title: string, note: string): string[] => {
    const rows = list.filter((e) => e.kind === kind);
    return [
      `## ${title} (${rows.length} ตัว · ${rows.length * 60} เฟรม)`,
      '',
      note,
      '',
      '| ทำแล้ว | ตัวละคร | id | prompt | ชนิดร่าง | ความสูง |',
      '|---|---|---|---|---|---|',
      ...rows.map(
        (e) =>
          `| ☐ | ${e.name_th} | \`${e.id}\` | [เปิด](${e.folder}/${e.id}.md) | \`${e.sprite.body}\` | ${targetHeight(e)} px |`,
      ),
      '',
    ];
  };
  return [
    '# INDEX — เช็คลิสต์สไปรท์ทั้งเกม',
    '',
    `รวม **${list.length} ตัวละคร × 60 เฟรม = ${(list.length * 60).toLocaleString('th-TH')} เฟรม**`,
    '',
    '**ลำดับความสำคัญ:** ฮีโร่ที่แจกตอนเริ่มเกม → มอนที่โผล่บ่อยสุด (`ghoul`, `skeleton_soldier`, `restless_shade`, `goblin_raider`) → บอส MVP 5 ตัว → เครื่องยิงขั้น 1–2 → ที่เหลือ',
    'ทำทีละตัวจนจบแล้ว `npm run pack-sprites` ได้เลย — เกมสลับจาก placeholder เป็นอาร์ตจริงทีละตัวเองอัตโนมัติ ไม่ต้องรอครบ',
    '',
    ...section('hero', 'ฮีโร่', 'สีอิ่มกว่าศัตรู อ่านออกง่ายแม้ตัวเล็ก เพราะผู้เล่นต้องแยกออกในสนามที่มีของเยอะ'),
    ...section('enemy', 'ศัตรู', 'โทนหม่นกว่าฝ่ายเรา · มินิบอส/บอสต้องใหญ่และมีสีเน้น 1 สีที่ตัดขาดจากพื้นหลัง'),
    ...section('turret', 'เครื่องยิง', 'เป็นเครื่องจักร ไม่มีคนคุม · ท่า walk ใช้เป็นการสั่นเบาๆ แทนการเดิน'),
  ].join('\n');
}

/* ---------- main ---------- */
function main(): void {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const outDir = resolve(outIdx >= 0 ? argv[outIdx + 1]! : 'art/prompts');

  const list = collect();
  mkdirSync(outDir, { recursive: true });
  for (const folder of ['heroes', 'enemies', 'turrets']) mkdirSync(join(outDir, folder), { recursive: true });

  writeFileSync(join(outDir, 'README.md'), readmeDoc(list) + '\n');
  writeFileSync(join(outDir, '00-STYLE.md'), styleDoc() + '\n');
  writeFileSync(join(outDir, 'INDEX.md'), indexDoc(list) + '\n');
  for (const e of list) writeFileSync(join(outDir, e.folder, `${e.id}.md`), characterDoc(e) + '\n');

  console.log(`\n🎨 สร้าง prompt แล้ว → ${outDir}`);
  console.log(`   ตัวละคร ${list.length} ตัว (ฮีโร่ ${list.filter((e) => e.kind === 'hero').length} · ศัตรู ${list.filter((e) => e.kind === 'enemy').length} · เครื่องยิง ${list.filter((e) => e.kind === 'turret').length})`);
  console.log(`   ไฟล์ ${list.length + 3} ไฟล์ · ครอบคลุม ${(list.length * 60).toLocaleString('th-TH')} เฟรมที่ต้องวาด`);
  console.log(`   เริ่มที่ ${join(outDir, 'README.md')}\n`);
}

main();
