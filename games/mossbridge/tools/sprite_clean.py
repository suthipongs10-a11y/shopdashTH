#!/usr/bin/env python3
"""
sprite_clean.py — clean up AI-generated sprite images (ChatGPT etc.) so they can be used in-game.

What it does (in order):
  1. Background -> alpha. If the image has no alpha (or --key is given) the key color
     (default magenta #FF00FF) is turned into transparency with a soft edge + despill.
  2. Alpha cleanup. AI "transparent PNGs" are usually dirty: near-invisible garbage pixels
     (alpha 1..30 with random colors -> red/green halos) and a body that is 94% opaque
     instead of 100%. We cut the low end to 0 and snap the high end to 255.
  3. Defringe. Semi-transparent edge pixels get the color of their nearest opaque neighbours,
     so no colored halo appears when the sprite is scaled or drawn on a dark background.
  4. Slice. Sprites on one sheet are found automatically (connected islands of alpha),
     nearby islands are merged (e.g. a weapon floating next to the hand), sorted row by row.
  5. Fit. Each sprite is scaled to a target content height and placed on a fixed canvas so that
     its bottom-center sits on the anchor point -> every sprite of a class lines up the same way.
  6. Writes one PNG per sprite + manifest.json (bbox, scale, anchor) next to them.

Requires: Pillow, numpy  (pip install pillow numpy)

Examples:
  # The atlas from the reference zip: 8 sprites, body canvas 320x320, feet at (160,300)
  python3 sprite_clean.py ../art/reference/03_sprite_atlas_original.png -o ../art/samples \
      --names hero_se,hero_sw,hero_e,hero_nw,npc_bram,npc_minae,mob_sproutling,mob_mossback \
      --canvas 320x320 --anchor 160,300 --height 260

  # A hat sheet generated on magenta background, head-layer canvas 256x256
  python3 sprite_clean.py hat_witch_sheet.png -o out/ --key "#FF00FF" \
      --names hat_witch_s,hat_witch_n --canvas 256x256 --anchor 128,200 --fit none
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image


# ---------------------------------------------------------------- helpers

def parse_pair(s: str, sep: str) -> tuple[int, int]:
    a, b = s.lower().split(sep)
    return int(a), int(b)


def hex_to_rgb(s: str) -> tuple[int, int, int]:
    s = s.lstrip("#")
    return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)


def key_to_alpha(rgb: np.ndarray, key: tuple[int, int, int], tol_lo: float, tol_hi: float) -> tuple[np.ndarray, np.ndarray]:
    """Soft chroma key. Returns (rgb_despilled, alpha)."""
    k = np.array(key, dtype=np.float32)
    diff = rgb.astype(np.float32) - k
    dist = np.sqrt((diff ** 2).sum(axis=2))
    alpha = np.clip((dist - tol_lo) / max(tol_hi - tol_lo, 1e-3), 0.0, 1.0)
    # despill: remove the key color contribution from partially keyed pixels
    out = rgb.astype(np.float32)
    partial = (alpha > 0) & (alpha < 1)
    a3 = alpha[..., None]
    unmixed = (out - (1 - a3) * k) / np.maximum(a3, 1e-3)
    out[partial] = np.clip(unmixed[partial], 0, 255)
    return out.astype(np.uint8), (alpha * 255).astype(np.uint8)


def clean_alpha(alpha: np.ndarray, lo: int, hi: int) -> np.ndarray:
    a = alpha.astype(np.float32)
    a = np.where(a < lo, 0, a)
    a = np.where(a >= hi, 255, a)
    mid = (a > 0) & (a < 255)
    a[mid] = (a[mid] - lo) / max(hi - lo, 1) * 255  # re-stretch the soft edge
    return np.clip(a, 0, 255).astype(np.uint8)


def defringe(rgb: np.ndarray, alpha: np.ndarray, iterations: int = 3) -> np.ndarray:
    """Give semi/fully transparent pixels the average color of nearby opaque pixels."""
    rgb = rgb.astype(np.float32).copy()
    known = alpha == 255
    rgb[~known] = 0
    for _ in range(iterations):
        acc = np.zeros_like(rgb)
        cnt = np.zeros(alpha.shape, dtype=np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx == 0 and dy == 0:
                    continue
                shifted_known = np.roll(np.roll(known, dy, 0), dx, 1)
                shifted_rgb = np.roll(np.roll(rgb, dy, 0), dx, 1)
                acc += shifted_rgb * shifted_known[..., None]
                cnt += shifted_known
        fill = (~known) & (cnt > 0)
        rgb[fill] = acc[fill] / cnt[fill][:, None]
        known = known | fill
    return np.clip(rgb, 0, 255).astype(np.uint8)


def find_islands(alpha: np.ndarray, down: int, min_area: int, merge_gap: int) -> list[tuple[int, int, int, int]]:
    """Connected components on a downsampled mask. Returns bboxes (x0,y0,x1,y1) in full-res pixels."""
    h, w = alpha.shape
    hs, ws = (h + down - 1) // down, (w + down - 1) // down
    pad = np.zeros((hs * down, ws * down), dtype=bool)
    pad[:h, :w] = alpha > 128
    small = pad.reshape(hs, down, ws, down).any(axis=(1, 3))
    seen = np.zeros_like(small)
    boxes = []
    for sy in range(hs):
        for sx in range(ws):
            if not small[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            x0 = x1 = sx
            y0 = y1 = sy
            n = 0
            while q:
                cy, cx = q.popleft()
                n += 1
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < hs and 0 <= nx < ws and small[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            boxes.append([x0 * down, y0 * down, min((x1 + 1) * down, w), min((y1 + 1) * down, h), n * down * down])

    # merge boxes closer than merge_gap (weapon next to hand, sparkles, etc.)
    merged = True
    while merged:
        merged = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if (a[0] - merge_gap < b[2] and b[0] - merge_gap < a[2] and
                        a[1] - merge_gap < b[3] and b[1] - merge_gap < a[3]):
                    boxes[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]), a[4] + b[4]]
                    boxes.pop(j)
                    merged = True
                    break
            if merged:
                break

    boxes = [b for b in boxes if b[4] >= min_area]
    # sort row by row: bucket by vertical center
    if boxes:
        avg_h = sum(b[3] - b[1] for b in boxes) / len(boxes)
        boxes.sort(key=lambda b: (round(((b[1] + b[3]) / 2) / (avg_h * 0.75)), b[0]))
    return [tuple(b[:4]) for b in boxes]


def tight_bbox(alpha: np.ndarray) -> tuple[int, int, int, int] | None:
    ys, xs = np.nonzero(alpha > 0)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def resize_rgba(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    # premultiplied resize avoids dark/colored halos on the edges
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


# ---------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("-o", "--out", required=True, help="output folder")
    ap.add_argument("--names", default="", help="comma separated names in reading order (row by row)")
    ap.add_argument("--key", default=None, help="background key color, e.g. '#FF00FF'. Auto-used when input has no alpha")
    ap.add_argument("--key-tol", default="40,90", help="soft key tolerance lo,hi (RGB distance)")
    ap.add_argument("--alpha", default="40,200", help="alpha cleanup lo,hi")
    ap.add_argument("--canvas", default="320x320", help="output canvas WxH")
    ap.add_argument("--anchor", default="160,300", help="where the sprite's bottom-center lands on the canvas")
    ap.add_argument("--height", default="260",
                    help="target content height in px (--fit height). One value, or a comma list matching --names")
    ap.add_argument("--fit", choices=["height", "contain", "none"], default="height",
                    help="height: scale to --height | contain: largest that fits canvas | none: keep size")
    ap.add_argument("--merge-gap", type=int, default=24, help="merge islands closer than this many px")
    ap.add_argument("--min-area", type=int, default=2500, help="ignore islands smaller than this (px^2)")
    ap.add_argument("--no-slice", action="store_true", help="treat the whole image as one sprite")
    args = ap.parse_args()

    src = Image.open(args.input)
    has_alpha = src.mode in ("RGBA", "LA") or "transparency" in src.info
    rgba = np.array(src.convert("RGBA"))
    rgb, alpha = rgba[..., :3], rgba[..., 3]

    if args.key or not has_alpha:
        key = hex_to_rgb(args.key or "#FF00FF")
        lo, hi = (float(v) for v in args.key_tol.split(","))
        rgb, alpha = key_to_alpha(rgb, key, lo, hi)

    a_lo, a_hi = (int(v) for v in args.alpha.split(","))
    alpha = clean_alpha(alpha, a_lo, a_hi)
    rgb = defringe(rgb, alpha)

    cw, ch = parse_pair(args.canvas, "x")
    ax, ay = parse_pair(args.anchor, ",")
    names = [n.strip() for n in args.names.split(",") if n.strip()]
    heights = [int(v) for v in args.height.split(",") if v.strip()]

    if args.no_slice:
        boxes = [(0, 0, alpha.shape[1], alpha.shape[0])]
    else:
        boxes = find_islands(alpha, down=4, min_area=args.min_area, merge_gap=args.merge_gap)

    os.makedirs(args.out, exist_ok=True)
    manifest = {"source": os.path.basename(args.input), "canvas": [cw, ch], "anchor": [ax, ay], "sprites": []}
    print(f"found {len(boxes)} sprite(s)")

    for i, (x0, y0, x1, y1) in enumerate(boxes):
        sub_a = alpha[y0:y1, x0:x1]
        tb = tight_bbox(sub_a)
        if tb is None:
            continue
        tx0, ty0, tx1, ty1 = tb
        x0, y0, x1, y1 = x0 + tx0, y0 + ty0, x0 + tx1, y0 + ty1
        piece = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]])
        img = Image.fromarray(piece, "RGBA")
        w, h = img.size

        if args.fit == "height":
            scale = (heights[i] if i < len(heights) else heights[-1]) / h
        elif args.fit == "contain":
            scale = min(cw / w, ay / h)
        else:
            scale = 1.0
        nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
        if (nw, nh) != (w, h):
            img = resize_rgba(img, (nw, nh))

        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        px, py = ax - nw // 2, ay - nh
        canvas.paste(img, (px, py))  # canvas is empty, so a plain paste keeps alpha; clips if too big
        if px < 0 or py < 0 or px + nw > cw:
            print(f"  ! sprite {i} does not fit the canvas ({nw}x{nh}); consider --fit contain or a bigger --canvas")

        name = names[i] if i < len(names) else f"sprite_{i:02d}"
        path = os.path.join(args.out, f"{name}.png")
        canvas.save(path, optimize=True)
        manifest["sprites"].append({
            "name": name, "file": f"{name}.png",
            "source_bbox": [x0, y0, x1, y1], "scale": round(scale, 4),
            "placed": [px, py, nw, nh],
        })
        print(f"  {name}: src {x1 - x0}x{y1 - y0} -> {nw}x{nh} (scale {scale:.3f})")

    with open(os.path.join(args.out, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
