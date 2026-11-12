"""Generates art/_templates/character_template_8dir.png: a labelled grid showing where each
direction and frame goes in a character sprite sheet. Run: python3 tools/make_template.py"""
import math
import os

from PIL import Image, ImageDraw, ImageFont

CELL = 256
COLS = 6
DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"]
FEET_FROM_BOTTOM = 26
OUT = os.path.join(os.path.dirname(__file__), "..", "art", "_templates", "character_template_8dir.png")
FONT_PATH = os.path.join(os.path.dirname(__file__), "..", "fonts", "Kanit-Medium.ttf")


def main() -> None:
    img = Image.new("RGBA", (CELL * COLS, CELL * len(DIRECTIONS)), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT_PATH, 22)
    for row, name in enumerate(DIRECTIONS):
        # Screen angle, clockwise from "down": S, SW, W, NW, N, NE, E, SE.
        angle = row * math.pi / 4
        dx, dy = -math.sin(angle), math.cos(angle)
        for col in range(COLS):
            x0, y0 = col * CELL, row * CELL
            draw.rectangle([x0, y0, x0 + CELL - 1, y0 + CELL - 1], outline=(255, 80, 80, 255))
            feet_y = y0 + CELL - FEET_FROM_BOTTOM
            cx = x0 + CELL // 2
            draw.line([x0 + 40, feet_y, x0 + CELL - 40, feet_y], fill=(80, 200, 255, 255), width=2)
            # Stand-in body: an ellipse standing on the feet line, with a facing arrow.
            draw.ellipse([cx - 34, feet_y - 150, cx + 34, feet_y], outline=(120, 120, 120, 255), width=3)
            ax, ay = cx, feet_y - 75
            draw.line([ax, ay, ax + dx * 60, ay + dy * 60 * 0.62], fill=(255, 200, 40, 255), width=6)
            draw.ellipse([ax + dx * 60 - 8, ay + dy * 60 * 0.62 - 8, ax + dx * 60 + 8, ay + dy * 60 * 0.62 + 8],
                         fill=(255, 200, 40, 255))
            draw.text((x0 + 8, y0 + 6), f"{name}  {col + 1}", font=font, fill=(255, 255, 255, 255),
                      stroke_width=2, stroke_fill=(0, 0, 0, 255))
    img.save(OUT)
    print("wrote", os.path.normpath(OUT), img.size)


if __name__ == "__main__":
    main()
