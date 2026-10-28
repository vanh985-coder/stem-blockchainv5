// P2b: thẻ "Em có biết?" chưa nhặt trên /ban-do, bản đồ lớn và bản đồ nhỏ. Kiểm bằng thao tác thật (chuột/chạm/phím) trên BẢN BUILD CÓ CẦU NỐI ĐO.
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
async function banDo(ctx) {
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('[data-testid="ban-do-lop-the"]', { timeout: 15000 });
  // Chờ bố cục ổn định (ảnh nền tải xong, khung bản đồ đạt cỡ thật): vị trí các biểu tượng không đổi qua hai lần đọc cách nhau 400 ms.
  let prev = '';
  for (let i = 0; i < 25; i++) {
    await sleep(400);
    const now = await ctx.page.evaluate(() => [...document.querySelectorAll('[data-testid="ban-do-the"]')].map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)}`; }).join('|') + '#' + Math.round(document.querySelector('[data-testid="ban-do-lop-the"]').parentElement.getBoundingClientRect().width));
    if (now === prev) break;
    prev = now;
  }
  return ctx.page.evaluate(() => {
    const box = document.querySelector('[data-testid="ban-do-lop-the"]').parentElement.getBoundingClientRect();
    const icons = [...document.querySelectorAll('[data-testid="ban-do-the"]')].map((e) => {
      const r = e.getBoundingClientRect();
      return { village: e.dataset.village, index: Number(e.dataset.index), x: ((r.left + r.width / 2 - box.left) / box.width) * 100, y: ((r.top + r.height / 2 - box.top) / box.height) * 100, w: r.width, h: r.height, vis: getComputedStyle(e).visibility !== 'hidden' };
    });
    const hot = {};
    const labels = {};
    for (const b of document.querySelectorAll('button[data-village]')) {
      const r = b.getBoundingClientRect();
      const t = b.querySelector('span')?.textContent ?? '';
      hot[t] = { x: ((r.left + r.width / 2 - box.left) / box.width) * 100, y: ((r.top + r.height / 2 - box.top) / box.height) * 100 };
      labels[b.dataset.village] = { cx: r.left + r.width / 2 - box.left, cy: r.top + r.height / 2 - box.top, hw: r.width / 2, hh: r.height / 2 };
    }
    const leg = document.querySelector('[data-testid="ban-do-chu-thich-the"]');
    return {
      icons, hot, labels, box: { w: box.width, h: box.height },
      legend: leg ? leg.innerText.replace(/\s+/g, ' ').trim() : null,
      legendBox: leg ? (({ left, top, right, bottom }) => ({ left: left - box.left, top: top - box.top, right: right - box.left, bottom: bottom - box.top }))(leg.getBoundingClientRect()) : null,
      sr: [...document.querySelectorAll('[data-testid="ban-do-the-doc"] li')].map((e) => e.textContent),
      overlayPointer: getComputedStyle(document.querySelector('[data-testid="ban-do-lop-the"]')).pointerEvents,
    };
  });
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

  // ===== 1. Khách mới: đủ 16 vị trí ở /ban-do =====
  ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
  const wdata = await (async () => { const c = await newCtx(browser, size); const d = await world(c); await c.page.close(); return d; })();
  const spots = wdata.villages.flatMap((v) => v.scrolls.map((s) => ({ village: v.id, index: s.index, x: s.x, z: s.z, cx: v.center.x, cz: v.center.z })));
  check(ctx, 'dữ liệu', '16 vị trí thật từ bố cục thế giới (4 làng × 4 thẻ)', spots.length === 16 && ORDER.every((id) => spots.filter((s) => s.village === id).length === 4));

  let bd = await banDo(ctx);
  check(ctx, '/ban-do khách mới', 'đủ 16 biểu tượng thẻ', bd.icons.length === 16, `${bd.icons.length}`);
  check(ctx, '/ban-do khách mới', 'mỗi làng 4 thẻ', ORDER.every((id) => bd.icons.filter((i) => i.village === id).length === 4));
  check(ctx, '/ban-do khách mới', 'biểu tượng nằm trong ảnh bản đồ và không dưới 18 px', bd.icons.every((i) => i.x > 0 && i.x < 100 && i.y > 0 && i.y < 100 && i.w >= 18 && i.h >= 18), `nhỏ nhất ${Math.min(...bd.icons.map((i) => i.w)).toFixed(0)} px`);
  check(ctx, '/ban-do khách mới', 'lớp phủ không bắt chuột/chạm', bd.overlayPointer === 'none');
  check(ctx, '/ban-do khách mới', `chú thích có chữ: "${bd.legend}"`, bd.legend && /Thẻ "Em có biết\?" chưa nhặt/.test(bd.legend) && /16\/16/.test(bd.legend));
  check(ctx, '/ban-do khách mới', 'lời đọc màn hình theo từng làng (4 làng, mỗi làng còn 4)', bd.sr.length === 5 && bd.sr.slice(1).every((t) => /còn 4 thẻ/.test(t)), bd.sr.join(' | '));
  // vị trí: công thức độc lập từ tọa độ thế giới và điểm làng đọc từ nút làng trên chính trang
  const RATIO = bd.box.w / bd.box.h;
  const K = 11 / 125; // % bề ngang ứng với 1 đơn vị (bán kính làng 125 ↔ 11 %)
  const hotOf = (id) => bd.hot[VNAME[id]];
  // Vị trí theo công thức thu nhỏ đều quanh điểm làng; thẻ vướng chữ tên làng / mép bản đồ / thẻ khác được dời lên mép khung chữ của làng mình.
  let farthest = 0;
  let overlapLabel = 0;
  let outOfMap = 0;
  let overlapIcons = 0;
  let exact = 0;
  const angErr = [];
  for (const i of bd.icons) {
    const s = spots.find((q) => q.village === i.village && q.index === i.index);
    const lab = bd.labels[i.village];
    const hx = hotOf(i.village).x;
    const hy = hotOf(i.village).y;
    const ex = ((hx - (s.x - s.cx) * K) / 100) * bd.box.w;
    const ey = ((hy - (s.z - s.cz) * K * RATIO) / 100) * bd.box.h;
    const px = (i.x / 100) * bd.box.w;
    const py = (i.y / 100) * bd.box.h;
    if (Math.hypot(px - ex, py - ey) <= 1.5) exact++;
    {
      const ta = Math.atan2(ey - lab.cy, ex - lab.cx);
      const da = Math.atan2(py - lab.cy, px - lab.cx);
      let d = Math.abs(ta - da);
      if (d > Math.PI) d = 2 * Math.PI - d;
      angErr.push((d * 180) / Math.PI);
    }
    farthest = Math.max(farthest, Math.hypot(px - lab.cx, py - lab.cy));
    for (const L of Object.values(bd.labels)) if (Math.abs(px - L.cx) < L.hw + i.w / 2 - 1 && Math.abs(py - L.cy) < L.hh + i.h / 2 - 1) overlapLabel++;
    if (px - i.w / 2 < -0.5 || px + i.w / 2 > bd.box.w + 0.5 || py - i.h / 2 < -0.5 || py + i.h / 2 > bd.box.h + 0.5) outOfMap++;
    for (const o of bd.icons) {
      if (o === i) continue;
      const qx = (o.x / 100) * bd.box.w;
      const qy = (o.y / 100) * bd.box.h;
      if (Math.hypot(px - qx, py - qy) < i.w * 0.9) overlapIcons++;
    }
    void lab;
  }
  const meanAng = angErr.reduce((a, b) => a + b, 0) / angErr.length;
  const maxAng = Math.max(...angErr);
  const labW = Math.max(...Object.values(bd.labels).map((L) => L.hw * 2));
  check(ctx, '/ban-do khách mới', `vị trí quanh làng: ${exact}/16 thẻ đúng vị trí công thức (phần còn lại dời ra mép chữ tên làng); không thẻ nào xa làng mình quá ${Math.round(labW * 1.6)} px (xa nhất ${farthest.toFixed(0)} px)`, farthest <= labW * 1.6);
  check(ctx, '/ban-do khách mới', `hướng la bàn của thẻ quanh làng: lệch trung bình ${meanAng.toFixed(0)}°, lớn nhất ${maxAng.toFixed(0)}° so với hướng thật của thẻ trong làng`, meanAng <= 50 && maxAng <= 120);
  check(ctx, '/ban-do khách mới', 'không biểu tượng nào đè lên chữ tên của bất kỳ làng nào', overlapLabel === 0, `${overlapLabel} chỗ đè`);
  check(ctx, '/ban-do khách mới', 'không hai biểu tượng nào đè lên nhau', overlapIcons === 0, `${overlapIcons} cặp`);
  check(ctx, '/ban-do khách mới', 'mọi biểu tượng nằm trọn trong ảnh bản đồ', outOfMap === 0, `${outOfMap} thẻ bị cắt`);
  const flowLegend = bd.legendBox && (bd.legendBox.top >= bd.box.h - 1 || bd.legendBox.bottom <= 1);
  const legendOverlaps = !flowLegend && bd.icons.some((i) => { const px = (i.x / 100) * bd.box.w; const py = (i.y / 100) * bd.box.h; const L = bd.legendBox; return L && px > L.left - 8 && px < L.right + 8 && py > L.top - 8 && py < L.bottom + 8; });
  check(ctx, '/ban-do khách mới', `chú thích ${flowLegend ? 'nằm ngoài bản đồ (màn hẹp)' : 'ở góc dưới trái bản đồ'} và không đè lên biểu tượng nào`, !legendOverlaps);
  await shot(ctx, 'ban-do-khach-moi');
  await ctx.page.close();

  // ===== 2. Đã nhặt một phần / tất cả ở /ban-do =====
  const PART = [0b0101, 15, 0, 0b1000]; // Giấy 2 thẻ (1,3), Dệt đủ, Khắc Dấu 4, Bạc 3 (0,1,2)
  ctx = await newCtx(browser, size, { kc: PART });
  bd = await banDo(ctx);
  const want = ['lang-giay:1', 'lang-giay:3', 'lang-khac-dau:0', 'lang-khac-dau:1', 'lang-khac-dau:2', 'lang-khac-dau:3', 'lang-bac:0', 'lang-bac:1', 'lang-bac:2'].sort();
  check(ctx, '/ban-do một phần', 'chỉ còn thẻ chưa nhặt (9 thẻ đúng bộ)', JSON.stringify(bd.icons.map((i) => `${i.village}:${i.index}`).sort()) === JSON.stringify(want), `${bd.icons.length}`);
  check(ctx, '/ban-do một phần', `chú thích đếm đúng: "${bd.legend}"`, /9\/16/.test(bd.legend));
  check(ctx, '/ban-do một phần', 'lời đọc màn hình theo làng khớp (2, 0, 4, 3)', [2, 0, 4, 3].every((n, k) => new RegExp(`còn ${n} thẻ`).test(bd.sr[k + 1])), bd.sr.slice(1).join(' | '));
  await shot(ctx, 'ban-do-mot-phan');
  await ctx.page.close();
  ctx = await newCtx(browser, size, { kc: [15, 15, 15, 15] });
  bd = await banDo(ctx);
  check(ctx, '/ban-do đủ thẻ', 'không còn biểu tượng nào; chú thích báo đã nhặt đủ', bd.icons.length === 0 && /đã nhặt đủ/.test(bd.legend ?? ''), `${bd.icons.length} | ${bd.legend}`);
  await shot(ctx, 'ban-do-du-the');
  await ctx.page.close();

  // ===== 3. Chuột/chạm trên /ban-do: biểu tượng không cản bấm vào làng =====
  ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
  bd = await banDo(ctx);
  const btn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button[aria-pressed]')].find((b) => b.textContent.includes('Làng Khắc Dấu')));
  await tap(ctx, btn.asElement());
  await sleep(700);
  const opened = await ctx.page.evaluate(() => /Khắc Dấu/.test(document.body.innerText) && (document.querySelector('[aria-pressed="true"]') !== null || /Dòng chữ|Bài|Màn|Khóa|Thẻ/.test(document.body.innerText)));
  check(ctx, '/ban-do chạm', `${ctx.touch ? 'chạm' : 'bấm'} nút làng bên cạnh biểu tượng thẻ vẫn mở bảng làng`, opened);
  await ctx.page.close();

  if (flag('ban-do')) return; // lặp nhanh: chỉ phần /ban-do
  // ===== 4. Thế giới: bản đồ lớn và bản đồ nhỏ =====
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
    bd = await banDo(ctx);
    check(ctx, 'tải lại trang', '/ban-do cũng còn 15 biểu tượng, không có thẻ Làng Giấy số 2', bd.icons.length === 15 && !bd.icons.some((i) => i.village === 'lang-giay' && i.index === 1), `${bd.icons.length}`);
    await ctx.page.close();
    // đổi người chơi (khách mới trên cùng trình duyệt: xóa cookie khách) không mang trạng thái thẻ của người trước sang
    ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0] });
    bd = await banDo(ctx);
    check(ctx, 'đổi người chơi', 'người chơi khác (cookie khách mới) thấy lại đủ 16 thẻ, không mang thẻ đã nhặt của người trước', bd.icons.length === 16);
    await ctx.page.close();
  }

  // ===== 7. Chữ to và giảm chuyển động =====
  ctx = await newCtx(browser, size, { kc: [0, 0, 0, 0], largeText: true, reducedMotion: true });
  bd = await banDo(ctx);
  check(ctx, 'chữ to + giảm chuyển động', '/ban-do: đủ 16 biểu tượng và chú thích', bd.icons.length === 16 && /chưa nhặt/.test(bd.legend ?? ''));
  await shot(ctx, 'ban-do-chu-to');
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
