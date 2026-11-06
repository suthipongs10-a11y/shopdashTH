#!/usr/bin/env python3
"""
build_kaelrin_parts.py — clean the ChatGPT sheets P01–P03 into Kaelrin's separate parts (reproducible).

Inputs (art/raw/, not committed; names from chatgpt-pack SAVE AS):
  P01_kaelrin_body_empty_hands.png     2x2: SW SE / W NE, full body, empty hands
  P02A_kaelrin_body_headless.png       same 4 views without head (drawn at the same place as P01)
  P02B_kaelrin_head_hair_full.png      4 heads, normal hair
  P02C_kaelrin_head_hair_capped.png    4 heads, hair pressed flat for hats (pixel-aligned with P02B)
  P03_weapon_brass_pickblade.png       weapon pointing down, two sides

Outputs (art/samples/kaelrin/, committed: the raw sheets are not):
  body_full_{view}.png      320x320, feet at (160,300), hero 260 px tall   (reference / fallback)
  body_headless_{view}.png  same canvas and transform as body_full -> overlays it exactly
  head_full_{view}.png      256x256 head canvas, pivot = neck at (128,200), same scale as the body
  head_capped_{view}.png    same canvas and transform as head_full
  weapon_a.png / weapon_b.png  trimmed, blade pointing down; hook on the left (a) / right (b)
  manifest.json             feet, neck point on the body canvas, head pivot, weapon grip/tip
  _preview_dark.jpg / _preview_light.jpg  contact sheets for checking edges by eye

Assembling: draw head_{mode}_{view} with its pivot (128,200) on body_headless_{view} at manifest neck[view].
That reproduces the P01 drawing (head size and position were matched against P01).

How the head numbers were found (2026-11-06, one-off with OpenCV, kept here as constants so this
script only needs Pillow + numpy): P02B heads were template-matched onto the P01 heads (masked
SQDIFF on face pixels). One scale fits all views (P02B draws every head the same size); SW gives
the sharpest minimum at 0.4725. Per-view offsets were then solved at that scale. P02C matched P02B
at scale 1.0 within 1 px. If the raw images are regenerated, these constants must be re-measured.

Usage (from games/mossbridge):  python3 tools/build_kaelrin_parts.py
Requires: Pillow, numpy
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import sprite_clean as sc  # noqa: E402  (key_to_alpha, clean_alpha, defringe)

RAW = os.path.join(ROOT, "art", "raw")
OUT = os.path.join(ROOT, "art", "samples", "kaelrin")

SRC = {
    "body_full": "P01_kaelrin_body_empty_hands.png",
    "body_headless": "P02A_kaelrin_body_headless.png",
    "head_full": "P02B_kaelrin_head_hair_full.png",
    "head_capped": "P02C_kaelrin_head_hair_capped.png",
    "weapon": "P03_weapon_brass_pickblade.png",
}
VIEWS = {"sw": (0, 0), "se": (1, 0), "w": (0, 1), "ne": (1, 1)}  # (col, row) in the 2x2 sheets
KEY = (255, 0, 255)
KEY_TOL = (40, 90)
ALPHA = (40, 200)
EDGE_DESPILL = 3             # px at source res; pink ring on the outline + shaded background pockets

BODY_CANVAS, FEET = (320, 320), (160, 300)
BODY_HEIGHT = 260            # P01 SW figure height on the body canvas (matches demo/assets heroes)
HEAD_CANVAS, NECK_PIVOT = (256, 256), (128, 200)
WEAPON_LENGTH = 150          # pommel-to-tip, px on the body scale (demo weapon is ~150 px)

# P02B cell coords q -> P01 cell coords p = HEAD_K * q + HEAD_T[view]   (see docstring)
HEAD_K = 0.4725
HEAD_T = {"sw": (168.135, 39.1125), "se": (170.1125, 37.1125), "w": (176.07, 37.97), "ne": (141.365, 36.97)}
CAPPED_SHIFT = {"sw": (0, 1), "se": (0, 1), "w": (-1, 0), "ne": (0, 0)}  # P02C q + shift = P02B q


def load_keyed(name):
    rgb = np.array(Image.open(os.path.join(RAW, name)).convert("RGB"))
    rgb, alpha = sc.key_to_alpha(rgb, KEY, *KEY_TOL)
    alpha = sc.clean_alpha(alpha, *ALPHA)
    rgb, alpha = sc.remove_spill(rgb, alpha, KEY, EDGE_DESPILL)
    rgb = sc.defringe(rgb, alpha)
    return np.dstack([rgb, alpha])


def drop_specks(rgba, min_px=60):
    """Remove tiny islands left by background noise."""
    m = rgba[..., 3] > 0
    h, w = m.shape
    lab = np.zeros((h, w), np.int32)
    sizes = [0]
    k = 0
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]:
            continue
        k += 1
        stack = [(y, x)]
        lab[y, x] = k
        n = 0
        while stack:
            cy, cx = stack.pop()
            n += 1
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = k
                    stack.append((ny, nx))
        sizes.append(n)
    keep = np.array([s >= min_px for s in sizes])[lab] & m
    out = rgba.copy()
    out[~keep] = 0
    return out, sum(1 for s in sizes[1:] if s < min_px)


def cell(sheet, view):
    h, w = sheet.shape[:2]
    cw, ch = w // 2, h // 2
    c, r = VIEWS[view]
    return sheet[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]


def place(rgba, scale, offset, canvas, label=""):
    """Draw rgba scaled by `scale` so that source point (0,0) lands at `offset` on a new canvas.
    Sub-pixel accurate, premultiplied LANCZOS (no dark/colored halos)."""
    cw, ch = canvas
    pad = int(max(cw, ch) / scale) + 4
    h, w = rgba.shape[:2]
    big = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.uint8)
    big[pad:pad + h, pad:pad + w] = rgba
    img = Image.fromarray(big).convert("RGBa")
    ox, oy = offset
    box = (pad - ox / scale, pad - oy / scale, pad + (cw - ox) / scale, pad + (ch - oy) / scale)
    out = img.resize((cw, ch), Image.LANCZOS, box=box).convert("RGBA")
    a = np.array(out)
    a[a[..., 3] < 8] = 0  # resampling ringing
    rgb, _ = sc.remove_spill(a[..., :3], a[..., 3], KEY, 1, pocket=None)  # tint on faint edge pixels
    a[..., :3] = rgb
    if a[0, :, 3].any() or a[-1, :, 3].any() or a[:, 0, 3].any() or a[:, -1, 3].any():
        print(f"  ! {label}: content touches the canvas edge")
    return a


def feet_point(alpha):
    ys, xs = np.nonzero(alpha > 128)
    bottom = ys.max() + 1
    band = alpha[bottom - max(3, int((bottom - ys.min()) * 0.06)):bottom] > 128
    return float(np.nonzero(band)[1].mean()), float(bottom), float(bottom - ys.min())


def neck_point(alpha_headless):
    ys, _ = np.nonzero(alpha_headless > 128)
    top = ys.min()
    band = alpha_headless[top:top + 10] > 128
    return float(np.nonzero(band)[1].mean()), float(top)


def weapon_parts(sheet):
    h, w = sheet.shape[:2]
    halves = {"a": sheet[:, :w // 2], "b": sheet[:, w // 2:]}
    ys, _ = np.nonzero(halves["a"][..., 3] > 128)
    scale = WEAPON_LENGTH / (ys.max() + 1 - ys.min())
    out = {}
    for side, half in halves.items():
        alpha = half[..., 3] > 128
        ys, xs = np.nonzero(alpha)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        length = y1 - y0
        # grip = middle of the handle (leather wrap): the longest run of narrow rows between the
        # pommel and the guard. Skip the top 6% so the rounded tip of the pommel is not picked.
        rows = list(range(y0 + int(length * 0.06), y0 + int(length * 0.4)))
        widths = np.array([alpha[y].sum() for y in rows])
        narrow = widths <= widths.min() * 1.15
        best, run = [], []
        for y, ok in zip(rows, narrow):
            run = run + [y] if ok else []
            if len(run) > len(best):
                best = run
        gy = float(np.mean(best))
        gx = float(np.mean([np.nonzero(alpha[y])[0].mean() for y in best]))
        tx, ty = float(np.nonzero(alpha[y1 - 3:y1])[1].mean()), float(y1)
        padpx = 4
        cw = int(np.ceil((x1 - x0) * scale)) + 2 * padpx
        ch = int(np.ceil(length * scale)) + 2 * padpx
        off = (padpx - x0 * scale, padpx - y0 * scale)
        img = place(half, scale, off, (cw, ch), f"weapon_{side}")
        tr = lambda px, py: [round(float(px * scale + off[0]), 1), round(float(py * scale + off[1]), 1)]
        out[side] = {"img": img, "grip": tr(gx, gy), "tip": tr(tx, ty), "size": [cw, ch]}
    return out, scale


def preview(tiles, bg, path):
    pad = 8
    rows = []
    for row in tiles:
        w = sum(t.shape[1] for t in row) + pad * (len(row) + 1)
        hh = max(t.shape[0] for t in row) + 2 * pad
        rows.append((row, w, hh))
    sheet = Image.new("RGBA", (max(r[1] for r in rows), sum(r[2] for r in rows)), bg + (255,))
    y = 0
    for row, _, hh in rows:
        x = pad
        for t in row:
            sheet.alpha_composite(Image.fromarray(t), (x, y + pad))
            x += t.shape[1] + pad
        y += hh
    sheet.convert("RGB").save(path, quality=88, optimize=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    sheets = {}
    for key, name in SRC.items():
        sheets[key], specks = drop_specks(load_keyed(name))
        print(f"{name}: keyed, removed {specks} speck(s)")

    p01 = sheets["body_full"]
    s = BODY_HEIGHT / feet_point(cell(p01, "sw")[..., 3])[2]
    man = {"source": SRC, "body": {"canvas": list(BODY_CANVAS), "feet": list(FEET), "scale": round(s, 5)},
           "head": {"canvas": list(HEAD_CANVAS), "pivot": list(NECK_PIVOT), "scale": round(s * HEAD_K, 5)},
           "views": {}}
    out = {}
    for v in VIEWS:
        F = feet_point(cell(p01, v)[..., 3])[:2]
        off = (FEET[0] - s * F[0], FEET[1] - s * F[1])
        for key in ("body_full", "body_headless"):
            out[f"{key}_{v}"] = place(cell(sheets[key], v), s, off, BODY_CANVAS, f"{key}_{v}")
        N = neck_point(cell(sheets["body_headless"], v)[..., 3])
        neck_on_body = [round(s * (N[0] - F[0]) + FEET[0], 1), round(s * (N[1] - F[1]) + FEET[1], 1)]
        a = s * HEAD_K
        T = HEAD_T[v]
        hoff = (s * (T[0] - N[0]) + NECK_PIVOT[0], s * (T[1] - N[1]) + NECK_PIVOT[1])
        out[f"head_full_{v}"] = place(cell(sheets["head_full"], v), a, hoff, HEAD_CANVAS, f"head_full_{v}")
        sh = CAPPED_SHIFT[v]
        coff = (hoff[0] + a * sh[0], hoff[1] + a * sh[1])
        out[f"head_capped_{v}"] = place(cell(sheets["head_capped"], v), a, coff, HEAD_CANVAS, f"head_capped_{v}")
        man["views"][v] = {"body_full": f"body_full_{v}.png", "body_headless": f"body_headless_{v}.png",
                           "head_full": f"head_full_{v}.png", "head_capped": f"head_capped_{v}.png",
                           "neck": neck_on_body}
        print(f"{v}: feet src ({F[0]:.1f},{F[1]:.0f})  neck on body {neck_on_body}")

    weapons, ws = weapon_parts(sheets["weapon"])
    man["weapon"] = {"scale": round(ws, 5), "note": "blade points down; a = hook on the left, b = hook on the right"}
    for side, d in weapons.items():
        out[f"weapon_{side}"] = d["img"]
        man["weapon"][side] = {"file": f"weapon_{side}.png", "size": d["size"], "grip": d["grip"], "tip": d["tip"]}
        print(f"weapon_{side}: {d['size']} grip {d['grip']} tip {d['tip']}")

    for name, img in out.items():
        Image.fromarray(img).save(os.path.join(OUT, f"{name}.png"), optimize=True)
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(man, f, indent=1)

    def assemble(v, mode):
        body = Image.fromarray(out[f"body_headless_{v}"])
        nx, ny = man["views"][v]["neck"]
        body.alpha_composite(Image.fromarray(out[f"head_{mode}_{v}"]),
                             (round(nx - NECK_PIVOT[0]), round(ny - NECK_PIVOT[1])))
        return np.array(body)

    vs = list(VIEWS)
    tiles = [[out[f"body_full_{v}"] for v in vs], [out[f"body_headless_{v}"] for v in vs],
             [assemble(v, "full") for v in vs], [assemble(v, "capped") for v in vs],
             [out[f"head_full_{v}"] for v in vs] + [out[f"head_capped_{v}"] for v in vs],
             [out["weapon_a"], out["weapon_b"]]]
    preview(tiles, (34, 34, 40), os.path.join(OUT, "_preview_dark.jpg"))
    preview(tiles, (250, 250, 250), os.path.join(OUT, "_preview_light.jpg"))
    print(f"wrote {len(out)} images + manifest.json to {OUT}")


if __name__ == "__main__":
    main()
