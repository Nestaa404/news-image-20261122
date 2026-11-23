#!/usr/bin/env python3
"""Render the bitmap glyphs for the 22 November front page into font.json.

Uses PIL to draw DejaVu Sans (regular and bold) at the point sizes the
layout asks for, then stores each glyph as a small grayscale bitmap plus
its advance width and its offset from the baseline. main.ts only needs
those bitmaps, so no font engine is needed when the page is drawn.

Usage: python3 tools/make_font.py   (from anywhere; paths are absolute)
"""

import base64
import json
import os

from PIL import Image, ImageDraw, ImageFont

TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(TOOL_DIR)
FONT_DIR = "/usr/share/fonts/truetype/dejavu"

# Point sizes used by the page layout, in both weights.
POINT_SIZES = [13, 14, 15, 16, 17, 19, 20, 22, 24, 34, 48]
WEIGHTS = {
    "regular": os.path.join(FONT_DIR, "DejaVuSans.ttf"),
    "bold": os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf"),
}

# Printable ASCII, plus the extra marks the page text needs: dashes,
# curly quotes, bullet, middle dot, arrows, multiply, euro, true minus,
# and the accented letters in names such as Thitikul, Kurum and O'Brien.
EXTRA = (
    "\u2014\u2013\u2019\u2018\u201c\u201d\u2022\u2192\u2193\u2191"
    "\u00d7\u20ac\u00b7\u2212"
    "\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1\u00fc"
    "\u00c1\u00c9\u00cd\u00d3\u00da\u00d1\u00dc"
    "\u00e0\u00e8\u00ea\u00e7"
)
ALPHABET = "".join(chr(code) for code in range(32, 127)) + EXTRA

MARGIN = 2


def bake_glyph(font, char):
    """Draw one character; return metrics and a base64 grayscale bitmap.

    The anchor "ls" puts the origin on the baseline at the left edge, so
    the returned box is already relative to the baseline, which is the
    convention the TypeScript renderer expects.
    """
    left, top, right, bottom = font.getbbox(char, anchor="ls")
    width = right - left
    height = bottom - top
    advance = int(round(font.getlength(char)))
    if width <= 0 or height <= 0:
        return {"adv": advance, "x": 0, "y": 0, "w": 0, "h": 0, "d": ""}
    canvas = Image.new("L", (width + 2 * MARGIN, height + 2 * MARGIN), 0)
    pen = ImageDraw.Draw(canvas)
    pen.text((MARGIN - left, MARGIN - top), char, font=font, fill=255, anchor="ls")
    return {
        "adv": advance,
        "x": left - MARGIN,
        "y": top - MARGIN,
        "w": width + 2 * MARGIN,
        "h": height + 2 * MARGIN,
        "d": base64.b64encode(canvas.tobytes()).decode("ascii"),
    }


def build():
    document = {"sizes": {}, "chars": sorted(set(ALPHABET))}
    total = 0
    for weight, path in WEIGHTS.items():
        for size in POINT_SIZES:
            font = ImageFont.truetype(path, size)
            glyphs = {}
            for char in ALPHABET:
                glyphs[char] = bake_glyph(font, char)
                total += 1
            rise, fall = font.getmetrics()
            document["sizes"]["%s-%d" % (weight, size)] = {
                "ascent": int(rise),
                "descent": int(fall),
                "glyphs": glyphs,
            }
    target = os.path.join(REPO_ROOT, "font.json")
    with open(target, "w", encoding="utf-8") as handle:
        json.dump(document, handle, ensure_ascii=False, separators=(",", ":"))
    print("wrote %s (%d bytes, %d glyphs)" % (target, os.path.getsize(target), total))


if __name__ == "__main__":
    build()
