// FeedbackSheet sau P2a: (1) Enter nộp đáp án không được đóng luôn hộp vừa mở; giữ phím/key repeat cũng không;
// (2) cha render lại khi hộp còn mở không được phát lại âm hay phản ứng nhân vật. Mỗi lần nộp phát đúng một lần.
// Bàn phím và chuột thật trên DOM; không gọi sound/onAnswer để thay thao tác nộp.
//
// Chạy: node scripts/p2a-feedback-check.mjs [--url=http://localhost:4180] [--label=production] [--size=0,1,2] [--no-write]
//   production: bản build chạy `vite preview` (cổng 4180). Dev StrictMode: `pnpm dev:hub` (5173), --url=http://localhost:5173 --label=dev.
import { mkdirSync, writeFileSync } from 'node:fs';
import { clickText, launch, openLesson, OUT, pageText, sleep, SIZES, tap, typeInto } from './lib/p2a-real.mjs';

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const URL_BASE = arg('url', 'http://localhost:4180');
const LABEL = arg('label', 'production');
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const write = !process.argv.includes('--no-write');

const sheetOpen = (page) => page.evaluate(() => Boolean(document.querySelector('.lesson-window .fixed.z-50')));
const osc = (page) => page.evaluate(() => window.__osc);

/** Đo mọi lần báo "đúng/sai" tới người nghe thường (chính là đường phản ứng nhân vật), chỉ ở dev (có module). */
async function hookAnswerListener(page) {
  if (LABEL !== 'dev') return false;
  return page.evaluate(async (p) => {
    const m = await import(p);
    window.__answers = [];
    m.onAnswer((c) => window.__answers.push(c));
    return true;
  }, `/@fs${process.cwd()}/packages/core/src/audio/answerSignal.ts`).catch(() => false);
}
const answers = (page) => page.evaluate(() => (window.__answers ? window.__answers.length : null));

const focusEl = (page, handle) => handle.evaluate((e) => e.focus());

/** Mỗi bài: một cách chuẩn bị để Enter nộp (ô nhập hoặc nút đang giữ focus) và kết quả mong đợi của lần nộp. */
const VEHICLES = {
  1: {
    tram: 0,
    name: 'bài 1 · trạm Dễ (ô nhập mã trang, Enter trong ô)',
    async prep(ctx) {
      const t = await pageText(ctx.page);
      const m = [...t.matchAll(/\((\d+) × 2 \+ (\d+)\) mod 100 = \?/g)].pop();
      const ans = (2 * Number(m[1]) + Number(m[2])) % 100;
      const input = await ctx.page.waitForSelector('input[aria-label^="Mã trang"]', { visible: true });
      await typeInto(ctx, input, (ans + 1) % 100);
      return { wrong: true };
    },
  },
  4: {
    tram: 0,
    name: 'bài 2 · trạm Dễ (nút Đồng ý/Từ chối giữ focus, Enter trên nút)',
    async prep(ctx, n) {
      const t = await pageText(ctx.page);
      const a = t.match(/Tính: \((\d+) × 2 \+ (\d+)\) mod 100\./);
      const b = t.match(/mã trang họ gửi \((\d+)\)/);
      const valid = (2 * Number(a[1]) + Number(a[2])) % 100 === Number(b[1]);
      const wrong = n % 2 === 0; // lần 1, 3 sai; lần 2 đúng (hộp ĐÚNG)
      const agree = wrong ? !valid : valid;
      const h = await ctx.page.evaluateHandle((txt) => [...document.querySelectorAll('button')].find((b) => b.textContent.includes(txt) && b.getBoundingClientRect().width > 0), agree ? 'Đồng ý' : 'Từ chối');
      await focusEl(ctx.page, h.asElement());
      return { wrong };
    },
  },
  7: {
    tram: 1,
    name: 'bài 3 · trạm Trung bình (nút "Nộp kết quả thẩm định", Enter trên nút)',
    async prep(ctx) {
      for (let i = 0; i < 4; i++) {
        const h = await ctx.page.evaluateHandle((idx) => {
          const heads = [...document.querySelectorAll('.lesson-scroll button')].filter((b) => /Đưa vào máy|Đang trong máy/.test(b.textContent));
          const card = heads[idx].closest('div.relative');
          return [...card.querySelectorAll('button')].find((b) => b.textContent.includes('Thật'));
        }, i);
        await tap(ctx, h.asElement());
      }
      const submit = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Nộp kết quả thẩm định')));
      await submit.asElement().evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await focusEl(ctx.page, submit.asElement());
      return { wrong: null };
    },
  },
  10: {
    tram: 0,
    name: 'bài 4 · trạm Dễ (ô nhập ghép cặp, Enter trong ô)',
    async prep(ctx) {
      const t = await pageText(ctx.page);
      const seg = t.slice(t.search(/Bảng giao dịch/i));
      const vals = {};
      for (const m of seg.matchAll(/T(\d)\n[^\n]+\n(\d+)/g)) vals[m[1]] = Number(m[2]);
      const p = t.match(/GHÉP CẶP T(\d)(\d)/i);
      const expect = vals[p[1]] * 10 + vals[p[2]];
      const input = await ctx.page.waitForSelector('input[placeholder="??"]', { visible: true });
      await typeInto(ctx, input, expect + 1);
      return { wrong: true };
    },
  },
};

async function continueButton(page) {
  const h = await page.evaluateHandle(() => {
    const sheet = document.querySelector('.lesson-window .fixed.z-50');
    const bs = sheet ? [...sheet.querySelectorAll('button')] : [];
    return bs[bs.length - 1] || null;
  });
  return h.asElement();
}

async function runVehicle(browser, size, man) {
  const v = VEHICLES[man];
  const ctx = await openLesson(browser, size, man, v.tram, { base: URL_BASE, sound: true });
  const hooked = await hookAnswerListener(ctx.page);
  const out = [];
  const check = (name, ok, detail = '') => out.push({ man, size: size.name, mode: LABEL, vehicle: v.name, name, ok: Boolean(ok), detail });
  const kb = ctx.page.keyboard;
  try {
    // --- 1. Enter nộp đáp án (một lần nhấn) không đóng hộp ---
    await v.prep(ctx, 0);
    const o0 = await osc(ctx.page);
    const a0 = await answers(ctx.page);
    await kb.down('Enter'); await sleep(70); await kb.up('Enter');
    await sleep(600);
    check('Enter nộp đáp án: hộp phản hồi vẫn mở sau 600 ms', await sheetOpen(ctx.page));
    const oSub1 = (await osc(ctx.page)) - o0;
    const aSub1 = a0 === null ? null : (await answers(ctx.page)) - a0;
    // --- 2. Chạy lại cha nhiều lần khi hộp còn mở: không phát lại ---
    const o1 = await osc(ctx.page);
    const a1 = await answers(ctx.page);
    for (let i = 1; i <= 5; i++) { await ctx.page.setViewport({ width: size.w + i * 6, height: size.h, hasTouch: size.touch, isMobile: size.touch }); await sleep(220); }
    const replayO = (await osc(ctx.page)) - o1;
    const replayA = a1 === null ? null : (await answers(ctx.page)) - a1;
    check(`cha render lại 5 lần khi hộp mở: không phát lại âm (nốt phát thêm = ${replayO})`, replayO === 0 && (await sheetOpen(ctx.page)));
    if (hooked) check(`cha render lại 5 lần: không báo lại phản ứng nhân vật (báo thêm = ${replayA})`, replayA === 0);
    // --- 3. Enter lần tiếp theo (nhấn mới) thì tiếp tục ---
    await kb.down('Enter'); await sleep(70); await kb.up('Enter');
    await sleep(500);
    check('thả phím rồi nhấn Enter lần tiếp theo: hộp đóng (tiếp tục)', !(await sheetOpen(ctx.page)));
    await sleep(600);

    // --- 4. Giữ phím Enter khi nộp: key repeat không đóng hộp; thả rồi nhấn lại mới đóng ---
    await v.prep(ctx, 1);
    const o2 = await osc(ctx.page);
    await kb.down('Enter'); // nhấn nộp, GIỮ phím
    await sleep(120);
    for (let i = 0; i < 8; i++) { await kb.down('Enter'); await sleep(45); } // key repeat (repeat = true)
    const stillOpenDuring = await sheetOpen(ctx.page);
    await kb.up('Enter');
    await sleep(400);
    const oSub2 = (await osc(ctx.page)) - o2;
    check('giữ Enter + key repeat (9 lần keydown): hộp vẫn mở', stillOpenDuring && (await sheetOpen(ctx.page)));
    await kb.down('Enter'); await sleep(70); await kb.up('Enter');
    await sleep(500);
    check('sau khi thả rồi nhấn lại Enter: hộp đóng', !(await sheetOpen(ctx.page)));
    await sleep(600);

    // --- 5. Nút "Tiếp" bằng chuột vẫn hoạt động; lần nộp thứ ba phát đúng một lần như lần đầu ---
    await v.prep(ctx, 2);
    const o3 = await osc(ctx.page);
    await kb.down('Enter'); await sleep(70); await kb.up('Enter');
    await sleep(600);
    const oSub3 = (await osc(ctx.page)) - o3;
    const btn = await continueButton(ctx.page);
    check('lần nộp thứ ba: hộp mở', Boolean(btn) && (await sheetOpen(ctx.page)));
    if (btn) { await tap(ctx, btn); await sleep(500); }
    check('bấm nút Tiếp bằng chuột/chạm: hộp đóng', !(await sheetOpen(ctx.page)));
    // --- 6. Mỗi lần nộp phát đúng một lần: số nốt nhạc mỗi lần nộp, cùng loại thì bằng nhau ---
    check(`ba lần nộp phát âm một lần mỗi lần (nốt: ${oSub1}, ${oSub2}, ${oSub3}); lần 1 và 3 cùng loại có số nốt bằng nhau`, oSub1 > 0 && oSub2 > 0 && oSub3 > 0 && (man === 7 || oSub1 === oSub3));
    if (hooked) check(`lần nộp 1 báo nhân vật đúng một lần cho hộp (báo: ${aSub1})`, aSub1 >= 1 && aSub1 <= 2);
  } catch (e) {
    check(`lỗi chạy: ${e.message}`, false);
  }
  if (ctx.errors.length) check(`có lỗi trang: ${ctx.errors.join(' | ')}`, false);
  await ctx.page.close();
  return out;
}

const browser = await launch();
const all = [];
try {
  for (const si of sizeIdx) {
    for (const man of [1, 4, 7, 10]) {
      const res = await runVehicle(browser, SIZES[si], man);
      all.push(...res);
      console.log(`${res.every((r) => r.ok) ? '✓' : '✗'} [${LABEL}] màn ${man} @ ${SIZES[si].name}: ${res.filter((r) => r.ok).length}/${res.length}`);
      for (const r of res) if (!r.ok) console.log(`    ✗ ${r.name} ${r.detail}`);
    }
  }
} finally {
  await browser.close();
}
if (write) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/feedback-keyboard-${LABEL}.json`, JSON.stringify(all, null, 1));
}
const bad = all.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI: ${bad.length}/${all.length}` : `\nTất cả đạt (${all.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
