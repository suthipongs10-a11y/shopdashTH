# ปืนรัวรูน — `repeater`

> เครื่องยิงขั้น 2 · ธาตุแสง

| หัวข้อ | ค่า |
|---|---|
| ชนิดร่าง | `cannon` · อาวุธ `none` · scale 1.05 |
| ความสูงในเฟรม | ~40 px จากเฟรม 96×128 (เท้าอยู่ที่ y=120) |
| พาเลตต์ | หลัก `#5d6b7a` · ตัดขอบ `#9ee3f2` · ผิว/ขน `#7d8b9a` |
| ผังภาพ | ตัวนี้กว้าง/ใหญ่ → ใช้ผังแบบตาราง 1024×1024 (ช่องแถวเดียวจะแคบเกินไป) |
| จำนวนไฟล์ | 60 ไฟล์ (12 เฟรม × 5 ทิศ) → `art/src/repeater/` |

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

Character: "Repeater" — a tier-2 defensive turret emplacement built by the player, an inanimate machine with no crew.
Body type: a static gun emplacement on a metal mount, no crew figure. Weapon: no weapon in hand.
Silhouette: Compact three-barrel gun on a swivel mount, barrels stacked in a triangle.
Details: Gunmetal grey housing with bright cyan rune inlays along the barrels, brass fittings, a small rune core glowing between the barrels.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #5d6b7a, accent/trim #9ee3f2, skin or fur #7d8b9a, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 40 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

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

Character: "Repeater" — a tier-2 defensive turret emplacement built by the player, an inanimate machine with no crew.
Body type: a static gun emplacement on a metal mount, no crew figure. Weapon: no weapon in hand.
Silhouette: Compact three-barrel gun on a swivel mount, barrels stacked in a triangle.
Details: Gunmetal grey housing with bright cyan rune inlays along the barrels, brass fittings, a small rune core glowing between the barrels.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #5d6b7a, accent/trim #9ee3f2, skin or fur #7d8b9a, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 40 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

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

Character: "Repeater" — a tier-2 defensive turret emplacement built by the player, an inanimate machine with no crew.
Body type: a static gun emplacement on a metal mount, no crew figure. Weapon: no weapon in hand.
Silhouette: Compact three-barrel gun on a swivel mount, barrels stacked in a triangle.
Details: Gunmetal grey housing with bright cyan rune inlays along the barrels, brass fittings, a small rune core glowing between the barrels.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #5d6b7a, accent/trim #9ee3f2, skin or fur #7d8b9a, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 40 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 2-frame idle animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, 2 equal columns side by side (each cell 512 x 1024). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Idle: a small breathing loop, almost still.
Frame breakdown:
  Frame 1: at rest, fully loaded and ready
  Frame 2: a barely visible settle, everything 1 px lower
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

Character: "Repeater" — a tier-2 defensive turret emplacement built by the player, an inanimate machine with no crew.
Body type: a static gun emplacement on a metal mount, no crew figure. Weapon: no weapon in hand.
Silhouette: Compact three-barrel gun on a swivel mount, barrels stacked in a triangle.
Details: Gunmetal grey housing with bright cyan rune inlays along the barrels, brass fittings, a small rune core glowing between the barrels.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #5d6b7a, accent/trim #9ee3f2, skin or fur #7d8b9a, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 40 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 4-frame walk animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, a 2 x 2 grid read left-to-right then top-to-bottom (each cell 512 x 512). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Walk cycle: a natural repeating walk. This is a machine that does not walk — instead show a very small idle settle/recoil sway so the frames still loop.
Frame breakdown:
  Frame 1: at rest
  Frame 2: a 1 px settle downward
  Frame 3: back at rest
  Frame 4: a 1 px lean the other way — this machine does not walk, it only idles
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

Character: "Repeater" — a tier-2 defensive turret emplacement built by the player, an inanimate machine with no crew.
Body type: a static gun emplacement on a metal mount, no crew figure. Weapon: no weapon in hand.
Silhouette: Compact three-barrel gun on a swivel mount, barrels stacked in a triangle.
Details: Gunmetal grey housing with bright cyan rune inlays along the barrels, brass fittings, a small rune core glowing between the barrels.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #5d6b7a, accent/trim #9ee3f2, skin or fur #7d8b9a, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 40 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 3-frame attack animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, a 2 x 2 grid read left-to-right then top-to-bottom, leaving the bottom-right cell completely empty (each cell 512 x 512). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Attack action: Muzzle flashes travel from barrel to barrel in a fast burst.
Frame breakdown:
  Frame 1: charging or loading, the moving part drawn back to its limit
  Frame 2: the firing frame: muzzle flash or the arm released, the strongest and brightest frame
  Frame 3: recoil settling back toward the rest position, smoke curling off
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

Character: "Repeater" — a tier-2 defensive turret emplacement built by the player, an inanimate machine with no crew.
Body type: a static gun emplacement on a metal mount, no crew figure. Weapon: no weapon in hand.
Silhouette: Compact three-barrel gun on a swivel mount, barrels stacked in a triangle.
Details: Gunmetal grey housing with bright cyan rune inlays along the barrels, brass fittings, a small rune core glowing between the barrels.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #5d6b7a, accent/trim #9ee3f2, skin or fur #7d8b9a, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 40 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

Task: a 3-frame death animation strip of this character, ALL frames seen facing the camera in full front view, both eyes visible, chest square to the viewer.
Canvas 1024 x 1024, a 2 x 2 grid read left-to-right then top-to-bottom, leaving the bottom-right cell completely empty (each cell 512 x 512). Every cell shows the same character at the same scale with the lowest point of the character (feet, base or trailing mist) on one shared baseline; only the pose changes between cells.
Death action: Barrels split apart and the cyan core dims out.
Frame breakdown:
  Frame 1: the first failure: a crack opens and sparks fly, the frame still upright
  Frame 2: the structure breaking apart, pieces separating and falling
  Frame 3: a collapsed wreck resting on the ground, no longer recognisable as working
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

Character: "Repeater" — a tier-2 defensive turret emplacement built by the player, an inanimate machine with no crew.
Body type: a static gun emplacement on a metal mount, no crew figure. Weapon: no weapon in hand.
Silhouette: Compact three-barrel gun on a swivel mount, barrels stacked in a triangle.
Details: Gunmetal grey housing with bright cyan rune inlays along the barrels, brass fittings, a small rune core glowing between the barrels.
Element cue: holy light motif — a warm gold glow on the upper surfaces — keep it subtle, it must not break the silhouette.
Palette anchors (use these exact hex values as the dominant colours): primary #5d6b7a, accent/trim #9ee3f2, skin or fur #7d8b9a, outline #181222, rim light #7fd4e8.
Proportion: the character must fill about 40 px of a 96x128 frame, with its lowest point (feet, base or trailing mist) resting on the baseline and empty space above the head.

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

วางไว้ที่ `art/src/repeater/` ขนาดไฟล์ละ **96×128 px, PNG-32 พื้นหลังโปร่งใส**

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
