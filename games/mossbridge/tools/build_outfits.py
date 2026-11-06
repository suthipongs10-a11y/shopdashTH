#!/usr/bin/env python3
"""
build_outfits.py — ChatGPT outfit sheets (P10*, headless body in the P02A pose) -> rig pieces per outfit.

1. Key each sheet, take each 2x2 cell, place it with the SAME transform as P02A's headless body
   (tools/build_kaelrin_parts.py), then fine-align it to P02A's body: search scale 0.88-1.12 and a
   +-27 px shift that maximise the overlap of the two silhouettes (ChatGPT never places a redraw
   exactly). The per-view result and its overlap score are printed; below ~0.85 the pose differs
   and the rig cuts may not fit (check qa-out/outfits_check.png).
2. Write art/samples/kaelrin/outfits/{id}/body_headless_{view}.png and run the rig cutter
   (build_kaelrin_rig.py, same polygons/joints) into demo/assets/kaelrin_{view}_parts_{id}.png;
   rect/pos per piece go to rigs/kaelrin.json views.{v}.outfits.{id}. List in rig "outfits".
3. Icon: demo/assets/outfit_{id}_icon.png (SW body).

Usage (from games/mossbridge):  python3 tools/build_outfits.py [ids...]     Requires: Pillow, numpy
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import build_kaelrin_parts as kp  # noqa: E402
import build_kaelrin_rig as kr  # noqa: E402

OUTFITS = [  # id, sheet in art/raw, Thai name, exact = painted over P02A with ChatGPT's image edit
    ("ranger", "P10A_outfit_ranger.png", "ชุดพรานป่ามอส", False),
    ("knight", "P10B_outfit_knight.png", "ชุดองครักษ์ทองเหลือง", False),
    # the edit keeps P02A's placement exactly; its slimmer cloth would fool the overlap search
    ("festival", "P10C_outfit_festival.png", "ชุดเทศกาลโคมไฟ", True),
]
BASE_NAME = "ชุดนักผจญภัย (เดิม)"
VIEWS = list(kp.VIEWS)
OUTDIR = os.path.join(kp.OUT, "outfits")


def body_transform():
    p01 = kp.load_keyed(kp.SRC["body_full"])
    s = kp.BODY_HEIGHT / kp.feet_point(kp.cell(p01, "sw")[..., 3])[2]
    offs = {}
    for v in VIEWS:
        F = kp.feet_point(kp.cell(p01, v)[..., 3])[:2]
        offs[v] = (kp.FEET[0] - s * F[0], kp.FEET[1] - s * F[1])
    return s, offs


def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())


def shift(m, dx, dy):
    out = np.zeros_like(m)
    h, w = m.shape
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    out[yd, xd] = m[ys, xs]
    return out


def align(cellimg, s, off, target):
    """best (overlap, scale, dx, dy) placing cellimg like P02A's body so it overlaps `target`
    (bool mask): coarse grid (scale 0.88-1.12, shift +-27 px in 3 px steps), then a fine pass"""
    anchor = kp.FEET
    cache = {}

    def mask(k):
        k = round(float(k), 3)
        if k not in cache:
            o = (anchor[0] + (off[0] - anchor[0]) * k, anchor[1] + (off[1] - anchor[1]) * k)
            cache[k] = kp.place(cellimg, s * k, o, kp.BODY_CANVAS)[..., 3] > 128
        return cache[k]

    best = (-1.0, 1.0, 0, 0)
    for k in np.linspace(0.88, 1.12, 13):
        m = mask(k)
        for dy in range(-27, 28, 3):
            for dx in range(-27, 28, 3):
                v = iou(shift(m, dx, dy), target)
                if v > best[0]:
                    best = (float(v), float(k), dx, dy)
    _, k0, x0, y0 = best
    for k in (k0 - 0.01, k0, k0 + 0.01):
        m = mask(k)
        for dy in range(y0 - 2, y0 + 3):
            for dx in range(x0 - 2, x0 + 3):
                v = iou(shift(m, dx, dy), target)
                if v > best[0]:
                    best = (float(v), float(round(k, 3)), dx, dy)
    return best


def main():
    want = sys.argv[1:] or [o[0] for o in OUTFITS]
    s, offs = body_transform()
    rig = json.load(open(kr.RIG, encoding="utf-8"))
    rig.setdefault("outfits", {"base": {"name": BASE_NAME, "icon": "outfit_base_icon.png"}})
    check = []
    for gid, sheet, name, exact in OUTFITS:
        if gid not in want:
            continue
        path = os.path.join(kp.RAW, sheet)
        if not os.path.exists(path):
            print(f"{gid}: {sheet} not in art/raw yet, skipped"); continue
        img, _ = kp.drop_specks(kp.load_keyed(sheet))
        d = os.path.join(OUTDIR, gid); os.makedirs(d, exist_ok=True)
        row = []
        for v in VIEWS:
            target = np.array(Image.open(kr.SRC.format(v)))[..., 3] > 128
            if exact:
                m = kp.place(kp.cell(img, v), s, offs[v], kp.BODY_CANVAS)[..., 3] > 128
                sc, k, dx, dy = iou(m, target), 1.0, 0, 0
            else:
                sc, k, dx, dy = align(kp.cell(img, v), s, offs[v], target)
            a = kp.FEET
            o = (a[0] + (offs[v][0] - a[0]) * k + dx, a[1] + (offs[v][1] - a[1]) * k + dy)
            body = kp.place(kp.cell(img, v), s * k, o, kp.BODY_CANVAS, f"{gid}_{v}")
            Image.fromarray(body).save(os.path.join(d, f"body_headless_{v}.png"), optimize=True)
            print(f"{gid} {v}: overlap {sc:.3f} scale {k:.3f} shift ({dx},{dy})")
            row.append((body, sc))
        # rig pieces with the base polygons / joints
        for v, V in rig["views"].items():
            ov = {"slots": [dict(x) for x in V["slots"]], "drawOrder": V["drawOrder"], "atlas": f"kaelrin_{v}_parts_{gid}.png"}
            kr.build_view(v, ov, src=os.path.join(d, f"body_headless_{v}.png"))
            V.setdefault("outfits", {})[gid] = {"atlas": ov["atlas"], "slots": {x["name"]: {"rect": x["rect"], "pos": x["pos"]} for x in ov["slots"]}}
        sw = Image.fromarray(row[0][0]); bb = sw.getbbox(); ic = sw.crop(bb); kk = 88 / max(ic.size)
        ic = ic.resize((max(1, round(ic.width * kk)), max(1, round(ic.height * kk))), Image.LANCZOS)
        icon = Image.new("RGBA", (96, 96)); icon.alpha_composite(ic, ((96 - ic.width) // 2, (96 - ic.height) // 2))
        icon.save(os.path.join(kr.OUT, f"outfit_{gid}_icon.png"), optimize=True)
        rig["outfits"][gid] = {"name": name, "icon": f"outfit_{gid}_icon.png"}
        check.append((gid, row))
    # base icon
    sw = Image.open(kr.SRC.format("sw")); bb = sw.getbbox(); ic = sw.crop(bb); kk = 88 / max(ic.size)
    ic = ic.resize((max(1, round(ic.width * kk)), max(1, round(ic.height * kk))), Image.LANCZOS)
    icon = Image.new("RGBA", (96, 96)); icon.alpha_composite(ic, ((96 - ic.width) // 2, (96 - ic.height) // 2))
    icon.save(os.path.join(kr.OUT, "outfit_base_icon.png"), optimize=True)
    with open(kr.RIG, "w", encoding="utf-8") as f:
        f.write(kr.fmt(rig) + "\n")
    if check:  # outfit next to the base body with the base outline, per view
        W = 200; sheet = Image.new("RGB", (W * 8, W * len(check)), (60, 60, 60)); dr = ImageDraw.Draw(sheet)
        for r, (gid, row) in enumerate(check):
            for c, (v, (body, sc)) in enumerate(zip(VIEWS, row)):
                base = Image.open(kr.SRC.format(v)).convert("RGBA")
                for j, im in enumerate((base, Image.fromarray(body))):
                    t = Image.new("RGBA", (320, 320), (225, 225, 225, 255)); t.alpha_composite(im)
                    sheet.paste(t.crop((40, 90, 280, 310)).resize((W, round(W * 220 / 240))).convert("RGB"), ((c * 2 + j) * W, r * W))
                dr.text(((c * 2 + 1) * W + 4, r * W + 4), f"{gid} {v} {sc:.2f}", fill=(200, 0, 0))
        os.makedirs(os.path.join(ROOT, "qa-out"), exist_ok=True)
        sheet.save(os.path.join(ROOT, "qa-out", "outfits_check.png"))


if __name__ == "__main__":
    main()
