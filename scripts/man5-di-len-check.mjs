// Kiểm tra Màn 5 sau P9 (chuột đi từ dưới lên, nhân vật chạy ngang, lượt đáp án A–D).
// Chạy: dev lang-det cổng 5573 (kèm VITE_ASSETS_URL, xem CLAUDE.md) + pnpm dev:assets (5180), rồi `node scripts/man5-di-len-check.mjs`.
import { existsSync, mkdirSync, statSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://localhost:5573';
const OUT = 'docs/screenshots/man5-di-len';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chromePath = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => p && existsSync(p));
if (!chromePath) {
  console.error('Không tìm thấy Google Chrome');
  process.exit(1);
}

const guestCookie = { v: 1, lv: { 1: [1, 1, 3, 3, 3], 2: [1, 1, 3, 1000], 3: [1, 1, 3, 1000], 4: [1, 1, 3, 3, 3] }, gp: 1, c: 100, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 8191, hd: 2147483647 };

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: '1920x1080', width: 1920, height: 1080, isMobile: false, hasTouch: false },
  { name: '360x800', width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: '844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
];

const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok: !!ok, info });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '} ${name}${info ? ' — ' + info : ''}`);
};

async function shot(page, file) {
  const path = `${OUT}/${file}.jpg`;
  for (const q of [70, 55, 40, 30]) {
    await page.screenshot({ path, type: 'jpeg', quality: q });
    if (statSync(path).size < 290 * 1024) break;
  }
  const kb = Math.round(statSync(path).size / 1024);
  check(`ảnh ${file} < 300 KB`, kb < 300, `${kb} KB`);
}

async function open(browser, vp, { skipTutorial = true } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
  await page.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(guestCookie)), url: BASE });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
  await sleep(600);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
    if (btn) btn.click();
  });
  await page.waitForFunction(() => window.__whack && window.__whackTutorial, { timeout: 15000 });
  await sleep(500);
  if (skipTutorial) {
    await page.evaluate(() => window.__whackTutorial.setActive(false));
    await sleep(300);
  }
  page.errors = errors;
  return page;
}

const tapAt = async (page, vp, x, y) => {
  if (vp.hasTouch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
};

/** Tâm vùng đập của làn (điểm ảnh) */
const zoneCenter = (page, lane) =>
  page.evaluate((l) => {
    const r = document.querySelector(`[data-testid="vung-dap-${l}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, lane);

const tapLane = async (page, vp, lane) => {
  const c = await zoneCenter(page, lane);
  await tapAt(page, vp, c.x, c.y);
};

const rectOf = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }, sel);

/** Ván yên tĩnh: không sinh chuột và đồng tự động, xóa chuột, mực 0 */
const quiet = (page, ink = 0) =>
  page.evaluate((k) => {
    const s = window.__whack;
    s.spawnIn = 1e9;
    s.coinIn = 1e9;
    s.coin = null;
    s.mice.length = 0;
    s.ink = k;
  }, ink);

const addMouse = (page, o) =>
  page.evaluate((m) => {
    const s = window.__whack;
    s.mice.push({ id: s.nextId++, kind: 'thuong', lane: 0, pos: 7.7, speed: 0, hits: 1, freeze: 0, flash: false, changed: false, ...m });
  }, o);

const stat = (page) =>
  page.evaluate(() => {
    const s = window.__whack;
    return { phase: s.phase, ink: s.ink, score: s.score, hits: s.stats.hits, misses: s.stats.misses, nmice: s.mice.length, bossesDone: s.bossesDone, ended: s.ended };
  });

/** Câu dài nhất của Bài 1–2 (đọc từ ngân hàng câu hỏi), để thử vừa khung ở lượt đầu */
import { readFileSync } from 'node:fs';
const bankSrc = readFileSync('packages/core/src/content/questions.ts', 'utf8');
function longestQuestion() {
  const re = /bai:\s*([12]),\s*text:\s*"((?:[^"\\]|\\.)*)",\s*options:\s*(\[[^\]]*\]),\s*correctIndex:\s*(\d)/g;
  let best = null;
  let m;
  while ((m = re.exec(bankSrc))) {
    const options = JSON.parse(m[3]);
    const len = m[2].length + options.join('').length;
    if (!best || len > best.len) best = { len, text: m[2], options, correctIndex: Number(m[4]), explanation: 'x', id: 'dai-nhat', bai: Number(m[1]) };
  }
  return best;
}
const LONGEST = longestQuestion();

async function startQuestion(page, vp, lane = 1) {
  await page.evaluate((l) => window.__whackSetBoss(l, 7.75, window.__whack.bossesDone), lane);
  await page.waitForSelector('[data-testid="chuot-cau-hoi"][data-in-zone="1"]', { timeout: 5000 });
  const r = await rectOf(page, '[data-testid="chuot-cau-hoi"]');
  await tapAt(page, vp, r.left + r.width / 2, r.top + r.height / 2);
  await page.waitForFunction(() => window.__whack.phase === 'answer', { timeout: 3000 });
  await sleep(300);
}

const clickContinue = (page) =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim().startsWith('Chơi tiếp'));
    if (b) b.click();
    return !!b;
  });

async function playViewport(browser, vp) {
  console.log(`\n=========== ${vp.name} ===========`);
  const page = await open(browser, vp);
  const tag = `[${vp.name}]`;

  // ---- bố cục: sổ ở đỉnh, nhân vật ở hàng gần sổ, làn, nút ở chân
  const book = await rectOf(page, '[data-testid="so-chung-day"]');
  const hero = await rectOf(page, '[data-testid="hero-slot"]');
  const lanes = await rectOf(page, '[data-testid="man5-lanes"]');
  const foot = await rectOf(page, 'footer');
  check(`${tag} sổ ở đỉnh, nhân vật dưới sổ và sát đầu làn, nút ở chân`, book.top < lanes.top && book.bottom <= hero.bottom + 4 && hero.bottom <= lanes.top + 24 && foot.top >= lanes.bottom - 2, JSON.stringify({ book: Math.round(book.top), hero: Math.round(hero.top) + '-' + Math.round(hero.bottom), lanes: Math.round(lanes.top) + '-' + Math.round(lanes.bottom), foot: Math.round(foot.top) }));
  const noScroll = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 2 && document.documentElement.scrollWidth <= window.innerWidth + 2);
  check(`${tag} không có thanh cuộn thừa`, noScroll);

  // ---- chuột đi từ dưới lên (chơi thật: chờ chuột tự sinh)
  await page.waitForFunction(() => window.__whack.mice.length > 0, { timeout: 8000 });
  const t1 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="chuot"]');
    return { id: el.dataset.mouseId, top: el.getBoundingClientRect().top };
  });
  await sleep(350);
  const t2 = await page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="chuot"][data-mouse-id="${id}"]`);
    return el ? el.getBoundingClientRect().top : null;
  }, t1.id);
  check(`${tag} chuột đi từ dưới lên (top giảm theo thời gian)`, t2 !== null && t2 < t1.top - 2, `${Math.round(t1.top)} → ${t2 === null ? 'đã mất' : Math.round(t2)}`);
  await shot(page, `${vp.name}-1-dang-choi`);

  // ---- đập trong vùng, ngoài vùng
  await quiet(page);
  await addMouse(page, { lane: 1, pos: 7.7 });
  const a0 = await stat(page);
  await tapLane(page, vp, 1);
  await sleep(120);
  const a1 = await stat(page);
  check(`${tag} đập chuột trong vùng đập: trúng +10`, a1.hits === a0.hits + 1 && a1.score === a0.score + 10 && a1.nmice === 0, `điểm ${a0.score}→${a1.score}`);
  const heroLane1 = await page.evaluate(() => document.querySelector('[data-testid="hero-slot"]').dataset.heroLane);
  check(`${tag} nhân vật chạy tới làn 2 sau cú đập`, heroLane1 === '1');

  await addMouse(page, { lane: 2, pos: 3 });
  const b0 = await stat(page);
  await sleep(160);
  await tapLane(page, vp, 2);
  await sleep(120);
  const b1 = await stat(page);
  check(`${tag} đập chuột NGOÀI vùng đập: hụt, chuột còn nguyên`, b1.misses === b0.misses + 1 && b1.nmice === 1 && b1.hits === b0.hits);

  // ---- chuột to: 2 cú; nhân vật chạy tới làn 4 trong ≤ 0,15 giây
  await quiet(page);
  await addMouse(page, { lane: 3, pos: 7.7, kind: 'to', hits: 2 });
  const xHero0 = (await rectOf(page, '[data-testid="hero-slot"]')).left;
  await tapLane(page, vp, 3);
  await sleep(450);
  const c1 = await page.evaluate(() => ({ hits: window.__whack.mice[0]?.hits, n: window.__whack.mice.length }));
  check(`${tag} chuột to: cú đầu chưa hạ (còn 1 cú)`, c1.n === 1 && c1.hits === 1);
  const dur = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-testid="hero-slot"]')).transitionDuration) || 0);
  const xHero1 = (await rectOf(page, '[data-testid="hero-slot"]')).left;
  check(`${tag} nhân vật chạy ngang tới làn 4 (thời gian chạy ≤ 0,15 giây)`, xHero1 > xHero0 + 5 && dur <= 0.15 + 1e-6, `${Math.round(xHero0)}→${Math.round(xHero1)}, ${dur}s`);
  await sleep(160);
  await tapLane(page, vp, 3);
  await sleep(150);
  const c2 = await stat(page);
  check(`${tag} chuột to: cú thứ hai hạ, +30`, c2.nmice === 0 && c2.score >= 40);

  // ---- lượt đáp án ĐÚNG
  await quiet(page, 3);
  await addMouse(page, { lane: 0, pos: 2, speed: 3 });
  // lượt đầu dùng câu dài nhất để thử vừa khung
  await page.evaluate((q) => {
    window.__whackQuestions[0] = q;
    window.__whack.keys[0] = { correct: q.correctIndex, options: q.options.length };
  }, LONGEST);
  await startQuestion(page, vp, 1);
  const pos0 = await page.evaluate(() => window.__whack.mice[0].pos);
  await sleep(500);
  const pos1 = await page.evaluate(() => window.__whack.mice[0].pos);
  check(`${tag} lượt đáp án: chuột thường dừng sinh và đứng yên`, pos0 === pos1);
  const info = await page.evaluate(() => {
    const s = window.__whack;
    return { n: s.answer.mice.length, correct: s.answer.correct, lanes: s.answer.mice.map((m) => m.lane), gold: document.querySelectorAll('[data-testid="chuot-dap-an"]').length, letters: [...document.querySelectorAll('[data-testid="chuot-dap-an"]')].map((e) => e.textContent.trim()) };
  });
  check(`${tag} 4 chuột vàng nhãn A–D ở 4 làn khác nhau`, info.n === 4 && info.gold === 4 && new Set(info.lanes).size === 4 && info.letters.join('') === 'ABCD' || info.letters.sort().join('') === 'ABCD', JSON.stringify(info));
  // cột câu hỏi: bên phải sân (ngang) hay dải trên (dọc)
  const panel = await rectOf(page, '[data-testid="cot-cau-hoi"]');
  const lanes2 = await rectOf(page, '[data-testid="man5-lanes"]');
  const portrait = vp.height > vp.width;
  const placed = panel && (portrait ? panel.bottom <= lanes2.top + 4 : panel.left >= lanes2.right - 2);
  check(`${tag} câu hỏi ở ${portrait ? 'dải trên' : 'cột bên phải'} và không đè lên sân`, placed, panel ? `panel ${Math.round(panel.left)},${Math.round(panel.top)}-${Math.round(panel.right)},${Math.round(panel.bottom)} · sân ${Math.round(lanes2.left)}-${Math.round(lanes2.right)}` : 'không thấy');
  const fits = await page.evaluate(() => {
    const p = document.querySelector('[data-testid="cot-cau-hoi"]');
    return p.scrollHeight <= p.clientHeight + 2 && [...p.querySelectorAll('li')].length === 4;
  });
  check(`${tag} câu dài nhất (${LONGEST.len} ký tự) và đủ 4 đáp án hiện đủ, không phải cuộn`, fits);
  // đáp án trong cột không bấm được
  const li = await rectOf(page, '[data-testid="dap-an-doc"] li');
  await tapAt(page, vp, li.left + li.width / 2, li.top + li.height / 2);
  await sleep(200);
  check(`${tag} bấm vào đáp án trong cột không chọn được`, (await stat(page)).phase === 'answer');
  await shot(page, `${vp.name}-2-luot-dap-an`);

  // chuyển các chuột vào vùng đập (bỏ qua thời gian đọc), rồi đập chuột đúng
  await page.evaluate(() => window.__whack.answer.mice.forEach((m) => (m.pos = 7)));
  await sleep(150);
  const st0 = await stat(page);
  const goodLane = await page.evaluate(() => window.__whack.answer.mice.find((m) => m.option === window.__whack.answer.correct).lane);
  await tapLane(page, vp, goodLane);
  await sleep(100);
  const st1 = await stat(page);
  // "Chơi tiếp" bấm ngay lúc hộp vừa mở phải bị bỏ qua (chống click ma)
  await clickContinue(page);
  await sleep(60);
  const stGuard = await stat(page);
  check(`${tag} đập đúng chuột đáp án đúng: hiện kết quả (chưa tự chạy tiếp)`, st1.phase === 'quiz' && st1.score === st0.score && (await page.evaluate(() => window.__whack.verdict.result)) === 'correct');
  const sheet = await page.evaluate(() => /Đáp án|Trúng đáp án|\+\d+ điểm/.test(document.body.innerText));
  check(`${tag} hộp kết quả có chữ kết quả và lời giải thích`, sheet);
  check(`${tag} bấm "Chơi tiếp" ngay lúc vừa mở bị bỏ qua (chống click ma)`, stGuard.phase === 'quiz');
  await shot(page, `${vp.name}-3-ket-qua-dung`);
  await sleep(600);
  await clickContinue(page);
  await sleep(300);
  const st2 = await stat(page);
  check(`${tag} đúng: +điểm, xóa 2 vết mực (3→1), chạy lại ván`, st2.phase === 'play' && st2.ink === 1 && st2.score >= st0.score + 105 && st2.bossesDone === 1, `điểm ${st0.score}→${st2.score}, mực ${st2.ink}`);

  // ---- lượt đáp án SAI
  await quiet(page, 0);
  await startQuestion(page, vp, 2);
  await page.evaluate(() => window.__whack.answer.mice.forEach((m) => (m.pos = 7)));
  await sleep(150);
  const badLane = await page.evaluate(() => window.__whack.answer.mice.find((m) => m.option !== window.__whack.answer.correct).lane);
  const sc0 = (await stat(page)).score;
  await tapLane(page, vp, badLane);
  await sleep(300);
  const v2 = await page.evaluate(() => window.__whack.verdict);
  check(`${tag} đập chuột đáp án sai: kết quả sai`, v2 && v2.result === 'wrong');
  await shot(page, `${vp.name}-4-ket-qua-sai`);
  await sleep(600);
  await clickContinue(page);
  await sleep(300);
  const st3 = await stat(page);
  check(`${tag} sai: +1 vết mực, không điểm`, st3.ink === 1 && st3.score === sc0 && st3.phase === 'play');

  // ---- để chuột đúng chạy tới sổ (thoát)
  await quiet(page, 0);
  await startQuestion(page, vp, 0);
  await page.evaluate(() => (window.__whack.answer.speed = 6));
  await page.waitForFunction(() => window.__whack.phase === 'quiz', { timeout: 6000 });
  const v3 = await page.evaluate(() => window.__whack.verdict);
  check(`${tag} để chuột chạy tới sổ: hết giờ`, v3.result === 'timeout');
  await sleep(600);
  await clickContinue(page);
  await sleep(300);
  const st4 = await stat(page);
  check(`${tag} hết giờ: +1 vết mực`, st4.ink === 1 && st4.phase === 'play');

  // ---- nút "?" tạm dừng thật trong lượt đáp án
  await quiet(page, 0);
  await startQuestion(page, vp, 3);
  const pa = await page.evaluate(() => window.__whack.answer.mice.map((m) => m.pos));
  await page.keyboard.press('KeyH');
  await sleep(300);
  const dialogOpen = await page.evaluate(() => !!document.querySelector('[data-testid="viec-cua-em"]'));
  const pb = await page.evaluate(() => window.__whack.answer.mice.map((m) => m.pos));
  await sleep(700);
  const pc = await page.evaluate(() => window.__whack.answer.mice.map((m) => m.pos));
  check(`${tag} hộp "?" mở trong lượt đáp án: mọi chuột đứng yên thật`, dialogOpen && pb.every((v, i) => v === pc[i]), `trước ${pa[0].toFixed(3)} → mở ${pb[0].toFixed(3)} → sau 0,7s ${pc[0].toFixed(3)}`);
  await clickContinue(page);
  await sleep(500);
  const pd = await page.evaluate(() => window.__whack.answer?.mice[0].pos);
  check(`${tag} đóng hộp "?" thì chuột chạy tiếp`, pd > pc[0]);

  // ---- đầy 8 vết mực
  await page.evaluate(() => {
    const s = window.__whack;
    s.phase = 'play';
    s.answer = null;
    s.boss = null;
  });
  await quiet(page, 7);
  await addMouse(page, { lane: 0, pos: 9.95, speed: 3 });
  await page.waitForSelector('[data-testid="het-van"]', { timeout: 4000 }).catch(() => {});
  const ink8 = await stat(page);
  check(`${tag} đủ 8 vết mực thì hết ván (thua)`, ink8.ended === 'ink' && ink8.ink === 8 && !!(await page.$('[data-testid="het-van"]')));
  check(`${tag} không có lỗi trang`, page.errors.length === 0, page.errors.join(' | '));
  await page.close();

  // ---- xong 10 lượt
  const p2 = await open(browser, vp);
  await quiet(p2, 0);
  await p2.evaluate(() => {
    window.__whack.bossesDone = 9;
  });
  await startQuestion(p2, vp, 1);
  await p2.evaluate(() => window.__whack.answer.mice.forEach((m) => (m.pos = 7)));
  await sleep(150);
  const gl = await p2.evaluate(() => window.__whack.answer.mice.find((m) => m.option === window.__whack.answer.correct).lane);
  await tapLane(p2, vp, gl);
  await sleep(700);
  await clickContinue(p2);
  await p2.waitForSelector('[data-testid="het-van"]', { timeout: 4000 }).catch(() => {});
  const done = await stat(p2);
  check(`${tag} xong 10 lượt thì hết ván (hoàn thành)`, done.ended === 'complete' && !!(await p2.$('[data-testid="het-van"]')));
  await p2.close();
}

async function tutorialAndAuto(browser) {
  const vp = VIEWPORTS[0];
  console.log('\n=========== hướng dẫn P8 + tự hoàn thành ===========');
  const page = await open(browser, vp, { skipTutorial: false });
  const st = await page.evaluate(() => ({ active: window.__whackTutorial.active, step: window.__whackTutorial.step }));
  check('hướng dẫn mở ở ván đầu', st.active === true);
  await page.evaluate(() => window.__whackTutorial.setStep(4));
  await sleep(400);
  check('bước làm thử 1: có chuột thường mẫu trong vùng đập', !!(await page.$('[data-testid="chuot-mau"]')));
  await shot(page, 'huong-dan-1-dap-thu-chuot');
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('Đập thử làn 1'));
    if (b) b.click();
  });
  await sleep(500);
  check('đập thử xong sang bước đáp án mẫu (4 chuột A–D mẫu)', (await page.$$('[data-testid="chuot-dap-an-mau"]')).length === 4 && (await page.evaluate(() => window.__whackTutorial.step)) === 5);
  await shot(page, 'huong-dan-2-luot-dap-an-mau');
  await page.click('[data-testid="dap-mau-0"]').catch(() => {});
  await sleep(300);
  check('đập sai chuột mẫu: ở lại bước, có nhắc', (await page.evaluate(() => window.__whackTutorial.step)) === 5);
  await page.click('[data-testid="dap-mau-1"]').catch(() => {});
  await sleep(400);
  check('đập đúng chuột mẫu B: sang bước cuối', (await page.evaluate(() => window.__whackTutorial.step)) === 6);
  check('hướng dẫn không đụng ván thật (chưa có điểm)', (await stat(page)).score === 0);
  await page.close();

  const p2 = await open(browser, vp);
  await page.keyboard?.press;
  await p2.keyboard.press('KeyH');
  await sleep(400);
  const clicked = await p2.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('Tự hoàn thành'));
    if (b) b.click();
    return !!b;
  });
  await sleep(800);
  check('nút Tự hoàn thành có trong hộp "?" (dev) và dừng ván', clicked && /tự hoàn thành|Đã tự/i.test(await p2.evaluate(() => document.body.innerText)));
  await shot(p2, 'tu-hoan-thanh');
  await p2.close();
}

const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
try {
  await tutorialAndAuto(browser);
  for (const vp of VIEWPORTS) await playViewport(browser, vp);
} finally {
  await browser.close();
}
const bad = results.filter((r) => !r.ok);
console.log(`\nTổng: ${results.length - bad.length}/${results.length} đạt`);
if (bad.length) {
  console.log('Lỗi:\n' + bad.map((b) => ' - ' + b.name + (b.info ? ' — ' + b.info : '')).join('\n'));
  process.exitCode = 1;
}
