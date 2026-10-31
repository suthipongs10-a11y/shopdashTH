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
import re
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
    "hull_H01_lean_left": (320, "center", "hull_H01"),
    "hull_H01_lean_right": (320, "center", "hull_H01"),
    "hull_H01_damage_overlay": (320, "center", "hull_H01"),
    "boss_B02_core": (760, "center", "boss_B02_core"),
    "boss_B02_damage_overlay": (760, "center", "boss_B02_core"),
    "enemy_E01": (160, "center", None),
    "enemy_E02": (160, "center", None),
    "enemy_E03": (220, "center", None),
    "enemy_E04": (220, "center", None),
    "bg_P01_far": (1280, "center", None),
    "bg_P01_mid": (1280, "center", None),
    "bg_P01_foreground": (1280, "center", None),
    "fx_explosion_small": (256, "center", "fx_explosion_small"),
    "fx_impact_spark": (256, "center", "fx_impact_spark"),
    "fx_joint_break": (256, "center", "fx_joint_break"),
    "fx_detach_burst": (256, "center", "fx_detach_burst"),
    "fx_shield_hit": (256, "center", "fx_shield_hit"),
    **{f"ui_{n}": (128, "center", None) for n in ["dash", "overdrive", "tractor", "lock_joint", "locked_armor", "heat", "energy",
                                                  "cargo", "repair", "pause", "play", "settings", "star_full", "star_empty",
                                                  "credits", "scrap", "blueprint", "hangar", "galaxy", "codex",
                                                  "fusion_core", "extraction"]},
    "utility_T001": (128, "socket_bottom", None),
    "utility_T006": (128, "socket_bottom", None),
    "boss_B02_joint": (160, "center", None),
    "boss_B02_armor": (180, "center", None),
    "boss_B02_signature_mount": (420, "socket_bottom", None),
    "fx_tractor_mote": (96, "center", None),
    **{f"boss_{b}_{part}": rule for b in ["B01", "B03"] for part, rule in {
        "core": (760, "center", f"boss_{b}_core"), "damage_overlay": (760, "center", f"boss_{b}_core"),
        "armor": (180, "center", None), "joint": (160, "center", None),
        "signature_mount": (420, "socket_bottom", None)}.items()},
    **{f"weapon_{w}_icon": (128, "center", None) for w in ["W001", "W008", "W022"]},
    **{f"weapon_{w}_glow": (128, "center", None) for w in ["W001", "W008", "W022"]},
    **{f"pickup_pu{i:02d}": (128, "center", None) for i in range(1, 13)},
}
# Expansion assets that are not rows of the handoff manifest yet.
EXTRA_CATEGORY = {"pickup_pu": ("pickup_icon", "512x512", "alpha", "M1")}


def fname(f):
    return f.get("filename") or f["file"]  # delivery manifests have used both keys


# Damage overlays share the core canvas; their alpha is clipped to the core silhouette
# so no crack decal floats outside the body (BATCH_010 overlay QA).
CLIP_TO = {f"boss_{b}_damage_overlay": f"boss_{b}_core" for b in ["B01", "B02", "B03"]}

# Opaque scrolling backgrounds get a vertically tileable runtime copy (band cross-fade).
TILE_V = {"bg_P01_far"}
SEAM_BAND = 0.08  # fraction of height blended


def frame_of(f):
    m = re.search(r"_(\d{3})\.png$", fname(f))
    return int(m.group(1)) if m else 0


def runtime_id(f, multi):
    return f"{f['asset_id']}_{frame_of(f):03d}" if multi else f["asset_id"]


def make_tileable(im):
    """Cross-fade the bottom band into the top so the image wraps vertically without a seam."""
    w, h = im.size
    b = max(2, int(h * SEAM_BAND))
    body = im.crop((0, 0, w, h - b)).copy()
    bottom = im.crop((0, h - b, w, h))
    top = im.crop((0, 0, w, b))
    mask = Image.linear_gradient("L").resize((w, b))  # 0 at top -> 255 at bottom
    body.paste(Image.composite(top, bottom, mask), (0, 0))
    return body


def visible_bbox(im):
    return im.getchannel("A").point(lambda a: 255 if a > EDGE_ALPHA else 0).getbbox()


def clean(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v <= EDGE_ALPHA else v)
    return Image.merge("RGBA", (r, g, b, a))


def main(delivery: Path, batch: str, approved_only=frozenset()):
    manifest = json.loads((delivery / "delivery_manifest.json").read_text(encoding="utf-8"))
    src_dir = ROOT / "art/source" / batch.lower()
    src_dir.mkdir(parents=True, exist_ok=True)
    SPRITES.mkdir(parents=True, exist_ok=True)
    for p in delivery.iterdir():
        if p.is_file():
            shutil.copy2(p, src_dir / p.name)
    # Delivery manifests have varied: {"files": [...]} or a bare list; asset_id may be
    # missing, in which case it comes from the file name (rb_<asset>_<frame>.png).
    raw = manifest if isinstance(manifest, list) else manifest["files"]
    known_ids = {r["asset_id"].lower(): r["asset_id"] for r in csv.DictReader((ROOT / "art/asset_manifest.csv").open(encoding="utf-8"))}
    for f in raw:
        if not f.get("asset_id"):
            stem = re.sub(r"^rb_|_\d{3}\.png$", "", fname(f))
            f["asset_id"] = known_ids.get(stem, stem)
    if isinstance(manifest, list):
        manifest = {"files": raw}
    entries = []
    for f in manifest["files"]:
        if not (delivery / fname(f)).exists():
            print(f"MISSING {fname(f)} ({f['asset_id']}) — listed in the manifest but not delivered")
            continue
        entries.append(f)
    counts = {}
    for f in entries:
        counts[f["asset_id"]] = counts.get(f["asset_id"], 0) + 1
    files = {f["asset_id"]: f for f in entries}  # group detection only
    # crop groups: union of visible bounds of all members
    groups = {}
    for f in entries:
        aid = f["asset_id"]
        rule = RULES.get(aid)
        if not rule or not rule[2]:
            continue
        bb = visible_bbox(Image.open(delivery / fname(f)).convert("RGBA"))
        g = groups.setdefault(rule[2], list(bb))
        groups[rule[2]] = [min(g[0], bb[0]), min(g[1], bb[1]), max(g[2], bb[2]), max(g[3], bb[3])]
    # Overlays/states delivered after their base reuse the base's existing crop so
    # they stay pixel-registered with the sprite already in the game.
    fixed = {}
    for aid in files:
        group = RULES.get(aid, (0, 0, None))[2]
        sc = SPRITES / f"{group}.json"
        if group and group not in files and sc.exists():
            fixed[group] = tuple(json.loads(sc.read_text(encoding="utf-8"))["trim_rect"])
    imported = {}
    for f in entries:
        aid = f["asset_id"]
        if aid not in RULES:
            print(f"skip {aid}: no import rule")
            continue
        size, pivot_rule, group = RULES[aid]
        src = delivery / fname(f)
        sha = hashlib.sha256(src.read_bytes()).hexdigest()
        if sha != f["sha256"]:
            raise SystemExit(f"checksum mismatch for {src.name}")
        im = clean(Image.open(src).convert("RGBA"))
        base_f = files.get(CLIP_TO.get(aid, ""))
        if base_f:
            mask = clean(Image.open(delivery / fname(base_f)).convert("RGBA")).getchannel("A")
            if mask.size == im.size:
                r_, g_, b_, a_ = im.split()
                im = Image.merge("RGBA", (r_, g_, b_, Image.composite(a_, Image.new("L", im.size, 0), mask.point(lambda v: 255 if v > 24 else 0))))
        own = visible_bbox(im)
        bb = groups[group] if group else own
        W, H = im.size
        crop = fixed.get(group) or (max(0, bb[0] - PAD), max(0, bb[1] - PAD), min(W, bb[2] + PAD), min(H, bb[3] + PAD))
        if group in fixed and not (own[0] >= crop[0] and own[1] >= crop[1] and own[2] <= crop[2] and own[3] <= crop[3]):
            print(f"warning {aid}: visible area extends past the shared crop of {group}")
        cut = im.crop(crop)
        if aid in TILE_V:
            cut = make_tileable(cut.convert("RGBA"))
        k = size / max(cut.size)
        out = cut.convert("RGBa").resize((max(1, round(cut.width * k)), max(1, round(cut.height * k))), Image.LANCZOS).convert("RGBA")
        rid = runtime_id(f, counts[aid] > 1)
        rel = f"assets/sprites/{rid}.webp"
        out.save(ROOT / rel, "WEBP", quality=90, method=6)
        w, h = out.size
        vis = [(own[0] - crop[0]) * k, (own[1] - crop[1]) * k, (own[2] - crop[0]) * k, (own[3] - crop[1]) * k]
        pivot = [w / 2, h / 2] if pivot_rule == "center" else [w / 2, vis[3]]
        anchors = {}
        if aid.startswith("weapon_") or aid.endswith("signature_mount"):
            anchors = {"muzzle": [round((vis[0] + vis[2]) / 2, 1), round(vis[1], 1)], "socket": [round((vis[0] + vis[2]) / 2, 1), round(vis[3], 1)]}
        sidecar = {
            "asset_id": rid if counts[aid] > 1 else aid, "source_filename": f"art/source/{batch.lower()}/{fname(f)}", "source_sha256": sha,
            "canvas_size": [W, H], "trim_rect": list(crop), "runtime_size": [w, h], "scale": round(k, 5),
            "visible_rect": [round(v, 1) for v in vis], "pivot_px": [round(pivot[0], 1), round(pivot[1], 1)],
            "attachment_anchors": anchors, "blend_mode": f.get("blend", "alpha"), "color_space": "sRGB",
            "provenance": f"{manifest.get('generator', 'ChatGPT imagegen')} via owner, {batch}",
            "status": "approved" if aid in approved_only else "integrated",
            "notes": "anchors estimated from visible bounds; " + ("approved, not used by the current build yet" if aid in approved_only else "verified visually in the web build"),
        }
        if counts[aid] > 1:
            sidecar["frame_index"] = frame_of(f)
            sidecar["notes"] += f"; keyframe {frame_of(f)} of a {f.get('requested_frame_count', '?')}-frame effect"
        if aid in TILE_V:
            sidecar["notes"] += f"; runtime copy made vertically tileable ({int(SEAM_BAND * 100)}% band cross-fade)"
        (ROOT / f"assets/sprites/{rid}.json").write_text(json.dumps(sidecar, indent=2), encoding="utf-8")
        imported.setdefault(aid, rel)
        print(f"{rid}: {W}x{H} crop {crop} -> {w}x{h} ({(ROOT / rel).stat().st_size // 1024} KB)")
    # manifest status + runtime_path
    mpath = ROOT / "art/asset_manifest.csv"
    rows = list(csv.DictReader(mpath.open(encoding="utf-8")))
    fields = list(rows[0].keys())
    if "runtime_path" not in fields:
        fields.append("runtime_path")
    known = {r["asset_id"] for r in rows}
    for aid in imported:
        if aid not in known:
            cat = next((v for k, v in EXTRA_CATEGORY.items() if aid.startswith(k)), None)
            if cat:
                rows.append({"asset_id": aid, "category": cat[0], "source_size": cat[1], "frame_count": "1", "blend_mode": cat[2],
                             "status": "planned", "reference_path": "", "milestone": cat[3], "provenance": "", "runtime_path": ""})
    for r in rows:
        r.setdefault("runtime_path", "")
        if r["asset_id"] in imported:
            r["status"] = "approved" if r["asset_id"] in approved_only else "integrated"
            r["runtime_path"] = imported[r["asset_id"]]
            r["provenance"] = f"ChatGPT imagegen via owner ({batch}); source in art/source/{batch.lower()}"
    with mpath.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print(f"manifest updated: {len(imported) - len(approved_only & set(imported))} integrated, {len(approved_only & set(imported))} approved")


if __name__ == "__main__":
    # optional 3rd arg: comma-separated ids imported but not yet used in the build (status "approved")
    main(Path(sys.argv[1]), sys.argv[2], frozenset(sys.argv[3].split(",")) if len(sys.argv) > 3 else frozenset())
