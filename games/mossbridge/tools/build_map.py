#!/usr/bin/env python3
"""
build_map.py — join the ChatGPT orthographic maps P07A (town square) and P07B (meadow) into the demo
map, and write the map data the game reads (reproducible).

The two tiles are drawn to continue each other (river + bridge on the seam), but the bridge decks sit
~60 px apart vertically, so the town tile is shifted up by SHIFT (its top rows - the castle wall - are
cropped) and the meadow's bottom SHIFT rows are cropped. World = 3072 x (1024 - SHIFT) map px.

Walkable areas, spawns and water glints are traced by eye on a grid (tools: qa-out/mapgrid_*.png)
in each tile's own pixels and converted here, so they can be re-traced per tile.

Outputs: demo/assets/map_town_meadow.jpg, demo/maps/mossbridge.json, manifest.json "map" entry.
Usage (from games/mossbridge):  python3 tools/build_map.py        Requires: Pillow
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "art", "raw")
OUT = os.path.join(ROOT, "demo", "assets")
SHIFT = 60          # town tile moves up by this much; meadow loses this much at the bottom
TILE = (1536, 1024)
G = 4 / 3           # the tracing grids were drawn at 0.75 scale

# traced on qa-out/mapgrid_town.png / mapgrid_meadow.png (grid image px, 0.75 of tile px)
TOWN_WALK = [(340, 205), (520, 205), (525, 60), (640, 60), (645, 205), (820, 205), (845, 240), (865, 300), (880, 335),
             (935, 350), (1152, 350), (1152, 440), (935, 440), (870, 455), (860, 520), (860, 600), (820, 640), (560, 645),
             (480, 650), (300, 650), (250, 630), (230, 560), (230, 400), (250, 330), (300, 300), (340, 260)]
MEADOW_WALK = [(0, 305), (155, 300), (170, 285), (240, 280), (270, 215), (330, 205), (430, 195), (470, 160), (580, 165),
               (780, 165), (880, 150), (1000, 150), (1060, 140), (1065, 60), (1130, 60), (1135, 150), (1110, 200),
               (1010, 230), (960, 240), (955, 330), (960, 480), (1080, 500), (1000, 560), (900, 590), (820, 600),
               (800, 650), (690, 655), (650, 700), (540, 700), (440, 660), (420, 600), (330, 600), (310, 520),
               (210, 470), (160, 400), (0, 395)]


def town(p):    # grid px of the town tile -> world px
    return [round(p[0] * G), round(p[1] * G - SHIFT)]


def meadow(p):  # grid px of the meadow tile -> world px
    return [round(TILE[0] + p[0] * G), round(p[1] * G)]


def main():
    a = Image.open(os.path.join(RAW, "P07A_map_town_square.png")).convert("RGB")
    b = Image.open(os.path.join(RAW, "P07B_map_meadow.png")).convert("RGB")
    W, H = TILE[0] * 2, TILE[1] - SHIFT
    m = Image.new("RGB", (W, H))
    m.paste(a.crop((0, SHIFT, TILE[0], TILE[1])), (0, 0))
    m.paste(b.crop((0, 0, TILE[0], TILE[1] - SHIFT)), (TILE[0], 0))
    m.save(os.path.join(OUT, "map_town_meadow.jpg"), quality=90, optimize=True)

    data = {
        "file": "map_town_meadow.jpg", "size": [W, H],
        "scale": 0.6,                        # orthographic: characters keep one size everywhere
        "walk": [[town(p) for p in TOWN_WALK], [meadow(p) for p in MEADOW_WALK]],
        "heroStart": town((560, 450)),
        "slimes": [meadow(p) for p in [(380, 360), (520, 300), (640, 420), (560, 520), (760, 380), (420, 480), (820, 300)]],
        "boss": meadow((720, 470)),
        "water": [town(p) for p in [(960, 220), (1010, 300), (980, 560), (1000, 650), (960, 720)]]
                 + [meadow(p) for p in [(60, 200), (40, 480), (40, 620), (960, 650), (1020, 680)]],
        "note": "built by tools/build_map.py from P07A + P07B; edit the traced points there",
    }
    os.makedirs(os.path.join(ROOT, "demo", "maps"), exist_ok=True)
    with open(os.path.join(ROOT, "demo", "maps", "mossbridge.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)
    path = os.path.join(OUT, "manifest.json")
    man = json.load(open(path, encoding="utf-8"))
    man["map"] = {"file": data["file"], "size": data["size"], "data": "maps/mossbridge.json"}
    with open(path, "w", encoding="utf-8") as f:
        json.dump(man, f, indent=1)
    print(W, H, "walk areas:", [len(p) for p in data["walk"]])


if __name__ == "__main__":
    main()
