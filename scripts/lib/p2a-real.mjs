// Lõi dùng chung của scripts/p2a-real-check.mjs: mở trình duyệt, gắn bộ ghi lời khen, thao tác thật qua DOM.
// Không gọi sound/onAnswer trực tiếp: mọi lần "nộp bài" là chuột, chạm hoặc bàn phím thật lên phần tử trên trang.
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

export const BASE = process.env.BASE_URL ?? 'http://localhost:4180';
export const OUT = 'docs/screenshots/p2a';
export const SIZES = [
  { w: 1366, h: 768, touch: false, name: '1366x768' },
  { w: 360, h: 800, touch: true, name: '360x800' },
  { w: 844, h: 390, touch: true, name: '844x390' },
];
export const MEN = {
  1: { village: 'lang-giay', lesson: 'bài 1' },
  4: { village: 'lang-det', lesson: 'bài 2' },
  7: { village: 'lang-khac-dau', lesson: 'bài 3' },
  10: { village: 'lang-bac', lesson: 'bài 4' },
};
export const TRAM_NAME = ['Dễ', 'Trung bình', 'Khó'];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

export async function launch() {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
  return puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
}

// Chạy trong trang trước mọi script: ghi mỗi đợt khen xuất hiện (vị trí, cuộn, hộp phản hồi) và đếm nốt nhạc phát ra.
const INSTRUMENT = () => {
  window.__praise = [];
  window.__osc = 0;
  const proto = window.AudioContext && window.AudioContext.prototype;
  if (proto && proto.createOscillator) {
    const orig = proto.createOscillator;
    proto.createOscillator = function (...a) { window.__osc += 1; return orig.apply(this, a); };
  }
  const snap = (el) => {
    const strip = document.querySelector('.lesson-praise');
    const win = document.querySelector('.lesson-window');
    const sc = document.querySelector('.lesson-scroll');
    if (!strip || !win || !sc) return;
    const r = strip.getBoundingClientRect();
    const w = win.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    window.__praise.push({
      t: performance.now(),
      n: Number(el.dataset.event),
      text: (el.childNodes[0] && el.childNodes[0].textContent || '').trim(),
      strip: { top: r.top, bottom: r.bottom, height: r.height },
      winTop: w.top,
      textRect: { top: t.top, bottom: t.bottom, left: t.left, right: t.right, w: t.width, h: t.height },
      vw: innerWidth,
      vh: innerHeight,
      scrollTop: sc.scrollTop,
      scrollHeight: sc.scrollHeight,
      clientHeight: sc.clientHeight,
      sheet: Boolean(win.querySelector('.fixed.z-50')),
      sparks: el.querySelectorAll('.lesson-fireworks i').length,
      pointer: getComputedStyle(strip).pointerEvents,
    });
  };
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const el = n.matches('[data-event]') ? n : n.querySelector('[data-event]');
      if (el) snap(el);
    }
  }).observe(document, { childList: true, subtree: true });
};

export async function openLesson(browser, size, man, tram, opts = {}) {
  const { sound = true, reducedSetting = false, reducedMedia = false, base = BASE } = opts;
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.evaluateOnNewDocument(INSTRUMENT);
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: reducedMedia ? 'reduce' : 'no-preference' }]);
  await page.goto(base);
  await page.evaluate((s, r) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: s, reducedMotion: r, quality: 'low' }));
    const lv = Object.fromEntries([1, 4, 7, 10].map((i) => [i, [1, 1, 3, 3, 3]]));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify({ v: 1, lv, gp: 4, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 8191, hd: 2147483647 }))}; path=/`;
  }, sound, reducedSetting);
  await page.goto(`${base}/lang/${MEN[man].village}/man/${man}?q=low`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('[data-testid="lesson-praise"]');
  const ctx = { page, size, man, tram, errors, records: [], shots: [], touch: size.touch };
  const leaked = await page.evaluate(() => /\/\/ isolate|\{\/\*/.test(document.body.innerText));
  ctx.records.push({ man, tram, size: size.name, step: 'trang bài không in ra chú thích của mã nguồn', expect: 1, actual: leaked ? 0 : 1, ok: !leaked, kind: 'trangThai' });
  await gotoStation(ctx, tram);
  return ctx;
}

/** Chọn trạm trên thanh trên (chuột/chạm thật), bỏ qua lời dẫn, bấm Bắt đầu. */
export async function gotoStation(ctx, tram) {
  const { page } = ctx;
  const sel = `header ol li:nth-child(${tram + 1}) button`;
  await page.waitForSelector(sel);
  await tapSel(ctx, sel);
  await sleep(250);
  await clickText(ctx, 'Bỏ qua', { optional: true });
  await sleep(250);
  await clickText(ctx, 'Bắt đầu');
  await sleep(700);
}

// ---------- thao tác thật ----------
async function center(page, handle) {
  const box = await handle.boundingBox();
  if (!box) throw new Error('phần tử không có khung (ẩn)');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Phần tử có đang nhận được chạm/chuột ở tâm không (không bị bảng cố định khác che)? */
async function hittable(page, handle) {
  return handle.evaluate((e) => {
    const r = e.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
    const top = document.elementFromPoint(x, y);
    return Boolean(top && (e === top || e.contains(top) || top.contains(e)));
  });
}

/** Đưa phần tử vào vùng nhìn thấy như em cuộn: gần nhất trước, nếu còn bị che thì đưa ra giữa; trả tâm. */
async function reveal(ctx, handle) {
  for (const block of ['nearest', 'center', 'start', 'end']) {
    await handle.evaluate((e, b) => e.scrollIntoView({ block: b, inline: 'nearest', behavior: 'instant' }), block);
    await sleep(40);
    if (await hittable(ctx.page, handle)) return center(ctx.page, handle);
  }
  return center(ctx.page, handle);
}

export async function tap(ctx, handle) {
  const { x, y } = await reveal(ctx, handle);
  if (ctx.touch) await ctx.page.touchscreen.tap(x, y);
  else await ctx.page.mouse.click(x, y);
}

export async function tapSel(ctx, sel) {
  const h = await ctx.page.waitForSelector(sel, { visible: true });
  await tap(ctx, h);
  return h;
}

export async function findButton(page, text, { exact = false, within = null } = {}) {
  const handle = await page.evaluateHandle(
    (t, ex, rootSel) => {
      const root = rootSel ? document.querySelector(rootSel) : document;
      if (!root) return null;
      const norm = (s) => s.replace(/\s+/g, ' ').trim();
      const ok = (e) => {
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        const tx = norm(e.textContent || '');
        return ex ? tx === t : tx.includes(t);
      };
      return [...root.querySelectorAll('button,[role="button"]')].find(ok) || null;
    },
    text, exact, within,
  );
  const el = handle.asElement();
  if (!el) { await handle.dispose(); return null; }
  return el;
}

export async function clickText(ctx, text, opts = {}) {
  const { optional = false, exact = false, within = null } = opts;
  const h = await findButton(ctx.page, text, { exact, within });
  if (!h) {
    if (optional) return false;
    throw new Error(`Không thấy nút "${text}"`);
  }
  await tap(ctx, h);
  return true;
}

/** Gõ chữ thật vào ô: chạm ô cho focus, chọn hết, gõ từng phím. */
export async function typeInto(ctx, handle, text) {
  await tap(ctx, handle);
  await ctx.page.keyboard.down('Control');
  await ctx.page.keyboard.press('KeyA');
  await ctx.page.keyboard.up('Control');
  await ctx.page.keyboard.type(String(text), { delay: 15 });
}

export async function inputByLabel(ctx, label) {
  return ctx.page.waitForSelector(`input[aria-label="${label}"]`, { visible: true, timeout: 8000 });
}

/** Kéo thẻ thả vào ô bằng chuột thật (máy tính) hoặc chạm chọn thẻ rồi chạm ô (điện thoại). */
export async function dragOrTap(ctx, from, to) {
  if (ctx.touch) {
    await tap(ctx, from);
    await sleep(120);
    await tap(ctx, to);
    return 'chạm thẻ rồi chạm ô';
  }
  const a = await reveal(ctx, from);
  const b = await center(ctx.page, to).catch(() => null);
  let tb = b;
  if (!tb || tb.y < 0 || tb.y > ctx.size.h) { tb = await reveal(ctx, to); }
  const a2 = await center(ctx.page, from);
  await ctx.page.mouse.move(a2.x, a2.y);
  await ctx.page.mouse.down();
  const steps = 14;
  for (let i = 1; i <= steps; i++) {
    await ctx.page.mouse.move(a2.x + ((tb.x - a2.x) * i) / steps, a2.y + ((tb.y - a2.y) * i) / steps);
    await sleep(12);
  }
  await ctx.page.mouse.up();
  return 'kéo thả bằng chuột';
}

export async function pageText(page) {
  return page.evaluate(() => document.querySelector('.lesson-scroll')?.innerText ?? '');
}

export async function praiseLog(page) {
  return page.evaluate(() => window.__praise.slice());
}

export async function scrollInfo(page) {
  return page.evaluate(() => {
    const sc = document.querySelector('.lesson-scroll');
    return { top: sc.scrollTop, height: sc.scrollHeight, client: sc.clientHeight, max: sc.scrollHeight - sc.clientHeight };
  });
}

/** Cuộn thật vùng bài (như em vuốt/lăn chuột) xuống gần đáy. */
export async function scrollDeep(ctx) {
  await ctx.page.evaluate(() => {
    const sc = document.querySelector('.lesson-scroll');
    sc.scrollTo({ top: sc.scrollHeight, behavior: 'instant' });
  });
  await sleep(120);
  return scrollInfo(ctx.page);
}

export async function activeDesc(page) {
  return page.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.tagName}|${a.getAttribute('aria-label') || ''}|${(a.id || '').slice(0, 20)}` : '';
  });
}

export async function stripGeometry(page) {
  return page.evaluate(() => {
    const s = document.querySelector('.lesson-praise').getBoundingClientRect();
    const w = document.querySelector('.lesson-window').getBoundingClientRect();
    return { top: s.top, height: s.height, winTop: w.top };
  });
}

export async function shot(ctx, name) {
  const meta = await ctx.page.evaluate(() => {
    const sc = document.querySelector('.lesson-scroll');
    const win = document.querySelector('.lesson-window');
    const praise = document.querySelector('[data-testid="lesson-praise"]');
    return {
      scrollTop: Math.round(sc.scrollTop),
      scrollMax: Math.round(sc.scrollHeight - sc.clientHeight),
      sheetOpen: Boolean(win.querySelector('.fixed.z-50')),
      praise: praise.textContent.trim(),
      sparks: praise.querySelectorAll('.lesson-fireworks i').length,
    };
  });
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 55 });
  if (buf.length >= 300000) throw new Error(`Ảnh ${name} lớn hơn 300 KB (${buf.length})`);
  ctx.shots.push({ name, bytes: buf.length, buf, ...meta });
  return buf.length;
}

// ---------- ghi nhận ----------
/**
 * Một bước thao tác thật. `expect` = số đợt khen mong đợi (0 hoặc 1) do bước này sinh ra.
 * `fn` thực hiện thao tác (chuột/chạm/phím). Trả bản ghi.
 */
export async function step(ctx, label, expect, fn, opts = {}) {
  const { page } = ctx;
  const before = (await praiseLog(page)).length;
  const sc0 = await scrollInfo(page);
  const geo0 = await stripGeometry(page);
  const focus0 = await activeDesc(page);
  const osc0 = await page.evaluate(() => window.__osc);
  await fn();
  // Một số bước chỉ biết kết quả sau khi thao tác (ví dụ ô soi trúng lá bị sửa): đọc từ giao diện, không từ tín hiệu khen.
  if (opts.lateExpect) expect = await opts.lateExpect();
  let shotBytes = null;
  const shotName = opts.shot ?? opts.shotIfLate;
  if (shotName && expect === 1) {
    await sleep(opts.shotDelay ?? 60);
    shotBytes = await shot(ctx, shotName);
  }
  await sleep(opts.settle ?? 450);
  const log = await praiseLog(page);
  const actual = log.length - before;
  const sc1 = await scrollInfo(page);
  const geo1 = await stripGeometry(page);
  const focus1 = await activeDesc(page);
  const osc1 = await page.evaluate(() => window.__osc);
  const events = log.slice(before);
  const rec = {
    man: ctx.man,
    tram: ctx.tram,
    tramTen: TRAM_NAME[ctx.tram],
    size: ctx.size.name,
    step: label,
    expect,
    actual,
    ok: actual === expect,
    scrollBefore: sc0.top,
    scrollAfter: sc1.top,
    scrollMax: sc1.max,
    stripBefore: geo0,
    stripAfter: geo1,
    layoutStable: geo0.height === geo1.height && geo0.top === geo1.top && geo0.winTop === geo1.winTop,
    focusBefore: focus0,
    focusAfter: focus1,
    oscDelta: osc1 - osc0,
    events: events.map((e) => ({
      text: e.text,
      inViewport: e.strip.top >= 0 && e.strip.bottom <= e.vh && e.textRect.w > 0 && e.textRect.top >= e.strip.top - 0.5 && e.textRect.bottom <= e.strip.bottom + 0.5,
      aboveContent: e.winTop >= e.strip.bottom - 0.5,
      pointer: e.pointer,
      sparks: e.sparks,
      sheetOpen: e.sheet,
      scrollTop: Math.round(e.scrollTop),
      scrollMax: Math.round(e.scrollHeight - e.clientHeight),
    })),
    shot: shotName && expect === 1 ? shotName : undefined,
    shotBytes: shotBytes ?? undefined,
    note: opts.note,
  };
  ctx.records.push(rec);
  return rec;
}

export function problems(rec) {
  const p = [];
  if (!rec.ok) p.push(`kỳ vọng ${rec.expect} đợt khen, thực tế ${rec.actual}`);
  if (!rec.layoutStable) p.push('dải khen/khung bài đổi vị trí hoặc cỡ');
  for (const e of rec.events) {
    if (!e.inViewport) p.push('lời khen không nằm trọn trong khung nhìn');
    if (!e.aboveContent) p.push('dải khen chồng lên vùng bài');
    if (e.pointer !== 'none') p.push('dải khen bắt chuột/chạm');
  }
  return p;
}
