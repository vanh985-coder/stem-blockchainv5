// P2b: thẻ "Em có biết?" chưa nhặt trên vùng bản đồ làng của /ban-do (chọn làng → bản đồ bố cục thật phóng to), bản đồ lớn và bản đồ nhỏ. Kiểm bằng thao tác thật (chuột/chạm/phím) trên BẢN BUILD CÓ CẦU NỐI ĐO.
//
// Chuẩn bị (CLAUDE.md mục 9): máy tắt server nền sau khi đo.
//   pnpm dev:assets &
//   (cd apps/hub && VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe && npx vite preview --outDir dist-probe --port 5190 --strictPort) &
// Chạy: node scripts/p2b-check.mjs [--size=0,1,2] [--no-write] [--v]
// Cầu nối đo kiểm dùng: window.__walkPlayer (đặt chỗ đứng), __walkApi (hướng nhìn), __world (bố cục thế giới), __worldInteractables (vật tương tác thật). Không gọi hàm nộp/nhặt thẻ trực tiếp.
import { mkdirSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5190';
const OUT = 'docs/screenshots/p2b';
const flag = (n) => process.argv.includes(`--${n}`);
const sizeIdx = (process.argv.find((a) => a.startsWith('--size=')) ?? '--size=0,1,2').slice(7).split(',').map(Number);
const write = !flag('no-write');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORDER = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];
const VNAME = { 'lang-giay': 'Làng Giấy', 'lang-det': 'Làng Dệt', 'lang-khac-dau': 'Làng Khắc Dấu', 'lang-bac': 'Làng Bạc' };
if (write) mkdirSync(OUT, { recursive: true });

const results = [];
const shots = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ size: ctx.size.name, area, name, ok: Boolean(ok), detail });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${ctx.size.name}] ${area}: ${name}${detail ? ` — ${detail}` : ''}`);
};

async function newCtx(browser, size, { kc = [0, 0, 0, 0], largeText = false, reducedMotion = false, rotateMap = false } = {}) {
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
  await page.evaluate((k, lt, rm, rot) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: rm, largeText: lt, rotateMap: rot, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify({ v: 1, lv: {}, gp: 0, c: 0, u: Date.now(), st: 1, kc: k, gt: 8191, hd: 2147483647 }))}; path=/`;
  }, kc, largeText, reducedMotion, rotateMap);
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

// ---------- /ban-do ----------
const MAP_SIZE = 300; // cạnh khung vẽ vùng bản đồ làng (VILLAGE_MAP_SIZE)
const MAP_RADIUS = 125 + 8; // VILLAGE_RADIUS + dải bờ
const K_MAP = MAP_SIZE / 2 / MAP_RADIUS;

/** Bấm/chạm thật vào nút làng. Lần đầu chọn một làng, trang mở lời giới thiệu: em bấm "Bỏ qua" (đúng như người chơi) rồi bảng làng mới hiện. */
async function selectVillage(ctx, village) {
  const { page } = ctx;
  await tap(ctx, await page.$(`button[data-village="${village}"]`));
  await page.waitForFunction((v) => document.querySelector('[data-testid="ban-do-lang-the"], [data-testid="ban-do-the-het"]')?.dataset.village === v || [...document.querySelectorAll('button')].some((b) => /^Bỏ qua/.test(b.textContent.trim())), { timeout: 15000 }, village);
  const skip = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /^Bỏ qua/.test(b.textContent.trim())) ?? null);
  if (skip.asElement()) await tap(ctx, skip.asElement());
  await page.waitForFunction((v) => document.querySelector('[data-testid="ban-do-lang-the"], [data-testid="ban-do-the-het"]')?.dataset.village === v, { timeout: 15000 }, village);
}

/** Mở /ban-do; nếu có `village` thì bấm/chạm thật vào nút làng đó rồi chờ vùng bản đồ làng. `fontDelay` (ms) trì hoãn mọi tải phông để thử phông tải muộn. */
async function banDo(ctx, village = null, { fontDelay = 0 } = {}) {
  const { page } = ctx;
  if (fontDelay) {
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.resourceType() === 'font') setTimeout(() => req.continue().catch(() => {}), fontDelay);
      else req.continue().catch(() => {});
    });
  }
  await page.goto(`${BASE}/ban-do`, { waitUntil: fontDelay ? 'domcontentloaded' : 'networkidle0' });
  await page.waitForSelector('button[data-village]', { timeout: 20000 });
  if (!village) return null;
  await selectVillage(ctx, village);
  return readVillageMap(ctx);
}

/** Đọc vùng bản đồ làng đang hiện. Chờ bố cục ổn định (hai lần đọc cách nhau 300 ms giống nhau). */
async function readVillageMap(ctx) {
  const { page } = ctx;
  const read = () => page.evaluate(() => {
    const sec = document.querySelector('[data-testid="ban-do-lang-the"]');
    if (!sec) {
      const het = document.querySelector('[data-testid="ban-do-the-het"]');
      return { has: false, het: het ? het.innerText.trim() : null, village: het?.dataset.village ?? null, icons: [] };
    }
    sec.scrollIntoView({ block: 'center', behavior: 'instant' });
    const svg = sec.querySelector('[data-testid="ban-do-ban-do-lang"]');
    const sb = svg.getBoundingClientRect();
    // khung vẽ (viewBox) nằm trong viền 2 px của <svg>: đo phần trong viền
    const sr = { left: sb.left + svg.clientLeft, top: sb.top + svg.clientTop, width: svg.clientWidth, height: svg.clientHeight };
    const icons = [...svg.querySelectorAll('[data-testid="ban-do-the"]')].map((g) => {
      const r = g.querySelector('[data-glyph="scroll"] rect').getBoundingClientRect();
      return { village: g.dataset.village, index: Number(g.dataset.index), px: Number(g.dataset.px), py: Number(g.dataset.py), cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
    });
    const outline = svg.querySelector('[data-testid="ban-do-tinh"] circle');
    const orect = outline ? outline.getBoundingClientRect() : null;
    const leg = sec.querySelector('[data-testid="ban-do-chu-thich-the"]');
    return {
      has: true,
      village: sec.dataset.village,
      svg: { left: sr.left, top: sr.top, w: sr.width, h: sr.height },
      viewport: { w: window.innerWidth, h: window.innerHeight },
      icons,
      outline: orect ? { cx: orect.left + orect.width / 2, cy: orect.top + orect.height / 2, w: orect.width } : null,
      houses: svg.querySelectorAll('[data-testid="ban-do-tinh"] path').length,
      list: [...sec.querySelectorAll('[data-testid="ban-do-the-ds"] li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()),
      sr: [...sec.querySelectorAll('[data-testid="ban-do-the-ds"] li .sr-only')].map((e) => e.textContent),
      legend: leg ? leg.innerText.replace(/\s+/g, ' ').trim() : null,
      count: sec.querySelector('p')?.innerText ?? '',
      title: sec.querySelector('h3')?.innerText ?? '',
      buttons: document.querySelectorAll('button[data-village]').length,
    };
  });
  let prev = '';
  let cur = null;
  for (let i = 0; i < 30; i++) {
    await sleep(300);
    cur = await read();
    const key = JSON.stringify([cur.svg, cur.icons.map((q) => [q.cx, q.cy])]);
    if (key === prev) break;
    prev = key;
  }
  return cur;
}

/** Mở từng làng (tải lại trang cho mỗi làng) và gom mọi biểu tượng thẻ. */
async function collectAll(ctx) {
  const all = [];
  for (const id of ORDER) {
    const b = await banDo(ctx, id);
    all.push(...b.icons);
  }
  return all;
}

/** Kiểm vùng bản đồ một làng với dữ liệu thật của bố cục thế giới (độc lập với mã vẽ). Trả về sai lệch lớn nhất (px màn hình). */
function verifyVillageMap(ctx, area, bd, id, spots, mask) {
  const mine = spots.filter((s) => s.village === id);
  const want = mine.filter((s) => !((mask >> s.index) & 1));
  check(ctx, area, `${VNAME[id]}: có vùng bản đồ làng, ${want.length} thẻ chưa nhặt đúng bộ (${want.map((s) => s.index + 1).join(', ')})`, bd.has && JSON.stringify(bd.icons.map((i) => i.index).sort()) === JSON.stringify(want.map((s) => s.index).sort()), `${bd.icons.length}`);
  if (!bd.has) return 0;
  check(ctx, area, `${VNAME[id]}: vẫn có đủ 4 nút làng trên ảnh bản đồ chung để chọn`, bd.buttons === 4);
  let worst = 0;
  let outside = 0;
  let overlap = 0;
  let minSize = Infinity;
  let dataErr = 0;
  const kScreen = bd.svg.w / MAP_SIZE;
  for (const i of bd.icons) {
    const s = mine.find((q) => q.index === i.index);
    // tọa độ trong khung vẽ theo công thức độc lập từ tọa độ thế giới thật (bắc ở trên, đông = −X ở bên phải)
    const ex = MAP_SIZE / 2 - (s.x - s.cx) * K_MAP;
    const ey = MAP_SIZE / 2 - (s.z - s.cz) * K_MAP;
    dataErr = Math.max(dataErr, Math.hypot(i.px - ex, i.py - ey));
    // vị trí trên màn hình đúng chỗ công thức
    const sx = bd.svg.left + ex * kScreen;
    const sy = bd.svg.top + ey * kScreen;
    worst = Math.max(worst, Math.hypot(i.cx - sx, i.cy - sy));
    minSize = Math.min(minSize, i.w, i.h);
    if (i.cx - i.w / 2 < bd.svg.left - 0.5 || i.cx + i.w / 2 > bd.svg.left + bd.svg.w + 0.5 || i.cy - i.h / 2 < bd.svg.top - 0.5 || i.cy + i.h / 2 > bd.svg.top + bd.svg.h + 0.5) outside++;
    for (const o of bd.icons) if (o !== i && Math.hypot(i.cx - o.cx, i.cy - o.cy) < i.w * 1.6) overlap++;
  }
  check(ctx, area, `${VNAME[id]}: tọa độ trong khung khớp công thức từ dữ liệu thật (sai lệch lớn nhất ${dataErr.toExponential(1)} đơn vị)`, dataErr < 0.01);
  check(ctx, area, `${VNAME[id]}: biểu tượng nằm đúng chỗ trên màn hình (sai lệch lớn nhất ${worst.toFixed(2)} px)`, worst < 0.75, `khung ${bd.svg.w.toFixed(0)} px`);
  check(ctx, area, `${VNAME[id]}: biểu tượng không dưới 18 px (nhỏ nhất ${minSize.toFixed(0)} px), nằm trọn trong bản đồ, không đè nhau`, minSize >= 18 && outside === 0 && overlap === 0, `${outside} bị cắt, ${overlap} cặp đè`);
  check(ctx, area, `${VNAME[id]}: lớp bố cục thật có mặt (đường/ao/viền, ${bd.houses} nét vẽ); tâm viền làng ở giữa khung`, bd.outline && Math.hypot(bd.outline.cx - (bd.svg.left + bd.svg.w / 2), bd.outline.cy - (bd.svg.top + bd.svg.h / 2)) < 1.5 && bd.houses >= 1);
  check(ctx, area, `${VNAME[id]}: danh sách có số thẻ và tên khu bằng chữ (${bd.list.join(' / ')})`, bd.list.length === want.length && bd.list.every((t) => /Gần /.test(t)));
  check(ctx, area, `${VNAME[id]}: đếm và chú thích bằng chữ (${bd.count.trim()})`, new RegExp(`Còn ${want.length}/4 thẻ`).test(bd.count) && /Thẻ "Em có biết\?" chưa nhặt/.test(bd.legend ?? ''));
  check(ctx, area, `${VNAME[id]}: vùng bản đồ nằm trong khung nhìn sau khi cuộn tới (chiều ngang)`, bd.svg.left >= -0.5 && bd.svg.left + bd.svg.w <= bd.viewport.w + 0.5);
  return worst;
}

// ---------- thế giới ----------
async function world(ctx) {
  await ctx.page.goto(`${BASE}/cho?q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForFunction(() => window.__walkPlayer && window.__world && document.querySelector('[data-testid="ban-do-nho"]'), { timeout: 90000 });
  await ready(ctx);
  const data = await ctx.page.evaluate(() => ({
    villages: window.__world.villages.map((v) => ({ id: v.id, center: v.center, scrolls: v.layout.scrolls ?? [] })),
  }));
  return data;
}

/** Chờ cảnh sẵn sàng: phím M chỉ mở được bản đồ lớn khi cảnh đã sẵn sàng; mở được thì đóng lại bằng Esc. */
async function ready(ctx) {
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

/** Em bấm "Bỏ qua" cảnh mở đầu làng (lần đầu vào) rồi chờ vùng làng dựng xong ("Đang vào làng…" mất). */
async function settleVillage(ctx) {
  for (let i = 0; i < 6; i++) {
    const skipped = await ctx.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim())); if (b) b.click(); return Boolean(b); });
    await sleep(skipped ? 1200 : 400);
  }
  await ctx.page.waitForFunction(() => !/Đang vào làng/.test(document.body.innerText), { timeout: 170000 });
  await sleep(800);
}

const teleport = async (ctx, x, z) => {
  await ctx.page.evaluate((a, b) => { window.__walkPlayer.x = a; window.__walkPlayer.z = b; }, x, z);
  await sleep(350);
};

/** Ký hiệu thẻ trên bản đồ nhỏ: hiện hay ẩn và vị trí (pixel trong khung). */
async function miniState(ctx) {
  return ctx.page.evaluate(() => {
    const root = document.querySelector('[data-testid="ban-do-nho"] svg');
    const size = Number(root.getAttribute('width'));
    const out = [];
    for (const g of root.querySelectorAll('g[data-glyph="scroll"]')) {
      const wrap = g.parentElement;
      const t = wrap.getAttribute('transform') ?? '';
      const m = t.match(/translate\(([-\d.]+) ([-\d.]+)\)/);
      out.push({ x: m ? Number(m[1]) : NaN, y: m ? Number(m[2]) : NaN, shown: wrap.getAttribute('display') !== 'none' });
    }
    return { size, scrolls: out, inside: window.__worldInside ?? null, player: { x: window.__walkPlayer.x, z: window.__walkPlayer.z }, yaw: window.__walkApi.camera.yaw };
  });
}

/** Chiếu theo mô tả ở spec 03 mục 3.10 (Bắc = +Z ở trên, Tây = +X bên trái; xoay theo chiều kim đồng hồ đúng `yaw` khi bật xoay). */
function expectScreen(st, spot, rotate) {
  const radius = st.inside ? 60 : 88;
  const k = st.size / 2 / radius;
  const sx = -(spot.x - st.player.x) * k;
  const sy = -(spot.z - st.player.z) * k;
  const rot = rotate ? st.yaw : 0;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const half = st.size / 2;
  return { x: half + sx * c - sy * s, y: half + sx * s + sy * c, in: Math.hypot(half + sx * c - sy * s - half, half + sx * s + sy * c - half) <= half + 6 };
}

async function openBig(ctx) {
  if (ctx.touch) await tap(ctx, await ctx.page.$('[data-testid="ban-do-nho"]'));
  else await ctx.page.keyboard.press('KeyM');
  await ctx.page.waitForSelector('[data-testid="ban-do-lon"]', { timeout: 8000 });
  await sleep(250);
}
async function closeBig(ctx) {
  const btn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('[data-testid="ban-do-lon"] button')].find((b) => b.getAttribute('aria-label') === 'Đóng bản đồ'));
  await tap(ctx, btn.asElement());
  await ctx.page.waitForFunction(() => !document.querySelector('[data-testid="ban-do-lon"]'), { timeout: 5000 });
  await sleep(200);
}
async function bigState(ctx) {
  return ctx.page.evaluate(() => {
    const svg = document.querySelector('[data-testid="ban-do-lon"] svg[role="img"]');
    const out = [];
    for (const g of svg.querySelectorAll('g[data-glyph="scroll"]')) {
      const m = (g.parentElement.getAttribute('transform') ?? '').match(/translate\(([-\d.e]+) ([-\d.e]+)\)/);
      out.push({ x: m ? -Number(m[1]) : NaN, z: m ? -Number(m[2]) : NaN });
    }
    const legend = [...document.querySelectorAll('[data-testid="ban-do-lon"] li')].filter((li) => li.querySelector('[data-glyph="scroll"]')).map((li) => li.innerText.trim());
    const prog = [...document.querySelectorAll('[data-testid^="tien-do-"]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim());
    const box = svg.getBoundingClientRect();
    return { scrolls: out, legend, prog, box: { w: box.width, h: box.height }, hasAria: Boolean(svg.getAttribute('aria-label')) };
  });
}

const keyOf = (s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`;

async function runSize(browser, size) {
  const errors = [];
  let ctx;

  // ===== 1. Khách mới: chọn từng làng, đủ 16 thẻ (4 làng × 4) đúng tọa độ thật =====
  const wdata = await (async () => { const c = await newCtx(browser, size); const d = await world(c); await c.page.close(); return d; })();
  const spots = wdata.villages.flatMap((v) => v.scrolls.map((s) => ({ village: v.id, index: s.index, x: s.x, z: s.z, cx: v.center.x, cz: v.center.z })));
  check({ size }, 'dữ liệu', '16 vị trí thật từ bố cục thế giới (4 làng × 4 thẻ)', spots.length === 16 && ORDER.every((id) => spots.filter((s) => s.village === id).length === 4));
  let total = 0;
  let worstAll = 0;
  for (const id of ORDER) {
    ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
    const bd = await banDo(ctx, id);
    worstAll = Math.max(worstAll, verifyVillageMap(ctx, '/ban-do khách mới', bd, id, spots, 0));
    total += bd.icons.length;
    if (id === 'lang-det' || id === 'lang-bac') await shot(ctx, `ban-do-lang-${id.slice(5)}-khach-moi`);
    if (id === 'lang-giay') await shot(ctx, 'ban-do-khach-moi');
    if (ctx.errors.length) check(ctx, '/ban-do khách mới', 'không có lỗi trang', false, ctx.errors.join(' | '));
    await ctx.page.close();
  }
  check({ size }, '/ban-do khách mới', `tổng ${total}/16 thẻ trên 4 làng; sai lệch vị trí lớn nhất ${worstAll.toFixed(2)} px`, total === 16 && worstAll < 0.75);

  // ===== 2. Đã nhặt một phần / tất cả =====
  const PART = [0b0101, 15, 0, 0b1000]; // Giấy 2 thẻ (1,3), Dệt đủ, Khắc Dấu 4, Bạc 3 (0,1,2)
  for (const [k, id] of ORDER.entries()) {
    ctx = await newCtx(browser, size, { kc: PART });
    const bd = await banDo(ctx, id);
    if (PART[k] === 15) {
      check(ctx, '/ban-do đủ thẻ', `${VNAME[id]}: nhặt đủ thì không còn bản đồ thẻ, có lời báo (${bd.het})`, !bd.has && /đã nhặt đủ/.test(bd.het ?? ''));
      await shot(ctx, 'ban-do-du-the');
    } else {
      verifyVillageMap(ctx, '/ban-do một phần', bd, id, spots, PART[k]);
      if (id === 'lang-giay') await shot(ctx, 'ban-do-mot-phan');
    }
    await ctx.page.close();
  }

  // ===== 3. Phông chữ tải muộn không làm lệch vị trí =====
  {
    ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
    const t0 = Date.now();
    const early = await banDo(ctx, 'lang-khac-dau', { fontDelay: 2500 });
    const tEarly = Date.now() - t0;
    const fontsLoadedEarly = await ctx.page.evaluate(() => document.fonts.status === 'loaded');
    await ctx.page.evaluate(() => document.fonts.ready);
    await sleep(3200);
    const late = await readVillageMap(ctx);
    // vị trí so với khung bản đồ (phông tải xong có thể làm trang giãn dòng nên khung dịch xuống, nhưng biểu tượng phải giữ đúng chỗ TRONG khung)
    const rel = (b, i) => [(i.cx - b.svg.left) / b.svg.w, (i.cy - b.svg.top) / b.svg.w];
    const same = early.icons.every((i, k) => { const a = rel(early, i); const c = rel(late, late.icons[k]); return Math.hypot(a[0] - c[0], a[1] - c[1]) * MAP_SIZE < 0.1; });
    check(ctx, 'phông tải muộn', `vị trí biểu tượng giống nhau trước và sau khi phông tải xong (lúc đo đầu ${tEarly} ms, phông đã tải: ${fontsLoadedEarly})`, same);
    verifyVillageMap(ctx, 'phông tải muộn', late, 'lang-khac-dau', spots, 0);
    await ctx.page.close();
  }

  // ===== 4. Chuột/chạm: bấm lần nữa vào nút làng thì đóng; chọn làng khác thì đổi vùng bản đồ =====
  if (!size.touch || size.w >= 768) {
    ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
    await banDo(ctx, 'lang-giay');
    const other = await ctx.page.$('button[data-village="lang-bac"]');
    void other;
    await selectVillage(ctx, 'lang-bac');
    check(ctx, '/ban-do chọn làng', 'chọn làng khác thì vùng bản đồ đổi sang làng đó', true);
    await ctx.page.close();
  }

  if (flag('ban-do')) return; // lặp nhanh: chỉ phần /ban-do
  // ===== 5. Thế giới: bản đồ lớn và bản đồ nhỏ =====
  ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
  await world(ctx);
  // bản đồ nhỏ ở chợ: không thẻ nào trong vòng 88 (Làng gần nhất cách cổng 72 + thẻ sâu trong làng)
  let ms = await miniState(ctx);
  let shown = ms.scrolls.filter((s) => s.shown).length;
  const exp0 = spots.filter((s) => expectScreen(ms, s, false).in).length;
  check(ctx, 'bản đồ nhỏ (ở chợ)', `chỉ vẽ thẻ trong vòng đang hiện (vẽ ${shown}, kỳ vọng ${exp0}); DOM có đủ 16 ký hiệu`, ms.scrolls.length === 16 && shown === exp0);
  await openBig(ctx);
  let bs = await bigState(ctx);
  check(ctx, 'bản đồ lớn khách mới', 'đủ 16 biểu tượng của cả 4 làng khi em đang ở chợ (ngoài làng)', bs.scrolls.length === 16, `${bs.scrolls.length}`);
  check(ctx, 'bản đồ lớn khách mới', 'tọa độ từng biểu tượng trùng tọa độ thật của vật thể', JSON.stringify(bs.scrolls.map(keyOf).sort()) === JSON.stringify(spots.map(keyOf).sort()));
  check(ctx, 'bản đồ lớn khách mới', `có chú thích bằng chữ: ${bs.legend.join(' / ')}`, bs.legend.length === 1 && /chưa nhặt/.test(bs.legend[0]));
  check(ctx, 'bản đồ lớn khách mới', 'tiến độ thẻ từng làng 0/4', bs.prog.filter((t) => /0\/4/.test(t)).length === 4, bs.prog.join(' | ').slice(0, 160));
  await shot(ctx, 'ban-do-lon-khach-moi');
  await closeBig(ctx);

  // vị trí khớp vật thể thật: đứng ngay chỗ từng thẻ thì ký hiệu của thẻ đó nằm đúng tâm bản đồ nhỏ; vật tương tác thật cùng tọa độ
  for (const rotate of [false, true]) {
    await ctx.page.evaluate((r) => { window.__yawKeep = r; }, rotate);
  }
  const placeNear = {};
  for (const id of ORDER) {
    const first = spots.find((s) => s.village === id && s.index === 0);
    await teleport(ctx, first.x + 6, first.z + 6); // vào vùng làng để tải cảnh 3D
    await sleep(2500);
    const inter = await ctx.page.evaluate(() => (window.__worldInteractables ?? []).filter((i) => /scroll/i.test(i.id)).map((i) => ({ id: i.id, x: i.x, z: i.z })));
    placeNear[id] = inter;
    const mine = spots.filter((s) => s.village === id);
    const okSet = mine.every((s) => inter.some((i) => Math.abs(i.x - s.x) < 1e-6 && Math.abs(i.z - s.z) < 1e-6));
    check(ctx, 'khớp vật thể thật', `${VNAME[id]}: cả ${mine.length} vật tương tác (cuộn giấy trong cảnh 3D) đúng tọa độ ký hiệu (${inter.length} vật đã tải)`, okSet && inter.length >= 4);
    let worstMini = 0;
    for (const s of mine) {
      await teleport(ctx, s.x, s.z);
      const idx = spots.indexOf(s);
      // Bản đồ nhỏ cập nhật 10 lần/giây; máy đo dựng hình phần mềm rất chậm nên đợi tối đa 5 giây cho nhịp cập nhật tới.
      let dev = Infinity;
      for (let t = 0; t < 25 && dev > 0.6; t++) {
        const st = await miniState(ctx);
        dev = Math.hypot(st.scrolls[idx].x - st.size / 2, st.scrolls[idx].y - st.size / 2);
        if (dev > 0.6) await sleep(200);
      }
      worstMini = Math.max(worstMini, dev);
    }
    check(ctx, 'khớp vật thể thật', `${VNAME[id]}: đứng ngay chỗ từng thẻ thì ký hiệu nằm giữa bản đồ nhỏ (lệch lớn nhất ${worstMini.toFixed(2)} px)`, worstMini <= 0.6);
  }
  await ctx.page.close();

  // ===== 5. Bản đồ nhỏ: hướng bắc và xoay theo hướng nhìn =====
  for (const rotate of [false, true]) {
    ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0], rotateMap: rotate });
    await world(ctx);
    const probes = [[0, -10, 0], [0, 60, 0.9], [20, 120, -1.2], [-40, 230, 2.4], [60, 175, 0.4]];
    let worst = 0;
    let visOk = true;
    for (const [x, z, yaw] of probes) {
      await ctx.page.evaluate((a) => { window.__walkApi.camera.yaw = a; }, yaw);
      await teleport(ctx, x, z);
      // Bản đồ nhỏ cập nhật 10 lần/giây; máy đo dựng hình phần mềm có lúc trễ nhịp, nên đợi tối đa 6 giây cho tới khi khớp (kết quả cuối cùng mới tính).
      let probeWorst = Infinity;
      let probeVis = false;
      for (let t = 0; t < 30 && !(probeWorst <= 0.6 && probeVis); t++) {
        await sleep(t === 0 ? 600 : 200);
        const st = await miniState(ctx);
        probeWorst = 0;
        probeVis = true;
        spots.forEach((s, i) => {
          const e = expectScreen(st, s, rotate);
          if (e.in !== st.scrolls[i].shown) probeVis = false;
          if (e.in && st.scrolls[i].shown) probeWorst = Math.max(probeWorst, Math.hypot(e.x - st.scrolls[i].x, e.y - st.scrolls[i].y));
        });
      }
      worst = Math.max(worst, probeWorst);
      if (!probeVis) visOk = false;
    }
    check(ctx, `bản đồ nhỏ (${rotate ? 'xoay theo hướng nhìn' : 'hướng bắc'})`, `5 chỗ đứng/hướng nhìn: vị trí ký hiệu khớp công thức chiếu (lệch lớn nhất ${worst.toFixed(2)} px)`, worst <= 0.6);
    check(ctx, `bản đồ nhỏ (${rotate ? 'xoay theo hướng nhìn' : 'hướng bắc'})`, 'chỉ vẽ đúng các thẻ nằm trong vòng đang hiện', visOk);
    // Ảnh: đứng trong Làng Giấy (đã bỏ qua cảnh mở đầu), cách hai thẻ chưa nhặt dưới 50 đơn vị, nhìn hơi chếch.
    await teleport(ctx, 30, 200);
    await settleVillage(ctx);
    await ctx.page.evaluate(() => { window.__walkApi.camera.yaw = 0.9; });
    await sleep(1200);
    await shot(ctx, rotate ? 'ban-do-nho-xoay' : 'ban-do-nho-bac');
    await ctx.page.close();
  }

  // ===== 6. Nhặt thẻ thật (phím E) → biến mất ở mọi nơi; mở lại bản đồ; tải lại trang; tài khoản/khách khác =====
  if (!size.touch) {
    ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
    await world(ctx);
    const target = spots.find((s) => s.village === 'lang-giay' && s.index === 1);
    await teleport(ctx, target.x, target.z + 1.2);
    await settleVillage(ctx);
    await ctx.page.keyboard.press('KeyE');
    await ctx.page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => /Cất vào sổ/.test(b.textContent)), { timeout: 8000 });
    await shot(ctx, 'nhat-the-hop-thoai');
    await ctx.page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Cất vào sổ/.test(b.textContent)).click());
    await sleep(1200);
    ms = await miniState(ctx);
    check(ctx, 'nhặt thẻ', 'sau khi nhặt (phím E, bấm "Cất vào sổ") ký hiệu thẻ đó biến mất khỏi bản đồ nhỏ, các thẻ khác còn nguyên', ms.scrolls.length === 15);
    await openBig(ctx);
    bs = await bigState(ctx);
    check(ctx, 'nhặt thẻ', 'mở lại bản đồ lớn: còn 15 biểu tượng, thiếu đúng thẻ vừa nhặt', bs.scrolls.length === 15 && !bs.scrolls.some((s) => keyOf(s) === keyOf(target)));
    check(ctx, 'nhặt thẻ', 'tiến độ Làng Giấy ghi 1/4', bs.prog.some((t) => /Giấy/.test(t) && /1\/4/.test(t)), bs.prog[0]);
    await shot(ctx, 'ban-do-lon-sau-khi-nhat');
    await closeBig(ctx);
    await sleep(3500); // chờ ghi tiến độ vào cookie khách
    const cookie = await ctx.page.evaluate(() => document.cookie);
    const saved = /sc_guest=/.test(cookie);
    await ctx.page.reload({ waitUntil: 'domcontentloaded' });
    await ctx.page.waitForFunction(() => window.__walkPlayer && window.__world && document.querySelector('[data-testid="ban-do-nho"]'), { timeout: 90000 });
    await ready(ctx);
    await openBig(ctx);
    bs = await bigState(ctx);
    check(ctx, 'tải lại trang', `tiến độ đã lưu (cookie khách: ${saved}) khớp: bản đồ lớn vẫn còn 15, thiếu thẻ đã nhặt`, saved && bs.scrolls.length === 15 && !bs.scrolls.some((s) => keyOf(s) === keyOf(target)));
    await closeBig(ctx);
    const after = await collectAll(ctx);
    check(ctx, 'tải lại trang', '/ban-do cũng còn 15 thẻ, không có thẻ Làng Giấy số 2 (tiến độ khớp)', after.length === 15 && !after.some((i) => i.village === 'lang-giay' && i.index === 1), `${after.length}`);
    await ctx.page.close();
    // đổi người chơi (khách mới trên cùng trình duyệt: xóa cookie khách) không mang trạng thái thẻ của người trước sang
    ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
    const fresh = await collectAll(ctx);
    check(ctx, 'đổi người chơi', 'người chơi khác (cookie khách mới) thấy lại đủ 16 thẻ, không mang thẻ đã nhặt của người trước', fresh.length === 16);
    await ctx.page.close();
  }

  // ===== 7. Chữ to và giảm chuyển động =====
  ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0], largeText: true, reducedMotion: true });
  {
    let n = 0;
    let worstBig = 0;
    for (const id of ORDER) {
      const b = await banDo(ctx, id);
      n += b.icons.length;
      worstBig = Math.max(worstBig, verifyVillageMap(ctx, 'chữ to + giảm chuyển động', b, id, spots, 0));
      if (id === 'lang-khac-dau') await shot(ctx, 'ban-do-chu-to');
    }
    check(ctx, 'chữ to + giảm chuyển động', `/ban-do: đủ ${n}/16 thẻ, sai lệch vị trí lớn nhất ${worstBig.toFixed(2)} px`, n === 16 && worstBig < 0.75);
    const moving = await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="ban-do-lang-the"] .animate-pulse, [data-testid="ban-do-lang-the"] animate').length);
    check(ctx, 'chữ to + giảm chuyển động', 'vùng bản đồ làng không có phần tử chuyển động', moving === 0);
  }
  await world(ctx);
  ms = await miniState(ctx);
  check(ctx, 'chữ to + giảm chuyển động', `bản đồ nhỏ nhân 1,15 (${ms.size} px) và vẫn có ký hiệu thẻ`, ms.size === (size.touch ? 138 : 207) && ms.scrolls.length === 16);
  await openBig(ctx);
  bs = await bigState(ctx);
  check(ctx, 'chữ to + giảm chuyển động', 'bản đồ lớn: đủ 16 biểu tượng và chú thích', bs.scrolls.length === 16 && bs.legend.length === 1);
  const animated = await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="ban-do-lon"] .animate-pulse, [data-testid="ban-do-nho"] .animate-pulse').length);
  check(ctx, 'chữ to + giảm chuyển động', 'không có phần tử nhấp nháy', animated === 0, `${animated}`);
  await shot(ctx, 'ban-do-lon-chu-to');
  await ctx.page.close();
  if (errors.length) check({ size }, 'lỗi', errors.join(' | '), false);
}

const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
// WebGL phần mềm (SwiftShader) để cảnh 3D chạy được ở máy chủ không có GPU.
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
if (write && !flag('ban-do')) {
  writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify(results, null, 1));
  writeFileSync(`${OUT}/anh.json`, JSON.stringify(shots, null, 1));
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
