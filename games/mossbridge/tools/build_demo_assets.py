#!/usr/bin/env python3
"""
build_demo_assets.py — prepare textures for demo/ from art/ (reproducible).

  1. Hero: Kaelrin's separate parts from art/samples/kaelrin/ (run tools/build_kaelrin_parts.py first):
     headless body per view (the source the Rig Editor shows; the game draws the rig pieces cut
     from it by tools/build_kaelrin_rig.py), head per view (pinned to the rig's neck, so headgear
     can sit on it later) and one weapon drawn on its own (a = hook on the
     left, b = hook on the right when the blade points down). Per view we set where the right
     fist is on the body canvas, which weapon side shows, and the resting weapon angle.
  2. Monsters: trim the 320x320 sample canvases and record the feet anchor.
  3. Map: the environment painting as a JPEG.
  Writes demo/assets/*.png|jpg and demo/assets/manifest.json

Usage (from games/mossbridge):  python3 tools/build_kaelrin_parts.py && python3 tools/build_demo_assets.py
                                && python3 tools/build_kaelrin_rig.py   (rig pieces; reads demo/rigs/kaelrin.json)
Requires: Pillow
"""
import json
import os
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "art", "samples")
PARTS = os.path.join(ROOT, "art", "samples", "kaelrin")
OUT = os.path.join(ROOT, "demo", "assets")
FEET = (160, 300)

# view: right fist on the body canvas (weapon grip), weapon side, resting angle in degrees
# (clockwise from "blade straight down"). Angles follow how the weapon is held in REF_03.
HERO = {
    "sw": {"grip": (73, 190), "side": "a", "angle": 39},    # faces down-left, blade down-left
    "se": {"grip": (184, 198), "side": "b", "angle": -42},  # faces down-right, blade down-right
    "w":  {"grip": (95, 163), "side": "a", "angle": 34},    # faces left, blade down-left
    "ne": {"grip": (174, 190), "side": "b", "angle": -37},  # back view, blade down-right
}


def hero_parts():
    with open(os.path.join(PARTS, "manifest.json"), encoding="utf-8") as f:
        parts = json.load(f)
    for side in ("a", "b"):
        shutil.copyfile(os.path.join(PARTS, f"weapon_{side}.png"), os.path.join(OUT, f"hero_weapon_{side}.png"))
    out = {}
    for v, cfg in HERO.items():
        pv = parts["views"][v]
        shutil.copyfile(os.path.join(PARTS, pv["body_headless"]), os.path.join(OUT, f"hero_{v}_body.png"))
        shutil.copyfile(os.path.join(PARTS, pv["head_full"]), os.path.join(OUT, f"hero_{v}_head.png"))
        w = parts["weapon"][cfg["side"]]
        out[v] = {
            "body": f"hero_{v}_body.png", "size": parts["body"]["canvas"], "feet": list(FEET),
            "head": f"hero_{v}_head.png", "headPivot": parts["head"]["pivot"], "neck": pv["neck"],
            "grip": list(cfg["grip"]), "weapon": f"hero_weapon_{cfg['side']}.png",
            "weaponGrip": w["grip"], "weaponTip": w["tip"], "weaponAngle": cfg["angle"],
        }
    return out


def trim(name, out, pad=10):
    im = Image.open(os.path.join(SAMPLES, name)).convert("RGBA")
    x0, y0, x1, y1 = im.getbbox()
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)
    im.crop((x0, y0, x1, y1)).save(os.path.join(OUT, out), optimize=True)
    return {"file": out, "size": [x1 - x0, y1 - y0], "feet": [FEET[0] - x0, FEET[1] - y0]}


def main():
    os.makedirs(OUT, exist_ok=True)
    man = {"hero": hero_parts(), "mobs": {}}
    try:  # keep what tools/build_fx_assets.py added (effects + icons)
        old = json.load(open(os.path.join(OUT, "manifest.json"), encoding="utf-8"))
        man.update({k: old[k] for k in ("fx", "icons") if k in old})
    except (OSError, ValueError):
        pass
    man["mobs"]["sproutling"] = trim("mob_sproutling.png", "mob_sproutling.png")
    man["mobs"]["mossback"] = trim("mob_mossback.png", "mob_mossback.png")
    src = os.path.join(ROOT, "art", "reference", "02_environment_full.jpg")
    if os.path.exists(src):
        Image.open(src).convert("RGB").save(os.path.join(OUT, "map_mossbridge.jpg"), quality=90, optimize=True)
        man["map"] = {"file": "map_mossbridge.jpg", "size": list(Image.open(src).size)}
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(man, f, indent=1)
    print(json.dumps(man["hero"], indent=1))


if __name__ == "__main__":
    main()
