// Nén đồ họa: đọc assets/, ghi assets-build/ + manifest.json. Chạy: pnpm assets:build
// Phần ảnh (mốc 1). Model .glb làm ở mốc 2; hai ảnh man-06 lúc này chuyển như ảnh nền thường.
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'assets');
const OUT = path.join(ROOT, 'assets-build');
const CACHE_FILE = path.join(SRC, '.build-cache.json'); // nằm cạnh ảnh gốc, không commit, không deploy
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SKIP_DIRS = new Set(['concept', 'source', 'models']);
const WARN_BYTES = 400 * 1024;
const CONCURRENCY = 4;

// Đổi số này khi đổi quy tắc nén, để mọi ảnh được nén lại.
const RULES_VERSION = 1;

/** Quy tắc nén theo đường dẫn không đuôi (dấu /). Trả null nếu chưa có quy tắc. */
function classify(key) {
  if (/^(scenes|story)\//.test(key) || key === 'ui/ban-do' || key === 'ui/man-hinh-tai') {
    return { kind: 'nen', maxWidth: 1920, quality: 82, warnBig: true };
  }
  if (
    key.startsWith('sprites/') ||
    /^ui\/(cards|tiles|textures)\//.test(key) ||
    key === 'ui/logo-art' ||
    key === 'ui/bang-khen-khung'
  ) {
    return { kind: 'hinh-roi', box: 1024, quality: 85 };
  }
  if (key.startsWith('ui/icons/')) return { kind: 'icon', box: 256, quality: 85 };
  if (key.startsWith('ui/portraits/')) return { kind: 'chan-dung', exact: 512, quality: 85 };
  return null;
}

async function walk(dir, rel = '') {
  const out = [];
  for (const e of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (!rel && SKIP_DIRS.has(e.name)) continue;
      out.push(...(await walk(dir, r)));
    } else if (e.isFile()) out.push(r);
  }
  return out;
}

const sha = (buf, n = 16) => createHash('sha256').update(buf).digest('hex').slice(0, n);

async function encode(file, rule) {
  let img = sharp(file).rotate();
  if (rule.maxWidth) img = img.resize({ width: rule.maxWidth, withoutEnlargement: true });
  else if (rule.box) img = img.resize({ width: rule.box, height: rule.box, fit: 'inside', withoutEnlargement: true });
  else if (rule.exact) img = img.resize(rule.exact, rule.exact, { fit: 'cover' });
  return img.webp({ quality: rule.quality, alphaQuality: 100, effort: 5 }).toBuffer({ resolveWithObject: true });
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
  jobs.push({ rel, key, rule });
}

const manifest = {};
const newCache = {};
const stats = { processed: 0, skipped: 0 };
const bigFiles = [];

await pool(jobs, CONCURRENCY, async ({ rel, key, rule }) => {
  const srcPath = path.join(SRC, rel);
  const srcHash = sha(await readFile(srcPath));
  const sig = `${RULES_VERSION}:${JSON.stringify(rule)}:${srcHash}`;
  const hit = cache[key];
  let entry;
  if (hit && hit.sig === sig) {
    try {
      await stat(path.join(OUT, hit.file));
      entry = hit;
      stats.skipped++;
    } catch {
      /* file ra bị xóa: nén lại */
    }
  }
  if (!entry) {
    const { data, info } = await encode(srcPath, rule);
    const dir = path.posix.dirname(key);
    const name = path.posix.basename(key);
    const file = `${dir === '.' ? '' : dir + '/'}${name}.${sha(data, 8)}.webp`;
    await mkdir(path.dirname(path.join(OUT, file)), { recursive: true });
    await writeFile(path.join(OUT, file), data);
    entry = { sig, file, bytes: data.length, width: info.width, height: info.height, kind: rule.kind, warnBig: !!rule.warnBig };
    stats.processed++;
    console.log(`  nén  ${rel}  ->  ${file}  (${fmt(data.length)})`);
  }
  newCache[key] = entry;
  manifest[key] = { file: entry.file, bytes: entry.bytes, width: entry.width, height: entry.height };
  if (rule.warnBig && entry.bytes > WARN_BYTES) bigFiles.push({ key, bytes: entry.bytes });
});

// Dọn file cũ: mọi file trong assets-build (trừ manifest.json và _preview/) không còn trong manifest.
const keep = new Set(Object.values(manifest).map((m) => m.file));
let removed = 0;
for (const f of await walk(OUT)) {
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
