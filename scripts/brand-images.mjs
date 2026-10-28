// Dựng ảnh nhận diện của web chính từ đồ họa trong assets-build: favicon và biểu tượng Apple là Bi, ảnh chia sẻ dựng từ logo-art.
// Chạy: pnpm brand:build (cần pnpm assets:build trước). Kết quả nằm ở apps/hub/public và được commit.
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'apps/hub/public');
const manifest = JSON.parse(await readFile(path.join(ROOT, 'assets-build/manifest.json'), 'utf8'));
const files = manifest.files ?? manifest;

function fileOf(key) {
  const entry = files[key];
  const rel = typeof entry === 'string' ? entry : entry?.path ?? entry?.file ?? entry?.url;
  if (!rel) throw new Error(`Không có "${key}" trong manifest.json`);
  return path.join(ROOT, 'assets-build', rel);
}

await mkdir(OUT, { recursive: true });

// Bi: cắt sát phần có hình (bỏ nền trong suốt thừa), đặt vào khung vuông.
const bi = await sharp(fileOf('ui/portraits/bi')).trim().toBuffer();
const biSquare = async (size, background, pad) => {
  const inner = Math.round(size * (1 - pad * 2));
  const img = await sharp(bi).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: img, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
};
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const paper = { r: 247, g: 239, b: 216, alpha: 1 };
await sharp(await biSquare(64, clear, 0.04)).toFile(path.join(OUT, 'favicon.png'));
await sharp(await biSquare(180, paper, 0.12)).toFile(path.join(OUT, 'apple-touch-icon.png'));

// Ảnh chia sẻ 1200x630: logo-art đủ khung ở giữa, hai bên là chính ảnh đó làm mờ.
const logo = fileOf('ui/logo-art');
const W = 1200;
const H = 630;
const backdrop = await sharp(logo).resize(W, H, { fit: 'cover' }).blur(24).modulate({ brightness: 0.8 }).toBuffer();
const front = await sharp(logo).resize({ height: H }).toBuffer();
await sharp(backdrop)
  .composite([{ input: front, gravity: 'center' }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(OUT, 'og-image.jpg'));

console.log('Đã dựng favicon.png, apple-touch-icon.png, og-image.jpg ở apps/hub/public');
