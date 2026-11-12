"""Builds the asset brief pack (prompts + layout templates).
Run from game/: python3 tools/make_brief.py art/_brief fonts/Kanit-Medium.ttf"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
FONT = sys.argv[2]
os.makedirs(os.path.join(OUT, "prompts"), exist_ok=True)
os.makedirs(os.path.join(OUT, "templates"), exist_ok=True)

STYLE = """STYLE (same for every asset in this project):
- Dark high-fantasy 2D game sprite, richly detailed hand-painted illustration, in the spirit of
  classic isometric fantasy MMORPGs from the 2000s. Mysterious, powerful and cool. NOT cute, NOT chibi.
- Heroic semi-realistic anime proportions: a human is about 5 heads tall, with long legs and a
  slim, athletic build. The head is small relative to the body.
- Deep, rich colours with glowing accents (violet, gold, ember orange) against darker metals and
  fabrics. Strong rim light that separates the figure from any background.
- Thin dark outline, painterly shading with crisp highlights on metal.
- Light comes from the top-left.
- NOT pixel art, NOT a 3D render, NOT a photo.
- Camera: three-quarter top-down view, pitched about 35-40 degrees downward, like a classic isometric MMORPG."""

DIRECTIONS = """ROWS = facing directions, top to bottom (5 rows):
- Row 1 FRONT: facing the viewer. We see the face and chest.
- Row 2 FRONT-LEFT: turned 45 degrees toward the left edge of the image. Three-quarter view of the face.
- Row 3 LEFT: full side profile, facing the left edge of the image.
- Row 4 BACK-LEFT: turned away from the viewer, facing up-left. Three-quarter view of the back.
- Row 5 BACK: facing directly away from the viewer. We see the back only.
(The game mirrors these rows to get the right-facing directions, so do not draw right-facing rows.)"""

SHEET_RULES = """LAYOUT:
- Portrait canvas, aspect ratio 2:3 (1024x1536, or larger at the same ratio).
- A grid of 4 columns x 5 rows = 20 equal cells. No gaps, no margins.
- COLUMNS = animation frames 1 to 4, left to right.
{directions}
- The attached template_sheet_5x4.png shows this layout. Use it ONLY to place the poses.
  Do NOT copy its grid lines, labels, arrows, ovals or white background into the result.

HARD RULES:
- Exactly 20 poses, one per cell. Never leave a cell empty, never merge cells.
- The character is the same size in every cell: about {fill}% of the cell height.
- Feet rest on the same baseline in every cell, about 10% above the bottom edge of the cell.
- The character is centred horizontally in its cell. Nothing may cross into a neighbouring cell,
  including weapons, capes, wings and tails.
- Identical design, colours and proportions in all 20 poses. Match the attached concept image exactly.
- Background: fully transparent. If transparency is not possible, use one flat pure green (#00FF00)
  with no gradient, and do not use that green anywhere on the character.
- No ground shadow, no floor, no scenery.
- No motion trails, no slash arcs, no sparks or spell effects (the game draws those itself).
  Glow that belongs to the character itself (energy wings, eyes, magma cracks, a glowing blade edge)
  is part of the design and must be drawn.
- No text, numbers, labels, borders, grid lines or watermark.
- Output: PNG."""

CONCEPT_RULES = """LAYOUT:
- Landscape canvas, aspect ratio 3:2 (1536x1024, or larger at the same ratio).
- One row of 5 full-body views of the SAME character, evenly spaced, same size, standing in a
  relaxed ready pose, left to right:
  1 FRONT (facing the viewer), 2 FRONT-LEFT (turned 45 degrees to the left),
  3 LEFT (side profile facing left), 4 BACK-LEFT (three-quarter back, facing up-left), 5 BACK.
- The attached template_turnaround.png shows this layout. Use it ONLY to place the views.
  Do NOT copy its lines, labels or white background into the result.

HARD RULES:
- Identical design, colours and proportions in all 5 views.
- Background: fully transparent. If transparency is not possible, use one flat pure green (#00FF00).
- No ground shadow, no scenery, no text, no labels, no watermark.
- Output: PNG."""

CHARS = {
    "warden": {
        "title": "the Warden (player character, a dark knight with glowing wings)",
        "desc": """CHARACTER - the Warden:
- A young male knight with a calm, cold, mysterious expression. Silver-white hair, swept back,
  falling to the neck. Pale violet glowing eyes. No helmet.
- Dark gunmetal plate armour with fine gold filigree, a high collar and layered pauldrons.
  Long tattered black-and-crimson cape. Dark leather gloves and armoured boots.
- Large wings on his back made of translucent violet energy shaped like long feathers, glowing
  brighter at the tips. The wings are part of the character and appear in every pose.
  Keep the wings folded slightly so they stay inside the cell.
- Right hand: a long straight sword with a black blade edged in faint blue light and a gold crossguard.
- Left arm: a dark kite shield with a gold lion-head emblem.""",
        "fill": 62,
        "anims": {
            "idle": ("idle stance, loops", """- Frame 1: ready stance, sword lowered diagonally, shield held in front, wings half folded.
- Frame 2: slight inhale, chest and wings rise a little, wing tips glow brighter.
- Frame 3: same as frame 1.
- Frame 4: slight exhale, wings lower a little, cape sways."""),
            "walk": ("walk cycle, loops", """- Frame 1: left foot forward (contact), sword arm swings back.
- Frame 2: legs passing under the body, body at its highest point.
- Frame 3: right foot forward (contact), mirror of frame 1.
- Frame 4: legs passing under the body again, body at its highest point.
A confident, steady stride. The cape and wings trail slightly behind the direction of travel."""),
            "attack": ("sword slash, plays once", """- Frame 1: wind-up, sword raised back over the shoulder, body twisted, wings spread wider.
- Frame 2: mid-swing, sword cutting horizontally across the front of the body.
- Frame 3: follow-through, sword fully extended to the far side, weight on the front foot.
- Frame 4: recover, returning to the ready stance.
The swing travels in the direction the character is facing in that row."""),
        },
    },
    "golem": {
        "title": "the Magma Golem (monster)",
        "desc": """CHARACTER - the Magma Golem:
- A towering, menacing golem, about 1.5 times as tall as a human knight, with a broad hunched torso.
- Body made of jagged black basalt plates. Bright molten magma glows through deep cracks and
  pools in a burning core in the chest.
- Small head sunk between massive shoulders, two burning orange eyes.
- Huge rock fists, thick legs. Heat haze and embers drift from the shoulders (part of the body).""",
        "fill": 72,
        "anims": {
            "walk": ("heavy walk cycle, loops", """- Frame 1: left foot forward, body leaning to the left, arms hanging low.
- Frame 2: both feet under the body, body upright.
- Frame 3: right foot forward, body leaning to the right.
- Frame 4: both feet under the body, body upright.
A slow, heavy, crushing stride."""),
            "attack": ("overhead fist smash, plays once", """- Frame 1: wind-up, both fists raised high above the head, magma core flaring.
- Frame 2: fists swinging down in front of the body.
- Frame 3: impact, fists on the ground in front of the feet, body bent forward.
- Frame 4: recover, straightening up.
The smash lands in the direction the golem is facing in that row."""),
        },
    },
    "imp": {
        "title": "the Cinder Fiend (monster)",
        "desc": """CHARACTER - the Cinder Fiend:
- A lean, hunched demon, a little shorter than a human. Menacing, not cute.
- Charcoal-black skin with glowing ember cracks, long curved horns, a narrow face with glowing
  orange eyes and sharp teeth.
- Long thin arms with hooked claws, ragged bat wings, a whip-like tail ending in a small flame.""",
        "fill": 62,
        "anims": {
            "walk": ("prowling walk cycle, loops", """- Frame 1: crouched low, left claw forward, wings folded.
- Frame 2: body rising, legs passing, wings half open.
- Frame 3: crouched low, right claw forward, mirror of frame 1.
- Frame 4: body rising again, wings half open.
A fast, predatory prowl. Keep the feet on the ground in every frame."""),
            "attack": ("claw slash, plays once", """- Frame 1: wind-up, one clawed arm pulled back, wings flared.
- Frame 2: lunge forward, claw slashing across.
- Frame 3: follow-through, arm fully extended, body leaning forward.
- Frame 4: recover to a crouch.
The slash goes in the direction the fiend is facing in that row."""),
        },
    },
}

ORDER = []


def write(name: str, text: str) -> None:
    with open(os.path.join(OUT, "prompts", name), "w", encoding="utf-8") as f:
        f.write(text.strip() + "\n")


num = 10
for key, c in CHARS.items():
    out_name = f"{key}_concept.png"
    write(f"{num}_{key}_concept.txt", f"""
OUTPUT FILE NAME: {out_name}
ATTACH WITH THIS PROMPT: templates/template_turnaround.png

Create a character turnaround sheet for a 2D game: {c['title']}.
This image becomes the design reference for every later sprite of this character.

{c['desc']}

{STYLE}

{CONCEPT_RULES}
""")
    ORDER.append((f"{num}_{key}_concept.txt", out_name, "concept"))
    n = num + 1
    for anim, (label, frames) in c["anims"].items():
        out_name = f"{key}_{anim}.png"
        rules = SHEET_RULES.format(directions=DIRECTIONS, fill=c["fill"])
        write(f"{n}_{key}_{anim}.txt", f"""
OUTPUT FILE NAME: {out_name}
ATTACH WITH THIS PROMPT: the approved {key}_concept.png AND templates/template_sheet_5x4.png

Create a 2D game sprite sheet of {c['title']}.

{c['desc']}
The design must match the attached {key}_concept.png exactly.

ANIMATION: {label}, 4 frames.
{frames}

{STYLE}

{rules}
""")
        ORDER.append((f"{n}_{key}_{anim}.txt", out_name, anim))
        n += 1
    num += 10

write("40_fx_lion_spirit.txt", """
OUTPUT FILE NAME: lion_spirit.png
ATTACH WITH THIS PROMPT: nothing

Create a visual effect image for a 2D action RPG: a golden lion spirit summoned by a knight's ultimate skill.

CONTENT:
- The head and mane of a majestic lion, roaring with its mouth wide open, seen from the front and
  slightly from below.
- The lion is made entirely of golden fire and light: the mane is a burst of flames, the face is
  glowing gold with white-hot highlights, the eyes burn white.
- Sparks and small embers around the mane. Bright, intense and powerful.

HARD RULES:
- Background: pure flat black (#000000) everywhere outside the lion. No gradient, no vignette,
  no ground, no scenery. (The game blends this image additively, so black becomes invisible.)
- The lion is centred and fills about 85% of the canvas. Nothing touches the canvas edges.
- No text, no border, no watermark.
- Square canvas, 1:1, at the largest resolution available (1024x1024 minimum).
- Output: PNG.
""")
ORDER.append(("40_fx_lion_spirit.txt", "lion_spirit.png", "fx"))

write("50_icons_skills.txt", """
OUTPUT FILE NAME: icons_skills.png
ATTACH WITH THIS PROMPT: the approved warden_concept.png (for colours only)

Create a sheet of 6 skill icons for a dark fantasy action RPG.

LAYOUT:
- Landscape canvas, aspect ratio 3:2 (1536x1024). A grid of 3 columns x 2 rows = 6 equal square icons.
- Each icon fills its whole cell edge to edge. No frames, no borders, no gaps, no text.

ICONS, left to right, top row then bottom row:
1. Sword Slash: a black longsword with a faint blue edge cutting diagonally, on a dark slate background.
2. Triple Blade Wave: three crescents of blue light flying forward in a fan, on a deep navy background.
3. Aegis: a translucent glowing bubble shield with a gold lion emblem at its centre, on a dark teal background.
4. Blade Storm: a sword spinning in a circle leaving white ring trails, on a dark steel-blue background.
5. Golden Lion Roar: a roaring lion head made of golden fire, on a deep crimson background.
6. Healing Potion: a round glass bottle of glowing red liquid with a cork, on a dark background.

STYLE:
- Hand-painted dark fantasy game icons, bold shapes that read clearly at 64x64 pixels, strong
  contrast, glowing accents. Same painting style and lighting (from the top-left) for all six.
- Output: PNG.
""")
ORDER.append(("50_icons_skills.txt", "icons_skills.png", "icons"))

# ---------------------------------------------------------------- templates
font = ImageFont.truetype(FONT, 20)
small = ImageFont.truetype(FONT, 15)

W, H, COLS, ROWS = 1024, 1536, 4, 5
cw, ch = W // COLS, H / ROWS
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)
names = ["ROW 1 FRONT", "ROW 2 FRONT-LEFT", "ROW 3 LEFT", "ROW 4 BACK-LEFT", "ROW 5 BACK"]
arrows = [(0, 1), (-0.7, 0.7), (-1, 0), (-0.7, -0.7), (0, -1)]
for r in range(ROWS):
    for c in range(COLS):
        x0, y0 = c * cw, int(r * ch)
        x1, y1 = x0 + cw, int((r + 1) * ch)
        d.rectangle([x0, y0, x1 - 1, y1 - 1], outline=(200, 60, 60), width=2)
        base = y1 - int(ch * 0.1)
        cx = x0 + cw // 2
        d.line([x0 + 30, base, x1 - 30, base], fill=(60, 150, 230), width=2)
        top = base - int(ch * 0.7)
        d.ellipse([cx - 45, top, cx + 45, base], outline=(170, 170, 170), width=3)
        ax, ay = arrows[r]
        mx, my = cx, (top + base) // 2
        d.line([mx, my, mx + ax * 55, my + ay * 34], fill=(240, 170, 20), width=6)
        d.ellipse([mx + ax * 55 - 8, my + ay * 34 - 8, mx + ax * 55 + 8, my + ay * 34 + 8], fill=(240, 170, 20))
        d.text((x0 + 8, y0 + 6), names[r], font=small, fill=(40, 40, 40))
        d.text((x0 + 8, y0 + 26), f"FRAME {c + 1}", font=small, fill=(40, 40, 40))
img.save(os.path.join(OUT, "templates", "template_sheet_5x4.png"))

W, H = 1536, 1024
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)
views = ["1 FRONT", "2 FRONT-LEFT", "3 LEFT", "4 BACK-LEFT", "5 BACK"]
cw = W / 5
for i, v in enumerate(views):
    x0, x1 = int(i * cw), int((i + 1) * cw)
    d.rectangle([x0, 0, x1 - 1, H - 1], outline=(200, 60, 60), width=2)
    cx = (x0 + x1) // 2
    base = H - 130
    d.line([x0 + 30, base, x1 - 30, base], fill=(60, 150, 230), width=2)
    d.ellipse([cx - 95, base - 640, cx + 95, base], outline=(170, 170, 170), width=3)
    ax, ay = arrows[i]
    my = base - 320
    d.line([cx, my, cx + ax * 90, my + ay * 56], fill=(240, 170, 20), width=7)
    d.ellipse([cx + ax * 90 - 10, my + ay * 56 - 10, cx + ax * 90 + 10, my + ay * 56 + 10], fill=(240, 170, 20))
    d.text((x0 + 12, 12), v, font=font, fill=(40, 40, 40))
img.save(os.path.join(OUT, "templates", "template_turnaround.png"))

for row in ORDER:
    print("|".join(row))
