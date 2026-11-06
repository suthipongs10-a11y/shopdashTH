#!/usr/bin/env python3
"""
build_fx_assets.py — ChatGPT effect sheets and skill icons -> demo/assets (reproducible).

Inputs (art/raw/, not committed; from chatgpt-pack P08B / P09A-C):
  P09A_fx_slash_arc_8frames.png         4x2 frames, teal slash arc on black (additive)
  P09B_fx_water_vortex.png              one water ring on black (Tidecleave)
  P09C_fx_ground_shockwave_8frames.png  4x2 frames, ground shockwave on black (Mossquake)
  P08B_icons_skills_items.png           4x4 icons on magenta; row 1 = the 4 skills, row 2 col 1 = red potion

Outputs (demo/assets/):
  fx_slash.png, fx_quake.png   8 frames side by side, every frame on the same canvas, aligned
                               (the arc drifts between frames in P09A: frames are lined up on the
                               arc's leading edge and vertical middle)
  fx_vortex.png                the ring, trimmed
  icon_{tide,quake,dash,mend,potion}.png   112x112 with alpha
  manifest.json                adds "fx" (file, frames, frame size, anchor) and "icons"

Black stays black on purpose: the game draws these with additive blending.
Usage (from games/mossbridge):  python3 tools/build_fx_assets.py      Requires: Pillow, numpy
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import sprite_clean as sc  # noqa: E402

RAW = os.path.join(ROOT, "art", "raw")
OUT = os.path.join(ROOT, "demo", "assets")
TH = 28          # luminance that counts as "effect" when measuring frames
PADF = 80        # room to shift frames when aligning them


def frames_4x2(name):
    a = np.array(Image.open(os.path.join(RAW, name)).convert("RGB"))
    h, w = a.shape[:2]; cw, ch = w // 4, h // 2
    return [a[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw] for r in range(2) for c in range(4)]


def bbox(f):
    ys, xs = np.nonzero(f.max(axis=2) > TH)
    return xs.min(), ys.min(), xs.max(), ys.max()


def strip(frames, shifts, scale, name):
    """shift every frame, crop all to their common box, scale, lay out left to right"""
    ch, cw = frames[0].shape[:2]
    big = []
    for f, (dx, dy) in zip(frames, shifts):
        c = np.zeros((ch + 2 * PADF, cw + 2 * PADF, 3), np.uint8)
        c[PADF + dy:PADF + dy + ch, PADF + dx:PADF + dx + cw] = f
        big.append(c)
    boxes = [bbox(f) for f in big]
    x0 = min(b[0] for b in boxes) - 4; y0 = min(b[1] for b in boxes) - 4
    x1 = max(b[2] for b in boxes) + 5; y1 = max(b[3] for b in boxes) + 5
    fw, fh = int((x1 - x0) * scale), int((y1 - y0) * scale)
    sheet = Image.new("RGB", (fw * len(big), fh))
    for i, c in enumerate(big):
        sheet.paste(Image.fromarray(c[y0:y1, x0:x1]).resize((fw, fh), Image.LANCZOS), (i * fw, 0))
    sheet.save(os.path.join(OUT, name), optimize=True)
    return {"file": name, "frames": len(big), "size": [fw, fh], "origin": [int(x0 - PADF), int(y0 - PADF)], "scale": scale}


def slash():
    fr = frames_4x2("P09A_fx_slash_arc_8frames.png")
    ref = bbox(fr[3]); rx, ry = ref[2], (ref[1] + ref[3]) // 2
    shifts = []
    for f in fr:
        b = bbox(f); shifts.append((int(rx - b[2]), int(ry - (b[1] + b[3]) // 2)))
    info = strip(fr, shifts, 0.5, "fx_slash.png")
    # anchor = middle of the arc's circle: ~55% of the arc's width left of its leading edge
    w = ref[2] - ref[0]
    ax, ay = rx - 0.55 * w, ry
    info["anchor"] = [round((ax - info["origin"][0]) * info["scale"], 1), round((ay - info["origin"][1]) * info["scale"], 1)]
    info["reach"] = round(0.55 * w * info["scale"], 1)   # anchor -> leading edge, px in the strip
    return info


def quake():
    fr = frames_4x2("P09C_fx_ground_shockwave_8frames.png")
    info = strip(fr, [(0, 0)] * len(fr), 0.6, "fx_quake.png")
    info["anchor"] = [round((192 - info["origin"][0]) * info["scale"], 1), round((262 - info["origin"][1]) * info["scale"], 1)]
    return info


def vortex():
    a = np.array(Image.open(os.path.join(RAW, "P09B_fx_water_vortex.png")).convert("RGB"))
    x0, y0, x1, y1 = bbox(a)
    im = Image.fromarray(a[y0:y1 + 1, x0:x1 + 1]); k = 512 / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(os.path.join(OUT, "fx_vortex.png"), optimize=True)
    return {"file": "fx_vortex.png", "size": list(im.size)}


def icons():
    rgb = np.array(Image.open(os.path.join(RAW, "P08B_icons_skills_items.png")).convert("RGB"))
    rgb, alpha = sc.key_to_alpha(rgb, (255, 0, 255), 40, 90)
    alpha = sc.clean_alpha(alpha, 40, 200)
    rgb, alpha = sc.remove_spill(rgb, alpha, (255, 0, 255), 3)
    rgb = sc.defringe(rgb, alpha)
    h, w = alpha.shape; cw, ch = w / 4, h / 4
    out = {}
    for key, (r, c) in {"tide": (0, 0), "quake": (0, 1), "dash": (0, 2), "mend": (0, 3), "potion": (1, 0)}.items():
        y0, y1, x0, x1 = int(r * ch) + 8, int((r + 1) * ch) - 8, int(c * cw) + 8, int((c + 1) * cw) - 8   # inset: no slivers of neighbours
        cell = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]])
        ys, xs = np.nonzero(cell[..., 3] > 8)
        cell = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        im = Image.fromarray(cell); k = 112 / max(im.size)
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        canvas = Image.new("RGBA", (112, 112)); canvas.alpha_composite(im, ((112 - im.width) // 2, (112 - im.height) // 2))
        canvas.save(os.path.join(OUT, f"icon_{key}.png"), optimize=True)
        out[key] = f"icon_{key}.png"
    return out


def main():
    path = os.path.join(OUT, "manifest.json")
    man = json.load(open(path, encoding="utf-8"))
    man["fx"] = {"slash": slash(), "quake": quake(), "vortex": vortex()}
    man["icons"] = icons()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(man, f, indent=1)
    print(json.dumps({"fx": man["fx"], "icons": man["icons"]}, indent=1))


if __name__ == "__main__":
    main()
