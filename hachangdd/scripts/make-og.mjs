/**
 * สร้างรูป OG (1200x630) + apple-touch-icon จาก SVG — รันตอนแก้แบรนด์เท่านั้น
 * ใช้: node scripts/make-og.mjs   (ผลลัพธ์ลง public/)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const font = readFileSync(new URL('../public/fonts/noto-sans-thai-thai.woff2', import.meta.url)).toString('base64');

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <style>
      @font-face { font-family:'NST'; src:url(data:font/woff2;base64,${font}) format('woff2'); font-weight:400 800; }
      .t { font-family:'NST',sans-serif; fill:#fff; }
    </style>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b3f66"/><stop offset="55%" stop-color="#082e4b"/><stop offset="100%" stop-color="#0e4f7f"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1080" cy="90" r="220" fill="#12649f" opacity="0.28"/>
  <circle cx="120" cy="580" r="180" fill="#1a7fc4" opacity="0.22"/>
  <text class="t" x="80" y="228" font-size="42" font-weight="600" fill="#b3daf5">hachangdd.com</text>
  <text class="t" x="80" y="330" font-size="82" font-weight="800">หาช่างดีดี</text>
  <text class="t" x="80" y="424" font-size="46" font-weight="600">ล้างแอร์ถึงบ้าน จังหวัดอุบลราชธานี</text>
  <rect x="80" y="474" width="392" height="72" rx="36" fill="#e05600"/>
  <text class="t" x="276" y="521" font-size="36" font-weight="800" text-anchor="middle">ราคาบอกก่อนทำ</text>
  <rect x="496" y="474" width="330" height="72" rx="36" fill="#ffffff" opacity="0.14"/>
  <text class="t" x="661" y="521" font-size="34" font-weight="600" text-anchor="middle">ช่างในพื้นที่</text>
</svg>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs><style>
    @font-face { font-family:'NST'; src:url(data:font/woff2;base64,${font}) format('woff2'); font-weight:400 800; }
  </style></defs>
  <rect width="180" height="180" rx="40" fill="#12649f"/>
  <text x="90" y="122" font-family="NST,sans-serif" font-size="92" font-weight="800" fill="#fff" text-anchor="middle">ดี</text>
</svg>`;

await sharp(Buffer.from(og)).png().toFile(new URL('../public/og-default.png', import.meta.url).pathname);
await sharp(Buffer.from(icon)).png().toFile(new URL('../public/apple-touch-icon.png', import.meta.url).pathname);
// favicon เป็น SVG ล้วน ไม่ฝังฟอนต์ (ฟอนต์ในไฟคอนไม่ถูก render อยู่แล้ว และทำให้ไฟล์ใหญ่)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#12649f"/><g fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"><path d="M32 12v40M15 21.5l34 21M49 21.5l-34 21M32 22l6-6M32 22l-6-6M32 42l6 6M32 42l-6 6"/></g></svg>`;
writeFileSync(new URL('../public/favicon.svg', import.meta.url), favicon);
console.log('✅ สร้าง og-default.png, apple-touch-icon.png, favicon.svg แล้ว');
