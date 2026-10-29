// P3a: vào độc lập cả 4 làng (khách mới, tiến độ cũ, hoàn thành làng sau trước làng trước). Kiểm bằng thao tác thật (chuột/chạm/phím) trên BẢN BUILD CÓ CẦU NỐI ĐO.
//
// Chuẩn bị (CLAUDE.md mục 9): tắt server nền sau khi đo.
//   pnpm dev:assets &
//   (cd apps/hub && VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe && npx vite preview --outDir dist-probe --port 5190 --strictPort) &
// Chạy: node scripts/p3a-check.mjs [--size=0,1,2] [--no-write] [--v]
// Cầu nối đo dùng: window.__walkPlayer (đặt chỗ đứng), __walkApi, __world (bố cục thế giới), __worldInside. Không tự ghi tiến độ: tiến độ cũ được đặt bằng cookie khách đúng định dạng của ứng dụng.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5190';
const OUT = 'docs/screenshots/p3a';
const flag = (n) => process.argv.includes(`--${n}`);
const sizeIdx = (process.argv.find((a) => a.startsWith('--size=')) ?? '--size=0,1,2').slice(7).split(',').map(Number);
const write = !flag('no-write');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORDER = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];
const VNAME = { 'lang-giay': 'Làng Giấy', 'lang-det': 'Làng Dệt', 'lang-khac-dau': 'Làng Khắc Dấu', 'lang-bac': 'Làng Bạc' };
const FIRST = { 'lang-giay': 1, 'lang-det': 4, 'lang-khac-dau': 7, 'lang-bac': 10 };
if (write) mkdirSync(OUT, { recursive: true });

const results = [];
const shots = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ size: ctx.size.name, area, name, ok: Boolean(ok), detail });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${ctx.size.name}] ${area}: ${name}${detail ? ` — ${detail}` : ''}`);
};

// Tiến độ cookie khách (định dạng gọn của ứng dụng, xem progress/compact.ts): lv[màn] = bài học [played, completed, de, tb, kho], game [played, completed, sao, điểm]
const lesson = [1, 1, 3, 3, 3];
const game = [1, 1, 3, 100];
const levelsDone = (ids) => Object.fromEntries(ids.map((id) => [String(id), [1, 4, 7, 10].includes(id) ? lesson : game]));
const cookieOf = ({ lv = {}, gp = 0, kc = [0, 0, 0, 0] } = {}) => ({ v: 1, lv, gp, c: 0, u: Date.now(), st: 1, kc, gt: 8191, hd: 2147483647 });

async function newCtx(browser, size, progress = cookieOf()) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    // Khóa chuột giả (CLAUDE.md mục 9): máy chủ đo không có chuột thật.
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

const cookieNow = (ctx) => ctx.page.evaluate(() => {
  const m = document.cookie.match(/sc_guest=([^;]+)/);
  return m ? JSON.parse(decodeURIComponent(m[1])) : null;
});

// ---------- /ban-do ----------
/** Chọn làng bằng chuột/chạm thật. Lần đầu chọn một làng trang mở lời giới thiệu: em bấm "Bỏ qua" như người chơi. Trả về nội dung bảng làng. */
async function pickVillage(ctx, village) {
  const { page } = ctx;
  await tap(ctx, await page.$(`button[data-village="${village}"]`));
  await page.waitForFunction(() => document.querySelector('[data-testid="ban-do-bang-lang"]') || [...document.querySelectorAll('button')].some((b) => /^Bỏ qua/.test(b.textContent.trim())), { timeout: 15000 });
  const skip = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /^Bỏ qua/.test(b.textContent.trim())) ?? null);
  if (skip.asElement()) await tap(ctx, skip.asElement());
  await page.waitForFunction((v) => document.querySelector('[data-testid="ban-do-bang-lang"]')?.dataset.village === v, { timeout: 15000 }, village);
  await sleep(400);
  return readPanel(ctx);
}

const readPanel = (ctx) => ctx.page.evaluate(() => {
  const p = document.querySelector('[data-testid="ban-do-bang-lang"]');
  const items = [...p.querySelectorAll('ul > li')].filter((li) => li.querySelector('p.font-display'));
  return {
    levels: items.map((li) => ({ name: li.querySelector('p.font-display').innerText.trim(), text: li.innerText.replace(/\s+/g, ' ').trim(), enter: [...li.querySelectorAll('button')].some((b) => b.offsetParent !== null) })),
    needCards: Boolean(p.querySelector('[data-testid="can-doc-the"]')),
    text: p.innerText.replace(/\s+/g, ' ').trim(),
    cells: [...document.querySelectorAll('ul[aria-label*="Trang Sổ Vàng"] li')].map((li) => !/Chưa nhận/.test(li.innerText)),
  };
});

/** Màn hẹp: bảng làng là hộp kéo lên che bản đồ; đóng lại để chọn làng khác. */
const closeSheet = async (ctx) => {
  if (ctx.size.w >= 768) return;
  await ctx.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^Đóng$/.test(q.textContent.trim())); if (b) b.click(); });
  await sleep(500);
};

const openState = (t) => (/Mở/.test(t) && !/Khóa/.test(t) ? 'open' : /Xong/.test(t) ? 'done' : /Khóa/.test(t) ? 'locked' : '?');

// ---------- thế giới ----------
async function world(ctx, query = 'q=low&warmup=off') {
  await ctx.page.goto(`${BASE}/cho?${query}`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForFunction(() => window.__walkPlayer && window.__world && document.querySelector('[data-testid="ban-do-nho"]'), { timeout: 90000 });
  for (let i = 0; i < 60; i++) {
    await ctx.page.keyboard.press('KeyM');
    await sleep(700);
    if (await ctx.page.$('[data-testid="ban-do-lon"]')) {
      await ctx.page.keyboard.press('Escape');
      await ctx.page.waitForFunction(() => !document.querySelector('[data-testid="ban-do-lon"]'), { timeout: 5000 });
      await sleep(900);
      return;
    }
  }
  throw new Error('Cảnh 3D không sẵn sàng');
}
async function openBig(ctx) {
  if (ctx.touch) await tap(ctx, await ctx.page.$('[data-testid="ban-do-nho"]'));
  else await ctx.page.keyboard.press('KeyM');
  await ctx.page.waitForSelector('[data-testid="ban-do-lon"]', { timeout: 8000 });
  await sleep(300);
}
async function closeBig(ctx) {
  const btn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('[data-testid="ban-do-lon"] button')].find((b) => b.getAttribute('aria-label') === 'Đóng bản đồ'));
  await tap(ctx, btn.asElement());
  await ctx.page.waitForFunction(() => !document.querySelector('[data-testid="ban-do-lon"]'), { timeout: 5000 });
}
const gateMarks = (ctx) => ctx.page.evaluate(() => [...document.querySelectorAll('[data-testid="ban-do-lon"] svg[role="img"] [data-glyph="gate"]')].map((g) => g.getAttribute('data-open')));

/** Đứng cách cổng 3 về phía chợ, nhìn thẳng vào cổng (hướng như `?mo=` dùng), giữ Shift + W: đi qua cổng vào làng. */
async function walkThroughGate(ctx, id) {
  const info = await ctx.page.evaluate((v) => {
    const w = window.__world.villages.find((q) => q.id === v);
    const f = w.frame;
    return { gx: f.gateX, gz: f.gateZ, dx: f.dirX, dz: f.dirZ, yaw: f.yaw };
  }, id);
  await ctx.page.evaluate((i) => {
    window.__walkPlayer.x = i.gx - i.dx * 3;
    window.__walkPlayer.z = i.gz - i.dz * 3;
    window.__walkPlayer.yaw = i.yaw;
    if (window.__walkApi?.camera) window.__walkApi.camera.yaw = i.yaw;
  }, info);
  await sleep(1500);
  await ctx.page.keyboard.down('Shift');
  await ctx.page.keyboard.down('KeyW');
  await sleep(12000);
  await ctx.page.keyboard.up('KeyW');
  await ctx.page.keyboard.up('Shift');
  await sleep(500);
  return ctx.page.evaluate((i) => {
    const p = window.__walkPlayer;
    return { along: (p.x - i.gx) * i.dx + (p.z - i.gz) * i.dz, inside: window.__worldInside ?? null };
  }, info);
}

async function runSize(browser, size) {
  let ctx;

  // ===== 1. Khách mới: /ban-do cả 4 làng =====
  ctx = await newCtx(browser, size);
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('button[data-village]', { timeout: 20000 });
  for (const id of ORDER) {
    await closeSheet(ctx);
    const panel = await pickVillage(ctx, id);
    const st = panel.levels.map((l) => openState(l.text));
    check(ctx, '/ban-do khách mới', `${VNAME[id]}: bài học Mở; game 1 và game 2 Khóa (thứ tự trong làng giữ nguyên)`, JSON.stringify(st) === JSON.stringify(['open', 'locked', 'locked']), st.join(','));
    const firstId = FIRST[id];
    check(ctx, '/ban-do khách mới', `${VNAME[id]}: lý do khóa chỉ nhắc màn trong cùng làng (màn ${firstId}), không nhắc làng khác`, panel.levels.slice(1).every((l) => new RegExp(`Hoàn thành màn ${firstId} `).test(l.text)) && !/làng trước|giúp .* trước/i.test(panel.text), panel.levels[1]?.text ?? '');
    check(ctx, '/ban-do khách mới', `${VNAME[id]}: chưa đọc thẻ "Em có biết?" thì bài học chưa có nút Vào (điều kiện thẻ giữ nguyên)`, panel.needCards && panel.levels.every((l) => !l.enter));
    if (id === 'lang-bac') await shot(ctx, 'ban-do-lang-bac-khach-moi');
    if (id === 'lang-giay') await shot(ctx, 'ban-do-lang-giay-khach-moi');
  }
  const ck = await cookieNow(ctx);
  check(ctx, '/ban-do khách mới', 'xem cả 4 làng không tự ghi trang, xu hay màn xong vào tiến độ', ck && ck.gp === 0 && ck.c === 0 && Object.keys(ck.lv ?? {}).length === 0, JSON.stringify({ gp: ck?.gp, c: ck?.c, lv: ck?.lv }));
  if (ctx.errors.length) check(ctx, '/ban-do khách mới', 'không lỗi trang', false, ctx.errors.join(' | '));
  await ctx.page.close();

  // ===== 2. Thế giới: cả 4 cổng mở và đi qua được =====
  ctx = await newCtx(browser, size);
  await world(ctx);
  await openBig(ctx);
  const marks = await gateMarks(ctx);
  check(ctx, 'thế giới khách mới', `bản đồ lớn: cả 4 ký hiệu cổng là "mở" (${marks.join(',')})`, marks.length === 4 && marks.every((m) => m === '1'));
  await shot(ctx, 'ban-do-lon-bon-cong-mo');
  await closeBig(ctx);
  for (const id of ORDER) {
    const r = await walkThroughGate(ctx, id);
    check(ctx, 'thế giới khách mới', `${VNAME[id]}: đi thẳng qua cổng vào làng (vượt cổng ${r.along.toFixed(1)} đơn vị, trong làng: ${r.inside})`, r.along > 1 && r.inside === id);
    // cảnh mở đầu và thẻ "Em có biết?" tự hiện lần đầu vào làng: em bấm "Bỏ qua" (trả lại điều khiển)
    for (let i = 0; i < 8; i++) {
      const skipped = await ctx.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua|^Đóng$|^Cất vào sổ/.test(q.textContent.trim())); if (b) b.click(); return Boolean(b); });
      await sleep(skipped ? 1000 : 400);
    }
    if (id === 'lang-bac') await shot(ctx, 'the-gioi-vao-lang-bac');
  }
  if (ctx.errors.length) check(ctx, 'thế giới khách mới', 'không lỗi trang', false, ctx.errors.join(' | '));
  await ctx.page.close();

  // ===== 3. Đường dẫn vào làng trực tiếp =====
  ctx = await newCtx(browser, size);
  for (const id of ORDER) {
    const lessonId = FIRST[id];
    await ctx.page.goto(`${BASE}/lang/${id}/man/${lessonId}`, { waitUntil: 'networkidle0' });
    await sleep(1200);
    const blocked = await ctx.page.evaluate(() => Boolean(document.querySelector('main [role="alert"]')) || /Màn này đang khóa|Màn đang khóa/i.test(document.body.innerText));
    check(ctx, 'URL trực tiếp', `${VNAME[id]}: /lang/${id}/man/${lessonId} (bài học) vào được, không báo khóa`, !blocked);
    if (id === 'lang-bac') await shot(ctx, 'url-truc-tiep-bac-bai-hoc');
    await ctx.page.goto(`${BASE}/lang/${id}/man/${lessonId + 1}`, { waitUntil: 'networkidle0' });
    await sleep(1200);
    const lockText = await ctx.page.evaluate(() => document.querySelector('[role="alert"]')?.innerText.replace(/\s+/g, ' ') ?? '');
    check(ctx, 'URL trực tiếp', `${VNAME[id]}: /man/${lessonId + 1} (game 1) còn khóa theo thứ tự trong làng, nhắc màn ${lessonId} (${lockText.slice(0, 70)})`, new RegExp(`màn ${lessonId} `, 'i').test(lockText));
    if (id === 'lang-bac') await shot(ctx, 'url-truc-tiep-bac-game-khoa');
  }
  await ctx.page.close();

  // ===== 4. Hoàn thành làng sau trước làng trước =====
  ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone([10, 11, 12]), gp: 0, kc: [0, 0, 0, 15] }));
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('button[data-village]', { timeout: 20000 });
  let panel = await pickVillage(ctx, 'lang-bac');
  check(ctx, 'làng sau xong trước', 'Làng Bạc: cả 3 màn Xong', JSON.stringify(panel.levels.map((l) => openState(l.text))) === JSON.stringify(['done', 'done', 'done']));
  check(ctx, 'làng sau xong trước', 'chưa có Trang Sổ Vàng nào được trao (0/4), kể cả của Làng Bạc', panel.cells.length === 4 && panel.cells.every((c) => c === false), JSON.stringify(panel.cells));
  await shot(ctx, 'ban-do-bac-xong-truoc');
  for (const id of ['lang-giay', 'lang-det', 'lang-khac-dau']) {
    // đóng bảng đang mở rồi chọn làng khác
    await closeSheet(ctx);
    const p = await pickVillage(ctx, id);
    check(ctx, 'làng sau xong trước', `${VNAME[id]}: vẫn Mở bài học, hai game còn Khóa như làng mới`, JSON.stringify(p.levels.map((l) => openState(l.text))) === JSON.stringify(['open', 'locked', 'locked']));
  }
  const ck2 = await cookieNow(ctx);
  check(ctx, 'làng sau xong trước', 'tiến độ lưu không bị đổi: trang 0, các màn 10 đến 12 giữ nguyên, không thêm màn nào', ck2 && ck2.gp === 0 && Object.keys(ck2.lv).sort().join() === '10,11,12', JSON.stringify({ gp: ck2?.gp, lv: Object.keys(ck2?.lv ?? {}) }));
  await ctx.page.goto(`${BASE}/lang/lang-giay/man/1`, { waitUntil: 'networkidle0' });
  await sleep(1000);
  check(ctx, 'làng sau xong trước', 'điều hướng: vào bài học Làng Giấy bằng đường dẫn vẫn được', !(await ctx.page.$('main [role="alert"]')));
  await ctx.page.close();

  // ===== 5. Tiến độ cũ giữ nguyên =====
  ctx = await newCtx(browser, size, cookieOf({ lv: levelsDone([1, 2, 3, 4, 5, 6]), gp: 2, kc: [15, 15, 0, 0] }));
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('button[data-village]', { timeout: 20000 });
  panel = await pickVillage(ctx, 'lang-det');
  check(ctx, 'tiến độ cũ', '2 Trang Sổ Vàng đã có vẫn hiện, Làng Dệt 3 màn Xong', JSON.stringify(panel.cells) === JSON.stringify([true, true, false, false]) && panel.levels.every((l) => openState(l.text) === 'done'), JSON.stringify(panel.cells));
  await shot(ctx, 'ban-do-tien-do-cu');
  await closeSheet(ctx);
  panel = await pickVillage(ctx, 'lang-khac-dau');
  check(ctx, 'tiến độ cũ', 'Làng Khắc Dấu: bài học Mở, hai game Khóa', JSON.stringify(panel.levels.map((l) => openState(l.text))) === JSON.stringify(['open', 'locked', 'locked']));
  await ctx.page.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  const ck3 = await cookieNow(ctx);
  check(ctx, 'tiến độ cũ', 'tải lại trang: cookie vẫn gp=2 và 6 màn đã xong', ck3 && ck3.gp === 2 && Object.keys(ck3.lv).length === 6, JSON.stringify({ gp: ck3?.gp, n: Object.keys(ck3?.lv ?? {}).length }));
  await ctx.page.close();

  // ===== 6. Thẻ đủ: bài học có nút Vào, game phụ vẫn khóa theo thứ tự =====
  ctx = await newCtx(browser, size, cookieOf({ kc: [0, 0, 0, 15] }));
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('button[data-village]', { timeout: 20000 });
  panel = await pickVillage(ctx, 'lang-bac');
  check(ctx, 'thứ tự trong làng', 'đủ 4 thẻ Làng Bạc: bài học có nút Vào, hai game Khóa và không có nút Vào', !panel.needCards && panel.levels[0].enter && !panel.levels[1].enter && !panel.levels[2].enter, JSON.stringify(panel.levels.map((l) => l.enter)));
  await ctx.page.close();
}

const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    const before = results.length;
    try {
      await runSize(browser, size);
    } catch (e) {
      results.push({ size: size.name, area: 'lỗi chạy', name: e.message, ok: false, detail: '' });
      console.log(`✗ ${size.name}: ${e.message}`);
    }
    const mine = results.slice(before);
    console.log(`${mine.every((r) => r.ok) ? '✓' : '✗'} ${size.name}: ${mine.filter((r) => r.ok).length}/${mine.length}`);
  }
} finally {
  await browser.close();
}
if (write) {
  writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify(results, null, 1));
  writeFileSync(`${OUT}/anh.json`, JSON.stringify(shots, null, 1));
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
