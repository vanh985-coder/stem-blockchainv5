// Kiểm tra: không có chữ tiếng Việt có dấu viết thẳng trong .ts/.tsx (chuỗi hoặc JSX). Chạy: pnpm check:text
// Chữ hiển thị phải nằm trong packages/core/src/content/ (spec 03 mục 7).
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_DIRS = ['apps', 'packages'];

// Bỏ qua (đường dẫn dạng posix, tính từ gốc repo).
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', '.vite']);
const IGNORE = [
  /^packages\/core\/src\/content\//, // nơi chứa chữ
  // Cả 4 bài đã chuyển chữ sang content/lessons/ (kể cả chữ nằm trong logic và bots) nên không còn ngoại lệ cho bài học.
  /^packages\/core\/src\/lessons\/[^/]+\/tests\.ts$/, // dữ liệu test của giai đoạn 1 (chuỗi so sánh nguyên văn)
  /\.test\.tsx?$/, // test vitest
  /^packages\/core\/src\/lib\/rng\.ts$/, // thông báo lỗi cho lập trình viên
  /^_giai-doan-1\//,
];

// Chữ cái có dấu của tiếng Việt (kể cả đ, Đ).
const VIET = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

// Bỏ chú thích dòng và chú thích khối, giữ nguyên số dòng; chuỗi và JSX giữ nguyên.
function stripComments(src) {
  let out = '';
  let i = 0;
  let state = 'code'; // code | line | block | sq | dq | tpl
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') {
        state = 'line';
        i += 2;
      } else if (c === '/' && d === '*') {
        state = 'block';
        i += 2;
      } else {
        if (c === "'") state = 'sq';
        else if (c === '"') state = 'dq';
        else if (c === '`') state = 'tpl';
        out += c;
        i++;
      }
    } else if (state === 'line') {
      if (c === '\n') {
        state = 'code';
        out += c;
      }
      i++;
    } else if (state === 'block') {
      if (c === '*' && d === '/') {
        state = 'code';
        i += 2;
      } else {
        if (c === '\n') out += c;
        i++;
      }
    } else {
      // Chuỗi: ' và " kết thúc ở cuối dòng để một dấu nháy lẻ trong JSX không "nuốt" cả file.
      out += c;
      if (c === '\\') {
        out += d ?? '';
        i += 2;
        continue;
      }
      if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"') || (state === 'tpl' && c === '`')) state = 'code';
      else if (c === '\n' && state !== 'tpl') state = 'code';
      i++;
    }
  }
  return out;
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIR_NAMES.has(e.name)) yield* walk(path.join(dir, e.name));
    } else if (/\.tsx?$/.test(e.name)) {
      yield path.join(dir, e.name);
    }
  }
}

const problems = [];
let scanned = 0;
for (const top of SCAN_DIRS) {
  for await (const file of walk(path.join(ROOT, top))) {
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    if (IGNORE.some((re) => re.test(rel))) continue;
    scanned++;
    const lines = stripComments(await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, idx) => {
      if (VIET.test(line)) problems.push(`${rel}:${idx + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
}

if (problems.length) {
  console.error(`check:text: ${problems.length} dòng có chữ tiếng Việt nằm ngoài content/:\n`);
  for (const p of problems) console.error('  ' + p);
  console.error('\nHãy chuyển chữ vào packages/core/src/content/ (xem content/HUONG-DAN-SUA-CHU.md).');
  process.exit(1);
}
console.log(`check:text: sạch (${scanned} file đã quét).`);
