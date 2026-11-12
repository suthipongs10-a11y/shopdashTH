"""Brings effect art from the owner's EggPact project into Ashen Crown.

Usage, from game/:
    python3 tools/import_eggpact_fx.py <folder containing the EggPact FX png files>

Files are found by name anywhere under the folder. Each mapped file is resized, written to
art/fx/<name>.png with a .cfg, and from then on FxSprite uses it. White-on-black art is drawn
additively and tinted in game; coloured art with transparency is drawn normally.
"""

import os
import sys

import numpy as np
from PIL import Image

GAME_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
BLACK_FLOOR = 10

# EggPact file -> (game name, blend, longest side in px, rotate degrees counter-clockwise)
MAPPING = {
    "fx_ereb_lion.png": ("lion_spirit", "mix", 768, 0),
    # Crescent turned so its bulge faces right, the convention SlashFx/BladeWave expect.
    "fx_kagul_slash.png": ("slash", "add", 512, 137),
    "fx_core_crack.png": ("hit", "add", 384, 0),
    "fx_kagul_nova.png": ("explosion", "mix", 640, 0),
    "fx_ereb_circle.png": ("ring", "add", 768, 0),
    "fx_kagul_ray.png": ("pillar", "add", 768, 0),
    "fx_kagul_mark.png": ("crest", "add", 640, 0),
    "fx_kagul_shield.png": ("bubble", "add", 512, 0),
    "fx_prot_shard.png": ("guard", "add", 256, 0),
    "fx_prot_maelstrom.png": ("swirl", "add", 640, 0),
    "fx_vk_wind_ceiling.png": ("converge", "add", 640, 0),
    "fx_kagul_purify.png": ("flame_ring", "add", 768, 0),
    "fx_kagul_sun.png": ("sun", "mix", 640, 0),
    "fx_prot_tide_ring.png": ("shock_ring", "add", 640, 0),
    "fx_kagul_birth.png": ("dawn", "add", 768, 0),
}


def find(root: str, name: str) -> str | None:
    for base, _dirs, files in os.walk(root):
        if name in files:
            return os.path.join(base, name)
    return None


def convert(path: str, blend: str, size: int, rotate: int) -> Image.Image:
    im = Image.open(path)
    if blend == "add":
        rgb = np.array(im.convert("RGB")).astype(np.float32)
        rgb = np.clip((rgb - BLACK_FLOOR) * 255 / (255 - BLACK_FLOOR), 0, 255).astype(np.uint8)
        im = Image.fromarray(rgb, "RGB")
        if rotate:
            im = im.rotate(rotate, resample=Image.BICUBIC, expand=True, fillcolor=(0, 0, 0))
    else:
        im = im.convert("RGBA")
        if rotate:
            im = im.rotate(rotate, resample=Image.BICUBIC, expand=True)
    # Trim empty borders first so thin shapes keep their brightness after downscaling.
    probe = im.convert("L") if blend == "add" else im.getchannel("A")
    box = probe.point(lambda v: 255 if v > 18 else 0).getbbox()
    if box is not None:
        pad = int(max(im.size) * 0.03)
        box = (max(0, box[0] - pad), max(0, box[1] - pad),
               min(im.width, box[2] + pad), min(im.height, box[3] + pad))
        im = im.crop(box)
    im.thumbnail((size, size), Image.LANCZOS)
    return im


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    src = sys.argv[1]
    dst = os.path.join(GAME_DIR, "art", "fx")
    os.makedirs(dst, exist_ok=True)
    for raw, (name, blend, size, rotate) in MAPPING.items():
        path = find(src, raw)
        if path is None:
            print(f"missing {raw}")
            continue
        convert(path, blend, size, rotate).save(os.path.join(dst, f"{name}.png"))
        with open(os.path.join(dst, f"{name}.cfg"), "w", encoding="utf-8") as f:
            f.write(f'[fx]\nframes=1\nfps=1\nblend="{blend}"\n')
        print(f"{raw} -> fx/{name}.png ({blend})")


if __name__ == "__main__":
    main()
