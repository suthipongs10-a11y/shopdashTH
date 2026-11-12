"""Turns raw AI-generated art (see art/_brief/) into the files the game reads.

Usage, from game/:
    python3 tools/import_sprites.py <folder with the raw PNGs> [--preview <folder>]

What it does per sprite sheet:
  1. Removes the background. Sheets with a mostly transparent background are cut on alpha;
     sheets with an opaque or hazy background are cut by flood-filling the light background
     from the edges (the dark character outline stops the fill).
  2. Finds every separate piece of the character, assigns each piece to a grid cell by its
     centre, and isolates each frame (so a neighbouring frame's sword cannot leak in).
  3. Scales all frames of a character to the same body height, puts the feet on one baseline
     and centres the feet horizontally. Hop frames keep their lift above the ground.
  4. Writes <anim>.png (5 direction rows x N frame columns, 256 px cells) and sheet.cfg.
Also copies the ground painting and slices the skill icon sheet.

Requires numpy, scipy and Pillow.
"""

import argparse
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

GAME_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
CELL = 256
FEET_FROM_BOTTOM = 26
BASELINE = CELL - FEET_FROM_BOTTOM
ROWS = 5
MIN_PIECE_AREA = 40

# fig_h: body height inside a 256 px cell. screen_h: body height on screen in game pixels.
# scale: optional per-animation multiplier when a sheet was drawn at a different body size.
CHARACTERS = {
    "warden": {
        "out": "art/characters/warden",
        "fig_h": 196,
        "screen_h": 118,
        "anims": {
            "idle": {"file": "warden_idle.png", "fps": 5},
            "walk": {"file": "warden_walk_row{row}.png", "fps": 9},
            "attack": {"file": "warden_attack.png", "fps": 14},
        },
    },
    "golem": {
        "out": "art/monsters/golem",
        "fig_h": 186,
        "screen_h": 132,
        "anims": {
            "walk": {"file": "golem_walk_row{row}.png", "fps": 6},
            "attack": {"file": "golem_attack.png", "fps": 4.5},
        },
        "idle_from": ("walk", 1),
    },
    "imp": {
        "out": "art/monsters/imp",
        "fig_h": 170,
        "screen_h": 74,
        "anims": {
            "walk": {"file": "imp_walk.png", "fps": 8},
            "attack": {"file": "imp_attack.png", "fps": 7},
        },
        "idle_from": ("walk", 0),
    },
}

ICON_NAMES = ["attack", "wave", "bash", "ring", "judgment", "potion"]


def load_rgba(path: str) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def foreground_mask(img: np.ndarray, cols: int, rows: int) -> np.ndarray:
    """Boolean mask of character pixels."""
    alpha = img[..., 3]
    if (alpha < 40).mean() > 0.3:
        mask = alpha >= 128
    else:
        # Opaque or hazy background: flood-fill light, unsaturated pixels from the borders.
        rgb = img[..., :3].astype(np.int16)
        # Light background plus the soft grey shadow that some sheets paint around the figure;
        # the fill stops at the character's dark outline.
        light = rgb.min(axis=2) > 140
        grey = (rgb.max(axis=2) - rgb.min(axis=2)) < 40
        bg_like = light & grey
        labels, _ = ndimage.label(bg_like)
        h, w = bg_like.shape
        seeds = set(np.unique(labels[0, :])) | set(np.unique(labels[-1, :]))
        seeds |= set(np.unique(labels[:, 0])) | set(np.unique(labels[:, -1]))
        # Grid lines between cells are background too.
        for c in range(1, cols):
            seeds |= set(np.unique(labels[:, int(w * c / cols)]))
        for r in range(1, rows):
            seeds |= set(np.unique(labels[int(h * r / rows), :]))
        seeds.discard(0)
        mask = ~np.isin(labels, list(seeds))
    mask = ndimage.binary_opening(mask, iterations=1)
    return mask


def split_frames(img: np.ndarray, cols: int, rows: int) -> list:
    """Returns [[(rgba crop, bottom offset within cell, cell height), ...] per row]."""
    mask = foreground_mask(img, cols, rows)
    labels, count = ndimage.label(mask, structure=np.ones((3, 3)))
    h, w = mask.shape
    cell_w, cell_h = w / cols, h / rows
    owner = {}
    for idx, sl in enumerate(ndimage.find_objects(labels), start=1):
        if sl is None:
            continue
        piece = labels[sl] == idx
        if piece.sum() < MIN_PIECE_AREA:
            continue
        cy, cx = ndimage.center_of_mass(piece)
        cy += sl[0].start
        cx += sl[1].start
        owner[idx] = (min(rows - 1, int(cy // cell_h)), min(cols - 1, int(cx // cell_w)))
    alpha_src = img[..., 3].astype(np.float32)
    soft = (alpha_src < 40).mean() <= 0.3
    out = []
    for r in range(rows):
        row = []
        for c in range(cols):
            ids = [i for i, rc in owner.items() if rc == (r, c)]
            if not ids:
                raise SystemExit(f"empty cell row {r + 1} frame {c + 1}")
            cell_mask = np.isin(labels, ids)
            ys, xs = np.nonzero(cell_mask)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            crop = img[y0:y1, x0:x1].copy()
            m = cell_mask[y0:y1, x0:x1]
            if soft:
                # Hard cut with a one-pixel feathered edge.
                inner = ndimage.binary_erosion(m, iterations=1)
                a = np.where(inner, 255, np.where(m, 150, 0))
            else:
                grown = ndimage.binary_dilation(m, iterations=1)
                a = np.where(grown, crop[..., 3], 0)
                a = np.where(a < 40, 0, a)
            crop[..., 3] = a.astype(np.uint8)
            bottom_in_cell = y1 - r * cell_h
            row.append((crop, bottom_in_cell, cell_h))
        out.append(row)
    return out


def load_anim(src: str, spec: dict) -> list:
    """Frames as rows x cols of (crop, bottom_in_cell, cell_h)."""
    name = spec["file"]
    if "{row}" in name:
        rows = []
        for r in range(1, ROWS + 1):
            path = os.path.join(src, name.format(row=r))
            img = load_rgba(path)
            rows.append(split_frames(img, 4, 1)[0])
        return rows
    img = load_rgba(os.path.join(src, name))
    return split_frames(img, 4, ROWS)


def feet_center_x(crop: np.ndarray) -> float:
    a = crop[..., 3] > 0
    h = a.shape[0]
    band = a[int(h * 0.82):, :]
    xs = np.nonzero(band)[1]
    if xs.size == 0:
        xs = np.nonzero(a)[1]
    return float(np.median(xs))


def compose(frames: list, fig_h: int, multiplier: float = 1.0) -> tuple:
    heights = [crop.shape[0] for row in frames for crop, _, _ in row]
    scale = fig_h / float(np.median(heights)) * multiplier
    cols = max(len(row) for row in frames)
    sheet = Image.new("RGBA", (CELL * cols, CELL * len(frames)), (0, 0, 0, 0))
    clipped = 0
    for r, row in enumerate(frames):
        ground = max(b for _, b, _ in row)
        for c, (crop, bottom, cell_h) in enumerate(row):
            lift = ground - bottom
            if lift < 0.035 * cell_h:
                lift = 0.0
            im = Image.fromarray(crop, "RGBA").convert("RGBa")
            nw = max(1, round(im.width * scale))
            nh = max(1, round(im.height * scale))
            im = im.resize((nw, nh), Image.LANCZOS).convert("RGBA")
            fx = feet_center_x(np.array(im))
            x = round(c * CELL + CELL / 2 - fx)
            y = round(r * CELL + BASELINE - nh - lift * scale)
            if y < r * CELL or x < c * CELL or x + nw > (c + 1) * CELL:
                clipped += 1
            # Plain paste into an empty cell copies RGBA as-is and clips at the cell edges.
            cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
            cell.paste(im, (x - c * CELL, y - r * CELL))
            sheet.paste(cell, (c * CELL, r * CELL))
    return sheet, scale, clipped


def write_cfg(out_dir: str, screen_h: int, fig_h: int, fps: dict) -> None:
    lines = [
        "[sheet]",
        f"directions={ROWS}",
        f"cell_width={CELL}",
        f"cell_height={CELL}",
        f"scale={screen_h / fig_h:.4f}",
        f"feet_from_bottom={FEET_FROM_BOTTOM}",
        f"body_height={fig_h}",
        "",
        "[fps]",
    ] + [f"{k}={v}" for k, v in fps.items()]
    with open(os.path.join(out_dir, "sheet.cfg"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def preview(sheet: Image.Image, path: str) -> None:
    bg = Image.new("RGBA", sheet.size, (110, 100, 95, 255))
    d = ImageDraw.Draw(bg)
    for r in range(sheet.height // CELL):
        y = r * CELL + BASELINE
        d.line([0, y, sheet.width, y], fill=(80, 200, 255, 255), width=1)
    for c in range(sheet.width // CELL + 1):
        d.line([c * CELL, 0, c * CELL, sheet.height], fill=(255, 80, 80, 255), width=1)
    bg.alpha_composite(sheet)
    bg.convert("RGB").save(path, quality=88)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--preview")
    args = ap.parse_args()
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)

    for key, ch in CHARACTERS.items():
        out_dir = os.path.join(GAME_DIR, ch["out"])
        os.makedirs(out_dir, exist_ok=True)
        fps = {}
        built = {}
        for anim, spec in ch["anims"].items():
            frames = load_anim(args.src, spec)
            sheet, scale, clipped = compose(frames, ch["fig_h"], spec.get("scale", 1.0))
            sheet.save(os.path.join(out_dir, f"{anim}.png"))
            built[anim] = sheet
            fps[anim] = spec["fps"]
            note = f" ({clipped} frames touch the cell edge)" if clipped else ""
            print(f"{key}/{anim}.png  scale {scale:.3f}{note}")
            if args.preview:
                preview(sheet, os.path.join(args.preview, f"{key}_{anim}.jpg"))
        if "idle_from" in ch:
            anim, col = ch["idle_from"]
            src_sheet = built[anim]
            idle = src_sheet.crop((col * CELL, 0, (col + 1) * CELL, src_sheet.height))
            idle.save(os.path.join(out_dir, "idle.png"))
            fps["idle"] = 1
            print(f"{key}/idle.png  from {anim} frame {col + 1}")
        write_cfg(out_dir, ch["screen_h"], ch["fig_h"], fps)

    ground_src = os.path.join(args.src, "map_volcano.png")
    if os.path.exists(ground_src):
        dst = os.path.join(GAME_DIR, "art/maps/volcano/ground.png")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        Image.open(ground_src).convert("RGB").save(dst)
        print("maps/volcano/ground.png")

    icons_src = os.path.join(args.src, "icons_skills.png")
    if os.path.exists(icons_src):
        sheet = Image.open(icons_src).convert("RGB")
        dst_dir = os.path.join(GAME_DIR, "art/ui/skills")
        os.makedirs(dst_dir, exist_ok=True)
        w, h = sheet.width / 3, sheet.height / 2
        inset = 0.03
        for i, name in enumerate(ICON_NAMES):
            r, c = divmod(i, 3)
            box = (
                round(c * w + w * inset), round(r * h + h * inset),
                round((c + 1) * w - w * inset), round((r + 1) * h - h * inset),
            )
            sheet.crop(box).resize((128, 128), Image.LANCZOS).save(
                os.path.join(dst_dir, f"{name}.png"))
        print("ui/skills/*.png")


if __name__ == "__main__":
    sys.exit(main())
