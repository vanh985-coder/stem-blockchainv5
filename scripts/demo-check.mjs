/**
 * Kiểm chế độ demo (đợt 1: Làng Giấy) bằng Chrome thật (puppeteer-core), 1920×1080.
 *   pnpm dev:demo            (hub gộp 5873 + đồ họa 5180)
 *   node scripts/demo-check.mjs            (URL=... đổi địa chỉ; HEADED=1 mở cửa sổ thật; TOCDO=1.5 chỉnh nhịp; CHROME=... đường dẫn Chrome)
 * Chạy ?demo=1 từ đầu tới hết đợt 1, xác nhận: không cảnh nào kẹt hay lỗi, không lỗi console, tiến độ cuối đúng (màn 1–3 xong, 4 thẻ, 1 Trang Sổ Vàng).
 * In thời lượng từng cảnh; ảnh JPEG dưới 300 KB lưu ở docs/screenshots/demo/. Thoát mã 1 nếu có ca hỏng.
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, statSync } from 'node:fs';

const BASE = process.env.URL || 'http://localhost:5873';
const OUT = 'docs/screenshots/demo';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!CHROME) {
  console.error('Không tìm thấy Google Chrome');
  process.exit(1);
}
const TOCDO = process.env.TOCDO || '1';
const CANH = process.env.CANH || ''; // bắt đầu từ cảnh này (đặt sẵn tiến độ khách), để kiểm riêng một đoạn
const EXPECTED = ['gioi-thieu', 'cho-den-lang-giay', 'giay-the', 'giay-man-1', 'giay-man-2', 'giay-man-3', 'giay-trao-trang'];
const TOTAL_MS = Number(process.env.TOTAL_MS || 25 * 60 * 1000);

let failed = 0;
function check(name, ok, detail = '') {
  if (!ok) failed++;
  console.log(`   ${ok ? '✓' : '✗'} ${name}${detail ? ` (${detail})` : ''}`);
}

async function shot(page, name) {
  const file = `${OUT}/${name}.jpg`;
  for (const q of [60, 45, 32]) {
    await page.screenshot({ path: file, type: 'jpeg', quality: q });
    if (statSync(file).size < 300 * 1024) break;
  }
  const kb = Math.round(statSync(file).size / 1024);
  check(`ảnh ${name}.jpg dưới 300 KB`, kb < 300, `${kb} KB`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: process.env.HEADED ? false : true,
  defaultViewport: { width: 1920, height: 1080 },
  args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--window-size=1920,1080', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const errors = [];
page.on('console', (m) => {
  const t = m.text();
  if (t.startsWith('[demo]')) console.log(`   ${t}`);
  else if (m.type() === 'error') errors.push(t);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.evaluateOnNewDocument((canh) => {
  if (canh) {
    const lv = {};
    if (canh !== 'giay-man-1' && canh !== 'giay-the') lv['1'] = [1, 1, 3, 3, 3];
    if (canh === 'giay-man-3' || canh === 'giay-trao-trang') lv['2'] = [1, 1, 2, 3000];
    const ck = { v: 1, lv, gp: 0, c: 0, u: Date.now(), st: 1, kc: [15, 0, 0, 0], gt: 0, hd: 1, vs: 1, vi: 1 };
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(ck))}; path=/`;
  }
  localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
}, CANH);

console.log(`\n--- Demo đợt 1, nhịp ${TOCDO} ---`);
const t0 = Date.now();
await page.goto(`${BASE}${CANH ? '/cho?tu=lang-giay&' : '/?'}demo=1&tocdo=${TOCDO}${CANH ? `&canh=${CANH}` : ''}`, { waitUntil: 'domcontentloaded' });

const shots = new Set();
let lastCount = 0;
const SHOT_AT = { 'gioi-thieu': 'cho-vua-vao', 'cho-den-lang-giay': 'trong-lang', 'giay-the': 'sau-the', 'giay-man-1': 'sau-man-1', 'giay-man-2': 'sau-man-2', 'giay-man-3': 'sau-man-3' };
for (;;) {
  await sleep(1000);
  const st = await page.evaluate(() => ({ log: window.__demoLog ?? [], done: window.__demoDone === true, path: location.pathname }));
  if (st.log.length > lastCount) {
    const l = st.log[st.log.length - 1];
    const tag = SHOT_AT[l.id];
    if (tag && !shots.has(tag)) {
      shots.add(tag);
      await shot(page, tag);
    }
    lastCount = st.log.length;
  }
  if (st.done) break;
  if (Date.now() - t0 > TOTAL_MS) {
    check('demo chạy xong trong thời hạn', false, `quá ${Math.round(TOTAL_MS / 1000)} giây, đang ở ${st.path}`);
    await shot(page, 'ket-thoi-han');
    break;
  }
}

const log = await page.evaluate(() => window.__demoLog ?? []);
console.log('\n--- Thời lượng từng cảnh ---');
let total = 0;
for (const l of log) {
  total += l.ms;
  console.log(`   ${l.id.padEnd(22)} ${(l.ms / 1000).toFixed(1).padStart(7)} s  ${l.status}${l.error ? `  ${l.error}` : ''}`);
}
console.log(`   ${'TỔNG'.padEnd(22)} ${(total / 1000).toFixed(1).padStart(7)} s  (${Math.floor(total / 60000)} phút ${Math.round((total % 60000) / 1000)} giây)`);

console.log('\n--- Kiểm ---');
check('chạy đủ các cảnh đợt 1 đúng thứ tự', JSON.stringify(log.map((l) => l.id)) === JSON.stringify(EXPECTED), log.map((l) => l.id).join(','));
check('không cảnh nào kẹt, lỗi hay bị bỏ qua', log.every((l) => l.status === 'done'), log.filter((l) => l.status !== 'done').map((l) => `${l.id}:${l.status}`).join(' '));
const prog = await page.evaluate(() => {
  const p = window.__progress;
  const lv = (id) => p?.progress?.levels?.[id] ?? p?.progress?.levels?.[String(id)];
  const done = (id) => {
    const r = p?.unlock?.levels?.find((u) => u.id === id);
    return r?.state === 'done';
  };
  return {
    pages: p?.goldenPages,
    done: [1, 2, 3].map(done),
    know: p?.progress?.game?.data?.kc ?? p?.progress?.game?.data?.knowCards ?? null,
    knowRaw: JSON.stringify(p?.progress?.game?.data ?? {}).slice(0, 400),
    stars: Object.fromEntries([1, 2, 3].map((id) => [id, lv(id)?.stars ?? null])),
  };
});
console.log(`   tiến độ: ${JSON.stringify(prog)}`);
check('Màn 1, 2, 3 đã xong', prog.done.every(Boolean));
check('có 1 Trang Sổ Vàng', prog.pages === 1, String(prog.pages));
const starVals = (id) => Object.values(prog.stars[id] ?? {}).filter((v) => typeof v === 'number');
check('Màn 1: cả 3 trạm đạt 3 sao', starVals(1).length >= 3 && starVals(1).every((v) => v === 3), JSON.stringify(prog.stars[1]));
check('Màn 2 và 3 đạt huy chương Vàng', [2, 3].every((id) => starVals(id).some((v) => v === 3)), JSON.stringify([prog.stars[2], prog.stars[3]]));
const mask = await page.evaluate(() => window.__progress?.progress?.game?.data?.knowCards?.['lang-giay'] ?? null);
check('đủ 4 thẻ Em có biết? của Làng Giấy', mask === 15, `mặt nạ ${JSON.stringify(mask)}`);
const critical = errors.filter((e) => !/favicon|manifest|404|Failed to load resource/i.test(e));
check('không lỗi console', critical.length === 0, critical.slice(0, 3).join(' | '));
await shot(page, 'cuoi-dot-1');

await browser.close();
console.log(failed ? `\n${failed} ca hỏng` : '\nTất cả đạt');
process.exit(failed ? 1 : 0);
