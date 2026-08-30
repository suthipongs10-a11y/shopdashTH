# 00 — STYLE BLOCK กลาง

บล็อกนี้ถูกใส่ไว้ในทุก prompt ของทุกตัวละครแล้ว — ไฟล์นี้มีไว้ให้ดูรวมๆ และให้แก้ที่เดียวเวลาจะปรับสไตล์ทั้งเกม
(แก้ที่ `packages/tools/src/gen-art-prompts.ts` แล้วรัน `npm run art-prompts` ใหม่ prompt ทั้ง 63 ตัวจะอัปเดตตาม)

## Style block

```text
Style: hand-crafted 2D pixel-art game sprite for an isometric tower-defence game, in the tradition of Ragnarok Online unit sprites and Arknights operator sprites. One single character only, centred, full body from head to feet, nothing else in the image.
Camera: three-quarter overhead view, camera about 32 degrees above the horizon, near-orthographic (no wide-angle distortion, no foreshortening tricks).
Line work: a solid 2 px dark outline in #181222 around the entire silhouette. Hard pixel edges, no soft anti-aliased halo against the background.
Lighting: one key light from the upper LEFT; a thin cool rim light in #7fd4e8 along the upper-right edge only.
Colour: at most 12 flat colours including the outline. Cel shading with at most 2 shadow steps. No gradients, no airbrush, no photo texture, no noise.
Background: fully transparent. If transparency is not available, use one completely flat #FF00FF magenta background with no gradient and no shading so it can be keyed out.
Do NOT draw a ground shadow, floor, ground plane, grass, stone platform, pedestal, base or any scenery — the game renders its own shadow underneath.
Do NOT add text, letters, numbers, logos, watermarks, signatures, frames, borders or drop shadows.
Readability rule: the solid silhouette alone must identify this character when shrunk to 64 pixels tall.
Symmetry rule: the game mirrors the right-facing sprites to produce the left-facing ones, so all side and three-quarter views must face the RIGHT side of the frame, and the design must carry no one-sided marks (no eyepatch, no single scar, no lettering, no single-shoulder emblem). A weapon or shield changing hands when mirrored is fine.
```

## Negative prompt

```text
photorealistic, 3d render, octane, unreal engine, blurry, soft focus, depth of field, painterly brush texture, watercolour, gradient background, sky, scenery, landscape, floor, ground, grass, platform, pedestal, base, ground shadow, cast shadow, drop shadow, text, letters, numbers, watermark, signature, logo, ui elements, health bar, frame, border, panel, multiple characters, crowd, duplicate character, extra limbs, extra heads, deformed hands, cropped body, cut off feet, cut off head, character touching the frame edge, anti-aliased halo, semi-transparent edge pixels, jpeg artifacts, low contrast outline, muddy colours
```

## ตัวเลขที่ห้ามเปลี่ยน

| หัวข้อ | ค่า | เหตุผล |
|---|---|---|
| ขนาดเฟรม | 96 × 128 px | packer ปฏิเสธไฟล์ขนาดอื่น |
| เท้าตัวละคร | y = 120 | เกมวางเงาและยึดตำแหน่งจากเส้นนี้ |
| สีเส้นขอบ | `#181222` | ให้ทุกตัวอยู่ในเกมเดียวกัน |
| rim light | `#7fd4e8` | สีรูนของเกม |
| จำนวนสี | ≤ 12 | คุมให้ดูเป็นชุดเดียว และไฟล์เล็ก |
| ทิศที่วาด | 5 (0–4) | อีก 3 ทิศเกมพลิกเอง |
| ท่า/เฟรม | idle 2 · walk 4 · attack 3 · death 3 | ตรงกับ manifest ใน `pack-sprites.ts` |

## ท่าและจังหวะเฟรม

| ท่า | เฟรม | fps | วนซ้ำ | จังหวะ |
|---|---|---|---|---|
| `idle` (ยืนเฉย) | 2 | 3 | ✔ | ลูปหายใจสั้นๆ แทบไม่ขยับ |
| `walk` (เดิน) | 4 | 8 | ✔ | ลูปเดินที่ต่อกลับเฟรมแรกได้เนียน |
| `attack` (โจมตี) | 3 | 11 | ✘ | เงื้อ → ปะทะ → ตามน้ำหนัก |
| `death` (ตาย) | 3 | 7 | ✘ | สะดุ้ง → ทรุด → ล้มนิ่ง |
