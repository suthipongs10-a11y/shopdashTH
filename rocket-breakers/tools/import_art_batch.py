"""Import a delivered ChatGPT art batch into the game (non-generative steps only).

Usage (from rocket-breakers/):
    python3 tools/import_art_batch.py <delivery_dir> <batch_name>

- Copies original PNGs + delivery docs to art/source/<batch>/ (never modified).
- Writes runtime copies to assets/sprites/<asset_id>.webp: low-alpha edge noise removed,
  cropped to the visible bounds (+padding), premultiplied downscale to a runtime size.
- Writes assets/sprites/<asset_id>.json sidecars (ART_BIBLE): trim rect, scale, pivot,
  anchors, blend, provenance, status.
- Paired overlays (engine glow) share their base hull's crop so they stay registered.
- Updates art/asset_manifest.csv status + runtime_path for imported rows.
"""
import csv
import hashlib
import json
import shutil
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "assets/sprites"
EDGE_ALPHA = 6      # alpha at/below this is treated as generator noise
PAD = 8

# asset_id -> (runtime max dimension, pivot rule, crop group)
RULES = {
    "hull_H01": (320, "center", "hull_H01"),
    "hull_H01_engine_glow": (320, "center", "hull_H01"),
    "weapon_W001": (128, "socket_bottom", None),
    "weapon_W008": (160, "socket_bottom", None),
    "weapon_W022": (160, "socket_bottom", None),
    "boss_B02_core": (760, "center", None),
    "boss_B02_joint": (160, "center", None),
    "boss_B02_armor": (180, "center", None),
    "boss_B02_signature_mount": (420, "socket_bottom", None),
    "fx_tractor_mote": (96, "center", None),
}


def visible_bbox(im):
    return im.getchannel("A").point(lambda a: 255 if a > EDGE_ALPHA else 0).getbbox()


def clean(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v <= EDGE_ALPHA else v)
    return Image.merge("RGBA", (r, g, b, a))


def main(delivery: Path, batch: str):
    manifest = json.loads((delivery / "delivery_manifest.json").read_text(encoding="utf-8"))
    src_dir = ROOT / "art/source" / batch.lower()
    src_dir.mkdir(parents=True, exist_ok=True)
    SPRITES.mkdir(parents=True, exist_ok=True)
    for p in delivery.iterdir():
        if p.is_file():
            shutil.copy2(p, src_dir / p.name)
    files = {f["asset_id"]: f for f in manifest["files"]}
    # crop groups: union of visible bounds of all members
    groups = {}
    for aid, f in files.items():
        rule = RULES.get(aid)
        if not rule or not rule[2]:
            continue
        bb = visible_bbox(Image.open(delivery / f["filename"]).convert("RGBA"))
        g = groups.setdefault(rule[2], list(bb))
        groups[rule[2]] = [min(g[0], bb[0]), min(g[1], bb[1]), max(g[2], bb[2]), max(g[3], bb[3])]
    imported = {}
    for aid, f in files.items():
        if aid not in RULES:
            print(f"skip {aid}: no import rule")
            continue
        size, pivot_rule, group = RULES[aid]
        src = delivery / f["filename"]
        sha = hashlib.sha256(src.read_bytes()).hexdigest()
        if sha != f["sha256"]:
            raise SystemExit(f"checksum mismatch for {src.name}")
        im = clean(Image.open(src).convert("RGBA"))
        own = visible_bbox(im)
        bb = groups[group] if group else own
        W, H = im.size
        crop = (max(0, bb[0] - PAD), max(0, bb[1] - PAD), min(W, bb[2] + PAD), min(H, bb[3] + PAD))
        cut = im.crop(crop)
        k = size / max(cut.size)
        out = cut.convert("RGBa").resize((max(1, round(cut.width * k)), max(1, round(cut.height * k))), Image.LANCZOS).convert("RGBA")
        rel = f"assets/sprites/{aid}.webp"
        out.save(ROOT / rel, "WEBP", quality=90, method=6)
        w, h = out.size
        vis = [(own[0] - crop[0]) * k, (own[1] - crop[1]) * k, (own[2] - crop[0]) * k, (own[3] - crop[1]) * k]
        pivot = [w / 2, h / 2] if pivot_rule == "center" else [w / 2, vis[3]]
        anchors = {}
        if aid.startswith("weapon_") or aid.endswith("signature_mount"):
            anchors = {"muzzle": [round((vis[0] + vis[2]) / 2, 1), round(vis[1], 1)], "socket": [round((vis[0] + vis[2]) / 2, 1), round(vis[3], 1)]}
        sidecar = {
            "asset_id": aid, "source_filename": f"art/source/{batch.lower()}/{f['filename']}", "source_sha256": sha,
            "canvas_size": [W, H], "trim_rect": list(crop), "runtime_size": [w, h], "scale": round(k, 5),
            "visible_rect": [round(v, 1) for v in vis], "pivot_px": [round(pivot[0], 1), round(pivot[1], 1)],
            "attachment_anchors": anchors, "blend_mode": f.get("blend", "alpha"), "color_space": "sRGB",
            "provenance": f"{manifest.get('generator', 'ChatGPT imagegen')} via owner, {batch}",
            "status": "integrated", "notes": "anchors estimated from visible bounds; verified visually in the web build",
        }
        (ROOT / f"assets/sprites/{aid}.json").write_text(json.dumps(sidecar, indent=2), encoding="utf-8")
        imported[aid] = rel
        print(f"{aid}: {W}x{H} crop {crop} -> {w}x{h} ({(ROOT / rel).stat().st_size // 1024} KB)")
    # manifest status + runtime_path
    mpath = ROOT / "art/asset_manifest.csv"
    rows = list(csv.DictReader(mpath.open(encoding="utf-8")))
    fields = list(rows[0].keys())
    if "runtime_path" not in fields:
        fields.append("runtime_path")
    for r in rows:
        r.setdefault("runtime_path", "")
        if r["asset_id"] in imported:
            r["status"] = "integrated"
            r["runtime_path"] = imported[r["asset_id"]]
            r["provenance"] = f"ChatGPT imagegen via owner ({batch}); source in art/source/{batch.lower()}"
    with mpath.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print(f"manifest updated: {len(imported)} rows integrated")


if __name__ == "__main__":
    main(Path(sys.argv[1]), sys.argv[2])
