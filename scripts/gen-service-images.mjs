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

// ---------- ชุดรูปเทมเพลตบริการรถ S1/S2/S3 (ref เจ้าของ 2026-07-16) ----------
// รถ = flat silhouette สีเดียว + hero โทนธีม + รูปเส้นทาง (ภูเขา/ทะเล/วัด แบบ flat)

const bus = F('M3 7.2c0-.8.6-1.4 1.4-1.4h15.2c.8 0 1.4.6 1.4 1.4v7.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z') +
  C(7, 16.8, 1.9, 'var(--deep)') + C(17, 16.8, 1.9, 'var(--deep)') +
  C(7, 16.8, 0.8, 'white') + C(17, 16.8, 0.8, 'white') +
  `<rect x="4.6" y="7.6" width="3.2" height="2.8" rx="0.4" fill="white" opacity="0.85"/>` +
  `<rect x="8.9" y="7.6" width="3.2" height="2.8" rx="0.4" fill="white" opacity="0.85"/>` +
  `<rect x="13.2" y="7.6" width="3.2" height="2.8" rx="0.4" fill="white" opacity="0.85"/>` +
  `<path d="M3 12.4h18" stroke="white" stroke-width="0.7" opacity="0.6"/>`;
ICONS.bus = bus;
ICONS.suv = F('M3 12.5 5 8.6a1.5 1.5 0 0 1 1.3-.8h9.4c.5 0 1 .2 1.3.6l2.6 3 1.4.5c.6.2 1 .8 1 1.4v2a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1v-2c0-.5.4-1 1-1.2z') +
  C(7.4, 16.9, 2, 'var(--deep)') + C(16.6, 16.9, 2, 'var(--deep)') +
  C(7.4, 16.9, 0.85, 'white') + C(16.6, 16.9, 0.85, 'white') +
  `<rect x="6.4" y="9" width="3.4" height="2.4" rx="0.4" fill="white" opacity="0.85"/>` +
  `<rect x="11" y="9" width="3.2" height="2.4" rx="0.4" fill="white" opacity="0.85"/>`;

const THEME_SETS = {
  s1: { // premier — กรมท่า+ทอง
    dir: 'public/demo/services/premier',
    bgTop: '#101c3c', bgBot: '#0a1226', deep: '#c9a45c', soft: '#c9a45c',
    vehicles: { 'veh-01': 'van', 'veh-02': 'van', 'veh-03': 'sedan', 'veh-04': 'sedan' },
  },
  s2: { // travel — ฟ้าอ่อน+น้ำเงิน
    dir: 'public/demo/services/travel',
    bgTop: '#eaf4fd', bgBot: '#cfe6f9', deep: '#15559f', soft: '#8fc1ec',
    vehicles: { 'veh-01': 'sedan', 'veh-02': 'suv', 'veh-03': 'van', 'veh-04': 'bus' },
  },
  s3: { // taxi — ขาว+น้ำเงินแท็กซี่
    dir: 'public/demo/services/taxi',
    bgTop: '#eef4fc', bgBot: '#d7e6f8', deep: '#1656b8', soft: '#9dbfe8',
    vehicles: { 'veh-01': 'sedan', 'veh-02': 'suv', 'veh-03': 'van', 'veh-04': 'pickup' },
  },
};

function vehicleCardSvg(set, icon) { // การ์ดรถ 4:3 (800x600)
  return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${set.bgTop}"/><stop offset="1" stop-color="${set.bgBot}"/>
  </linearGradient></defs>
  <rect width="800" height="600" fill="url(#vg)"/>
  <circle cx="120" cy="90" r="110" fill="${set.soft}" opacity="0.18"/>
  <circle cx="700" cy="520" r="150" fill="${set.soft}" opacity="0.18"/>
  <ellipse cx="400" cy="470" rx="260" ry="26" fill="${set.deep}" opacity="0.15"/>
  <g transform="translate(190 130)">${iconSvg(icon, set.deep, 420)}</g>
</svg>`;
}

function serviceHeroSvg(set) { // hero กว้าง 1920x900 — พื้นไล่โทน + รถ + เส้นขอบฟ้าเมือง
  const city = `<path d="M0 620 h60 v-90 h50 v50 h70 v-140 h55 v80 h65 v-50 h50 v110 h80 v-70 h55 v40 h70 v-120 h50 v100 h60 v-60 h55 v90 h75 v-130 h50 v110 h60 v-40 h55 v60 h70 v-100 h50 v90 h60 v-50 h55 v80 h70 v-110 h50 v90 h60 v-40 h55 v70 h80 v-90 h50 v80 h60 V620 H1920 V900 H0 Z"
    fill="${set.deep}" opacity="0.12"/>`;
  return `<svg width="1920" height="900" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${set.bgTop}"/><stop offset="1" stop-color="${set.bgBot}"/>
  </linearGradient></defs>
  <rect width="1920" height="900" fill="url(#hg)"/>
  <circle cx="1660" cy="140" r="90" fill="${set.soft}" opacity="0.35"/>
  ${city}
  <ellipse cx="900" cy="790" rx="440" ry="34" fill="${set.deep}" opacity="0.18"/>
  <g transform="translate(560 320)">${iconSvg('van', set.deep, 680)}</g>
</svg>`;
}

// รูปเส้นทาง S2 (16:10 = 800x500) — ท้องฟ้า + ทิวเขา/ทะเล/วัด flat
function routeSvg(kind) {
  const sky = `<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#dff0fd"/><stop offset="1" stop-color="#bcdcf5"/></linearGradient></defs>
    <rect width="800" height="500" fill="url(#rg)"/>
    <circle cx="660" cy="105" r="52" fill="#f5c95e"/>`;
  const sea = `<rect y="330" width="800" height="170" fill="#3f8ecb"/>
    <rect y="330" width="800" height="24" fill="#ffffff" opacity="0.35"/>
    <path d="M0 380 q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 V500 H0 Z" fill="#2e77b3"/>
    <path d="M60 470 l60 -10 60 10 V500 H60 Z" fill="#f0e3c0"/>`;
  const mountains = `<path d="M-40 500 L220 210 L430 470 Z" fill="#3f7d5f"/>
    <path d="M260 500 L520 170 L820 500 Z" fill="#2f6a4e"/>
    <path d="M470 500 L660 300 L860 500 Z" fill="#498a69"/>
    <rect y="460" width="800" height="40" fill="#3d7a58"/>`;
  const temple = `<rect y="430" width="800" height="70" fill="#7fae8f"/>
    <path d="M400 120 l14 60 h-28 Z" fill="#d8a437"/>
    <path d="M352 200 h96 l-12 40 h-72 Z" fill="#e3b34a"/>
    <path d="M330 260 h140 l-14 44 h-112 Z" fill="#d8a437"/>
    <path d="M300 322 h200 l-14 48 h-172 Z" fill="#e3b34a"/>
    <rect x="272" y="386" width="256" height="44" rx="4" fill="#c9932e"/>`;
  const body = kind === 'sea' ? sea : kind === 'temple' ? temple : mountains;
  return `<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">${sky}${body}</svg>`;
}

for (const set of Object.values(THEME_SETS)) {
  mkdirSync(set.dir, { recursive: true });
  await sharp(Buffer.from(serviceHeroSvg(set))).webp({ quality: 85 }).toFile(`${set.dir}/hero-01.webp`);
  for (const [file, icon] of Object.entries(set.vehicles)) {
    await sharp(Buffer.from(vehicleCardSvg(set, icon))).webp({ quality: 85 }).toFile(`${set.dir}/${file}.webp`);
  }
  console.log('OK', set.dir);
}
mkdirSync('public/demo/services/routes', { recursive: true });
const ROUTES = { 'route-sea': 'sea', 'route-sea2': 'sea', 'route-mountain': 'mountain', 'route-mountain2': 'mountain', 'route-temple': 'temple' };
for (const [file, kind] of Object.entries(ROUTES)) {
  await sharp(Buffer.from(routeSvg(kind))).webp({ quality: 85 }).toFile(`public/demo/services/routes/${file}.webp`);
}
console.log('OK routes');

// ---------- ชุดรูป starter pack "ของเล่น / แม่และเด็ก" (flat illustration พาสเทล) ----------
// เจ้าของสั่ง 2026-07-16: ปิดงาน pack ของเล่นด้วยรูป generate (เปลี่ยนเป็นรูปถ่ายจริงทีหลังได้)

const TP = { pink: '#f9d3e0', pinkDeep: '#c76e93', mint: '#cdeee1', mintDeep: '#4f9e82', cream: '#fdf3dd', creamDeep: '#d9a441', sky: '#d7e9fb', skyDeep: '#5b87c5', ink: '#7a5b66' };

// ของเล่นแต่ละชิ้นวาดด้วย shape ล้วน (viewBox 100x100)
const TOYS_ART = {
  bear: `<circle cx="50" cy="58" r="26" fill="${TP.ink}"/><circle cx="30" cy="34" r="10" fill="${TP.ink}"/><circle cx="70" cy="34" r="10" fill="${TP.ink}"/>
    <circle cx="30" cy="34" r="5" fill="${TP.pink}"/><circle cx="70" cy="34" r="5" fill="${TP.pink}"/>
    <circle cx="50" cy="46" r="17" fill="${TP.ink}"/><ellipse cx="50" cy="52" rx="9" ry="7" fill="#fff" opacity="0.9"/>
    <circle cx="43" cy="43" r="2.4" fill="#fff"/><circle cx="57" cy="43" r="2.4" fill="#fff"/><circle cx="50" cy="50" r="2.6" fill="${TP.ink}"/>
    <ellipse cx="34" cy="70" rx="8" ry="10" fill="${TP.ink}"/><ellipse cx="66" cy="70" rx="8" ry="10" fill="${TP.ink}"/>`,
  rabbit: `<ellipse cx="42" cy="22" rx="6" ry="16" fill="#fff"/><ellipse cx="58" cy="22" rx="6" ry="16" fill="#fff"/>
    <ellipse cx="42" cy="22" rx="3" ry="11" fill="${TP.pink}"/><ellipse cx="58" cy="22" rx="3" ry="11" fill="${TP.pink}"/>
    <circle cx="50" cy="50" r="20" fill="#fff"/><circle cx="44" cy="47" r="2.2" fill="${TP.ink}"/><circle cx="56" cy="47" r="2.2" fill="${TP.ink}"/>
    <circle cx="50" cy="53" r="2" fill="${TP.pinkDeep}"/><ellipse cx="50" cy="80" rx="17" ry="13" fill="#fff"/>`,
  blocks: `<rect x="22" y="52" width="26" height="26" rx="3" fill="${TP.pinkDeep}"/><rect x="52" y="52" width="26" height="26" rx="3" fill="${TP.skyDeep}"/>
    <rect x="37" y="24" width="26" height="26" rx="3" fill="${TP.creamDeep}"/>
    <text x="35" y="72" font-size="15" fill="#fff" font-family="sans-serif" font-weight="bold">A</text>
    <text x="65" y="72" font-size="15" fill="#fff" font-family="sans-serif" font-weight="bold" text-anchor="middle">B</text>
    <text x="50" y="44" font-size="15" fill="#fff" font-family="sans-serif" font-weight="bold" text-anchor="middle">C</text>`,
  puzzle: `<path d="M25 30 h20 a6 6 0 0 1 10 0 h20 v20 a6 6 0 0 0 0 10 v20 h-20 a6 6 0 0 1 -10 0 h-20 v-20 a6 6 0 0 0 0-10 z" fill="${TP.mintDeep}"/>
    <path d="M25 30 h20 a6 6 0 0 1 10 0 h20 v20 a6 6 0 0 0 0 10" fill="${TP.skyDeep}" opacity="0.55"/>`,
  car: `<rect x="20" y="46" width="60" height="22" rx="8" fill="${TP.skyDeep}"/><path d="M32 46 l8 -13 h20 l8 13 z" fill="${TP.skyDeep}"/>
    <rect x="42" y="37" width="16" height="9" rx="2" fill="#fff" opacity="0.9"/>
    <circle cx="35" cy="70" r="8" fill="${TP.ink}"/><circle cx="65" cy="70" r="8" fill="${TP.ink}"/>
    <circle cx="35" cy="70" r="3.4" fill="#fff"/><circle cx="65" cy="70" r="3.4" fill="#fff"/>
    <path d="M20 57 h-8" stroke="${TP.pinkDeep}" stroke-width="3" stroke-linecap="round"/>`,
  onesie: `<path d="M35 24 h30 l12 10 -7 9 -5 -4 v25 a8 8 0 0 1 -8 8 h-4 a4 4 0 0 1 -3 -2 a4 4 0 0 1 -3 2 h-4 a8 8 0 0 1 -8 -8 v-25 l-5 4 -7 -9 z" fill="#fff"/>
    <circle cx="50" cy="27" r="2" fill="${TP.pink}"/><circle cx="50" cy="35" r="2" fill="${TP.pink}"/>
    <circle cx="50" cy="52" r="7" fill="${TP.pink}" opacity="0.7"/>`,
  blanket: `<rect x="24" y="30" width="52" height="44" rx="6" fill="#fff"/><rect x="24" y="30" width="52" height="12" rx="6" fill="${TP.mint}"/>
    <path d="M40 54 l2.2 4.6 5 .7 -3.6 3.5 .9 5 -4.5 -2.4 -4.5 2.4 .9 -5 -3.6 -3.5 5 -.7 z" fill="${TP.creamDeep}"/>
    <path d="M62 50 l1.8 3.7 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z" fill="${TP.pinkDeep}" opacity="0.8"/>`,
  teether: `<circle cx="50" cy="56" r="20" fill="none" stroke="${TP.creamDeep}" stroke-width="9"/>
    <circle cx="50" cy="30" r="12" fill="${TP.mintDeep}"/><circle cx="45.5" cy="28" r="2" fill="#fff"/><circle cx="54.5" cy="28" r="2" fill="#fff"/>
    <ellipse cx="42" cy="20" rx="3.4" ry="6" fill="${TP.mintDeep}"/><ellipse cx="58" cy="20" rx="3.4" ry="6" fill="${TP.mintDeep}"/>`,
  mobile: `<path d="M26 26 q24 -14 48 0" fill="none" stroke="${TP.ink}" stroke-width="3.4" stroke-linecap="round"/>
    <line x1="32" y1="28" x2="32" y2="44" stroke="${TP.ink}" stroke-width="2"/><line x1="50" y1="21" x2="50" y2="52" stroke="${TP.ink}" stroke-width="2"/><line x1="68" y1="28" x2="68" y2="44" stroke="${TP.ink}" stroke-width="2"/>
    <path d="M32 44 l5.5 9 h-11 z" fill="${TP.creamDeep}"/><circle cx="68" cy="50" r="6.5" fill="${TP.pinkDeep}"/>
    <path d="M50 52 l2.6 5.3 5.8 .8 -4.2 4.1 1 5.8 -5.2 -2.7 -5.2 2.7 1 -5.8 -4.2 -4.1 5.8 -.8 z" fill="${TP.skyDeep}"/>`,
};

function toyCardSvg(art, bg, softAccent) { // การ์ด 3:4 (900x1200)
  return `<svg width="900" height="1200" xmlns="http://www.w3.org/2000/svg">
  <rect width="900" height="1200" fill="${bg}"/>
  <circle cx="140" cy="150" r="170" fill="#ffffff" opacity="0.5"/>
  <circle cx="790" cy="1050" r="220" fill="${softAccent}" opacity="0.45"/>
  <circle cx="800" cy="170" r="46" fill="#ffffff" opacity="0.6"/>
  <circle cx="110" cy="1010" r="34" fill="#ffffff" opacity="0.6"/>
  <ellipse cx="450" cy="905" rx="255" ry="26" fill="${TP.ink}" opacity="0.10"/>
  <g transform="translate(150 300) scale(6)">${art}</g>
</svg>`;
}

function toysHeroSvg() { // hero กว้าง (1920x900) — หมี + บล็อก + ดาว
  return `<svg width="1920" height="900" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fdeff4"/><stop offset="1" stop-color="${TP.pink}"/>
  </linearGradient></defs>
  <rect width="1920" height="900" fill="url(#tg)"/>
  <circle cx="1620" cy="150" r="80" fill="#fff" opacity="0.55"/>
  <circle cx="180" cy="740" r="110" fill="${TP.mint}" opacity="0.65"/>
  <circle cx="760" cy="150" r="42" fill="${TP.cream}" opacity="0.9"/>
  <ellipse cx="1330" cy="800" rx="430" ry="36" fill="${TP.ink}" opacity="0.10"/>
  <g transform="translate(1080 240) scale(5.2)">${TOYS_ART.bear}</g>
  <g transform="translate(880 560) scale(2.6)">${TOYS_ART.blocks}</g>
  <g transform="translate(1560 500) scale(2.4)">${TOYS_ART.car}</g>
  <path d="M320 200 l7 14 15 2 -11 11 3 15 -14 -7 -14 7 3 -15 -11 -11 15 -2 z" fill="${TP.creamDeep}" opacity="0.8"/>
  <path d="M540 640 l5 10 11 1.5 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -1.5 z" fill="${TP.pinkDeep}" opacity="0.6"/>
</svg>`;
}

const TOY_FILES = {
  'toy-01': [TOYS_ART.bear, TP.pink, TP.mint],
  'toy-02': [TOYS_ART.mobile, TP.sky, TP.pink],
  'toy-03': [TOYS_ART.puzzle, TP.cream, TP.mint],
  'toy-04': [TOYS_ART.blocks, TP.mint, TP.cream],
  'toy-05': [TOYS_ART.car, TP.cream, TP.sky],
  'toy-06': [TOYS_ART.onesie, TP.pink, TP.cream],
  'toy-07': [TOYS_ART.blanket, TP.mint, TP.pink],
  'toy-08': [TOYS_ART.teether, TP.sky, TP.mint],
  'cat-01': [TOYS_ART.puzzle, TP.mint, TP.cream],
  'cat-02': [TOYS_ART.rabbit, TP.pink, TP.mint],
  'cat-03': [TOYS_ART.onesie, TP.cream, TP.pink],
};
mkdirSync('public/demo/toys', { recursive: true });
await sharp(Buffer.from(toysHeroSvg())).webp({ quality: 85 }).toFile('public/demo/toys/hero-01.webp');
for (const [file, [art, bg, accent]] of Object.entries(TOY_FILES)) {
  await sharp(Buffer.from(toyCardSvg(art, bg, accent))).webp({ quality: 85 }).toFile(`public/demo/toys/${file}.webp`);
}
console.log('OK toys');
