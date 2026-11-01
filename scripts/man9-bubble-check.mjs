/**
 * Kiểm màn 9 "Bắn trứng khắc dấu" bằng Chrome thật (puppeteer-core): chơi bằng chuột ở 1366×768 và 1920×1080, bằng chạm giả lập ở 360×800.
 * Cần máy chủ dev của hub: cd apps/hub && VITE_MERGED=true VITE_ASSETS_URL=http://localhost:5180 npx vite --port 5273 --strictPort
 * Chạy: node scripts/man9-bubble-check.mjs   (URL=... đổi địa chỉ; CHROME=... đổi đường dẫn Chrome)
 * Mỗi ca in ✓ hoặc ✗; ảnh JPEG dưới 300 KB lưu ở docs/screenshots/man9-bubble/. Thoát mã 1 nếu có ca hỏng.
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.URL || 'http://localhost:5273';
const OUT = 'docs/screenshots/man9-bubble';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(tag, name, ok, detail = '') {
  results.push({ tag, name, ok: Boolean(ok), detail });
  console.log(`   ${ok ? '✓' : '✗'} [${tag}] ${name}${detail ? ` (${detail})` : ''}`);
}

const pub = (x) => {
  let r = 1;
  for (let i = 0; i < x; i++) r = (r * 5) % 23;
  return r;
};

function makeCookie() {
  const lv = {};
  for (let i = 1; i < 9; i++) {
    const isLesson = i === 1 || i === 4 || i === 7;
    lv[String(i)] = isLesson ? [1, 1, 3, 3, 3] : [1, 1, 3, 100];
  }
  return { v: 1, lv, gp: 3, c: 50, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 4095, hd: 2147483647, vs: 15, vi: 15 };
}

async function shot(page, tag, name) {
  const file = `${OUT}/${tag}-${name}.jpg`;
  for (const quality of [62, 48, 36]) {
    await page.screenshot({ path: file, type: 'jpeg', quality });
    if (statSync(file).size < 300 * 1024) break;
  }
  const kb = Math.round(statSync(file).size / 1024);
  check(tag, `ảnh ${name}.jpg dưới 300 KB`, kb < 300, `${kb} KB`);
}

class Ctx {
  constructor(page, size) {
    this.page = page;
    this.size = size;
    this.tag = size.name;
  }
  async tap(handleOrPoint) {
    let x;
    let y;
    if (Array.isArray(handleOrPoint)) [x, y] = handleOrPoint;
    else {
      await handleOrPoint.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
      const b = await handleOrPoint.boundingBox();
      x = b.x + b.width / 2;
      y = b.y + b.height / 2;
    }
    if (this.size.touch) await this.page.touchscreen.tap(x, y);
    else await this.page.mouse.click(x, y);
  }
  async $(sel) {
    return this.page.$(sel);
  }
  async click(sel) {
    const h = await this.page.waitForSelector(sel, { timeout: 15000 });
    await this.tap(h);
  }
  eval(fn, ...args) {
    return this.page.evaluate(fn, ...args);
  }
}

async function open(browser, size, { skipTutorial = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('   pageerror:', e.message));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((c) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(c))}; path=/`;
  }, makeCookie());
  await page.goto(`${BASE}/lang/lang-khac-dau/man/9`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="the-bat-dau"]', { timeout: 40000 });
  await sleep(500);
  const ctx = new Ctx(page, size);
  const startBtn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('[data-testid="nut-the-bat-dau"] button')).find((b) => /Bắt đầu/i.test(b.textContent || '')) || null);
  if (!startBtn.asElement()) throw new Error('Không thấy nút Bắt đầu');
  await ctx.tap(startBtn.asElement());
  await page.waitForSelector('[data-testid="man9"]', { timeout: 20000 });
  await sleep(600);
  if (skipTutorial) {
    const skip = await page.waitForSelector('[data-testid="tutorial-tooltip"] button', { timeout: 8000 }).catch(() => null);
    if (skip) {
      const btn = await page.evaluateHandle(() => Array.from(document.querySelectorAll('[data-testid="tutorial-tooltip"] button')).find((b) => /Bỏ qua/.test(b.textContent || '')) || null);
      await ctx.tap(btn.asElement());
      await sleep(300);
    }
  }
  return ctx;
}

/** Mã chạy trong trang: tìm phát bắn theo mục tiêu ('pop': nhiều trứng vỡ nhất, 'drop': nhiều trứng rơi nhất, 'none': không vỡ gì) */
const PAGE_BEST = () => {
  window.__setBoard = (rows) => {
    const s = window.__bubble;
    s.board = rows.map((row, r) => Array.from({ length: (r + s.shift) % 2 === 0 ? 10 : 9 }, (_, c) => row[c] ?? null));
  };
  window.__best = (goal) => {
    const s = window.__bubble;
    const api = window.__bubbleApi;
    const values = api.planOf(s).values;
    const present = api.presentValues(s);
    const width = (r) => ((r + s.shift) % 2 === 0 ? 10 : 9);
    let best = null;
    for (let a = 12; a <= 168; a += 1) {
      const path = api.tracePath(s, a);
      const cell = api.snapCell(s, path[path.length - 1]);
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        if (!present.has(v)) continue;
        while (s.board.length <= cell.r) s.board.push(new Array(width(s.board.length)).fill(null));
        s.board[cell.r][cell.c] = v;
        const group = api.groupAt(s, cell.r, cell.c);
        let pop = 0;
        let drop = 0;
        if (group.length >= 3) {
          pop = group.length;
          const saved = group.map((g) => [g, s.board[g.r][g.c]]);
          for (const g of group) s.board[g.r][g.c] = null;
          const anchored = api.anchoredSet(s);
          for (let r = 0; r < s.board.length; r++) for (let c = 0; c < s.board[r].length; c++) if (s.board[r][c] !== null && !anchored.has(r * 32 + c)) drop++;
          for (const [g, val] of saved) s.board[g.r][g.c] = val;
        }
        s.board[cell.r][cell.c] = null;
        const score = goal === 'pop' ? pop : goal === 'drop' ? drop * 100 + pop : pop === 0 ? 1 : -1;
        if (!best || score > best.score) best = { score, type: i, angle: a, pop, drop };
      }
    }
    while (s.board.length > 0 && s.board[s.board.length - 1].every((x) => x === null)) s.board.pop();
    return best;
  };
};

async function setupPage(ctx) {
  await ctx.eval(PAGE_BEST);
}

/** Điều khiển ngắm và bắn bằng chuột thật (hay chạm) tới góc `angle` */
async function aimAndFire(ctx, angle) {
  const p = await ctx.eval((a) => {
    const f = window.__bubbleUi.fit;
    const l = window.__bubbleApi.launcherPoint();
    const c = document.querySelector('[data-testid="ban-trung"]').getBoundingClientRect();
    const r = (a * Math.PI) / 180;
    return { x: c.left + f.ox + (l.x + 3.5 * Math.cos(r)) * f.scale, y: c.top + f.oy + (l.y - 3.5 * Math.sin(r)) * f.scale };
  }, angle);
  if (ctx.size.touch) {
    const l = await ctx.eval(() => {
      const f = window.__bubbleUi.fit;
      const l = window.__bubbleApi.launcherPoint();
      const c = document.querySelector('[data-testid="ban-trung"]').getBoundingClientRect();
      return { x: c.left + f.ox + l.x * f.scale, y: c.top + f.oy + l.y * f.scale - 30 };
    });
    await ctx.page.touchscreen.touchStart(l.x, l.y);
    await ctx.page.touchscreen.touchMove(p.x, p.y);
    await sleep(80);
    await ctx.page.touchscreen.touchEnd();
  } else {
    await ctx.page.mouse.move(p.x - 40, p.y + 40);
    await ctx.page.mouse.move(p.x, p.y, { steps: 6 });
    await sleep(120);
    await ctx.page.mouse.down();
    await ctx.page.mouse.up();
  }
}

const st = (ctx) => ctx.eval(() => ({ shots: window.__bubble.stats.shots, popped: window.__bubble.stats.popped, dropped: window.__bubble.stats.dropped, hearts: window.__bubble.hearts, lowered: window.__bubble.lowered, phase: window.__bubble.phase, flying: !!window.__bubble.flying, selected: window.__bubble.selected, round: window.__bubble.round, left: window.__bubble.shotsSinceDescent, failed: window.__bubble.load.failed, picked: window.__bubble.load.picked.length }));
async function settle(ctx) {
  for (let i = 0; i < 40; i++) {
    await sleep(100);
    if (!(await st(ctx)).flying) break;
  }
  await sleep(250);
}

async function selectTypeBtn(ctx, index) {
  const h = await ctx.page.$(`[data-testid="nut-loai"][data-index="${index}"]`);
  await ctx.tap(h);
  await sleep(150);
}

/** Nạp trứng (đợt hiện tại): chọn sai trước nếu `wrongFirst` */
async function loadRound(ctx, { wrongFirst = false } = {}) {
  const keys = await ctx.eval(() => Array.from(document.querySelectorAll('[data-testid="khoa-muc"]')).map((e) => Number(e.getAttribute('data-key'))));
  const good = new Set(keys.map(pub));
  const eggs = await ctx.eval(() => Array.from(document.querySelectorAll('[data-testid="trung-khay"]')).map((e) => Number(e.getAttribute('data-value'))));
  let wrongOk = true;
  if (wrongFirst) {
    const bad = eggs.find((v) => !good.has(v));
    await ctx.tap(await ctx.page.$(`[data-testid="trung-khay"][data-value="${bad}"]`));
    await sleep(350);
    const txt = await ctx.eval(() => document.querySelector('[data-testid="nap-thong-bao"]').textContent);
    const s = await st(ctx);
    wrongOk = /Chưa đúng/.test(txt) && s.failed && s.picked === 0;
    check(ctx.tag, 'nạp sai: trứng bật ra, báo "Chưa đúng", đợt mất thưởng nạp, chưa vào máy bắn', wrongOk, txt.slice(0, 60));
    await shot(ctx.page, ctx.tag, 'nap-sai');
  }
  let first = true;
  for (const v of eggs.filter((e) => good.has(e))) {
    await ctx.tap(await ctx.page.$(`[data-testid="trung-khay"][data-value="${v}"]`));
    await sleep(first ? 120 : 330);
    if (first) await shot(ctx.page, ctx.tag, 'nap-giua-chung');
    first = false;
    await sleep(250);
  }
  const s = await st(ctx);
  check(ctx.tag, 'nạp đúng: mọi trứng đúng vào máy bắn, nút "Bắt đầu đợt" mở', s.picked === keys.length && (await ctx.eval(() => !document.querySelector('[data-testid="nut-bat-dau"]').disabled)), `${s.picked}/${keys.length}`);
  return keys;
}

async function playScenarios(ctx) {
  const tag = ctx.tag;
  const page = ctx.page;
  await setupPage(ctx);
  const layout = await ctx.eval(() => {
    const r = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    return { board: r('[data-testid="man9-khung"]'), vw: innerWidth, vh: innerHeight };
  });
  console.log(`   bố cục ${tag}:`, JSON.stringify(layout));
  const ratio = layout.board ? layout.board.w / layout.vw : 0;
  if (!ctx.size.touch && ctx.size.w >= 1000) check(tag, 'cột bàn trứng khoảng 40 đến 45% chiều rộng', ratio >= 0.38 && ratio <= 0.47, `${(ratio * 100).toFixed(1)}%`);
  else check(tag, 'bàn trứng rộng gần hết màn (khung dọc)', ratio >= 0.9, `${(ratio * 100).toFixed(1)}%`);
  const noScrollX = await ctx.eval(() => document.documentElement.scrollWidth <= innerWidth + 1);
  check(tag, 'không cuộn ngang', noScrollX);
  await shot(page, tag, 'nap-dau');

  // ---- nạp sai rồi đúng
  const keys = await loadRound(ctx, { wrongFirst: true });
  const smallBtn = await ctx.eval(() => Array.from(document.querySelectorAll('[data-testid="trung-khay"]')).every((b) => b.getBoundingClientRect().width >= 44 && b.getBoundingClientRect().height >= 44));
  check(tag, 'trứng ở khay nạp là nút ≥ 44 px', smallBtn);
  await shot(page, tag, 'nap-dung');
  await ctx.click('[data-testid="nut-bat-dau"]');
  await page.waitForSelector('[data-testid="ban-trung"]', { timeout: 8000 });
  await sleep(500);
  await setupPage(ctx);
  let s = await st(ctx);
  check(tag, 'sau khi bắt đầu đợt: đang chơi, bàn 5 hàng, chưa chọn loại trứng', s.phase === 'play' && s.selected === null && (await ctx.eval(() => window.__bubble.board.length)) === 5);
  const clean0 = await ctx.eval(() => window.__bubble.stats.cleanLoads);
  check(tag, 'đợt nạp có sai thì không được thưởng nạp', clean0 === 0);
  await shot(page, tag, 'ban-moi');

  // ---- chưa chọn trứng thì không bắn được
  const shotsBefore = (await st(ctx)).shots;
  await aimAndFire(ctx, 80);
  await sleep(500);
  s = await st(ctx);
  const nudgeShown = await ctx.eval(() => !!document.querySelector('[data-testid="loi-noi"]'));
  const banLocked = await ctx.eval(() => document.querySelector('[data-testid="nut-ban"]').getAttribute('aria-disabled') === 'true');
  check(tag, 'chưa chọn loại trứng: bấm bàn không bắn, nút bắn khóa, có lời nhắc', s.shots === shotsBefore && banLocked && nudgeShown, `shots=${s.shots}`);
  await shot(page, tag, 'chua-chon');
  const typeBtnOk = await ctx.eval(() => Array.from(document.querySelectorAll('[data-testid="nut-loai"]')).every((b) => b.getBoundingClientRect().width >= 44 && b.getBoundingClientRect().height >= 44));
  check(tag, 'nút chọn loại trứng và nút Bắn ≥ 44 px', typeBtnOk && (await ctx.eval(() => { const b = document.querySelector('[data-testid="nut-ban"]').getBoundingClientRect(); return b.width >= 44 && b.height >= 44; })));

  // ---- bàn dựng sẵn: nổ cụm
  await ctx.eval(() => {
    const s = window.__bubble;
    const v = window.__bubbleApi.planOf(s).values;
    window.__setBoard([[v[0], v[0], null, v[1], v[2], v[1], v[2], v[1], v[2], v[1]], [v[1], v[2], v[1], v[2], v[1], v[2], v[1], v[2], null]]);
    s.shotsSinceDescent = 0;
  });
  await ctx.eval(() => window.__bubbleApi && 0);
  let best = await ctx.eval(() => window.__best('pop'));
  check(tag, 'bàn thử có phát bắn làm vỡ cụm', best && best.pop >= 3, JSON.stringify(best));
  await selectTypeBtn(ctx, best.type);
  s = await st(ctx);
  check(tag, 'chọn loại trứng ở khay: máy bắn đã nạp (selected)', s.selected === best.type);
  const p0 = (await st(ctx)).popped;
  await aimAndFire(ctx, best.angle);
  await settle(ctx);
  s = await st(ctx);
  check(tag, 'bắn nổ cụm: trứng vỡ tăng (trứng bắn không tính)', s.popped >= p0 + best.pop - 1 && s.shots === shotsBefore + 1, `popped=${s.popped}`);
  await shot(page, tag, 'no-cum');

  // ---- trứng rơi
  await ctx.eval(() => {
    const s = window.__bubble;
    const v = window.__bubbleApi.planOf(s).values;
    window.__setBoard([[v[0], v[0], null, null, null, null, null, null, null, v[1]], [v[1]], [v[2]], [v[1]]]);
    s.selected = null;
  });
  best = await ctx.eval(() => window.__best('drop'));
  check(tag, 'bàn thử có phát bắn làm trứng rơi', best && best.drop >= 2, JSON.stringify(best));
  await selectTypeBtn(ctx, best.type);
  const d0 = (await st(ctx)).dropped;
  await aimAndFire(ctx, best.angle);
  await sleep(180);
  await shot(page, tag, 'trung-roi-dang-bay');
  await settle(ctx);
  s = await st(ctx);
  check(tag, 'trứng không còn nối với trần thì rơi (đếm trứng rơi tăng)', s.dropped >= d0 + best.drop, `dropped=${s.dropped}`);

  // ---- hạ bàn sau đủ phát
  s = await st(ctx);
  check(tag, 'sau phát làm trứng rơi ván vẫn đang chơi (để kiểm tiếp hạ bàn, mất tim)', s.phase === 'play', s.phase);
  await ctx.eval(() => {
    const s = window.__bubble;
    if (s.phase !== 'play') return;
    const v = window.__bubbleApi.planOf(s).values;
    window.__setBoard([[v[0], v[1], v[2], v[0], v[1], v[2], v[0], v[1], v[2], v[0]], [v[1], v[2], v[0], v[1], v[2], v[0], v[1], v[2], null]]);
    s.shotsSinceDescent = s.spec.rounds[s.round].descendEvery - 1;
    s.selected = null;
  });
  s = await st(ctx);
  if (s.phase === 'play') {
    best = await ctx.eval(() => window.__best('none'));
    await selectTypeBtn(ctx, best.type);
    const l0 = (await st(ctx)).lowered;
    await aimAndFire(ctx, best.angle);
    await settle(ctx);
    s = await st(ctx);
    const haText = await ctx.eval(() => document.querySelector('[data-testid="ha-ban"]').getAttribute('data-left'));
    check(tag, 'đủ 8 phát thì cả bàn hạ 1 hàng và bộ đếm quay về 8', s.lowered === l0 + 1 && haText === '8', `lowered=${s.lowered} còn=${haText}`);
    await shot(page, tag, 'ha-ban');

    // ---- chạm dây: mất tim
    await ctx.eval(() => {
      const s = window.__bubble;
      const v = window.__bubbleApi.planOf(s).values;
      window.__setBoard([[v[0], v[1], v[2]], [v[1], v[2]], [v[2], v[0], v[1]]]);
      s.lowered = s.spec.limitRow - 2;
      s.selected = null;
      s.shotsSinceDescent = 0;
    });
    best = await ctx.eval(() => window.__best('none'));
    await selectTypeBtn(ctx, best.type);
    const h0 = (await st(ctx)).hearts;
    await aimAndFire(ctx, best.angle);
    await settle(ctx);
    s = await st(ctx);
    const rows = await ctx.eval(() => window.__bubble.board.length);
    check(tag, 'trứng chạm dây giới hạn: mất 1 tim, 2 hàng dưới cùng được dọn, chơi tiếp', s.hearts === h0 - 1 && rows <= 1 && s.phase === 'play', `tim=${s.hearts} hàng=${rows}`);
    await shot(page, tag, 'mat-tim');
  }

  // ---- "?" dừng thật
  s = await st(ctx);
  if (s.phase === 'play') {
    await ctx.eval(() => {
      const s = window.__bubble;
      const v = window.__bubbleApi.planOf(s).values;
      window.__setBoard([[v[0], v[1], v[2], v[0], v[1], v[2], v[0], v[1], v[2], v[0]]]);
      s.lowered = 0;
      s.selected = 0;
    });
    await ctx.click('[data-testid="nut-goi-y"]');
    await page.waitForSelector('[data-testid="hop-goi-y"]', { timeout: 8000 });
    const t1 = await ctx.eval(() => window.__bubbleView.time);
    await sleep(900);
    const t2 = await ctx.eval(() => window.__bubbleView.time);
    check(tag, 'mở "?": đồng hồ hoạt cảnh đứng yên (tạm dừng thật)', Math.abs(t2 - t1) < 0.001, `${t1.toFixed(3)} → ${t2.toFixed(3)}`);
    const hintText = await ctx.eval(() => document.querySelector('[data-testid="viec-cua-em"]').textContent);
    check(tag, 'câu nhắc không lộ số trứng đúng', !/\b(10|20|8|17|11)\b.*đúng/.test(hintText), hintText.slice(0, 80));
    const shotsH = (await st(ctx)).shots;
    await ctx.eval(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2', key: '2' }));
    });
    await sleep(200);
    const afterKeys = await st(ctx);
    check(tag, 'đang mở "?" thì bắn và đổi loại trứng không được (phím Space và 2 bị bỏ qua)', afterKeys.shots === shotsH && afterKeys.selected === 0 && !afterKeys.flying);
    await shot(page, tag, 'hop-goi-y');
    const cont = await page.evaluateHandle(() => Array.from(document.querySelectorAll('[data-testid="hop-goi-y"] button')).find((b) => /Chơi tiếp/.test(b.textContent || '')) || null);
    await ctx.tap(cont.asElement());
    await sleep(500);
    const t3 = await ctx.eval(() => window.__bubbleView.time);
    const info = await ctx.eval(() => ({ hint: !!document.querySelector('[data-testid="hop-goi-y"]'), vis: document.visibilityState, phase: window.__bubble.phase, dialogs: document.querySelectorAll('[role="dialog"]').length }));
    check(tag, 'bấm "Chơi tiếp": đồng hồ chạy lại', t3 > t2 + 0.2, `t2=${t2.toFixed(2)} t3=${t3.toFixed(2)} ${JSON.stringify(info)}`);
  }
}

async function tutorialRun(browser, size) {
  const tag = `${size.name}-huong-dan`;
  const ctx = await open(browser, size, { skipTutorial: false });
  ctx.tag = tag;
  await setupPage(ctx);
  const page = ctx.page;
  await page.waitForSelector('[data-testid="tutorial-tooltip"]', { timeout: 8000 });
  check(tag, 'hướng dẫn làm thử tự mở khi vào ván đầu', true);
  await shot(page, tag, 'buoc-0');
  const clickTooltip = async (re) => {
    const b = await page.evaluateHandle((src) => Array.from(document.querySelectorAll('[data-testid="tutorial-tooltip"] button')).find((x) => new RegExp(src).test(x.textContent || '')) || null, re);
    if (!b.asElement()) throw new Error(`Không thấy nút ${re}`);
    await ctx.tap(b.asElement());
    await sleep(350);
  };
  await clickTooltip('Bắt đầu làm thử');
  // bước 1: chọn một trứng đúng ở khay nạp (bàn mẫu riêng)
  const keys = await ctx.eval(() => Array.from(document.querySelectorAll('[data-testid="khoa-muc"]')).map((e) => Number(e.getAttribute('data-key'))));
  const good = pub(keys[0]);
  await shot(page, tag, 'buoc-1');
  await ctx.tap(await page.$(`[data-testid="trung-khay"][data-value="${good}"]`));
  await sleep(500);
  check(tag, 'bước nạp: chọn đúng 1 trứng thì hiện nút Tiếp tục', await ctx.eval(() => /Tiếp tục/.test(document.querySelector('[data-testid="tutorial-tooltip"]').textContent || '')));
  await clickTooltip('Tiếp tục');
  // bước 2: chọn trứng ở máy bắn
  await page.waitForSelector('[data-testid="nut-loai"]', { timeout: 5000 });
  await shot(page, tag, 'buoc-2');
  await ctx.tap(await page.$('[data-testid="nut-loai"][data-index="0"]'));
  await sleep(400);
  await clickTooltip('Tiếp tục');
  // bước 3: ngắm
  await shot(page, tag, 'buoc-3');
  await clickTooltip('Thử tính ngay');
  // bước 4: bắn thử một phát (nút hỗ trợ)
  await shot(page, tag, 'buoc-4');
  const before = await ctx.eval(() => window.__bubble.stats.shots);
  await ctx.tap(await page.waitForSelector('[data-testid="nut-ban-thu"]'));
  await sleep(1400);
  const after = await ctx.eval(() => ({ shots: window.__bubble.stats.shots, text: document.querySelector('[data-testid="tutorial-tooltip"]').textContent || '' }));
  check(tag, 'bắn thử 1 phát trên bàn mẫu nhỏ rồi sang bước kết', after.shots === before + 1 && /Bắt đầu chơi thật/.test(after.text));
  await shot(page, tag, 'buoc-5');
  await clickTooltip('Bắt đầu chơi thật');
  await sleep(500);
  const real = await ctx.eval(() => ({ phase: window.__bubble.phase, round: window.__bubble.round, shots: window.__bubble.stats.shots, popped: window.__bubble.stats.popped, picked: window.__bubble.load.picked.length, score: document.querySelector('[data-testid="diem"]')?.textContent }));
  check(tag, 'ván thật không bị cộng điểm hay tiến độ từ bước làm thử', real.phase === 'load' && real.round === 0 && real.shots === 0 && real.popped === 0 && real.picked === 0, JSON.stringify(real));
  await page.close();
}

async function autoCompleteRun(browser, size) {
  const tag = `${size.name}-tu-hoan-thanh`;
  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((c) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(c))}; path=/`;
  }, makeCookie());
  await page.goto(`${BASE}/lang/lang-khac-dau/man/9`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="the-bat-dau"]', { timeout: 40000 });
  await sleep(500);
  const btn = await page.$('[data-testid="nut-tu-hoan-thanh"]');
  if (!btn) {
    check(tag, 'có nút Tự hoàn thành cả màn trên thẻ bắt đầu (bản dev)', false);
  } else {
    check(tag, 'có nút Tự hoàn thành cả màn trên thẻ bắt đầu (bản dev)', true);
    const b = await btn.boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    const ok = await page.waitForSelector('[data-testid="da-tu-hoan-thanh"]', { timeout: 8000 }).then(() => true).catch(() => false);
    check(tag, 'Tự hoàn thành: hiện khung "đã tự hoàn thành" (không điểm)', ok);
    await shot(page, tag, 'tu-hoan-thanh');
  }
  await page.close();
}

const SIZES = [
  { w: 1366, h: 768, touch: false, name: '1366x768' },
  { w: 1920, h: 1080, touch: false, name: '1920x1080' },
  { w: 360, h: 800, touch: true, name: '360x800' },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu-vsync'] });
try {
  for (const size of SIZES) {
    console.log(`\n=== ${size.name} (${size.touch ? 'chạm giả lập' : 'chuột'}) ===`);
    const ctx = await open(browser, size);
    await playScenarios(ctx);
    await ctx.page.close();
  }
  console.log('\n=== Hướng dẫn làm thử (P8) ===');
  await tutorialRun(browser, SIZES[0]);
  console.log('\n=== Tự hoàn thành ===');
  await autoCompleteRun(browser, SIZES[0]);
} catch (e) {
  check('script', 'chạy hết không lỗi', false, String(e?.stack || e).split('\n').slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

const bad = results.filter((r) => !r.ok);
writeFileSync(`${OUT}/ket-qua-kiem.json`, JSON.stringify({ ngay: new Date().toISOString(), tong: results.length, hong: bad.length, ca: results }, null, 2));
console.log(`\nTổng ${results.length} ca, hỏng ${bad.length}`);
for (const r of bad) console.log(`   ✗ [${r.tag}] ${r.name} ${r.detail}`);
process.exit(bad.length ? 1 : 0);
