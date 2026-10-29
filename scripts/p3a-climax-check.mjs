// P3a (hoàn thiện): luồng trao Trang Sổ Vàng và cao trào khi các làng vào độc lập. Bước HOÀN THÀNH màn và bước MỞ cao trào đều qua thao tác DOM thật
// (chuột/chạm/phím) trên BẢN BUILD CÓ CẦU NỐI ĐO; chỉ tiến độ đầu vào được chuẩn bị bằng cookie khách đúng định dạng của ứng dụng để giảm thời gian.
//
// Chuẩn bị (CLAUDE.md mục 9): tắt server nền sau khi đo.
//   pnpm dev:assets &
//   (cd apps/hub && VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe && npx vite preview --outDir dist-probe --port 5190 --strictPort) &
// Chạy: node scripts/p3a-climax-check.mjs [--size=0,1,2] [--no-write] [--v] [--only=A,B,C]
//   A: chơi đúng thứ tự (màn 12 cuối); B: màn 12 xong trước, làm nốt làng Dệt (màn 6), xem cao trào từ màn kết quả; C: như B nhưng xem từ bảng Làng Bạc sau khi tải lại;
//   D: nhiều trang tới cùng lúc (2, 3, 4): vào làng Dệt và Khắc Dấu ở thế giới, mỗi cảnh trao trang chiếu đúng một lần.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5190';
const OUT = 'docs/screenshots/p3a';
const flag = (n) => process.argv.includes(`--${n}`);
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const only = arg('only', 'A,B,C,D').split(',');
const write = !flag('no-write');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (write) mkdirSync(OUT, { recursive: true });

const results = [];
const shots = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ size: ctx.size.name, area, name, ok: Boolean(ok), detail });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${ctx.size.name}] ${area}: ${name}${detail ? ` — ${detail}` : ''}`);
};

const lesson = [1, 1, 3, 3, 3];
const game = [1, 1, 3, 100];
const levelsDone = (ids) => Object.fromEntries(ids.map((id) => [String(id), [1, 4, 7, 10].includes(id) ? lesson : game]));
const ALL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// gt 4095: đã nghe lời giới thiệu 12 màn, CHƯA chiếu cao trào (bit 12). vs: đã xem cảnh mở đầu cả 4 làng. gs: bit đã chiếu cảnh trao trang của từng làng.
const cookieOf = ({ lv = {}, gp = 0, gs = 0 } = {}) => ({ v: 1, lv, gp, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 4095, hd: 2147483647, vs: 15, vi: 15, ...(gs ? { gs } : {}) });
const CLIMAX_BIT = 1 << 12;

async function newCtx(browser, size, progress) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errors.push(`${e.message.slice(0, 120)} @${(e.stack ?? '').split('\n').slice(1, 3).join(' ').slice(0, 200)} url=${page.url().replace(BASE, '')}`));
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', (ev) => { const c = ev.error?.cause; if (c) (window.__causes ??= []).push(String(c.stack ?? c.message ?? c).slice(0, 600)); });
    Element.prototype.requestPointerLock = function () {
      Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true });
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  });
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.goto(BASE);
  await page.evaluate((p) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
  }, progress);
  return { page, size, errors, touch: size.touch };
}

async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 60 });
  if (buf.length >= 300000) throw new Error(`${name} lớn hơn 300 KB`);
  const file = `${name}-${ctx.size.name}.jpg`;
  if (write) writeFileSync(`${OUT}/${file}`, buf);
  shots.push({ file, bytes: buf.length });
}

async function tap(ctx, handle) {
  await handle.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  const b = await handle.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  if (ctx.touch) await ctx.page.touchscreen.tap(x, y);
  else await ctx.page.mouse.click(x, y);
}
const byText = (ctx, re, root = 'button') => ctx.page.evaluateHandle((src, flags, sel) => [...document.querySelectorAll(sel)].find((b) => new RegExp(src, flags).test(b.innerText.trim()) && b.offsetParent !== null) ?? null, re.source, re.flags, root);
const tapText = async (ctx, re) => {
  const h = (await byText(ctx, re)).asElement();
  if (!h) throw new Error(`Không thấy nút ${re}`);
  await tap(ctx, h);
};
const has = (ctx, re) => byText(ctx, re).then((h) => Boolean(h.asElement()));
const waitFor = (ctx, fn, timeout = 30000, ...a) => ctx.page.waitForFunction(fn, { timeout, polling: 300 }, ...a);
const cookieNow = (ctx) => ctx.page.evaluate(() => {
  const m = document.cookie.match(/sc_guest=([^;]+)/);
  return m ? JSON.parse(decodeURIComponent(m[1])) : null;
});
const bodyText = (ctx) => ctx.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

// ---------- chơi thật ----------
/** Màn 6 (diều, Làng Dệt): vào màn, bắt đầu, chạm một lần rồi để diều rơi cho tới hết tim; xem kết quả. Dừng ở màn kết quả. */
async function playKite(ctx) {
  // Màn 6 chỉ chơi khung ngang (khung dọc nhắc "Xoay ngang để chơi"): điện thoại dọc thì em xoay ngang máy lúc chơi (giả lập bằng đổi chiều khung), chơi xong xoay lại
  const portrait = ctx.size.w < ctx.size.h;
  if (portrait) await ctx.page.setViewport({ width: ctx.size.h, height: ctx.size.w, hasTouch: ctx.size.touch, isMobile: ctx.size.touch, deviceScaleFactor: 1 });
  await ctx.page.goto(`${BASE}/lang/lang-det/man/6`, { waitUntil: 'networkidle0' });
  await tapText(ctx, /^Bắt đầu/);
  await waitFor(ctx, () => window.__kiteUi?.ready, 90000);
  await sleep(1500);
  await tap(ctx, await ctx.page.$('[data-testid="man6-khung"]'));
  await waitFor(ctx, () => window.__kite?.phase === 'ended' || [...document.querySelectorAll('button')].some((b) => /^Xem kết quả/.test(b.innerText)), 180000);
  await sleep(500);
  await tapText(ctx, /^Xem kết quả/);
  await waitFor(ctx, () => [...document.querySelectorAll('button')].some((b) => /^Chơi lại/.test(b.innerText)), 20000);
  if (portrait) {
    await ctx.page.setViewport({ width: ctx.size.w, height: ctx.size.h, hasTouch: ctx.size.touch, isMobile: ctx.size.touch, deviceScaleFactor: 1 });
    await sleep(800);
  }
}

/** Màn 12 (leo cây): vào màn, bắt đầu, nhảy bằng phím cách (hay chạm) và bấm các nút trong hộp thoại của game cho tới khi game kết thúc (hết tim: Bi giúp). Dừng ngay khi có cảnh cuối hay màn kết quả. */
async function playClimb(ctx) {
  await ctx.page.goto(`${BASE}/lang/lang-bac/man/12`, { waitUntil: 'networkidle0' });
  await tapText(ctx, /^Bắt đầu/);
  await waitFor(ctx, () => window.__climbUi?.ready, 90000);
  await sleep(1200);
  for (let i = 0; i < 400; i++) {
    const done = await ctx.page.evaluate(() => Boolean(document.querySelector('[data-testid="man-cuoi"]')) || [...document.querySelectorAll('button')].some((b) => /^Chơi lại/.test(b.innerText)));
    if (done) return;
    const btn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('[role="dialog"] button, [role="status"] button')].find((b) => b.offsetParent !== null) ?? null);
    if (btn.asElement()) await tap(ctx, btn.asElement());
    else if (ctx.touch) await tap(ctx, await ctx.page.$('[data-testid="man12-khung"]'));
    else await ctx.page.keyboard.press('Space');
    await sleep(650);
  }
  throw new Error('Màn 12 không kết thúc');
}

/** Lật qua các bước cao trào bằng nút "Tiếp"/nút cuối (không bấm "Bỏ qua"); ghi lại chữ từng lượt và bước. Trả về khi cảnh đóng. */
async function runClimax(ctx, { stop = null } = {}) {
  const seenSteps = [];
  const texts = [];
  for (let i = 0; i < 80; i++) {
    const info = await ctx.page.evaluate(() => {
      const root = document.querySelector('[data-testid="man-cuoi"]');
      if (!root) return null;
      // cảnh 3D (bước b, d) có data-step; ảnh truyện (bước a, c) là hộp thoại kiểu truyện: đánh dấu "s"
      const step = root.querySelector('[data-step]')?.getAttribute('data-step') ?? 's';
      return { step, text: root.innerText.replace(/\s+/g, ' ') };
    });
    if (!info) return { steps: seenSteps, texts, closed: true };
    if (seenSteps[seenSteps.length - 1] !== info.step) seenSteps.push(info.step);
    texts.push(info.text);
    if (stop && stop(info, seenSteps)) return { steps: seenSteps, texts, closed: false };
    const next = (await byText(ctx, /^(Tiếp|Xem kết quả|Xong)/, '[data-testid="man-cuoi"] button')).asElement();
    if (next) await tap(ctx, next);
    await sleep(700);
  }
  throw new Error('Cao trào không kết thúc');
}

const lv12 = (c) => JSON.stringify(c?.lv?.['12'] ?? null);
const FOUR = /Đủ 4 trang|đủ 4 Trang Sổ Vàng|Trang Sổ Vàng thứ tư/;

async function scenarioA(browser, size) {
  // A. Chơi đúng thứ tự: 11 màn đầu xong, 3 trang; màn 12 là màn cuối
  let ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), gp: 3, gs: 7 }));
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await pickBac(ctx);
  check(ctx, 'A thứ tự thường', 'trước màn 12: bảng Làng Bạc chưa có nút xem cảnh cuối (mới 3 trang)', !(await ctx.page.$('[data-testid="xem-canh-cuoi"]')));
  await playClimb(ctx);
  const finaleAuto = await ctx.page.evaluate(() => Boolean(document.querySelector('[data-testid="man-cuoi"]')));
  const resultShown = await has(ctx, /^Chơi lại/);
  check(ctx, 'A thứ tự thường', 'xong màn 12 theo thứ tự thường: cao trào tự chiếu sau ván, chưa hiện màn kết quả cùng lúc (không chồng)', finaleAuto && !resultShown);
  await shot(ctx, 'cao-trao-tu-chieu');
  const r = await runClimax(ctx);
  check(ctx, 'A thứ tự thường', `đủ 4 bước (truyện a, cảnh b, truyện c, cảnh d trao trang) theo thứ tự: ${r.steps.join('')}`, r.steps.join('') === 'sbsd', r.steps.join(','));
  check(ctx, 'A thứ tự thường', 'bước trao trang nói "đủ 4 trang" (đã đủ thật)', r.texts.some((t) => FOUR.test(t)));
  await waitFor(ctx, () => [...document.querySelectorAll('button')].some((b) => /^Chơi lại/.test(b.innerText)), 20000);
  check(ctx, 'A thứ tự thường', 'hết cảnh thì sang màn kết quả, có nút "Xem lại cảnh cuối"', await has(ctx, /^Xem lại cảnh cuối/));
  await shot(ctx, 'ket-qua-man-12');
  const ck = await cookieNow(ctx);
  check(ctx, 'A thứ tự thường', 'tiến độ: đủ 4 trang, cờ đã chiếu cao trào, màn 12 đã ghi', ck.gp === 4 && (ck.gt & CLIMAX_BIT) !== 0 && ck.lv['12']?.[0] === 1, JSON.stringify({ gp: ck.gp, gt: ck.gt }));
  // xem lại: không ghi gì thêm
  await tapText(ctx, /^Xem lại cảnh cuối/);
  await waitFor(ctx, () => document.querySelector('[data-testid="man-cuoi"]'), 10000);
  await runClimax(ctx);
  await waitFor(ctx, () => [...document.querySelectorAll('button')].some((b) => /^Chơi lại/.test(b.innerText)), 20000);
  const ck2 = await cookieNow(ctx);
  check(ctx, 'A thứ tự thường', 'xem lại không ghi thêm gì: vẫn gp=4, cờ đã chiếu, không đổi số trang', ck2.gp === 4 && (ck2.gt & CLIMAX_BIT) !== 0);
  // ban-do sau đó: nút xem lại, không còn lời "đang chờ"
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await pickBac(ctx);
  const t = await bodyText(ctx);
  check(ctx, 'A thứ tự thường', 'bảng Làng Bạc: có "Xem lại cảnh cuối", không còn lời cảnh đang chờ', (await has(ctx, /^Xem lại cảnh cuối/)) && !/đang chờ em/.test(t));
  if (ctx.errors.length) check(ctx, 'A thứ tự thường', 'không lỗi trang', false, ctx.errors.join(' | '));
  await ctx.page.close();

  // A2. Tải lại giữa cảnh: trang đã đủ, cờ chưa ghi: cảnh vẫn đang chờ, xem được từ bảng Làng Bạc
  ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), gp: 3, gs: 7 }));
  await playClimb(ctx);
  await runClimax(ctx, { stop: (_i, steps) => steps.includes('b') });
  await ctx.page.reload({ waitUntil: 'networkidle0' });
  const ckm = await cookieNow(ctx);
  check(ctx, 'A thứ tự thường', 'tải lại giữa cảnh: trang 4 và kết quả màn 12 vẫn còn, cờ đã chiếu CHƯA ghi', ckm.gp === 4 && (ckm.gt & CLIMAX_BIT) === 0 && ckm.lv['12']?.[0] === 1, JSON.stringify({ gp: ckm.gp, gt: ckm.gt }));
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await pickBac(ctx);
  check(ctx, 'A thứ tự thường', 'sau khi tải lại: bảng Làng Bạc có "Xem cảnh cuối" (đang chờ), không bắt chơi lại màn 12', (await has(ctx, /^Xem cảnh cuối/)) && /không cần chơi lại màn 12/.test(await bodyText(ctx)));
  await tapText(ctx, /^Xem cảnh cuối/);
  await waitFor(ctx, () => document.querySelector('[data-testid="man-cuoi"]'), 20000);
  const url = ctx.page.url();
  const r2 = await runClimax(ctx);
  await waitFor(ctx, () => location.pathname === '/ban-do', 20000);
  check(ctx, 'A thứ tự thường', `xem tiếp từ nút (${url.replace(BASE, '')}): đủ bước, hết cảnh về bản đồ`, r2.steps.join('') === 'sbsd' && ctx.page.url().includes('/ban-do'), r2.steps.join(','));
  const ck3 = await cookieNow(ctx);
  check(ctx, 'A thứ tự thường', 'hết cảnh ghi cờ đã chiếu đúng một lần; số trang vẫn 4', ck3.gp === 4 && (ck3.gt & CLIMAX_BIT) !== 0);
  await ctx.page.close();
}

const pickBac = async (ctx) => {
  await ctx.page.waitForSelector('button[data-village="lang-bac"]', { timeout: 20000 });
  await tap(ctx, await ctx.page.$('button[data-village="lang-bac"]'));
  await waitFor(ctx, () => document.querySelector('[data-testid="ban-do-bang-lang"]')?.dataset.village === 'lang-bac' || [...document.querySelectorAll('button')].some((b) => /^Bỏ qua/.test(b.innerText.trim())), 15000);
  if (await has(ctx, /^Bỏ qua/)) await tapText(ctx, /^Bỏ qua/);
  await waitFor(ctx, () => document.querySelector('[data-testid="ban-do-bang-lang"]')?.dataset.village === 'lang-bac', 15000);
  await sleep(400);
};

// B và C: màn 12 xong trước; làng Dệt còn thiếu màn 6
const PRE_B = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
async function scenarioBC(browser, size, mode) {
  const tag = mode === 'B' ? 'B xem từ kết quả' : 'C xem từ bản đồ sau tải lại';
  const ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone(PRE_B), gp: 1, gs: 1 }));
  const before = await cookieNow(ctx);
  // trước khi đủ điều kiện
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await pickBac(ctx);
  check(ctx, tag, 'màn 12 đã xong nhưng mới 1 trang: bảng Làng Bạc chưa có nút xem cảnh cuối', !(await ctx.page.$('[data-testid="xem-canh-cuoi"]')));
  await ctx.page.goto(`${BASE}/lang/lang-bac/man/12?canh=cuoi`, { waitUntil: 'networkidle0' });
  await sleep(800);
  const early = await ctx.page.evaluate(() => ({ finale: Boolean(document.querySelector('[data-testid="man-cuoi"]')), text: document.body.innerText.replace(/\s+/g, ' ') }));
  check(ctx, tag, 'mở thẳng /man/12?canh=cuoi khi chưa đủ 4 trang: không chiếu cảnh, không nói "đủ 4 trang" (hiện thẻ bắt đầu màn 12)', !early.finale && !FOUR.test(early.text) && /Bắt đầu/.test(early.text));
  // hoàn thành làng còn thiếu bằng cách chơi thật màn 6
  await playKite(ctx);
  const resText = await bodyText(ctx);
  const ck = await cookieNow(ctx);
  check(ctx, tag, 'xong màn 6 (thật): các trang 2, 3, 4 tới cùng lúc, tổng 4 trang; kết quả màn 12 giữ nguyên, không chơi lại', ck.gp === 4 && lv12(ck) === lv12(before) && ck.lv['6']?.[0] === 1, JSON.stringify({ gp: ck.gp, l12: lv12(ck) }));
  check(ctx, tag, 'màn kết quả của màn 6 có lời báo cảnh cuối đang chờ và nút "Xem cảnh cuối", không có hộp thoại nào chồng lên', (await ctx.page.$('[data-testid="xem-canh-cuoi"]')) !== null && /không cần chơi lại màn 12/.test(resText) && !(await ctx.page.$('[data-testid="man-cuoi"]')));
  await shot(ctx, mode === 'B' ? 'ket-qua-man-6-canh-cuoi-cho' : 'ket-qua-man-6');
  if (mode === 'C') {
    // C: tải lại rồi xem từ bảng Làng Bạc
    await ctx.page.reload({ waitUntil: 'networkidle0' });
    const ckr = await cookieNow(ctx);
    check(ctx, tag, 'tải lại trang sau màn kết quả: tiến độ còn nguyên (4 trang, màn 6 xong, màn 12 giữ nguyên)', ckr.gp === 4 && ckr.lv['6']?.[0] === 1 && lv12(ckr) === lv12(before));
    await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
    await pickBac(ctx);
    check(ctx, tag, 'bảng Làng Bạc có "Xem cảnh cuối" (đang chờ), không có nút nào bắt chơi lại màn 12', (await has(ctx, /^Xem cảnh cuối/)) && /không cần chơi lại màn 12/.test(await bodyText(ctx)));
    await shot(ctx, 'ban-do-bac-canh-cuoi-cho');
    await tapText(ctx, /^Xem cảnh cuối/);
  } else {
    await tapText(ctx, /^Xem cảnh cuối/);
  }
  await waitFor(ctx, () => document.querySelector('[data-testid="man-cuoi"]'), 30000);
  const startedAt = ctx.page.url();
  await shot(ctx, mode === 'B' ? 'cao-trao-tu-ket-qua' : 'cao-trao-tu-ban-do');
  const r = await runClimax(ctx);
  await waitFor(ctx, () => location.pathname === '/ban-do', 20000);
  check(ctx, tag, `xem cao trào mà không chơi lại màn 12 (${startedAt.replace(BASE, '')}): đủ 4 bước`, r.steps.join('') === 'sbsd', r.steps.join(','));
  check(ctx, tag, 'lúc này mới nói "đủ 4 trang" (bước trao trang)', r.texts.some((t) => FOUR.test(t)));
  const done = await cookieNow(ctx);
  check(ctx, tag, 'hết cảnh: cờ đã chiếu được ghi, số trang vẫn 4, kết quả màn 12 giữ nguyên (không chơi lại)', done.gp === 4 && (done.gt & CLIMAX_BIT) !== 0 && lv12(done) === lv12(before));
  check(ctx, tag, 'hết cảnh quay về bản đồ', ctx.page.url().includes('/ban-do'));
  await pickBac(ctx);
  const after = await bodyText(ctx);
  check(ctx, tag, 'bảng Làng Bạc đổi thành "Xem lại cảnh cuối" (hết chờ)', (await has(ctx, /^Xem lại cảnh cuối/)) && !/đang chờ em/.test(after));
  // xem lại không ghi, không trao thêm
  await tapText(ctx, /^Xem lại cảnh cuối/);
  await waitFor(ctx, () => document.querySelector('[data-testid="man-cuoi"]'), 20000);
  await runClimax(ctx);
  await waitFor(ctx, () => location.pathname === '/ban-do', 20000);
  const again = await cookieNow(ctx);
  check(ctx, tag, 'xem lại không ghi thêm gì (cùng cờ, cùng số trang)', again.gp === 4 && again.gt === done.gt);
  if (ctx.errors.length) check(ctx, tag, 'không lỗi trang', false, ctx.errors.join(' | ') + ' CAUSE=' + JSON.stringify(await ctx.page.evaluate(() => window.__causes ?? null)));
  await ctx.page.close();
}

// D: nhiều trang tới cùng lúc: cảnh trao trang của từng làng chiếu đúng một lần, không chồng, không mất trang
async function scenarioD(browser, size) {
  const ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone(PRE_B), gp: 1, gs: 1 }));
  await playKite(ctx); // các trang 2, 3, 4 tới cùng lúc
  const ck = await cookieNow(ctx);
  check(ctx, 'D nhiều trang cùng lúc', 'sau màn 6: gp nhảy 1 → 4, cờ cảnh trao trang của Dệt và Khắc Dấu chưa ghi', ck.gp === 4 && ((ck.gs ?? 0) & 0b110) === 0, JSON.stringify({ gp: ck.gp, gs: ck.gs }));
  const seen = [];
  for (const id of ['lang-det', 'lang-khac-dau']) {
    await ctx.page.goto(`${BASE}/cho?q=low&warmup=off&tu=${id}`, { waitUntil: 'domcontentloaded' });
    await waitFor(ctx, () => window.__walkPlayer && window.__world && document.querySelector('[data-testid="ban-do-nho"]'), 120000);
    // một hộp thoại trao trang duy nhất: ghi lại số hộp thoại và hàng 4 ô trang
    let first = null;
    for (let i = 0; i < 60 && !first; i++) {
      await sleep(1000);
      first = await ctx.page.evaluate(() => {
        // mỗi hộp thoại kiểu truyện có đúng một nút "Bỏ qua": đếm số hộp đang mở
        const d = [...document.querySelectorAll('button')].filter((b) => /^Bỏ qua/.test(b.innerText.trim()) && b.offsetParent !== null);
        return d.length ? { dialogs: d.length, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) } : null;
      });
    }
    check(ctx, 'D nhiều trang cùng lúc', `${id}: vào làng thì có đúng 1 hộp thoại trao trang (không chồng)`, first && first.dialogs === 1, JSON.stringify(first)?.slice(0, 160));
    if (id === 'lang-det') await shot(ctx, 'trao-trang-lang-det');
    for (let i = 0; i < 10; i++) {
      const more = (await byText(ctx, /^(Tiếp|Xong|Đóng)/)).asElement();
      if (!more) break;
      await tap(ctx, more);
      await sleep(600);
    }
    await sleep(1500);
    seen.push(id);
  }
  const mid = await cookieNow(ctx);
  check(ctx, 'D nhiều trang cùng lúc', 'sau khi xem: cờ trao trang của Dệt và Khắc Dấu được ghi, số trang vẫn 4 (không mất, không thêm)', mid.gp === 4 && (mid.gs & 0b110) === 0b110, JSON.stringify({ gp: mid.gp, gs: mid.gs }));
  // tải lại: không chiếu lại
  await ctx.page.goto(`${BASE}/cho?q=low&warmup=off&tu=lang-det`, { waitUntil: 'domcontentloaded' });
  await waitFor(ctx, () => window.__walkPlayer && window.__world && document.querySelector('[data-testid="ban-do-nho"]'), 120000);
  await sleep(8000);
  const reshown = await ctx.page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /^Bỏ qua/.test(b.innerText.trim()) && b.offsetParent !== null).length);
  check(ctx, 'D nhiều trang cùng lúc', 'tải lại rồi vào lại làng Dệt: cảnh trao trang không chiếu lại', reshown === 0);
  // dòng nhiệm vụ nhắc cảnh cuối đang chờ (ở chợ, ngoài làng)
  await ctx.page.goto(`${BASE}/cho?q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
  await waitFor(ctx, () => window.__walkPlayer && window.__world && document.querySelector('[data-testid="ban-do-nho"]'), 120000);
  await sleep(3000);
  const q = await ctx.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  check(ctx, 'D nhiều trang cùng lúc', 'thế giới, ở chợ: dòng nhiệm vụ nhắc "Cảnh cuối đang chờ em" (đủ 4 trang, màn 12 xong, chưa xem)', /Cảnh cuối đang chờ em/.test(q), q.slice(q.indexOf('Nhiệm vụ'), q.indexOf('Nhiệm vụ') + 120));
  await shot(ctx, 'the-gioi-canh-cuoi-cho');
  if (ctx.errors.length) check(ctx, 'D nhiều trang cùng lúc', 'không lỗi trang', false, ctx.errors.join(' | '));
  await ctx.page.close();
}

const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    const before = results.length;
    for (const [key, fn] of [['A', () => scenarioA(browser, size)], ['B', () => scenarioBC(browser, size, 'B')], ['C', () => scenarioBC(browser, size, 'C')], ['D', () => scenarioD(browser, size)]]) {
      if (!only.includes(key)) continue;
      try {
        await fn();
      } catch (e) {
        results.push({ size: size.name, area: `lỗi chạy ${key}`, name: e.message, ok: false, detail: '' });
        console.log(`✗ ${size.name} ${key}: ${e.message}`);
      }
    }
    const mine = results.slice(before);
    console.log(`${mine.every((r) => r.ok) ? '✓' : '✗'} ${size.name}: ${mine.filter((r) => r.ok).length}/${mine.length}`);
  }
} finally {
  await browser.close();
}
if (write) {
  writeFileSync(`${OUT}/ket-qua-cao-trao${arg('suffix', '')}.json`, JSON.stringify(results, null, 1));
  writeFileSync(`${OUT}/anh-cao-trao${arg('suffix', '')}.json`, JSON.stringify(shots, null, 1));
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
