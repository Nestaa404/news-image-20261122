// THE WORLD IN ONE DAY — Sunday 22 November 2026.
//
// A one-page newspaper front page (1024x1024) drawn entirely in code:
// the masthead, headlines, body text, scenes and icons are all rendered
// by this program. Node standard library only. No network, no clock, no
// randomness: two runs write byte-identical output.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PAGE = 1024;

// ------------------------------------------------------------------ colours
type Tint = [number, number, number];
const PAPER: Tint = [247, 242, 228];
const INK: Tint = [24, 24, 22];
const NAVY: Tint = [28, 42, 74];
const DARK: Tint = [16, 24, 46];
const RED: Tint = [158, 28, 28];
const GREY: Tint = [102, 100, 92];
const FAINT: Tint = [126, 121, 108];
const RULE: Tint = [196, 191, 178];
const SEA: Tint = [64, 110, 150];
const DEEP: Tint = [36, 74, 110];
const SAND: Tint = [214, 196, 150];
const FLAME: Tint = [228, 122, 26];
const EMBER: Tint = [214, 164, 36];
const LEAF: Tint = [46, 110, 62];
const STEEL: Tint = [74, 88, 100];
const SMOKE: Tint = [168, 166, 156];
const WHITE: Tint = [255, 255, 255];
const CREAM: Tint = [238, 230, 196];

// ------------------------------------------------------------- raster sheet
class Sheet {
  pixels = new Uint8Array(PAGE * PAGE * 3);

  constructor() {
    this.paint(PAPER);
  }

  paint(c: Tint) {
    for (let i = 0; i < PAGE * PAGE; i++) {
      this.pixels[i * 3] = c[0];
      this.pixels[i * 3 + 1] = c[1];
      this.pixels[i * 3 + 2] = c[2];
    }
  }

  dot(x: number, y: number, c: Tint) {
    if (x < 0 || y < 0 || x >= PAGE || y >= PAGE) return;
    const i = (y * PAGE + x) * 3;
    this.pixels[i] = c[0];
    this.pixels[i + 1] = c[1];
    this.pixels[i + 2] = c[2];
  }

  // Blend one pixel toward a colour by an 0..255 alpha.
  wash(x: number, y: number, c: Tint, a: number) {
    if (x < 0 || y < 0 || x >= PAGE || y >= PAGE || a <= 0) return;
    const i = (y * PAGE + x) * 3;
    const keep = 255 - a;
    this.pixels[i] = (c[0] * a + this.pixels[i] * keep) >> 8;
    this.pixels[i + 1] = (c[1] * a + this.pixels[i + 1] * keep) >> 8;
    this.pixels[i + 2] = (c[2] * a + this.pixels[i + 2] * keep) >> 8;
  }

  box(x: number, y: number, w: number, h: number, c: Tint) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(PAGE, Math.round(x + w));
    const y1 = Math.min(PAGE, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.dot(xx, yy, c);
    }
  }

  hRule(x: number, y: number, w: number, c: Tint, t = 1) {
    this.box(x, y, w, t, c);
  }

  vRule(x: number, y: number, h: number, c: Tint, t = 1) {
    this.box(x, y, t, h, c);
  }

  // Straight segment of the given thickness.
  stroke(x0: number, y0: number, x1: number, y1: number, c: Tint, t = 1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    const r = Math.max(1, Math.floor(t / 2));
    for (let s = 0; s <= steps; s++) {
      const cx = Math.round(x0 + (dx * s) / steps);
      const cy = Math.round(y0 + (dy * s) / steps);
      this.box(cx - r, cy - r, r * 2 + 1, r * 2 + 1, c);
    }
  }

  disc(cx: number, cy: number, r: number, c: Tint) {
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(r * r - y * y));
      for (let x = -half; x <= half; x++) this.dot(cx + x, cy + y, c);
    }
  }

  ring(cx: number, cy: number, r: number, c: Tint, t = 2) {
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      this.box(
        Math.round(cx + r * Math.cos(rad)) - Math.floor(t / 2),
        Math.round(cy + r * Math.sin(rad)) - Math.floor(t / 2),
        t,
        t,
        c,
      );
    }
  }

  // Scanline fill for a simple polygon.
  fillPoly(corners: Array<[number, number]>, c: Tint) {
    let top = Infinity;
    let bottom = -Infinity;
    for (const [, y] of corners) {
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    for (let y = Math.ceil(top); y <= Math.floor(bottom); y++) {
      const cuts: number[] = [];
      for (let i = 0; i < corners.length; i++) {
        const [x0, y0] = corners[i];
        const [x1, y1] = corners[(i + 1) % corners.length];
        if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
          cuts.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      cuts.sort((a, b) => a - b);
      for (let k = 0; k + 1 < cuts.length; k += 2) {
        for (let x = Math.ceil(cuts[k]); x <= Math.floor(cuts[k + 1]); x++) {
          this.dot(x, y, c);
        }
      }
    }
  }

  // Four-point burst used for explosions and sparks.
  burst(cx: number, cy: number, r: number, c: Tint) {
    const k = 0.3;
    this.fillPoly(
      [
        [cx, cy - r],
        [cx + r * k, cy - r * k],
        [cx + r, cy],
        [cx + r * k, cy + r * k],
        [cx, cy + r],
        [cx - r * k, cy + r * k],
        [cx - r, cy],
        [cx - r * k, cy - r * k],
      ],
      c,
    );
  }
}

// -------------------------------------------------------------------- type
type Glyph = { adv: number; x: number; y: number; w: number; h: number; d: string };
type Face = { ascent: number; descent: number; glyphs: Record<string, Glyph> };

const FONT = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "font.json"), "utf8"),
) as { sizes: Record<string, Face> };

const glyphStore = new Map<string, { g: Glyph; px: Buffer }>();
function takeGlyph(face: string, ch: string): { g: Glyph; px: Buffer } {
  const key = face + "|" + ch;
  const found = glyphStore.get(key);
  if (found) return found;
  const f = FONT.sizes[face];
  const g = f.glyphs[ch] ?? f.glyphs["?"];
  const entry = { g, px: Buffer.from(g.d, "base64") };
  glyphStore.set(key, entry);
  return entry;
}

function measure(text: string, face: string): number {
  let w = 0;
  for (const ch of text) w += takeGlyph(face, ch).g.adv;
  return w;
}

// Draw text with its baseline at `base`; returns the pen position.
function ink(s: Sheet, x: number, base: number, text: string, face: string, c: Tint): number {
  let pen = Math.round(x);
  const by = Math.round(base);
  for (const ch of text) {
    const { g, px } = takeGlyph(face, ch);
    if (g.w > 0 && g.h > 0) {
      for (let yy = 0; yy < g.h; yy++) {
        for (let xx = 0; xx < g.w; xx++) {
          const a = px[yy * g.w + xx];
          if (a > 0) s.wash(pen + g.x + xx, by + g.y + yy, c, a);
        }
      }
    }
    pen += g.adv;
  }
  return pen;
}

function inkCentred(s: Sheet, cx: number, base: number, text: string, face: string, c: Tint) {
  ink(s, cx - measure(text, face) / 2, base, text, face, c);
}

// Split text into lines that fit maxW.
function flow(text: string, face: string, maxW: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const trial = cur ? cur + " " + word : word;
    if (measure(trial, face) <= maxW || !cur) cur = trial;
    else {
      out.push(cur);
      cur = word;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// Draw a wrapped paragraph; `firstBase` is the baseline of the first line.
// Returns the baseline of the last line drawn.
function block(s: Sheet, x: number, firstBase: number, text: string, face: string, maxW: number, leading: number, c: Tint): number {
  let base = firstBase;
  for (const line of flow(text, face, maxW)) {
    ink(s, x, base, line, face, c);
    base += leading;
  }
  return base - leading;
}

// --------------------------------------------------------------------- png
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    t[n] = v;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePng(s: Sheet): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(PAGE, 0);
  ihdr.writeUInt32BE(PAGE, 4);
  ihdr[8] = 8; // 8-bit samples
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(PAGE * (1 + PAGE * 3));
  for (let y = 0; y < PAGE; y++) {
    raw[y * (1 + PAGE * 3)] = 0; // no filter
    raw.set(s.pixels.subarray(y * PAGE * 3, (y + 1) * PAGE * 3), y * (1 + PAGE * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}

// -------------------------------------------------------------- illustrations

// The summit that ended with nothing: a cracked globe above a long table
// of little flags, under a dark sky. Drawn inside the lead column.
function summitScene(s: Sheet, x: number, y: number, w: number, h: number) {
  const floorY = y + h - 18;
  s.box(x, y, w, h, DARK);
  // Stars.
  const stars: Array<[number, number]> = [
    [14, 8], [44, 14], [80, 6], [120, 12], [170, 7], [230, 13], [290, 6],
    [350, 12], [410, 8], [470, 14], [530, 7], [570, 12], [200, 20], [420, 20],
  ];
  for (const [sx, sy] of stars) s.disc(x + sx, y + sy, 1, [215, 215, 195]);
  // Moon, top right.
  s.disc(x + w - 46, y + 16, 10, CREAM);
  s.disc(x + w - 50, y + 13, 8, DARK);
  // The globe, centre-left, with a jagged red crack across it.
  const gx = x + 92;
  const gy = y + 26;
  s.disc(gx, gy, 20, [96, 156, 200]);
  s.disc(gx - 8, gy - 6, 6, LEAF);
  s.disc(gx + 6, gy + 7, 5, LEAF);
  s.disc(gx + 2, gy - 11, 3, LEAF);
  s.ring(gx, gy, 20, NAVY, 2);
  s.stroke(gx - 14, gy - 18, gx - 4, gy - 4, RED, 3);
  s.stroke(gx - 4, gy - 4, gx + 6, gy + 2, RED, 3);
  s.stroke(gx + 6, gy + 2, gx + 2, gy + 14, RED, 3);
  s.stroke(gx + 2, gy + 14, gx + 12, gy + 19, RED, 3);
  // A red cross over the globe: no deal.
  s.stroke(gx + 26, gy - 22, gx + 40, gy - 8, RED, 3);
  s.stroke(gx + 40, gy - 22, gx + 26, gy - 8, RED, 3);
  // The long summit table with a row of small flags.
  s.box(x + 170, floorY - 8, w - 190, 8, [88, 70, 52]);
  const flagCols: Tint[] = [RED, WHITE, LEAF, EMBER, SEA, RED, WHITE, LEAF, EMBER, SEA, RED, WHITE];
  flagCols.forEach((fc, i) => {
    const fx = x + 182 + i * 30;
    s.vRule(fx, floorY - 26, 18, [200, 198, 188], 1);
    s.box(fx + 1, floorY - 26, 12, 8, fc);
  });
  // A toppled chair at the near end of the table.
  s.stroke(x + w - 34, floorY - 2, x + w - 18, floorY - 16, [150, 146, 134], 3);
  s.stroke(x + w - 30, floorY - 2, x + w - 22, floorY - 16, [150, 146, 134], 3);
  s.box(x + w - 36, floorY - 4, 22, 3, [150, 146, 134]);
  // Caption strip.
  s.box(x, floorY, w, 18, NAVY);
  ink(s, x + 10, floorY + 13, "ANTALYA: THE LONGEST SUMMIT IN HISTORY ENDS WITH NOTHING", "bold-13", PAPER);
}

// The Strait of Hormuz at night: a tanker, missile arcs and fire.
// The scene is short (about 78 px), so every element is packed tight:
// sky with arcs, tanker on the water band, waves, then the caption.
function straitScene(s: Sheet, x: number, y: number, w: number, h: number) {
  const captionH = 16;
  const seaY = y + h - captionH - 16;
  s.box(x, y, w, seaY - y, DARK);
  // Stars and a thin moon.
  for (const [sx, sy] of [[12, 6], [52, 10], [96, 5], [150, 9], [210, 6], [260, 10]] as Array<[number, number]>) {
    s.disc(x + sx, y + sy, 1, [215, 215, 195]);
  }
  s.disc(x + w - 30, y + 11, 7, CREAM);
  s.disc(x + w - 33, y + 9, 6, DARK);
  // Two missile arcs with smoke trails, ending above the tanker.
  s.stroke(x + 20, y + 5, x + 110, y + 22, [220, 220, 205], 2);
  s.stroke(x + 110, y + 22, x + 148, seaY - 24, [220, 220, 205], 2);
  s.stroke(x + w - 20, y + 4, x + w - 90, y + 20, [220, 220, 205], 2);
  s.stroke(x + w - 90, y + 20, x + w - 118, seaY - 24, [220, 220, 205], 2);
  // The tanker, mid-water.
  const tx = x + 96;
  s.fillPoly([[tx, seaY - 10], [tx + 130, seaY - 10], [tx + 122, seaY], [tx + 8, seaY]], [52, 58, 66]);
  s.box(tx + 30, seaY - 20, 26, 10, [52, 58, 66]);
  s.box(tx + 62, seaY - 17, 18, 7, [52, 58, 66]);
  s.box(tx + 8, seaY - 14, 4, 4, EMBER);
  s.box(tx + 40, seaY - 14, 4, 4, EMBER);
  // Fire and smoke over the tanker, kept inside the scene.
  s.burst(tx + 66, seaY - 24, 9, FLAME);
  s.burst(tx + 66, seaY - 24, 5, EMBER);
  s.disc(tx + 52, seaY - 32, 5, SMOKE);
  s.disc(tx + 66, seaY - 37, 6, SMOKE);
  s.disc(tx + 82, seaY - 33, 4, SMOKE);
  // Waves in the band above the caption strip.
  s.box(x, seaY, w, 16, DEEP);
  for (let i = 0; i < 6; i++) {
    s.stroke(x + 12 + i * 48, seaY + 6, x + 34 + i * 48, seaY + 6, [140, 180, 210], 2);
    s.stroke(x + 24 + i * 48, seaY + 12, x + 44 + i * 48, seaY + 12, [120, 160, 195], 2);
  }
  // Caption strip.
  s.box(x, y + h - captionH, w, captionH, NAVY);
  ink(s, x + 10, y + h - 4, "STRAIT OF HORMUZ: TWO TANKERS HIT", "bold-13", PAPER);
}

// A warship capsized in the harbour: only the bow stays above the water.
function capsizedShip(s: Sheet, cx: number, cy: number) {
  const waterY = cy + 16;
  // Smoke drifting up.
  s.disc(cx - 16, cy - 22, 6, SMOKE);
  s.disc(cx - 6, cy - 26, 7, SMOKE);
  s.disc(cx + 4, cy - 24, 5, SMOKE);
  // The hull, tilted, bow up on the right.
  s.fillPoly(
    [[cx - 34, waterY - 4], [cx + 30, waterY - 22], [cx + 38, waterY - 12], [cx + 6, waterY + 2]],
    [58, 66, 74],
  );
  s.fillPoly([[cx + 30, waterY - 22], [cx + 38, waterY - 12], [cx + 34, waterY - 8], [cx + 26, waterY - 16]], RED);
  // Mast and radar, half under.
  s.stroke(cx - 8, waterY - 12, cx - 2, waterY - 26, STEEL, 3);
  s.disc(cx - 2, waterY - 28, 3, STEEL);
  // Fire at the waterline.
  s.burst(cx - 20, waterY - 6, 8, FLAME);
  s.burst(cx - 20, waterY - 6, 4, EMBER);
  // Water.
  s.box(cx - 40, waterY, 80, 6, SEA);
  s.stroke(cx - 36, waterY + 3, cx - 18, waterY + 3, [150, 190, 215], 2);
  s.stroke(cx + 8, waterY + 3, cx + 30, waterY + 3, [150, 190, 215], 2);
}

// A factory with flames and a column of smoke.
function factoryFire(s: Sheet, cx: number, cy: number) {
  // Smoke column.
  s.disc(cx - 6, cy - 28, 7, SMOKE);
  s.disc(cx + 4, cy - 32, 8, SMOKE);
  s.disc(cx + 12, cy - 36, 6, SMOKE);
  // The factory block and chimney.
  s.box(cx - 30, cy - 12, 60, 26, [120, 112, 98]);
  s.box(cx - 30, cy - 12, 60, 4, [96, 88, 76]);
  s.box(cx + 18, cy - 34, 8, 22, [96, 88, 76]);
  // Windows, some lit by the fire.
  s.box(cx - 24, cy - 4, 8, 8, EMBER);
  s.box(cx - 10, cy - 4, 8, 8, [60, 54, 44]);
  s.box(cx + 4, cy - 4, 8, 8, EMBER);
  // Flames on the roof.
  s.fillPoly([[cx - 22, cy - 12], [cx - 16, cy - 28], [cx - 10, cy - 12]], FLAME);
  s.fillPoly([[cx - 2, cy - 12], [cx + 4, cy - 30], [cx + 10, cy - 12]], FLAME);
  s.fillPoly([[cx + 10, cy - 12], [cx + 15, cy - 24], [cx + 20, cy - 12]], EMBER);
}

// A laptop with a padlock on its screen: the NCIC database.
function lockedScreen(s: Sheet, cx: number, cy: number) {
  // Screen.
  s.box(cx - 26, cy - 26, 52, 34, DARK);
  s.box(cx - 24, cy - 24, 48, 30, [30, 46, 78]);
  ink(s, cx - 18, cy - 12, "NCIC", "bold-13", PAPER);
  // Padlock.
  s.ring(cx, cy + 2, 6, EMBER, 3);
  s.stroke(cx - 4, cy - 2, cx - 4, cy - 8, EMBER, 2);
  s.stroke(cx + 4, cy - 2, cx + 4, cy - 8, EMBER, 2);
  s.box(cx - 5, cy - 1, 10, 8, EMBER);
  s.box(cx - 1, cy + 1, 2, 3, DARK);
  // Base.
  s.fillPoly([[cx - 32, cy + 8], [cx + 32, cy + 8], [cx + 36, cy + 14], [cx - 36, cy + 14]], STEEL);
  // Warning triangle, top right.
  s.fillPoly([[cx + 26, cy - 34], [cx + 38, cy - 14], [cx + 14, cy - 14]], EMBER);
  ink(s, cx + 25, cy - 17, "!", "bold-13", DARK);
}

// A trophy cup with a tennis ball beside it.
function trophyCup(s: Sheet, cx: number, cy: number) {
  // Cup.
  s.fillPoly([[cx - 14, cy - 26], [cx + 14, cy - 26], [cx + 10, cy + 2], [cx - 10, cy + 2]], EMBER);
  s.box(cx - 14, cy - 26, 28, 5, [232, 190, 70]);
  // Handles.
  s.ring(cx - 16, cy - 16, 7, EMBER, 3);
  s.ring(cx + 16, cy - 16, 7, EMBER, 3);
  // Stem and base.
  s.box(cx - 2, cy + 2, 4, 10, EMBER);
  s.box(cx - 12, cy + 12, 24, 5, [176, 134, 30]);
  s.box(cx - 16, cy + 17, 32, 4, [140, 106, 24]);
  // Tennis ball, lower right, with its curve.
  s.disc(cx + 28, cy + 8, 9, [190, 210, 70]);
  s.ring(cx + 28, cy + 8, 9, [150, 170, 50], 1);
  s.stroke(cx + 22, cy + 2, cx + 24, cy + 14, WHITE, 2);
  s.stroke(cx + 34, cy + 2, cx + 32, cy + 14, WHITE, 2);
  // Sparkles.
  s.burst(cx - 24, cy - 30, 5, EMBER);
  s.burst(cx + 24, cy - 32, 4, EMBER);
}

// -------------------------------------------------------------------- page
function alsoItem(s: Sheet, x: number, top: number, label: string, text: string, maxW: number): number {
  const head = label + " — ";
  const headW = measure(head, "bold-13");
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const trial = cur ? cur + " " + word : word;
    const room = lines.length === 0 ? maxW - headW : maxW;
    if (measure(trial, "regular-13") <= room || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  let base = top + 13;
  lines.forEach((line, i) => {
    if (i === 0) {
      ink(s, x, base, head, "bold-13", RED);
      ink(s, x + headW, base, line, "regular-13", INK);
    } else {
      ink(s, x, base, line, "regular-13", INK);
    }
    base += 13;
  });
  return base + 1;
}

function buildPage(): Sheet {
  const s = new Sheet();

  // Double frame.
  s.box(8, 8, PAGE - 16, PAGE - 16, INK);
  s.box(11, 11, PAGE - 22, PAGE - 22, PAPER);
  s.box(14, 14, PAGE - 28, PAGE - 28, INK);
  s.box(16, 16, PAGE - 32, PAGE - 32, PAPER);

  // Masthead.
  inkCentred(s, PAGE / 2, 78, "THE WORLD IN ONE DAY", "bold-48", NAVY);
  s.hRule(28, 92, PAGE - 56, RED, 4);
  ink(s, 28, 118, "No. 327", "bold-14", GREY);
  inkCentred(s, PAGE / 2, 118, "SUNDAY  •  22 NOVEMBER 2026", "bold-22", RED);
  ink(s, PAGE - 28 - measure("PRICE: ONE DAY", "bold-14"), 118, "PRICE: ONE DAY", "bold-14", GREY);
  s.hRule(28, 130, PAGE - 56, INK, 3);

  // ---------------- top row: lead story (left) and the Gulf (right)
  const leadX = 28;
  const leadW = 606;
  const gulfX = 658;
  const gulfW = 338;
  ink(s, leadX, 160, "ANTALYA  —  LEAD STORY", "bold-14", RED);
  ink(s, leadX, 198, "COP31 COLLAPSES", "bold-34", INK);
  ink(s, leadX, 234, "WITH NO DEAL AT ALL", "bold-34", INK);
  const bodyEnd = block(
    s, leadX, 264,
    "UN climate talks in Antalya ended on Sunday with no agreement of any kind after two days of overtime — the longest summit in history and the first total failure since Copenhagen in 2009. The EU, Britain, Panama, the Marshall Islands, Norway and others rejected the draft “Antalya Pact” because it said nothing about fossil fuels, while Saudi Arabia and Russia blocked any fossil-fuel language. Ireland’s Darragh O’Brien, for the EU, called it “unconscionable”. COP31 president Murat Kurum announced there was no deal; the US sent no delegation at all.",
    "regular-16", leadW, 19, INK,
  );
  summitScene(s, leadX, bodyEnd + 16, leadW, 482 - (bodyEnd + 16));

  // The Gulf, right column.
  s.box(gulfX, 142, gulfW, 26, NAVY);
  ink(s, gulfX + 12, 161, "THE GULF", "bold-17", PAPER);
  ink(s, gulfX + gulfW - 12 - measure("DAY 130", "bold-14"), 160, "DAY 130", "bold-14", [200, 205, 220]);
  ink(s, gulfX, 196, "IRAN HITS US BASES", "bold-22", INK);
  ink(s, gulfX, 222, "IN BAHRAIN", "bold-22", INK);
  const gulfEnd = block(
    s, gulfX, 248,
    "Iran’s Revolutionary Guard fired missiles and drones at US positions in Bahrain on Saturday night, hitting the Al-Riffa and Awali bases and claiming to have struck two American Patriot radars. Bahrain said a civilian site on Sitra island was hit and caught fire; two people were hurt, one critically. Two tankers were also hit in the Strait of Hormuz; on Sunday Iran said two tankers were ablaze after striking mines. Mr Trump warned Iranian ships defying the blockade would end up “on the seabed”.",
    "regular-13", gulfW, 16, INK,
  );
  straitScene(s, gulfX, gulfEnd + 12, gulfW, 482 - (gulfEnd + 12));

  // ---------------- middle row: four stories
  s.hRule(28, 494, PAGE - 56, INK, 3);
  const colW = 232;
  const colGap = 13;
  const stories = [
    {
      kick: "BENGHAZI",
      head: "RUSSIAN CORVETTE SUNK",
      body: "A suspected Ukrainian sea drone hit the Russian corvette Merkury off Benghazi before dawn on Sunday. The ship capsized and mostly sank, only the bow above water; ten people were hurt.",
      art: "ship",
    },
    {
      kick: "CIKANDE",
      head: "FACTORY FIRE KILLS 3",
      body: "A fire at a candy factory in Cikande, Banten, left three dead and 36 to 50 workers missing; 24 body bags were recovered. The search was halted on Sunday night as the building was unsafe.",
      art: "factory",
    },
    {
      kick: "WASHINGTON",
      head: "FBI PROBES NCIC HACK",
      body: "The FBI is investigating a suspected hack of NCIC, America’s national crime database, confirmed over the weekend. It is not yet known whether data was read, stolen or changed, or who was behind it.",
      art: "lock",
    },
    {
      kick: "SPORT",
      head: "ALCARAZ TAKES TURIN",
      body: "Carlos Alcaraz won his first ATP Finals title in Turin, beating world No. 1 Alexander Zverev 6–2, 7–6(9–7) — a 14th straight win, worth $5.17m. Jeeno Thitikul won a third straight LPGA title, and Liverpool beat ten-man Manchester United.",
      art: "trophy",
    },
  ];
  let midBottom = 0;
  stories.forEach((story, i) => {
    const x0 = 28 + i * (colW + colGap);
    const iconY = 500;
    if (story.art === "ship") capsizedShip(s, x0 + 30, iconY + 22);
    if (story.art === "factory") factoryFire(s, x0 + 30, iconY + 24);
    if (story.art === "lock") lockedScreen(s, x0 + 30, iconY + 24);
    if (story.art === "trophy") trophyCup(s, x0 + 30, iconY + 24);
    s.vRule(x0 + 62, iconY + 4, 40, RULE, 1);
    ink(s, x0 + 72, iconY + 16, story.kick, "bold-13", RED);
    ink(s, x0 + 72, iconY + 34, "SUNDAY", "bold-13", GREY);
    let base = iconY + 60;
    for (const line of flow(story.head, "bold-19", colW)) {
      ink(s, x0, base, line, "bold-19", INK);
      base += 22;
    }
    const end = block(s, x0, base + 6, story.body, "regular-13", colW, 14, INK);
    midBottom = Math.max(midBottom, end);
    if (i < 3) s.vRule(x0 + colW + 6, 506, 160, RULE, 1);
  });

  // ---------------- also today
  const alsoY = Math.max(midBottom + 10, 688);
  s.hRule(28, alsoY, PAGE - 56, INK, 3);
  ink(s, 28, alsoY + 24, "ALSO TODAY", "bold-20", NAVY);
  ink(s, PAGE - 28 - measure("SUNDAY 22 NOVEMBER 2026", "bold-13"), alsoY + 22, "SUNDAY 22 NOVEMBER 2026", "bold-13", GREY);
  const items: Array<[string, string]> = [
    ["MEXICO", "Mexico confirmed 4 soldiers and 7 gunmen were killed in the arrest of “El Chapo Isidro” — 11 dead in all."],
    ["WASHINGTON", "Mr Trump said he would work with Democrats on a 10% credit-card cap, and reshared a “TrumpCare” health plan."],
    ["KYIV", "Residents searched for the missing after a Russian strike brought down a residential building in the Kyiv region."],
    ["BRUSSELS", "The EU and Indonesia signed a trade deal after almost 10 years of talks; tariffs go on up to 98.5% of lines."],
    ["GAZA", "Children in Gaza face a critical insulin shortage and soaring prices."],
    ["JERUSALEM", "The Board of Peace criticised Mr Netanyahu for delaying the plan to disarm Hamas."],
    ["ASIA", "ASEAN and China remain deadlocked over a code of conduct for the South China Sea."],
    ["SPAIN", "Political uncertainty hangs over Spain ahead of the election on 29 November."],
    ["CHINA–JAPAN", "Ties worsen over Taiwan and critical minerals."],
    ["WASHINGTON", "The US Agriculture Department shut several applications after a security incident, unrelated to the NCIC hack."],
    ["LONDON", "FIFA is set to confirm England as host of the 2035 Women’s World Cup."],
    ["ANTALYA", "Greta Thunberg joined a protest at COP31."],
  ];
  const colW2 = 470;
  let leftY = alsoY + 38;
  let rightY = alsoY + 38;
  items.forEach(([label, text], i) => {
    const x = i % 2 === 0 ? 28 : 526;
    if (i % 2 === 0) leftY = alsoItem(s, x, leftY, label, text, colW2);
    else rightY = alsoItem(s, x, rightY, label, text, colW2);
  });

  // Footer.
  const footY = 968;
  s.hRule(28, footY, PAGE - 56, INK, 2);
  inkCentred(s, PAGE / 2, footY + 20, "THE WORLD IN ONE DAY  •  SUNDAY 22 NOVEMBER 2026  •  ONE DAY, ONE PAGE, THE WORLD", "regular-13", GREY);
  return s;
}

function main() {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  const png = encodePng(buildPage());
  writeFileSync(join(outDir, "entry.png"), png);
}

main();
