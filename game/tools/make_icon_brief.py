"""Builds the art brief for the five skill icons that are still blank in the hotbar
(R whirl, F lion, 1 cross, 2 banner, 3 dragon) plus a dodge icon for later.

Run from game/: python3 tools/make_icon_brief.py art/_brief_icons fonts/Kanit-Medium.ttf
Import the result with tools/import_sprites.py (it slices icons_skills_2.png).
"""
import os
import shutil
import sys

from PIL import Image, ImageDraw, ImageFont

OUT, FONT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
for sub in ("prompts", "templates"):
    os.makedirs(os.path.join(OUT, sub), exist_ok=True)

PROMPT = """OUTPUT FILE NAME: icons_skills_2.png
ATTACH WITH THIS PROMPT: style_reference_icons.png AND templates/template_icons_3x2.png
AND warden_concept.png (for colours only)

Create a sheet of 6 skill icons for a fantasy action RPG. They join three icons that
already exist in the game, shown in the attached style_reference_icons.png (sword slash, blade
wave, shield). The new icons MUST look like the same set: same painting style, same detail
level, same glow, same edge-to-edge square framing, same lighting from the top-left.

LAYOUT:
- Landscape canvas, aspect ratio 3:2 (1536x1024). A grid of 3 columns x 2 rows = 6 equal
  square icons. The attached template shows the cells; use it ONLY for placement, do not copy
  its lines or labels.
- Each icon fills its whole cell edge to edge. No frames, no borders, no gaps between icons,
  no text, no numbers, no key letters.

ICONS, left to right, top row first:
1. Blade Storm: a silver-and-gold longsword spinning flat in a circle, leaving bright white
   ring trails and sparks, on a dark steel-blue background.
2. Golden Lion: a roaring lion head made of golden fire bursting out of a silver kite shield,
   on a deep crimson background.
3. Holy Cross Strike: a knight's sword plunging down, a huge white-gold cross of light
   flaring where it strikes, on a dark royal-purple background.
4. Sacred Banner: a royal-blue war banner with a gold lion emblem planted in the ground,
   golden light rays radiating from it, on a deep emerald-green background.
5. Golden Dragon God: the head and coiled neck of a majestic golden eastern dragon roaring
   upward, wreathed in golden-white holy flame, on a deep midnight-blue background. This is
   the ultimate skill: make it the most dazzling icon of the set.
6. Dodge: a silver armoured boot mid-step with three motion streaks of blue-white light behind
   it, on a dark slate background.

STYLE:
- Bright, saturated, glossy hand-painted game icons exactly like the reference: bold shapes
  that read clearly at 64x64 pixels, strong contrast, glowing light streaks and sparks. One clear subject per icon, centred, nothing tiny.
- Silver, gold and royal blue for the knight's things; each icon keeps its own background
  colour so the six are easy to tell apart.
- NOT pixel art, NOT a 3D render, NOT a photo. No watermark.
- Output: PNG.
"""

START = """# Ashen Crown - 6 skill icons

You are making one image: a 3x2 sheet of skill icons for a fantasy action RPG.
Read prompts/01_icons_skills_2.txt and follow it exactly. Attach these files to the request:
style_reference_icons.png, templates/template_icons_3x2.png and warden_concept.png.

The most important rule: the six new icons must look like the same set as the three existing
icons in style_reference_icons.png. If a result looks like a different artist, try again.

Make the image, show it to the owner and wait. If the owner points out a problem, make it again.
"""

README = """# ชุดคำสั่งวาดไอคอนสกิล Ashen Crown (6 ไอคอน)

ในแถบสกิลตอนนี้ ช่อง R, F, 1, 2, 3 ยังเป็นช่องสีเปล่า ชุดนี้ใช้สั่ง ChatGPT วาดไอคอนให้ครบ
ได้ภาพเดียว 6 ไอคอนเรียงเป็นตาราง 3×2 ส่งไฟล์ PNG กลับมาได้เลย ไม่ต้องตัดเอง ผมตัดให้

| ช่อง | ปุ่ม | สกิล |
|---|---|---|
| 1 | R | พายุดาบ (หมุนดาบ) |
| 2 | F | สิงห์ทอง |
| 3 | 1 | กางเขนศักดิ์สิทธิ์ |
| 4 | 2 | ธงศักดิ์สิทธิ์ |
| 5 | 3 | เทพมังกรทอง (ท่าไม้ตาย ให้ดูอลังการที่สุด) |
| 6 | Shift | หลบ (ยังไม่ได้ใช้ตอนนี้ เก็บไว้ทำปุ่มหลบบนมือถือ) |

## วิธีใช้

1. เปิด**แชทใหม่**ใน ChatGPT แล้วอัปโหลดไฟล์ zip นี้
2. พิมพ์ข้อความนี้:

   > แตกไฟล์ zip แล้วอ่าน 00_CHATGPT_START_HERE.md แล้วสร้างภาพตามนั้น

3. ถ้า ChatGPT อ่าน zip ไม่ได้: เปิด `prompts/01_icons_skills_2.txt` คัดลอกข้อความทั้งหมดไปวาง
   แล้วแนบ 3 ภาพนี้ไปด้วย: `style_reference_icons.png`, `templates/template_icons_3x2.png`,
   `warden_concept.png`
4. ได้ภาพแล้ว ตั้งชื่อไฟล์ว่า `icons_skills_2.png` แล้วส่งมาให้ผม

## เช็กลิสต์ก่อนส่ง

- [ ] ภาพแนวนอน มี 6 ไอคอน เรียง 3 ช่อง × 2 แถว เต็มช่อง ไม่มีขอบหรือช่องว่างคั่น
- [ ] ลายเส้นและแสงดูเป็นชุดเดียวกับ 3 ไอคอนเดิมใน `style_reference_icons.png`
- [ ] ไม่มีตัวหนังสือ ตัวเลข หรือตัวอักษรปุ่ม
- [ ] ย่อดูเล็กๆ แล้วยังบอกได้ว่าเป็นอะไร และสีพื้นของแต่ละไอคอนไม่ซ้ำกัน
- [ ] ไอคอนช่องที่ 5 (มังกรทอง) ดูเด่นที่สุด

ถ้าไม่ผ่าน บอก ChatGPT ว่าผิดตรงไหนแล้วให้สร้างใหม่
"""

with open(os.path.join(OUT, "prompts", "01_icons_skills_2.txt"), "w", encoding="utf-8") as f:
    f.write(PROMPT.strip() + "\n")
with open(os.path.join(OUT, "00_CHATGPT_START_HERE.md"), "w", encoding="utf-8") as f:
    f.write(START.strip() + "\n")
with open(os.path.join(OUT, "README_TH.md"), "w", encoding="utf-8") as f:
    f.write(README.strip() + "\n")
open(os.path.join(OUT, ".gdignore"), "w").close()

font = ImageFont.truetype(FONT, 40)

# The three finished icons, so the new ones match their style.
ref = Image.new("RGB", (3 * 256 + 4 * 24, 256 + 48), (24, 24, 28))
for i, name in enumerate(["attack", "wave", "aegis"]):
    icon = Image.open(os.path.join(GAME, "art", "ui", "skills", f"{name}.png")).convert("RGB")
    ref.paste(icon.resize((256, 256), Image.LANCZOS), (24 + i * 280, 24))
ref.save(os.path.join(OUT, "style_reference_icons.png"))

img = Image.new("RGB", (1536, 1024), "white")
d = ImageDraw.Draw(img)
for i in range(6):
    r, c = divmod(i, 3)
    d.rectangle([c * 512, r * 512, c * 512 + 511, r * 512 + 511], outline=(200, 60, 60), width=3)
    d.text((c * 512 + 16, r * 512 + 12), f"ICON {i + 1}", font=font, fill=(40, 40, 40))
img.save(os.path.join(OUT, "templates", "template_icons_3x2.png"))

concept = os.path.join(GAME, "art", "_brief_knight", "warden_concept.png")
if os.path.exists(concept):
    shutil.copy(concept, os.path.join(OUT, "warden_concept.png"))
print("ok")
