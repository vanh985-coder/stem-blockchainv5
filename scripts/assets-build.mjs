// Nén đồ họa: đọc assets/, ghi assets-build/ + manifest.json. Chạy: pnpm assets:build
// Ảnh (mốc 1) và model .glb (mốc 2). Hai ảnh man-06 lúc này chuyển như ảnh nền thường.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { autoCutout, assessCutout } from './lib/cutout.mjs';
import { cleanSparkle, forceCleanSparkle, sparkleGeometry } from './lib/watermark.mjs';

/** Ảnh mà dấu ngôi sao quá mờ để nhận dạng chắc chắn: luôn tô lại vùng ngôi sao ở ô góc từ điểm ảnh xung quanh (khóa manifest, không đuôi). */
const FORCE_SPARKLE = new Set(['story/06-lang-giay', 'ui/portraits/lan', 'ui/textures/san-gach']);
import { checkCharacter, largestTexture, REQUIRED_CLIPS, textureBytes } from './lib/glb.mjs';
import { buildModelSet, classifyModel, LOD_SUFFIX, LOD_TEXTURE, LOD_TRIS, MID_MAX_TRIS, MID_MIN_MAIN_TRIS, MID_SUFFIX, MID_TRIS } from './lib/model-build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets');
const OUT = path.join(ROOT, 'assets-build');
const CACHE_FILE = path.join(SRC, '.build-cache.json'); // nằm cạnh ảnh gốc, không commit, không deploy
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SKIP_DIRS = new Set(['concept', 'source', 'models']);
const WARN_BYTES = 400 * 1024;
const CONCURRENCY = 4;

// Sửa chính file script này thì mọi ảnh được nén lại (mã băm của script nằm trong chữ ký cache).
const SCRIPT_HASH = createHash('sha256')
  .update(await readFile(fileURLToPath(import.meta.url)))
  .update(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib', 'cutout.mjs')))
  .update(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib', 'watermark.mjs')))
  .digest('hex')
  .slice(0, 12);

/** Quy tắc nén theo đường dẫn không đuôi (dấu /). Trả null nếu chưa có quy tắc. */
function classify(key) {
  if (/^(scenes|story)\//.test(key) || key === 'ui/ban-do' || key === 'ui/man-hinh-tai') {
    return { kind: 'nen', maxWidth: 1920, quality: 82, warnBig: true };
  }
  // Hình rời (sprites): ảnh do AI tạo hay in sẵn nền ô vuông hoặc nền một màu vào ảnh; tự tách nền (scripts/lib/cutout.mjs), ảnh đã trong suốt thật thì để nguyên.
  if (key.startsWith('sprites/')) return { kind: 'hinh-roi', box: 1024, quality: 85, autoCutout: true };
  if (
    /^ui\/(cards|tiles|textures)\//.test(key) ||
    key === 'ui/logo-art' ||
    key === 'ui/bang-khen-khung'
  ) {
    return { kind: 'hinh-roi', box: 1024, quality: 85 };
  }
  if (key.startsWith('ui/icons/')) return { kind: 'icon', box: 256, quality: 85, cutout: true };
  if (key.startsWith('ui/portraits/')) return { kind: 'chan-dung', exact: 512, quality: 85 };
  return null;
}

async function walk(dir, rel = '', skip = SKIP_DIRS) {
  const out = [];
  for (const e of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!rel && skip.has(e.name)) continue;
      out.push(...(await walk(dir, r, skip)));
    } else if (e.isFile()) out.push(r);
  }
  return out;
}

const sha = (buf, n = 16) => createHash('sha256').update(buf).digest('hex').slice(0, n);


// ---------------------------------------------------------------------------
// Icon: tách nền liền khối (loang màu từ 4 góc), cắt sát hình, đệm thành hình vuông trong suốt.
const FLOOD_TOLERANCE = 28; // sai số tối đa của từng kênh màu so với màu nền ở góc
const ICON_MARGIN = 4;

/** Đánh dấu nền: loang từ 4 góc qua các điểm ảnh có màu gần màu của một trong 4 góc. Trả về mask (1 = nền). */
function floodBackground(data, w, h) {
  const seeds = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => {
    const o = (y * w + x) * 4;
    return [data[o], data[o + 1], data[o + 2]];
  });
  const near = (o) => {
    for (const [r, g, b] of seeds) {
      if (Math.abs(data[o] - r) <= FLOOD_TOLERANCE && Math.abs(data[o + 1] - g) <= FLOOD_TOLERANCE && Math.abs(data[o + 2] - b) <= FLOOD_TOLERANCE) return true;
    }
    return false;
  };
  const mask = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const i = y * w + x;
    if (!mask[i] && near(i * 4)) {
      mask[i] = 1;
      stack[sp++] = i;
    }
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    const y = (i - x) / w;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for (const j of nb) {
      if (j >= 0 && !mask[j] && near(j * 4)) {
        mask[j] = 1;
        stack[sp++] = j;
      }
    }
  }
  return mask;
}

/** Thu hẹp phần đặc 1px (bỏ viền sáng còn sót của nền) rồi làm mềm viền alpha 1px. */
async function softenAlpha(rgba, w, h) {
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = rgba[i * 4 + 3];
  const eroded = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let m = a[i];
      if (x > 0) m = Math.min(m, a[i - 1]);
      if (x < w - 1) m = Math.min(m, a[i + 1]);
      if (y > 0) m = Math.min(m, a[i - w]);
      if (y < h - 1) m = Math.min(m, a[i + w]);
      eroded[i] = m;
    }
  }
  const blurred = await sharp(eroded, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  for (let i = 0; i < w * h; i++) rgba[i * 4 + 3] = blurred[i];
}

async function encodeIcon(file, rule) {
  const { data, info } = await sharp(file).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
  const alreadyCut = corners.every(([x, y]) => data[(y * w + x) * 4 + 3] < 16);
  if (!alreadyCut) {
    const mask = floodBackground(data, w, h);
    for (let i = 0; i < w * h; i++) if (mask[i]) data[i * 4 + 3] = 0;
  }
  // Cắt sát hình
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] >= 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error(`Icon ${file}: không còn hình sau khi tách nền`);
  const fit = rule.box - 2 * ICON_MARGIN;
  const { data: small, info: si } = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .resize({ width: fit, height: fit, fit: 'inside', withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (!alreadyCut) await softenAlpha(small, si.width, si.height);
  // Đệm thành hình vuông trong suốt
  const side = Math.max(si.width, si.height) + 2 * ICON_MARGIN;
  const left = Math.floor((side - si.width) / 2);
  const top = Math.floor((side - si.height) / 2);
  return sharp(small, { raw: { width: si.width, height: si.height, channels: 4 } })
    .extend({ top, bottom: side - si.height - top, left, right: side - si.width - left, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: rule.quality, alphaQuality: 100, effort: 5 })
    .toBuffer({ resolveWithObject: true });
}

/** Ảnh xem trước các icon trên nền caro, để soi bằng mắt. */
async function writeIconPreview(manifest) {
  const keys = Object.keys(manifest).filter((k) => k.startsWith('ui/icons/')).sort();
  if (!keys.length) return;
  const cell = 256;
  const cols = 4;
  const rows = Math.ceil(keys.length / cols);
  const check = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell}" height="${rows * cell}">` +
      `<defs><pattern id="c" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="#e6e6e6"/>` +
      `<rect width="16" height="16" fill="#bdbdbd"/><rect x="16" y="16" width="16" height="16" fill="#bdbdbd"/></pattern></defs>` +
      `<rect width="100%" height="100%" fill="url(#c)"/></svg>`,
  );
  const layers = [];
  for (const [i, k] of keys.entries()) {
    layers.push({ input: path.join(OUT, manifest[k].file), left: (i % cols) * cell + Math.floor((cell - manifest[k].width) / 2), top: Math.floor(i / cols) * cell + Math.floor((cell - manifest[k].height) / 2) });
  }
  await mkdir(path.join(OUT, '_preview'), { recursive: true });
  await sharp(check).composite(layers).webp({ quality: 90 }).toFile(path.join(OUT, '_preview', 'icons.webp'));
}

/** Đường dẫn ảnh xem trước tách nền của một sprite (key bắt đầu bằng "sprites/"): _preview/sprites/<thư mục>-<tên>.png */
const spritePreview = (key) => path.join(OUT, '_preview', 'sprites', key.slice('sprites/'.length).split('/').join('-') + '.png');

/** Ảnh trước | sau (nền tối) | sau (nền sáng) để soi mép tách nền. Mỗi ô cao `PREVIEW_H` điểm ảnh. */
const PREVIEW_H = 384;
async function cutoutPreview(beforeFile, afterRgba, w, h) {
  const scale = PREVIEW_H / h;
  const pw = Math.max(1, Math.round(w * scale));
  const before = await sharp(beforeFile).rotate().flatten({ background: '#2b2b36' }).resize(pw, PREVIEW_H).png().toBuffer();
  const afterPng = await sharp(afterRgba, { raw: { width: w, height: h, channels: 4 } }).resize(pw, PREVIEW_H).png().toBuffer();
  const panel = (bg) => sharp({ create: { width: pw, height: PREVIEW_H, channels: 3, background: bg } }).composite([{ input: afterPng }]).png().toBuffer();
  const dark = await panel('#2b2b36');
  const light = await panel('#f1e6c8');
  return sharp({ create: { width: pw * 3 + 8, height: PREVIEW_H, channels: 3, background: '#888' } })
    .composite([{ input: before, left: 0, top: 0 }, { input: dark, left: pw + 4, top: 0 }, { input: light, left: pw * 2 + 8, top: 0 }])
    .png()
    .toBuffer();
}

/** Đường dẫn ảnh xem trước xóa dấu ngôi sao: _preview/watermark/<khóa, dấu / đổi thành ->.png */
const watermarkPreview = (key) => path.join(OUT, '_preview', 'watermark', key.split('/').join('-') + '.png');

/** Ảnh xem trước xóa dấu: vùng góc quanh dấu (cạnh 4,4 nửa cạnh dấu) trước | sau, phóng 3 lần. */
async function sparklePreview(before, after, w, h) {
  const g = sparkleGeometry(w, h);
  const half = Math.round(g.R * 2.2);
  const crop = (buf) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).extract({ left: g.cx - half, top: g.cy - half, width: 2 * half, height: 2 * half }).resize(2 * half * 3, 2 * half * 3, { kernel: 'nearest' }).png().toBuffer();
  const [a, b] = await Promise.all([crop(before), crop(after)]);
  const side = 2 * half * 3;
  return sharp({ create: { width: side * 2 + 8, height: side, channels: 3, background: '#888' } })
    .composite([{ input: a, left: 0, top: 0 }, { input: b, left: side + 8, top: 0 }])
    .png()
    .toBuffer();
}

async function encode(file, rule) {
  if (rule.cutout) return encodeIcon(file, rule);
  let img = sharp(file).rotate();
  let cut = null;
  let wm = null;
  if (!rule.autoCutout) {
    // Dấu ngôi sao của công cụ vẽ ảnh ở góc dưới phải: tìm trong ô góc cố định rồi xóa (scripts/lib/watermark.mjs). Không thấy dấu thì giữ nguyên ảnh.
    const meta = await sharp(file).metadata();
    const { data, info: raw } = await sharp(file).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = { data: new Uint8Array(data.buffer, data.byteOffset, data.length) };
    const before = Buffer.from(data);
    const r = rule.forceSparkle ? forceCleanSparkle(rgba, raw.width, raw.height) : cleanSparkle(rgba, raw.width, raw.height);
    wm = { forced: !!r.forced, found: r.found, k: r.k, peak: r.peak, lapZ: r.lapZ, alpha: r.alpha, fallback: r.fallback, fixed: r.fixed };
    if (r.found) {
      wm.preview = await sparklePreview(before, data, raw.width, raw.height);
      img = sharp(data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
      if (!meta.hasAlpha) img = img.removeAlpha();
    }
  }
  if (rule.autoCutout) {
    const { data, info: raw } = await sharp(file).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = { data: new Uint8Array(data.buffer, data.byteOffset, data.length) };
    const r = autoCutout(rgba, raw.width, raw.height);
    cut = { kind: r.bg.kind, removed: r.removed, colors: r.bg.colors ?? null };
    if (r.mask) {
      const q = assessCutout(rgba, raw.width, raw.height, r.bg, r.removed);
      cut.clean = q.clean;
      cut.reasons = q.reasons;
      cut.preview = await cutoutPreview(file, data, raw.width, raw.height);
      img = sharp(data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
    }
  }
  if (rule.maxWidth) img = img.resize({ width: rule.maxWidth, withoutEnlargement: true });
  else if (rule.box) img = img.resize({ width: rule.box, height: rule.box, fit: 'inside', withoutEnlargement: true });
  else if (rule.exact) img = img.resize(rule.exact, rule.exact, { fit: 'cover' });
  const out = await img.webp({ quality: rule.quality, alphaQuality: 100, effort: 5 }).toBuffer({ resolveWithObject: true });
  return { ...out, ...(cut ? { cut } : {}), ...(wm ? { wm } : {}) };
}

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

const fmt = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(2)} MB` : `${(b / 1024).toFixed(1)} KB`);

// ---------------------------------------------------------------------------
const t0 = Date.now();
let cache = {};
try {
  cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'));
} catch {
  /* chưa có cache */
}
await mkdir(OUT, { recursive: true });

const files = (await walk(SRC)).filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase())).sort();
const jobs = [];
const unclassified = [];
const seen = new Map();
for (const rel of files) {
  const key = rel.slice(0, rel.length - path.extname(rel).length);
  const rule = classify(key);
  if (!rule) {
    unclassified.push(rel);
    continue;
  }
  if (seen.has(key)) throw new Error(`Hai ảnh trùng tên không đuôi: ${seen.get(key)} và ${rel}`);
  seen.set(key, rel);
  jobs.push({ rel, key, rule: FORCE_SPARKLE.has(key) ? { ...rule, forceSparkle: true } : rule });
}

const manifest = {};
const newCache = {};
const stats = { processed: 0, skipped: 0 };
const bigFiles = [];
const cutouts = [];
const watermarks = [];

await pool(jobs, CONCURRENCY, async ({ rel, key, rule }) => {
  const srcPath = path.join(SRC, rel);
  const srcHash = sha(await readFile(srcPath));
  const sig = `${SCRIPT_HASH}:${JSON.stringify(rule)}:${srcHash}`;
  const hit = cache[key];
  let entry;
  if (hit && hit.sig === sig) {
    try {
      await stat(path.join(OUT, hit.file));
      if (hit.watermark?.found) await stat(watermarkPreview(key));
      if (hit.cutout && hit.cutout.kind !== 'transparent' && hit.cutout.kind !== 'none') await stat(spritePreview(key));
      entry = hit;
      stats.skipped++;
    } catch {
      /* file ra bị xóa: nén lại */
    }
  }
  if (!entry) {
    const { data, info, cut, wm } = await encode(srcPath, rule);
    const dir = path.posix.dirname(key);
    const name = path.posix.basename(key);
    const file = `${dir === '.' ? '' : dir + '/'}${name}.${sha(data, 8)}.webp`;
    await mkdir(path.dirname(path.join(OUT, file)), { recursive: true });
    await writeFile(path.join(OUT, file), data);
    entry = { sig, file, bytes: data.length, width: info.width, height: info.height, kind: rule.kind, warnBig: !!rule.warnBig };
    if (wm) {
      entry.watermark = { forced: wm.forced, found: wm.found, k: wm.k, peak: wm.peak, lapZ: wm.lapZ, alpha: wm.alpha, fallback: wm.fallback, fixed: wm.fixed };
      if (wm.preview) {
        await mkdir(path.dirname(watermarkPreview(key)), { recursive: true });
        await writeFile(watermarkPreview(key), wm.preview);
      }
    }
    if (cut) {
      entry.cutout = { kind: cut.kind, removed: cut.removed, colors: cut.colors, clean: cut.clean ?? null, reasons: cut.reasons ?? [] };
      if (cut.preview) {
        const pv = spritePreview(key);
        await mkdir(path.dirname(pv), { recursive: true });
        await writeFile(pv, cut.preview);
      }
    }
    stats.processed++;
    console.log(`  nén  ${rel}  ->  ${file}  (${fmt(data.length)})`);
  }
  newCache[key] = entry;
  if (entry.cutout) cutouts.push({ key, ...entry.cutout });
  if (entry.watermark) watermarks.push({ key, ...entry.watermark });
  manifest[key] = { file: entry.file, bytes: entry.bytes, width: entry.width, height: entry.height };
  if (rule.warnBig && entry.bytes > WARN_BYTES) bigFiles.push({ key, bytes: entry.bytes });
});

// Báo cáo tách nền hình rời: ảnh nào trong suốt thật, ảnh nào bị nền ô vuông / một màu in sẵn và kết quả tách (ảnh chưa sạch cần vẽ lại).
{
  cutouts.sort((a, b) => a.key.localeCompare(b.key));
  const label = { transparent: 'trong suốt thật (giữ nguyên)', checker: 'nền ô vuông', solid: 'nền một màu', none: 'nền là cảnh (không tách)' };
  console.log('Tách nền hình rời (assets/sprites):');
  for (const c of cutouts) {
    const colors = c.colors ? ' ' + c.colors.map((k) => '#' + k.map((v) => v.toString(16).padStart(2, '0')).join('')).join(' ') : '';
    const res = c.kind === 'checker' || c.kind === 'solid' ? `, xóa ${(c.removed * 100).toFixed(1)}% -> ${c.clean ? 'sạch' : 'CHƯA SẠCH: ' + c.reasons.join('; ')}` : '';
    console.log(`  ${c.key}: ${label[c.kind] ?? c.kind}${colors}${res}`);
  }
  const dirty = cutouts.filter((c) => c.clean === false);
  console.log(dirty.length ? `  => ${dirty.length} ảnh tách chưa sạch (xem _preview/sprites/): ${dirty.map((c) => c.key).join(', ')}` : '  => mọi ảnh bị nền đều tách sạch');
  await mkdir(path.join(OUT, '_preview', 'sprites'), { recursive: true });
  await writeFile(path.join(OUT, '_preview', 'sprites', '_report.json'), JSON.stringify(cutouts, null, 2));
}

// Báo cáo dấu ngôi sao của công cụ vẽ ảnh (xem scripts/lib/watermark.mjs): ảnh nào có dấu và đã xóa thế nào; ảnh gần ngưỡng mà chưa xóa.
{
  watermarks.sort((a, b) => a.key.localeCompare(b.key));
  const found = watermarks.filter((w) => w.found);
  console.log('Dấu ngôi sao ở góc dưới phải (scenes, story, ui):');
  for (const w of found) console.log(`  ${w.key}: ${w.forced ? 'luôn xóa (danh sách FORCE_SPARKLE), ' : ''}${w.fallback ? 'tô lại từ điểm ảnh xung quanh' : `gỡ lớp phủ trắng, alpha ${w.alpha.toFixed(2)}`}, sửa ${w.fixed} điểm ảnh`);
  const maybe = watermarks.filter((w) => !w.found && (w.lapZ >= 2.5 || w.peak >= 1.5));
  if (maybe.length) console.log(`  nghi còn dấu mờ, chưa nhận dạng chắc chắn: ${maybe.map((w) => w.key).join(', ')}`);
  console.log(`  => ${found.length} ảnh có dấu đã xóa (ảnh trước | sau ở _preview/watermark/)`);
}

// ---------------------------------------------------------------------------
// Model .glb: xử lý lần lượt (mỗi model gốc nặng vài triệu tam giác nên tốn bộ nhớ).
const MODELS_SRC = path.join(SRC, 'models');
const MODEL_CODE_HASH = createHash('sha256')
  .update(await Promise.all(['glb', 'model-build', 'preview'].map((n) => readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'lib', `${n}.mjs`)))).then((bs) => Buffer.concat(bs)))
  .digest('hex')
  .slice(0, 12);
const modelStats = { processed: 0, skipped: 0 };
const modelFiles = [];
try {
  for (const rel of (await walk(MODELS_SRC)).sort()) if (rel.toLowerCase().endsWith('.glb')) modelFiles.push(rel);
} catch {
  console.log('Không có assets/models/: bỏ qua phần model.');
}
const previewName = (key) => `${key.replace(/^models\//, '').replace(/\//g, '-')}.png`;
const modelEntries = []; // mỗi mục: { key, lod: boolean, ...cacheEntry }
const outFile = (key, glb) => `${path.posix.dirname(key)}/${path.posix.basename(key)}.${sha(glb, 8)}.glb`;

for (const rel of modelFiles) {
  const key = `models/${rel.slice(0, -4)}`;
  const lodKey = key + LOD_SUFFIX;
  const midKey = key + MID_SUFFIX;
  const rule = classifyModel(key);
  const srcBuf = await readFile(path.join(MODELS_SRC, rel));
  const sig = `${MODEL_CODE_HASH}:${JSON.stringify(rule)}:${sha(srcBuf)}`;
  const previewPath = path.join(OUT, '_preview', 'models', previewName(key));
  let main, mid, lod;
  const hitMain = cache[key];
  const hitMid = cache[midKey];
  const hitLod = cache[lodKey];
  const wantMid = rule.lod && hitMain?.tris > MID_MIN_MAIN_TRIS && !hitMain?.midSkipped; // bản vừa chỉ có khi bản chính trên 20.000 tam giác và chế độ chặt xuống được ≤ 25.000
  if (hitMain?.sig === sig && (!rule.lod || hitLod?.sig === sig) && (!wantMid || hitMid?.sig === sig)) {
    try {
      await stat(path.join(OUT, hitMain.file));
      if (rule.lod) await stat(path.join(OUT, hitLod.file));
      if (wantMid) await stat(path.join(OUT, hitMid.file));
      await stat(previewPath);
      main = hitMain;
      mid = wantMid ? hitMid : null;
      lod = rule.lod ? hitLod : null;
      modelStats.skipped++;
    } catch {
      /* file ra hoặc ảnh xem trước bị xóa: nén lại */
    }
  }
  if (!main) {
    const t = Date.now();
    const r = await buildModelSet(srcBuf, rule);
    const toEntry = (v, entryKey) => ({
      sig,
      midSkipped: entryKey === key ? r.midSkipped : undefined,
      file: outFile(entryKey, v.glb),
      glb: v.glb,
      bytes: v.glb.length,
      kind: rule.kind,
      tris: v.after.tris,
      model: { srcBytes: r.srcBytes, simplified: v.simplified, reachedTris: v.reachedTris, removedExt: v.removedExt, skinDeviation: v.skinDeviation, before: v.before, after: v.after, rule },
    });
    main = toEntry(r.main, key);
    mid = r.mid ? toEntry(r.mid, midKey) : null;
    lod = r.lod ? toEntry(r.lod, lodKey) : null;
    for (const e of [main, mid, lod]) {
      if (!e) continue;
      await mkdir(path.dirname(path.join(OUT, e.file)), { recursive: true });
      await writeFile(path.join(OUT, e.file), e.glb);
      delete e.glb;
    }
    await mkdir(path.dirname(previewPath), { recursive: true });
    await writeFile(previewPath, r.preview);
    modelStats.processed++;
    console.log(
      `  nén  models/${rel}  (${fmt(r.srcBytes)} -> ${fmt(main.bytes)}, ${Math.round(r.srcInfo.tris)} -> ${Math.round(main.tris)} tam giác${mid ? `; vừa ${fmt(mid.bytes)}, ${Math.round(mid.tris)} tam giác` : ''}${lod ? `; xa ${fmt(lod.bytes)}, ${Math.round(lod.tris)} tam giác` : ''}, ${((Date.now() - t) / 1000).toFixed(1)}s)`,
    );
  }
  for (const [k, e, tier] of [[key, main, 'main'], [midKey, mid, 'mid'], [lodKey, lod, 'lod']]) {
    if (!e) continue;
    newCache[k] = e;
    manifest[k] = { file: e.file, bytes: e.bytes, width: 0, height: 0, kind: 'model', tris: e.tris };
    modelEntries.push({ key: k, lod: tier === 'lod', mid: tier === 'mid', ...e });
  }
}

// Dọn file cũ: mọi file trong assets-build (trừ manifest.json và _preview/) không còn trong manifest.
const keep = new Set(Object.values(manifest).map((m) => m.file));
let removed = 0;
for (const f of await walk(OUT, '', new Set())) { // assets-build/ có thư mục models/ (bản nén), nên không bỏ qua thư mục nào
  if (f === 'manifest.json' || f.startsWith('_preview/')) continue;
  if (!keep.has(f)) {
    await rm(path.join(OUT, f));
    removed++;
  }
}
async function pruneEmpty(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory() && e.name !== '_preview') {
      const p = path.join(dir, e.name);
      await pruneEmpty(p);
      if ((await readdir(p)).length === 0) await rm(p, { recursive: true });
    }
  }
}
await pruneEmpty(OUT);

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => (a < b ? -1 : 1)));
await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(sorted, null, 2) + '\n');
await writeFile(CACHE_FILE, JSON.stringify(newCache, null, 2) + '\n');
await writeIconPreview(manifest);

// ---------------------------------------------------------------------------
const byKind = {};
for (const e of Object.values(newCache)) {
  byKind[e.kind] ??= { n: 0, bytes: 0 };
  byKind[e.kind].n++;
  byKind[e.kind].bytes += e.bytes;
}
const total = Object.values(manifest).reduce((s, m) => s + m.bytes, 0);
console.log('\n=== Tổng kết assets:build ===');
console.log('Loại           Số file   Dung lượng');
for (const [k, v] of Object.entries(byKind).sort()) {
  console.log(`${k.padEnd(14)} ${String(v.n).padStart(7)}   ${fmt(v.bytes).padStart(10)}`);
}
console.log(`${'TỔNG'.padEnd(14)} ${String(Object.keys(manifest).length).padStart(7)}   ${fmt(total).padStart(10)}`);
console.log(`Nén mới ${stats.processed}, bỏ qua (không đổi) ${stats.skipped}, xóa bản cũ ${removed}. Mất ${((Date.now() - t0) / 1000).toFixed(1)} giây.`);
if (bigFiles.length) {
  console.log(`\nCẢNH BÁO: ${bigFiles.length} ảnh nền/ảnh truyện vượt ${WARN_BYTES / 1024} KB sau nén:`);
  for (const b of bigFiles.sort((a, b) => b.bytes - a.bytes)) console.log(`  ${fmt(b.bytes).padStart(10)}  ${b.key}`);
} else {
  console.log(`\nKhông có ảnh nền/ảnh truyện nào vượt ${WARN_BYTES / 1024} KB.`);
}
if (unclassified.length) {
  console.log(`\nBỏ qua ${unclassified.length} ảnh chưa có quy tắc nén:`);
  for (const u of unclassified) console.log(`  ${u}`);
}

// ---------------------------------------------------------------------------
// Model: bảng gốc / chính / xa, cảnh báo, kiểm tra xương và hoạt ảnh.
if (modelEntries.length) {
  const MB = 1048576;
  const warnings = [];
  const notes = [];
  const problems = [];
  const rows = [];
  const mains = modelEntries.filter((m) => !m.lod && !m.mid);
  const lods = new Map(modelEntries.filter((m) => m.lod).map((m) => [m.key, m]));
  const mids = new Map(modelEntries.filter((m) => m.mid).map((m) => [m.key, m]));
  for (const e of mains) {
    const { before, after, rule, simplified, reachedTris, srcBytes, skinDeviation, removedExt } = e.model;
    const lod = lods.get(e.key + LOD_SUFFIX);
    const mid = mids.get(e.key + MID_SUFFIX);
    const tex = largestTexture(after);
    const w = (msg) => warnings.push(`${e.key}: ${msg}`);
    if (e.bytes > rule.maxBytes) w(`${(e.bytes / MB).toFixed(2)} MB, vượt mục tiêu ${rule.maxBytes / MB} MB (${rule.kind === 'nhan-vat' ? 'nhân vật' : 'đồ vật'})`);
    if (before.skins > 0 && before.tris > 30000) w(`có xương và ${Math.round(before.tris)} tam giác: không giảm mặt, chỉ cảnh báo`);
    if (simplified && reachedTris > rule.targetTris * 1.25) w(`chế độ chặt dừng ở ${Math.round(reachedTris)} tam giác (mục tiêu ${rule.targetTris}), giữ nguyên`);
    if (tex && Math.max(tex.width, tex.height) > rule.maxTexture) w(`texture ${tex.width}x${tex.height} vượt ${rule.maxTexture}`);
    if (removedExt.length) notes.push(`${e.key}: ${removedExt.join(', ')}`);
    if (skinDeviation !== null && skinDeviation > 0.01) problems.push(`${e.key}: bộ xương lệch ${(skinDeviation * 100).toFixed(2)}% sau nén (tối đa 1%)`);
    if (REQUIRED_CLIPS[e.key]) {
      const { problems: p } = checkCharacter(after, e.key);
      for (const m of p) problems.push(`${e.key}: ${m}`);
    }
    if (rule.lod && !lod) problems.push(`${e.key}: thiếu bản xa`);
    if (e.midSkipped) w(`không tạo bản vừa: chế độ chặt (sai số 3%) dừng ở ${e.midSkipped.reachedTris} tam giác, trên ${MID_MAX_TRIS}`);
    else if (e.tris > MID_MIN_MAIN_TRIS && !mid) problems.push(`${e.key}: thiếu bản vừa`);
    if (mid) {
      if (mid.tris > MID_TRIS * 1.25) w(`bản vừa: chế độ chặt dừng ở ${Math.round(mid.tris)} tam giác (mục tiêu ${MID_TRIS}), giữ nguyên`);
      if (mid.bytes > e.bytes) w(`bản vừa ${(mid.bytes / MB).toFixed(2)} MB nặng hơn bản chính ${(e.bytes / MB).toFixed(2)} MB`);
    }
    if (lod) {
      if (lod.bytes > rule.lodMaxBytes) w(`bản xa ${(lod.bytes / MB).toFixed(2)} MB, vượt mục tiêu ${rule.lodMaxBytes / MB} MB`);
      if (lod.tris > LOD_TRIS * 1.25) w(`bản xa ${Math.round(lod.tris)} tam giác (mục tiêu ${LOD_TRIS})`);
    }
    rows.push({
      name: e.key.replace(/^models\//, ''),
      before: srcBytes / MB,
      after: e.bytes / MB,
      tris: `${Math.round(before.tris).toLocaleString('en-US')} -> ${Math.round(after.tris).toLocaleString('en-US')}`,
      tex: tex ? `${tex.width}x${tex.height}` : '-',
      midMb: mid ? mid.bytes / MB : null,
      midTris: mid ? Math.round(mid.tris).toLocaleString('en-US') : '-',
      lodMb: lod ? lod.bytes / MB : null,
      lodTris: lod ? Math.round(lod.tris).toLocaleString('en-US') : '-',
    });
  }
  const nameW = Math.max(...rows.map((r) => r.name.length), 5);
  console.log('\n=== Model: gốc / bản chính / bản vừa / bản xa ===');
  console.log(
    `${'Model'.padEnd(nameW)}  ${'Gốc MB'.padStart(7)}  ${'Chính MB'.padStart(8)}  ${'Tam giác (gốc -> chính)'.padEnd(24)}  ${'Texture'.padEnd(9)}  ${'Vừa MB'.padStart(6)}  ${'Vừa tam giác'.padStart(12)}  ${'Xa MB'.padStart(6)}  Xa tam giác`,
  );
  for (const r of rows) {
    console.log(
      `${r.name.padEnd(nameW)}  ${r.before.toFixed(2).padStart(7)}  ${r.after.toFixed(2).padStart(8)}  ${r.tris.padEnd(24)}  ${r.tex.padEnd(9)}  ${(r.midMb === null ? '-' : r.midMb.toFixed(2)).padStart(6)}  ${r.midTris.padStart(12)}  ${(r.lodMb === null ? '-' : r.lodMb.toFixed(2)).padStart(6)}  ${r.lodTris}`,
    );
  }
  const sum = (xs) => xs.reduce((s, x) => s + x, 0);
  console.log(
    `${'TỔNG'.padEnd(nameW)}  ${sum(rows.map((r) => r.before)).toFixed(2).padStart(7)}  ${sum(rows.map((r) => r.after)).toFixed(2).padStart(8)}  ${''.padEnd(24)}  ${''.padEnd(9)}  ${sum(rows.map((r) => r.midMb ?? 0)).toFixed(2).padStart(6)}  ${''.padStart(12)}  ${sum(rows.map((r) => r.lodMb ?? 0)).toFixed(2).padStart(6)}`,
  );
  console.log(`Model nén mới ${modelStats.processed}, bỏ qua (không đổi) ${modelStats.skipped}. Ảnh so sánh gốc | chính | vừa | xa: assets-build/_preview/models/ (bản vừa texture 1024, bản xa texture ${LOD_TEXTURE}).`);

  console.log('\n=== Kiểm tra xương và hoạt ảnh (đọc lại file đã nén) ===');
  for (const e of mains.filter((m) => m.model.before.skins > 0)) {
    const { after, before, skinDeviation } = e.model;
    const clips = after.clips.map((c) => `${c.name} (${c.duration.toFixed(2)}s)`).join(', ');
    const srcClips = before.clips.length;
    console.log(`${e.key}: ${after.joints} xương (gốc ${before.joints}), ${after.clips.length}/${srcClips} clip, lệch hộp bao ${(skinDeviation * 100).toFixed(3)}%`);
    console.log(`    clip: ${clips}`);
    if (after.clips.length !== srcClips) problems.push(`${e.key}: gốc ${srcClips} clip, sau nén ${after.clips.length}`);
  }

  if (notes.length) {
    console.log(`\nĐÃ GỠ vật liệu kính (đổi về vật liệu thường, giữ màu gốc) ở ${notes.length} model:`);
    for (const m of notes) console.log(`  ${m}`);
  }
  if (warnings.length) {
    console.log(`\nCẢNH BÁO model (${warnings.length}):`);
    for (const m of warnings) console.log(`  ${m}`);
  } else {
    console.log('\nKhông có cảnh báo model.');
  }
  if (problems.length) {
    console.log(`\nLỖI model (${problems.length}):`);
    for (const m of problems) console.log(`  ${m}`);
    process.exitCode = 1;
  }
}
