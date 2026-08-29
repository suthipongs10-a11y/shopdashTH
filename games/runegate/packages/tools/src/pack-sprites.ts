/**
 * Sprite Packer (Phase 3) — รวมไฟล์ PNG รายเฟรมเป็น texture atlas + manifest ที่เกมโหลดได้ทันที
 *
 *   npm run pack-sprites -- --in art/src --out packages/client/public/art
 *   npm run pack-sprites -- --check          # ดูว่าตัวไหนมีอาร์ตจริงแล้ว ตัวไหนยังใช้ placeholder
 *
 * โครงโฟลเดอร์ที่รับเข้า — 1 โฟลเดอร์ต่อ 1 ตัวละคร ชื่อโฟลเดอร์ = id ในไฟล์คอนเทนต์:
 *
 *   art/src/warden_kael/idle_0_0.png     ← {ท่า}_{ทิศ}_{เฟรม}.png
 *   art/src/warden_kael/walk_2_3.png
 *
 * ทิศ 0–4 = หน้า / หน้าเฉียง / ข้าง / หลังเฉียง / หลัง (อีก 3 ทิศเกมพลิกเอาเอง)
 * สเปกเต็มอยู่ใน ART_GUIDE.md
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';
import { enemies, heroes, turrets } from '@runegate/data';

const FRAME_W = 96;
const FRAME_H = 128;
const ROWS = 5;
const ANIMS = [
  { name: 'idle', start: 0, frames: 2, fps: 3, loop: true },
  { name: 'walk', start: 2, frames: 4, fps: 8, loop: true },
  { name: 'attack', start: 6, frames: 3, fps: 11, loop: false },
  { name: 'death', start: 9, frames: 3, fps: 7, loop: false },
] as const;
const COLS = ANIMS.reduce((n, a) => Math.max(n, a.start + a.frames), 0);

interface Args {
  inDir: string;
  outDir: string;
  check: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    inDir: resolve(get('--in') ?? 'art/src'),
    outDir: resolve(get('--out') ?? 'packages/client/public/art'),
    check: argv.includes('--check'),
  };
}

function allContentIds(): { id: string; name: string; kind: string }[] {
  return [
    ...heroes.map((h) => ({ id: h.id, name: h.name_th, kind: 'ฮีโร่' })),
    ...enemies.map((e) => ({ id: e.id, name: e.name_th, kind: 'ศัตรู' })),
    ...turrets.map((t) => ({ id: t.id, name: t.name_th, kind: 'เครื่องยิง' })),
  ];
}

async function packOne(dir: string, id: string, outDir: string): Promise<string[]> {
  const problems: string[] = [];
  const files = new Map<string, string>();
  for (const f of readdirSync(dir)) {
    if (!f.toLowerCase().endsWith('.png')) continue;
    files.set(basename(f, '.png'), join(dir, f));
  }

  const composites: sharp.OverlayOptions[] = [];
  for (const anim of ANIMS) {
    for (let row = 0; row < ROWS; row++) {
      for (let f = 0; f < anim.frames; f++) {
        const key = `${anim.name}_${row}_${f}`;
        const path = files.get(key);
        if (!path) {
          problems.push(`ขาดเฟรม ${key}.png`);
          continue;
        }
        const meta = await sharp(path).metadata();
        if (meta.width !== FRAME_W || meta.height !== FRAME_H) {
          problems.push(`${key}.png ขนาด ${meta.width}×${meta.height} — ต้องเป็น ${FRAME_W}×${FRAME_H}`);
          continue;
        }
        composites.push({ input: path, left: (anim.start + f) * FRAME_W, top: row * FRAME_H });
      }
    }
  }
  if (problems.length > 0) return problems;

  mkdirSync(outDir, { recursive: true });
  await sharp({
    create: { width: FRAME_W * COLS, height: FRAME_H * ROWS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, `${id}.png`));

  writeFileSync(
    join(outDir, `${id}.json`),
    `${JSON.stringify(
      {
        frameW: FRAME_W,
        frameH: FRAME_H,
        cols: COLS,
        rows: ROWS,
        anims: Object.fromEntries(ANIMS.map((a) => [a.name, { start: a.start, frames: a.frames, fps: a.fps, loop: a.loop }])),
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return [];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const content = allContentIds();

  if (args.check) {
    const outHas = (id: string): boolean => existsSync(join(args.outDir, `${id}.json`));
    const srcHas = (id: string): boolean => existsSync(join(args.inDir, id));
    const done = content.filter((c) => outHas(c.id));
    console.log(`\n🎨 สถานะอาร์ต (${done.length}/${content.length} ตัวมี atlas จริงแล้ว)\n`);
    for (const c of content) {
      const mark = outHas(c.id) ? '✅ atlas จริง' : srcHas(c.id) ? '🟡 มีไฟล์ต้นทาง ยังไม่ได้แพ็ค' : '⬜ ใช้ placeholder';
      console.log(`  ${mark.padEnd(28)} ${c.kind.padEnd(10)} ${c.name} (${c.id})`);
    }
    console.log(`\nโฟลเดอร์ต้นทาง: ${args.inDir}\nโฟลเดอร์ผลลัพธ์: ${args.outDir}\n`);
    return;
  }

  if (!existsSync(args.inDir)) {
    console.log(`\n⬜ ยังไม่มีโฟลเดอร์อาร์ตต้นทางที่ ${args.inDir}`);
    console.log('   เกมจะใช้ sprite placeholder ที่วาดด้วยโค้ดไปก่อน (ดู ART_GUIDE.md สำหรับสเปกไฟล์)\n');
    return;
  }

  const dirs = readdirSync(args.inDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  if (dirs.length === 0) {
    console.log(`\n⬜ ไม่มีโฟลเดอร์ตัวละครใน ${args.inDir}\n`);
    return;
  }

  const known = new Set(content.map((c) => c.id));
  let packed = 0;
  const failures: string[] = [];
  for (const d of dirs) {
    if (!known.has(d.name)) {
      failures.push(`${d.name}: ไม่มี id นี้ในไฟล์คอนเทนต์`);
      continue;
    }
    const problems = await packOne(join(args.inDir, d.name), d.name, args.outDir);
    if (problems.length > 0) {
      failures.push(`${d.name}:\n    - ${problems.join('\n    - ')}`);
    } else {
      packed++;
      console.log(`✅ ${d.name}`);
    }
  }

  console.log(`\nแพ็คสำเร็จ ${packed} ตัว → ${args.outDir}`);
  if (failures.length > 0) {
    console.error(`\n❌ ไม่ผ่าน ${failures.length} ตัว:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
}

void main();
