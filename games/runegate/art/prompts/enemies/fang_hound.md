# หมาล่าเนื้อ — `fang_hound`

> ศัตรูระดับธรรมดา · เผ่าbeast · ธาตุแสง

| หัวข้อ | ค่า |
|---|---|
| ชนิดร่าง | `beast` · อาวุธ `claw` · scale 0.95 |
| ความสูงในเฟรม | ~44 px จากเฟรม 96×128 (เท้าอยู่ที่ y=120) |
| พาเลตต์ | หลัก `#e0d8c4` · ตัดขอบ `#b8a05a` · ผิว/ขน `#f0e8d4` |
| ผังภาพ | ตัวนี้กว้าง/ใหญ่ → ใช้ผังแบบตาราง 1024×1024 (ช่องแถวเดียวจะแคบเกินไป) |
| จำนวนไฟล์ | 60 ไฟล์ (12 เฟรม × 5 ทิศ) → `art/src/fang_hound/` |

---

## ทิศทั้ง 5 (ใช้แทนที่ในทุก prompt ด้านล่าง)

| แถว | ทิศ | ประโยคที่ใส่ใน prompt |
|---|---|---|
| 0 | หันหน้าเข้าหากล้อง | `facing the camera in full front view, both eyes visible, chest square to the viewer` |
| 1 | หน้าเฉียง (เฉียงไปทางขวาของภาพ) | `three-quarter front view turned toward the lower-right of the frame, roughly 45 degrees, face still visible` |
| 2 | ด้านข้าง (หันไปทางขวาของภาพ) | `full side profile facing the right edge of the frame, only one eye visible` |
| 3 | หลังเฉียง (เฉียงขึ้นทางขวาของภาพ) | `three-quarter rear view turned away toward the upper-right of the frame, face NOT visible, back of the shoulder toward the viewer` |
| 4 | หันหลัง | `full back view, only the back of the head and body visible, face NOT visible` |

> ทิศซ้ายทั้งหมดเกมพลิกเอง — **ทุกภาพต้องหันไปทางขวาของเฟรมเท่านั้น**

---

## PROMPT 1 — ภาพต้นแบบ (ทำก่อนเสมอ ใช้เป็นภาพอ้างอิงของทุก prompt ถัดไป)

ขนาด **1024 × 1024**

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

Character: "Fang Hound" — a rank-and-file enemy that appears in large numbers; race: beast, light element.
Body type: a four-legged beast with its back roughly at knee height of a man. Weapon: clawed gauntlets or natural claws.
Silhouette: Sleek pale hunting hound, head low, ears back.
Details: Cream-white short fur with light tan markings, black nose, amber eyes, lean visible ribs.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #e0d8c4, accent/trim #b8a05a, skin or fur #f0e8d4, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 44 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: ONE single reference illustration of this character alone, standing in a neutral idle pose, seen facing the camera in full front view. Centre it on the canvas with clear space around it.
This image is the master reference: every later frame must match it exactly in costume, colour and proportion.
```

## PROMPT 2 — เทิร์นอะราวด์ 5 ทิศ (แนบภาพจาก PROMPT 1 เป็นภาพอ้างอิง)

ขนาด **1536 × 1024**

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

Character: "Fang Hound" — a rank-and-file enemy that appears in large numbers; race: beast, light element.
Body type: a four-legged beast with its back roughly at knee height of a man. Weapon: clawed gauntlets or natural claws.
Silhouette: Sleek pale hunting hound, head low, ears back.
Details: Cream-white short fur with light tan markings, black nose, amber eyes, lean visible ribs.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #e0d8c4, accent/trim #b8a05a, skin or fur #f0e8d4, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 44 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a five-view character turnaround on ONE image, canvas 1536 x 1024, five equal columns side by side (each cell 307 x 1024).
All five cells show the SAME character at the SAME scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the viewing angle changes. Standing neutral idle pose in every cell.
Column 1: facing the camera in full front view, both eyes visible, chest square to the viewer.
Column 2: three-quarter front view turned toward the lower-right of the frame, roughly 45 degrees, face still visible.
Column 3: full side profile facing the right edge of the frame, only one eye visible.
Column 4: three-quarter rear view turned away toward the upper-right of the frame, face NOT visible, back of the shoulder toward the viewer.
Column 5: full back view, only the back of the head and body visible, face NOT visible.
Leave a clear gap between columns. Do not draw dividing lines, labels or numbers.
```

---

## PROMPT 3–6 — สไปรท์ชีตรายท่า

**แต่ละ prompt ต้องรัน 5 ครั้ง (ทิศละครั้ง)** โดยเปลี่ยนประโยคหลัง `ALL frames seen` เป็นประโยคทิศจากตารางข้างบน
และแนบภาพเทิร์นอะราวด์จาก PROMPT 2 เป็นภาพอ้างอิงทุกครั้ง — รวม 4 ท่า × 5 ทิศ = **20 ภาพต่อตัวละคร**

### PROMPT 3 — `idle` (ยืนเฉย) · 2 เฟรม · 1024 x 1024

ลูปหายใจสั้นๆ แทบไม่ขยับ · 3 fps · วนซ้ำ

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

Character: "Fang Hound" — a rank-and-file enemy that appears in large numbers; race: beast, light element.
Body type: a four-legged beast with its back roughly at knee height of a man. Weapon: clawed gauntlets or natural claws.
Silhouette: Sleek pale hunting hound, head low, ears back.
Details: Cream-white short fur with light tan markings, black nose, amber eyes, lean visible ribs.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #e0d8c4, accent/trim #b8a05a, skin or fur #f0e8d4, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 44 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 2-frame idle animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, 2 equal columns side by side (each cell 512 x 1024). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Idle: a small breathing loop, almost still.
Frame breakdown:
  Frame 1: weight on both feet, breathing in, the body 1 px higher
  Frame 2: breathing out, the body 1 px lower, shoulders dropped slightly
The last frame must lead cleanly back into the first frame (seamless loop).
Do not draw dividing lines, labels, numbers or motion-blur streaks between the cells.
```

### PROMPT 4 — `walk` (เดิน) · 4 เฟรม · 1024 x 1024

ลูปเดินที่ต่อกลับเฟรมแรกได้เนียน · 8 fps · วนซ้ำ

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

Character: "Fang Hound" — a rank-and-file enemy that appears in large numbers; race: beast, light element.
Body type: a four-legged beast with its back roughly at knee height of a man. Weapon: clawed gauntlets or natural claws.
Silhouette: Sleek pale hunting hound, head low, ears back.
Details: Cream-white short fur with light tan markings, black nose, amber eyes, lean visible ribs.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #e0d8c4, accent/trim #b8a05a, skin or fur #f0e8d4, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 44 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 4-frame walk animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, a 2 x 2 grid read left-to-right then top-to-bottom (each cell 512 x 512). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Walk cycle: a natural repeating walk. Legs alternate, arms counter-swing, body rises at mid-step.
Frame breakdown:
  Frame 1: contact pose: leading leg forward and planted, opposite arm swung forward
  Frame 2: passing pose: legs together, the whole body at its highest point
  Frame 3: contact pose mirrored: the other leg forward, the other arm swung forward
  Frame 4: passing pose again, the body at its highest point
The last frame must lead cleanly back into the first frame (seamless loop).
Do not draw dividing lines, labels, numbers or motion-blur streaks between the cells.
```

### PROMPT 5 — `attack` (โจมตี) · 3 เฟรม · 1024 x 1024

เงื้อ → ปะทะ → ตามน้ำหนัก · 11 fps · เล่นครั้งเดียว

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

Character: "Fang Hound" — a rank-and-file enemy that appears in large numbers; race: beast, light element.
Body type: a four-legged beast with its back roughly at knee height of a man. Weapon: clawed gauntlets or natural claws.
Silhouette: Sleek pale hunting hound, head low, ears back.
Details: Cream-white short fur with light tan markings, black nose, amber eyes, lean visible ribs.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #e0d8c4, accent/trim #b8a05a, skin or fur #f0e8d4, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 44 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 3-frame attack animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, a 2 x 2 grid read left-to-right then top-to-bottom, leaving the bottom-right cell completely empty (each cell 512 x 512). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Attack action: Springs and bites.
Frame breakdown:
  Frame 1: wind-up: weight shifted back, the weapon or claws drawn back to their limit
  Frame 2: impact: the strongest frame, the body driven forward, the weapon at the point of contact
  Frame 3: follow-through: the momentum carried all the way through, just before returning to the idle stance
This animation plays once and does not loop.
Do not draw dividing lines, labels, numbers or motion-blur streaks between the cells.
```

### PROMPT 6 — `death` (ตาย) · 3 เฟรม · 1024 x 1024

สะดุ้ง → ทรุด → ล้มนิ่ง · 7 fps · เล่นครั้งเดียว

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

Character: "Fang Hound" — a rank-and-file enemy that appears in large numbers; race: beast, light element.
Body type: a four-legged beast with its back roughly at knee height of a man. Weapon: clawed gauntlets or natural claws.
Silhouette: Sleek pale hunting hound, head low, ears back.
Details: Cream-white short fur with light tan markings, black nose, amber eyes, lean visible ribs.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #e0d8c4, accent/trim #b8a05a, skin or fur #f0e8d4, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 44 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 3-frame death animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, a 2 x 2 grid read left-to-right then top-to-bottom, leaving the bottom-right cell completely empty (each cell 512 x 512). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Death action: Rolls onto its side and stretches out.
Frame breakdown:
  Frame 1: flinching from the killing blow, off balance, head snapped back
  Frame 2: halfway down, collapsing, the weapon already falling free
  Frame 3: fully down on the ground and motionless (the game fades it out afterwards)
This animation plays once and does not loop.
Do not draw dividing lines, labels, numbers or motion-blur streaks between the cells.
```

---

## PROMPT 7 — เฟรมเดี่ยว (ไว้ซ่อมเฉพาะเฟรมที่ออกมาไม่ดี)

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

Character: "Fang Hound" — a rank-and-file enemy that appears in large numbers; race: beast, light element.
Body type: a four-legged beast with its back roughly at knee height of a man. Weapon: clawed gauntlets or natural claws.
Silhouette: Sleek pale hunting hound, head low, ears back.
Details: Cream-white short fur with light tan markings, black nose, amber eyes, lean visible ribs.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #e0d8c4, accent/trim #b8a05a, skin or fur #f0e8d4, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 44 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: ONE single frame, canvas 1024 x 1024, the character alone and centred.
View: {ใส่ประโยคทิศจากตารางด้านบน}.
Pose: {อธิบายท่าเฟรมนั้น เช่น "mid-stride, right leg forward, arms counter-swinging"}.
Match the reference image exactly in costume, colour and proportion — this frame replaces one cell of an existing strip.
```

## Negative prompt (ใส่ทุกครั้งถ้าเครื่องมือรองรับ)

```text
photorealistic, 3d render, octane, unreal engine, blurry, soft focus, depth of field, painterly brush texture, watercolour, gradient background, sky, scenery, landscape, floor, ground, grass, platform, pedestal, base, ground shadow, cast shadow, drop shadow, text, letters, numbers, watermark, signature, logo, ui elements, health bar, frame, border, panel, multiple characters, crowd, duplicate character, extra limbs, extra heads, deformed hands, cropped body, cut off feet, cut off head, character touching the frame edge, anti-aliased halo, semi-transparent edge pixels, jpeg artifacts, low contrast outline, muddy colours
```

---

## ไฟล์ที่ต้องได้ครบ 60 ไฟล์

วางไว้ที่ `art/src/fang_hound/` ขนาดไฟล์ละ **96×128 px, PNG-32 พื้นหลังโปร่งใส**

```
idle_0_0.png
idle_0_1.png
idle_1_0.png
idle_1_1.png
idle_2_0.png
idle_2_1.png
idle_3_0.png
idle_3_1.png
idle_4_0.png
idle_4_1.png
walk_0_0.png
walk_0_1.png
walk_0_2.png
walk_0_3.png
walk_1_0.png
walk_1_1.png
walk_1_2.png
walk_1_3.png
walk_2_0.png
walk_2_1.png
walk_2_2.png
walk_2_3.png
walk_3_0.png
walk_3_1.png
walk_3_2.png
walk_3_3.png
walk_4_0.png
walk_4_1.png
walk_4_2.png
walk_4_3.png
attack_0_0.png
attack_0_1.png
attack_0_2.png
attack_1_0.png
attack_1_1.png
attack_1_2.png
attack_2_0.png
attack_2_1.png
attack_2_2.png
attack_3_0.png
attack_3_1.png
attack_3_2.png
attack_4_0.png
attack_4_1.png
attack_4_2.png
death_0_0.png
death_0_1.png
death_0_2.png
death_1_0.png
death_1_1.png
death_1_2.png
death_2_0.png
death_2_1.png
death_2_2.png
death_3_0.png
death_3_1.png
death_3_2.png
death_4_0.png
death_4_1.png
death_4_2.png
```

ตรวจด้วย `npm run pack-sprites` — ขาดไฟล์ไหนหรือขนาดผิด มันจะบอกชื่อไฟล์ให้
