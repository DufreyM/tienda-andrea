// Genera imágenes PNG de prueba sin dependencias (un color sólido con franjas).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function png(width: number, height: number, rgb: [number, number, number]) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      const stripe = Math.floor(x / 40) % 2 ? 0.85 : 1;
      raw[row + 1 + x * 3] = rgb[0] * stripe;
      raw[row + 2 + x * 3] = rgb[1] * stripe;
      raw[row + 3 + x * 3] = rgb[2] * stripe;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function writeFixtures(dir: string) {
  mkdirSync(dir, { recursive: true });
  const files = {
    good: join(dir, 'producto.png'),
    second: join(dir, 'producto-2.png'),
    small: join(dir, 'pequena.png'),
    text: join(dir, 'notas.txt'),
  };
  writeFileSync(files.good, png(800, 800, [214, 160, 150]));
  writeFileSync(files.second, png(700, 900, [170, 180, 140]));
  writeFileSync(files.small, png(120, 120, [200, 200, 200]));
  writeFileSync(files.text, 'esto no es una imagen');
  return files;
}
