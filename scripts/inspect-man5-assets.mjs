import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

async function inspect() {
  const dir = 'assets/man5-2d';
  const files = fs.readdirSync(dir);
  console.log('=== INSPECT ASSETS ===');
  for (const f of files) {
    const p = path.join(dir, f);
    const img = sharp(p);
    const meta = await img.metadata();
    const hasAlpha = meta.hasAlpha;
    let trimInfo = 'N/A';
    try {
      const trimmed = await sharp(p).trim().toBuffer({ resolveWithObject: true });
      trimInfo = `content: ${trimmed.info.width}x${trimmed.info.height}, trim offsets: top=${trimmed.info.trimOffsetTop}, left=${trimmed.info.trimOffsetLeft}`;
    } catch (e) {
      trimInfo = 'No trim (fully opaque or error)';
    }

    const raw = await img.raw().toBuffer();
    const w = meta.width;
    const h = meta.height;
    const ch = meta.channels;
    const getPixel = (x, y) => {
      const idx = (y * w + x) * ch;
      return Array.from(raw.slice(idx, idx + ch));
    };
    const cTL = getPixel(0, 0);
    const cTR = getPixel(w - 1, 0);
    const cBL = getPixel(0, h - 1);
    const cBR = getPixel(w - 1, h - 1);

    console.log(`\nFile: ${f}`);
    console.log(`  Size: ${w}x${h}, Channels: ${ch}, hasAlpha: ${hasAlpha}`);
    console.log(`  Trim: ${trimInfo}`);
    console.log(`  Corners (RGBA): TL=${JSON.stringify(cTL)}, TR=${JSON.stringify(cTR)}, BL=${JSON.stringify(cBL)}, BR=${JSON.stringify(cBR)}`);
  }

  const refP = 'assets/references/man5-whack-reference.png';
  if (fs.existsSync(refP)) {
    const meta = await sharp(refP).metadata();
    console.log(`\nReference: ${refP} (${meta.width}x${meta.height})`);
  }
}

inspect().catch(console.error);
