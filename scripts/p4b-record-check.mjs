// P4b (hoàn thiện): thẻ bắt đầu và màn kết quả của màn 3 với ba trường hợp kỷ lục: chưa có, trong khoảng 0-355, cũ trên 355. Bản build VITE_PROBE (cầu nối __miniFinish kết thúc ván với điểm cho trước
// qua đúng đường onFinish của khung). Kiểm cả việc điểm cao nhất và huy chương đã lưu KHÔNG bị đổi. Chuẩn bị và cách chạy như scripts/p4b-check.mjs.
// Chạy: node scripts/p4b-record-check.mjs [--url=http://localhost:5190] [--size=0,1,2] [--no-write]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const BASE = arg('url', 'http://localhost:5190');
const OUT = 'docs/screenshots/p4b';
const write = !process.argv.includes('--no-write');
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (write) mkdirSync(OUT, { recursive: true });
const results = [];
const shots = [];
const check = (size, area, name, ok, detail = '') => { results.push({ size, area, name, ok: Boolean(ok), detail }); if (!ok) console.log(`   ✗ [${size}] ${area}: ${name} — ${detail}`); };

const lesson = [1, 1, 3, 3, 3];
// game: [đã chơi, xong, mốc (0-3), điểm cao nhất]
const cookieFor = (lv3) => ({ v: 1, lv: { 1: lesson, 2: [1, 1, 3, 100], ...(lv3 ? { 3: lv3 } : {}) }, gp: 0, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 4095, hd: 2147483647, vs: 15, vi: 15 });
const CASES = [
  { id: 'chua-co', lv3: null, best: 0, finish: 330, label: 'chưa có kỷ lục' },
  { id: 'trong-khoang', lv3: [1, 1, 2, 300], best: 300, finish: 250, label: 'kỷ lục 300 (trong 0-355)' },
  { id: 'cu-tren-355', lv3: [1, 1, 3, 480], best: 480, finish: 340, label: 'kỷ lục cũ 480 (trên 355)' },
];

const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const readCookie = (page) => page.evaluate(() => { const m = document.cookie.match(/sc_guest=([^;]+)/); return m ? JSON.parse(decodeURIComponent(m[1])) : null; });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    for (const c of CASES) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
      const [w, h] = size.w < size.h ? [size.h, size.w] : [size.w, size.h]; // màn 3 chỉ chơi ngang; thẻ bắt đầu dọc vẫn đủ: chụp theo khung ngang cho đồng nhất với kiểm chơi
      await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.evaluate((p) => { localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, quality: 'low' })); document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`; }, cookieFor(c.lv3));
      await page.goto(`${BASE}/lang/lang-giay/man/3?q=low`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="the-bat-dau"]', { timeout: 90000 });
      await sleep(400);
      const card = await page.evaluate(() => ({ best: document.querySelector('[data-testid="diem-cao"]')?.innerText.replace(/\s+/g, ' ') ?? '', note: !!document.querySelector('[data-testid="ky-luc-cu"]'), text: document.body.innerText }));
      const sz = `${size.name}`;
      if (c.best === 0) check(sz, c.label, 'thẻ bắt đầu: "Em chưa chơi màn này.", không chú thích', /Em chưa chơi màn này/.test(card.best) && !card.note, card.best);
      else check(sz, c.label, `thẻ bắt đầu: "Điểm cao nhất: ${c.best}"${c.best > 355 ? ' kèm chú thích "Kỷ lục từ phiên bản trước"' : ', KHÔNG chú thích'}`, new RegExp(`Điểm cao nhất: ${c.best}\\b`).test(card.best) && card.note === c.best > 355 && /Kỷ lục từ phiên bản trước/.test(card.text) === c.best > 355, card.best);
      check(sz, c.label, 'thẻ bắt đầu hiện mốc 290 · 320 · 330', /Đồng 290 · Bạc 320 · Vàng 330/.test(card.text), '');
      let buf = await page.screenshot({ type: 'jpeg', quality: 60 });
      if (write) writeFileSync(`${OUT}/ky-luc-${c.id}-the-bat-dau-${sz}.jpg`, buf);
      shots.push(`ky-luc-${c.id}-the-bat-dau-${sz}.jpg`);
      // bắt đầu ván rồi kết thúc với điểm cho trước
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Bắt đầu/.test(b.innerText.trim()))?.click());
      await page.waitForFunction(() => typeof window.__miniFinish === 'function', { timeout: 60000 });
      await sleep(500);
      await page.evaluate((s) => window.__miniFinish(s), c.finish);
      await page.waitForSelector('[data-testid="diem"]', { timeout: 30000 });
      await sleep(400);
      const res = await page.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' '), newBest: /Kỷ lục mới!/.test(document.body.innerText), cu: document.querySelector('[data-testid="ky-luc-cu-ket-qua"]')?.innerText.replace(/\s+/g, ' ') ?? null }));
      const newBest = c.finish > c.best;
      check(sz, c.label, `kết quả (điểm ${c.finish}): ${newBest ? '"Kỷ lục mới!"' : 'không "Kỷ lục mới!"'}`, res.newBest === newBest, res.text.slice(0, 160));
      if (c.best > 355) check(sz, c.label, 'kết quả: điểm cao nhất cũ vẫn hiện kèm "Kỷ lục từ phiên bản trước"', !!res.cu && /480/.test(res.cu) && /Kỷ lục từ phiên bản trước/.test(res.cu), String(res.cu));
      else check(sz, c.label, 'kết quả: không có chú thích kỷ lục cũ', res.cu === null && !/Kỷ lục từ phiên bản trước/.test(res.text), String(res.cu));
      buf = await page.screenshot({ type: 'jpeg', quality: 60 });
      if (write) writeFileSync(`${OUT}/ky-luc-${c.id}-ket-qua-${sz}.jpg`, buf);
      shots.push(`ky-luc-${c.id}-ket-qua-${sz}.jpg`);
      // thành tích đã lưu không bị đổi/hạ: điểm cao nhất = lớn hơn, huy chương không giảm
      await sleep(2500);
      const ck = await readCookie(page);
      const row = ck?.lv?.['3'];
      const expectBest = Math.max(c.best, c.finish);
      check(sz, c.label, `đã lưu: điểm cao nhất ${expectBest}, huy chương không hạ (mốc ≥ ${c.lv3 ? c.lv3[2] : 0})`, row && row[3] === expectBest && row[2] >= (c.lv3 ? c.lv3[2] : 0), JSON.stringify(row));
      check(sz, c.label, 'không lỗi trang', errors.length === 0, errors.join(' | '));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
if (write) writeFileSync(`${OUT}/ket-qua-ky-luc.json`, JSON.stringify({ results, shots }, null, 1));
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `LỖI ${bad.length}/${results.length}` : `Tất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
