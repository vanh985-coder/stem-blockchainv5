// Cắt chân dung (đầu và vai) từ ảnh nhân vật gốc. Chạy: pnpm crop-portraits
// Khung cắt nằm trong scripts/portrait-crops.json (chỉnh tay được).
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'assets/source/characters');
const OUT_DIR = path.join(ROOT, 'assets/ui/portraits');
const PREVIEW = path.join(ROOT, 'assets-build/_preview/portraits.webp');
const SIZE = 512;
const THUMB = 256;
const COLS = 5;

const { crops } = JSON.parse(await readFile(path.join(ROOT, 'scripts/portrait-crops.json'), 'utf8'));
await mkdir(OUT_DIR, { recursive: true });
await mkdir(path.dirname(PREVIEW), { recursive: true });

const thumbs = [];
for (const [name, c] of Object.entries(crops)) {
  const file = path.join(SRC_DIR, `${c.nguon}.jpg`);
  const { width, height } = await sharp(file).metadata();
  let side = Math.round(c.size * height);
  side = Math.min(side, width, height);
  const left = Math.min(Math.max(Math.round(c.cx * width - side / 2), 0), width - side);
  const top = Math.min(Math.max(Math.round(c.cy * height - side / 2), 0), height - side);
  const png = await sharp(file)
    .extract({ left, top, width: side, height: side })
    .resize(SIZE, SIZE, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await sharp(png).toFile(path.join(OUT_DIR, `${name}.png`));
  thumbs.push({ name, input: await sharp(png).resize(THUMB, THUMB).toBuffer() });
  console.log(`${name.padEnd(13)} <- ${c.nguon}.jpg  khung ${side}px tại (${left}, ${top})${side < SIZE ? '  (phóng to nhẹ)' : ''}`);
}

const rows = Math.ceil(thumbs.length / COLS);
await sharp({
  create: { width: COLS * THUMB, height: rows * THUMB, channels: 3, background: '#ffffff' },
})
  .composite(thumbs.map((t, i) => ({ input: t.input, left: (i % COLS) * THUMB, top: Math.floor(i / COLS) * THUMB })))
  .webp({ quality: 85 })
  .toFile(PREVIEW);
console.log(`\nẢnh ghép ${thumbs.length} chân dung: ${path.relative(ROOT, PREVIEW)}`);
