// Converts photos-src/*.jpg → static/img/{name}-{w}.webp (EXIF/GPS stripped) and writes
// content/images.json (dimensions + widths) used by build.mjs. Dev-only; output is committed.
// Usage: npm i --no-save sharp && node scripts/optimize-images.mjs
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'photos-src');
const out = join(root, 'static/img');
const WIDTHS = [480, 800, 1200];
mkdirSync(out, { recursive: true });

const manifest = {};
for (const file of readdirSync(src).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort()) {
  const name = parse(file).name;
  const img = sharp(join(src, file)).rotate(); // honor EXIF orientation, metadata dropped on output
  const { width, height } = await img.metadata();
  const widths = [...new Set(WIDTHS.map((w) => Math.min(w, width)))];
  for (const w of widths) {
    await img.clone().resize({ width: w }).webp({ quality: 72, effort: 6 }).toFile(join(out, `${name}-${w}.webp`));
  }
  manifest[name] = { width, height, widths };
  console.log(name, width, 'x', height, '→', widths.join(', '));
}
writeFileSync(join(root, 'content/images.json'), JSON.stringify(manifest, null, 2) + '\n');
