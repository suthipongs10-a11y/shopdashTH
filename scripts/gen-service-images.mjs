// สร้างรูปประกอบ starter pack กลุ่มธุรกิจบริการ — flat illustration ล้วน (ไม่มีตัวอักษร)
// รันจาก root โปรเจ็ค: node <script>
import sharp from 'sharp';
import { mkdirSync } from 'fs';

const S = (d, extra = '') => `<path d="${d}" fill="none" stroke="var(--deep)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const F = (d) => `<path d="${d}" fill="var(--deep)"/>`;
const C = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

// ---------- icons (viewBox 24) ----------
const ICONS = {
  ac: S('M2.5 7h19v6.5h-19z') + S('M5.5 10.5h13') + S('M7 16.5v2.5') + S('M12 16.5v3.5') + S('M17 16.5v2.5'),
  wind: S('M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2') + S('M9.6 4.6A2 2 0 1 1 11 8H2') + S('M12.6 19.4A2 2 0 1 0 14 16H2'),
  gauge: S('M12 21a9 9 0 1 1 9-9') + S('M12 12l4.5-4.5') + C(12, 12, 1.3, 'var(--deep)'),
  snow: S('M12 3v18') + S('M4.2 7.5l15.6 9') + S('M19.8 7.5l-15.6 9') + S('M12 3l-2-2M12 3l2-2', 'transform="translate(0 0)"'),
  pin: S('M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z') + C(12, 10, 2.6, 'none').replace('fill="none"', 'fill="none" stroke="var(--deep)" stroke-width="1.7"'),
  wrench: S('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'),
  droplet: S('M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z'),
  zap: S('M13 2 3 14h9l-1 8 10-12h-9l1-8z'),
  toolbox: S('M3 9.5h18v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z') + S('M8.5 9.5V7a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2.5') + S('M3 13.5h18'),
  roller: S('M4 4.5h12.5v4.5H4z') + S('M16.5 6.5h3.5v4H12v2.5') + S('M12 13v7'),
  plug: S('M7.5 8.5h9V12a4.5 4.5 0 0 1-9 0z') + S('M9.5 8.5v-4') + S('M14.5 8.5v-4') + S('M12 16.5V21'),
  clock: S('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z') + S('M12 7v5l3.5 2'),
  truck: S('M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2') + S('M14 9h4l4 4v4a1 1 0 0 1-1 1h-2') + C(7, 18, 2, 'none').replace('fill="none"', 'fill="none" stroke="var(--deep)" stroke-width="1.7"') + C(17, 18, 2, 'none').replace('fill="none"', 'fill="none" stroke="var(--deep)" stroke-width="1.7"'),
  sedan: F('M3.5 12.2 5.6 8a1.6 1.6 0 0 1 1.4-.9h7.2c.5 0 1 .2 1.3.6l2.9 3.4 2 .6c.7.2 1.1.8 1.1 1.5v2.3a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-2.4c0-.4.4-.9 1-.9z') + C(7.2, 16.7, 2.1, 'var(--deep)') + C(16.8, 16.7, 2.1, 'var(--deep)') + C(7.2, 16.7, 0.9, 'white') + C(16.8, 16.7, 0.9, 'white') + `<rect x="10.4" y="4.6" width="3.2" height="1.9" rx="0.5" fill="var(--deep)"/>` + `<rect x="8.2" y="8.6" width="3" height="2.2" rx="0.4" fill="white" opacity="0.85"/>` + `<rect x="12.4" y="8.6" width="2.6" height="2.2" rx="0.4" fill="white" opacity="0.85"/>`,
  van: F('M2.8 8.4c0-.8.6-1.4 1.4-1.4h11.4c.5 0 1 .2 1.3.6l3.6 4c.3.3.5.8.5 1.2v3a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1z') + C(7, 17, 2.1, 'var(--deep)') + C(16.6, 17, 2.1, 'var(--deep)') + C(7, 17, 0.9, 'white') + C(16.6, 17, 0.9, 'white') + `<rect x="4.6" y="8.8" width="3.4" height="2.6" rx="0.4" fill="white" opacity="0.85"/>` + `<rect x="9.4" y="8.8" width="3.4" height="2.6" rx="0.4" fill="white" opacity="0.85"/>` + `<path d="M14.6 8.8h1.6l2.4 2.6h-4z" fill="white" opacity="0.85"/>`,
  pickup: F('M2.8 10.2c0-.7.6-1.3 1.3-1.3h5.3c.5 0 .9.2 1.2.6l1.6 2h8c.7 0 1.3.6 1.3 1.3v2.4a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1z') + C(7, 17.4, 2.1, 'var(--deep)') + C(16.8, 17.4, 2.1, 'var(--deep)') + C(7, 17.4, 0.9, 'white') + C(16.8, 17.4, 0.9, 'white') + `<rect x="4.5" y="10.4" width="3" height="2.2" rx="0.4" fill="white" opacity="0.85"/>` + `<path d="M12.8 11.5h7.5" stroke="white" stroke-width="0.9" opacity="0.7"/>`,
};

const PACKS = {
  aircon: { bg: '#e0f2fe', mid: '#7dd3fc', deep: '#0c4a6e', heroIcon: 'ac', items: { 'svc-01': 'ac', 'svc-02': 'wrench', 'svc-03': 'gauge', 'svc-04': 'snow', 'svc-05': 'pin', 'svc-06': 'wind' } },
  handyman: { bg: '#fef3c7', mid: '#fcd34d', deep: '#78350f', heroIcon: 'toolbox', items: { 'svc-01': 'droplet', 'svc-02': 'zap', 'svc-03': 'wrench', 'svc-04': 'toolbox', 'svc-05': 'roller', 'svc-06': 'plug' } },
  transport: { bg: '#dcfce7', mid: '#86efac', deep: '#14532d', heroIcon: 'truck', items: { 'svc-01': 'truck', 'svc-02': 'sedan', 'svc-03': 'van', 'svc-04': 'pickup', 'svc-05': 'clock', 'svc-06': 'pin' } },
};

function iconSvg(name, deep, size) {
  // librsvg ไม่รองรับ CSS var — แทนค่าสีลง path ตรงๆ
  return `<svg x="0" y="0" width="${size}" height="${size}" viewBox="0 0 24 24">${ICONS[name].replaceAll('var(--deep)', deep)}</svg>`;
}

// การ์ดบริการ 900x1200 — พื้นพาสเทล + วงกลม soft + ป้ายขาวมุมมน + ไอคอนใหญ่
function cardSvg(pack, icon) {
  const { bg, mid, deep } = pack;
  return `<svg width="900" height="1200" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="1200" fill="${bg}"/>
  <circle cx="130" cy="150" r="190" fill="${mid}" opacity="0.35"/>
  <circle cx="800" cy="1060" r="240" fill="${mid}" opacity="0.35"/>
  <circle cx="790" cy="180" r="60" fill="white" opacity="0.5"/>
  <circle cx="120" cy="1010" r="40" fill="white" opacity="0.5"/>
  <rect x="200" y="350" width="500" height="500" rx="70" fill="white"/>
  <g transform="translate(295 445)">${iconSvg(icon, deep, 310)}</g>
  <rect x="290" y="950" width="320" height="34" rx="17" fill="${deep}" opacity="0.55"/>
  <rect x="350" y="1010" width="200" height="26" rx="13" fill="${deep}" opacity="0.25"/>
</svg>`;
}

// hero 1600x900 — gradient + ไอคอนหลักในวงขาว + วงประกอบ
function heroSvg(pack) {
  const { bg, mid, deep, heroIcon } = pack;
  return `<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="${mid}"/>
  </linearGradient></defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  <circle cx="1330" cy="450" r="330" fill="white" opacity="0.35"/>
  <circle cx="1330" cy="450" r="250" fill="white" opacity="0.9"/>
  <g transform="translate(1180 300)">${iconSvg(heroIcon, deep, 300)}</g>
  <circle cx="180" cy="760" r="90" fill="${mid}" opacity="0.5"/>
  <circle cx="90" cy="130" r="55" fill="white" opacity="0.4"/>
  <circle cx="760" cy="820" r="42" fill="white" opacity="0.45"/>
  <rect x="120" y="330" width="620" height="52" rx="26" fill="${deep}" opacity="0.5"/>
  <rect x="120" y="410" width="460" height="34" rx="17" fill="${deep}" opacity="0.28"/>
  <rect x="120" y="500" width="220" height="64" rx="32" fill="${deep}" opacity="0.85"/>
</svg>`;
}

for (const [code, pack] of Object.entries(PACKS)) {
  const dir = `public/demo/services/${code}`;
  mkdirSync(dir, { recursive: true });
  await sharp(Buffer.from(heroSvg(pack))).webp({ quality: 85 }).toFile(`${dir}/hero-01.webp`);
  for (const [file, icon] of Object.entries(pack.items)) {
    await sharp(Buffer.from(cardSvg(pack, icon))).webp({ quality: 85 }).toFile(`${dir}/${file}.webp`);
  }
  console.log('OK', code);
}
