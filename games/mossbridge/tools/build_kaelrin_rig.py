#!/usr/bin/env python3
"""
build_kaelrin_rig.py — cut Kaelrin's headless body into rig pieces (reproducible).

Reads the rig file demo/rigs/kaelrin.json (joints + cut polygons, edited in demo/rig-editor.html)
and the cleaned headless bodies art/samples/kaelrin/body_headless_{view}.png, then per view:

  1. Partition: every opaque pixel goes to exactly one slot. Slots with a `poly` claim the pixels
     inside it, front-most slot in `drawOrder` first; the slot with `poly: null` (torso) gets the
     rest. Drawn together at rest, the pieces reproduce the painting pixel for pixel.
  2. Hidden parts: a piece also needs paint where another piece covers it at rest (the torso
     behind the front arm, the thighs under the tunic), or gaps open when limbs move. The fill
     region is the pixels within AUTO_FILL px of the piece that pieces drawn above it cover, plus the
     slot's optional `fill` polygon limited to the torso (the slot with poly: null) drawn above it.
     So a fill can never show at rest, and a big hidden part never rides along under a moving limb.
     It is painted by diffusing the piece's own colors outward, then smoothed.
  3. Cut edges of pieces that sit on top of another piece are feathered by one pixel.
  4. Pieces are packed into one atlas per view: demo/assets/kaelrin_{view}_parts.png.
     Each slot gets `rect` (x, y, w, h in the atlas) and `pos` (its top-left on the 320x320
     view canvas); `built` stores a hash of the cut data so the editor can tell when to rebuild.

Usage (from games/mossbridge):  python3 tools/build_kaelrin_rig.py [--debug DIR]
  --debug DIR  also writes DIR/rig_{view}.png: pieces tinted, polygons and joints drawn (4x).
Requires: Pillow, numpy
"""
import hashlib
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RIG = os.path.join(ROOT, "demo", "rigs", "kaelrin.json")
SRC = os.path.join(ROOT, "art", "samples", "kaelrin", "body_headless_{}.png")
OUT = os.path.join(ROOT, "demo", "assets")

AUTO_FILL = 8      # px every piece extends under the pieces drawn above it
PAD = 6            # transparent gap around each piece in the atlas (mipmaps)
ATLAS_W = 256
OPAQUE = 8         # alpha above this counts as part of the figure


def poly_mask(poly, shape):
    im = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(im).polygon([tuple(p) for p in poly], fill=255)
    return np.array(im) > 0


def dilate(m, r):
    out = m.copy()
    for _ in range(r):
        g = out.copy()
        g[1:] |= out[:-1]; g[:-1] |= out[1:]; g[:, 1:] |= out[:, :-1]; g[:, :-1] |= out[:, 1:]
        out = g
    return out


def diffuse_fill(rgb, known, region, smooth=3):
    """Paint `region` from the colors of `known` pixels: grow outward one ring at a time, each new
    pixel taking the mean of its known 8-neighbours, then blur inside the region a little."""
    col = rgb.astype(np.float32).copy()
    col[~known] = 0
    k = known.copy()
    todo = region & ~k
    while todo.any():
        acc = np.zeros_like(col); cnt = np.zeros(k.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dx or dy:
                    sk = np.roll(np.roll(k, dy, 0), dx, 1)
                    acc += np.roll(np.roll(col, dy, 0), dx, 1) * sk[..., None]
                    cnt += sk
        new = todo & (cnt > 0)
        if not new.any():
            break
        col[new] = acc[new] / cnt[new][:, None]
        k |= new; todo &= ~new
    for _ in range(smooth):  # soften the streaks of the ring growth, inside the region only
        acc = np.zeros_like(col); cnt = np.zeros(k.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                acc += np.roll(np.roll(col, dy, 0), dx, 1); cnt += 1
        blur = acc / cnt[..., None]
        col[region & ~known] = blur[region & ~known]
    return np.clip(col, 0, 255).astype(np.uint8)


def erode(m, r):
    return ~dilate(~m, r)


def drop_specks(alpha, min_px=40):
    """Clear tiny islands (stray pixels of the cleaned painting) so they cannot float off a limb."""
    m = alpha > 0
    lab = np.zeros(m.shape, np.int32); k = 0; keep = np.zeros(m.shape, bool)
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]:
            continue
        k += 1; stack = [(y, x)]; lab[y, x] = k; pts = []
        while stack:
            cy, cx = stack.pop(); pts.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = k; stack.append((ny, nx))
        if len(pts) >= min_px:
            ys, xs = zip(*pts); keep[list(ys), list(xs)] = True
    return np.where(keep, alpha, 0).astype(alpha.dtype), int((m & ~keep).sum())


def cut_hash(view):
    data = {"slots": [[s["name"], s.get("poly"), s.get("fill")] for s in view["slots"]], "order": view["drawOrder"], "auto": AUTO_FILL}
    return hashlib.sha1(json.dumps(data, sort_keys=True).encode()).hexdigest()[:12]


def build_view(name, view, debug_dir=None):
    rgba = np.array(Image.open(SRC.format(name)).convert("RGBA"))
    rgba[..., 3], specks = drop_specks(rgba[..., 3])
    shape = rgba.shape[:2]
    fig = rgba[..., 3] > OPAQUE
    slots = {s["name"]: s for s in view["slots"]}
    order = [n for n in view["drawOrder"] if n in slots]           # back -> front
    owned = np.zeros(shape, bool)
    own = {}
    for n in reversed(order):                                        # front-most claims first
        s = slots[n]
        if s.get("poly") is None:
            continue
        m = poly_mask(s["poly"], shape) & (rgba[..., 3] > 0) & ~owned
        own[n] = m; owned |= m
    rest = [n for n in order if slots[n].get("poly") is None]
    if len(rest) != 1:
        raise SystemExit(f"{name}: exactly one slot must have poly: null (got {rest})")
    own[rest[0]] = (rgba[..., 3] > 0) & ~owned

    pieces = {}
    for i, n in enumerate(order):
        s = slots[n]
        above = np.zeros(shape, bool)
        for m in order[i + 1:]:
            above |= own[m] & fig
        region = dilate(own[n] & fig, AUTO_FILL) & above
        if s.get("fill") and rest[0] != n:   # larger hidden parts only go under the torso, never under
            region |= poly_mask(s["fill"], shape) & own[rest[0]] & fig & above   # a moving arm or leg
        region &= ~own[n]
        # paint the hidden part from the piece's inside: its outer 2 px are mostly the dark outline,
        # which would smear into dark streaks once a limb moves and shows the fill
        solid = own[n] & (rgba[..., 3] > 128)
        known = erode(solid, 2)
        if known.sum() < 0.3 * solid.sum():
            known = solid
        rgb = rgba[..., :3]
        if region.any():
            filled = diffuse_fill(rgba[..., :3], known, region | (solid & ~known))
            rgb = np.where(region[..., None], filled, rgba[..., :3])
        a = np.where(own[n], rgba[..., 3], 0).astype(np.float32)
        # feather the cut edge where this piece lies on another piece (not its silhouette)
        if i > 0:
            under = np.zeros(shape, bool)
            for m in order[:i]:
                under |= own[m] & fig
            nb = np.zeros(shape, bool)
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nb |= np.roll(np.roll(under & ~own[n], dy, 0), dx, 1)
            a[own[n] & nb] *= 0.55
        # the fill fades out over 2 px at its own outer edge, so a hidden part that slides into view
        # does not show a hard, oddly shaped border (at rest it is covered either way)
        body = own[n] | region
        a[region] = 255
        a[region & ~erode(body, 1)] = 90
        a[region & erode(body, 1) & ~erode(body, 2)] = 180
        out = np.dstack([np.where((own[n] | region)[..., None], rgb, 0), a.astype(np.uint8)])
        ys, xs = np.nonzero(out[..., 3])
        if not len(xs):
            raise SystemExit(f"{name}/{n}: empty piece")
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        pieces[n] = (out[y0:y1, x0:x1], (int(x0), int(y0)))

    # shelf-pack into the atlas, tallest first
    items = sorted(pieces.items(), key=lambda kv: -kv[1][0].shape[0])
    x = y = PAD; shelf = 0; place = {}
    for n, (img, _) in items:
        h, w = img.shape[:2]
        if x + w + PAD > ATLAS_W:
            x = PAD; y += shelf + PAD; shelf = 0
        place[n] = (x, y); x += w + PAD; shelf = max(shelf, h)
    H = y + shelf + PAD
    atlas = np.zeros((H, ATLAS_W, 4), np.uint8)
    for n, (img, pos) in pieces.items():
        ax, ay = place[n]; h, w = img.shape[:2]
        atlas[ay:ay + h, ax:ax + w] = img
        slots[n]["rect"] = [ax, ay, w, h]
        slots[n]["pos"] = list(pos)
    Image.fromarray(atlas).save(os.path.join(OUT, view["atlas"]), optimize=True)
    view["built"] = cut_hash(view)

    if debug_dir:
        debug_image(name, view, rgba, own, pieces, debug_dir)
    return {n: (int(own[n].sum()), int((pieces[n][0][..., 3] > 0).sum())) for n in order}


COLORS = [(255, 80, 80), (80, 200, 255), (255, 210, 60), (120, 255, 120), (230, 120, 255), (255, 150, 60)]


def debug_image(name, view, rgba, own, pieces, d):
    k = 4
    base = Image.new("RGBA", (rgba.shape[1], rgba.shape[0]), (225, 225, 225, 255))
    base.alpha_composite(Image.fromarray(rgba))
    tint = np.array(base).astype(np.float32)
    for i, s in enumerate(view["slots"]):
        m = own[s["name"]]
        tint[m, :3] = tint[m, :3] * 0.65 + np.array(COLORS[i % len(COLORS)]) * 0.35
    img = Image.fromarray(tint.astype(np.uint8)).resize((rgba.shape[1] * k, rgba.shape[0] * k), Image.NEAREST)
    dr = ImageDraw.Draw(img)
    for i, s in enumerate(view["slots"]):
        if s.get("poly"):
            dr.line([(x * k, y * k) for x, y in s["poly"] + s["poly"][:1]], fill=COLORS[i % len(COLORS)] + (255,), width=2)
        if s.get("fill"):
            dr.line([(x * k, y * k) for x, y in s["fill"] + s["fill"][:1]], fill=(40, 40, 40, 255), width=1)
    J = view["joints"]
    rig = json.load(open(RIG, encoding="utf-8"))
    for b in rig["bones"]:
        a, c = J[b["from"]], J[b["to"]]
        dr.line([(a[0] * k, a[1] * k), (c[0] * k, c[1] * k)], fill=(0, 0, 0, 255), width=3)
    for jn, (x, y) in J.items():
        dr.ellipse([x * k - 6, y * k - 6, x * k + 6, y * k + 6], fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=2)
        dr.text((x * k + 8, y * k - 6), jn, fill=(0, 0, 0, 255))
    ys, xs = np.nonzero(rgba[..., 3])
    box = (max(0, xs.min() - 12) * k, max(0, ys.min() - 12) * k, min(rgba.shape[1], xs.max() + 12) * k, min(rgba.shape[0], ys.max() + 6) * k)
    img.crop(box).convert("RGB").save(os.path.join(d, f"rig_{name}.png"))
    # pieces laid out flat on a checker so fills are visible
    W = sum(p[0].shape[1] + 8 for p in pieces.values()); H = max(p[0].shape[0] for p in pieces.values())
    sheet = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    ck = ImageDraw.Draw(sheet)
    for yy in range(0, H, 8):
        for xx in range(0, W, 8):
            if (xx // 8 + yy // 8) % 2:
                ck.rectangle([xx, yy, xx + 7, yy + 7], fill=(200, 200, 200, 255))
    x = 0
    for n, (img2, _) in pieces.items():
        sheet.alpha_composite(Image.fromarray(img2), (x, 0)); x += img2.shape[1] + 8
    sheet = sheet.resize((W * 3, H * 3), Image.NEAREST)
    sheet.convert("RGB").save(os.path.join(d, f"pieces_{name}.png"))


def fmt(o, ind=0):
    """JSON with nested objects indented and number lists / point lists kept on one line."""
    sp = " " * ind
    if isinstance(o, dict):
        if not o:
            return "{}"
        items = [f'{sp} {json.dumps(k)}: {fmt(v, ind + 1)}' for k, v in o.items()]
        return "{\n" + ",\n".join(items) + "\n" + sp + "}"
    if isinstance(o, list):
        flat = all(not isinstance(v, (dict, list)) for v in o) or all(isinstance(v, list) and all(not isinstance(w, (dict, list)) for w in v) for v in o)
        if flat:
            return json.dumps(o, separators=(",", ":")) if o and isinstance(o[0], list) else json.dumps(o)
        if all(isinstance(v, dict) and len(json.dumps(v)) < 150 for v in o):
            return "[\n" + ",\n".join(f"{sp}  " + json.dumps(v, separators=(", ", ": ")) for v in o) + "\n" + sp + " ]"
        return "[\n" + ",\n".join(f"{sp}  " + fmt(v, ind + 2) for v in o) + "\n" + sp + " ]"
    return json.dumps(o)


def main():
    debug = None
    if "--debug" in sys.argv:
        debug = sys.argv[sys.argv.index("--debug") + 1]
        os.makedirs(debug, exist_ok=True)
    rig = json.load(open(RIG, encoding="utf-8"))
    for name, view in rig["views"].items():
        stats = build_view(name, view, debug)
        print(name, view["atlas"], {n: f"{a} own / {b} drawn" for n, (a, b) in stats.items()})
    with open(RIG, "w", encoding="utf-8") as f:
        f.write(fmt(rig) + "\n")


if __name__ == "__main__":
    main()
