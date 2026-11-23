#!/usr/bin/env node
/**
 * Deterministic temporary PWA icons generated at build time.
 * This is an infrastructure placeholder, NOT the UI designer's final brand.
 * Uses only Node built-ins; no font or binary assets committed to Git.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/icons/', import.meta.url));
mkdirSync(root, { recursive: true });

const bitmap = [
  '0111110',
  '1100000',
  '1000000',
  '1000111',
  '1000001',
  '1100001',
  '0111110',
];

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let n = 0; n < 8; n++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}
function crc(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const code = Buffer.from(type, 'ascii');
  const size = Buffer.alloc(4);
  size.writeUInt32BE(body.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc(Buffer.concat([code, body])));
  return Buffer.concat([size, code, body, checksum]);
}
function rgba(size) {
  const row = size * 4;
  const pixels = Buffer.alloc((row + 1) * size);
  const unit = size * 0.12;
  const charWidth = unit;
  const charHeight = unit;
  const offsetX = (size - bitmap[0].length * charWidth) / 2;
  const offsetY = (size - bitmap.length * charHeight) / 2;
  for (let y = 0; y < size; y++) {
    const start = y * (row + 1);
    pixels[start] = 0;
    for (let x = 0; x < size; x++) {
      const cellX = Math.floor((x - offsetX) / charWidth);
      const cellY = Math.floor((y - offsetY) / charHeight);
      const inLetter = cellX >= 0 && cellY >= 0 &&
        cellY < bitmap.length && cellX < bitmap[0].length &&
        bitmap[cellY][cellX] === '1';
      const accent = x > size * 0.71 && x < size * 0.86 && y > size * 0.14 && y < size * 0.29;
      const color = inLetter ? [245, 247, 249] : accent ? [188, 229, 84] : [16, 40, 69];
      const at = start + 1 + x * 4;
      pixels[at] = color[0];
      pixels[at + 1] = color[1];
      pixels[at + 2] = color[2];
      pixels[at + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8-bit RGBA
  header[9] = 6;
  const payload = Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  writeFileSync(join(root, 'guidon-' + size + '.png'), payload);
}
rgba(192);
rgba(512);
console.log('PWA icons generated: 192x192, 512x512');
