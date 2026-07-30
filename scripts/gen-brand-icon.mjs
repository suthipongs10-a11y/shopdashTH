// สร้างไฟล์ icon ทุกขนาดจาก app/icon.svg (โลโก้แบรนด์ ShopDash)
// รัน: node scripts/gen-brand-icon.mjs — ได้ app/icon.png (512), app/apple-icon.png (180),
// app/favicon.ico (32 — ICO ห่อ PNG ตามสเปค รองรับเบราว์เซอร์เก่า)
// แก้โลโก้ = แก้ app/icon.svg แล้วรันสคริปต์นี้ใหม่

import { readFileSync, writeFileSync } from 'fs';
import sharp from 'sharp';

const svg = readFileSync('app/icon.svg');

await sharp(svg).resize(512, 512).png().toFile('app/icon.png');
await sharp(svg).resize(180, 180).png().toFile('app/apple-icon.png');

// favicon.ico: ICO format อนุญาตให้ฝัง PNG ตรงๆ (นิยมใช้กับขนาด ≥16px ทุกเบราว์เซอร์ยุคใหม่)
const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(6 + 16);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(1, 4); // จำนวนภาพ
header.writeUInt8(32, 6); // กว้าง
header.writeUInt8(32, 7); // สูง
header.writeUInt8(0, 8); // palette
header.writeUInt8(0, 9); // reserved
header.writeUInt16LE(1, 10); // planes
header.writeUInt16LE(32, 12); // bit depth
header.writeUInt32LE(png32.length, 14); // ขนาดข้อมูล
header.writeUInt32LE(22, 18); // offset ข้อมูล
writeFileSync('app/favicon.ico', Buffer.concat([header, png32]));

console.log('OK brand icons: app/icon.png, app/apple-icon.png, app/favicon.ico');
