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
Also copies the ground painting, converts effect art (fx_*.png, lion_spirit.png) into\nart/fx/ strips with a .cfg each, and slices the skill icon sheet.

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
        "screen_h": 132,
        "anims": {
            "idle": {"file": "warden_idle.png", "fps": 5},
            "walk": {"file": "warden_walk.png", "fps": 9},
            "attack": {"file": "warden_attack.png", "fps": 14},
            "bash": {"file": "warden_bash.png", "fps": 12},
            "slam": {"file": "warden_slam.png", "fps": 10},
            "cast": {"file": "warden_cast.png", "fps": 6},
            "guard": {"file": "warden_guard.png", "fps": 8},
        },
    },
    "golem": {
        "out": "art/monsters/golem",
        "fig_h": 186,
        "screen_h": 172,
        "anims": {
            "walk": {"file": "golem_walk.png", "fps": 6},
            "attack": {"file": "golem_attack.png", "fps": 4.5},
        },
        "idle_from": ("walk", 1),
    },
    # Crown Defense boss (brief art/_brief_defense/). Until it exists the golem art stands in.
    "boss": {
        "out": "art/monsters/boss",
        "fig_h": 200,
        "screen_h": 270,
        "anims": {
            "walk": {"file": "boss_walk.png", "fps": 6},
            "attack": {"file": "boss_attack.png", "fps": 5},
            "cast": {"file": "boss_cast.png", "fps": 5},
        },
        "idle_from": ("walk", 1),
    },
    "imp": {
        "out": "art/monsters/imp",
        "fig_h": 170,
        "screen_h": 104,
        "anims": {
            "walk": {"file": "imp_walk.png", "fps": 8},
            "attack": {"file": "imp_attack.png", "fps": 7},
        },
        "idle_from": ("walk", 0),
    },
}

# 3x3 icon sheet (brief v3) and the older 3x2 sheet.
ICON_NAMES_3X3 = ["attack", "wave", "aegis", "whirl", "lion", "cross", "banner", "potion", "potion_sp"]
ICON_NAMES_3X2 = ["attack", "wave", "aegis", "whirl", "lion", "potion"]

# Raw file -> (game name, layout, fps, blend). "add" art is painted on black and drawn additively.
FX_SPECS = {
    "fx_slash.png": ("slash", "grid", 24, "add"),
    "fx_hit.png": ("hit", "grid", 24, "add"),
    "fx_explosion.png": ("explosion", "grid", 14, "add"),
    "fx_fire.png": ("fire", "grid", 10, "add"),
    "fx_smoke.png": ("smoke", "grid", 8, "mix"),
    "fx_bubble.png": ("bubble", "single", 1, "add"),
    "fx_guard.png": ("guard", "single", 1, "add"),
    "fx_cross.png": ("cross", "single", 1, "add"),
    "fx_ring.png": ("ring", "single", 1, "add"),
    "fx_pillar.png": ("pillar", "single", 1, "add"),
    "fx_crest.png": ("crest", "single", 1, "add"),
    "lion_spirit.png": ("lion_spirit", "single", 1, "add"),
}
FX_CELL = 320
FX_SINGLE_MAX = 640
# Pixels darker than this on additive art are pushed to pure black (removes grey haze).
BLACK_FLOOR = 14


def load_rgba(path: str) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def foreground_mask(img: np.ndarray, cols: int, rows: int) -> np.ndarray:
    """Boolean mask of character pixels."""
    alpha = img[..., 3]
    rgb_all = img[..., :3].astype(np.int16)
    border = np.concatenate([rgb_all[0], rgb_all[-1], rgb_all[:, 0], rgb_all[:, -1]])
    br, bg_, bb = np.median(border, axis=0)
    if (alpha < 40).mean() > 0.3:
        # Some sheets come with a painted half-transparent haze or checkerboard around the
        # figure; the figure itself is opaque, so cut higher when there is a lot of haze.
        haze = ((alpha >= 40) & (alpha < 200)).mean() > 0.05
        mask = alpha >= (230 if haze else 128)
    elif bg_ > 150 and br < 110 and bb < 110:
        # Green screen: drop strongly green pixels.
        r, g, b = rgb_all[..., 0], rgb_all[..., 1], rgb_all[..., 2]
        mask = ~((g > r + 50) & (g > b + 50))
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


def load_anim(src: str, spec: dict) -> tuple:
    """(frames as rows x cols of (crop, bottom_in_cell, cell_h), came_from_row_images)."""
    # Either one 5x4 sheet (warden_walk.png) or five single-row images (warden_walk_row1..5.png).
    name = spec["file"].replace("_row{row}", "")
    row_name = name.replace(".png", "_row{row}.png")
    if not os.path.exists(os.path.join(src, name)) and os.path.exists(
            os.path.join(src, row_name.format(row=1))):
        rows = []
        for r in range(1, ROWS + 1):
            img = load_rgba(os.path.join(src, row_name.format(row=r)))
            rows.append(split_frames(img, 4, 1)[0])
        return rows, True
    img = load_rgba(os.path.join(src, name))
    return split_frames(img, 4, ROWS), False


def feet_center_x(crop: np.ndarray) -> float:
    a = crop[..., 3] > 0
    h = a.shape[0]
    band = a[int(h * 0.82):, :]
    xs = np.nonzero(band)[1]
    if xs.size == 0:
        xs = np.nonzero(a)[1]
    return float(np.median(xs))


def compose(frames: list, fig_h: int, multiplier: float = 1.0, per_row: bool = False) -> tuple:
    """per_row: each row came from its own image, maybe drawn at another size, so scale rows apart."""
    heights = [crop.shape[0] for row in frames for crop, _, _ in row]
    scale = fig_h / float(np.median(heights)) * multiplier
    row_scales = [
        fig_h / float(np.median([crop.shape[0] for crop, _, _ in row])) * multiplier
        if per_row else scale
        for row in frames
    ]
    cols = max(len(row) for row in frames)
    sheet = Image.new("RGBA", (CELL * cols, CELL * len(frames)), (0, 0, 0, 0))
    clipped = 0
    for r, row in enumerate(frames):
        scale = row_scales[r]
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
    return sheet, float(np.median(row_scales)), clipped


def measure_stride(walk: Image.Image) -> float:
    """Cell pixels the body travels per walk cycle, from the side-view row (row 3).
    Feet spread widest when a foot lands and narrowest while passing; a step is about the
    widest spread minus one foot length (~half the narrowest spread)."""
    a = np.array(walk)[..., 3]
    spreads = []
    for c in range(a.shape[1] // CELL):
        cell = a[2 * CELL:3 * CELL, c * CELL:(c + 1) * CELL]
        ys = np.nonzero(cell.any(1))[0]
        if ys.size == 0:
            continue
        band = cell[ys[-1] - int((ys[-1] - ys[0]) * 0.08):ys[-1] + 1]
        xs = np.nonzero(band.any(0))[0]
        spreads.append(float(xs[-1] - xs[0]))
    if len(spreads) < 2:
        return 0.0
    return 2.0 * (max(spreads) - 0.45 * min(spreads))


def write_cfg(out_dir: str, screen_h: int, fig_h: int, fps: dict, stride: float = 0.0) -> None:
    lines = [
        "[sheet]",
        f"directions={ROWS}",
        f"cell_width={CELL}",
        f"cell_height={CELL}",
        f"scale={screen_h / fig_h:.4f}",
        f"feet_from_bottom={FEET_FROM_BOTTOM}",
        f"stride={round(stride * screen_h / fig_h)}",
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


def fx_pixels(img: Image.Image, blend: str) -> Image.Image:
    """Prepares one effect frame: additive art gets a black floor, other art gets a real alpha."""
    if blend == "add":
        rgb = np.array(img.convert("RGB")).astype(np.float32)
        rgb = np.clip((rgb - BLACK_FLOOR) * 255 / (255 - BLACK_FLOOR), 0, 255).astype(np.uint8)
        return Image.fromarray(rgb, "RGB").convert("RGBA")
    arr = np.array(img.convert("RGBA"))
    if (arr[..., 3] < 40).mean() > 0.2:
        return Image.fromarray(arr, "RGBA")
    rgb = arr[..., :3].astype(np.int16)
    green = (rgb[..., 1] > rgb[..., 0] + 50) & (rgb[..., 1] > rgb[..., 2] + 50)
    arr[..., 3] = np.where(green, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def import_fx(path: str, name: str, layout: str, fps: int, blend: str) -> None:
    src = Image.open(path)
    if layout == "grid":
        cols, rows = 3, 2
        w, h = src.width / cols, src.height / rows
        strip = Image.new("RGBA", (FX_CELL * cols * rows, FX_CELL), (0, 0, 0, 0))
        for i in range(cols * rows):
            r, c = divmod(i, cols)
            cell = src.crop((round(c * w), round(r * h), round((c + 1) * w), round((r + 1) * h)))
            cell = fx_pixels(cell, blend).resize((FX_CELL, FX_CELL), Image.LANCZOS)
            strip.paste(cell, (i * FX_CELL, 0))
        out, frames = strip, cols * rows
    else:
        out = fx_pixels(src, blend)
        if blend == "mix":
            # Trim transparent borders so the art fills its sprite.
            box = out.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
            if box is not None:
                out = out.crop(box)
        out.thumbnail((FX_SINGLE_MAX, FX_SINGLE_MAX), Image.LANCZOS)
        frames = 1
    dst_dir = os.path.join(GAME_DIR, "art/fx")
    os.makedirs(dst_dir, exist_ok=True)
    out.save(os.path.join(dst_dir, f"{name}.png"))
    with open(os.path.join(dst_dir, f"{name}.cfg"), "w", encoding="utf-8") as f:
        f.write(f"[fx]\nframes={frames}\nfps={fps}\nblend=\"{blend}\"\n")
    print(f"fx/{name}.png  {frames} frame(s), {blend}")


TOWER_KINDS = ["archer", "pillar", "wall", "font"]
PROP_SINGLES = {
    "build_slot.png": "art/props/build_slot.png",
    "crown_base.png": "art/props/crown_base.png",
    "crown_top.png": "art/props/crown_top.png",
    "gate_portal.png": "art/props/gate.png",
}


def _cut(arr: np.ndarray, cols: int) -> np.ndarray:
    """Background removed (alpha 0) the same way as the sprite sheets."""
    arr = arr.copy()
    arr[..., 3] = np.where(foreground_mask(arr, cols, 1), arr[..., 3], 0)
    return arr


def _trimmed(img: Image.Image, max_side: int) -> Image.Image:
    box = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if box is not None:
        img = img.crop(box)
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    return img


def import_defense_art(src: str) -> None:
    """Crown Defense: towers (3 levels side by side), props and the tower icon sheet."""
    for kind in TOWER_KINDS:
        path = os.path.join(src, f"tower_{kind}.png")
        if not os.path.exists(path):
            continue
        arr = _cut(load_rgba(path), 3)
        w = arr.shape[1] / 3.0
        dst_dir = os.path.join(GAME_DIR, "art/towers")
        os.makedirs(dst_dir, exist_ok=True)
        for lv in range(3):
            part = Image.fromarray(arr[:, round(lv * w):round((lv + 1) * w)])
            _trimmed(part, 512).save(os.path.join(dst_dir, f"{kind}_{lv + 1}.png"))
        print(f"towers/{kind}_1..3.png")
    for raw, dst in PROP_SINGLES.items():
        path = os.path.join(src, raw)
        if not os.path.exists(path):
            continue
        out = os.path.join(GAME_DIR, dst)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        _trimmed(Image.fromarray(_cut(load_rgba(path), 1)), 640).save(out)
        print(dst)
    icons = os.path.join(src, "icons_towers.png")
    if os.path.exists(icons):
        sheet = Image.open(icons).convert("RGB")
        dst_dir = os.path.join(GAME_DIR, "art/ui/towers")
        os.makedirs(dst_dir, exist_ok=True)
        w, h = sheet.width / 2, sheet.height / 2
        for i, kind in enumerate(TOWER_KINDS):
            r, c = divmod(i, 2)
            box = (round(c * w + w * 0.03), round(r * h + h * 0.03),
                   round((c + 1) * w - w * 0.03), round((r + 1) * h - h * 0.03))
            sheet.crop(box).resize((128, 128), Image.LANCZOS).save(os.path.join(dst_dir, f"{kind}.png"))
        print("ui/towers/*.png")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--preview")
    ap.add_argument("--only", help="import just this character (e.g. warden)")
    args = ap.parse_args()
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)

    for key, ch in CHARACTERS.items():
        if args.only and key != args.only:
            continue
        out_dir = os.path.join(GAME_DIR, ch["out"])
        os.makedirs(out_dir, exist_ok=True)
        fps = {}
        built = {}
        imported = False
        for anim, spec in ch["anims"].items():
            sheet_file = spec["file"].replace("_row{row}", "")
            row_file = sheet_file.replace(".png", "_row1.png")
            if not any(os.path.exists(os.path.join(args.src, f)) for f in (sheet_file, row_file)):
                print(f"{key}/{anim}: no {sheet_file} in the source folder, kept as it is")
                fps[anim] = spec["fps"]
                continue
            frames, per_row = load_anim(args.src, spec)
            imported = True
            sheet, scale, clipped = compose(frames, ch["fig_h"], spec.get("scale", 1.0), per_row)
            sheet.save(os.path.join(out_dir, f"{anim}.png"))
            built[anim] = sheet
            fps[anim] = spec["fps"]
            note = f" ({clipped} frames touch the cell edge)" if clipped else ""
            print(f"{key}/{anim}.png  scale {scale:.3f}{note}")
            if args.preview:
                preview(sheet, os.path.join(args.preview, f"{key}_{anim}.jpg"))
        if not imported:
            # Nothing new for this character: keep its sheets and sheet.cfg as they are.
            continue
        if "idle_from" in ch:
            anim, col = ch["idle_from"]
            src_sheet = built[anim]
            idle = src_sheet.crop((col * CELL, 0, (col + 1) * CELL, src_sheet.height))
            idle.save(os.path.join(out_dir, "idle.png"))
            fps["idle"] = 1
            print(f"{key}/idle.png  from {anim} frame {col + 1}")
        walk_path = os.path.join(out_dir, "walk.png")
        stride = measure_stride(Image.open(walk_path).convert("RGBA")) if os.path.exists(walk_path) else 0.0
        write_cfg(out_dir, ch["screen_h"], ch["fig_h"], fps, stride)

    for key, ch in CHARACTERS.items():
        if args.only and key != args.only:
            continue
        # Optional painted bust for the ultimate cut-in banner.
        bust = os.path.join(args.src, f"{key}_portrait.png")
        if os.path.exists(bust):
            arr = load_rgba(bust)
            arr[..., 3] = np.where(foreground_mask(arr, 1, 1), arr[..., 3], 0)
            img = Image.fromarray(arr)
            box = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
            if box is not None:
                img = img.crop(box)
            img.thumbnail((512, 512), Image.LANCZOS)
            img.save(os.path.join(GAME_DIR, ch["out"], "portrait.png"))
            print(f"{key}/portrait.png  {img.width}x{img.height}")

    import_defense_art(args.src)

    ground_src = os.path.join(args.src, "map_volcano.png")
    if os.path.exists(ground_src):
        dst = os.path.join(GAME_DIR, "art/maps/volcano/ground.png")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        Image.open(ground_src).convert("RGB").save(dst)
        print("maps/volcano/ground.png")

    for raw, spec in FX_SPECS.items():
        path = os.path.join(args.src, raw)
        if os.path.exists(path):
            import_fx(path, *spec)

    icons_src = os.path.join(args.src, "icons_skills.png")
    if os.path.exists(icons_src):
        sheet = Image.open(icons_src).convert("RGB")
        dst_dir = os.path.join(GAME_DIR, "art/ui/skills")
        os.makedirs(dst_dir, exist_ok=True)
        square = abs(sheet.width - sheet.height) < sheet.width * 0.1
        names = ICON_NAMES_3X3 if square else ICON_NAMES_3X2
        rows = 3 if square else 2
        w, h = sheet.width / 3, sheet.height / rows
        inset = 0.03
        for i, name in enumerate(names):
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
