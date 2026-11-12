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
- Heroic semi-realistic anime proportions: a human is about 6 heads tall, with long legs and an
  athletic build. The head is small relative to the body.
- Deep, rich colours with glowing accents (gold, violet, ember orange) and polished metals and
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
        "title": "the Warden (player character, a winged holy knight in full plate)",
        "desc": """CHARACTER - the Warden:
- A tall, heroic holy knight in full plate armour, about 6 heads tall, broad shoulders, long legs.
  Powerful and noble, never cute. The face is completely hidden.
- HELMET: a closed full helmet of polished silver with gold trim. A narrow T-shaped visor slit that
  glows warm golden-white. A tall swept-back crest of layered silver-and-gold blade-like feathers
  rises from the top and sweeps backward, with two short golden horn spikes at the temples.
- ARMOUR: polished silver-white plate with ornate gold edging and engraved gold filigree. Large
  layered pauldrons whose outer edges flare into crystalline golden feather spikes. A sculpted
  breastplate with a glowing golden diamond gem in the centre and smaller gems on the shoulders.
  Layered tassets over the hips, armoured gauntlets, pointed armoured greaves and sabatons.
- CAPE: a long deep royal-blue cape with a thick gold border and gold corner ornaments, flowing
  behind and out to the sides. A royal-blue tabard panel with gold trim hangs at the front.
- WINGS: a pair of large angelic wings growing from the back, made of radiant golden-white light
  feathers, layered like a real bird's wing, glowing brightest at the edges and tips with tiny
  floating light motes. They are part of the character and appear in every pose. Keep them half
  folded: the tips rise no higher than the top of the helmet crest and stay inside the cell.
- Right hand: a long ornate knight's sword. Silver blade with a glowing golden-white fuller line,
  a winged gold crossguard with a gem in the middle, a royal-blue grip.
- Left arm: a silver kite shield with a gold border and a raised gold lion-head emblem.
- Palette: silver-white, polished gold, royal blue, golden-white glow. No black armour, no red.
- Design inspiration: the armour, helmet crest and cape of the attached style_reference_knight.png,
  re-coloured to silver, gold and royal blue with golden light instead of ice. Use only the knight's
  design. Ignore the dragon, the ice, the snowflakes and the background in that image.""",
        "fill": 62,
        "extra_attach": " AND style_reference_knight.png",
        "anims": {
            "idle": ("idle stance, loops", """- Frame 1: ready stance, sword lowered diagonally, shield held in front, wings half folded.
- Frame 2: slight inhale, shoulders and wings rise a little, wing tips and visor glow brighter.
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
            "bash": ("shield bash, plays once", """- Frame 1: brace, body turned sideways, shield pulled back to the chest, sword held low behind.
- Frame 2: lunge, front foot stepping forward, shield driving forward at chest height.
- Frame 3: impact, shield arm fully extended straight forward, body leaning into it, wings
  flared wide behind, cape whipping back. This is the strongest pose of the set.
- Frame 4: recover, shield returning towards the body.
The shield always drives in the direction the character is facing in that row. Keep both feet
on the ground in every frame (the game adds the lunge)."""),
            "slam": ("leaping sword slam, plays once", """- Frame 1: crouch, knees bent deep, sword raised high above the head in the right hand,
  shield on the left arm, wings spread to take off.
- Frame 2: airborne pose, legs tucked, sword raised straight up overhead, shield held out,
  wings fully spread (wing tips and sword tip still inside the cell). Draw the feet on the same baseline as the other frames: the game lifts the
  character into the air itself.
- Frame 3: impact, landed in a deep lunge, sword driven point-down into the ground in front of
  the body, head lowered, wings swept forward, cape flying up.
- Frame 4: recover, pulling the sword out of the ground and standing up.
The slam lands in the direction the character is facing in that row."""),
            "cast": ("summoning stance, loops", """- Frame 1: feet planted wide, sword raised straight up to the sky in the right hand, shield
  arm held out to the side, head tilted up, wings spread wide.
- Frame 2: same pose, wings a little higher, visor glowing brighter, cape lifting in an updraft.
- Frame 3: same as frame 1.
- Frame 4: same pose, wings a little lower, cape settling.
A heroic summoning pose held while the warden calls the golden dragon. Only small changes
between frames so it loops smoothly. The raised sword must stay inside the cell."""),
            "guard": ("shield guard, plays once then holds", """- Frame 1: stepping into a guard, shield coming up.
- Frame 2: full guard, shield raised in front of the chest and helmet, body braced low behind
  it, sword held back ready, wings folded forward around the shoulders.
- Frame 3: same as frame 2 with a slight push forward as if absorbing a blow.
- Frame 4: same as frame 2.
The shield faces the direction the character is facing in that row."""),
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
ATTACH WITH THIS PROMPT: templates/template_turnaround.png{c.get('extra_attach', '')}

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

FX_STYLE = """FX STYLE (same for every effect):
- Hand-painted glowing magic visual effect for a dark fantasy isometric MMORPG.
- Blinding white-hot core, saturated coloured glow around it, soft bloom, crisp painted energy shapes
  and fine sparks. Bright, dramatic and powerful.
- NOT pixel art, NOT a 3D render, NOT a photo. No characters, no ground, no scenery."""

FX_BLACK = """- Background: pure flat black (#000000) everywhere outside the effect. No gradient, no vignette,
  no grey haze. (The game blends effects additively, so black becomes invisible.)"""

FX_GRID = """LAYOUT (animated effect, 6 frames):
- Landscape canvas, aspect ratio 3:2 (1536x1024). A grid of 3 columns x 2 rows = 6 equal square cells.
- Frames run left to right, top row first: frame 1 top-left ... frame 6 bottom-right.
- The attached template_fx_3x2.png shows the layout. Use it ONLY to place the frames; do NOT copy its
  lines, numbers or white background.
- The effect stays centred on the same spot in every cell and never crosses into a neighbouring cell.
- No text, numbers, labels, borders, grid lines or watermark.
- Output: PNG."""

FX_SINGLE = """LAYOUT (single image):
- {canvas}
- The effect is centred and nothing touches the canvas edges unless stated.
- No text, labels, border or watermark.
- Output: PNG."""

FX = [
    ("41_fx_slash.txt", "fx_slash.png", "grid", "black",
     "A sword slash crescent, the light trail left by a very fast longsword swing.",
     """- A thick curved crescent of white light with ice-blue edges and a soft blue glow.
- The crescent bulges toward the RIGHT side of the cell: its convex edge faces right and its two
  thin tips point to the upper-left and lower-left. Every frame keeps this orientation.
- Frame 1: a thin bright sliver appears. Frame 2: the arc grows. Frame 3: full, brightest crescent
  with sparkles at the tips. Frame 4: the crescent widens slightly. Frame 5: it fades and breaks into
  fine light streaks. Frame 6: faint wisps only."""),
    ("42_fx_hit.txt", "fx_hit.png", "grid", "black",
     "An impact spark when a sword hits an enemy.",
     """- A bright four-pointed white star with a gold glow at its centre, sharp needles of light
  radiating outward and small flying sparks.
- Frame 1: small flash. Frame 2: large star burst. Frame 3: peak, long thin needles.
  Frame 4: needles thinning. Frame 5: fading sparks. Frame 6: last tiny sparks."""),
    ("43_fx_explosion.txt", "fx_explosion.png", "grid", "black",
     "A radiant golden holy explosion for powerful skills.",
     """- A blinding white-gold core, a ring of golden light expanding outward, long light rays shooting
  out, curling golden flames and sparks.
- Frame 1: the core ignites. Frame 2: core swells, first rays. Frame 3: peak, biggest and brightest,
  long rays. Frame 4: ring expands, core fading. Frame 5: flames and sparks drifting outward.
  Frame 6: faint embers and a thin fading ring.
- At its peak the explosion fills about 90% of the cell."""),
    ("44_fx_fire.txt", "fx_fire.png", "grid", "black",
     "A small fire burning on the ground, seen from the game's three-quarter top-down camera.",
     """- A cluster of 3 to 5 tongues of orange-yellow flame with a white-yellow base, rising upward.
- A seamless 6-frame loop: the flames flicker and sway; frame 6 must flow smoothly back into frame 1.
- The base of the fire sits on the same spot in every frame, about 15% above the bottom of the cell.
  The flames reach about 70% of the cell height."""),
    ("45_fx_smoke.txt", "fx_smoke.png", "grid", "transparent",
     "A puff of smoke and dust rising and dissipating.",
     """- Soft painted grey-brown smoke cloud.
- Frame 1: a small dense puff near the bottom of the cell. Frames 2-4: it billows upward and grows.
  Frames 5-6: large thin wisps fading away."""),
    ("46_fx_bubble.txt", "fx_bubble.png", "single", "black",
     "A spherical magic barrier bubble that surrounds a knight.",
     """- A perfectly round sphere of pale blue-white light, seen front-on, like a soap bubble or glass orb.
- The inside is almost completely transparent (black). A bright rim of light along the edge,
  a soft curved highlight on the upper left like light on glass, a faint hexagon shimmer pattern,
  a few tiny sparkles.
- The sphere fills about 90% of the canvas."""),
    ("47_fx_guard.txt", "fx_guard.png", "single", "black",
     "A small floating guardian shield made of light that orbits the knight.",
     """- A kite-shaped heraldic shield made of translucent golden light, with a small lion-head emblem,
  glowing edges and a soft golden aura. Front view.
- Fills about 80% of the canvas."""),
    ("48_fx_cross.txt", "fx_cross.png", "single", "black",
     "A holy cross flare that strikes enemies.",
     """- A bright white-gold four-pointed cross-shaped star of light.
- The vertical ray is much longer than the horizontal ray: the vertical ray reaches almost to the top
  and bottom edges, the horizontal ray reaches about 70% of the width.
- Very thin, sharp rays with a soft golden bloom, a small blinding core, faint diagonal glints."""),
    ("49_fx_ring.txt", "fx_ring.png", "single", "black",
     "A magic rune circle placed on the ground under a spell.",
     """- Seen from DIRECTLY ABOVE: a perfectly round circle, NOT in perspective (the game tilts it).
- Two concentric thin glowing golden rings with a band of runic symbols between them, a few small
  diamond ornaments around the outside, soft golden glow.
- The centre is empty black. The circle fills about 95% of the canvas."""),
    ("50_fx_pillar.txt", "fx_pillar.png", "single-portrait", "black",
     "A pillar of holy light striking down from the sky.",
     """- A tall narrow beam of white-gold light, brightest in the middle with soft glowing edges,
  small sparkles and motes of light along it.
- The beam runs from the top edge down to about 90% of the height and flares out into a bright
  splash where it hits the ground. It is about 30% of the canvas width."""),
    ("51_fx_crest.txt", "fx_crest.png", "single-portrait", "black",
     "A glowing golden heraldic crest summoned by the knight's ultimate skill.",
     """- A large ornate shield emblem made of golden light and gold metal, with a roaring lion head at
  its centre and wing-like flourishes on both sides, light rays radiating behind it.
- Front view, centred, fills about 85% of the canvas."""),
]

for fname, out_name, kind, bg, title, body in FX:
    if kind == "grid":
        layout = FX_GRID
        attach = "templates/template_fx_3x2.png"
    else:
        canvas = ("Portrait canvas, aspect ratio 2:3 (1024x1536)." if kind == "single-portrait"
                  else "Square canvas, 1:1 (1024x1024).")
        layout = FX_SINGLE.format(canvas=canvas)
        attach = "nothing"
    if bg == "black":
        background = FX_BLACK
    else:
        background = ("- Background: fully transparent. If transparency is not possible, use one flat pure "
                      "green (#00FF00)\n  with no gradient.")
    write(fname, f"""
OUTPUT FILE NAME: {out_name}
ATTACH WITH THIS PROMPT: {attach}

Create a visual effect for a 2D action RPG: {title}

CONTENT:
{body}

{FX_STYLE}

{layout}

BACKGROUND:
{background}
""")
    ORDER.append((fname, out_name, "fx"))

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
ORDER.insert(len(ORDER) - len(FX), ("40_fx_lion_spirit.txt", "lion_spirit.png", "fx"))

write("60_icons_skills.txt", """
OUTPUT FILE NAME: icons_skills.png
ATTACH WITH THIS PROMPT: the approved warden_concept.png (for colours only)

Create a sheet of 9 skill and item icons for a dark fantasy action RPG.

LAYOUT:
- Square canvas, 1:1 (1024x1024). A grid of 3 columns x 3 rows = 9 equal square icons.
- Each icon fills its whole cell edge to edge. No frames, no borders, no gaps, no text.

ICONS, left to right, top row first:
1. Sword Slash: a black longsword with a faint blue edge cutting diagonally, on a dark slate background.
2. Triple Blade Wave: three crescents of blue light flying forward in a fan, on a deep navy background.
3. Aegis: a translucent glowing bubble shield with a gold lion emblem at its centre, on a dark teal background.
4. Blade Storm: a sword spinning in a circle leaving white ring trails, on a dark steel-blue background.
5. Golden Lion Roar: a roaring lion head made of golden fire, on a deep crimson background.
6. Holy Cross: a white-gold cross-shaped flare of light striking down, on a dark purple background.
7. Sacred Banner: a radiant golden heraldic crest with a lion emblem and light rays, on a deep orange background.
8. Health Potion: a round glass bottle of glowing red liquid with a cork, on a dark background.
9. Mana Potion: a round glass bottle of glowing blue liquid with a cork, on a dark background.

STYLE:
- Hand-painted dark fantasy game icons, bold shapes that read clearly at 64x64 pixels, strong
  contrast, glowing accents. Same painting style and lighting (from the top-left) for all nine.
- Output: PNG.
""")
ORDER.append(("60_icons_skills.txt", "icons_skills.png", "icons"))

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

W, H = 1536, 1024
img = Image.new("RGB", (W, H), "white")
d = ImageDraw.Draw(img)
big = ImageFont.truetype(FONT, 64)
for i in range(6):
    r, c = divmod(i, 3)
    x0, y0 = c * 512, r * 512
    d.rectangle([x0, y0, x0 + 511, y0 + 511], outline=(200, 60, 60), width=3)
    d.ellipse([x0 + 56, y0 + 56, x0 + 456, y0 + 456], outline=(170, 170, 170), width=3)
    d.line([x0 + 236, y0 + 256, x0 + 276, y0 + 256], fill=(240, 170, 20), width=4)
    d.line([x0 + 256, y0 + 236, x0 + 256, y0 + 276], fill=(240, 170, 20), width=4)
    d.text((x0 + 16, y0 + 8), f"FRAME {i + 1}", font=big, fill=(40, 40, 40))
img.save(os.path.join(OUT, "templates", "template_fx_3x2.png"))

for row in ORDER:
    print("|".join(row))
