#!/usr/bin/env python3
"""
build_headgear.py — ChatGPT headgear sheets P04A-F / P05A-C -> wearable items on Kaelrin's head canvas.

Each sheet is one item in 4 views (2x2: SW SE / W NE), drawn to fit the P02B heads. So every cell is
placed with the SAME transform as the head of that view (tools/build_kaelrin_parts.py: scale
s*HEAD_K, offset from the neck point), giving a 256x256 image on the head canvas (pivot = neck
(128,200)) that overlays head_{full|capped}_{view}.png. ChatGPT does not place items exactly, so
FIT holds per item / per view nudges (dx, dy in head-canvas px, s = scale about the head centre),
found by eye on qa-out/headgear_check.png (written by this script).

Outputs: demo/assets/gear_{id}_{view}.png, gear_{id}_icon.png, demo/assets/manifest.json "gear"
          + the capped heads as demo/assets/hero_{view}_head_capped.png
Usage (from games/mossbridge):  python3 tools/build_headgear.py       Requires: Pillow, numpy
Needs art/raw/: P01, P02A, P02B (for the head transform) and the P04/P05 sheets.
"""
import json
import os
import shutil
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import sprite_clean as sc  # noqa: E402
import build_kaelrin_parts as kp  # noqa: E402

RAW, OUT, PARTS = kp.RAW, os.path.join(ROOT, "demo", "assets"), kp.OUT
VIEWS = list(kp.VIEWS)

# id, sheet, slot, Thai name, hair mode while worn, key colour
ITEMS = [
    ("hat_witch", "P04A_hat_witch.png", "top", "หมวกแม่มดม่วง", "capped", (0, 255, 0)),
    ("hat_beanie", "P04B_hat_beanie.png", "top", "หมวกไหมพรม", "capped", (255, 0, 255)),
    ("hat_crown", "P04C_hat_crown.png", "top", "มงกุฎทองเหลือง", "full", (255, 0, 255)),
    ("hat_sprout", "P04D_hat_sprout.png", "top", "ต้นอ่อนสไลม์", "full", (255, 0, 255)),
    ("hat_catears", "P04E_hat_catears.png", "top", "ที่คาดหูแมว", "full", (255, 0, 255)),
    ("helm_mossback", "P04F_helm_mossback.png", "top", "หมวกเกราะหมูป่ามอส", "capped", (255, 0, 255)),
    ("mid_goggles", "P05A_mid_goggles.png", "mid", "แว่นกันลมช่างตีเหล็ก", None, (255, 0, 255)),
    ("mid_glasses", "P05B_mid_glasses.png", "mid", "แว่นกลมนักปราชญ์", None, (255, 0, 255)),
    ("low_scarf", "P05C_low_scarf_mask.png", "low", "ผ้าปิดปากนักเดินทาง", None, (255, 0, 255)),
]
# per item, per view: [dx, dy, s]  (tuned on qa-out/headgear_check.png)
FIT = {
    "low_scarf": {v: (0, 7, 1) for v in ("sw", "se", "w", "ne")},   # sits on the mouth, not the eyes
}


def keyed(name, key):
    rgb = np.array(Image.open(os.path.join(RAW, name)).convert("RGB"))
    rgb, alpha = sc.key_to_alpha(rgb, key, *kp.KEY_TOL)
    alpha = sc.clean_alpha(alpha, *kp.ALPHA)
    rgb, alpha = sc.remove_spill(rgb, alpha, key, kp.EDGE_DESPILL)
    rgb = sc.defringe(rgb, alpha)
    out, _ = kp.drop_specks(np.dstack([rgb, alpha]))
    return out


def head_transforms():
    """per view: (scale, offset) that maps a P02B cell onto the head canvas (as build_kaelrin_parts)"""
    p01 = kp.load_keyed(kp.SRC["body_full"])
    p02a = kp.load_keyed(kp.SRC["body_headless"])
    s = kp.BODY_HEIGHT / kp.feet_point(kp.cell(p01, "sw")[..., 3])[2]
    out = {}
    for v in VIEWS:
        N = kp.neck_point(kp.cell(p02a, v)[..., 3])
        T = kp.HEAD_T[v]
        out[v] = (s * kp.HEAD_K, (s * (T[0] - N[0]) + kp.NECK_PIVOT[0], s * (T[1] - N[1]) + kp.NECK_PIVOT[1]))
    return out


def main():
    tf = head_transforms()
    man_path = os.path.join(OUT, "manifest.json")
    man = json.load(open(man_path, encoding="utf-8"))
    for v in VIEWS:
        shutil.copyfile(os.path.join(PARTS, f"head_capped_{v}.png"), os.path.join(OUT, f"hero_{v}_head_capped.png"))
    gear = {"canvas": list(kp.HEAD_CANVAS), "pivot": list(kp.NECK_PIVOT),
            "capped": {v: f"hero_{v}_head_capped.png" for v in VIEWS}, "items": {}}
    check_rows = []
    for gid, sheet, slot, name, hair, key in ITEMS:
        img = keyed(sheet, key)
        files, row = {}, []
        for v in VIEWS:
            a, off = tf[v]
            dx, dy, sca = FIT.get(gid, {}).get(v, (0, 0, 1))
            c = kp.HEAD_CANVAS[0] / 2, 120   # scale about the middle of the head
            a2 = a * sca
            off2 = (c[0] + (off[0] - c[0]) * sca + dx, c[1] + (off[1] - c[1]) * sca + dy)
            g = kp.place(kp.cell(img, v), a2, off2, kp.HEAD_CANVAS, f"{gid}_{v}")
            fn = f"gear_{gid}_{v}.png"
            Image.fromarray(g).save(os.path.join(OUT, fn), optimize=True)
            files[v] = fn
            head = Image.open(os.path.join(OUT, f"hero_{v}_head{'_capped' if hair == 'capped' else ''}.png" if hair == "capped" else os.path.join(PARTS, f"head_full_{v}.png"))).convert("RGBA")
            tile = Image.new("RGBA", kp.HEAD_CANVAS, (225, 225, 225, 255)); tile.alpha_composite(head); tile.alpha_composite(Image.fromarray(g))
            row.append(tile.crop((28, 40, 228, 240)))
        # icon: the SW view trimmed onto 96x96
        sw = Image.open(os.path.join(OUT, files["sw"])); bb = sw.getbbox(); ic = sw.crop(bb); k = 88 / max(ic.size)
        ic = ic.resize((max(1, round(ic.width * k)), max(1, round(ic.height * k))), Image.LANCZOS)
        icon = Image.new("RGBA", (96, 96)); icon.alpha_composite(ic, ((96 - ic.width) // 2, (96 - ic.height) // 2))
        icon.save(os.path.join(OUT, f"gear_{gid}_icon.png"), optimize=True)
        gear["items"][gid] = {"slot": slot, "name": name, "hair": hair or "full", "views": files, "icon": f"gear_{gid}_icon.png"}
        check_rows.append((gid, row))
        print(gid, "ok")
    man["gear"] = gear
    with open(man_path, "w", encoding="utf-8") as f:
        json.dump(man, f, indent=1)
    # contact sheet for checking the fit by eye
    W, H = 200, 200
    sheet = Image.new("RGB", (W * 4 + 150, H * len(check_rows)), (40, 40, 40)); d = ImageDraw.Draw(sheet)
    for r, (gid, row) in enumerate(check_rows):
        d.text((6, r * H + 90), gid, fill=(255, 255, 0))
        for c, t in enumerate(row):
            sheet.paste(t.convert("RGB"), (150 + c * W, r * H))
    os.makedirs(os.path.join(ROOT, "qa-out"), exist_ok=True)
    sheet.save(os.path.join(ROOT, "qa-out", "headgear_check.png"))


if __name__ == "__main__":
    main()
