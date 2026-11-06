#!/usr/bin/env python3
"""
make_pack.py — zip a ChatGPT prompt pack for the owner (phone workflow: download the zip, give it to ChatGPT).

A pack is a folder under chatgpt-pack/packs/<name>/ with the text files (README, START_HERE, STEP prompts) and
an optional refs.txt listing reference images to copy into refs/ of the zip, one path per line, relative to
games/mossbridge (our own images only: chatgpt-pack/refs/, art/raw/ — never images from other games).

Usage (from games/mossbridge):  python3 tools/make_pack.py P12_walk_sword
  -> Mossbridge_P12_walk_sword.zip in games/mossbridge/
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    name = sys.argv[1]
    src = os.path.join(ROOT, "chatgpt-pack", "packs", name)
    out = os.path.join(ROOT, f"Mossbridge_{name}.zip")
    refs = []
    if os.path.exists(os.path.join(src, "refs.txt")):
        with open(os.path.join(src, "refs.txt")) as f:
            refs = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for fn in sorted(os.listdir(src)):
            if fn == "refs.txt" or fn.startswith("."):
                continue
            z.write(os.path.join(src, fn), fn)
        for r in refs:
            p = os.path.join(ROOT, r)
            if not os.path.exists(p):
                raise SystemExit(f"missing ref: {r}")
            z.write(p, "refs/" + os.path.basename(p))
    with zipfile.ZipFile(out) as z:
        for i in z.infolist():
            print(f"{i.file_size:>9}  {i.filename}")
    print(f"-> {os.path.relpath(out, ROOT)}  ({os.path.getsize(out) // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
