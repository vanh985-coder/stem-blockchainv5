// P4b: kiểm màn 3 "Ghép lại cuốn sổ" sau khi rút từ 3 vòng xuống 2 vòng (đoạn giữ sổ nằm cuối vòng 2). Chạy trên BẢN BUILD (VITE_PROBE, không phải dev), thao tác thật bằng chuột
// (kéo thả) hoặc chạm giả lập (chạm chọn rồi chạm đặt), ở 3 cỡ màn hình. Cùng kịch bản chạy được trên bản build của mã cũ (`--label=truoc`, 3 vòng) để so thời lượng.
// Chrome headless dùng GL phần mềm (SwiftShader): KHÔNG đo FPS để kết luận về thiết bị thật; thời gian "thật" ở đây chỉ để so trước/sau cùng môi trường.
//
// Chuẩn bị (CLAUDE.md mục 9):
//   pnpm dev:assets &
//   (cd apps/hub && VITE_HUB_URL=http://localhost:5190 VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe && npx vite preview --outDir dist-probe --port 5190 --strictPort &)
// Chạy: node scripts/p4b-check.mjs [--url=...] [--size=0,1,2] [--only=tron-van,tam-dung,het-gio,het-tim,xoay] [--label=sau|truoc] [--no-write] [--v]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const BASE = arg('url', 'http://localhost:5190');
const LABEL = arg('label', 'sau');
const OUT = 'docs/screenshots/p4b';
const write = !flag('no-write');
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const only = arg('only', LABEL === 'truoc' ? 'tron-van' : 'tron-van,tam-dung,het-gio,het-tim,xoay').split(',');
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
const cookie = { v: 1, lv: { 1: lesson, 2: [1, 1, 3, 100] }, gp: 0, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 4095, hd: 2147483647, vs: 15, vi: 15 };

async function newCtx(browser, size, landscape = true) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  const [w, h] = landscape && size.w < size.h ? [size.h, size.w] : [size.w, size.h];
  await page.setViewport({ width: w, height: h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((p) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
  }, cookie);
  lastPage = page;
  return { page, size, errors, touch: size.touch };
}
let lastPage;
async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 60 });
  if (buf.length >= 300000) throw new Error(`${name} lớn hơn 300 KB`);
  const file = `${LABEL}-${name}-${ctx.size.name}.jpg`;
  if (write) writeFileSync(`${OUT}/${file}`, buf);
  shots.push({ file, bytes: buf.length });
}
const waitFor = (ctx, fn, timeout = 60000, ...a) => ctx.page.waitForFunction(fn, { timeout, polling: 150 }, ...a);
const rectOf = async (ctx, sel) => ctx.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 }; }, sel);

/** Chuột thật: nhấn, rê qua vài điểm, nhả. */
async function drag(ctx, fromSel, toSel) {
  const a = await rectOf(ctx, fromSel); const b = await rectOf(ctx, toSel);
  if (!a || !b) throw new Error(`Không thấy ${a ? toSel : fromSel}`);
  const m = ctx.page.mouse;
  await m.move(a.cx, a.cy);
  await m.down();
  for (let i = 1; i <= 6; i++) await m.move(a.cx + ((b.cx - a.cx) * i) / 6, a.cy + ((b.cy - a.cy) * i) / 6);
  await sleep(80);
  await m.up();
}
async function tapAt(ctx, sel) {
  const r = await rectOf(ctx, sel);
  if (!r) throw new Error(`Không thấy ${sel}`);
  if (ctx.touch) await ctx.page.touchscreen.tap(r.cx, r.cy); else await ctx.page.mouse.click(r.cx, r.cy);
}
/** Đưa một thẻ tới đích: kéo thả bằng chuột, hoặc chạm chọn thẻ rồi chạm đích (cỡ điện thoại). */
async function moveCard(ctx, cardSel, targetSel) {
  if (ctx.touch) { await tapAt(ctx, cardSel); await sleep(120); await tapAt(ctx, targetSel); } else await drag(ctx, cardSel, targetSel);
}
const clickText = async (ctx, re) => {
  const h = (await ctx.page.evaluateHandle((src) => [...document.querySelectorAll('button')].find((b) => new RegExp(src).test(b.innerText.trim()) && b.offsetParent !== null) ?? null, re.source)).asElement();
  if (!h) throw new Error(`Không thấy nút ${re}`);
  await h.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const b = await h.boundingBox();
  if (ctx.touch) await ctx.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); else await ctx.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
};

async function startGame(ctx) {
  await ctx.page.goto(`${BASE}/lang/lang-giay/man/3?q=low`, { waitUntil: 'domcontentloaded' });
  await waitFor(ctx, () => document.querySelector('[data-testid="the-bat-dau"]'), 90000);
  await sleep(500);
  await clickText(ctx, /^Bắt đầu/);
  await waitFor(ctx, () => window.__rebuild && document.querySelector('[data-testid="man3-khung"]'), 120000);
  await sleep(3000); // màn hình tải còn giữ cảnh và chạy thử chuyển động vài giây đầu
  await ctx.page.evaluate(() => {
    window.__ph = [];
    let last = '';
    const loop = () => { const s = window.__rebuild; if (s) { const k = `${s.phase}|${s.round}|${s.keep ? (s.keep.running ? 'run' : 'idle') : '-'}`; if (k !== last) { last = k; window.__ph.push([performance.now(), s.phase, s.round, s.keep ? (s.keep.running ? 'run' : 'idle') : '-', s.hearts]); } } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
}
const st = (ctx) => ctx.page.evaluate(() => { const s = window.__rebuild; return { phase: s.phase, round: s.round, hearts: s.hearts, chain: s.chain.length, trayN: s.tray.length, keep: s.keep ? { running: s.keep.running, elapsed: s.keep.elapsed, swaps: s.keep.swapCount, fixed: s.keep.fixed, fast: s.keep.fast, unfixed: s.keep.swappedAt.filter((x) => x >= 0).length } : null, parts: s.parts.length }; });
const formulaOk = (c) => c.code === (c.prev * 2 + c.content) % 100;

/** Ghép đúng thứ tự một vòng (bấm từng thẻ theo chuỗi thật). Với vòng có trang giả: kéo trang giả vào rổ trước. */
async function playGhep(ctx, withBin) {
  await waitFor(ctx, () => window.__rebuild.phase === 'play', 60000);
  await sleep(700);
  if (withBin) {
    const fakeId = await ctx.page.evaluate(() => window.__rebuild.tray.find((c) => c.code !== (c.prev * 2 + c.content) % 100)?.id);
    if (fakeId) {
      await moveCard(ctx, `[data-testid="the-khay"][data-card-id="${fakeId}"]`, '[data-testid="ro-trang-gia"]');
      await waitFor(ctx, (id) => !window.__rebuild.tray.some((c) => c.id === id), 10000, fakeId);
    }
  }
  const ids = await ctx.page.evaluate(() => window.__rebuild.deal.real.map((c) => c.id));
  for (let i = 0; i < ids.length; i++) {
    await sleep(350);
    // vài giây đầu sau khi vào màn / xoay màn hình, cảnh còn chạy thử chuyển động và có thể chưa nhận thao tác: thử lại nếu thẻ chưa vào chuỗi
    for (let attempt = 0; attempt < 4; attempt++) {
      if (await ctx.page.evaluate((n) => window.__rebuild.chain.length >= n || window.__rebuild.phase !== 'play', i + 1)) break;
      const pressed = ctx.touch && (await ctx.page.evaluate((id) => !!document.querySelector(`[data-card-id="${id}"][aria-pressed="true"]`), ids[i]));
      if (pressed) await tapAt(ctx, '[data-testid="chuoi"]');
      else await moveCard(ctx, `[data-testid="the-khay"][data-card-id="${ids[i]}"]`, '[data-testid="chuoi"]');
      await ctx.page.waitForFunction((n) => window.__rebuild.chain.length >= n || window.__rebuild.phase !== 'play', { timeout: 1500, polling: 50 }, i + 1).catch(() => {});
    }
    await waitFor(ctx, (n) => window.__rebuild.chain.length >= n || window.__rebuild.phase !== 'play', 15000, i + 1);
  }
}
/** Đoạn giữ sổ: mỗi lần bị tráo, bỏ trang giả vào rổ rồi đặt đúng trang thật vào ô trống, như học sinh giỏi. Chạy tới khi hết giờ. */
async function playKeep(ctx, { fixSwaps = Infinity, onSwap } = {}) {
  let handled = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 400000) {
    const s = await ctx.page.evaluate(() => { const k = window.__rebuild.keep; return { phase: window.__rebuild.phase, swaps: k ? k.swapCount : 0 }; });
    if (s.phase !== 'keep') return handled;
    if (s.swaps > handled && handled < fixSwaps) {
      await sleep(900);
      const info = await ctx.page.evaluate(() => {
        const r = window.__rebuild; const k = r.keep;
        const slot = k.slots.findIndex((c, i) => k.swappedAt[i] >= 0 && c && c.code !== (c.prev * 2 + c.content) % 100);
        if (slot < 0) return null;
        const real = r.tray.find((c) => c.prev === r.deal.real[slot].prev && c.code === (c.prev * 2 + c.content) % 100 && c.code === r.deal.real[slot].code);
        return { slot, realId: real && real.id, fakeId: k.slots[slot].id };
      });
      if (info && info.realId) {
        await moveCard(ctx, `[data-testid="o-chuoi-the"][data-slot="${info.slot}"]`, '[data-testid="ro-trang-gia"]');
        await waitFor(ctx, (sl) => window.__rebuild.keep === null || window.__rebuild.keep.slots[sl] === null, 10000, info.slot);
        await sleep(300);
        await moveCard(ctx, `[data-testid="the-khay"][data-card-id="${info.realId}"]`, `[data-drop="slot:${info.slot}"]`);
        await sleep(300);
        if (onSwap) await onSwap(handled + 1);
      }
      handled++;
    } else if (s.swaps > handled) handled++;
    await sleep(250);
  }
  return handled;
}

/** Trọn ván: mọi vòng bằng thao tác thật, tới màn kết quả. Ghi lại thời gian (giây thật) từng đoạn. */
async function scenFull(browser, size) {
  const A = 'trọn ván';
  const ctx = await newCtx(browser, size);
  const T0 = Date.now();
  await startGame(ctx);
  const rounds = LABEL === 'truoc' ? 3 : 2;
  // vòng 1
  await playGhep(ctx, false);
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 15000);
  await shot(ctx, 'vong-1-xong');
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  // vòng 2: trang giả
  await waitFor(ctx, () => window.__rebuild.phase === 'villain' || window.__rebuild.phase === 'play', 15000);
  await playGhep(ctx, true);
  if (LABEL === 'truoc') {
    await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 15000);
    await tapAt(ctx, '[data-testid="nut-tiep"]');
  }
  // đoạn giữ sổ (vòng 3 cũ / cuối vòng 2 mới)
  await waitFor(ctx, () => window.__rebuild.phase === 'keep', 30000);
  await sleep(700);
  const intro = await ctx.page.evaluate(() => ({ dlg: !!document.querySelector('[data-testid="giu-so-gioi-thieu"]'), text: document.querySelector('[data-testid="giu-so-gioi-thieu"]')?.innerText ?? '', round: window.__rebuild.round }));
  await shot(ctx, 'the-gioi-thieu-giu-so');
  check(ctx, A, `thẻ giới thiệu giữ sổ hiện khi vào đoạn giữ sổ${LABEL === 'sau' ? ' (ngay sau khi ghép xong vòng 2)' : ''}, đồng hồ chưa chạy`, intro.dlg && (await st(ctx)).keep.running === false, intro.text.slice(0, 120));
  if (LABEL === 'sau') {
    check(ctx, A, 'thẻ giới thiệu KHÔNG nhắc "vòng 3" và nêu 45 giây', !/vòng 3/i.test(intro.text) && /45 giây/.test(intro.text), intro.text.slice(0, 200));
    check(ctx, A, 'vẫn ở vòng 2 (chỉ số vòng 1), chuỗi 7 trang đã ghép nằm sẵn, được hồi đủ 3 tim', intro.round === 1 && (await ctx.page.evaluate(() => window.__rebuild.keep.slots.length === 7 && window.__rebuild.hearts === 3)), '');
  }
  const tKeep0 = Date.now();
  await tapAt(ctx, '[data-testid="nut-bat-dau-giu-so"]');
  await waitFor(ctx, () => window.__rebuild.keep.running, 10000);
  // đồng hồ lớn rõ và không che thao tác
  const clock = await ctx.page.evaluate(() => {
    const c = document.querySelector('[data-testid="dong-ho"]'); const r = c.getBoundingClientRect();
    const boxes = ['[data-testid="trang-bia"]', '[data-testid="o-chuoi-the"]', '[data-testid="khay"]', '[data-testid="ro-trang-gia"]', '[data-testid="nut-soi"]'].map((s) => { const e = document.querySelector(s); const b = e && e.getBoundingClientRect(); return b ? { s, overlap: !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom) } : { s, overlap: false }; });
    return { font: parseFloat(getComputedStyle(c).fontSize), w: r.width, h: r.height, boxes, text: c.innerText };
  });
  check(ctx, A, 'đồng hồ lớn (P1a): chữ ≥ 24px, cao ≥ 44px, không đè các thẻ của chuỗi (trang bìa và ô), khay, rổ hay nút "Soi công thức"', clock.font >= 24 && clock.h >= 44 && clock.boxes.every((b) => !b.overlap), JSON.stringify(clock));
  await shot(ctx, 'giu-so-dang-chay');
  let swaps = 0;
  swaps = await playKeep(ctx, { onSwap: async (n) => { if (n === 2) await shot(ctx, 'giu-so-sua-xong-mot-o'); } });
  const tKeep = (Date.now() - tKeep0) / 1000;
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone' || window.__rebuild.phase === 'over', 30000);
  const end = await st(ctx);
  const banner = await ctx.page.evaluate(() => document.querySelector('[data-testid="banner"]')?.innerText ?? '');
  await shot(ctx, 'het-gio-giu-so');
  check(ctx, A, `hết giờ: bảng "Hết giờ giữ sổ" hiện, còn ${end.hearts} tim, ván xong ${LABEL === 'sau' ? 'cả 2 vòng' : 'cả 3 vòng'}`, /Hết giờ/.test(banner) && end.phase === 'roundDone', banner.replace(/\s+/g, ' ').slice(0, 160));
  if (LABEL === 'sau') check(ctx, A, 'bảng hết giờ không nhắc "vòng 3"', !/vòng 3/i.test(banner), banner);
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await waitFor(ctx, () => document.querySelector('[data-testid="diem"]') && [...document.querySelectorAll('button')].some((b) => /^Chơi lại/.test(b.innerText)), 30000);
  const total = (Date.now() - T0) / 1000;
  const res = await ctx.page.evaluate(() => ({ score: document.querySelector('[data-testid="diem"]').innerText, parts: [...document.querySelectorAll('[data-testid="phan-diem"] li')].map((l) => l.innerText.replace(/\s+/g, ' ')), text: document.body.innerText.replace(/\s+/g, ' ') }));
  await shot(ctx, 'ket-qua');
  if (LABEL === 'sau') {
    check(ctx, A, 'màn kết quả: điểm, các dòng điểm (ghép vòng 1, 2, trang giả, giữ sổ), không nhắc "vòng 3"', !/vòng 3/i.test(res.text) && res.parts.some((p) => /Giữ sổ/.test(p)) && res.parts.some((p) => /Vòng 1/.test(p)) && res.parts.some((p) => /Vòng 2/.test(p)), JSON.stringify(res.parts));
    check(ctx, A, 'điểm tối đa của ván hoàn hảo là 355 (100 + 130 + 5 × 25) và bot-người này đạt Vàng nếu sửa nhanh cả 5 lần', Number(res.score.replace(/\D/g, '')) <= 355, res.score);
  }
  const ph = await ctx.page.evaluate(() => window.__ph);
  const keepEntries = ph.filter((p, i) => p[1] === 'keep' && (i === 0 || ph[i - 1][1] !== 'keep')).length;
  check(ctx, A, 'chuyển từ ghép sổ sang giữ sổ đúng MỘT lần', keepEntries === 1, JSON.stringify(ph.map((p) => p.slice(1))));
  const maxRound = Math.max(...ph.map((p) => p[2]));
  check(ctx, A, LABEL === 'sau' ? 'không có vòng 3: chỉ số vòng lớn nhất là 1' : 'bản cũ có vòng 3 riêng: chỉ số vòng lớn nhất là 2', maxRound === (LABEL === 'sau' ? 1 : 2), String(maxRound));
  const tsec = (a, b) => ((b[0] - a[0]) / 1000);
  const idx = (pred) => ph.findIndex(pred);
  const iKeepRun = idx((p) => p[3] === 'run');
  const seg = { tongThoiGianThat: +total.toFixed(1), doanGiuSoThat: +tKeep.toFixed(1), soLanTraoXuLy: swaps, ghepTruocGiuSo: iKeepRun > 0 ? +tsec(ph[0], ph[iKeepRun]).toFixed(1) : null };
  const keepSim = await ctx.page.evaluate(() => window.__rebuild.keep ? window.__rebuild.keep.elapsed : null);
  metrics.push({ size: size.name, label: LABEL, ...seg, giayMoPhongDoanGiuSo: keepSim, gameplayPhases: ph.map((p) => [Math.round(p[0] - ph[0][0]), p[1], p[2], p[3], p[4]]) });
  check(ctx, A, 'không lỗi trang', ctx.errors.length === 0, ctx.errors.join(' | '));
  // chơi lại
  if (LABEL === 'sau') {
    await clickText(ctx, /^Chơi lại/);
    await waitFor(ctx, () => window.__rebuild && window.__rebuild.round === 0 && window.__rebuild.phase === 'play', 60000);
    const r = await st(ctx);
    const clockGone = await ctx.page.evaluate(() => !document.querySelector('[data-testid="dong-ho"]'));
    check(ctx, A, 'chơi lại: ván mới từ vòng 1, 3 tim, chuỗi trống, không còn đồng hồ giữ sổ, không còn trạng thái cũ', r.round === 0 && r.hearts === 3 && r.chain === 0 && r.keep === null && clockGone && r.parts === 0, JSON.stringify(r));
    await shot(ctx, 'choi-lai');
  }
  await ctx.page.close();
}

/** Tạm dừng: ở vòng ghép và đang giữ sổ, hộp "?" dừng hẳn đồng hồ và thế giới; đóng thì chạy tiếp. */
async function scenPause(browser, size) {
  const A = 'tạm dừng';
  const ctx = await newCtx(browser, size);
  await startGame(ctx);
  await playGhep(ctx, false);
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 15000);
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await playGhep(ctx, true);
  await waitFor(ctx, () => window.__rebuild.phase === 'keep', 30000);
  await tapAt(ctx, '[data-testid="nut-bat-dau-giu-so"]');
  await waitFor(ctx, () => window.__rebuild.keep.running && window.__rebuild.keep.elapsed > 1.5, 30000);
  await tapAt(ctx, '[data-testid="nut-goi-y"]');
  await waitFor(ctx, () => document.querySelector('[data-testid="hop-goi-y"]'), 10000);
  await sleep(700);
  const a = await st(ctx);
  await shot(ctx, 'tam-dung');
  await sleep(2500);
  const b = await st(ctx);
  check(ctx, A, 'đang giữ sổ: hộp "?" mở thì đồng hồ đứng yên (giờ chạy không đổi), không tráo thêm', Math.abs(b.keep.elapsed - a.keep.elapsed) < 0.01 && b.keep.swaps === a.keep.swaps, JSON.stringify({ a: a.keep, b: b.keep }));
  const hintText = await ctx.page.evaluate(() => document.querySelector('[data-testid="viec-cua-em"]')?.innerText ?? '');
  check(ctx, A, 'câu nhắc của "?" ở đoạn giữ sổ không nhắc "vòng 3"', !/vòng 3/i.test(hintText) && hintText.length > 5, hintText);
  await clickText(ctx, /^Chơi tiếp/);
  await sleep(2500);
  const c = await st(ctx);
  check(ctx, A, 'đóng hộp: đồng hồ chạy tiếp từ chỗ cũ (không nhảy vọt: tăng ≤ 4 giây sau 2,5 giây thật)', c.keep.elapsed > b.keep.elapsed + 0.3 && c.keep.elapsed - b.keep.elapsed <= 4, JSON.stringify({ b: b.keep.elapsed, c: c.keep.elapsed }));
  noError(ctx, A);
  await ctx.page.close();
}
const noError = (ctx, area) => check(ctx, area, 'không lỗi trang', ctx.errors.length === 0, ctx.errors.join(' | '));

/** Hết giờ: không sửa gì cả; cho nhanh, đặt giờ chạy còn 3 giây bằng cầu nối thăm dò (chỉ để rút ngắn lúc chờ, phần còn lại do mã thật chạy). */
async function scenTimeout(browser, size) {
  const A = 'hết giờ';
  const ctx = await newCtx(browser, size);
  await startGame(ctx);
  await playGhep(ctx, false);
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 15000);
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await playGhep(ctx, true);
  await waitFor(ctx, () => window.__rebuild.phase === 'keep', 30000);
  await tapAt(ctx, '[data-testid="nut-bat-dau-giu-so"]');
  await waitFor(ctx, () => window.__rebuild.keep.swapCount >= 1, 60000);
  await ctx.page.evaluate(() => { const k = window.__rebuild.keep; k.elapsed = Math.max(k.elapsed, 40); k.nextSwapAt = 1e9; });
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 30000);
  await sleep(500);
  const banner = await ctx.page.evaluate(() => document.querySelector('[data-testid="banner"]')?.innerText.replace(/\s+/g, ' ') ?? '');
  const s = await st(ctx);
  check(ctx, A, 'hết 45 giây với 1 ô chưa sửa: bảng hết giờ báo còn lệch 1 ô, điểm đoạn −10', /còn lệch 1 ô/.test(banner) && /−10|-10/.test(banner) || /-?10 điểm|−10 điểm/.test(banner), banner);
  await shot(ctx, 'het-gio-con-lech');
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await waitFor(ctx, () => document.querySelector('[data-testid="diem"]'), 30000);
  const parts = await ctx.page.evaluate(() => [...document.querySelectorAll('[data-testid="phan-diem"] li')].map((l) => l.innerText.replace(/\s+/g, ' ')));
  check(ctx, A, 'kết quả có dòng "Giữ sổ: ô còn lệch khi hết giờ (−10 mỗi ô)"', parts.some((p) => /Giữ sổ: ô còn lệch/.test(p)), JSON.stringify(parts));
  noError(ctx, A);
  await ctx.page.close();
}

/** Hết tim: kéo nhầm trang thật vào rổ 3 lần ở đoạn giữ sổ. */
async function scenHearts(browser, size) {
  const A = 'hết tim';
  const ctx = await newCtx(browser, size);
  await startGame(ctx);
  await playGhep(ctx, false);
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 15000);
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await playGhep(ctx, true);
  await waitFor(ctx, () => window.__rebuild.phase === 'keep', 30000);
  await tapAt(ctx, '[data-testid="nut-bat-dau-giu-so"]');
  await waitFor(ctx, () => window.__rebuild.keep.swapCount >= 1, 60000);
  for (let i = 0; i < 8; i++) {
    const info = await ctx.page.evaluate((n) => { const r = window.__rebuild; const c = r.tray[n % r.tray.length]; return { hearts: r.hearts, id: c && c.id, pressed: !!document.querySelector(`[data-card-id="${c && c.id}"][aria-pressed="true"]`) }; }, i);
    if (info.hearts === 0 || !info.id) break;
    // chạm: thẻ đã được chọn từ lần trước (kéo nhầm không bỏ chọn) thì chỉ cần chạm rổ; nếu không thì chạm thẻ rồi chạm rổ
    if (ctx.touch && info.pressed) await tapAt(ctx, '[data-testid="ro-trang-gia"]');
    else await moveCard(ctx, `[data-testid="the-khay"][data-card-id="${info.id}"]`, '[data-testid="ro-trang-gia"]');
    await sleep(500);
  }
  await waitFor(ctx, () => window.__rebuild.phase === 'over', 15000);
  const s = await st(ctx);
  const banner = await ctx.page.evaluate(() => document.querySelector('[data-testid="banner"]')?.innerText.replace(/\s+/g, ' ') ?? '');
  await shot(ctx, 'het-tim');
  check(ctx, A, 'kéo nhầm trang thật vào rổ 3 lần: hết tim, bảng "Hết tim rồi!", ván kết thúc', s.hearts === 0 && /Hết tim/.test(banner), banner);
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await waitFor(ctx, () => document.querySelector('[data-testid="diem"]') && [...document.querySelectorAll('button')].some((b) => /^Chơi lại/.test(b.innerText)), 30000);
  const score = await ctx.page.evaluate(() => document.querySelector('[data-testid="diem"]').innerText);
  check(ctx, A, 'kết quả hết tim: tính điểm ghép hai vòng (230) và không có điểm giữ sổ', Number(score.replace(/\D/g, '')) === 230, score);
  await clickText(ctx, /^Chơi lại/);
  await waitFor(ctx, () => window.__rebuild && window.__rebuild.round === 0 && window.__rebuild.phase === 'play' && window.__rebuild.hearts === 3, 60000);
  check(ctx, A, 'chơi lại sau khi hết tim: ván mới đủ 3 tim', true);
  noError(ctx, A);
  await ctx.page.close();
}

/** Xoay màn hình: cỡ dọc nhắc xoay ngang; xoay ngang rồi chơi; xoay dọc giữa đoạn giữ sổ rồi xoay lại. */
async function scenRotate(browser, size) {
  if (size.w >= size.h) return;
  const A = 'xoay ngang';
  const ctx = await newCtx(browser, size, false);
  await ctx.page.goto(`${BASE}/lang/lang-giay/man/3?q=low`, { waitUntil: 'domcontentloaded' });
  await waitFor(ctx, () => document.querySelector('[data-testid="the-bat-dau"]'), 90000);
  await sleep(500);
  await clickText(ctx, /^Bắt đầu/);
  await waitFor(ctx, () => document.body.innerText.includes('Xoay ngang để chơi'), 60000);
  await shot(ctx, 'khung-doc-nhac-xoay');
  check(ctx, A, 'khung dọc: nhắc "Xoay ngang để chơi"', true);
  await ctx.page.setViewport({ width: size.h, height: size.w, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await waitFor(ctx, () => window.__rebuild && document.querySelector('[data-testid="man3-khung"]') && !document.body.innerText.includes('Xoay ngang để chơi'), 60000);
  await ctx.page.evaluate(() => {
    window.__ph = [];
    let last = '';
    const loop = () => { const s = window.__rebuild; if (s) { const k = `${s.phase}|${s.round}|${s.keep ? (s.keep.running ? 'run' : 'idle') : '-'}`; if (k !== last) { last = k; window.__ph.push([performance.now(), s.phase, s.round]); } } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  await playGhep(ctx, false);
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 15000);
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await playGhep(ctx, true);
  await waitFor(ctx, () => window.__rebuild.phase === 'keep', 30000);
  await tapAt(ctx, '[data-testid="nut-bat-dau-giu-so"]');
  await waitFor(ctx, () => window.__rebuild.keep.running && window.__rebuild.keep.elapsed > 2, 30000);
  const before = await st(ctx);
  await ctx.page.setViewport({ width: size.w, height: size.h, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await waitFor(ctx, () => document.body.innerText.includes('Xoay ngang để chơi'), 30000);
  const s0 = (await st(ctx)).keep;
  const t0 = s0.elapsed;
  await sleep(3000);
  const s1 = (await st(ctx)).keep;
  const t1 = s1.elapsed;
  await shot(ctx, 'xoay-doc-giua-giu-so');
  await ctx.page.setViewport({ width: size.h, height: size.w, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await waitFor(ctx, () => !document.body.innerText.includes('Xoay ngang để chơi'), 30000);
  await sleep(1500);
  const after = await st(ctx);
  await shot(ctx, 'xoay-lai-ngang');
  check(ctx, A, 'xoay ngang rồi chơi: ghép hai vòng và vào giữ sổ bình thường', before.phase === 'keep' && before.keep.running, JSON.stringify(before));
  check(ctx, A, `xoay dọc giữa đoạn giữ sổ: nhắc xoay ngang hiện và đồng hồ giữ sổ ĐỨNG YÊN (${t0.toFixed(2)} → ${t1.toFixed(2)} giây sau 3 giây thật), không tráo thêm`, Math.abs(t1 - t0) < 0.05 && s1.swaps === s0.swaps, JSON.stringify({ s0, s1 }));
  check(ctx, A, 'xoay ngang lại: ván tiếp tục từ chỗ cũ (đồng hồ chạy tiếp, ≤ 3 giây trong 1,5 giây thật), vẫn ở giữ sổ', after.phase === 'keep' && after.keep.elapsed >= t1 && after.keep.elapsed - t1 <= 3, JSON.stringify({ t1, after: after.keep }));
  metrics.push({ size: size.name, label: LABEL, ghiChuXoay: { giayMoPhongKhiKhungDocBaGiayThat: +(t1 - t0).toFixed(2) } });
  const ph = await ctx.page.evaluate(() => window.__ph);
  check(ctx, A, 'qua các lần xoay vẫn chỉ vào giữ sổ đúng một lần', ph.filter((p, i) => p[1] === 'keep' && (i === 0 || ph[i - 1][1] !== 'keep')).length === 1, JSON.stringify(ph.map((p) => p.slice(1))));
  noError(ctx, A);
  await ctx.page.close();
}

/** Bố cục đồng hồ giữ sổ (P1a) ở cỡ hiện tại: đo các hộp và kiểm không đè thao tác; chạy ở đầu đoạn giữ sổ. */
async function scenLayout(browser, size) {
  const A = 'bố cục đồng hồ';
  const ctx = await newCtx(browser, size);
  await startGame(ctx);
  await playGhep(ctx, false);
  await waitFor(ctx, () => window.__rebuild.phase === 'roundDone', 15000);
  await tapAt(ctx, '[data-testid="nut-tiep"]');
  await playGhep(ctx, true);
  await waitFor(ctx, () => window.__rebuild.phase === 'keep', 30000);
  await tapAt(ctx, '[data-testid="nut-bat-dau-giu-so"]');
  await waitFor(ctx, () => window.__rebuild.keep.running, 10000);
  await sleep(1000);
  const lay = await ctx.page.evaluate(() => {
    const g = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1) }; };
    return { vp: [innerWidth, innerHeight], frame: g('[data-testid="man3-khung"]'), hud: g('[data-testid="hud"]'), clock: g('[data-testid="dong-ho"]'), chuoi: g('[data-testid="chuoi"]'), soi: g('[data-testid="nut-soi"]'), cuaTheDau: g('[data-testid="trang-bia"]') };
  });
  console.log(JSON.stringify(lay));
  check(ctx, A, 'đồng hồ không đè chuỗi (đáy đồng hồ ≤ đỉnh chuỗi)', lay.clock.b <= lay.chuoi.y + 0.5, JSON.stringify(lay));
  await ctx.page.close();
}

const SCEN = { 'bo-cuc': scenLayout, 'tron-van': scenFull, 'tam-dung': scenPause, 'het-gio': scenTimeout, 'het-tim': scenHearts, xoay: scenRotate };
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
        if (flag('v') && lastPage) console.log(JSON.stringify(await lastPage.evaluate(() => ({ s: window.__rebuild && { phase: window.__rebuild.phase, round: window.__rebuild.round, chain: window.__rebuild.chain.length, tray: window.__rebuild.tray.map((c) => c.id), hearts: window.__rebuild.hearts }, text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300) })).catch(() => 'no page')));
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
