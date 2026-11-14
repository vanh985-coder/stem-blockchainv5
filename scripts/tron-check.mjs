/**
 * Chạy thử demo TRỌN GAME (?demo=1&kieu=tron) bằng Chrome thật (puppeteer-core), 1920×1080.
 *   pnpm dev:demo                       (hub gộp 5873 + đồ họa 5180)
 *   node scripts/tron-check.mjs         (URL=... đổi địa chỉ; HEADED=1 cửa sổ thật; TU=G11 bắt đầu từ đoạn; KIEM=0.1 chia nhỏ mức tối thiểu để kiểm nhanh; STOP=D01 dừng khi tới đoạn;
 *                                         SHOTS=S03,G07,... chụp ảnh khi đoạn bắt đầu (JPEG dưới 300 KB, lưu ở docs/screenshots/demo-tron/); TOTAL_MIN=90 hạn giờ tổng)
 * In mốc giây, thời lượng từng đoạn so với mức tối thiểu (số chữ / 2,5), lỗi console. Thoát mã 1 nếu có ca hỏng.
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

const BASE = process.env.URL || 'http://localhost:5873';
const OUT = 'docs/screenshots/demo-tron';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!CHROME) {
  console.error('Không tìm thấy Google Chrome');
  process.exit(1);
}
const TU = (process.env.TU || '').toUpperCase();
const KIEM = Number(process.env.KIEM || 1);
const STOP = (process.env.STOP || '').toUpperCase();
// SHOTS=S03,G07+20: chụp khi đoạn bắt đầu (cộng thêm N giây nếu có +N)
const SHOT_SPECS = (process.env.SHOTS || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).map((s) => ({ code: s.split('+')[0], delay: Number(s.split('+')[1] || 0), name: s.replace('+', '-') }));
const SHOTS = SHOT_SPECS.map((x) => x.code);
const TOTAL_MS = Number(process.env.TOTAL_MIN || 120) * 60 * 1000;

// số chữ từng đoạn (để so thời lượng thực tế với mức tối thiểu)
const words = {};
for (const m of readFileSync('packages/core/src/demo/tron/doan.ts', 'utf8').matchAll(/^\s+([SGDKB]\d\d): (\d+),/gm)) words[m[1]] = Number(m[2]);

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed++;
  console.log(`   ${ok ? '✓' : '✗'} ${name}${detail ? ` (${detail})` : ''}`);
};
async function shot(page, name) {
  const file = `${OUT}/${name}.jpg`;
  for (const q of [60, 45, 32]) {
    await page.screenshot({ path: file, type: 'jpeg', quality: q });
    if (statSync(file).size < 300 * 1024) break;
  }
  check(`ảnh ${name}.jpg dưới 300 KB`, statSync(file).size < 300 * 1024, `${Math.round(statSync(file).size / 1024)} KB`);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: process.env.HEADED ? false : true,
  defaultViewport: { width: 1920, height: 1080 },
  args: process.env.HEADED ? ['--window-size=1920,1080', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] : ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--window-size=1920,1080', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.bringToFront().catch(() => undefined);
const VP = (process.env.VIEWPORT || '1920x1080').split('x').map(Number);
await page.setViewport({ width: VP[0], height: VP[1] });
if (process.env.REDUCED) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
const errors = [];
page.on('console', (m) => {
  const t = m.text();
  if (t.startsWith('[demo]') || t.startsWith('[tron]')) console.log(`   ${t}`);
  else if (m.type() === 'error') errors.push(t);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
// DEFAULT_SETTINGS=1: không ghi đè cài đặt (như Chrome thật của người dùng: chất lượng tự động...). Mặc định ép mức Thấp cho chạy không đầu nhanh hơn.
if (!process.env.DEFAULT_SETTINGS) await page.evaluateOnNewDocument(() => {
  localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
});

console.log(`\n--- Demo trọn game${TU ? `, từ ${TU}` : ''}, kiểm ×${KIEM} ---`);
const t0 = Date.now();
let lastDbg = 0;
let lastSnap = 0;
await page.goto(`${BASE}/?demo=1&kieu=tron${TU ? `&tu=${TU}` : ''}${KIEM !== 1 ? `&kiem=${KIEM}` : ''}`, { waitUntil: 'domcontentloaded' });

const shot1 = new Set();
let marksSeen = 0;
let stoppedAt = '';
for (;;) {
  await sleep(1000);
  const st = await page.evaluate(() => ({ marks: window.__tronMarks ?? [], log: window.__demoLog ?? [], done: window.__demoDone === true, path: location.pathname, w: window.__demoWorld ? { r: window.__demoWorld.ready, e: window.__demoWorld.entering, in: window.__demoWorld.inside, d: window.__demoWorld.dialogOpen, k: !!window.__demoWorld.know, n: window.__demoWorld.near?.kind, p: window.__demoWorld.api.player && [Math.round(window.__demoWorld.api.player.x), Math.round(window.__demoWorld.api.player.z)], ax: window.__demoWorld.api.input.keyAxis.y } : null })).catch(() => null);
  if (!st) continue;
  if (process.env.SNAP && Date.now() - lastSnap > Number(process.env.SNAP_MS || 20000)) {
    lastSnap = Date.now();
    await page.screenshot({ path: process.env.SNAP.endsWith('/') ? process.env.SNAP + 'snap-' + String(Math.round((Date.now() - t0) / 1000)).padStart(4, '0') + '.jpg' : process.env.SNAP, type: 'jpeg', quality: 35 }).catch(() => undefined);
  }
  if (process.env.DEBUG && Date.now() - lastDbg > 8000 && (lastDbg = Date.now())) console.log('   . ' + st.path + ' w=' + JSON.stringify(st.w) + ' log=' + st.log.map((l) => l.id + ':' + l.status).join(','));
  while (marksSeen < st.marks.length) {
    const m = st.marks[marksSeen++];
    for (const sp of SHOT_SPECS.filter((x) => x.code === m.code && !shot1.has(x.name))) {
      shot1.add(sp.name);
      await sleep(1500 + sp.delay * 1000);
      await shot(page, sp.name.toLowerCase());
    }
    if (STOP && m.code === STOP) stoppedAt = m.code;
  }
  if (stoppedAt) break;
  if (st.done) break;
  if (Date.now() - t0 > TOTAL_MS) {
    check('demo chạy xong trong thời hạn', false, `đang ở ${st.path}`);
    await shot(page, 'ket-thoi-han');
    break;
  }
}

const res = await page.evaluate(() => ({ marks: window.__tronMarks ?? [], log: window.__demoLog ?? [], btn: !!document.querySelector('[data-testid="tron-tai-moc"]') }));
const totalMs = Date.now() - t0;
console.log('\n--- Mốc giây và thời lượng từng đoạn ---');
console.log('   mã    mốc      thực tế   tối thiểu  đạt?');
for (let i = 0; i < res.marks.length; i++) {
  const m = res.marks[i];
  const next = res.marks[i + 1];
  const actual = next ? (next.ms - m.ms) / 1000 : NaN;
  const need = (words[m.code] ?? 0) / 2.5;
  const ok = Number.isNaN(actual) ? '' : actual + 0.3 >= need * KIEM ? 'đạt' : 'THIẾU';
  if (ok === 'THIẾU') failed++;
  const mm = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  console.log(`   ${m.code}  ${mm(m.ms).padStart(6)}  ${Number.isNaN(actual) ? '   -   ' : actual.toFixed(1).padStart(7) + ' s'}  ${need.toFixed(1).padStart(8)} s  ${ok}`);
}
console.log('\n--- Cảnh (director) ---');
for (const l of res.log) {
  if (l.status !== 'done') failed++;
  console.log(`   ${l.id.padEnd(16)} ${(l.ms / 1000).toFixed(1).padStart(7)} s  ${l.status}${l.error ? `  ${l.error}` : ''}`);
}
const last = res.marks[res.marks.length - 1];
console.log(`\nTổng thời gian chạy: ${(totalMs / 60000).toFixed(1)} phút (kể cả đếm ngược 5 giây).`);
if (!STOP) check('có nút "Tải mốc giây" khi hết video', res.btn);
check('không lỗi console', errors.length === 0, errors.slice(0, 3).join(' | ').slice(0, 300));
void last;
await browser.close();
process.exit(failed ? 1 : 0);
