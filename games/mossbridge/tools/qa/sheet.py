#!/usr/bin/env python3
"""Combine qa-out/frames.json into one labelled contact sheet: python3 tools/qa/sheet.py [cols] [out.png]"""
import json, os, sys
from PIL import Image, ImageDraw
OUT = os.environ.get("OUT", os.path.join(os.path.dirname(__file__), "..", "..", "qa-out"))
cols = int(sys.argv[1]) if len(sys.argv) > 1 else 8
dest = sys.argv[2] if len(sys.argv) > 2 else os.path.join(OUT, "sheet.png")
fr = json.load(open(os.path.join(OUT, "frames.json")))
w, h = 200, 260; rows = (len(fr) + cols - 1) // cols
sh = Image.new("RGB", (cols * w, rows * h), (30, 30, 30)); d = ImageDraw.Draw(sh)
for i, (f, label) in enumerate(fr):
    sh.paste(Image.open(f).resize((w, h)), ((i % cols) * w, (i // cols) * h))
    d.text(((i % cols) * w + 4, (i // cols) * h + 4), label, fill=(255, 255, 0))
sh.save(dest); print(dest)
