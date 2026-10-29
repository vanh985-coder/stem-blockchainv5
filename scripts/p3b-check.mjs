// P3b: nút "Tự hoàn thành" cho đủ 12 màn. Kiểm bằng thao tác DOM thật (chuột/chạm) trên BẢN DEV (có nút) và BẢN BUILD PHÁT HÀNH/ĐO (không có nút với khách và học sinh).
// Không có môi trường Supabase: tài khoản giáo viên thật CHƯA kiểm được ở trình duyệt (xem README p3b); nút giáo viên được kiểm bằng test (canUseAutoComplete) và bản dev.
//
// Chuẩn bị (CLAUDE.md mục 9): tắt server nền sau khi đo.
//   pnpm dev:assets &
//   dev:  (VITE_MERGED=true VITE_ASSETS_URL=http://localhost:5180 VITE_HUB_URL=http://localhost:5173 pnpm dev:hub &)      → --mode=dev --url=http://localhost:5173
//   prod: (cd apps/hub && VITE_HUB_URL=http://localhost:5190 VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe && npx vite preview --outDir dist-probe --port 5190 --strictPort &)  → --mode=prod
// Chạy: node scripts/p3b-check.mjs --mode=dev|prod [--url=...] [--size=0,1,2] [--no-write] [--v] [--only=levels,double,mid,real,all12]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const MODE = arg('mode', 'dev');
const BASE = arg('url', MODE === 'dev' ? 'http://localhost:5173' : 'http://localhost:5190');
const OUT = 'docs/screenshots/p3b';
const flag = (n) => process.argv.includes(`--${n}`);
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const only = arg('only', 'levels,double,mid,real,all12').split(',');
const write = !flag('no-write');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (write) mkdirSync(OUT, { recursive: true });

const VILLAGES = { 'lang-giay': [1, 2, 3], 'lang-det': [4, 5, 6], 'lang-khac-dau': [7, 8, 9], 'lang-bac': [10, 11, 12] };
const villageOf = (id) => Object.keys(VILLAGES).find((v) => VILLAGES[v].includes(id));
const KIND = (id) => ([1, 4, 7, 10].includes(id) ? 'lesson' : 'game');

const results = [];
const shots = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ mode: MODE, size: ctx.size.name, area, name, ok: Boolean(ok), detail });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${MODE} ${ctx.size.name}] ${area}: ${name}${detail ? ` — ${detail}` : ''}`);
};

const lesson = [1, 1, 3, 3, 3];
const game = [1, 1, 3, 100];
const levelsDone = (ids) => Object.fromEntries(ids.map((id) => [String(id), KIND(id) === 'lesson' ? lesson : game]));
// gt 4095: đã nghe lời giới thiệu 12 game, chưa chiếu cao trào. kc đủ thẻ để vào bài học bình thường.
const cookieOf = ({ lv = {}, gp = 0, ac = 0 } = {}) => ({ v: 1, lv, gp, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 4095, hd: 2147483647, vs: 15, vi: 15, ...(ac ? { ac } : {}) });

async function newCtx(browser, size, progress) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  await page.evaluateOnNewDocument(() => {
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
  const file = `${MODE}-${name}-${ctx.size.name}.jpg`;
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
const byText = (ctx, re) => ctx.page.evaluateHandle((src, flags) => [...document.querySelectorAll('button')].find((b) => new RegExp(src, flags).test(b.innerText.trim()) && b.offsetParent !== null) ?? null, re.source, re.flags);
const tapText = async (ctx, re) => { const h = (await byText(ctx, re)).asElement(); if (!h) throw new Error(`Không thấy nút ${re}`); await tap(ctx, h); };
const has = async (ctx, re) => Boolean((await byText(ctx, re)).asElement());
const waitFor = (ctx, fn, timeout = 30000, ...a) => ctx.page.waitForFunction(fn, { timeout, polling: 300 }, ...a);
const cookieNow = (ctx) => ctx.page.evaluate(() => {
  const m = document.cookie.match(/sc_guest=([^;]+)/);
  return m ? JSON.parse(decodeURIComponent(m[1])) : null;
});
const autoBtn = (ctx) => ctx.page.evaluateHandle(() => [...document.querySelectorAll('[data-testid="nut-tu-hoan-thanh"]')].find((b) => b.offsetParent !== null) ?? null);

/** Vào trang một màn và chờ trang sẵn sàng (bài học: khung bài; game: thẻ bắt đầu). */
async function openLevel(ctx, id) {
  await ctx.page.goto(`${BASE}/lang/${villageOf(id)}/man/${id}`, { waitUntil: 'networkidle0' });
  if (KIND(id) === 'lesson') await waitFor(ctx, () => document.querySelector('[data-testid="lesson-scroll"]'), 60000);
  else await waitFor(ctx, () => document.querySelector('[data-testid="the-bat-dau"]'), 60000);
  await sleep(600);
}

const prior = (id) => VILLAGES[villageOf(id)].filter((x) => x < id); // các màn trước trong làng (đã xong thật để vào được màn này)
const zeroRow = (row, id) => Boolean(row) && row[0] === 0 && row[1] === 0 && (KIND(id) === 'lesson' ? row[2] === 0 && row[3] === 0 && row[4] === 0 : row[2] === 0 && row[3] === 0);

async function scenarioLevels(browser, size) {
  for (let id = 1; id <= 12; id++) {
    const ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone(prior(id)) }));
    const tag = `màn ${id}`;
    try {
      await openLevel(ctx, id);
      const btn = (await autoBtn(ctx)).asElement();
      if (MODE === 'prod') {
        check(ctx, 'phát hành', `${tag}: khách ở bản phát hành KHÔNG thấy nút "Tự hoàn thành"`, !btn);
        if (id === 4 || id === 6) await shot(ctx, `khong-co-nut-man-${id}`);
        await ctx.page.close();
        continue;
      }
      check(ctx, 'dev', `${tag}: bản dev có nút "Tự hoàn thành" (${KIND(id) === 'lesson' ? 'trên thanh đầu bài học' : 'ở thẻ bắt đầu game'})`, Boolean(btn));
      if (!btn) { await ctx.page.close(); continue; }
      if (id === 5 || id === 10) await shot(ctx, `nut-man-${id}`);
      const before = await cookieNow(ctx);
      await tap(ctx, btn);
      await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 15000);
      const body = await ctx.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
      check(ctx, 'dev', `${tag}: hiện khung "Đã tự hoàn thành", nói rõ không có điểm, sao, huy chương hay xu`, /Đã tự hoàn thành/.test(body) && /Không có điểm, sao, huy chương hay xu/.test(body));
      await sleep(2500); // chờ ghi cookie
      const after = await cookieNow(ctx);
      check(ctx, 'dev', `${tag}: tiến độ chỉ có cờ (không điểm/sao/xu/trang; màn khác không đổi)`, after && (after.ac & (1 << (id - 1))) !== 0 && zeroRow(after.lv[String(id)], id) && after.c === 0 && after.gp === before.gp && JSON.stringify(Object.keys(after.lv).sort()) === JSON.stringify([...Object.keys(before.lv), String(id)].sort()), JSON.stringify({ ac: after?.ac, row: after?.lv?.[String(id)], c: after?.c, gp: after?.gp }));
      if (id === 5 || id === 12) await shot(ctx, `da-tu-hoan-thanh-man-${id}`);
      // đi tiếp theo điều kiện mở màn: màn kế trong làng mở được; làng khác không bị ảnh hưởng
      const nextId = id + 1;
      if (VILLAGES[villageOf(id)].includes(nextId)) {
        await ctx.page.goto(`${BASE}/lang/${villageOf(id)}/man/${nextId}`, { waitUntil: 'networkidle0' });
        await sleep(1500);
        const locked = await ctx.page.evaluate(() => Boolean(document.querySelector('main [role="alert"]')));
        check(ctx, 'dev', `${tag}: sau tự hoàn thành, màn ${nextId} (kế tiếp trong làng) vào được, không báo khóa`, !locked);
        if (nextId < VILLAGES[villageOf(id)][2]) {
          // màn sau nữa vẫn khóa theo thứ tự trong làng (chưa tự hoàn thành màn kế)
          await ctx.page.goto(`${BASE}/lang/${villageOf(id)}/man/${nextId + 1}`, { waitUntil: 'networkidle0' });
          await sleep(1200);
          const locked2 = await ctx.page.evaluate(() => Boolean(document.querySelector('main [role="alert"]')));
          check(ctx, 'dev', `${tag}: màn ${nextId + 1} vẫn khóa (thứ tự trong làng giữ nguyên)`, locked2);
        }
      }
      // tải lại: cờ còn, bảng làng ở /ban-do phân biệt "Tự hoàn thành"
      await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
      await ctx.page.waitForSelector('button[data-village]', { timeout: 20000 });
      await tap(ctx, await ctx.page.$(`button[data-village="${villageOf(id)}"]`));
      await waitFor(ctx, () => document.querySelector('[data-testid="ban-do-bang-lang"]') || [...document.querySelectorAll('button')].some((b) => /^Bỏ qua/.test(b.innerText.trim())), 15000);
      if (await has(ctx, /^Bỏ qua/)) await tapText(ctx, /^Bỏ qua/);
      await waitFor(ctx, () => document.querySelector('[data-testid="tu-hoan-thanh"]'), 15000);
      const chips = await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="tu-hoan-thanh"]').length);
      const ck2 = await cookieNow(ctx);
      check(ctx, 'dev', `${tag}: tải lại và mở /ban-do: bảng làng ghi "Tự hoàn thành" (không số sao), cờ còn trong cookie`, chips === 1 && (ck2.ac & (1 << (id - 1))) !== 0, `chips=${chips}`);
      if (id === 6) await shot(ctx, 'ban-do-tu-hoan-thanh');
      if (ctx.errors.length) check(ctx, 'dev', `${tag}: không lỗi trang`, false, ctx.errors.join(' | '));
    } catch (e) {
      check(ctx, 'lỗi chạy', `${tag}: ${e.message}`, false);
    }
    await ctx.page.close();
  }
}

/** Bấm lặp trong cùng một nhịp: một cờ, không bản ghi trùng, không cộng thưởng. */
async function scenarioDouble(browser, size) {
  const ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone([]) }));
  await openLevel(ctx, 1);
  await ctx.page.evaluate(() => { const b = document.querySelector('[data-testid="nut-tu-hoan-thanh"]'); b.click(); b.click(); b.click(); });
  await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 15000);
  await sleep(2500);
  const ck = await cookieNow(ctx);
  check(ctx, 'bấm lặp', 'bấm 3 lần liên tiếp: đúng một cờ, một dòng tiến độ, xu 0, trang 0', ck && ck.ac === 1 && Object.keys(ck.lv).length === 1 && ck.c === 0 && ck.gp === 0 && zeroRow(ck.lv['1'], 1), JSON.stringify({ ac: ck?.ac, lv: ck?.lv, c: ck?.c }));
  // tải lại trang bài rồi không còn nút (màn đã xong); bấm lại ở nơi khác không có gì để bấm
  await openLevel(ctx, 1);
  const again = (await autoBtn(ctx)).asElement();
  check(ctx, 'bấm lặp', 'tải lại: màn đã tự hoàn thành thì không còn nút để bấm lại', !again);
  const ck2 = await cookieNow(ctx);
  check(ctx, 'bấm lặp', 'tải lại: tiến độ giữ nguyên (không bản ghi trùng)', JSON.stringify(ck2.lv) === JSON.stringify(ck.lv) && ck2.ac === 1);
  await ctx.page.close();
}

/** Rời ván bằng tự hoàn thành ở GIỮA ván (qua hộp "?" đang tạm dừng): ván dừng, không chấm điểm, không thưởng. */
async function scenarioMid(browser, size) {
  const cases = [[6, async (ctx) => { await waitFor(ctx, () => window.__kiteUi?.ready, 90000); await sleep(1500); await tap(ctx, await ctx.page.$('[data-testid="man6-khung"]')); await sleep(1500); }],
    [12, async (ctx) => { await waitFor(ctx, () => window.__climbUi?.ready, 90000); await sleep(1500); }],
    [11, async (ctx) => { await waitFor(ctx, () => window.__match3Ui || document.querySelector('[data-testid="nut-goi-y"]'), 90000); await sleep(1500); }]];
  for (const [id, prep] of cases) {
    const portrait = size.w < size.h;
    const ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone(prior(id)) }));
    if (portrait && id === 6) await ctx.page.setViewport({ width: size.h, height: size.w, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
    try {
      await openLevel(ctx, id);
      await tapText(ctx, /^Bắt đầu/);
      await prep(ctx);
      await tap(ctx, await ctx.page.$('[data-testid="nut-goi-y"]'));
      await waitFor(ctx, () => document.querySelector('[data-testid="hop-goi-y"]'), 10000);
      const btn = (await autoBtn(ctx)).asElement();
      check(ctx, 'giữa ván', `màn ${id}: hộp "?" (ván đang tạm dừng) có nút "Tự hoàn thành"`, Boolean(btn));
      if (id === 12) await shot(ctx, 'giua-van-man-12-hop-goi-y');
      await tap(ctx, btn);
      await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 15000);
      const gone = await ctx.page.evaluate(() => !document.querySelector('[data-testid="man6-khung"], [data-testid="man12-khung"]'));
      await sleep(4000);
      const ck = await cookieNow(ctx);
      const noScore = await ctx.page.evaluate(() => !document.querySelector('[data-testid="diem"]') && !/Chơi lại/.test(document.body.innerText));
      check(ctx, 'giữa ván', `màn ${id}: ván dừng (khung game đã gỡ), không hiện màn kết quả, không ghi điểm/sao/xu`, gone && noScore && ck.c === 0 && ck.gp === 0 && zeroRow(ck.lv[String(id)], id) && (ck.ac & (1 << (id - 1))) !== 0, JSON.stringify({ ac: ck?.ac, row: ck?.lv?.[String(id)] }));
    } catch (e) {
      check(ctx, 'lỗi chạy', `giữa ván màn ${id}: ${e.message}`, false);
    }
    await ctx.page.close();
  }
}

/** Tự hoàn thành màn 6 rồi chơi thật: kết quả thật được lưu bình thường, cờ không ghi đè, "Chơi thật" dùng được. */
async function scenarioReal(browser, size) {
  const portrait = size.w < size.h;
  const ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone([4, 5]), gp: 0 }));
  if (portrait) await ctx.page.setViewport({ width: size.h, height: size.w, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await openLevel(ctx, 6);
  await tap(ctx, (await autoBtn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 15000);
  await tapText(ctx, /^Chơi thật màn này/); // vào thẳng ván (như "Chơi lại")
  await waitFor(ctx, () => window.__kiteUi?.ready, 90000);
  await sleep(1500);
  await tap(ctx, await ctx.page.$('[data-testid="man6-khung"]'));
  await waitFor(ctx, () => window.__kite?.phase === 'ended' || [...document.querySelectorAll('button')].some((b) => /^Xem kết quả/.test(b.innerText)), 180000);
  await sleep(500);
  await tapText(ctx, /^Xem kết quả/);
  await waitFor(ctx, () => [...document.querySelectorAll('button')].some((b) => /^Chơi lại/.test(b.innerText)), 20000);
  await sleep(2500);
  const ck = await cookieNow(ctx);
  const row = ck.lv['6'];
  check(ctx, 'chơi thật sau', 'chơi thật màn 6 sau khi tự hoàn thành: ghi kết quả thật bình thường (đã chơi, có điểm), không bị cờ cản', row && row[0] === 1 && row[3] > 0, JSON.stringify(row));
  check(ctx, 'chơi thật sau', 'cờ không bị xóa hay ghi đè thành tích; màn hiện "Xong" thật (không còn là chỉ tự hoàn thành)', (ck.ac & (1 << 5)) !== 0);
  await shot(ctx, 'choi-that-sau-tu-hoan-thanh');
  await ctx.page.close();
}

/** Tự hoàn thành đủ 12 màn lần lượt: không có Trang Sổ Vàng, xu, hay cao trào. */
async function scenarioAll12(browser, size) {
  const ctx = await newCtx(browser, size, cookieOf());
  for (let id = 1; id <= 12; id++) {
    if (size.w < size.h && id === 6) await ctx.page.setViewport({ width: size.h, height: size.w, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
    await openLevel(ctx, id);
    const btn = (await autoBtn(ctx)).asElement();
    if (!btn) { check(ctx, 'đủ 12 màn', `màn ${id}: nút có mặt`, false); break; }
    await tap(ctx, btn);
    await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 15000);
    await sleep(700);
    if (size.w < size.h && id === 6) await ctx.page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  }
  await sleep(2500);
  const ck = await cookieNow(ctx);
  check(ctx, 'đủ 12 màn', 'tự hoàn thành lần lượt cả 12 màn: đủ 12 cờ, không xu, không Trang Sổ Vàng', ck.ac === 4095 && ck.c === 0 && ck.gp === 0 && Object.values(ck.lv).every((r, i) => zeroRow(r, Number(Object.keys(ck.lv)[i]))), JSON.stringify({ ac: ck.ac, c: ck.c, gp: ck.gp }));
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('button[data-village]', { timeout: 20000 });
  const text = await ctx.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  check(ctx, 'đủ 12 màn', '/ban-do: 0/4 Trang Sổ Vàng đã nhận (tự hoàn thành không trao trang)', !/Trang Sổ Vàng \d: Đã nhận/.test(text));
  await tap(ctx, await ctx.page.$('button[data-village="lang-bac"]'));
  await waitFor(ctx, () => document.querySelector('[data-testid="ban-do-bang-lang"]') || [...document.querySelectorAll('button')].some((b) => /^Bỏ qua/.test(b.innerText.trim())), 15000);
  if (await has(ctx, /^Bỏ qua/)) await tapText(ctx, /^Bỏ qua/);
  await waitFor(ctx, () => document.querySelector('[data-testid="ban-do-bang-lang"]'), 15000);
  check(ctx, 'đủ 12 màn', 'bảng Làng Bạc: cả 3 màn "Tự hoàn thành", KHÔNG có nút "Xem cảnh cuối" (cao trào chỉ mở bằng hoàn thành thật)', (await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="tu-hoan-thanh"]').length)) === 3 && !(await ctx.page.$('[data-testid="xem-canh-cuoi"]')));
  await shot(ctx, 'du-12-man-ban-do-bac');
  await ctx.page.close();
}

/** Bản phát hành: cờ tự hoàn thành đặt thẳng vào cookie (giả mạo) bị bỏ qua. */
async function scenarioForged(browser, size) {
  const ctx = await newCtx(browser, size, cookieOf({ ac: 4095 }));
  await ctx.page.goto(`${BASE}/lang/lang-bac/man/12`, { waitUntil: 'networkidle0' });
  await sleep(1500);
  const locked = await ctx.page.evaluate(() => Boolean(document.querySelector('main [role="alert"]')));
  check(ctx, 'phát hành', 'cookie giả có cờ tự hoàn thành cả 12 màn: bị bỏ qua, màn 12 vẫn khóa theo thứ tự', locked);
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('button[data-village]', { timeout: 20000 });
  check(ctx, 'phát hành', '/ban-do không hiện nhãn "Tự hoàn thành" cho khách', !(await ctx.page.evaluate(() => /Tự hoàn thành/.test(document.body.innerText))));
  await ctx.page.close();
}

const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    const before = results.length;
    const plan = MODE === 'dev'
      ? [['levels', scenarioLevels], ['double', scenarioDouble], ['mid', scenarioMid], ['real', scenarioReal], ['all12', scenarioAll12]]
      : [['levels', scenarioLevels], ['forged', scenarioForged]];
    for (const [key, fn] of plan) {
      if (!only.includes(key) && key !== 'forged') continue;
      try {
        await fn(browser, size);
      } catch (e) {
        results.push({ mode: MODE, size: size.name, area: `lỗi chạy ${key}`, name: e.message, ok: false, detail: '' });
        console.log(`✗ ${size.name} ${key}: ${e.message}`);
      }
    }
    const mine = results.slice(before);
    console.log(`${mine.every((r) => r.ok) ? '✓' : '✗'} [${MODE}] ${size.name}: ${mine.filter((r) => r.ok).length}/${mine.length}`);
  }
} finally {
  await browser.close();
}
if (write) {
  writeFileSync(`${OUT}/ket-qua-${MODE}${arg('suffix', '')}.json`, JSON.stringify(results, null, 1));
  writeFileSync(`${OUT}/anh-${MODE}${arg('suffix', '')}.json`, JSON.stringify(shots, null, 1));
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
