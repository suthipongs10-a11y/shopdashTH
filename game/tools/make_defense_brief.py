"""Builds the Crown Defense art brief: towers, props, tower icons, the boss and the monster
redesign, as ChatGPT prompts + layout templates. Reuses the shared style text of make_brief.py.

Run from game/: python3 tools/make_defense_brief.py art/_brief_defense fonts/Kanit-Medium.ttf
"""
import os
import runpy
import shutil
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

OUT, FONT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)

# Run the main brief into a scratch folder to reuse its style text, rules and templates.
scratch = tempfile.mkdtemp()
saved_argv = sys.argv
sys.argv = ["make_brief.py", scratch, FONT]
base = runpy.run_path(os.path.join(HERE, "make_brief.py"))
sys.argv = saved_argv
STYLE, SHEET_RULES, DIRECTIONS = base["STYLE"], base["SHEET_RULES"], base["DIRECTIONS"]
CONCEPT_RULES = base["CONCEPT_RULES"]

for sub in ("prompts", "templates"):
    os.makedirs(os.path.join(OUT, sub), exist_ok=True)


def write(name: str, text: str) -> None:
    with open(os.path.join(OUT, "prompts", name), "w", encoding="utf-8") as f:
        f.write(text.strip() + "\n")


PROP_STYLE = """STYLE:
- The same hand-painted dark high-fantasy style as the attached warden_concept.png: richly
  detailed painted illustration, thin dark outline, painterly shading, crisp highlights on metal
  and stone. Light comes from the top-left. NOT pixel art, NOT a 3D render, NOT a photo.
- Palette of the Crown's defenders: pale weathered stone, polished silver, warm gold trim,
  royal-blue cloth and banners, golden-white holy light. No red, no purple (those belong to
  the enemies).
- Camera: three-quarter top-down view, pitched about 35-40 degrees downward, the same angle as
  the characters, so the round base of every structure is seen as a flat ellipse.
- Background: fully transparent. If transparency is not possible, use one flat pure green
  (#00FF00) with no gradient, and do not use that green anywhere in the picture.
- No ground, no grass, no cast shadow on the floor, no scenery behind (the game draws those).
- No text, no labels, no numbers, no watermark, no frame.
- Output: PNG."""

ROW3_RULES = """LAYOUT:
- Landscape canvas, aspect ratio 3:2 (1536x1024, or larger at the same ratio).
- Three versions of the SAME structure side by side, one per third of the canvas, left to right:
  LEVEL 1, LEVEL 2, LEVEL 3. The attached templates/template_row_3.png shows the thirds and the
  shared baseline. Use it ONLY for placement; do not copy its lines or labels.
- The base of all three stands on the same baseline, about 12% above the bottom edge.
- All three have the SAME footprint width at the base (they are built on the same round stone
  platform). Level 2 is about 15% taller than level 1, level 3 about 30% taller.
- Each version is centred in its third and nothing crosses into the neighbouring third.
- Each level is clearly a richer upgrade of the previous one: more gold, more stone, more light."""

TOWERS = [
    ("01", "tower_archer", "the Archer Tower (shoots bolts of holy light)", """
- LEVEL 1: a slim round watchtower of pale stone blocks with a wooden roofless platform on top.
  A silver-and-gold ballista crossbow is mounted on the platform, aimed forward. A small golden
  crystal glows on the ballista.
- LEVEL 2: the tower is taller and wider at the top, reinforced with silver bands. A royal-blue
  banner with a gold lion emblem hangs from the platform. A bigger ballista with a brighter crystal.
- LEVEL 3: a grand white-and-gold spire with an ornate gallery, two ballistae side by side, a
  radiant golden crystal floating above them with a faint halo of light."""),
    ("02", "tower_pillar", "the Holy Pillar (bursts with holy light around itself)", """
- LEVEL 1: a carved obelisk of white stone with glowing gold runes running up its faces and a
  small golden orb of light floating above its tip.
- LEVEL 2: a taller obelisk on a stepped base, two thin gold rings slowly orbiting the glowing
  orb, the runes brighter.
- LEVEL 3: a cathedral-like spire with gold wing-shaped ornaments on both sides and a blazing
  sun-like orb of golden-white light crowning it, rays of light around the orb."""),
    ("03", "tower_wall", "the Thorn Wall (a barricade that blocks monsters)", """
- This structure is WIDE and LOW: about twice as wide as it is tall, facing the viewer.
- LEVEL 1: a palisade of sharpened wooden stakes bound with iron bands, leaning outward, with
  a few iron spikes.
- LEVEL 2: a low wall of grey stone blocks topped with rows of iron spikes, wooden stakes in front.
- LEVEL 3: a fortified rampart of pale stone with gold trim, silver blades along the top and
  three royal-blue shields with gold lion emblems fixed to its face.
- Keep the three versions the same width; only their height and richness change."""),
    ("04", "tower_font", "the Healing Font (heals the hero and the Crown Shrine)", """
- LEVEL 1: a small round stone basin full of glowing turquoise-green water with soft light
  rising from it.
- LEVEL 2: an ornate fountain with a carved stone feather sculpture in the middle and water
  of light spilling into the basin.
- LEVEL 3: a grand two-tier fountain with a statue of a winged knight holding a raised chalice,
  water of turquoise-green light flowing down, tiny floating motes of light around it."""),
]

for num, name, title, levels in TOWERS:
    write(f"{num}_{name}.txt", f"""
OUTPUT FILE NAME: {name}.png
ATTACH WITH THIS PROMPT: warden_concept.png (for style and colours) AND templates/template_row_3.png

Create a game asset sheet for a 2D isometric action RPG: {title}, at three upgrade levels.
It is a defensive structure built by the player's holy knight (see warden_concept.png) to protect
a sacred crown shrine. It must look like it belongs to the same order as that knight.

THE STRUCTURE:{levels}

{ROW3_RULES}

{PROP_STYLE}
""")

GATE_STYLE = PROP_STYLE.replace(
    """- Palette of the Crown's defenders: pale weathered stone, polished silver, warm gold trim,
  royal-blue cloth and banners, golden-white holy light. No red, no purple (those belong to
  the enemies).""",
    "- Palette: black volcanic stone, violet and black energy, ember orange (the enemy side).")
assert GATE_STYLE != PROP_STYLE

write("05_build_slot.txt", f"""
OUTPUT FILE NAME: build_slot.png
ATTACH WITH THIS PROMPT: warden_concept.png (for style and colours)

Create a game asset: an empty round building platform where the player can build a tower.

THE PLATFORM:
- A round platform of fitted pale stone slabs, slightly raised, with a ring of gold runes inlaid
  around its edge and a small gold crown symbol carved in the centre.
- Seen from the three-quarter top-down camera, so it appears as a flat ellipse about twice as wide
  as it is tall, with a little of its front edge visible.
- It fills about 85% of the canvas width and is centred.

LAYOUT:
- Square canvas, 1:1, 1024x1024 or larger.

{PROP_STYLE}
""")

write("06_crown_shrine.txt", f"""
OUTPUT FILE NAMES: crown_base.png AND crown_top.png (two separate images)
ATTACH WITH THIS PROMPT: warden_concept.png (for style and colours)

Create two game assets that together form the Crown Shrine, the sacred object the player defends.
The game draws the crown floating and bobbing above the base, so they are separate pictures.

IMAGE 1, crown_base.png: the shrine's base.
- An octagonal two-step dais of pale carved stone with gold trim, four short pillars at its
  corners holding small braziers of golden light, and a royal-blue cloth with gold embroidery
  draped over the top step. The top of the dais is empty (the crown floats above it).
- Seen from the three-quarter top-down camera. Wider than tall. Fills about 85% of the canvas width.
- Square canvas, 1:1, 1024x1024 or larger.

IMAGE 2, crown_top.png: the crown on its own.
- A magnificent golden royal crown with five points, set with a red ruby, a blue sapphire and a
  green emerald, glowing softly with golden-white holy light and a faint halo behind it.
- Three-quarter view from slightly above, the same angle as the base.
- Fills about 80% of the canvas. Square canvas, 1:1, 1024x1024 or larger.

{PROP_STYLE}
""")

write("07_gate_portal.txt", f"""
OUTPUT FILE NAME: gate_portal.png
ATTACH WITH THIS PROMPT: warden_concept.png (for style only)

Create a game asset: an enemy spawn gate where monsters pour out of a demonic rift.

THE GATE:
- A ruined archway of black volcanic stone, cracked and leaning, with broken chains hanging from
  it and glowing demonic runes carved into it.
- Inside the arch a swirling vortex of violet and black energy with embers and sparks, glowing
  brightest in the middle.
- This is the ENEMY side: use violet, black and ember orange (not the gold and blue of the heroes).
- Seen from the three-quarter top-down camera. The arch is about as wide as it is tall and fills
  about 80% of the canvas height, centred.
- Square canvas, 1:1, 1024x1024 or larger.

{GATE_STYLE}
""")

write("08_icons_towers.txt", """
OUTPUT FILE NAME: icons_towers.png
ATTACH WITH THIS PROMPT: warden_concept.png (for colours only) AND templates/template_icons_2x2.png

Create a sheet of 4 build-menu icons for a dark fantasy tower defense action RPG.

LAYOUT:
- Square canvas, 1:1 (1024x1024). A grid of 2 columns x 2 rows = 4 equal square icons.
- Each icon fills its whole cell edge to edge. No frames, no borders, no gaps, no text.

ICONS, left to right, top row first:
1. Archer Tower: a stone watchtower with a silver-and-gold ballista firing a bolt of golden light,
   on a deep navy background.
2. Holy Pillar: a white stone obelisk with gold runes and a blazing golden orb on top, rays of
   light, on a deep purple-blue background.
3. Thorn Wall: a palisade of sharpened stakes and iron spikes, seen from the front, on a dark
   brown background.
4. Healing Font: a stone fountain overflowing with glowing turquoise-green water, on a deep teal
   background.

STYLE:
- Hand-painted dark fantasy game icons, bold shapes that read clearly at 64x64 pixels, strong
  contrast, glowing accents. Same painting style and lighting (from the top-left) for all four.
- Output: PNG.
""")

BOSS_DESC = """CHARACTER - the Lava Colossus (boss):
- A towering giant of black volcanic rock, about 2.5 times as tall as the human knight, with a
  massive hunched upper body, a small head sunk between enormous shoulders and long arms ending
  in two huge stone fists.
- Plates of black obsidian armour bound to its body with rusted iron chains and broken shackles.
- Bright molten magma glows through deep cracks all over its body and pools in a burning core in
  the middle of its chest. Two blazing orange eyes. A crown of jagged rock horns on its head.
- Embers and heat haze drift off its shoulders (part of the body).
- Menacing and heavy, clearly a boss. Not cute, not chibi."""

BOSS_ANIMS = [
    ("11", "walk", "heavy walk cycle, loops", """- Frame 1: left foot forward, body leaning to the left, fists hanging low near the ground.
- Frame 2: both feet under the body, body upright, chest core glowing.
- Frame 3: right foot forward, body leaning to the right.
- Frame 4: both feet under the body again.
A slow, earth-shaking stride."""),
    ("12", "attack", "double-fist ground slam, plays once", """- Frame 1: wind-up, both fists raised high above the head, magma core flaring white-hot.
- Frame 2: fists swinging down in front of the body.
- Frame 3: impact, both fists smashed into the ground in front of the feet, body bent forward.
- Frame 4: recover, straightening up.
The slam lands in the direction the colossus is facing in that row."""),
    ("13", "cast", "meteor summon, plays once", """- Frame 1: both arms spread wide, head thrown back, magma cracks glowing brighter.
- Frame 2: both arms raised to the sky, molten rock spraying upward from its shoulders.
- Frame 3: same pose, fists clenched, the whole body glowing hottest.
- Frame 4: arms coming down, returning to stand.
The colossus calls burning rocks from the sky."""),
]

write("10_boss_concept.txt", f"""
OUTPUT FILE NAME: boss_concept.png
ATTACH WITH THIS PROMPT: templates/template_turnaround.png AND warden_concept.png (for style only)

Create a character turnaround sheet for a 2D game: the Lava Colossus (boss monster).
This image becomes the design reference for every later sprite of this boss.

{BOSS_DESC}

{STYLE}

{CONCEPT_RULES}
""")
for num, anim, label, frames in BOSS_ANIMS:
    rules = SHEET_RULES.format(directions=DIRECTIONS, fill=80)
    write(f"{num}_boss_{anim}.txt", f"""
OUTPUT FILE NAME: boss_{anim}.png
ATTACH WITH THIS PROMPT: the approved boss_concept.png AND templates/template_sheet_5x4.png

Create a 2D game sprite sheet of the Lava Colossus (boss monster).

{BOSS_DESC}
The design must match the attached boss_concept.png exactly.

ANIMATION: {label}, 4 frames.
{frames}

{STYLE}

{rules}
""")

# Monster redesign, so the regular monsters match the new knight (prompts from the main brief).
renames = {
    "20_golem_concept.txt": "20_golem_concept.txt", "21_golem_walk.txt": "21_golem_walk.txt",
    "22_golem_attack.txt": "22_golem_attack.txt", "30_imp_concept.txt": "30_imp_concept.txt",
    "31_imp_walk.txt": "31_imp_walk.txt", "32_imp_attack.txt": "32_imp_attack.txt",
}
for src, dst in renames.items():
    shutil.copy(os.path.join(scratch, "prompts", src), os.path.join(OUT, "prompts", dst))

for tpl in ("template_turnaround.png", "template_sheet_5x4.png"):
    shutil.copy(os.path.join(scratch, "templates", tpl), os.path.join(OUT, "templates", tpl))

font = ImageFont.truetype(FONT, 28)
img = Image.new("RGB", (1536, 1024), "white")
d = ImageDraw.Draw(img)
for i in range(3):
    x0 = i * 512
    d.rectangle([x0, 0, x0 + 511, 1023], outline=(200, 60, 60), width=3)
    base = 1024 - 123
    d.line([x0 + 40, base, x0 + 472, base], fill=(60, 150, 230), width=3)
    h = [520, 600, 680][i]
    d.rectangle([x0 + 156, base - h, x0 + 356, base], outline=(170, 170, 170), width=3)
    d.ellipse([x0 + 136, base - 40, x0 + 376, base + 40], outline=(240, 170, 20), width=4)
    d.text((x0 + 16, 12), f"LEVEL {i + 1}", font=font, fill=(40, 40, 40))
img.save(os.path.join(OUT, "templates", "template_row_3.png"))

img = Image.new("RGB", (1024, 1024), "white")
d = ImageDraw.Draw(img)
for i in range(4):
    r, c = divmod(i, 2)
    d.rectangle([c * 512, r * 512, c * 512 + 511, r * 512 + 511], outline=(200, 60, 60), width=3)
    d.text((c * 512 + 16, r * 512 + 12), f"ICON {i + 1}", font=font, fill=(40, 40, 40))
img.save(os.path.join(OUT, "templates", "template_icons_2x2.png"))

concept = os.path.join(GAME, "art", "_brief_knight", "warden_concept.png")
if os.path.exists(concept):
    shutil.copy(concept, os.path.join(OUT, "warden_concept.png"))
shutil.rmtree(scratch)
print("ok")
