/**
 * Kiểm "trang bài học gọn một màn hình" (Màn 1 và Màn 10, 3 trạm) bằng Chrome thật trên bản build probe.
 *
 *   cd apps/hub && VITE_PROBE=true VITE_MERGED=true ... npx vite build --outDir dist-probe
 *   npx vite preview --outDir dist-probe --port 5190 --strictPort      (rồi)  node scripts/bai-hoc-gon-check.mjs
 *
 * Zoom trình duyệt được giả lập đúng như Chrome làm: cửa sổ CSS = cỡ vật lý / zoom, deviceScaleFactor = zoom.
 * Đo ở mỗi cỡ: trang có cuộn dọc / ngang không, chữ nhỏ nhất thực tế (px CSS sau tỉ lệ), nút nhỏ nhất, phần tử tràn khung.
 * Kéo lá ở Màn 10 trạm Khó: chuột thật thả lá đè lên ô (con trỏ ngoài ô), cảm ứng ở 360×800.
 * Biến môi trường: BASE (mặc định http://localhost:5190), ONLY=man:trạm (ví dụ 10:kho), SHOTS=1 để chụp ảnh.
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5190';
const OUT = 'docs/screenshots/bai-hoc-gon';
const ONLY = process.env.ONLY || '';
const SHOTS = process.env.SHOTS === '1';
const SHOTONLY = process.env.SHOTONLY === '1'; // chỉ chụp ảnh (bản trước khi sửa không có FitBox nên không đo)
const TAG = process.env.TAG || 'sau';
const chrome = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (SHOTS) mkdirSync(OUT, { recursive: true });

const SCENARIOS = [
  { man: 1, st: 'de' }, { man: 1, st: 'tb' }, { man: 1, st: 'kho' },
  { man: 10, st: 'de' }, { man: 10, st: 'tb' }, { man: 10, st: 'kho' },
].filter((s) => !ONLY || ONLY === `${s.man}:${s.st}`);

const ZOOMS = [0.67, 0.8, 1, 1.25, 1.5];
const SIZES = [[1366, 768], [1920, 1080]];
const EXTRA = [[1536, 730, 1], [844, 390, 1], [360, 800, 1]];
const QUICK = process.env.QUICK === '1'; // lặp nhanh: chỉ 4 cỡ chính
const ALL_VIEWS = [
  ...SIZES.flatMap(([w, h]) => ZOOMS.map((z) => ({ w, h, z }))),
  ...EXTRA.map(([w, h, z]) => ({ w, h, z })),
];
const VIEWS = SHOTONLY ? ALL_VIEWS.filter((v) => (v.w === 1366 && v.z === 1) || (v.w === 360)) : QUICK ? ALL_VIEWS.filter((v) => (v.z === 1 && v.w >= 844) || (v.w === 1366 && v.z === 1.25)) : ALL_VIEWS;

async function clickText(page, t) {
  return page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === t);
    if (b) { b.click(); return true; }
    return false;
  }, t);
}

async function open(page, man, st) {
  const village = man === 1 ? 'lang-giay' : 'lang-bac';
  const stars = { de: [0, 0, 0], tb: [3, 0, 0], kho: [3, 3, 0] }[st];
  const lv = {};
  for (let i = 1; i <= 9; i++) lv[String(i)] = [1, 1, 3, 3, 3];
  lv[String(man)] = [1, 0, ...stars];
  await page.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify({ v: 1, lv, gp: 0, c: 10, u: Date.now(), st: 1, kc: [15, 15, 15, 15] })), url: BASE });
  await page.goto(`${BASE}/lang/${village}/man/${man}?q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 40; i++) { if (await clickText(page, 'Bỏ qua')) break; await sleep(150); }
  await sleep(300);
  for (let i = 0; i < 30; i++) { if (await clickText(page, 'Bắt đầu')) break; await sleep(150); }
  await sleep(900);
  // Hướng dẫn làm thử (P8): bỏ qua để thấy trạm thật
  for (let i = 0; i < 12; i++) {
    const ok = await page.evaluate(() => {
      if (!document.querySelector('[data-testid="tutorial-spotlight"]')) return false;
      const b = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((x) => /Bỏ qua|Đóng/.test(x.textContent || ''));
      if (b) { b.click(); return true; }
      return false;
    });
    if (!ok) break;
    await sleep(250);
  }
  await sleep(500);
  await settle(page);
}

async function settle(page) {
  let last = "";
  let same = 0;
  for (let i = 0; i < 40 && same < 4; i++) {
    const cur = await page.evaluate(() => { const f = document.querySelector('[data-testid="lesson-fit"]'); return (f?.getAttribute("data-fit-scale") || "") + "|" + (f?.style.height || "") + "|" + document.body.scrollHeight; });
    same = cur === last ? same + 1 : 0;
    last = cur;
    await sleep(100);
  }
}

/** Đo trong trang: chạy ở ngữ cảnh trình duyệt. */
function measure() {
  const scroll = document.querySelector('[data-testid="lesson-scroll"]');
  const fit = document.querySelector('[data-testid="lesson-fit"]');
  const scale = Number(fit?.getAttribute('data-fit-scale') || 1);
  const root = fit || document.body;
  // Máy tính: ngưỡng 14 px / 44 px tính theo px vật lý (zoom trình duyệt làm px CSS to hơn); cảm ứng tính theo px CSS.
  const unit = matchMedia('(pointer: coarse)').matches ? 1 : Math.max(1, devicePixelRatio);
  let minFont = Infinity, minFontText = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || !n.nodeValue.trim()) continue;
    if (el.closest('[aria-hidden="true"], .sr-only, script, style, svg')) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const px = parseFloat(getComputedStyle(el).fontSize) * scale * unit;
    if (px < minFont) { minFont = px; minFontText = n.nodeValue.trim().slice(0, 24); }
  }
  let minBtn = Infinity, minBtnText = '';
  root.querySelectorAll('button, [role="button"], input:not([type="hidden"]), select, textarea').forEach((el) => {
    if (el.closest('[aria-hidden="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    const side = Math.min(r.width, r.height) * unit;
    if (side < minBtn) { minBtn = side; minBtnText = (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 24); }
  });
  const sr = scroll.getBoundingClientRect();
  let overflow = 0;
  const overflowers = [];
  root.querySelectorAll('*').forEach((el) => {
    if (el.closest('svg')) return;
    let inScroller = false;
    for (let a = el.parentElement; a && a !== root; a = a.parentElement) {
      const ox = getComputedStyle(a).overflowX;
      if (ox === 'auto' || ox === 'scroll') { inScroller = true; break; }
    }
    if (inScroller) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height < 1) return; // bỏ phần tử ẩn cho trình đọc màn hình (sr-only, 1 px)
    if (r.right > sr.right + 1 || r.left < sr.left - 1) { overflow++; if (overflowers.length < 3) overflowers.push(el.tagName + '.' + String(el.className).slice(0, 30) + '[' + Math.round(r.left) + ',' + Math.round(r.right) + ' vs ' + Math.round(sr.left) + ',' + Math.round(sr.right) + ']'); }
  });
  return {
    scale,
    vScroll: scroll.scrollHeight > scroll.clientHeight + 1,
    hScroll: scroll.scrollWidth > scroll.clientWidth + 1,
    docH: scroll.scrollHeight, viewH: scroll.clientHeight,
    minFont: Math.round(minFont * 10) / 10, minFontText,
    minBtn: Math.round(minBtn * 10) / 10, minBtnText,
    overflow, overflowers,
  };
}

const rows = [];
function record(label, r) {
  rows.push({ label, ...r });
  const ok = !r.vScroll && !r.hScroll && r.minFont >= 14 && r.minBtn >= 44 && r.overflow === 0;
  console.log(`${ok ? 'OK ' : 'XX '} ${label.padEnd(22)} scale=${r.scale} cuộn dọc=${r.vScroll ? 'CÓ(' + r.docH + '/' + r.viewH + ')' : 'không'} ngang=${r.hScroll ? 'CÓ' : 'không'} chữ≥${r.minFont}("${r.minFontText}") nút≥${r.minBtn}("${r.minBtnText}") tràn=${r.overflow}${r.overflowers.length ? ' ' + r.overflowers.join(',') : ''}`);
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));

for (const sc of SCENARIOS) {
  await page.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
  await open(page, sc.man, sc.st);
  for (const v of VIEWS) {
    const cssW = Math.round(v.w / v.z), cssH = Math.round(v.h / v.z);
    await page.setViewport({ width: cssW, height: cssH, deviceScaleFactor: v.z });
    await sleep(500);
    const label = `M${sc.man}-${sc.st} ${v.w}x${v.h}@${v.z}`;
    if (!SHOTONLY) record(label, await page.evaluate(measure));
    if (SHOTS && v.z === 1 && [1366, 360].includes(v.w)) await page.screenshot({ path: `${OUT}/${TAG}-m${sc.man}-${sc.st}-${v.w}x${v.h}.jpg`, type: 'jpeg', quality: 62 });
  }
}

// --- Kéo lá ở Màn 10 trạm Khó ---
async function dragChecks() {
  const results = [];
  const rect = (sel, i = 0) => page.evaluate((sel, i) => { const e = [...document.querySelectorAll(sel)][i]; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel, i);
  const regions = () => page.evaluate(() => [...document.querySelectorAll('[role=region]')].filter((e) => e.getAttribute('aria-label') === '?').length);
  const filled = () => page.evaluate(() => [...document.querySelectorAll('[role=region]')].filter((e) => e.getAttribute('aria-label') === '?' && /đã đặt/i.test(e.textContent || '')).length);
  async function oneDrag(name, view, grab, aim) {
    await page.setViewport({ width: Math.round(view.w / view.z), height: Math.round(view.h / view.z), deviceScaleFactor: view.z });
    await open(page, 10, 'kho');
    await page.evaluate(() => document.querySelector('#tutorial-man10kho-tray [role=button][aria-pressed]')?.scrollIntoView({ block: 'nearest' }));
    await sleep(300);
    const L = await rect('#tutorial-man10kho-tray [role=button][aria-pressed]');
    const S = await page.evaluate(() => {
      const e = [...document.querySelectorAll('[role=region]')].find((x) => x.getAttribute('aria-label') === '?');
      e.scrollIntoView({ block: 'nearest' });
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    });
    const L2 = await rect('#tutorial-man10kho-tray [role=button][aria-pressed]');
    const start = { x: L2.x + L2.w * grab[0], y: L2.y + L2.h * grab[1] };
    const end = aim(L2, S, grab);
    const inside = end.x >= S.x && end.x <= S.x + S.w && end.y >= S.y && end.y <= S.y + S.h;
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let i = 1; i <= 24; i++) await page.mouse.move(start.x + ((end.x - start.x) * i) / 24, start.y + ((end.y - start.y) * i) / 24);
    const lit = await page.evaluate(() => [...document.querySelectorAll('[role=region]')].filter((e) => e.getAttribute('aria-label') === '?' && /border-xanh-la-dam/.test(e.className)).length);
    const leaf = await page.evaluate(() => {
      const e = document.querySelector('[style*="translate3d"]');
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, pe: getComputedStyle(e).pointerEvents };
    });
    await page.mouse.up();
    await sleep(300);
    const n = await filled();
    results.push({ name, ok: n === 1, pointerInsideSlot: inside, litWhileDragging: lit, leafPointerEvents: leaf?.pe, leafOverlap: leaf ? Math.round((Math.max(0, Math.min(leaf.x + leaf.w, S.x + S.w) - Math.max(leaf.x, S.x)) * Math.max(0, Math.min(leaf.y + leaf.h, S.y + S.h) - Math.max(leaf.y, S.y))) / (leaf.w * leaf.h) * 100) : null });
  }
  for (const view of [{ w: 1366, h: 768, z: 1 }, { w: 1920, h: 1080, z: 1 }]) {
    const tag = `${view.w}x${view.h}`;
    // lá đè lên ô (giao khoảng một nửa), con trỏ ở NGOÀI ô: nắm gần góc dưới-phải của lá (trong phần bo góc), tâm lá ở sát mép phải ô
    await oneDrag(`${tag} lệch tâm (con trỏ ngoài ô)`, view, [0.85, 0.8], (L, S) => ({ x: S.x + S.w * 0.9 + 0.35 * L.w, y: S.y + S.h / 2 + 0.3 * L.h }));
    await oneDrag(`${tag} con trỏ đúng tâm ô`, view, [0.5, 0.5], (L, S) => ({ x: S.x + S.w / 2, y: S.y + S.h / 2 }));
    await oneDrag(`${tag} lá che nửa ô, con trỏ ngoài ô phía trên-trái`, view, [0.15, 0.2], (L, S) => ({ x: S.x - 4, y: S.y - 4 }));
  }
  for (const r of results) console.log(`${r.ok ? 'OK ' : 'XX '} kéo: ${r.name} | con trỏ trong ô=${r.pointerInsideSlot} | ô sáng khi kéo=${r.litWhileDragging} | pointer-events lá=${r.leafPointerEvents} | lá giao ô ≈${r.leafOverlap}%`);
  return results;
}

let dragResults = [];
if ((!ONLY || ONLY === '10:kho') && process.env.NODRAG !== '1' && !SHOTONLY) dragResults = await dragChecks();

// Chạm giả lập ở 360×800
async function touchCheck() {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 360, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const lv = {};
  for (let i = 1; i <= 9; i++) lv[String(i)] = [1, 1, 3, 3, 3];
  lv['10'] = [1, 0, 3, 3, 0];
  await p.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify({ v: 1, lv, gp: 0, c: 10, u: Date.now(), st: 1, kc: [15, 15, 15, 15] })), url: BASE });
  await p.goto(`${BASE}/lang/lang-bac/man/10?q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
  const click = (t) => p.evaluate((t) => { const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === t); if (b) { b.click(); return true; } return false; }, t);
  for (let i = 0; i < 40; i++) { if (await click('Bỏ qua')) break; await sleep(150); }
  await sleep(300);
  for (let i = 0; i < 30; i++) { if (await click('Bắt đầu')) break; await sleep(150); }
  await sleep(900);
  for (let i = 0; i < 12; i++) {
    const ok = await p.evaluate(() => {
      if (!document.querySelector('[data-testid="tutorial-spotlight"]')) return false;
      const b = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((x) => /Bỏ qua|Đóng/.test(x.textContent || ''));
      if (b) { b.click(); return true; }
      return false;
    });
    if (!ok) break;
    await sleep(250);
  }
  await sleep(700);
  // Trang cao hơn khung ở điện thoại dọc: cuộn để ô đầu tiên sát đỉnh rồi xem lá còn thấy không
  await p.evaluate(() => {
    const sc = document.querySelector('[data-testid="lesson-scroll"]');
    const slot = [...document.querySelectorAll('[role=region]')].find((x) => x.getAttribute('aria-label') === '?');
    sc.scrollTop += slot.getBoundingClientRect().top - 70;
  });
  await sleep(300);
  const geo = await p.evaluate(() => {
    const leaf = document.querySelector('#tutorial-man10kho-tray [role=button][aria-pressed]');
    const slot = [...document.querySelectorAll('[role=region]')].find((x) => x.getAttribute('aria-label') === '?');
    const box = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
    return { leaf: box(leaf), slot: box(slot), vh: innerHeight };
  });
  const cdp = await p.createCDPSession();
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const inView = geo.leaf.y + geo.leaf.h < geo.vh && geo.slot.y + geo.slot.h < geo.vh && geo.leaf.y >= 0 && geo.slot.y >= 0;
  let ok = false;
  if (inView) {
    const sx = geo.leaf.x + geo.leaf.w * 0.9, sy = geo.leaf.y + geo.leaf.h * 0.9;
    const ex = geo.slot.x + geo.slot.w * 0.5 - geo.leaf.w * 0.15 + geo.leaf.w * 0.4, ey = geo.slot.y + geo.slot.h * 0.5 + geo.leaf.h * 0.4;
    await touch('touchStart', sx, sy);
    await sleep(220);
    for (let i = 1; i <= 20; i++) { await touch('touchMove', sx + ((ex - sx) * i) / 20, sy + ((ey - sy) * i) / 20); await sleep(16); }
    await touch('touchEnd');
    await sleep(400);
    ok = (await p.evaluate(() => [...document.querySelectorAll('[role=region]')].filter((e) => e.getAttribute('aria-label') === '?' && /đã đặt/i.test(e.textContent || '')).length)) === 1;
  }
  console.log(`${ok ? 'OK ' : 'XX '} chạm 360×800: lá và ô cùng thấy được=${inView}, thả lệch tâm nhận=${ok}`);
  await ctx.close();
  return { ok, inView };
}
let touch = null;
if ((!ONLY || ONLY === '10:kho') && process.env.NODRAG !== '1' && !SHOTONLY) touch = await touchCheck();

await browser.close();
mkdirSync('docs/screenshots/bai-hoc-gon', { recursive: true });
writeFileSync(process.env.REPORT || 'C:/Users/Acer/AppData/Local/Temp/bai-hoc-gon-report.json', JSON.stringify({ rows, dragResults, touch, problems }, null, 1));
const bad = rows.filter((r) => r.vScroll || r.hScroll || r.minFont < 14 || r.minBtn < 44 || r.overflow > 0);
console.log(`\nTổng: ${rows.length} phép đo, ${bad.length} chưa đạt. Lỗi trang: ${problems.length}`);
if (problems.length) console.log(problems.slice(0, 5).join('\n'));
