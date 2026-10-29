// P4a: kiểm màn 2 sau khi tăng tốc 20% trên BẢN BUILD (không phải dev; có VITE_PROBE để đọc trạng thái ván), chuột/bàn phím và chạm giả lập ở 3 cỡ màn hình.
// Đo: tốc độ thật của ván (quãng đường mỗi bước mô phỏng) so với tốc độ danh nghĩa; tạm dừng, trả lời câu hỏi, tiếp tục không làm tốc độ nhảy bất thường; điều khiển; khung dọc xoay ngang; FPS.
// Chạy trên Chrome headless với GL phần mềm (SwiftShader), KHÔNG phải điện thoại thật: FPS chỉ để so sánh trước/sau, không kết luận về thiết bị thật.
//
// Chuẩn bị (CLAUDE.md mục 9):
//   pnpm dev:assets &
//   (cd apps/hub && VITE_HUB_URL=http://localhost:5190 VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe && npx vite preview --outDir dist-probe --port 5190 --strictPort &)
// Chạy: node scripts/p4a-check.mjs [--url=http://localhost:5190] [--size=0,1,2] [--only=toc-do,dieu-khien,xoay] [--label=sau] [--seconds=12] [--no-write] [--v]
//   --label=truoc: bản build của mã cũ (chỉ chạy kịch bản toc-do, ghi ket-qua-truoc.json). --seconds: thời gian đo tốc độ khi chạy bản cũ.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const BASE = arg('url', 'http://localhost:5190');
const LABEL = arg('label', 'sau');
const OUT = 'docs/screenshots/p4a';
const write = !flag('no-write');
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const only = arg('only', LABEL === 'truoc' ? 'toc-do' : 'toc-do,dieu-khien,xoay').split(',');
const NOMINAL = LABEL === 'truoc' ? { start: 10, add: 0.3, max: 18 } : { start: 12, add: 0.36, max: 21.6 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (write) mkdirSync(OUT, { recursive: true });

const results = [];
const shots = [];
const metrics = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ label: LABEL, size: ctx.size.name, area, name, ok: Boolean(ok), detail });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${LABEL} ${ctx.size.name}] ${area}: ${name}${detail ? ` — ${detail}` : ''}`);
};

const lesson = [1, 1, 3, 3, 3];
const cookie = { v: 1, lv: { 1: lesson }, gp: 0, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 4095, hd: 2147483647, vs: 15, vi: 15 };

async function newCtx(browser, size) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((p) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
  }, cookie);
  return { page, size, errors, touch: size.touch };
}
async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 60 });
  if (buf.length >= 300000) throw new Error(`${name} lớn hơn 300 KB`);
  const file = `${LABEL}-${name}-${ctx.size.name}.jpg`;
  if (write) writeFileSync(`${OUT}/${file}`, buf);
  shots.push({ file, bytes: buf.length });
}
async function tap(ctx, handle) {
  await handle.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  const b = await handle.boundingBox();
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  if (ctx.touch) await ctx.page.touchscreen.tap(x, y); else await ctx.page.mouse.click(x, y);
}
const waitFor = (ctx, fn, timeout = 60000, ...a) => ctx.page.waitForFunction(fn, { timeout, polling: 200 }, ...a);
const clickText = async (ctx, re) => {
  const h = (await ctx.page.evaluateHandle((src) => [...document.querySelectorAll('button')].find((b) => new RegExp(src).test(b.innerText.trim()) && b.offsetParent !== null) ?? null, re.source)).asElement();
  if (!h) throw new Error(`Không thấy nút ${re}`);
  await tap(ctx, h);
};
const byTestId = async (ctx, id) => (await ctx.page.$(`[data-testid="${id}"]`));

/** Mở màn 2, bấm "Bắt đầu" như người chơi, chờ ván chạy. */
async function startGame(ctx) {
  await ctx.page.goto(`${BASE}/lang/lang-giay/man/2?q=low`, { waitUntil: 'domcontentloaded' });
  await waitFor(ctx, () => document.querySelector('[data-testid="the-bat-dau"]'), 90000);
  await sleep(500);
  await clickText(ctx, /^Bắt đầu/);
  await waitFor(ctx, () => window.__runner && window.__runner.steps > 5, 120000);
}
/** Bộ lấy mẫu mỗi khung hình: [giờ thật ms, số bước, z, giờ chạy, speedScale, phase, tim, làn, y, trượt, grounded]. */
const installSampler = (ctx) => ctx.page.evaluate(() => {
  window.__samp = [];
  const loop = () => {
    const r = window.__runner;
    if (r) { const s = r.state; window.__samp.push([performance.now(), r.steps, s.z, s.time, s.speedScale, s.phase, s.hearts, s.lane, s.y, s.slide, s.grounded]); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
const takeSamples = (ctx) => ctx.page.evaluate(() => { const a = window.__samp; window.__samp = []; return a; });

const expectedSpeed = (time, scale) => Math.min(NOMINAL.max, NOMINAL.start + NOMINAL.add * Math.floor(time / 5 + 1e-9)) * scale;
/** Phân tích mẫu: tốc độ mỗi khung (quãng đường ÷ số bước × 60) so với tốc độ danh nghĩa. Chỉ lấy khung đang chạy (phase run, speedScale 1). */
function analyseSpeed(samples) {
  let worst = 0;
  let maxV = 0;
  let n = 0;
  let sumV = 0;
  let maxStepsPerFrame = 0;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    const dsteps = b[1] - a[1];
    if (dsteps <= 0) continue;
    maxStepsPerFrame = Math.max(maxStepsPerFrame, dsteps);
    if (a[5] !== 'run' || b[5] !== 'run' || a[4] !== 1 || b[4] !== 1) continue;
    const v = ((b[2] - a[2]) / dsteps) * 60;
    const exp = expectedSpeed(b[3], 1);
    // một khung có thể vắt qua bậc tăng tốc: chấp nhận bằng tốc độ ở đầu hoặc cuối khung
    const exp0 = expectedSpeed(a[3], 1);
    const dev = Math.min(Math.abs(v - exp), Math.abs(v - exp0));
    worst = Math.max(worst, dev);
    maxV = Math.max(maxV, v);
    sumV += v;
    n++;
  }
  return { frames: n, meanSpeed: n ? sumV / n : 0, maxSpeed: maxV, worstDeviation: worst, maxStepsPerFrame };
}
function analyseFps(samples) {
  const d = [];
  for (let i = 1; i < samples.length; i++) d.push(samples[i][0] - samples[i - 1][0]);
  d.sort((a, b) => a - b);
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  return { frames: d.length, meanFps: +(1000 / mean).toFixed(1), p5Fps: +(1000 / d[Math.floor(d.length * 0.95)]).toFixed(1), worstFrameMs: +d[d.length - 1].toFixed(1), over50ms: d.filter((x) => x > 50).length, over100ms: d.filter((x) => x > 100).length };
}

/** 1. Tốc độ thật; tạm dừng; câu hỏi và tiếp tục (đặt tim 99 để ván không kết thúc: chỉ để đo, mô phỏng giữ nguyên). */
async function scenSpeed(browser, size) {
  const A = 'tốc độ';
  const ctx = await newCtx(browser, size);
  await startGame(ctx);
  await ctx.page.evaluate(() => { window.__runner.state.hearts = 99; });
  await installSampler(ctx);
  const t0 = Date.now();
  if (LABEL === 'truoc') {
    await sleep(Number(arg('seconds', '12')) * 1000);
    const sm = await takeSamples(ctx);
    const sp = analyseSpeed(sm);
    metrics.push({ size: size.name, label: LABEL, ...sp, fps: analyseFps(sm) });
    check(ctx, A, `bản cũ: tốc độ trung bình ${sp.meanSpeed.toFixed(2)} (danh nghĩa 10 đầu ván)`, sp.frames > 30, JSON.stringify(sp));
    await ctx.page.close();
    return;
  }
  // chạy ~ 8 giây giả lập
  await waitFor(ctx, () => window.__runner.state.time >= 8, 180000);
  await shot(ctx, 'dang-chay');
  const run1 = await takeSamples(ctx);
  const sp1 = analyseSpeed(run1);
  const fps1 = analyseFps(run1);
  check(ctx, A, 'khi chạy: tốc độ thật bằng tốc độ danh nghĩa (12 đầu ván, tăng 0,36 mỗi 5 giây), lệch ≤ 1%', sp1.frames > 50 && sp1.worstDeviation <= 0.01 * NOMINAL.max, JSON.stringify(sp1));
  check(ctx, A, 'tốc độ trung bình 8 giây đầu nằm trong [12; 12,4]', sp1.meanSpeed >= 12 - 0.05 && sp1.meanSpeed <= 12.4, sp1.meanSpeed.toFixed(3));
  // tạm dừng: mở hộp "?" (ván tạm dừng thật), chờ 2 giây, đóng
  await ctx.page.evaluate(() => { window.__samp = []; });
  await tap(ctx, await byTestId(ctx, 'nut-goi-y'));
  await waitFor(ctx, () => document.querySelector('[data-testid="hop-goi-y"]'), 10000);
  await sleep(800); // vài khung để cờ tạm dừng tới ván (khung hình chậm trên GL phần mềm)
  const before = await ctx.page.evaluate(() => ({ steps: window.__runner.steps, z: window.__runner.state.z, time: window.__runner.state.time }));
  await shot(ctx, 'tam-dung');
  await sleep(2200);
  const during = await ctx.page.evaluate(() => ({ steps: window.__runner.steps, z: window.__runner.state.z, time: window.__runner.state.time }));
  check(ctx, A, 'tạm dừng 2 giây: ván đứng yên hẳn (số bước, quãng đường, giờ chạy không đổi quá 3 bước)', during.steps - before.steps <= 3 && Math.abs(during.z - before.z) <= (3 / 60) * NOMINAL.max + 1e-6 && Math.abs(during.time - before.time) <= 0.06, JSON.stringify({ before, during }));
  await ctx.page.evaluate(() => { window.__samp = []; });
  await clickText(ctx, /^Chơi tiếp/);
  await sleep(2500);
  const resumed = await takeSamples(ctx);
  const spR = analyseSpeed(resumed);
  check(ctx, A, 'sau khi tiếp tục: không dồn bước (nhiều nhất vài bước mỗi khung) và tốc độ vẫn bằng danh nghĩa, không nhảy vọt', spR.frames > 3 && spR.worstDeviation <= 0.01 * NOMINAL.max && spR.maxSpeed <= expectedSpeed(resumed[resumed.length - 1][3], 1) * 1.02 + 0.05 && spR.maxStepsPerFrame <= Math.max(4, Math.ceil((size.touch ? 1 : 1) * 0.25 * 60) + 1), JSON.stringify(spR));
  // tới hết vòng 1: chạy chậm dần, câu hỏi, trả lời, tiếp tục
  await ctx.page.evaluate(() => { window.__samp = []; });
  await waitFor(ctx, () => window.__runner.state.phase === 'quiz', 240000);
  await sleep(500);
  const slowSamples = await takeSamples(ctx);
  const scales = slowSamples.map((x) => x[4]);
  let monotone = true;
  for (let i = 1; i < scales.length; i++) if (scales[i] > scales[i - 1] + 1e-9 && slowSamples[i][5] !== 'run') monotone = false;
  check(ctx, A, 'hết vòng 1: chạy chậm dần về 0 (không phanh gấp, không tăng lại), rồi hiện câu hỏi', monotone && scales[scales.length - 1] === 0 && (await byTestId(ctx, 'cau-hoi')) !== null, `scale cuối ${scales[scales.length - 1]}`);
  const slowSpeed = analyseSpeed(slowSamples);
  check(ctx, A, 'trong lúc chạy chậm tốc độ không vượt mức danh nghĩa', slowSpeed.maxSpeed <= NOMINAL.max * 1.02, slowSpeed.maxSpeed.toFixed(2));
  const timeLeft = await ctx.page.evaluate(() => window.__runner.state.quiz.timeLeft);
  check(ctx, A, 'câu hỏi vẫn có 15 giây trả lời (còn ≥ 14 giây sau 0,5 giây đầu)', timeLeft <= 15 && timeLeft >= 14, String(timeLeft));
  await shot(ctx, 'cau-hoi');
  const qi = await ctx.page.evaluate(() => window.__runnerQuestions[window.__runner.state.quiz.round].correctIndex);
  const opts = await ctx.page.$$('[data-testid="cau-hoi"] ul button');
  await tap(ctx, opts[qi]);
  await waitFor(ctx, () => document.querySelector('[data-testid="quiz-tiep"]'), 10000);
  await ctx.page.evaluate(() => { window.__samp = []; });
  await sleep(800);
  await tap(ctx, await ctx.page.$('[data-testid="quiz-tiep"] button'));
  await sleep(1500);
  if (flag('v')) console.log('   dbg sau tiếp:', JSON.stringify(await ctx.page.evaluate(() => ({ phase: window.__runner.state.phase, scale: window.__runner.state.speedScale, round: window.__runner.state.round, q: window.__runner.state.quiz, over: window.__runner.state.over, hearts: window.__runner.state.hearts }))));
  await waitFor(ctx, () => window.__runner.state.phase === 'run' && window.__runner.state.speedScale === 1, 30000);
  await sleep(4000);
  const after = await takeSamples(ctx);
  const resumeScales = after.filter((x) => x[5] === 'resume').map((x) => x[4]);
  let up = true;
  for (let i = 1; i < resumeScales.length; i++) if (resumeScales[i] < resumeScales[i - 1] - 1e-9) up = false;
  const spA = analyseSpeed(after);
  const sAfter = after[after.length - 1];
  check(ctx, A, 'sau câu hỏi: tăng tốc đều từ 0 lên 1 trong khoảng 1 giây, rồi chạy đúng tốc độ danh nghĩa của vòng 2 (13,8)', up && spA.worstDeviation <= 0.01 * NOMINAL.max && Math.abs(spA.meanSpeed - expectedSpeed(sAfter[3], 1)) <= 0.3, JSON.stringify({ up, spA, expect: expectedSpeed(sAfter[3], 1) }));
  check(ctx, A, 'đúng câu hỏi: ván ghi nhận câu đúng (+3 trang), thời gian trả lời 15 giây không đổi', await ctx.page.evaluate(() => window.__runner.state.correct >= 1) && (await ctx.page.evaluate(() => window.__runner.state.pages)) >= 3, '');
  const fps = analyseFps([...run1, ...resumed, ...after]);
  metrics.push({ size: size.name, label: LABEL, nominalStart: NOMINAL.start, meanSpeedFirst8s: +sp1.meanSpeed.toFixed(3), worstDeviation: +sp1.worstDeviation.toFixed(4), maxSpeed: +Math.max(sp1.maxSpeed, spR.maxSpeed, spA.maxSpeed).toFixed(3), fps, fps8s: fps1, wallSeconds: Math.round((Date.now() - t0) / 1000), glRenderer: 'SwiftShader (Chrome headless, GL phần mềm)' });
  check(ctx, A, 'không lỗi trang', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

/** 2. Điều khiển thật: bàn phím (cỡ máy tính) hoặc vuốt (cỡ điện thoại): đổi làn, nhảy, trượt có hiệu lực ngay ở tốc độ mới. */
async function scenInput(browser, size) {
  const A = 'điều khiển';
  const ctx = await newCtx(browser, size);
  await startGame(ctx);
  const swipe = async (dx, dy) => {
    const cx = size.w / 2; const cy = size.h * 0.6;
    await ctx.page.touchscreen.touchStart(cx, cy);
    await ctx.page.touchscreen.touchMove(cx + dx / 2, cy + dy / 2);
    await ctx.page.touchscreen.touchMove(cx + dx, cy + dy);
    await ctx.page.touchscreen.touchEnd();
  };
  const press = async (dir) => {
    if (!ctx.touch) { await ctx.page.keyboard.press({ left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' }[dir]); return; }
    await swipe({ left: -90, right: 90, up: 0, down: 0 }[dir], { left: 0, right: 0, up: -90, down: 90 }[dir]);
  };
  // khung hình rất chậm trên GL phần mềm (vài khung mỗi giây): chờ tới 5 giây thật cho lệnh có hiệu lực, đo độ trễ bằng số bước mô phỏng (1 bước = 1/60 giây)
  const effect = (cond, ms = 5000) => ctx.page.evaluate((c, m) => new Promise((res) => {
    const t0 = performance.now(); const r = window.__runner; const s0 = r.steps; let maxY = 0; let maxSlide = 0;
    const test = new Function('s', `return ${c}`);
    const loop = () => { const s = r.state; maxY = Math.max(maxY, s.y); maxSlide = Math.max(maxSlide, s.slide); if (test(s)) res({ ok: true, steps: r.steps - s0, maxY, maxSlide, lane: s.lane }); else if (performance.now() - t0 > m) res({ ok: false, steps: r.steps - s0, maxY, maxSlide, lane: s.lane }); else requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }), cond, ms);
  const how = ctx.touch ? 'vuốt (chạm giả lập)' : 'bàn phím';
  const start = await ctx.page.evaluate(() => window.__runner.state.lane);
  // camera nhìn theo chiều chạy nên trái màn hình là x dương (làn 2): chỉ cần đổi đúng một làn
  let p = effect(`s.lane !== ${start}`); await press('left'); let r = await p;
  check(ctx, A, `${how}: sang trái đổi đúng một làn (làn ${start} → ${r.lane}), sau ${r.steps} bước mô phỏng`, r.ok && Math.abs(r.lane - start) === 1, JSON.stringify(r));
  const moved = r.lane;
  p = effect(`s.lane === ${start}`); await press('right'); r = await p;
  check(ctx, A, `${how}: sang phải về lại làn ${start}, sau ${r.steps} bước`, r.ok && moved !== start, JSON.stringify(r));
  await ctx.page.waitForFunction(() => window.__runner.state.grounded && window.__runner.state.y === 0, { timeout: 10000, polling: 50 });
  p = effect('!s.grounded'); await press('up'); r = await p;
  check(ctx, A, `${how}: nhảy lên (rời đất), sau ${r.steps} bước`, r.ok, JSON.stringify(r));
  await ctx.page.waitForFunction(() => window.__runner.state.grounded && window.__runner.state.y === 0, { timeout: 10000, polling: 50 });
  p = effect('s.slide > 0'); await press('down'); r = await p;
  check(ctx, A, `${how}: trượt, sau ${r.steps} bước`, r.ok, JSON.stringify(r));
  if (!ctx.touch) {
    // chuột: bấm nút "?" mở hộp tạm dừng rồi đóng, ván tiếp tục
    await tap(ctx, await byTestId(ctx, 'nut-goi-y'));
    await waitFor(ctx, () => document.querySelector('[data-testid="hop-goi-y"]'), 10000);
    await clickText(ctx, /^Chơi tiếp/);
    const a = await ctx.page.evaluate(() => window.__runner.steps);
    await sleep(1500);
    check(ctx, A, 'chuột: mở rồi đóng hộp "?" (tạm dừng), ván chạy tiếp', (await ctx.page.evaluate(() => window.__runner.steps)) > a + 5, '');
  }
  check(ctx, A, 'không lỗi trang', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

/** 3. Khung dọc (360×800): chơi dọc, xoay ngang giữa ván, rồi xoay lại: ván không gián đoạn, tốc độ không bất thường. */
async function scenRotate(browser, size) {
  if (size.w >= size.h) return;
  const A = 'xoay ngang';
  const ctx = await newCtx(browser, size);
  await startGame(ctx);
  await ctx.page.evaluate(() => { window.__runner.state.hearts = 99; });
  await installSampler(ctx);
  await sleep(3000);
  await shot(ctx, 'khung-doc');
  const canvasBox = () => ctx.page.evaluate(() => { const c = document.querySelector('canvas'); const r = c?.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; });
  const portraitBox = await canvasBox();
  const s0 = await ctx.page.evaluate(() => window.__runner.steps);
  await ctx.page.setViewport({ width: size.h, height: size.w, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await sleep(2500);
  const landBox = await canvasBox();
  const s1 = await ctx.page.evaluate(() => window.__runner.steps);
  await shot(ctx, 'xoay-ngang');
  check(ctx, A, 'xoay ngang giữa ván: khung 3D đổi theo cỡ mới và ván chạy tiếp', landBox && portraitBox && landBox[0] > landBox[1] && portraitBox[0] < portraitBox[1] && s1 > s0 + 30, JSON.stringify({ portraitBox, landBox, steps: [s0, s1] }));
  await ctx.page.setViewport({ width: size.w, height: size.h, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await sleep(2000);
  const sm = await takeSamples(ctx);
  const sp = analyseSpeed(sm);
  check(ctx, A, 'sau hai lần xoay: tốc độ vẫn bằng danh nghĩa (không nhảy vọt), không dồn bước', sp.frames > 50 && sp.worstDeviation <= 0.01 * NOMINAL.max && sp.maxStepsPerFrame <= 15, JSON.stringify(sp));
  check(ctx, A, 'không lỗi trang', ctx.errors.length === 0, ctx.errors.join(' | '));
  await ctx.page.close();
}

const SCEN = { 'toc-do': scenSpeed, 'dieu-khien': scenInput, xoay: scenRotate };
const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    const before = results.length;
    for (const key of only) {
      try { await SCEN[key](browser, size); } catch (e) {
        results.push({ label: LABEL, size: size.name, area: `lỗi chạy ${key}`, name: e.message, ok: false, detail: '' });
        console.log(`✗ ${size.name} ${key}: ${e.message}`);
      }
    }
    const mine = results.slice(before);
    console.log(`${mine.every((r) => r.ok) ? '✓' : '✗'} [${LABEL}] ${size.name}: ${mine.filter((r) => r.ok).length}/${mine.length}`);
  }
} finally {
  await browser.close();
}
if (write) {
  writeFileSync(`${OUT}/ket-qua-${LABEL}.json`, JSON.stringify(results, null, 1));
  writeFileSync(`${OUT}/do-${LABEL}.json`, JSON.stringify(metrics, null, 1));
  writeFileSync(`${OUT}/anh-${LABEL}.json`, JSON.stringify(shots, null, 1));
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
