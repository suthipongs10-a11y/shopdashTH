#!/usr/bin/env python3
"""
build_hero_frames.py — ChatGPT animation sheets of Kaelrin -> per-frame sprites for the game (docs/07).

One sheet = one action x one direction, frames in an equal grid read left->right, top->bottom on
flat magenta. File names (chatgpt-pack SAVE AS):  P{nn}{X}_hero_{dir}_{action}{frames}[_{layer}].png
  e.g. P11A_hero_sw_idle4.png, P11B_hero_sw_walk8.png, P11C_hero_sw_attack6.png
  dir    s | sw | w | nw | n          (se, e, ne are mirrored in the game)
  layer  full (default: whole body with head) | body (headless body, from a ChatGPT edit of the full sheet)
  An action with a digit (attack2) needs a dash before the frame count: hero_sw_attack2-6.png

What it does per sheet
  1. magenta -> alpha (same keyer settings as build_kaelrin_parts.py), drop specks
  2. connected figures are assigned to grid cells by their centre, so a sword tip or a hair spike that
     crosses the cell border stays with its own frame
  3. per frame: bbox, height, feet (bottom band centre), head centre (top band), sword tip (end of the
     longest steel-grey piece, farthest from the body), neck (top of the stump, body layer only), and a
     colour histogram compared with P01 (catches a frame whose face / outfit drifted)
  4. alignment (per action, ALIGN): where each frame's ground point is taken from
       x: feet = centre of the feet band, head = centre of the head (+ constant), cell = as drawn in the cell
       y: feet = lowest pixel, row = as drawn, per grid row, cell = as drawn, whole sheet
     ChatGPT's grid is never exact, so "cell" carries its spacing error; QA prints the jitter of each mode
  5. scale: each sheet is scaled so its reference frames (REF_FRAMES) are HEIGHT px tall (idle median),
     because ChatGPT draws every sheet at its own size. A head-size cross-check is printed.

Outputs
  build (default, reads art/raw/):
    demo/assets/kaelrin_{dir}_frames.png   trimmed frames of every action of one direction (atlas)
    demo/sprites/kaelrin.json              per dir/action: frames [{rect, pivot, tip?, neck?}], timing, stride
                                           pivot / tip / neck are pixels inside the frame rect (pivot = ground point)
  QA (always): qa-out/hero_frames/
    {dir}_{action}.gif        the animation at game timing (walk on a moving ground grid: feet must stick)
    {dir}_{action}_sheet.png  frames on the baseline with feet + / tip o / neck x, onion skin, numbers
    report.txt                the numbers below, per frame

Usage (from games/mossbridge)
  python3 tools/build_hero_frames.py                                   # build every hero sheet in art/raw
  python3 tools/build_hero_frames.py --check art/inbox/P11A_hero_sw_idle4.png   # QA only, writes nothing in demo/
  python3 tools/build_hero_frames.py --check some.png --as sw,walk,8   # file name that does not follow the pattern
  python3 tools/build_hero_frames.py --check a.png --grid 4x2          # override the grid
Requires: Pillow, numpy
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import sprite_clean as sc  # noqa: E402

RAW = os.path.join(ROOT, "art", "raw")
ASSETS = os.path.join(ROOT, "demo", "assets")
SPRITES = os.path.join(ROOT, "demo", "sprites")
QA = os.path.join(ROOT, "qa-out", "hero_frames")
REF_BODY = {"full": os.path.join(ROOT, "art", "samples", "kaelrin", "body_full_sw.png"),         # P01 SW: colour reference
            "body": os.path.join(ROOT, "art", "samples", "kaelrin", "body_headless_sw.png")}    # P02A SW

KEY = (255, 0, 255)
KEY_TOL = (40, 90)
ALPHA = (40, 200)
EDGE_DESPILL = 3
MIN_PIECE = 0.002            # pieces smaller than this fraction of the cell area are specks

DIRS = ("s", "sw", "w", "nw", "n")
MIRROR = {"se": "sw", "e": "w", "ne": "nw"}
SCREEN_DIR = {"s": (0, 1), "sw": (-1, 1), "w": (-1, 0), "nw": (-1, -1), "n": (0, -1)}  # facing on screen (game: atan2 on screen)

HEIGHT = 260                 # idle figure height in game px (same as the rig hero)
PAD = 2                      # transparent border around every trimmed frame in the atlas
ATLAS_W = 2048

GRID = {1: (1, 1), 2: (2, 1), 3: (3, 1), 4: (2, 2), 6: (3, 2), 8: (4, 2)}
# frames whose height defines the sheet scale (upright, sword below the head); value = expected
# height relative to the idle stance
REF_FRAMES = {"idle": (None, 1.0), "walk": ((2, 6), 1.0), "attack": ((0,), 1.0), "hurt": ((0,), 1.0),
              "cast": ((0,), 1.0), "die": ((0,), 1.0)}
ALIGN = {"idle": ("feet", "feet"), "walk": ("head", "row"), "attack": ("cell", "cell"),
         "hurt": ("cell", "feet"), "cast": ("feet", "feet"), "die": ("cell", "cell")}
TIMING = {   # docs/07 §4 (idle slowed to a 1.6 s breath, §5.2 asks for 1.5-2 s)
    "idle": {"loop": True, "durations": [0.4, 0.4, 0.4, 0.4]},
    "walk": {"loop": True, "stride": None},          # frames advance with distance, see STRIDE
    "attack": {"loop": False, "durations": [0.08, 0.08, 0.05, 0.12, 0.08, 0.10], "hit": 3, "smear": [2, 3]},
    "hurt": {"loop": False, "durations": [0.08, 0.18]},
    "die": {"loop": False, "durations": [0.12, 0.12, 0.12, 0.6]},
    "cast": {"loop": False, "durations": [0.12, 0.12, 0.12, 0.12]},
}
STRIDE = {}                  # dir -> game px travelled per walk cycle (8 frames); default STRIDE_K * HEIGHT
STRIDE_K = 0.45
WALK_SPEED = 130             # game.js WALK_SPEED (px/s) -> walk GIF timing

NAME_RE = re.compile(r"^P(\d+)([A-Z]?)_hero_(s|sw|w|nw|n)_([a-z]+\d?)-?(\d+)(?:_(full|body))?\.png$", re.I)
NAME_RE_DASH = re.compile(r"^P(\d+)([A-Z]?)_hero_(s|sw|w|nw|n)_([a-z]+\d*)-(\d+)(?:_(full|body))?\.png$", re.I)


# ---------------------------------------------------------------- loading

def parse_name(fname):
    m = NAME_RE_DASH.match(fname) or NAME_RE.match(fname)
    if not m:
        return None
    _, _, d, action, n, layer = m.groups()
    return {"dir": d.lower(), "action": action.lower(), "frames": int(n), "layer": (layer or "full").lower()}


def load_keyed(path):
    rgb = np.array(Image.open(path).convert("RGB"))
    rgb, alpha = sc.key_to_alpha(rgb, KEY, *KEY_TOL)
    alpha = sc.clean_alpha(alpha, *ALPHA)
    rgb, alpha = sc.remove_spill(rgb, alpha, KEY, EDGE_DESPILL)
    rgb = sc.defringe(rgb, alpha)
    return np.dstack([rgb, alpha])


def label(mask, down=2):
    """Connected components (4-neighbour) on a 2x-downsampled mask -> full-res label image, sizes."""
    h, w = mask.shape
    hs, ws = (h + down - 1) // down, (w + down - 1) // down
    pad = np.zeros((hs * down, ws * down), bool)
    pad[:h, :w] = mask
    small = pad.reshape(hs, down, ws, down).any(axis=(1, 3))
    lab = np.zeros((hs, ws), np.int32)
    k = 0
    for y, x in zip(*np.nonzero(small)):
        if lab[y, x]:
            continue
        k += 1
        lab[y, x] = k
        stack = [(y, x)]
        while stack:
            cy, cx = stack.pop()
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < hs and 0 <= nx < ws and small[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = k
                    stack.append((ny, nx))
    full = np.repeat(np.repeat(lab, down, 0), down, 1)[:h, :w] * mask
    sizes = np.bincount(full.ravel(), minlength=k + 1)
    return full, sizes


def split_cells(rgba, cols, rows, n, notes):
    """Figures -> frames in reading order. Returns list of (frame rgba in sheet coords, nominal cell box)."""
    h, w = rgba.shape[:2]
    cw, ch = w / cols, h / rows
    lab, sizes = label(rgba[..., 3] > 0)
    min_px = MIN_PIECE * cw * ch
    owner = np.zeros(len(sizes), np.int32) - 1
    big = [i for i in range(1, len(sizes)) if sizes[i] >= min_px]
    ys, xs = np.nonzero(lab)
    ls = lab[ys, xs]
    cx = np.bincount(ls, weights=xs, minlength=len(sizes)) / np.maximum(sizes, 1)
    cy = np.bincount(ls, weights=ys, minlength=len(sizes)) / np.maximum(sizes, 1)
    dropped = sum(1 for i in range(1, len(sizes)) if sizes[i] < min_px)
    if dropped:
        notes.append(f"dropped {dropped} specks")
    # figures: one big piece each (a detached sword / hair spike is a small piece that joins the nearest figure)
    seeds = [i for i in big if sizes[i] >= 0.3 * max(sizes[j] for j in big)] if big else []
    if len(seeds) == n:
        seeds.sort(key=lambda i: cy[i])
        order = []
        for r in range(rows):
            order += sorted(seeds[r * cols:(r + 1) * cols], key=lambda i: cx[i])
        boxes = {}
        for i in order:
            yy, xx = np.nonzero(lab == i)
            boxes[i] = (xx.min(), yy.min(), xx.max() + 1, yy.max() + 1)
        for idx, i in enumerate(order):
            owner[i] = idx
            r, c = divmod(idx, cols)
            if not (c * cw <= cx[i] < (c + 1) * cw and r * ch <= cy[i] < (r + 1) * ch):
                notes.append(f"! frame {idx + 1}: figure is not inside its grid cell (irregular grid; 'cell' alignment unreliable)")
        for i in big:
            if owner[i] < 0:
                dist = lambda s: math.hypot(max(boxes[s][0] - cx[i], 0, cx[i] - boxes[s][2]),  # noqa: E731
                                            max(boxes[s][1] - cy[i], 0, cy[i] - boxes[s][3]))
                owner[i] = order.index(min(order, key=dist))
    else:   # figures touch each other or ChatGPT drew a different count: fall back to cells by centre
        notes.append(f"! found {len(seeds)} figures for {n} frames: pieces assigned to grid cells by their centre")
        for i in big:
            owner[i] = min(int(cy[i] // ch), rows - 1) * cols + min(int(cx[i] // cw), cols - 1)
    frames = []
    for idx in range(n):
        r, c = divmod(idx, cols)
        box = (c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)
        ids = [i for i in big if owner[i] == idx]
        m = np.isin(lab, ids) if ids else np.zeros((h, w), bool)
        f = rgba.copy()
        f[~m] = 0
        if not ids:
            notes.append(f"! frame {idx + 1}: empty cell")
        else:
            main = max(ids, key=lambda i: sizes[i])
            if sum(sizes[i] >= 0.25 * sizes[main] for i in ids) > 1:
                notes.append(f"! frame {idx + 1}: {len(ids)} large pieces in one cell (two figures? sword cut off?)")
            yy, xx = np.nonzero(m)
            over = max(box[0] - xx.min(), xx.max() + 1 - box[2], box[1] - yy.min(), yy.max() + 1 - box[3])
            if over > 4:
                notes.append(f"frame {idx + 1}: crosses its cell border by {over:.0f} px (kept with this frame)")
        frames.append((f, box))
    return frames


# ---------------------------------------------------------------- measuring

def steel_mask(rgb, alpha):
    f = rgb.astype(np.float32)
    mx, mn = f.max(2), f.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    return (alpha > 200) & (sat < 0.18) & (mx > 70) & (mx < 245)


def hist(rgb, alpha):
    """hue x value histogram of the coloured (non-grey) opaque pixels, normalised"""
    f = rgb.astype(np.float32) / 255
    mx, mn = f.max(2), f.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    sel = (alpha > 200) & (sat >= 0.18)
    r, g, b = f[..., 0][sel], f[..., 1][sel], f[..., 2][sel]
    mxs, mns = mx[sel], mn[sel]
    d = np.maximum(mxs - mns, 1e-3)
    hue = np.where(mxs == r, ((g - b) / d) % 6, np.where(mxs == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    hb = np.minimum((hue * 18).astype(int), 17)
    vb = np.minimum((mxs * 4).astype(int), 3)
    hgr = np.bincount(hb * 4 + vb, minlength=72).astype(np.float64)
    return hgr / max(hgr.sum(), 1)


def measure(rgba, box, layer):
    a = rgba[..., 3]
    ys, xs = np.nonzero(a > 128)
    if len(xs) == 0:
        return None
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    hgt = y1 - y0
    band = a[y1 - max(3, int(hgt * 0.05)):y1] > 128
    feet_x = float(np.nonzero(band)[1].mean())
    st = steel_mask(rgba[..., :3], a)
    body = (a > 128) & ~st
    by, bx = np.nonzero(body)
    body_c = (float(bx.mean()), float(by.mean())) if len(bx) else ((x0 + x1) / 2, (y0 + y1) / 2)
    # head: top 28% of the non-steel figure (a raised sword is steel, so it does not pull the head)
    btop = by.min() if len(by) else y0
    hb = body[btop:btop + int(hgt * 0.28)]
    hy, hx = np.nonzero(hb)
    head = (float(hx.mean()), float(btop + hy.mean())) if len(hx) else body_c
    head_area = int(hb.sum())
    # sword tip: the largest steel piece, its pixel farthest from the body centre
    tip = None
    if st.sum() > 40:
        lab, sizes = label(st, down=1)
        if len(sizes) > 1:
            i = int(np.argmax(sizes[1:]) + 1)
            if sizes[i] >= 150:
                py, px = np.nonzero(lab == i)
                d = (px - body_c[0]) ** 2 + (py - body_c[1]) ** 2
                j = int(np.argmax(d))
                tip = (float(px[j]), float(py[j]))
    neck = None
    if layer == "body":
        band = a[y0:y0 + 10] > 128
        neck = (float(np.nonzero(band)[1].mean()), float(y0))
    return {"bbox": (int(x0), int(y0), int(x1), int(y1)), "h": int(hgt), "feet_x": feet_x, "bottom": float(y1),
            "head": head, "head_area": head_area, "tip": tip, "neck": neck, "cell": box,
            "hist": hist(rgba[..., :3], a)}


def hist_dist(a, b):
    return float(1 - np.minimum(a, b).sum())


# ---------------------------------------------------------------- one sheet

def process(path, meta, grid=None, ref_hist=None):
    notes = []
    sheet = load_keyed(path)
    n = meta["frames"]
    cols, rows = grid or GRID.get(n, (n, 1))
    if cols * rows < n:
        raise SystemExit(f"{path}: grid {cols}x{rows} has fewer cells than {n} frames")
    cells = split_cells(sheet, cols, rows, n, notes)
    ms = [measure(f, box, meta["layer"]) for f, box in cells]
    if any(m is None for m in ms):
        raise SystemExit(f"{path}: empty frame(s) {[i + 1 for i, m in enumerate(ms) if m is None]} — check the grid")
    act = meta["action"]

    # --- scale: reference frames -> HEIGHT * expected
    ref, expect = REF_FRAMES.get(act, (None, 1.0))
    ref = [i for i in (ref if ref is not None else range(n)) if i < n]
    ref_h = float(np.median([ms[i]["h"] for i in ref]))
    scale = HEIGHT * expect / ref_h

    # --- alignment: ground point of every frame in sheet coordinates
    xmode, ymode = ALIGN.get(act, ("cell", "cell"))
    feet = np.array([m["feet_x"] for m in ms])
    bottom = np.array([m["bottom"] for m in ms])
    headx = np.array([m["head"][0] for m in ms])
    cx0 = np.array([m["cell"][0] for m in ms])
    cy0 = np.array([m["cell"][1] for m in ms])
    rowi = np.array([i // cols for i in range(n)])
    gx = {"feet": feet, "head": headx + np.median(feet - headx), "cell": cx0 + np.median(feet - cx0)}
    gy = {"feet": bottom, "cell": cy0 + np.median(bottom - cy0),
          "row": np.array([cy0[i] + np.median((bottom - cy0)[rowi == rowi[i]]) for i in range(n)])}
    ax, ay = gx[xmode], gy[ymode]

    # jitter report: how far each mode's ground point is from the chosen one (game px)
    jit = {f"x:{k}": float(np.abs(v - ax).max() * scale) for k, v in gx.items()}
    jit.update({f"y:{k}": float(np.abs(v - ay).max() * scale) for k, v in gy.items()})

    # --- consistency checks
    hs = np.array([m["h"] for m in ms]) * scale
    if act == "idle" and hs.max() - hs.min() > HEIGHT * 0.04:
        notes.append(f"! idle height varies {hs.min():.0f}-{hs.max():.0f} px (> 4%): the breath will pump")
    # (not walk: in a diagonal view the lowest foot changes height on screen by design)
    if act in ("idle", "cast") and np.abs(bottom - ay).max() * scale > 6:
        notes.append(f"! feet leave the ground line by up to {np.abs(bottom - ay).max() * scale:.0f} px")
    if ref_hist is not None:
        for i, m in enumerate(ms):
            m["color"] = hist_dist(m["hist"], ref_hist)
        worst = max(range(n), key=lambda i: ms[i]["color"])
        if ms[worst]["color"] > COLOR_WARN:
            notes.append(f"! frame {worst + 1} colours differ from P01 ({ms[worst]['color']:.2f} > {COLOR_WARN}): face/outfit drift?")
    if meta["layer"] == "full" and act in ("idle", "walk", "attack"):
        missing = [i + 1 for i, m in enumerate(ms) if m["tip"] is None]
        if missing:
            notes.append(f"! no sword found in frame(s) {missing}")

    # --- frames scaled, trimmed, ground point -> pivot
    frames = []
    for i, ((f, _), m) in enumerate(zip(cells, ms)):
        x0, y0, x1, y1 = m["bbox"]
        crop = f[y0:y1, x0:x1]
        w = max(1, round((x1 - x0) * scale))
        h = max(1, round((y1 - y0) * scale))
        img = Image.fromarray(crop).convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")
        arr = np.array(img)
        arr[arr[..., 3] < 8] = 0
        arr = np.pad(arr, ((PAD, PAD), (PAD, PAD), (0, 0)))
        sx, sy = w / (x1 - x0), h / (y1 - y0)
        to_local = lambda p: (round(float((p[0] - x0) * sx + PAD), 1), round(float((p[1] - y0) * sy + PAD), 1))  # noqa: E731
        fr = {"img": arr, "pivot": to_local((ax[i], ay[i]))}
        if m["tip"]:
            fr["tip"] = to_local(m["tip"])
        if m["neck"]:
            fr["neck"] = to_local(m["neck"])
        frames.append(fr)
    return {"meta": meta, "grid": (cols, rows), "scale": scale, "src_ref_h": ref_h, "ms": ms, "frames": frames,
            "align": (xmode, ymode), "jitter": jit, "notes": notes, "head_area": float(np.median([ms[i]["head_area"] for i in ref])) * scale * scale}


COLOR_WARN = 0.25           # P01 vs its own other views 0.02-0.11, vs a P10 outfit 0.47-0.51


# ---------------------------------------------------------------- QA images

BG = (92, 110, 84)
GROUND = (70, 86, 62)
DOT = (150, 168, 132)


def compose(frames, idx, size, origin, offset=(0, 0)):
    """frame idx drawn with its pivot at origin+offset on an RGBA canvas"""
    can = Image.new("RGBA", size, (0, 0, 0, 0))
    fr = frames[idx]
    px, py = fr["pivot"]
    can.alpha_composite(Image.fromarray(fr["img"]), (round(origin[0] + offset[0] - px), round(origin[1] + offset[1] - py)))
    return can


def extent(frames):
    l = max(fr["pivot"][0] for fr in frames) + 10
    r = max(fr["img"].shape[1] - fr["pivot"][0] for fr in frames) + 10
    t = max(fr["pivot"][1] for fr in frames) + 10
    b = max(fr["img"].shape[0] - fr["pivot"][1] for fr in frames) + 30
    return int(l), int(r), int(t), int(b)


def qa_sheet(res, path):
    frames, n = res["frames"], len(res["frames"])
    l, r, t, b = extent(frames)
    cw, chh = l + r, t + b
    cols = n + 1
    out = Image.new("RGB", (cw * cols, chh + 70), BG)
    d = ImageDraw.Draw(out)
    for i in range(n + 1):
        ox = i * cw
        d.line([(ox, t), (ox + cw, t)], fill=GROUND, width=2)
        if i < n:
            out.paste(compose(frames, i, (cw, chh), (l, t)), (ox, 0), compose(frames, i, (cw, chh), (l, t)))
            fr = frames[i]
            px, py = fr["pivot"]
            d.line([(ox + l - 8, t), (ox + l + 8, t)], fill=(255, 255, 255), width=1)
            d.line([(ox + l, t - 8), (ox + l, t + 8)], fill=(255, 255, 255), width=1)
            for key, col in (("tip", (255, 220, 60)), ("neck", (255, 80, 80))):
                if key in fr:
                    qx, qy = ox + l + fr[key][0] - px, t + fr[key][1] - py
                    d.ellipse([qx - 4, qy - 4, qx + 4, qy + 4], outline=col, width=2)
            m = res["ms"][i]
            txt = f"{i + 1}  h{m['h'] * res['scale']:.0f}"
            if "color" in m:
                txt += f"  c{m['color']:.2f}"
            d.text((ox + 6, chh + 4), txt, fill=(255, 255, 255))
        else:   # onion skin of every frame
            on = Image.new("RGBA", (cw, chh), (0, 0, 0, 0))
            for j in range(n):
                f = compose(frames, j, (cw, chh), (l, t))
                arr = np.array(f)
                arr[..., 3] = arr[..., 3] // max(2, n // 2)
                on.alpha_composite(Image.fromarray(arr))
            out.paste(on, (ox, 0), on)
            d.text((ox + 6, chh + 4), "onion", fill=(255, 255, 255))
    meta = res["meta"]
    d.text((6, chh + 24), f"{meta['dir']} {meta['action']} x{n}  grid {res['grid'][0]}x{res['grid'][1]}  scale {res['scale']:.3f}"
           f"  align {res['align'][0]}/{res['align'][1]}", fill=(255, 255, 255))
    d.text((6, chh + 42), "  ".join(f"{k} {v:.0f}" for k, v in res["jitter"].items()), fill=(220, 230, 210))
    out.save(path)


def qa_gif(res, path, stride):
    frames, meta = res["frames"], res["meta"]
    act, n = meta["action"], len(res["frames"])
    l, r, t, b = extent(frames)
    W, H = max(l + r, 360), t + b + 20
    origin = (W / 2, t + 10)
    tim = TIMING.get(act, {})
    if act == "walk":
        dt = stride / n / WALK_SPEED
        durs = [dt] * n
    else:
        durs = tim.get("durations") or [0.1] * n
    loops = 2 if tim.get("loop") else 1
    fx, fy = SCREEN_DIR[meta["dir"]]
    fl = math.hypot(fx, fy)
    fx, fy = fx / fl, fy / fl
    imgs, ms_ = [], []
    travelled = 0.0
    for _ in range(loops):
        for i in range(n):
            bg = Image.new("RGBA", (W, H), BG + (255,))
            d = ImageDraw.Draw(bg)
            if act == "walk":   # ground dots move backward under the feet at the walking speed
                sp = 40
                ox = (-fx * travelled) % sp
                oy = (-fy * travelled) % sp
                for gy in range(-1, H // sp + 2):
                    for gx_ in range(-1, W // sp + 2):
                        x = gx_ * sp + ox
                        y = gy * sp + oy
                        if y > origin[1] - 70:
                            d.ellipse([x - 3, y - 2, x + 3, y + 2], fill=DOT)
                travelled += stride / n
            else:
                d.line([(0, origin[1]), (W, origin[1])], fill=GROUND, width=2)
            bg.alpha_composite(compose(frames, i, (W, H), origin))
            imgs.append(bg.convert("RGB"))
            ms_.append(max(20, round(durs[i] * 1000 if i < len(durs) else 100)))
    if not tim.get("loop"):   # hold the last frame, then the first, so a one-shot reads as one
        imgs.append(imgs[-1]); ms_.append(500)
        imgs.append(imgs[0]); ms_.append(400)
    imgs[0].save(path, save_all=True, append_images=imgs[1:], duration=ms_, loop=0, optimize=True)


# ---------------------------------------------------------------- atlas

def pack(entries):
    """shelf packing; entries: list of (key, img). Returns size, {key: (x, y)}"""
    order = sorted(range(len(entries)), key=lambda i: -entries[i][1].shape[0])
    x = y = shelf = 0
    pos = {}
    for i in order:
        k, img = entries[i]
        h, w = img.shape[:2]
        if x + w > ATLAS_W:
            x, y, shelf = 0, y + shelf, 0
        pos[k] = (x, y)
        x += w
        shelf = max(shelf, h)
    W = ATLAS_W if y > 0 else x
    return (W, y + shelf), pos


def write_dir(d, results):
    entries = [((a, i), fr["img"]) for a, res in results.items() for i, fr in enumerate(res["frames"])]
    (W, H), pos = pack(entries)
    atlas = np.zeros((H, W, 4), np.uint8)
    for (k, img) in entries:
        x, y = pos[k]
        atlas[y:y + img.shape[0], x:x + img.shape[1]] = img
    fname = f"kaelrin_{d}_frames.png"
    Image.fromarray(atlas).save(os.path.join(ASSETS, fname), optimize=True)
    out = {"atlas": fname, "size": [W, H], "actions": {}}
    for a, res in results.items():
        frs = []
        for i, fr in enumerate(res["frames"]):
            x, y = pos[(a, i)]
            e = {"rect": [x, y, fr["img"].shape[1], fr["img"].shape[0]], "pivot": list(fr["pivot"])}
            for k in ("tip", "neck"):
                if k in fr:
                    e[k] = list(fr[k])
            frs.append(e)
        act = res["meta"]["action"]
        t = dict(TIMING.get(act, {"loop": False, "durations": [0.1] * len(frs)}))
        if act == "walk":
            t["stride"] = STRIDE.get(d, round(STRIDE_K * HEIGHT))
        out["actions"][a] = {**t, "layer": res["meta"]["layer"], "source": res["meta"]["file"], "frames": frs}
    return out


# ---------------------------------------------------------------- main

def report_lines(res):
    m0 = res["meta"]
    L = [f"== {m0['file']}  ({m0['dir']} {m0['action']} x{m0['frames']}, {m0['layer']})",
         f"   grid {res['grid'][0]}x{res['grid'][1]}  source ref height {res['src_ref_h']:.0f} px -> scale {res['scale']:.4f}"
         f"  head area {res['head_area']:.0f} px2  align x:{res['align'][0]} y:{res['align'][1]}",
         "   jitter vs chosen (px): " + "  ".join(f"{k} {v:.1f}" for k, v in res["jitter"].items())]
    for i, m in enumerate(res["ms"]):
        s = res["scale"]
        L.append(f"   {i + 1}: h {m['h'] * s:5.1f}  w {(m['bbox'][2] - m['bbox'][0]) * s:5.1f}  "
                 f"pivot {res['frames'][i]['pivot']}  tip {res['frames'][i].get('tip')}"
                 + (f"  neck {res['frames'][i].get('neck')}" if m["neck"] else "")
                 + (f"  colour {m['color']:.3f}" if "color" in m else ""))
    L += ["   " + x for x in res["notes"]] or ["   ok"]
    return L


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", nargs="+", help="QA these sheets only (nothing written to demo/)")
    ap.add_argument("--as", dest="as_", help="dir,action,frames[,layer] for a file name that does not parse")
    ap.add_argument("--grid", help="COLSxROWS override")
    ap.add_argument("--src", default=RAW, help="folder to build from (default art/raw)")
    args = ap.parse_args()
    os.makedirs(QA, exist_ok=True)
    grid = tuple(int(v) for v in args.grid.lower().split("x")) if args.grid else None

    ref_hist = {}
    for layer, path in REF_BODY.items():
        if os.path.exists(path):
            r = np.array(Image.open(path).convert("RGBA"))
            ref_hist[layer] = hist(r[..., :3], r[..., 3])

    if args.check:
        paths = args.check
    else:
        paths = [os.path.join(args.src, f) for f in sorted(os.listdir(args.src)) if parse_name(f)]
        if not paths:
            print(f"no hero sheets (P..._hero_{{dir}}_{{action}}{{n}}.png) in {args.src}")
            return 1
    results = []
    for p in paths:
        meta = parse_name(os.path.basename(p))
        if args.as_:
            parts = args.as_.split(",")
            meta = {"dir": parts[0], "action": parts[1], "frames": int(parts[2]), "layer": parts[3] if len(parts) > 3 else "full"}
        if not meta:
            print(f"skip {p}: name does not match P.._hero_{{dir}}_{{action}}{{n}}.png (use --as)")
            continue
        meta["file"] = os.path.basename(p)
        res = process(p, meta, grid, ref_hist.get(meta["layer"]))
        results.append(res)

    # every sheet gets its own scale from its reference frames (ChatGPT draws each sheet at its own
    # size); the head size is an independent check that the sheets of one direction + layer agree
    lines = []
    for res in results:
        lines += report_lines(res)
    for d in DIRS:
        for layer in ("full", "body"):
            same = [r for r in results if r["meta"]["dir"] == d and r["meta"]["layer"] == layer]
            idle = [r for r in same if r["meta"]["action"] == "idle"]
            for r in same:
                if not idle or r is idle[0]:
                    continue
                ratio = math.sqrt(r["head_area"] / max(idle[0]["head_area"], 1))
                msg = f"{r['meta']['file']}: head size vs idle {ratio:.3f}"
                if abs(ratio - 1) > 0.06:
                    msg += "  ! the sheet scale may be off (reference frames not upright?)"
                lines.append(msg)

    for res in results:
        m0 = res["meta"]
        base = f"{m0['dir']}_{m0['action']}" + ("" if m0["layer"] == "full" else f"_{m0['layer']}")
        qa_sheet(res, os.path.join(QA, base + "_sheet.png"))
        qa_gif(res, os.path.join(QA, base + ".gif"), STRIDE.get(m0["dir"], STRIDE_K * HEIGHT))

    with open(os.path.join(QA, "report.txt"), "w") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"QA -> {os.path.relpath(QA, ROOT)}/")

    if args.check:
        return 0
    os.makedirs(SPRITES, exist_ok=True)
    data = {"version": 1, "height": HEIGHT, "mirror": MIRROR, "screenDir": SCREEN_DIR, "dirs": {}}
    for d in DIRS:
        per = {}
        for res in results:
            if res["meta"]["dir"] == d:
                key = res["meta"]["action"] + ("" if res["meta"]["layer"] == "full" else "_" + res["meta"]["layer"])
                per[key] = res
        if per:
            data["dirs"][d] = write_dir(d, per)
    with open(os.path.join(SPRITES, "kaelrin.json"), "w") as f:
        json.dump(data, f, indent=1)
    print(f"wrote demo/sprites/kaelrin.json + {len(data['dirs'])} atlas(es) in demo/assets/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
