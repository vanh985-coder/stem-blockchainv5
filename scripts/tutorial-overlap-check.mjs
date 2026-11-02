// Đo hướng dẫn P8 (TutorialSpotlight) ở cả 20 màn có hướng dẫn: 4 bài học x 3 trạm + 8 game, 3 cỡ khung.
//   1) tooltip KHÔNG giao vùng sáng (target), cho phép <= 2% diện tích vùng sáng;
//   2) mọi nút trong tooltip nằm trọn trong khung nhìn và bấm trúng (elementFromPoint);
//   3) giữ Enter 1 giây: sau lần nhấn đầu (hợp lệ, tối đa 1 bước) các lần lặp không chuyển bước, không tự đóng hướng dẫn.
// Chạy trên bản build có VITE_PROBE: cd apps/hub && VITE_MERGED=true VITE_PROBE=true npx vite build --outDir dist-tut
// rồi npx vite preview --outDir dist-tut --port 5193 --strictPort, cùng pnpm dev:assets (5180).
// Biến môi trường: TUT_BASE (mặc định http://localhost:5193), TUT_JSON (ghi kết quả JSON), TUT_ONLY (lọc tên ca, ví dụ "Man4"), TUT_VP (lọc cỡ, ví dụ "360x800").
import puppeteer from 'puppeteer-core';
import { existsSync, writeFileSync } from 'node:fs';

const BASE_URL = process.env.TUT_BASE ?? 'http://localhost:5193';
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const chromePath = CHROME_PATHS.find((p) => p && existsSync(p));
if (!chromePath) {
  console.error('Không tìm thấy Google Chrome');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_OVERLAP = 0.02;
const MAX_STEPS = 12;

const VIEWPORTS = [
  { name: '1366x768', w: 1366, h: 768, mobile: false },
  { name: '360x800', w: 360, h: 800, mobile: true },
  { name: '844x390', w: 844, h: 390, mobile: true },
].filter((v) => !process.env.TUT_VP || v.name === process.env.TUT_VP);

// Trạm chọn bằng sao đã có trong cookie: [đã chơi, xong, sao dễ, sao vừa, sao khó]; trạm đầu chưa có sao là trạm mở khi vào bài.
const LESSONS = [
  { n: 1, village: 'lang-giay', name: 'Man1' },
  { n: 4, village: 'lang-det', name: 'Man4' },
  { n: 7, village: 'lang-khac-dau', name: 'Man7' },
  { n: 10, village: 'lang-bac', name: 'Man10' },
];
const STATIONS = [
  { id: 'De', rec: [0, 0, 0, 0, 0] },
  { id: 'Vua', rec: [1, 0, 3, 0, 0] },
  { id: 'Kho', rec: [1, 0, 3, 3, 0] },
];
const GAMES = [
  { n: 2, village: 'lang-giay' },
  { n: 3, village: 'lang-giay' },
  { n: 5, village: 'lang-det' },
  { n: 6, village: 'lang-det' },
  { n: 8, village: 'lang-khac-dau' },
  { n: 9, village: 'lang-khac-dau' },
  { n: 11, village: 'lang-bac' },
  { n: 12, village: 'lang-bac' },
];

const CASES = [
  ...LESSONS.flatMap((l) => STATIONS.map((s) => ({ name: `${l.name}-${s.id}`, n: l.n, village: l.village, rec: s.rec }))),
  ...GAMES.map((g) => ({ name: `Man${g.n}`, n: g.n, village: g.village, rec: null })),
].filter((c) => !process.env.TUT_ONLY || c.name.includes(process.env.TUT_ONLY));

function cookieFor(c) {
  const lv = {};
  for (let i = 1; i <= 12; i++) lv[String(i)] = [1, 1, 3, 0, 100];
  lv[String(c.n)] = c.rec ?? [0, 0, 0, 0, 0];
  return { v: 1, lv, gp: 0, c: 10, u: Date.now(), st: 1, kc: [0, 0, 0, 0] };
}

async function enter(page, c) {
  await page.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(cookieFor(c))), url: BASE_URL });
  await page.goto(`${BASE_URL}/lang/${c.village}/man/${c.n}?q=low&warmup=off`, { waitUntil: 'networkidle0' });
  for (let i = 0; i < 40; i++) {
    const state = await page.evaluate(() => {
      if (document.querySelector('[data-testid="tutorial-tooltip"]')) return 'tutorial';
      const outside = (b) => !b.closest('[data-testid="tutorial-spotlight"]');
      const btns = [...document.querySelectorAll('button')].filter(outside);
      const start = btns.find((b) => (b.textContent || '').trim() === 'Bắt đầu');
      if (start) {
        start.click();
        return 'start';
      }
      const skip = btns.find((b) => (b.textContent || '').trim() === 'Bỏ qua');
      if (skip) {
        skip.click();
        return 'skip';
      }
      return 'wait';
    });
    if (state === 'tutorial') return true;
    await sleep(state === 'wait' ? 250 : 400);
  }
  return false;
}

// Đo trong trang. Vùng sáng là khung viền vàng; hình học là toạ độ khung nhìn.
const measure = () => {
  const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
  if (!tt) return null;
  const hl = document.querySelector('.tutorial-spotlight-root .border-yellow-400');
  const t = tt.getBoundingClientRect();
  const h = hl ? hl.getBoundingClientRect() : null;
  const vw = innerWidth;
  const vh = innerHeight;
  const inter = h ? Math.max(0, Math.min(t.right, h.right) - Math.max(t.left, h.left)) * Math.max(0, Math.min(t.bottom, h.bottom) - Math.max(t.top, h.top)) : 0;
  const hArea = h ? h.width * h.height : 0;
  const full = h ? h.width > vw * 0.95 && h.height > vh * 0.95 : false;
  const inView = t.left >= -1 && t.top >= -1 && t.right <= vw + 1 && t.bottom <= vh + 1;
  const buttons = [...tt.querySelectorAll('button')].map((b) => {
    const r = b.getBoundingClientRect();
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      text: (b.textContent || '').trim().slice(0, 16),
      hit: !!el && (el === b || b.contains(el)),
      inView: r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1,
    };
  });
  const body = tt.querySelector('[data-tooltip-body]');
  return {
    step: window.__tutorial?.step ?? null,
    title: (tt.querySelector('#tutorial-step-title')?.textContent || '').trim().slice(0, 40),
    rect: [Math.round(t.left), Math.round(t.top), Math.round(t.width), Math.round(t.height)],
    hl: h ? [Math.round(h.left), Math.round(h.top), Math.round(h.width), Math.round(h.height)] : null,
    overlap: h && !full && hArea > 0 ? inter / hArea : 0,
    full,
    inView,
    buttons,
    scrolls: body ? body.scrollHeight > body.clientHeight + 1 : false,
  };
};

async function settle(page) {
  let prev = null;
  for (let i = 0; i < 10; i++) {
    await sleep(250);
    const m = await page.evaluate(measure);
    const key = m ? JSON.stringify([m.rect, m.hl, m.title]) : 'none';
    if (key === prev) return m;
    prev = key;
  }
  return page.evaluate(measure);
}

// Nút "tiến" của tooltip: không phải Bỏ qua / Quay lại.
const advanceInfo = () => {
  const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
  if (!tt) return null;
  const head = tt.querySelector('#tutorial-step-title')?.parentElement;
  const all = [...tt.querySelectorAll('button')].filter((b) => !head?.contains(b));
  const b = all.find((x) => !/Quay lại/.test(x.textContent || ''));
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: (b.textContent || '').trim() };
};

// Bước chờ thao tác thật (không có nút tiến): thử cầu nối setStep, rồi nút làm thử #tutorial-manN-*-btn.
async function pushPractice(page) {
  return page.evaluate(() => {
    const t = window.__tutorial;
    if (t && typeof t.setStep === 'function' && typeof t.step === 'number') {
      t.setStep(t.step + 1);
      return 'setStep';
    }
    const btn = [...document.querySelectorAll('button[id^="tutorial-man"]')].find((b) => !/guide/.test(b.id) && b.getBoundingClientRect().width > 0);
    if (btn) {
      btn.click();
      return 'practice-btn';
    }
    return null;
  });
}

async function typeIntoTarget(page) {
  const sel = await page.evaluate(() => {
    const hl = document.querySelector('.tutorial-spotlight-root .border-yellow-400')?.getBoundingClientRect();
    const inp = [...document.querySelectorAll('input:not([type=hidden]), textarea')].find((i) => {
      const r = i.getBoundingClientRect();
      return r.width > 0 && !i.closest('[data-testid="tutorial-tooltip"]') && (!hl || (r.bottom > hl.top && r.top < hl.bottom));
    });
    if (!inp) return null;
    inp.setAttribute('data-tut-probe', '1');
    return '[data-tut-probe="1"]';
  });
  if (!sel) return false;
  await page.focus(sel);
  await page.keyboard.type('68');
  await page.keyboard.press('Enter');
  await page.evaluate(() => document.querySelector('[data-tut-probe]')?.removeAttribute('data-tut-probe'));
  return true;
}

async function walkOverlap(page) {
  const steps = [];
  let stuck = null;
  let same = 0;
  let lastKey = null;
  for (let i = 0; i < MAX_STEPS; i++) {
    const m = await settle(page);
    if (!m) break;
    const key = JSON.stringify([m.step, m.title, m.rect]);
    same = key === lastKey ? same + 1 : 0;
    lastKey = key;
    if (same === 0) steps.push(m);
    if (same >= 3) {
      stuck = `bước ${m.step ?? i} chờ thao tác thật, cầu nối không đẩy được`;
      break;
    }
    const adv = await page.evaluate(advanceInfo);
    if (!adv || /Bắt đầu chơi|Quay lại bài/.test(adv.text)) {
      if (adv) break; // bước cuối có nút vào bài thật: không bấm để khỏi đóng
      const how = (same === 0 ? await pushPractice(page) : null) ?? ((await typeIntoTarget(page)) ? 'type' : null);
      if (!how && same >= 1) {
        stuck = `bước ${m.step ?? i} chờ thao tác thật, không có cầu nối`;
        break;
      }
      continue;
    }
    await page.mouse.click(adv.x, adv.y);
  }
  return { steps, stuck };
}

async function holdEnter(page, ms) {
  await page.keyboard.down('Enter');
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    await page.keyboard.down('Enter'); // phím đã nhấn: Puppeteer đặt repeat = true
    await sleep(50);
  }
  await page.keyboard.up('Enter');
}

async function walkEnter(page) {
  const problems = [];
  let tested = 0;
  for (let i = 0; i < MAX_STEPS; i++) {
    const before = await settle(page);
    if (!before) break;
    const adv = await page.evaluate(() => {
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      const head = tt?.querySelector('#tutorial-step-title')?.parentElement;
      const b = tt ? [...tt.querySelectorAll('button')].filter((x) => !head?.contains(x)).find((x) => !/Quay lại/.test(x.textContent || '')) : null;
      if (!b) return null;
      b.focus();
      return (b.textContent || '').trim();
    });
    if (!adv) {
      const how = await pushPractice(page);
      if (!how) break;
      continue;
    }
    const s0 = before.step;
    const title0 = before.title;
    await holdEnter(page, 1000);
    await sleep(300);
    const after = await page.evaluate(measure);
    tested++;
    // Lần nhấn đầu là nhấn mới nên được phép chuyển tối đa 1 bước; phần giữ lặp không được chuyển thêm hay tự đóng.
    const stepsMoved = (() => {
      if (!after) return 'closed';
      if (typeof s0 === 'number' && typeof after.step === 'number') return after.step - s0;
      return after.title === title0 ? 0 : 1;
    })();
    if (stepsMoved === 'closed') {
      // Đóng hợp lệ chỉ khi bước này là nút "vào bài thật" và nhấn mới; ở đây Enter giữ lặp nên cũng phải thận trọng: chỉ báo nếu nút không phải nút kết thúc.
      // Nút kết thúc: một lần nhấn Enter MỚI vào bài thật là đúng; chỉ lỗi nếu bước thường tự đóng
      if (!/Bắt đầu chơi|Quay lại bài/.test(adv)) problems.push(`bước ${s0 ?? i} (${adv}): tooltip tự đóng khi giữ Enter`);
      break;
    }
    if (stepsMoved > 1) problems.push(`bước ${s0 ?? i} (${adv}): giữ Enter nhảy ${stepsMoved} bước`);
    if (!after) break;
    if (stepsMoved === 0 && /Bắt đầu chơi|Quay lại bài/.test(adv)) {
      // Nút kết thúc: một lần nhấn mới đóng là đúng, nhưng sau 1 giây chưa đóng nghĩa là Enter không ăn; không tính lỗi.
    }
  }
  return { problems, tested };
}

const rows = [];
let failures = 0;
const fmtPct = (x) => `${Math.round(x * 100)}%`;

const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
for (const c of CASES) {
  for (const vp of VIEWPORTS) {
    const tag = `${c.name} ${vp.name}`;
    const row = { case: c.name, vp: vp.name, steps: 0, maxOverlap: 0, worstStep: null, bad: [], enter: [], stuck: null, opened: false };
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.mobile, hasTouch: vp.mobile });
      row.opened = await enter(page, c);
      if (row.opened) {
        const { steps, stuck } = await walkOverlap(page);
        row.steps = steps.length;
        if (process.env.TUT_DETAIL) row.detail = steps.map((m) => ({ step: m.step, title: m.title, rect: m.rect, hl: m.hl, overlap: Math.round(m.overlap * 100), scrolls: m.scrolls }));
        row.stuck = stuck;
        steps.forEach((m, i) => {
          if (m.overlap > row.maxOverlap) {
            row.maxOverlap = m.overlap;
            row.worstStep = m.step ?? i;
          }
          const why = [];
          if (m.overlap > MAX_OVERLAP) why.push(`che ${fmtPct(m.overlap)}`);
          if (!m.inView) why.push('tooltip ngoài khung nhìn');
          const btnBad = m.buttons.filter((b) => !b.hit || !b.inView);
          if (btnBad.length) why.push(`nút lỗi ${btnBad.map((b) => b.text).join(',')}`);
          if (why.length) row.bad.push(`bước ${m.step ?? i} "${m.title}": ${why.join('; ')}`);
        });
      }
      await page.close();
      if (row.opened) {
        const page2 = await browser.newPage();
        await page2.setViewport({ width: vp.w, height: vp.h, isMobile: vp.mobile, hasTouch: vp.mobile });
        if (await enter(page2, c)) {
          const e = await walkEnter(page2);
          row.enter = e.problems;
          row.enterTested = e.tested;
        }
        await page2.close();
      }
    } catch (err) {
      row.bad.push(`lỗi script: ${err.message}`);
    }
    const ok = row.opened && row.bad.length === 0 && row.enter.length === 0 && row.steps > 0;
    if (!ok) failures++;
    rows.push(row);
    console.log(
      `${ok ? '[PASS]' : '[FAIL]'} ${tag}: ${row.opened ? `${row.steps} bước, che tối đa ${fmtPct(row.maxOverlap)}` : 'KHÔNG mở được hướng dẫn'}` +
        `${row.stuck ? ` (dừng: ${row.stuck})` : ''}${row.bad.length ? `\n    ${row.bad.join('\n    ')}` : ''}${row.enter.length ? `\n    Enter: ${row.enter.join(' | ')}` : ''}`,
    );
  }
}
await browser.close();

console.log('\nBẢNG: che tối đa (% vùng sáng) theo ca x cỡ');
const names = [...new Set(rows.map((r) => r.case))];
console.log(['ca'.padEnd(12), ...VIEWPORTS.map((v) => v.name.padEnd(10))].join(' '));
for (const n of names) {
  console.log(
    [
      n.padEnd(12),
      ...VIEWPORTS.map((v) => {
        const r = rows.find((x) => x.case === n && x.vp === v.name);
        return (r && r.opened ? `${fmtPct(r.maxOverlap)}${r.bad.length || r.enter.length ? '!' : ''}` : 'n/a').padEnd(10);
      }),
    ].join(' '),
  );
}
if (process.env.TUT_JSON) writeFileSync(process.env.TUT_JSON, JSON.stringify(rows, null, 2));
console.log(`\n${rows.length - failures}/${rows.length} đạt`);
process.exit(failures ? 1 : 0);
