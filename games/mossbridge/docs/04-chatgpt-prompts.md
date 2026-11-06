# 04 — คู่มือสั่งภาพกับ ChatGPT (Prompt Pack)

> prompt เขียนเป็นภาษาอังกฤษเพราะโมเดลภาพเข้าใจรายละเอียดเชิงเทคนิคได้แม่นกว่า คำอธิบายเป็นภาษาไทย
> ข้อความใน `{...}` คือช่องให้เปลี่ยน

---

## 0. ขั้นตอนทำงาน (ทำแบบนี้ทุกชิ้น)

1. **แยกแชทตามตระกูลภาพ** เช่น แชท "Heads & Hair", แชท "Headgear", แชท "Monsters" (โมเดลจำสไตล์ในแชทเดียวกันได้ดีกว่า)
2. ข้อความแรกของแชท: วาง **Style Block (§1)** + แนบภาพ reference 2 ไฟล์: `art/reference/03_sprite_atlas_original.png` และ `art/samples/hero_se.png`
3. สั่งทีละชีต ใช้ template §2–§9 ตรวจด้วยตาก่อน ถ้าผิดกฎใน `02-art-style-guide.md §9` ให้สั่งแก้ด้วย §10 อย่ารับมาแก้เอง
4. ดาวน์โหลด PNG → ใส่ `art/raw/`
5. ล้าง+ตัด+จัดแคนวาส:
   ```bash
   python3 tools/sprite_clean.py art/raw/hat_witch.png -o art/out/hat_witch \
       --key "#00FF00" --names front,back --canvas 256x256 --anchor 128,200 --fit none
   ```
6. เปิด `prototype/headgear-lab/index.html` → "ใช้รูปของคุณ" → อัปโหลด → จูน Fit → Export JSON
7. commit ภาพ + JSON คู่กัน

### เลือกสีพื้นหลัง (chroma key)
| ชิ้นงานมีสีหลักเป็น | ใช้พื้น | ตัวเลือกเครื่องมือ |
|---|---|---|
| ทั่วไป, เขียว, ฟ้า, น้ำตาล | ชมพูบานเย็น `#FF00FF` | `--key "#FF00FF"` (ค่าเริ่มต้น) |
| ม่วง, ชมพู, แดง | เขียวสด `#00FF00` | `--key "#00FF00"` |

> ChatGPT สั่ง "transparent background" ได้ แต่ขอบที่ได้มักสกปรก (เหมือนไฟล์ atlas ที่แนบมา) พื้นสีเดียวล้างได้สะอาดกว่า
> ถ้าได้ภาพพื้นใสมาแล้วก็ใช้ได้ เครื่องมือจะล้าง alpha ให้ (ไม่ต้องใส่ `--key`)

---

## 1. STYLE BLOCK (วางทุกแชท / ต่อท้ายทุก prompt ได้)

```
STYLE: "Mossbridge" cozy high-fantasy MMORPG art. Chibi hand-painted 2D game sprite,
2.5-heads-tall proportions, big expressive eyes, chunky readable silhouette.
Soft cel shading with subtle painterly brush texture, colored darker outline (not black), 3-4 px.
Lighting: warm golden-hour key light from TOP-FRONT (above the camera), symmetric, purple-blue shadows,
thin warm rim light. Palette: banner teal #297465, moss green #5C7643, warm oak #874B27,
lantern amber #D38046, cobble peach #E2B19A, parchment #F2D09B.
Camera: 3/4 top-down view (~45° looking down), ORTHOGRAPHIC, no perspective distortion.
RULES: flat solid {#FF00FF} background, no gradient, no floor, no cast shadow on the ground,
no glow or sparkles outside the object, no text, no watermark, no frame.
Match the style of the attached reference sprites exactly.
```

---

## 2. หัวโล้นแม่แบบ (ทำครั้งเดียว — ทุกหมวกจะอ้างอิงภาพนี้)

```
{STYLE BLOCK}
Create a 2-view turnaround sheet of a BALD chibi character HEAD ONLY (no hair, no body, neck stump only),
neutral friendly expression, skin tone {light warm}.
Left: FRONT view, three-quarter facing down-right (SE). Right: BACK view, three-quarter facing up-right (NE),
back of the bald head, ear visible.
Both heads exactly the same size and height, centered in two equal halves of the image, large gap between them.
Image 1536x1024.
```
หลังล้างภาพ: ตั้งชื่อ `face/light/front.png`, `back.png` แล้วใช้ภาพนี้แนบทุกครั้งที่สั่งผม/หมวก

## 3. ทรงผม (full + capped)

```
{STYLE BLOCK}
Using the attached bald head as the exact base (same angle, same size), design hairstyle "{spiky windswept}".
Paint the hair in LIGHT NEUTRAL GRAY with soft gray shading only (it will be recolored in-game).
Make a 2x2 sheet:
  top-left: FRONT view (SE) full hairstyle on the head,
  top-right: BACK view (NE) full hairstyle on the head,
  bottom-left: FRONT view "capped" version: the same hairstyle flattened so nothing rises above
               the top of the skull (as if pressed down by a hat), only side locks and short bangs remain,
  bottom-right: BACK view capped version.
Keep the face and skull identical in all four. Large gaps between cells. Image 1024x1024.
```
> ทางลัด: ถ้าแยกผมออกจากหน้ายากเกินไป ให้ใช้ภาพ "หัว+ผม" รวมเป็นชิ้นเดียว (แบบ RO) แต่จะย้อมสีผมด้วย tint ไม่ได้ ต้องสั่งทีละสี

## 4. หมวกช่องบน (head_top)

```
{STYLE BLOCK}
Headgear item for the attached bald head template: "{purple witch hat with wide floppy brim,
brass band and a small violet gem}".
Show ONLY THE HAT, no head, no hair, no face, floating, in two views:
  left = how it looks worn on the head in FRONT view (three-quarter, facing down-right),
  right = how it looks worn in BACK view (three-quarter, facing up-right, gem not visible).
Size the hat to fit the template head exactly (inner rim width = head width at forehead).
Same scale in both views, centered in each half, big empty gap between. Background {#00FF00}. Image 1536x1024.
```
เกณฑ์ `hair` ที่ต้องกรอกใน JSON:
- ครอบยอดหัว (หมวกแม่มด ไหมพรม หมวกปีก) → `capped`
- วางบนผม (มงกุฎ หูแมว ดอกไม้) → `full`
- ครอบทั้งหัว (หมวกเกราะ ฮู้ด) → `hidden`

## 5. ช่องกลาง/ล่าง (แว่น, หน้ากาก)

```
{STYLE BLOCK}
Face accessory for the attached bald head template: "{brass aviator goggles with teal lenses and leather strap}".
Show ONLY the accessory in two views: FRONT (SE three-quarter, worn at eye level) and BACK
(NE three-quarter, only the strap/buckle visible at the back of the head).
Same scale, centered, big gap. Image 1536x1024.
```
ถ้าด้านหลังมองไม่เห็นเลย (แว่นกลม, หนวด) ไม่ต้องสั่ง back ใช้ภาพว่าง

## 6. ชุดลำตัวแบบแยกชิ้น (body parts sheet)

```
{STYLE BLOCK}
Character costume parts sheet for a paper-doll cutout rig: "{novice adventurer, teal leather armor with
brass trim, scarf, brown belt and pouch}". HEADLESS (neck collar only). Separate pieces, not attached,
generous spacing, arranged in two rows:
Row 1 (FRONT view, three-quarter facing down-right): torso with shoulder pads (no arms),
      front arm (shoulder to hand, relaxed), back arm, one leg with boot.
Row 2 (BACK view, three-quarter facing up-right): torso back with backpack, front arm, back arm, one leg.
All pieces at the same scale as a character 2.5 heads tall. Image 1536x1024.
```
ประกอบใน lab/เกมตาม pivot §03-4 ถ้าชิ้นเบี้ยว ให้สั่งใหม่ทีละแถว

## 7. NPC ตัวเต็ม / มอนสเตอร์

```
{STYLE BLOCK}
Full-body game sprite of {Bram the cheerful dwarf blacksmith, hammer on shoulder, goggles on forehead}.
Two views side by side: FRONT three-quarter (facing down-right) and BACK three-quarter (facing up-right).
Same character, same outfit details, same height, feet on the same baseline, big gap. Image 1536x1024.
```
มอนสเตอร์ใหญ่ที่จะทำ cutout: เพิ่มบรรทัด
`Also provide a second sheet with the parts separated: body, head, 4 legs, tail, same view.`
และ **ห้ามมีแสงเรืองที่งา/ตา** (ทำเป็น effect ทีหลัง) → `no emissive glow`

## 8. แผนที่และพร็อพ

แผนที่ (ภาพพื้น):
```
{STYLE BLOCK minus the background rule}
Top-down 3/4 ORTHOGRAPHIC game map background, {small riverside town square with cobblestone plaza,
a stone arch bridge over a turquoise brook, market stalls}. Strictly no perspective: objects far away are the
same size as near ones, all vertical lines perfectly vertical. Even lighting across the whole image,
no characters, no UI, no vignette. Walkable paths at least 3 character-widths wide. Image 1536x1024.
```
พร็อพ (ใช้ซ้ำได้):
```
{STYLE BLOCK}
Prop sheet, same 3/4 orthographic camera: {market stall with striped awning, wooden barrel, crate of apples,
street lantern, notice board, flower pot}. Each object separate with big gaps, bottom of each object flat
on an invisible ground line. Image 1536x1024.
```
ชั้นบังตัวละคร (หลังคา ราวสะพาน ยอดไม้) ให้ตัดจากภาพพื้นเป็นไฟล์ `overlay` แยก

## 9. ไอคอนไอเท็มและ effect

```
{STYLE BLOCK}
Inventory icon set, 4x4 grid, each icon centered in its cell, slight dynamic angle, thick readable shapes:
{refined copper ore, health potion red, mana potion blue, witch hat, brass goggles, mossback tusk, ...}.
Image 1024x1024.
```
```
{STYLE BLOCK} Background: solid black #000000 (will be drawn with additive blending).
Skill effect animation sheet, 8 frames in a 4x2 grid, {teal water slash arc}, frames progress left-to-right,
top-to-bottom: anticipation, burst, fade. Same center point in every frame. Image 1024x512.
```
(effect ใช้พื้นดำ ไม่ต้องล้าง — เกมวาดแบบ additive)

## 10. คำสั่งแก้ภาพที่ใช้บ่อย

| ปัญหา | พิมพ์ต่อในแชทเดิม |
|---|---|
| มุมไม่ตรง | `Same exact design, but rotate to three-quarter BACK view facing up-right. Keep size identical.` |
| ขนาดไม่เท่ากัน 2 ฝั่ง | `Make both views exactly the same scale and height.` |
| มีแสงฟุ้ง/ประกาย | `Remove all glow, sparkles and particles outside the object.` |
| พื้นหลังไม่เรียบ | `Background must be one flat solid {#FF00FF} color, no shadow on the ground.` |
| เปลี่ยนสไตล์ไปจาก ref | `Match the painting style of the first reference image more closely: softer shading, colored outline.` |
| ชิ้นติดกัน | `Add much more empty space between each piece; no overlapping.` |

---

## 11. ลำดับสั่งภาพที่แนะนำ (Asset Backlog รอบแรก)

| # | ชิ้น | จำนวนภาพ | ใช้ที่ milestone |
|---|---|---|---|
| 1 | หัวโล้นแม่แบบ 1 สีผิว | 2 | M1 |
| 2 | ทรงผม 3 ทรง (full+capped) | 3 × 4 | M1 |
| 3 | ชุดลำตัว novice ชาย/หญิง | 2 ชีต | M1 |
| 4 | หมวกช่องบน 6 ใบ | 6 × 2 | M1 |
| 5 | แว่น 2 / หน้ากาก 2 | 4 × 1–2 | M1 |
| 6 | แผนที่เมือง Mossbridge + พร็อพ | 1 + 1 ชีต | M2 |
| 7 | มอนสเตอร์ สไลม์ต้นอ่อน, หมูป่ามอส (บอส) | 2 | M2 |
| 8 | ไอคอน 16 ชิ้น | 1 ชีต | M3 |
| 9 | อาวุธ 3 ชนิด + effect 3 สกิล | ~6 | M3 |
