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
- Hand-painted 2D game sprite illustration with chibi proportions: big head, small body, about 2.5 heads tall.
- Clean dark-brown outline around the whole figure (not pure black), soft cel shading with 2-3 tones per colour.
- Vivid, saturated, bright and cheerful colours. European high-fantasy theme.
- Light comes from the top-left. Subtle rim light on the right side.
- Crisp illustration. NOT pixel art, NOT a 3D render, NOT a photo.
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
- No motion trails, no slash arcs, no glow, sparks or magic effects (the game draws those itself).
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
        "title": "the Warden (player character, a young knight)",
        "desc": """CHARACTER - the Warden:
- A young chibi knight with a friendly, determined face.
- Short tousled ash-blond hair, bright blue eyes. No helmet.
- Polished silver-blue plate armour with gold trim. Short crimson cape. Brown leather belt and boots.
- Right hand: a straight longsword with a gold crossguard.
- Left arm: a kite shield, royal blue with a gold crown emblem.""",
        "fill": 70,
        "anims": {
            "idle": ("idle stance, loops", """- Frame 1: neutral ready stance, sword lowered at the side, shield in front of the body.
- Frame 2: slight inhale, shoulders and head rise a tiny bit, cape hangs straight.
- Frame 3: same as frame 1.
- Frame 4: slight exhale, shoulders drop a tiny bit, cape sways a little."""),
            "walk": ("walk cycle, loops", """- Frame 1: left foot forward (contact), right arm with sword swings back.
- Frame 2: legs passing under the body, body at its highest point.
- Frame 3: right foot forward (contact), mirror of frame 1.
- Frame 4: legs passing under the body again, body at its highest point.
The cape trails behind the direction of travel."""),
            "attack": ("sword slash, plays once", """- Frame 1: wind-up, sword raised back over the shoulder, body twisted, shield pulled close.
- Frame 2: mid-swing, sword cutting horizontally across the front of the body.
- Frame 3: follow-through, sword fully extended to the far side, weight on the front foot.
- Frame 4: recover, returning to the ready stance.
The swing travels in the direction the character is facing in that row."""),
        },
    },
    "golem": {
        "title": "the Cinder Golem (monster)",
        "desc": """CHARACTER - the Cinder Golem:
- A stocky chibi rock golem, as tall as a knight but twice as wide. Cute but menacing, no gore.
- Body made of stacked warm-grey basalt slabs. Bright orange lava glows through cracks on the chest and arms.
- Two glowing amber eyes, no mouth. Oversized stone fists, short thick legs.
- Small smouldering embers on the shoulders (part of the body, not a floating effect).""",
        "fill": 75,
        "anims": {
            "walk": ("heavy walk cycle, loops", """- Frame 1: left foot forward, body leaning to the left, arms hanging low.
- Frame 2: both feet under the body, body upright.
- Frame 3: right foot forward, body leaning to the right.
- Frame 4: both feet under the body, body upright.
A slow, heavy, lumbering stomp."""),
            "attack": ("overhead fist smash, plays once", """- Frame 1: wind-up, both fists raised high above the head.
- Frame 2: fists swinging down in front of the body.
- Frame 3: impact, fists on the ground in front of the feet, body bent forward.
- Frame 4: recover, straightening up.
The smash lands in the direction the golem is facing in that row."""),
        },
    },
    "imp": {
        "title": "the Ash Imp (monster)",
        "desc": """CHARACTER - the Ash Imp:
- A small mischievous imp with a round body and a toothy grin.
- Vivid violet-purple skin, big yellow eyes, two short curved horns.
- Tiny bat wings, a thin tail with a glowing ember at the tip, small claws.""",
        "fill": 65,
        "anims": {
            "walk": ("bouncy hop cycle, loops", """- Frame 1: crouched on the ground, wings folded, about to hop.
- Frame 2: pushing off, body stretched upward, wings opening.
- Frame 3: top of the hop, feet off the ground, wings fully spread.
- Frame 4: landing, body squashed slightly, wings folding.
Keep the baseline where the feet touch the ground in frames 1 and 4."""),
            "attack": ("claw swipe, plays once", """- Frame 1: wind-up, one clawed hand pulled back, body leaning back.
- Frame 2: lunge forward, claw swiping across.
- Frame 3: follow-through, arm fully extended, body leaning forward.
- Frame 4: recover, hopping back to a neutral pose.
The swipe goes in the direction the imp is facing in that row."""),
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

write("40_map_volcano.txt", """
OUTPUT FILE NAME: map_volcano.png
ATTACH WITH THIS PROMPT: nothing

Create the ground painting for a 2D action RPG field map: a sunlit volcanic highland.

CONTENT:
- Warm terracotta and sandstone rock, broken into large cracked plates.
- Thin glowing orange lava seams between some plates, and a few small lava pools (each smaller than 5% of the image).
- Patches of green moss and short grass, scattered pebbles and small flat stones.
- Variety across the map: a hotter area with more lava on one side, a greener calmer area on the other.
- Bright daylight, saturated cheerful colours. Mid-tone overall so that bright spell effects stay visible on top.

VIEW AND STYLE:
- Seen from above at a three-quarter top-down angle, pitched about 35-40 degrees downward.
- Hand-painted game background, crisp illustration. NOT pixel art, NOT a 3D render, NOT a photo.
- Even lighting from the top-left, no strong cast shadows.

HARD RULES:
- Ground only. Nothing taller than knee height: no trees, pillars, buildings, cliffs, walls or large boulders.
- No characters, creatures, items, text, UI, borders or watermark.
- The painting fills the whole canvas edge to edge.
- Landscape canvas, aspect ratio 3:2, at the largest resolution available (1536x1024 minimum).
- Output: PNG.
""")
ORDER.append(("40_map_volcano.txt", "map_volcano.png", "map"))

write("50_icons_skills_optional.txt", f"""
OUTPUT FILE NAME: icons_skills.png
ATTACH WITH THIS PROMPT: the approved warden_concept.png (for colours only)
OPTIONAL ASSET: the game works without it.

Create a sheet of 6 skill icons for a 2D fantasy action RPG.

LAYOUT:
- Landscape canvas, aspect ratio 3:2 (1536x1024). A grid of 3 columns x 2 rows = 6 equal square icons.
- Each icon fills its whole cell edge to edge. No frames, no borders, no gaps, no text.

ICONS, left to right, top row then bottom row:
1. Sword Slash: a silver longsword cutting diagonally, on a slate-blue background.
2. Blade Wave: a crescent of light-blue energy flying forward, on a deep blue background.
3. Shield Bash: a royal blue kite shield with a gold crown emblem ramming forward, on an amber background.
4. Guardian Ring: a glowing golden rune circle on the ground seen from above, on a warm brown background.
5. Judgment: a pillar of white-gold light striking down from the sky, on a deep orange background.
6. Healing Potion: a round glass bottle of red liquid with a cork, on a dark teal background.

STYLE:
- Hand-painted game icons, bold shapes that read clearly at 64x64 pixels, strong contrast, vivid colours.
- Same painting style and lighting (from the top-left) for all six.
- Output: PNG.
""")
ORDER.append(("50_icons_skills_optional.txt", "icons_skills.png", "icons"))

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
