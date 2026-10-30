// P6b: thẻ "Em có biết?" có ví dụ và câu hỏi. Kiểm DOM bằng thao tác thật (chuột, bàn phím, chạm) trên BẢN BUILD CÓ CẦU NỐI ĐO (VITE_PROBE), dữ liệu là KHÁCH THẬT (cookie sc_guest, không Supabase, không API giả).
//
// Chuẩn bị (CLAUDE.md mục 9; tắt server nền sau khi đo):
//   pnpm dev:assets &
//   (cd apps/hub && VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true npx vite build --outDir dist-probe-p6b && npx vite preview --outDir dist-probe-p6b --port 5194 --strictPort) &
// Chạy: node scripts/p6b-check.mjs [--base=http://localhost:5194] [--size=0,1,2] [--only=cards,ban-do,cu,chu-to] [--v]
//   Bản dev (cờ "tự hoàn thành", chỉ giáo viên/bản dev): (cd apps/hub && VITE_MERGED=true VITE_ASSETS_URL=http://localhost:5180 npx vite --port 5174 --strictPort) &  rồi  node scripts/p6b-check.mjs --only=tu-hoan-thanh --base=http://localhost:5174
// Cầu nối đo dùng: window.__walkPlayer, __walkApi, __world, __worldInteractables, __worldInside, __boardKinds.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';

const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).split('=').slice(1).join('=');
const flag = (n) => process.argv.includes(`--${n}`);
const BASE = arg('base', 'http://localhost:5194');
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const ONLY = arg('only', 'cards,ban-do,cu,chu-to').split(',');
const OUT = 'docs/screenshots/p6b';
const TAG = arg('tag', 'p6b');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

const ALL_VILLAGES = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];
const ORDER = arg('vil', ALL_VILLAGES.join(',')).split(',');
const FIRST = { 'lang-giay': 1, 'lang-det': 4, 'lang-khac-dau': 7, 'lang-bac': 10 };
// tiêu đề thẻ sau khi sửa (content/lessons/bai-N.ts) và đáp án đúng: ABCD là chỉ số 0 đến 3, điền số là số
const CARDS = {
  'lang-giay': [
    { title: 'Blockchain là một cuốn sổ.', kind: 'abcd', answer: 0 },
    { title: 'Mỗi trang có 2 phần.', kind: 'abcd', answer: 1 },
    { title: 'Cách tính mã trang.', kind: 'number', answer: 44 },
    { title: 'Vì sao khó sửa lén?', kind: 'abcd', answer: 2 },
  ],
  'lang-det': [
    { title: 'Node là ai?', kind: 'abcd', answer: 3 },
    { title: 'Node làm gì khi có trang mới?', kind: 'abcd', answer: 0 },
    { title: 'Đa số đồng ý mới được ghi.', kind: 'abcd', answer: 2 },
    { title: 'Vì sao an toàn hơn?', kind: 'abcd', answer: 1 },
  ],
  'lang-khac-dau': [
    { title: 'Chữ ký trên giấy vs Chữ ký số', kind: 'abcd', answer: 0 },
    { title: 'Phép toán một chiều', kind: 'number', answer: 19 },
    { title: 'Cặp khóa trong Bitcoin', kind: 'abcd', answer: 1 },
    { title: 'Mất khóa riêng là mất vĩnh viễn', kind: 'abcd', answer: 2 },
  ],
  'lang-bac': [
    { title: 'Một khối chứa rất nhiều giao dịch.', kind: 'abcd', answer: 2 },
    { title: 'Cách tạo cây.', kind: 'number', answer: 288 },
    { title: 'Giống bảng đấu loại trực tiếp.', kind: 'abcd', answer: 0 },
    { title: 'Để làm gì?', kind: 'abcd', answer: 3 },
  ],
};
// mỗi cỡ màn hình một kiểu đúng/sai để mọi thẻ được trả lời đúng ít nhất một lần và sai ít nhất một lần qua ba cỡ
const PLAN = {
  '1366x768': (i) => (i % 2 === 0 ? 'right' : 'wrong'),
  '360x800': (i) => (i % 2 === 1 ? 'right' : 'wrong'),
  '844x390': (i) => (i === 3 ? 'wrong' : 'right'),
};

const results = [];
const shots = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ size: ctx.size.name, area, name, ok: Boolean(ok), detail: String(detail).slice(0, 300) });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${ctx.size.name}] ${area}: ${name}${detail ? ` — ${String(detail).slice(0, 200)}` : ''}`);
};

const lesson = [1, 1, 3, 3, 3];
const cookieOf = ({ lv = {}, gp = 0, kc = [0, 0, 0, 0], ac } = {}) => ({ v: 1, lv, gp, c: 0, u: Date.now(), st: 1, kc, gt: 8191, hd: 2147483647, ...(ac !== undefined ? { ac } : {}) });

async function newCtx(browser, size, progress, { reduced = false, large = false } = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.evaluateOnNewDocument(() => {
    Element.prototype.requestPointerLock = function () {
      Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true });
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  });
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.goto(BASE);
  await page.evaluate(
    (p, red, big) => {
      localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: red, largeText: big, rotateMap: false, quality: 'low' }));
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
    },
    progress,
    reduced,
    large,
  );
  return { page, size, errors, touch: size.touch };
}
const cookieNow = (ctx) => ctx.page.evaluate(() => { const m = document.cookie.match(/sc_guest=([^;]+)/); return m ? JSON.parse(decodeURIComponent(m[1])) : null; });

async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 60 });
  if (buf.length >= 300000) throw new Error(`${name} lớn hơn 300 KB`);
  const file = `${TAG}-${name}-${ctx.size.name}.jpg`;
  writeFileSync(`${OUT}/${file}`, buf);
  shots.push({ file, bytes: buf.length });
}

async function skipScenes(ctx) {
  for (let i = 0; i < 6; i++) {
    const skipped = await ctx.page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim()));
      if (b) b.click();
      return Boolean(b);
    });
    await sleep(skipped ? 1200 : 400);
  }
}

/** Vào làng bằng `?tu=` rồi chờ vùng làng dựng xong (đủ cuộn chưa nhặt trong vật tương tác). */
async function openVillage(ctx, id, wantScrolls) {
  await ctx.page.goto(`${BASE}/cho?tu=${id}&q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForFunction(() => window.__walkPlayer && window.__world && window.__worldInteractables, { timeout: 240000 });
  await skipScenes(ctx);
  await ctx.page.waitForFunction((v, n) => window.__worldInside === v && window.__worldInteractables.filter((i) => i.id.startsWith(`scroll:${v}:`)).length === n && window.__worldInteractables.filter((i) => i.id.startsWith(`board:${v}:`)).length === 3, { timeout: 240000 }, id, wantScrolls);
  await ctx.page.waitForFunction((f) => [f, f + 1, f + 2].every((l) => window.__boardKinds?.[l]), { timeout: 240000 }, FIRST[id]);
  await skipScenes(ctx);
  await sleep(3000);
  await skipScenes(ctx);
}
const scrollsOf = (ctx, id) => ctx.page.evaluate((v) => window.__worldInteractables.filter((i) => i.id.startsWith(`scroll:${v}:`)).map((i) => ({ index: Number(i.id.split(':')[2]), x: i.x, z: i.z })), id);
const kindsOf = (ctx, id) => ctx.page.evaluate((f) => [f, f + 1, f + 2].map((l) => window.__boardKinds?.[l] ?? null), FIRST[id]);

async function teleportTo(ctx, x, z) {
  await ctx.page.evaluate((a, b) => { window.__walkPlayer.x = a; window.__walkPlayer.z = b; }, x, z);
  await sleep(1800);
}
async function interact(ctx) {
  if (ctx.touch) {
    const btn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /^Tương tác với/.test(b.getAttribute('aria-label') ?? '')));
    const el = btn.asElement();
    if (!el) return false;
    const r = await el.boundingBox();
    await ctx.page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    return true;
  }
  await ctx.page.keyboard.press('KeyE');
  return true;
}
const dialogOpen = (ctx) => ctx.page.evaluate(() => Boolean(document.querySelector('[data-testid="the-co-cau-hoi"]')));
async function openCard(ctx, id, idx) {
  const sc = (await scrollsOf(ctx, id)).find((s) => s.index === idx);
  if (!sc) throw new Error(`Không thấy cuộn ${id}#${idx}`);
  // đứng SÁT cuộn (0,3 đến 0,5): Bi đi theo người chơi cũng là vật tương tác, đứng xa cuộn thì E có thể mở lời Bi thay vì cuộn
  const offs = [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35], [0.25, 0.25], [-0.25, -0.25]];
  for (let a = 0; a < 6; a++) {
    await ctx.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim())); if (b) b.click(); });
    await sleep(500);
    await teleportTo(ctx, sc.x + offs[a][0], sc.z + offs[a][1]);
    await interact(ctx);
    if (await ctx.page.waitForFunction(() => document.querySelector('[data-testid="the-co-cau-hoi"]'), { timeout: 6000 }).then(() => true, () => false)) return true;
    if (flag('v')) {
      const d = await ctx.page.evaluate((x, z) => {
        const p = window.__walkPlayer;
        let best = null; let bd = 1e9;
        for (const i of window.__worldInteractables) { const dd = Math.hypot(i.x - p.x, i.z - p.z); if (dd < bd) { bd = dd; best = i.id; } }
        return { player: [p.x.toFixed(1), p.z.toFixed(1)], target: [x.toFixed(1), z.toFixed(1)], nearest: best, dist: bd.toFixed(2), dialogs: document.querySelectorAll('[role=dialog]').length, text: document.body.innerText.slice(-160) };
      }, sc.x, sc.z);
      console.log(`   openCard ${id}#${idx} lần ${a + 1}: ${JSON.stringify(d)}`);
    }
  }
  return false;
}
const village_ = (id, idx) => `${id}#${idx}`;
const q = (ctx, sel) => ctx.page.$(sel);
const text = (ctx, sel) => ctx.page.evaluate((s) => document.querySelector(s)?.textContent ?? null, sel);

/** Tap/chuột vào phần tử theo selector (chạm thì touchscreen.tap). */
async function press(ctx, sel) {
  const el = await ctx.page.$(sel);
  if (!el) throw new Error(`Không thấy ${sel}`);
  await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(150);
  const b = await el.boundingBox();
  if (ctx.touch) await ctx.page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  else await ctx.page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}

/** Trả lời một thẻ: how 'keyboard' (Tab, mũi tên, Enter), 'mouse' hoặc 'touch'. Trả về kết quả đọc từ DOM. */
async function answer(ctx, village, idx, plan, how) {
  const card = CARDS[village][idx];
  const area = `${village}#${idx}`;
  const wrongAbcd = (card.answer + 1) % 4;
  const wrongNum = '1';
  if (card.kind === 'abcd') {
    const pick = plan === 'right' ? card.answer : wrongAbcd;
    if (how === 'keyboard') {
      await ctx.page.evaluate(() => document.querySelector('[role="dialog"] [tabindex="-1"]')?.focus());
      for (let t = 0; t < 12; t++) {
        const isRadio = await ctx.page.evaluate(() => document.activeElement?.type === 'radio');
        if (isRadio) break;
        await ctx.page.keyboard.press('Tab');
      }
      if (pick === 0) await ctx.page.keyboard.press('Space');
      else for (let k = 0; k < pick; k++) await ctx.page.keyboard.press('ArrowDown');
      await sleep(200);
      await ctx.page.keyboard.press('Enter');
      await ctx.page.keyboard.press('Enter'); // Enter lặp liền sau cú nộp: không được cất thẻ
    } else {
      await press(ctx, `[data-testid="dap-an-${pick}"]`);
      await sleep(200);
      await press(ctx, '[data-testid="nut-kiem-tra"]');
    }
  } else {
    const value = plan === 'right' ? String(card.answer) : wrongNum;
    if (how === 'keyboard') {
      await ctx.page.evaluate(() => document.querySelector('[role="dialog"] [tabindex="-1"]')?.focus());
      for (let t = 0; t < 12; t++) {
        const isInput = await ctx.page.evaluate(() => document.activeElement?.dataset?.testid === 'o-nhap-so');
        if (isInput) break;
        await ctx.page.keyboard.press('Tab');
      }
      await ctx.page.keyboard.type(value);
      await sleep(200);
      await ctx.page.keyboard.press('Enter');
      await ctx.page.keyboard.press('Enter'); // Enter lặp liền sau cú nộp: không được cất thẻ
    } else {
      await press(ctx, '[data-testid="o-nhap-so"]');
      await ctx.page.keyboard.type(value);
      await sleep(200);
      await press(ctx, '[data-testid="nut-kiem-tra"]');
    }
  }
  await ctx.page.waitForSelector('[data-testid="ket-qua"]', { timeout: 8000 });
  const r = await ctx.page.evaluate(() => ({
    correct: document.querySelector('[data-testid="ket-qua"]').dataset.correct,
    dapAn: document.querySelector('[data-testid="dap-an-dung"]')?.textContent ?? '',
    giaiThich: document.querySelector('[data-testid="giai-thich"]')?.textContent ?? '',
    phase: document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase,
  }));
  check(ctx, area, `trả lời ${plan === 'right' ? 'đúng' : 'sai'} (${how}): kết quả đúng/sai hiện đúng`, r.correct === (plan === 'right' ? 'true' : 'false') && r.phase === 'feedback', JSON.stringify(r).slice(0, 160));
  const expectText = card.kind === 'abcd' ? `Đáp án đúng: ${'ABCD'[card.answer]}.` : `Đáp án đúng: ${card.answer}`;
  check(ctx, area, 'đáp án đúng và giải thích hiện (cả khi sai)', r.dapAn.startsWith(expectText) && r.giaiThich.length > 40, r.dapAn.slice(0, 80));
  return r;
}

async function collectedBits(ctx) {
  const c = await cookieNow(ctx);
  return c?.kc ?? [0, 0, 0, 0];
}

async function cardsRun(browser, size) {
  const plan = PLAN[size.name];
  const ctx = await newCtx(browser, size, cookieOf());
  const ex = size.touch ? 'touch' : 'keyboard';
  let cardNo = 0;
  for (const id of ORDER) {
    const vi = ALL_VILLAGES.indexOf(id);
    await openVillage(ctx, id, 4);
    check(ctx, id, 'khách mới: đủ 4 cuộn chưa nhặt; 3 biển khóa (chưa đủ thẻ)', (await kindsOf(ctx, id)).join() === 'locked,locked,locked');
    if (cardNo === 0) {
      const m0 = await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="ban-do-nho"] [data-glyph="scroll"]').length);
      check(ctx, id, 'khách mới: bản đồ nhỏ có đủ 16 ký hiệu thẻ chưa nhặt', m0 === 16, String(m0));
    }
    for (let idx = 0; idx < 4; idx++) {
      const area = `${id}#${idx}`;
      const how = size.touch ? 'touch' : idx % 2 === 0 ? 'keyboard' : 'mouse';
      check(ctx, area, 'nhặt cuộn bằng E/chạm mở hộp thẻ', await openCard(ctx, id, idx));
      const info = await ctx.page.evaluate(() => ({
        title: document.querySelector('[role="dialog"] h2')?.textContent,
        hasText: Boolean(document.querySelector('[data-testid="the-noi-dung"]')?.textContent),
        hasExample: Boolean(document.querySelector('[data-testid="the-vi-du"]')?.textContent),
        phase: document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase,
        hasQuestion: /^Câu hỏi: /.test(document.querySelector('[data-testid="the-cau-hoi"] p')?.textContent ?? ''),
        feedback: Boolean(document.querySelector('[data-testid="phan-hoi"]')),
        save: Boolean(document.querySelector('[data-testid="nut-cat-vao-so"]')),
      }));
      check(ctx, area, `đúng thẻ "${CARDS[id][idx].title}", có nội dung, ví dụ, câu hỏi; chưa có đáp án và nút Cất vào sổ`, info.title === CARDS[id][idx].title && info.hasText && info.hasExample && info.hasQuestion && info.phase === 'ask' && !info.feedback && !info.save, JSON.stringify(info));
      await sleep(900); // cú click ma của cú chạm mở hộp (nút bàn tay dùng pointerdown) không được chọn nhầm hay bấm nhầm gì
      const ghost = await ctx.page.evaluate(() => ({ open: Boolean(document.querySelector('[data-testid="the-co-cau-hoi"]')), phase: document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase, picked: [...document.querySelectorAll('input[type=radio]')].some((r) => r.checked), nhac: Boolean(document.querySelector('[data-testid="nhac-tra-loi"]')) }));
      check(ctx, area, 'vừa mở hộp (chạm/E): không có cú bấm ma (chưa chọn gì, không lời nhắc, hộp còn mở, chưa trả lời)', ghost.open && ghost.phase === 'ask' && !ghost.picked && !ghost.nhac, JSON.stringify(ghost));
      // cảnh/điều khiển tạm dừng khi mở hộp (máy tính: giữ W 1,5 giây, người chơi không đi)
      if (!size.touch && idx === 0) {
        const p0 = await ctx.page.evaluate(() => [window.__walkPlayer.x, window.__walkPlayer.z]);
        await ctx.page.keyboard.down('KeyW');
        await sleep(1500);
        await ctx.page.keyboard.up('KeyW');
        const p1 = await ctx.page.evaluate(() => [window.__walkPlayer.x, window.__walkPlayer.z]);
        check(ctx, area, 'mở hộp thì điều khiển tạm dừng (giữ W 1,5 giây, người chơi đứng yên)', Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.05, JSON.stringify([p0, p1]));
      }
      if (idx === 0) await shot(ctx, `hop-the-hoi-${id}`);
      // nhắc khi chưa trả lời hợp lệ: không tính là lần trả lời
      const card = CARDS[id][idx];
      if (card.kind === 'number') {
        await press(ctx, '[data-testid="nut-kiem-tra"]');
        const r1 = await ctx.page.evaluate(() => ({ nhac: document.querySelector('[data-testid="nhac-tra-loi"]')?.textContent, phase: document.querySelector('[data-testid="the-cau-hoi"]').dataset.phase }));
        check(ctx, area, 'bấm Kiểm tra khi để trống: hiện lời nhắc, chưa tính là trả lời', /nhập một số/.test(r1.nhac ?? '') && r1.phase === 'ask', JSON.stringify(r1));
        await press(ctx, '[data-testid="o-nhap-so"]');
        await ctx.page.keyboard.type('04a');
        await press(ctx, '[data-testid="nut-kiem-tra"]');
        const r2 = await ctx.page.evaluate(() => ({ nhac: document.querySelector('[data-testid="nhac-tra-loi"]')?.textContent, phase: document.querySelector('[data-testid="the-cau-hoi"]').dataset.phase }));
        check(ctx, area, 'gõ sai định dạng (04a): hiện lời nhắc, chưa tính là trả lời', /chữ số/.test(r2.nhac ?? '') && r2.phase === 'ask', JSON.stringify(r2));
        await ctx.page.evaluate(() => { const i = document.querySelector('[data-testid="o-nhap-so"]'); i.focus(); i.select(); });
        await ctx.page.keyboard.press('Backspace');
        const inp = await ctx.page.evaluate(() => { const i = document.querySelector('[data-testid="o-nhap-so"]'); return { type: i.type, mode: i.inputMode, val: i.value }; });
        check(ctx, area, 'ô điền số là văn bản với bàn phím số (không type=number), xóa được', inp.type === 'text' && inp.mode === 'numeric' && inp.val === '', JSON.stringify(inp));
      } else {
        await press(ctx, '[data-testid="nut-kiem-tra"]');
        const r1 = await ctx.page.evaluate(() => ({ nhac: document.querySelector('[data-testid="nhac-tra-loi"]')?.textContent, phase: document.querySelector('[data-testid="the-cau-hoi"]').dataset.phase }));
        check(ctx, area, 'bấm Kiểm tra khi chưa chọn: hiện lời nhắc, chưa tính là trả lời', /chọn một đáp án/.test(r1.nhac ?? '') && r1.phase === 'ask', JSON.stringify(r1));
        if (r1.phase !== 'ask') { await shot(ctx, `loi-${id}-${idx}`); console.log('   DOM:', (await ctx.page.evaluate(() => document.querySelector('[data-testid="the-co-cau-hoi"]')?.outerHTML.slice(0, 700))) ?? ''); }
      }
      const r = await answer(ctx, id, idx, plan(idx + vi), how);
      if (idx === 1) await shot(ctx, `hop-the-${r.correct === 'true' ? 'dung' : 'sai'}-${id}`);
      // trước khi cất: cờ chưa ghi
      check(ctx, area, 'đã trả lời nhưng CHƯA cất: cờ knowCards chưa ghi', (await collectedBits(ctx))[vi] === (idx === 0 ? 0 : (1 << idx) - 1), JSON.stringify(await collectedBits(ctx)));
      // khóa lựa chọn sau khi nộp
      const locked = await ctx.page.evaluate(() => ({ radios: [...document.querySelectorAll('input[type=radio]')].every((r) => r.matches(':disabled')), numRo: document.querySelector('[data-testid="o-nhap-so"]')?.readOnly ?? true, kiemTra: Boolean(document.querySelector('[data-testid="nut-kiem-tra"]')) }));
      check(ctx, area, 'sau khi nộp: lựa chọn/ô gõ bị khóa, không còn nút Kiểm tra', locked.radios && locked.numRo && !locked.kiemTra, JSON.stringify(locked));
      if (card.kind === 'abcd') {
        const clickLocked = await ctx.page.evaluate(() => { const l = document.querySelector('[data-testid="dap-an-0"]'); l.click(); return [...document.querySelectorAll('input[type=radio]')].map((r) => r.checked).join(); });
        // vẫn đúng một lựa chọn như đã nộp (không đổi)
        check(ctx, area, 'bấm đổi đáp án sau khi nộp không có tác dụng', clickLocked.split(',').filter((x) => x === 'true').length === 1, clickLocked);
      }
      // (Enter lặp liền sau cú nộp đã gửi ngay trong answer(); các kiểm "chưa cất" ở trên xác nhận hộp còn mở và cờ chưa ghi)
      if (!size.touch && how === 'keyboard') check(ctx, area, 'Enter lặp liền sau cú nộp KHÔNG cất thẻ và không chuyển bước (hộp còn mở, cờ chưa ghi)', (await dialogOpen(ctx)) && (await collectedBits(ctx))[vi] === (idx === 0 ? 0 : (1 << idx) - 1));
      // đóng trước khi cất (Esc hoặc chạm nền) không đánh dấu đã nhặt; mở lại thì hỏi lại từ đầu
      if (idx === 0) {
        if (size.touch) await ctx.page.touchscreen.tap(4, 4);
        else await ctx.page.keyboard.press('Escape');
        await sleep(600);
        const closed = !(await dialogOpen(ctx));
        const still = (await scrollsOf(ctx, id)).some((s) => s.index === idx);
        check(ctx, area, `đóng trước khi cất (${size.touch ? 'chạm nền' : 'Esc'}): hộp đóng, thẻ chưa nhặt (cuộn còn, cờ chưa ghi)`, closed && still && (await collectedBits(ctx))[vi] === 0, JSON.stringify(await collectedBits(ctx)));
        check(ctx, area, 'mở lại cuộn: hỏi lại từ đầu (không nhớ đáp án đã nộp)', await openCard(ctx, id, idx));
        await sleep(900); // người chơi đọc nội dung trước khi trả lời (hộp bỏ qua cú bấm trong 450 ms đầu)
        const again = await ctx.page.evaluate(() => ({ phase: document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase, fb: Boolean(document.querySelector('[data-testid="phan-hoi"]')), checked: [...document.querySelectorAll('input[type=radio]')].some((r) => r.checked), val: document.querySelector('[data-testid="o-nhap-so"]')?.value ?? '' }));
        check(ctx, area, 'lượt mở lại ở trạng thái chưa trả lời', again.phase === 'ask' && !again.fb && !again.checked && again.val === '', JSON.stringify(again));
        await answer(ctx, id, idx, plan(idx + vi), how);
      }
      // cất vào sổ: chờ nút hết khóa rồi bấm/Enter
      await sleep(700);
      const pre = await ctx.page.evaluate(() => { const b = document.querySelector('[data-testid="nut-cat-vao-so"]'); return {  act: document.activeElement?.dataset?.testid ?? document.activeElement?.tagName, open: Boolean(document.querySelector('[data-testid="the-co-cau-hoi"]')) }; });
      if (flag('v')) console.log(`   · trước khi cất ${village_(id, idx)}: ${JSON.stringify(pre)} lỗi: ${ctx.errors.slice(-2).join(' | ')}`);
      if (!size.touch && how === 'keyboard') {
        const focused = await ctx.page.evaluate(() => document.activeElement?.dataset?.testid);
        check(ctx, area, 'sau khi nộp tiêu điểm nằm ở nút Cất vào sổ (bàn phím)', focused === 'nut-cat-vao-so', focused);
        await ctx.page.keyboard.press('Enter');
      } else await press(ctx, '[data-testid="nut-cat-vao-so"]');
      await sleep(900);
      const bits = await collectedBits(ctx);
      const gone = !(await scrollsOf(ctx, id)).some((s) => s.index === idx);
      check(ctx, area, 'cất vào sổ: hộp đóng, ghi ĐÚNG bit thẻ này (không lệch chỉ số), cuộn biến mất', !(await dialogOpen(ctx)) && bits[vi] === (1 << (idx + 1)) - 1 && gone, JSON.stringify(bits));
      cardNo += 1;
      if (idx === 1) {
        // xem lại thẻ đã nhặt ở menu: có ví dụ, câu hỏi, đáp án và giải thích, không bắt trả lời lại
        const menuBtn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Menu'));
        await ctx.page.evaluate((b) => b.click(), menuBtn);
        await sleep(700);
        const entry = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Em có biết?'));
        if (entry.asElement()) {
          await ctx.page.evaluate((b) => b.click(), entry);
          await sleep(700);
          const first = await ctx.page.$('[data-testid="the-da-nhat"]');
          if (first) await ctx.page.evaluate((b) => b.click(), first);
          await sleep(500);
          const rv = await ctx.page.evaluate(() => ({ mode: document.querySelector('[data-testid="the-co-cau-hoi"]')?.dataset.mode, phase: document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase, ex: Boolean(document.querySelector('[data-testid="the-vi-du"]')), ans: document.querySelector('[data-testid="dap-an-dung"]')?.textContent ?? '', exp: document.querySelector('[data-testid="giai-thich"]')?.textContent ?? '', inputs: document.querySelectorAll('input[type=text], button[data-testid="nut-kiem-tra"], [data-testid="nut-cat-vao-so"]').length }));
          check(ctx, area, 'xem lại thẻ đã nhặt (menu Em có biết?): có ví dụ, câu hỏi, đáp án, giải thích; không bắt trả lời lại', rv.mode === 'review' && rv.phase === 'review' && rv.ex && /^Đáp án đúng/.test(rv.ans) && rv.exp.length > 40 && rv.inputs === 0, JSON.stringify(rv).slice(0, 200));
          if (id === 'lang-giay') await shot(ctx, `xem-lai-${id}`);
          await ctx.page.keyboard.press('Escape');
          await sleep(400);
          await ctx.page.keyboard.press('Escape');
          await sleep(400);
          const after = await collectedBits(ctx);
          check(ctx, area, 'xem lại không làm mất thẻ (cờ giữ nguyên)', after[vi] === (1 << (idx + 1)) - 1, JSON.stringify(after));
        } else {
          check(ctx, area, 'có mục "Em có biết?" ở menu để xem lại', false, 'không thấy nút');
        }
        // đóng hết hộp/menu còn mở để tiếp tục
        for (let k = 0; k < 3; k++) { await ctx.page.keyboard.press('Escape'); await sleep(250); }
        await ctx.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^(Tiếp tục|Đóng)$/.test(q.textContent.trim())); if (b) b.click(); });
        await sleep(500);
      }
    }
    // đủ 4 thẻ: bài học mở như trước
    const kinds = await kindsOf(ctx, id);
    check(ctx, id, 'cất đủ 4 thẻ (có cả đúng và sai): bài học của làng mở (open), hai màn sau vẫn khóa theo thứ tự', kinds.join() === 'open,locked,locked', kinds.join());
    check(ctx, id, 'không còn cuộn nào trong làng', (await scrollsOf(ctx, id)).length === 0);
    // chưa cờ nào khác: điểm, xu, Trang Sổ Vàng không đổi
    const c = await cookieNow(ctx);
    check(ctx, id, 'không phát sinh điểm, xu, Trang Sổ Vàng', (c?.c ?? 0) === 0 && (c?.gp ?? 0) === 0 && Object.keys(c?.lv ?? {}).length === 0, JSON.stringify({ c: c?.c, gp: c?.gp, lv: c?.lv }));
    check(ctx, id, 'cờ chỉ là mặt nạ bit knowCards (không có trường lưu đáp án)', !JSON.stringify(c).match(/dapan|answer|quiz|tl/i), JSON.stringify(c).slice(0, 200));
  }
  check(ctx, 'tổng', `đã trả lời và cất thật ${cardNo}/${ORDER.length * 4} thẻ`, cardNo === ORDER.length * 4, String(cardNo));
  // tải lại sau khi cất: cuộn vẫn biến mất, biển vẫn mở
  await openVillage(ctx, ORDER.includes('lang-giay') ? 'lang-giay' : ORDER[0], 0);
  const after = await ctx.page.evaluate(() => ({ scrolls: window.__worldInteractables.filter((i) => i.id.startsWith('scroll:lang-giay:')).length, kinds: [1, 2, 3].map((l) => window.__boardKinds?.[l] ?? null) }));
  check(ctx, 'tải lại', 'tải lại trang sau khi cất: Làng Giấy không còn cuộn, bài học vẫn mở', after.scrolls === 0 && after.kinds.join() === 'open,locked,locked', JSON.stringify(after));
  const mini = await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="ban-do-nho"] [data-glyph="scroll"]').length);
  check(ctx, 'tải lại', `bản đồ nhỏ chỉ còn ký hiệu thẻ chưa nhặt (${mini}, mong ${(ALL_VILLAGES.length - ORDER.length) * 4})`, mini === (ALL_VILLAGES.length - ORDER.length) * 4, String(mini));
  check(ctx, 'lỗi trang', 'không lỗi trang', ctx.errors.length === 0, ctx.errors.slice(0, 2).join(' | '));
  await ctx.page.close();
}

/** Tiến độ cũ giữ nguyên + /ban-do chỉ là phần đọc (không đánh dấu nhặt thẻ, không câu hỏi). */
async function banDoRun(browser, size) {
  let ctx = await newCtx(browser, size, cookieOf());
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'networkidle0' });
  await ctx.page.waitForSelector('button[data-village]', { timeout: 60000 });
  await ctx.page.evaluate(() => document.querySelector('button[data-village="lang-khac-dau"]').click());
  await sleep(1500);
  // lần đầu chọn làng: hộp giới thiệu (VN); đọc hết tới nút "Xem các màn"
  for (let i = 0; i < 60; i++) {
    // lần bấm đầu của mỗi lượt chỉ làm chữ hiện nhanh, lần sau mới sang lượt: bấm "Tiếp"/"Xem các màn" cho tới khi hộp giới thiệu biến mất
    const more = await ctx.page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^(Xem các màn|Tiếp)/.test(q.textContent.trim()));
      if (b) b.click();
      return Boolean(b);
    });
    await sleep(450);
    if (!more) break;
  }
  await sleep(800);
  check(ctx, '/ban-do', 'giới thiệu làng đọc hết không có câu hỏi nào', (await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="the-cau-hoi"], [data-testid="o-nhap-so"]').length)) === 0);
  check(ctx, '/ban-do', 'đọc hết giới thiệu làng KHÔNG đánh dấu nhặt thẻ (kc vẫn 0)', (await collectedBits(ctx)).join() === '0,0,0,0', JSON.stringify(await collectedBits(ctx)));
  await shot(ctx, 'ban-do-bang-lang');
  const panel = await ctx.page.evaluate(() => document.body.innerText);
  check(ctx, '/ban-do', 'bảng làng nói rõ phải nhặt đủ 4 thẻ trong làng (0/4), ở đây chỉ đọc', /nhặt đủ 4 thẻ Em có biết trong làng này/.test(panel) && /0\/4/.test(panel), '');
  const readBtn = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /Đọc thẻ Em có biết/.test(b.textContent)));
  if (readBtn.asElement()) {
    await ctx.page.evaluate((b) => b.click(), readBtn);
    await sleep(700);
    const n1 = await ctx.page.evaluate(() => document.body.innerText.match(/thẻ \d\/(\d)/i)?.[1]); // innerText theo CSS uppercase: "THẺ 1/5"
    for (let i = 0; i < 8; i++) { await ctx.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^Tiếp$/.test(q.textContent.trim())); if (b) b.click(); }); await sleep(250); }
    if (size.name === '1366x768') await shot(ctx, 'ban-do-doc-the');
    check(ctx, '/ban-do', 'nút Đọc thẻ mở hộp đọc đủ 5 thẻ của Làng Khắc Dấu (chỉ đọc, không câu hỏi)', n1 === '5' && (await ctx.page.evaluate(() => document.querySelectorAll('[data-testid="the-cau-hoi"]').length)) === 0, n1);
    await ctx.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^Đóng$/.test(q.textContent.trim())); if (b) b.click(); });
    await sleep(600);
  } else check(ctx, '/ban-do', 'có nút Đọc thẻ Em có biết', false, '');
  check(ctx, '/ban-do', 'đọc đủ các thẻ ở /ban-do KHÔNG đánh dấu nhặt thẻ (kc vẫn 0, bài học vẫn bị chặn)', (await collectedBits(ctx)).join() === '0,0,0,0', JSON.stringify(await collectedBits(ctx)));
  await ctx.page.close();

  // tiến độ cũ: đã xong bài học 1 (coi như đủ thẻ) và đã có 2 thẻ Làng Dệt
  ctx = await newCtx(browser, size, cookieOf({ lv: { 1: lesson }, gp: 0, kc: [0, 3, 0, 0] }));
  await openVillage(ctx, 'lang-det', 2);
  const sc = await scrollsOf(ctx, 'lang-det');
  check(ctx, 'tiến độ cũ', 'Làng Dệt có sẵn 2 thẻ (bit 0, 1): chỉ còn cuộn 2 và 3', sc.map((s) => s.index).sort().join() === '2,3', JSON.stringify(sc.map((s) => s.index)));
  check(ctx, 'tiến độ cũ', 'cờ cũ giữ nguyên sau khi vào làng', (await collectedBits(ctx)).join() === '0,3,0,0', JSON.stringify(await collectedBits(ctx)));
  await ctx.page.close();
  ctx = await newCtx(browser, size, cookieOf({ lv: { 1: lesson }, gp: 0 }));
  await openVillage(ctx, 'lang-giay', 0);
  check(ctx, 'tiến độ cũ', 'đã xong bài học 1 từ trước: coi như đủ thẻ, không còn cuộn, bài học vẫn mở', (await kindsOf(ctx, 'lang-giay')).join() === 'done,open,locked', (await kindsOf(ctx, 'lang-giay')).join());
  await ctx.page.close();
}

/** Chữ to + Giảm chuyển động + nội dung dài ở màn hình thấp: cuộn được, nút bấm được, không hiệu ứng. */
async function chuToRun(browser, size) {
  const sizes = {};
  for (const [name, opts] of [['thuong', {}], ['chu-to', { large: true, reduced: true }]]) {
    const ctx = await newCtx(browser, size, cookieOf(), opts);
    await openVillage(ctx, 'lang-giay', 4);
    check(ctx, `chữ to/${name}`, 'mở được cuộn thẻ 4 (nội dung dài nhất)', await openCard(ctx, 'lang-giay', 3));
    await sleep(900); // người chơi đọc trước khi bấm (hộp bỏ qua cú bấm trong 450 ms đầu, chặn cú click ma)
    const m = await ctx.page.evaluate(() => {
      const outer = document.querySelector('[data-testid="the-co-cau-hoi"]');
      const h2 = document.querySelector('[role="dialog"] h2');
      return { font: parseFloat(getComputedStyle(h2).fontSize), scrollable: outer.scrollHeight > outer.clientHeight, ch: outer.clientHeight, sh: outer.scrollHeight, anims: document.getAnimations().filter((a) => outer.contains(a.effect?.target ?? null)).length };
    });
    sizes[name] = m;
    check(ctx, `chữ to/${name}`, 'không có hoạt ảnh trong hộp (hợp Giảm chuyển động)', m.anims === 0, String(m.anims));
    if (size.h < 500) check(ctx, `chữ to/${name}`, 'màn thấp: hộp cuộn được (nội dung dài hơn khung nhìn)', m.scrollable, JSON.stringify(m));
    // cuộn tới cuối: nút Kiểm tra bấm được
    const reach = await ctx.page.evaluate(() => { const b = document.querySelector('[data-testid="nut-kiem-tra"]'); b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight && r.width > 40 && r.height >= 40; });
    check(ctx, `chữ to/${name}`, 'cuộn tới nút Kiểm tra, nằm trọn trong khung nhìn và đủ lớn (≥ 40px)', reach, '');
    // bàn phím: Tab đi qua các lựa chọn, tiêu điểm nhìn thấy (outline)
    if (!size.touch) {
      await ctx.page.keyboard.press('Tab');
      await ctx.page.keyboard.press('Tab');
      const focus = await ctx.page.evaluate(() => { const a = document.activeElement; return { tag: a?.tagName, inDialog: Boolean(a?.closest('[role="dialog"]')) }; });
      check(ctx, `chữ to/${name}`, 'Tab đưa tiêu điểm vào trong hộp (không rơi ra cảnh)', focus.inDialog, JSON.stringify(focus));
    }
    await press(ctx, '[data-testid="dap-an-3"]');
    await sleep(300);
    await press(ctx, '[data-testid="nut-kiem-tra"]');
    const got = await ctx.page.waitForSelector('[data-testid="ket-qua"]', { timeout: 8000 }).then(() => true, () => false);
    if (!got) {
      const dbg = await ctx.page.evaluate(() => ({ open: Boolean(document.querySelector('[data-testid="the-co-cau-hoi"]')), phase: document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase, picked: [...document.querySelectorAll('input[type=radio]')].map((r) => r.checked), nhac: document.querySelector('[data-testid="nhac-tra-loi"]')?.textContent, active: document.activeElement?.tagName }));
      console.log('   DEBUG chữ to:', JSON.stringify(dbg));
      await shot(ctx, `loi-chu-to-${name}`);
      throw new Error(`chữ to/${name}: không thấy kết quả sau khi nộp ${JSON.stringify(dbg)}`);
    }
    const cat = await ctx.page.evaluate(() => { const b = document.querySelector('[data-testid="nut-cat-vao-so"]'); b.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; });
    check(ctx, `chữ to/${name}`, 'sau khi nộp: phản hồi và nút Cất vào sổ cuộn tới được', cat, '');
    await shot(ctx, `${name}-phan-hoi`);
    check(ctx, `chữ to/${name}`, 'không lỗi trang', ctx.errors.length === 0, ctx.errors.join(' | '));
    await ctx.page.close();
  }
  const c = new Object();
  const ctx0 = { size, touch: size.touch };
  check(ctx0, 'chữ to', `Chữ to làm tiêu đề thẻ to hơn (${sizes.thuong?.font}px → ${sizes['chu-to']?.font}px)`, sizes['chu-to'].font > sizes.thuong.font * 1.1, JSON.stringify([sizes.thuong?.font, sizes['chu-to']?.font]));
  void c;
}

/** Bản dev: cờ tự hoàn thành không biến thẻ chưa nhặt thành đã nhặt. */
async function tuHoanThanhRun(browser, size) {
  const ctx = await newCtx(browser, size, cookieOf({ ac: 4095 }));
  for (const id of ORDER) {
    await openVillage(ctx, id, 4);
    const sc = await scrollsOf(ctx, id);
    const kinds = await kindsOf(ctx, id);
    check(ctx, `tự hoàn thành/${id}`, 'cả 3 biển hiện xong nhưng đủ 4 cuộn thẻ VẪN chưa nhặt', sc.length === 4 && kinds.join() === 'done,done,done', `${sc.length} cuộn, ${kinds.join()}`);
  }
  check(ctx, 'tự hoàn thành', 'cờ knowCards không đổi (kc vẫn 0)', (await collectedBits(ctx)).join() === '0,0,0,0', JSON.stringify(await collectedBits(ctx)));
  await ctx.page.close();
}

const CHROME = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    const before = results.length;
    try {
      if (ONLY.includes('cards')) await cardsRun(browser, size);
      if (ONLY.includes('ban-do') && size.name !== '844x390') await banDoRun(browser, size);
      if (ONLY.includes('chu-to')) await chuToRun(browser, size);
      if (ONLY.includes('tu-hoan-thanh') && size.name === '1366x768') await tuHoanThanhRun(browser, size);
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
writeFileSync(`${OUT}/ket-qua-${TAG}.json`, JSON.stringify({ results, shots }, null, 1));
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
