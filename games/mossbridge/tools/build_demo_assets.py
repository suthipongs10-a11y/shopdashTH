#!/usr/bin/env python3
"""
build_demo_assets.py — prepare textures for demo/ from art/ (reproducible).

  1. Hero: split each of the 4 painted views into BODY + WEAPON textures.
     The weapon is selected by colour (grey metal + brass grip) with a flood fill that
     starts at the blade tip, inside a per-view rectangle. Small stray islands are removed.
     The weapon gets its own sprite so it can swing freely around the grip point.
  2. Monsters: trim the 320x320 sample canvases and record the feet anchor.
  3. Map: the environment painting as a JPEG.
  Writes demo/assets/*.png|jpg and demo/assets/manifest.json

Usage (from games/mossbridge):  python3 tools/build_demo_assets.py
Requires: Pillow, numpy
"""
import json, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "art", "samples")
OUT = os.path.join(ROOT, "demo", "assets")

# Sample file names were guessed before the views were inspected; real facing in brackets.
# view: (file, search rect x0,y0,x1,y1, flood seeds (blade tip / pick head), grip circle x,y,r)
HERO = {
    "sw": ("hero_se.png", (40, 140, 150, 295), [(64, 278), (80, 205)], (128, 200, 20)),   # faces down-left
    "se": ("hero_sw.png", (160, 160, 270, 305), [(250, 296), (240, 230)], (183, 222, 20)),  # faces down-right
    "w":  ("hero_e.png",  (55, 115, 145, 255), [(76, 240), (80, 172)], (124, 168, 20)),    # faces left
    "ne": ("hero_nw.png", (170, 170, 270, 305), [(250, 298), (240, 232)], (194, 224, 20)),  # back, faces up-right
}
FEET = (160, 300)


def islands(mask):
    H, W = mask.shape
    lab = np.zeros((H, W), int); sizes = [0]; k = 0
    for y in range(H):
        for x in range(W):
            if mask[y, x] and not lab[y, x]:
                k += 1; q = deque([(y, x)]); lab[y, x] = k; n = 0
                while q:
                    cy, cx = q.popleft(); n += 1
                    for ny in (cy - 1, cy, cy + 1):
                        for nx in (cx - 1, cx, cx + 1):
                            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                                lab[ny, nx] = k; q.append((ny, nx))
                sizes.append(n)
    return lab, sizes


def drop_small(A, minsz):
    m = A[..., 3] > 40
    lab, sizes = islands(m)
    keep = np.array([s >= minsz for s in sizes])[lab] & m
    near = keep.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            near |= np.roll(np.roll(keep, dy, 0), dx, 1)
    A = A.copy(); A[~near] = 0
    return A


def split_hero(view, f, rect, seeds, grip):
    im = Image.open(os.path.join(SAMPLES, f)).convert("RGBA")
    a = np.array(im).astype(float); H, W = a.shape[:2]
    r, g, b, al = a[..., 0] / 255, a[..., 1] / 255, a[..., 2] / 255, a[..., 3]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    yy, xx = np.mgrid[0:H, 0:W]
    gx, gy, gr = grip; x0, y0, x1, y1 = rect
    ingrip = (xx - gx) ** 2 + (yy - gy) ** 2 <= gr * gr
    inrect = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    ok = (al > 20) & inrect & ((sat < 0.28) | ingrip)
    seen = np.zeros((H, W), bool); q = deque()
    for sx, sy in seeds:
        d = np.where(ok, (xx - sx) ** 2 + (yy - sy) ** 2, 1e9)
        iy, ix = np.unravel_index(np.argmin(d), d.shape)
        seen[iy, ix] = True; q.append((iy, ix))
    while q:
        cy, cx = q.popleft()
        for ny in (cy - 1, cy, cy + 1):
            for nx in (cx - 1, cx, cx + 1):
                if 0 <= ny < H and 0 <= nx < W and ok[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
    m = seen
    for _ in range(2):
        m2 = m.copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                m2 |= np.roll(np.roll(m, dy, 0), dx, 1)
        m = m2 & (al > 0) & inrect & ((sat < 0.35) | ingrip)
    A = np.array(im)
    wpn = A.copy(); wpn[~m] = 0
    body = A.copy(); body[m] = 0
    body = drop_small(body, 400); wpn = drop_small(wpn, 150)
    Image.fromarray(body).save(os.path.join(OUT, f"hero_{view}_body.png"), optimize=True)
    wi = Image.fromarray(wpn); bb = wi.getbbox()
    wi.crop(bb).save(os.path.join(OUT, f"hero_{view}_weapon.png"), optimize=True)
    return {"body": f"hero_{view}_body.png", "weapon": f"hero_{view}_weapon.png",
            "size": [W, H], "feet": list(FEET), "grip": [gx, gy], "weaponGrip": [gx - bb[0], gy - bb[1]]}


def trim(name, out, pad=10):
    im = Image.open(os.path.join(SAMPLES, name)).convert("RGBA")
    x0, y0, x1, y1 = im.getbbox()
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)
    im.crop((x0, y0, x1, y1)).save(os.path.join(OUT, out), optimize=True)
    return {"file": out, "size": [x1 - x0, y1 - y0], "feet": [FEET[0] - x0, FEET[1] - y0]}


def main():
    os.makedirs(OUT, exist_ok=True)
    man = {"hero": {}, "mobs": {}}
    for v, args in HERO.items():
        man["hero"][v] = split_hero(v, *args)
    man["mobs"]["sproutling"] = trim("mob_sproutling.png", "mob_sproutling.png")
    man["mobs"]["mossback"] = trim("mob_mossback.png", "mob_mossback.png")
    src = os.path.join(ROOT, "art", "reference", "02_environment_full.jpg")
    if os.path.exists(src):
        Image.open(src).convert("RGB").save(os.path.join(OUT, "map_mossbridge.jpg"), quality=90, optimize=True)
        man["map"] = {"file": "map_mossbridge.jpg", "size": list(Image.open(src).size)}
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(man, f, indent=1)
    print(json.dumps(man, indent=1))


if __name__ == "__main__":
    main()
