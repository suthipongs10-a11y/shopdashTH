"""Package one ChatGPT request batch as its own ZIP for the owner.

Usage (from rocket-breakers/): python3 tools/make_batch_zip.py 004 [extra_reference_file ...]
Writes art/requests/batch_zips/RB_BATCH_<n>_REQUEST.zip containing the START_HERE rules,
BATCH_<n>.md, a short Thai README and the reference images that batch names (+ extras).
"""
import re
import sys
import zipfile
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "art/requests/chatgpt_pack"
REFS = {
    "modular_ships": "art/concepts/modular_ships.png", "salvage_sequence": "art/concepts/salvage_sequence.png",
    "galaxy_map": "art/concepts/galaxy_map.png", "vfx_concepts": "art/concepts/vfx_concepts.png",
    "powerups_board": "expansion_01/art/powerups_board.png", "enemies_board": "expansion_01/art/enemies_board.png",
    "bosses_board": "expansion_01/art/bosses_board.png", "gameplay_powerup": "expansion_01/art/gameplay_powerup.png",
    "fx_explosion": "expansion_01/art/fx_explosion.png", "fx_ion": "expansion_01/art/fx_ion.png",
    "fx_plasma": "expansion_01/art/fx_plasma.png", "fx_shield": "expansion_01/art/fx_shield.png",
}
README = """# BATCH_{n} — {title}

1. เปิดแชตใหม่ใน ChatGPT แนบ `00_START_HERE_FOR_CHATGPT.md` ให้อ่านก่อน
2. แนบ `BATCH_{n}.md` พร้อมภาพทั้งหมดในโฟลเดอร์ `references/`
3. ให้สร้างทีละภาพตามลำดับ ใช้ชื่อไฟล์ตามที่กำหนด
4. ได้ครบแล้วรวมเป็น ZIP ส่งกลับมาให้ Claude ตรวจและใส่เข้าเกม
{extra}"""


def jpeg(path: Path) -> bytes:
    im = Image.open(path)
    if im.mode == "RGBA":
        bg = Image.new("RGBA", im.size, (11, 20, 36, 255))
        bg.alpha_composite(im)
        im = bg
    im = im.convert("RGB")
    im.thumbnail((1400, 1400))
    buf = BytesIO()
    im.save(buf, "JPEG", quality=88)
    return buf.getvalue()


def main(n: str, extras: list[str], note: str = ""):
    batch = (PACK / "batches" / f"BATCH_{n}.md").read_text(encoding="utf-8")
    title = batch.splitlines()[0].split("—", 1)[1].strip()
    names = re.findall(r"references/([a-z_]+)\.jpg", batch.split("\n", 4)[2])
    out = ROOT / "art/requests/batch_zips" / f"RB_BATCH_{n}_REQUEST.zip"
    out.parent.mkdir(parents=True, exist_ok=True)
    base = f"RB_BATCH_{n}_REQUEST"
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(PACK / "00_START_HERE_FOR_CHATGPT.md", f"{base}/00_START_HERE_FOR_CHATGPT.md")
        z.writestr(f"{base}/BATCH_{n}.md", batch)
        z.writestr(f"{base}/README_TH.md", README.format(n=n, title=title, extra=note))
        for name in names:
            z.writestr(f"{base}/references/{name}.jpg", jpeg(ROOT / REFS[name]))
        for extra in extras:
            p = Path(extra)
            z.write(p, f"{base}/references/{p.name}")
    print(f"{out.relative_to(ROOT)}: {len(names)} refs + {len(extras)} extras, {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
