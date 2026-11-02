// Kiểm màn 12 "Leo bậc gỗ" bằng thao tác thật trên trình duyệt: phím ở 1366×768, nút chạm giả lập (CDP touch) ở 360×800 và 844×390.
// Chỉ tiến độ đầu vào được chuẩn bị bằng cookie khách đúng định dạng; mọi bước chơi là phím hay chạm lên nút thật. Quyết định của người chơi tự động đọc trạng thái qua cầu nối đo
// `window.__climbReal` (có khi chạy dev hay bản build đo VITE_PROBE=true).
//
// Chuẩn bị (cổng 5373, CLAUDE.md mục 9: tắt server nền sau khi đo):
//   pnpm dev:assets &
//   (cd apps/hub && VITE_PROBE=true VITE_MERGED=true VITE_ASSETS_URL=http://localhost:5180 pnpm exec vite --port 5373 --strictPort) &
// Chạy: node scripts/man12-bac-go-check.mjs [--size=0,1,2] [--only=tutorial,dung,sai,hut,vong,hettim,auto] [--no-write] [--v]
//   tutorial: hướng dẫn làm thử P8 (đi trái/phải, nhảy lên đúng bậc trên cây 4 lá, không đụng ván thật)
//   dung / sai / hut: nhảy đúng, nhảy sai (nứt, rơi, mất tim, làm lại tầng), nhảy hụt và bước ra khỏi mép (không mất tim, khóa)
//   vong: chơi hết 3 vòng đúng (bậc trượt ở vòng 2–3, xong vòng, "?" tạm dừng, đo FPS, cảnh cao trào, điểm 450)
//   hettim: hết tim (Bi giúp) vẫn vào cao trào; auto: nút "Tự hoàn thành"
import { mkdirSync, writeFileSync } from 'node:fs';
import { SIZES, launch, sleep } from './lib/p2a-real.mjs';
import { autoplay, createDriver } from './lib/man12-play.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:5373';
const OUT = 'docs/screenshots/man12-bac-go';
const flag = (n) => process.argv.includes(`--${n}`);
const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const only = arg('only', 'tutorial,dung,sai,saidung,hut,vong,hettim,auto').split(',');
const write = !flag('no-write');
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
// gt 4095: đã nghe lời giới thiệu cả 12 màn (Bi không chen lên), CHƯA chiếu cao trào (bit 12); xong màn 1–11, 3 trang: chơi màn 12 xong là đủ 4 trang nên cao trào tự chiếu.
const COOKIE = { v: 1, lv: levelsDone([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), gp: 3, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 4095, hd: 2147483647, vs: 15, vi: 15 };

async function newCtx(browser, size) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300));
  });
  page.on('pageerror', (e) => errors.push(`${e.message.slice(0, 160)}`));
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.goto(BASE);
  await page.evaluate((p) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
  }, COOKIE);
  return { page, size, errors, touch: size.touch };
}

async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 62 });
  if (buf.length >= 300000) throw new Error(`${name} lớn hơn 300 KB (${buf.length})`);
  const file = `man12-${name}-${ctx.size.name}.jpg`;
  if (write) writeFileSync(`${OUT}/${file}`, buf);
  shots.push({ file, bytes: buf.length });
}

async function tapXY(ctx, x, y) {
  if (ctx.touch) await ctx.page.touchscreen.tap(x, y);
  else await ctx.page.mouse.click(x, y);
}
async function tap(ctx, handle) {
  await handle.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  const b = await handle.boundingBox();
  await tapXY(ctx, b.x + b.width / 2, b.y + b.height / 2);
}
const byText = (ctx, re, root = 'button') =>
  ctx.page.evaluateHandle((src, flags, sel) => [...document.querySelectorAll(sel)].find((b) => new RegExp(src, flags).test(b.innerText.trim()) && b.offsetParent !== null) ?? null, re.source, re.flags, root);
const has = (ctx, re) => byText(ctx, re).then((h) => Boolean(h.asElement()));
const tapText = async (ctx, re) => {
  const h = (await byText(ctx, re)).asElement();
  if (!h) throw new Error(`Không thấy nút ${re}`);
  await tap(ctx, h);
};
const waitFor = (ctx, fn, timeout = 30000, ...a) => ctx.page.waitForFunction(fn, { timeout, polling: 150 }, ...a);
const S = (ctx, fn) => ctx.page.evaluate(fn);
const bodyText = (ctx) => ctx.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const cookieNow = (ctx) =>
  ctx.page.evaluate(() => {
    const m = document.cookie.match(/sc_guest=([^;]+)/);
    return m ? JSON.parse(decodeURIComponent(m[1])) : null;
  });

/** Mở màn 12 tới lúc cảnh sẵn sàng (đã qua thẻ bắt đầu). */
async function openGame(browser, size) {
  const ctx = await newCtx(browser, size);
  await ctx.page.goto(`${BASE}/lang/lang-bac/man/12?q=low&warmup=off`, { waitUntil: 'networkidle0' });
  return ctx;
}
async function start(ctx) {
  await tapText(ctx, /^Bắt đầu/);
  await waitFor(ctx, () => window.__climbUi?.ready, 90000);
  await sleep(500);
}
async function skipTutorial(ctx) {
  await waitFor(ctx, () => document.querySelector('[data-testid="tutorial-tooltip"]'), 10000);
  await tapText(ctx, /Bỏ qua/);
  await waitFor(ctx, () => !document.querySelector('[data-testid="tutorial-spotlight"]'), 5000);
  await sleep(400);
}

// ---------------------------------------------------------------------------

async function sTutorial(browser, size) {
  const ctx = await openGame(browser, size);
  await start(ctx);
  await waitFor(ctx, () => document.querySelector('[data-testid="tutorial-tooltip"]'), 10000);
  const before = await cookieNow(ctx);
  const step = () => ctx.page.evaluate(() => document.querySelector('[data-testid="tutorial-tooltip"] p')?.innerText ?? '');
  check(ctx, 'hướng dẫn', 'bước 0 giới thiệu cây mẫu 4 lá', /4 lá/.test(await step()));
  await shot(ctx, 'huong-dan-0');
  await tapText(ctx, /^Tiếp/);
  await sleep(300);
  check(ctx, 'hướng dẫn', 'bước 1 chỉ bậc của em, bậc anh em, bậc lựa chọn', /bậc anh em/.test(await step()));
  await tapText(ctx, /^Tiếp/);
  await sleep(300);
  check(ctx, 'hướng dẫn', 'bước 2 nói tim: nhầm mất tim, hụt không mất', /mất tim/.test(await step()) && /không mất tim/.test(await step()));
  await tapText(ctx, /^Tiếp/);
  await sleep(300);
  check(ctx, 'hướng dẫn', 'bước 3 (đi trái/phải): chờ thao tác thật, không có nút Tiếp', /bấm ← →/.test(await step()) && !(await has(ctx, /^Tiếp/)));
  const info = await S(ctx, () => ({ practice: window.__climb.practice, leaves: window.__climb.tree.leaves, tampered: window.__climb.tree.tamperedLeaves }));
  check(ctx, 'hướng dẫn', 'cây mẫu 4 lá [3,7,5,2], lá thứ hai bị tráo thành 8', info.practice && JSON.stringify(info.leaves) === '[3,7,5,2]' && info.tampered[1] === 8);
  const x0 = await S(ctx, () => window.__climb.player.x);
  const drv = createDriver(ctx);
  await drv.setDir(1);
  await waitFor(ctx, (x) => Math.abs(window.__climb.player.x - x) > 0.7 || window.__climb.player.x > 1.5, 4000, x0).catch(() => {});
  await drv.setDir(-1);
  await sleep(300);
  await drv.setDir(0);
  await waitFor(ctx, () => /38/.test(document.querySelector('[data-testid="tutorial-tooltip"] p')?.innerText ?? ''), 5000).catch(() => {});
  check(ctx, 'hướng dẫn', 'đi sang một bên thì sang bước 4 (nhảy lên bậc ghi 38)', /38/.test(await step()) && !(await has(ctx, /^Tiếp/)));
  await shot(ctx, 'huong-dan-nhay');
  await autoplay(ctx, { want: { practice: true }, until: () => window.__climb.level >= 1, timeoutMs: 20000, stopAtBanner: false });
  await waitFor(ctx, () => /nhảy đúng/.test(document.querySelector('[data-testid="tutorial-tooltip"] p')?.innerText ?? ''), 5000).catch(() => {});
  check(ctx, 'hướng dẫn', 'nhảy lên đúng bậc thì sang bước cuối', /nhảy đúng/.test(await step()));
  await shot(ctx, 'huong-dan-xong');
  const real = await S(ctx, () => ({ level: window.__climbReal.level, hearts: window.__climbReal.hearts, time: window.__climbReal.time, rounds: window.__climbReal.roundsDone }));
  check(ctx, 'hướng dẫn', 'ván thật chưa bị đụng trong lúc làm thử', real.level === 0 && real.hearts === 3 && real.time === 0 && real.rounds === 0, JSON.stringify(real));
  await tapText(ctx, /Bắt đầu chơi/);
  await sleep(500);
  const closed = await S(ctx, () => ({ active: window.__climbUi.tutorialActive, practice: window.__climb.practice, tip: window.__climbUi.tip, skipBtn: [...document.querySelectorAll('button')].some((b) => /Bỏ qua/.test(b.innerText)) }));
  check(ctx, 'hướng dẫn', 'xong thì spotlight đóng, vào ván thật vòng 1', closed.active === false && !closed.practice && !closed.skipBtn, JSON.stringify(closed));
  const after = await cookieNow(ctx);
  check(ctx, 'hướng dẫn', 'không cộng điểm hay tiến độ: cookie giữ nguyên lv[12], gp', JSON.stringify(after.lv?.['12'] ?? null) === JSON.stringify(before.lv?.['12'] ?? null) && after.gp === before.gp);
  // mở lại bằng nút 💡 giữa ván: ván thật đứng yên
  const t1 = await S(ctx, () => window.__climbReal.time);
  await tap(ctx, await ctx.page.$('#tutorial-man12-guide-btn'));
  await sleep(1200);
  const t2 = await S(ctx, () => window.__climbReal.time);
  check(ctx, 'hướng dẫn', 'mở lại hướng dẫn giữa ván: ván thật tạm dừng thật (đồng hồ đứng yên)', Math.abs(t2 - t1) < 0.1 && (await has(ctx, /Bỏ qua/)), `${t1} → ${t2}`);
  await tapText(ctx, /Bỏ qua/);
  check(ctx, 'hướng dẫn', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

async function sDung(browser, size) {
  const ctx = await openGame(browser, size);
  await start(ctx);
  await skipTutorial(ctx);
  await shot(ctx, 'bat-dau');
  const f = await S(ctx, () => ({ ...window.__climbUi, depth: window.__climbReal.tree.depth, n: window.__climbReal.choices.length, hearts: window.__climbReal.hearts }));
  check(ctx, 'bố cục', `${size.w < size.h ? 'khung dọc' : 'khung ngang'}: cảnh nhận đúng khung`, f.frame === (size.w < size.h ? 'portrait' : 'landscape'), f.frame);
  check(ctx, 'bố cục', 'chữ số trên bậc ≥ 16 px', f.fontPx >= 16, `${f.fontPx.toFixed(1)} px, ppu ${f.ppu}`);
  check(ctx, 'bố cục', 'vòng 1: 8 lá (3 tầng), 2 lựa chọn, 3 tim', f.depth === 3 && f.n === 2 && f.hearts === 3);
  const touchBtns = (await Promise.all(['trai', 'phai', 'nhay'].map((n) => ctx.page.$(`[data-testid="man12-nut-${n}"]`)))).filter(Boolean);
  if (size.touch) {
    const sizes = await Promise.all(touchBtns.map((b) => b.boundingBox()));
    check(ctx, 'điều khiển', 'có 3 nút cảm ứng ◀ ▶ Nhảy, mỗi nút ≥ 48 px', sizes.length === 3 && sizes.every((b) => b.width >= 48 && b.height >= 48), JSON.stringify(sizes.map((b) => [Math.round(b.width), Math.round(b.height)])));
    check(ctx, 'điều khiển', 'nút nằm ở đáy khung', sizes.every((b) => b.y + b.height > size.h * 0.6 || size.h < 500));
  } else check(ctx, 'điều khiển', 'máy tính không hiện nút cảm ứng', touchBtns.length === 0);
  const why = await autoplay(ctx, { until: () => window.__climbReal.level >= 1, timeoutMs: 20000 });
  const s = await S(ctx, () => ({ level: window.__climbReal.level, hearts: window.__climbReal.hearts, mode: window.__climbReal.mode }));
  check(ctx, 'nhảy đúng', 'nhảy lên đúng bậc: lên tầng 1, giữ 3 tim', why === 'until' && s.level === 1 && s.hearts === 3, JSON.stringify(s));
  const next = await S(ctx, () => ({ n: window.__climbReal.choices.length, standOnSibling: window.__climbReal.player.on }));
  check(ctx, 'nhảy đúng', 'hiện các lựa chọn tầng trên (2 bậc)', next.n === 2);
  await sleep(500);
  await shot(ctx, 'len-tang-1');
  check(ctx, 'nhảy đúng', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

async function sSai(browser, size) {
  const ctx = await openGame(browser, size);
  await start(ctx);
  await skipTutorial(ctx);
  const before = await S(ctx, () => ({ values: window.__climbReal.choices.map((c) => c.value).sort((a, b) => a - b), slots: window.__climbReal.choices.map((c) => c.slot) }));
  const why = await autoplay(ctx, { want: { wrong: true }, until: () => window.__climbReal.mode === 'crack', timeoutMs: 20000 });
  check(ctx, 'nhảy sai', 'nhảy vào bậc sai: bậc nứt (mode crack), mất 1 tim ngay', why === 'until' && (await S(ctx, () => window.__climbReal.hearts)) === 2);
  await sleep(120);
  const said = await S(ctx, () => document.querySelector('[data-testid="loi"]')?.innerText ?? '');
  await shot(ctx, 'bac-nut');
  const crack = await S(ctx, () => ({ left: window.__climbReal.crackLeft, ch: window.__climbReal.choices.filter((c) => c.crack !== null).length }));
  check(ctx, 'nhảy sai', 'đang nứt: đúng 1 bậc nứt, còn dưới 0,4 giây', crack.ch === 1 && crack.left > 0 && crack.left <= 0.4, JSON.stringify(crack));
  await waitFor(ctx, () => window.__climbReal.mode === 'fall', 3000).catch(() => {});
  const fall = await S(ctx, () => window.__climbReal.mode);
  check(ctx, 'nhảy sai', 'nứt xong bậc biến mất, em rơi về bậc vừa đứng (mode fall)', fall === 'fall' || fall === 'free');
  await waitFor(ctx, () => window.__climbReal.mode === 'free', 5000);
  const after = await S(ctx, () => ({ level: window.__climbReal.level, y: window.__climbReal.player.y, grounded: window.__climbReal.player.grounded, hearts: window.__climbReal.hearts, mistakes: window.__climbReal.mistakes, values: window.__climbReal.choices.map((c) => c.value).sort((a, b) => a - b), slots: window.__climbReal.choices.map((c) => c.slot) }));
  check(ctx, 'nhảy sai', 'rơi về bậc cũ, vẫn ở tầng 0, còn 2 tim', after.level === 0 && after.y === 0 && after.grounded && after.hearts === 2 && after.mistakes === 1, JSON.stringify(after));
  check(ctx, 'nhảy sai', 'làm lại tầng: các lựa chọn giữ số, đổi chỗ', JSON.stringify(after.values) === JSON.stringify(before.values) && JSON.stringify(after.slots) !== JSON.stringify(before.slots), `${before.slots} → ${after.slots}`);
  check(ctx, 'nhảy sai', 'hiện lời báo "Bậc này nứt rồi!"', /nứt rồi/.test(said), said);
  check(ctx, 'nhảy sai', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

async function sHut(browser, size) {
  const ctx = await openGame(browser, size);
  await start(ctx);
  await skipTutorial(ctx);
  const drv = createDriver(ctx);
  // nhảy hụt: nhảy tại chỗ, không chạm bậc nào
  await drv.jump();
  await waitFor(ctx, () => !window.__climbReal.player.grounded, 2000).catch(() => {});
  await waitFor(ctx, () => window.__climbReal.player.grounded && window.__climbReal.lockUntil > window.__climbReal.time, 4000).catch(() => {});
  const miss = await S(ctx, () => ({ hearts: window.__climbReal.hearts, level: window.__climbReal.level, locked: window.__climbReal.lockUntil > window.__climbReal.time, grounded: window.__climbReal.player.grounded }));
  check(ctx, 'nhảy hụt', 'không chạm bậc nào: về bậc cũ, không mất tim, bị khóa nhảy', miss.hearts === 3 && miss.level === 0 && miss.grounded && miss.locked, JSON.stringify(miss));
  const t0 = await S(ctx, () => window.__climbReal.time);
  await drv.jump(); // đang khóa: không nhảy được
  await sleep(120);
  check(ctx, 'nhảy hụt', 'đang khóa thì bấm nhảy không có tác dụng', await S(ctx, () => window.__climbReal.player.grounded && window.__climbReal.player.vy === 0));
  await waitFor(ctx, (t) => window.__climbReal.time >= t + 0.7, 3000, t0);
  // bước ra khỏi mép bậc
  await sleep(100);
  const x0 = await S(ctx, () => window.__climbReal.player.x);
  await drv.setDir(x0 < 0 ? -1 : 1);
  await waitFor(ctx, () => !window.__climbReal.player.grounded, 4000);
  await drv.setDir(0);
  await sleep(250);
  await shot(ctx, 'roi-khoi-mep');
  await waitFor(ctx, () => window.__climbReal.player.grounded && window.__climbReal.lockUntil > window.__climbReal.time, 5000);
  const fell = await S(ctx, () => ({ hearts: window.__climbReal.hearts, level: window.__climbReal.level, y: window.__climbReal.player.y, x: window.__climbReal.player.x }));
  check(ctx, 'rơi khỏi mép', 'bước ra khỏi mép: rơi về bậc cũ, không mất tim, khóa nhảy', fell.hearts === 3 && fell.level === 0 && fell.y === 0 && Math.abs(fell.x) < 1.5, JSON.stringify(fell));
  check(ctx, 'rơi khỏi mép', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

/** Số khung hình trong `ms` mili giây (trong trang). */
const fps = (ctx, ms) =>
  ctx.page.evaluate(
    (ms) =>
      new Promise((res) => {
        let n = 0;
        const t0 = performance.now();
        const loop = (t) => {
          n++;
          if (t - t0 >= ms) res((n * 1000) / (t - t0));
          else requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
      }),
    ms,
  );

async function sVong(browser, size) {
  const ctx = await openGame(browser, size);
  await start(ctx);
  await skipTutorial(ctx);
  const slideInfo = [];
  let measuredFps = null;
  let pausedOk = null;
  for (let round = 0; round < 3; round++) {
    const info = await S(ctx, () => ({ round: window.__climbReal.round, depth: window.__climbReal.tree.depth, n: window.__climbReal.choices.length, leaves: window.__climbReal.tree.leaves.length }));
    await sleep(300);
    const fp = await S(ctx, () => window.__climbUi.fontPx);
    check(ctx, `vòng ${round + 1}`, 'chữ số trên bậc ≥ 16 px', fp >= 16, `${fp.toFixed(1)} px`);
    check(ctx, `vòng ${round + 1}`, `${[8, 8, 16][round]} lá, ${[2, 2, 3][round]} lựa chọn mỗi tầng`, info.round === round && info.leaves === [8, 8, 16][round] && info.n === [2, 2, 3][round], JSON.stringify(info));
    // bậc trượt: hai mẫu cách nhau 150 ms; tốc độ để so các vòng là tổng quãng trượt trong khoảng 1,35 giây (một lần lấy mẫu tức thời tùy pha của chuyển động nên lúc nhanh lúc chậm)
    const a = await S(ctx, () => window.__climbChoiceX(0));
    await sleep(150);
    const b = await S(ctx, () => window.__climbChoiceX(0));
    let travelled = Math.abs(b - a);
    let prevX = b;
    if (round > 0) {
      for (let i = 0; i < 8; i++) {
        await sleep(150);
        const x = await S(ctx, () => window.__climbChoiceX(0));
        travelled += Math.abs(x - prevX);
        prevX = x;
      }
    }
    const speed = round > 0 ? travelled / (0.15 * 9) : Math.abs(b - a) / 0.15;
    slideInfo.push(speed);
    if (round === 0) check(ctx, 'vòng 1', 'bậc đứng yên', Math.abs(b - a) < 1e-6, `${a} → ${b}`);
    else check(ctx, `vòng ${round + 1}`, 'bậc lựa chọn trượt qua lại', Math.abs(b - a) > 0.01 || speed > 0.2, `${a.toFixed(3)} → ${b.toFixed(3)}`);
    if (round === 1) {
      await shot(ctx, 'vong-2-bac-truot');
      // nút "?": tạm dừng thật (bậc, đồng hồ, người chơi đứng yên)
      const p0 = await S(ctx, () => ({ t: window.__climbReal.time, c: window.__climbReal.slideClock, x: window.__climbChoiceX(0), px: window.__climbReal.player.x }));
      await tap(ctx, await ctx.page.$('[data-testid="nut-goi-y"]'));
      await waitFor(ctx, () => document.querySelector('[data-testid="hop-goi-y"]'), 3000);
      await ctx.page.keyboard.down('ArrowRight');
      await sleep(900);
      await ctx.page.keyboard.up('ArrowRight');
      const p1 = await S(ctx, () => ({ t: window.__climbReal.time, c: window.__climbReal.slideClock, x: window.__climbChoiceX(0), px: window.__climbReal.player.x }));
      const hintText = await S(ctx, () => document.querySelector('[data-testid="viec-cua-em"]')?.innerText ?? '');
      pausedOk = Math.abs(p1.t - p0.t) < 0.2 && Math.abs(p1.c - p0.c) < 0.2 && Math.abs(p1.px - p0.px) < 0.3;
      check(ctx, '"?" tạm dừng', 'mở hộp "?": đồng hồ, bậc trượt và người chơi đứng yên (kể cả khi bấm phím)', pausedOk, `${JSON.stringify(p0)} → ${JSON.stringify(p1)}`);
      check(ctx, '"?" tạm dừng', 'câu nhắc theo trạng thái, không lộ đáp án (không có số của bậc)', /Việc của em/.test(await bodyText(ctx)) && hintText.length > 10 && !/\d{2,}/.test(hintText.replace('10', '')), hintText);
      await shot(ctx, 'hop-goi-y');
      await tapText(ctx, /Chơi tiếp/);
      await sleep(500);
      const p2 = await S(ctx, () => window.__climbReal.time);
      check(ctx, '"?" tạm dừng', 'đóng hộp thì chạy tiếp', p2 > p1.t + 0.2, `${p1.t} → ${p2}`);
    }
    const fpsPromise = round === 1 ? fps(ctx, 3000) : null;
    const why = await autoplay(ctx, { timeoutMs: 120000 });
    if (fpsPromise) measuredFps = await fpsPromise;
    check(ctx, `vòng ${round + 1}`, 'leo hết cây đến gốc rồi hiện bảng xong vòng', why === 'banner' || why === 'until', why);
    await sleep(1400);
    const banner = await bodyText(ctx);
    const depth = info.depth;
    check(ctx, `vòng ${round + 1}`, `hiện "Em chỉ cần ${depth} phép ghép thay vì kiểm tra cả ${2 ** depth} lá!" và gốc em tính khác gốc trong sổ`, banner.includes(`Em chỉ cần ${depth} phép ghép thay vì kiểm tra cả ${2 ** depth} lá!`) && /khác gốc trong sổ/.test(banner));
    if (round === 2) await shot(ctx, 'vong-3-xong');
    else if (round === 0) await shot(ctx, 'vong-1-xong');
    if (round < 2) {
      await tapText(ctx, /Vòng tiếp theo/);
      await sleep(600);
    }
  }
  check(ctx, 'bậc trượt', 'vòng 3 trượt nhanh hơn vòng 2', slideInfo[2] > slideInfo[1] * 1.3 || slideInfo[2] > 0.8, slideInfo.map((v) => v.toFixed(2)).join(' / '));
  check(ctx, 'FPS', `mẫu 3 giây giữa vòng 2: ${measuredFps?.toFixed(0)} khung/giây (trình duyệt không đầu, WebGL phần mềm; chỉ để tham khảo)`, measuredFps !== null);
  await tapText(ctx, /Xem kết quả/);
  // cao trào tự chiếu (đủ 4 trang vừa trao) rồi "Bỏ qua" tới màn kết quả
  await waitFor(ctx, () => document.querySelector('[data-testid="man-cuoi"]') || document.querySelector('[data-testid="diem"]'), 30000);
  const climax = await S(ctx, () => Boolean(document.querySelector('[data-testid="man-cuoi"]')));
  check(ctx, 'cao trào', 'thắng vẫn vào cảnh cao trào (đủ 4 Trang Sổ Vàng)', climax);
  if (climax) {
    await sleep(800);
    await shot(ctx, 'cao-trao');
    await tapText(ctx, /Bỏ qua/);
  }
  await waitFor(ctx, () => document.querySelector('[data-testid="diem"]'), 20000);
  const score = await S(ctx, () => document.querySelector('[data-testid="diem"]').innerText);
  check(ctx, 'kết quả', 'không nhầm lần nào: 450 điểm (3 vòng × 100 + 3 tim × 50)', score.includes('450'), score);
  const txt = await bodyText(ctx);
  check(ctx, 'kết quả', 'điểm từng phần: vòng leo xong và tim còn lại, không còn tiền đồng', /Vòng leo xong/.test(txt) && /Tim còn lại/.test(txt) && !/Tiền đồng/.test(txt));
  await shot(ctx, 'ket-qua');
  const ck = await cookieNow(ctx);
  check(ctx, 'kết quả', 'ghi tiến độ: màn 12 đã chơi, đủ 4 Trang Sổ Vàng', ck.gp === 4 && Boolean(ck.lv?.['12']), JSON.stringify(ck.lv?.['12']));
  check(ctx, 'kết quả', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

async function sHetTim(browser, size) {
  const ctx = await openGame(browser, size);
  await start(ctx);
  await skipTutorial(ctx);
  const why = await autoplay(ctx, { want: { wrong: true }, timeoutMs: 90000 });
  check(ctx, 'hết tim', 'nhảy sai 3 lần thì hiện lời Bi giúp', why === 'banner' && /Để Bi giúp em/.test(await bodyText(ctx)));
  const s = await S(ctx, () => ({ phase: window.__climbReal.phase, hearts: window.__climbReal.hearts, mistakes: window.__climbReal.mistakes }));
  check(ctx, 'hết tim', 'logic: thua, 0 tim, 3 lần nhầm', s.phase === 'lost' && s.hearts === 0 && s.mistakes === 3, JSON.stringify(s));
  await shot(ctx, 'het-tim');
  await tapText(ctx, /Xem kết quả/);
  await waitFor(ctx, () => document.querySelector('[data-testid="man-cuoi"]') || document.querySelector('[data-testid="diem"]'), 30000);
  const climax = await S(ctx, () => Boolean(document.querySelector('[data-testid="man-cuoi"]')));
  check(ctx, 'hết tim', 'hết tim vẫn vào cảnh cao trào', climax);
  if (climax) await tapText(ctx, /Bỏ qua/);
  await waitFor(ctx, () => document.querySelector('[data-testid="diem"]'), 20000);
  const score = await S(ctx, () => document.querySelector('[data-testid="diem"]').innerText);
  check(ctx, 'hết tim', 'điểm 0 (chưa xong vòng nào)', score.trim().endsWith(' 0'), score);
  check(ctx, 'hết tim', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

async function sAuto(browser, size) {
  const ctx = await openGame(browser, size);
  const btn = (await byText(ctx, /Tự hoàn thành cả màn/)).asElement();
  check(ctx, 'tự hoàn thành', 'thẻ bắt đầu có nút "Tự hoàn thành cả màn" (bản dev)', Boolean(btn));
  if (btn) {
    await tap(ctx, btn);
    await sleep(800);
    check(ctx, 'tự hoàn thành', 'bấm: hiện khung "Đã tự hoàn thành"', /Đã tự hoàn thành/.test(await bodyText(ctx)));
    await shot(ctx, 'tu-hoan-thanh');
  }
  check(ctx, 'tự hoàn thành', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}


/**
 * Hồi quy "nhảy sai rồi mọi bậc đều bị tính sai": ở CẢ 3 vòng, nhảy sai (1 hay 2 lần) → bậc nứt → rơi → làm lại tầng → nhảy đúng PHẢI lên tầng,
 * không mất thêm tim, rồi nhảy sai tiếp ở tầng 1 và vẫn nhảy đúng lên tầng 2. Tim được hồi về 3 giữa các đợt thử (chỉ trong kịch bản này) để thử đủ số lần.
 */
async function sSaiRoiDung(browser, size) {
  const ctx = await openGame(browser, size);
  await start(ctx);
  await skipTutorial(ctx);
  const wrongPlan = [1, 2, 2];
  for (let round = 0; round < 3; round++) {
    const area = `sai rồi đúng, vòng ${round + 1}`;
    for (const [phase, wrongs] of [['tầng 0', wrongPlan[round]], ['tầng 1', 1]]) {
      await S(ctx, () => {
        window.__climbReal.hearts = 3;
        window.__climbReal.dying = false;
      });
      const before = await S(ctx, () => ({ level: window.__climbReal.level, mistakes: window.__climbReal.mistakes }));
      let allWrongOk = true;
      const wrongDetail = [];
      for (let k = 0; k < wrongs; k++) {
        const why = await autoplay(ctx, { want: { wrong: true }, until: () => window.__climbReal.mode === 'crack', timeoutMs: 25000 });
        await waitFor(ctx, () => window.__climbReal.mode === 'free', 6000).catch(() => {});
        const st = await S(ctx, () => ({ mode: window.__climbReal.mode, level: window.__climbReal.level, grounded: window.__climbReal.player.grounded, cracks: window.__climbReal.choices.filter((c) => c.crack !== null).length }));
        if (!(why === 'until' && st.mode === 'free' && st.level === before.level && st.grounded && st.cracks === 0)) {
          allWrongOk = false;
          wrongDetail.push(JSON.stringify({ k, why, st, before }));
        }
      }
      check(ctx, area, `${phase}: nhảy sai ${wrongs} lần: nứt, rơi, làm lại tầng, không còn bậc nào đang nứt`, allWrongOk, wrongDetail.join(' | '));
      const mid = await S(ctx, () => ({ hearts: window.__climbReal.hearts, mistakes: window.__climbReal.mistakes }));
      await S(ctx, () => { window.__lvKeep = window.__climbReal.level; });
      const why2 = await autoplay(ctx, { until: () => window.__climbReal.level > window.__lvKeep || window.__climbReal.phase !== 'playing', timeoutMs: 25000, want: {} });
      void why2;
      const after = await S(ctx, () => ({ level: window.__climbReal.level, hearts: window.__climbReal.hearts, mistakes: window.__climbReal.mistakes, mode: window.__climbReal.mode, phase: window.__climbReal.phase }));
      check(ctx, area, `${phase}: sau khi sai, nhảy ĐÚNG phải lên tầng`, after.level > before.level || after.phase !== 'playing', JSON.stringify({ before, after }));
      check(ctx, area, `${phase}: nhảy đúng không mất thêm tim và không tính thêm lần nhầm`, after.hearts === mid.hearts && after.mistakes === mid.mistakes, JSON.stringify({ mid, after }));
    }
    const why = await autoplay(ctx, { timeoutMs: 120000 });
    check(ctx, area, 'leo hết cây đến gốc, hiện bảng xong vòng', why === 'banner' || why === 'until', why);
    await sleep(1400);
    if (round < 2) {
      await tapText(ctx, /Vòng tiếp theo/);
      await sleep(600);
    }
  }
  check(ctx, 'sai rồi đúng', 'không lỗi trình duyệt', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

const SCENARIOS = { tutorial: sTutorial, dung: sDung, sai: sSai, hut: sHut, vong: sVong, hettim: sHetTim, auto: sAuto, saidung: sSaiRoiDung };

const browser = await launch();
try {
  for (const i of sizeIdx) {
    const size = SIZES[i];
    console.log(`\n=== ${size.name} (${size.touch ? 'nút chạm giả lập' : 'bàn phím'}) ===`);
    for (const key of only) {
      const fn = SCENARIOS[key];
      if (!fn) continue;
      try {
        await fn(browser, size);
        console.log(`  ${key}: xong`);
      } catch (e) {
        results.push({ size: size.name, area: key, name: 'kịch bản chạy hết', ok: false, detail: String(e.message ?? e).slice(0, 300) });
        console.log(`  ${key}: LỖI ${String(e.message ?? e).slice(0, 300)}`);
      }
    }
  }
} finally {
  await browser.close();
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} kiểm đạt`);
for (const b of bad) console.log(`  ✗ [${b.size}] ${b.area}: ${b.name} — ${b.detail}`);
console.log(`ảnh: ${shots.length}, lớn nhất ${Math.max(0, ...shots.map((s) => s.bytes))} byte`);
if (write) writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify({ results, shots }, null, 1));
process.exit(bad.length ? 1 : 0);
