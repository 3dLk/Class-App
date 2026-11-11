// Genere les icones PNG de l'app sans dependance (encodeur PNG minimal).
// Usage : npm run icons
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = new URL("../public/icons/", import.meta.url);
mkdirSync(OUT, { recursive: true });

const BG = [10, 10, 10];
const FG = [242, 242, 242];
const MID = [61, 61, 61];

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, px) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function canvas(w, h) {
  const px = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) px.set(BG, i * 3);
  const rect = (x, y, rw, rh, color) => {
    const x0 = Math.round(x), y0 = Math.round(y);
    const x1 = Math.round(x + rw), y1 = Math.round(y + rh);
    for (let j = Math.max(0, y0); j < Math.min(h, y1); j++)
      for (let i = Math.max(0, x0); i < Math.min(w, x1); i++) px.set(color, (j * w + i) * 3);
  };
  return { px, rect };
}

/** Pictogramme : calendrier carre (cadre, bandeau, grille 3x2 dont une case pleine) */
function drawMark(rect, cx, cy, size) {
  const s = size;
  const x = cx - s / 2, y = cy - s / 2;
  const t = s * 0.075; // epaisseur du trait
  rect(x, y, s, t, FG);
  rect(x, y + s - t, s, t, FG);
  rect(x, y, t, s, FG);
  rect(x + s - t, y, t, s, FG);
  rect(x, y, s, s * 0.24, FG); // bandeau
  const gx = x + t * 2, gy = y + s * 0.24 + t * 1.2;
  const gw = s - t * 4, gh = s - s * 0.24 - t * 3.2;
  const gap = t * 0.8;
  const cw = (gw - gap * 2) / 3, ch = (gh - gap) / 2;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++)
      rect(gx + c * (cw + gap), gy + r * (ch + gap), cw, ch, r === 0 && c === 1 ? FG : MID);
}

function icon(name, size, markRatio) {
  const { px, rect } = canvas(size, size);
  drawMark(rect, size / 2, size / 2, size * markRatio);
  writeFileSync(new URL(name, OUT), png(size, size, px));
  console.log("ok", name);
}

icon("icon-192.png", 192, 0.6);
icon("icon-512.png", 512, 0.6);
icon("icon-maskable-512.png", 512, 0.46); // zone sure Android : cercle central de 80 %
icon("apple-touch-icon.png", 180, 0.6);

// Ecran de demarrage iPhone 13 (1170 x 2532)
{
  const w = 1170, h = 2532;
  const { px, rect } = canvas(w, h);
  drawMark(rect, w / 2, h / 2, 260);
  writeFileSync(new URL("splash-1170x2532.png", OUT), png(w, h, px));
  console.log("ok splash-1170x2532.png");
}
