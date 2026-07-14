// Renders apple-touch-icon.png for bd-ft-calc: three stacked lumber planks in
// warm wood tones on a dark background. Self-contained — 4x supersampled
// rounded-rect fill + hand-rolled PNG encoder, no native deps.
// Run: bun tools/gen-icon.ts  (output -> public/apple-touch-icon.png)

import { deflateSync } from "node:zlib"; // zlib-wrapped stream (PNG IDAT requires it; Bun.deflateSync is raw)

const SIZE = 180;
const SS = 4; // supersampling factor
const OUT = new URL("../public/apple-touch-icon.png", import.meta.url);

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

type RGB = [number, number, number];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

// Palette
const BG_TL = hex("#4a2f18"); // background gradient start (warm brown)
const BG_BR = hex("#211105"); // background gradient end (deep brown)
const GLOW = hex("#e0a86a"); // warm sand glow
const PLANK_TOP = hex("#e6ac68"); // plank sheen top
const PLANK_BOT = hex("#a5661f"); // plank shadow bottom

// Three horizontal planks, evenly stacked and centered.
const PLANK_X0 = SIZE * 0.15;
const PLANK_X1 = SIZE * 0.85;
const PLANK_H = SIZE * 0.16;
const GAP = SIZE * 0.055;
const STACK_H = 3 * PLANK_H + 2 * GAP;
const STACK_Y0 = (SIZE - STACK_H) / 2;
const RADIUS = PLANK_H * 0.32;

// Per-plank tone factor so the boards read as separate pieces of lumber.
const TONE = [1.06, 0.98, 0.88];

type Plank = {
  y0: number;
  y1: number;
  tone: number;
};

const PLANKS: Plank[] = [0, 1, 2].map((i) => {
  const y0 = STACK_Y0 + i * (PLANK_H + GAP);
  return {
    y0: y0,
    y1: y0 + PLANK_H,
    tone: TONE[i],
  };
});

// Signed-distance test for a rounded rectangle; true when the point is inside.
function inRoundRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number): boolean {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2;
  const hy = (y1 - y0) / 2;
  const dx = Math.abs(x - cx) - hx + r;
  const dy = Math.abs(y - cy) - hy + r;
  const inner = Math.min(Math.max(dx, dy), 0);
  const outer = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return inner + outer - r <= 0;
}

const CX = SIZE / 2;
const CY = SIZE / 2;

// Opaque color at a sub-pixel sample.
function shade(x: number, y: number): RGB {
  const t = clamp((x + y) / (2 * SIZE), 0, 1);
  const col: RGB = [
    mix(BG_TL[0], BG_BR[0], t),
    mix(BG_TL[1], BG_BR[1], t),
    mix(BG_TL[2], BG_BR[2], t),
  ];

  const gd = Math.hypot(x - CX, y - CY) / (SIZE * 0.55);
  const glow = clamp(1 - gd, 0, 1) * 0.16;
  for (let i = 0; i < 3; i++) {
    col[i] = mix(col[i], GLOW[i], glow);
  }

  for (const p of PLANKS) {
    if (inRoundRect(x, y, PLANK_X0, p.y0, PLANK_X1, p.y1, RADIUS)) {
      const tc = clamp((y - p.y0) / PLANK_H, 0, 1);
      col[0] = clamp(mix(PLANK_TOP[0], PLANK_BOT[0], tc) * p.tone, 0, 255);
      col[1] = clamp(mix(PLANK_TOP[1], PLANK_BOT[1], tc) * p.tone, 0, 255);
      col[2] = clamp(mix(PLANK_TOP[2], PLANK_BOT[2], tc) * p.tone, 0, 255);
      break;
    }
  }
  return col;
}

const buf = Buffer.alloc(SIZE * SIZE * 4);
for (let oy = 0; oy < SIZE; oy++) {
  for (let ox = 0; ox < SIZE; ox++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const c = shade(ox + (sx + 0.5) / SS, oy + (sy + 0.5) / SS);
        r += c[0];
        g += c[1];
        b += c[2];
      }
    }
    const n = SS * SS;
    const o = (oy * SIZE + ox) * 4;
    buf[o] = Math.round(r / n);
    buf[o + 1] = Math.round(g / n);
    buf[o + 2] = Math.round(b / n);
    buf[o + 3] = 255;
  }
}

// ---- minimal PNG (truecolor + alpha) ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) {
    c = crcTable[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  buf.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const idat = deflateSync(raw); // zlib stream

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", idat),
  chunk("IEND", Buffer.alloc(0)),
]);

await Bun.write(OUT, png);
console.log(`wrote ${OUT.pathname} (${png.length} bytes, ${SIZE}x${SIZE})`);
