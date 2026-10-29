// P3b: kiểm DOM trên BẢN BUILD PHÁT HÀNH (không phải dev) của nút "Tự hoàn thành" khi đăng nhập là giáo viên và máy chủ trả các phản hồi khác nhau.
// MÁY CHỦ LÀ GIẢ (scripts/lib/mock-supabase.mjs, bắt chước tối thiểu PostgREST/GoTrue): đây KHÔNG phải kiểm quyền Supabase thật (không RLS, trigger, JWT).
// Mã lỗi giả lấy từ PostgreSQL thật (42703, P0001) do scripts/db-test-p3b.sh ghi nhận. Khóa trong bản build là chuỗi giả, không phải bí mật.
//
// Chuẩn bị:
//   pnpm dev:assets &
//   (cd apps/hub && VITE_HUB_URL=http://localhost:5190 VITE_ASSETS_URL=http://localhost:5180 VITE_MERGED=true VITE_SUPABASE_URL=http://localhost:54399 VITE_SUPABASE_ANON_KEY=mock-anon-key-not-real VITE_USERNAME_EMAIL_DOMAIN=mock.local npx vite build --outDir dist-probe-api && npx vite preview --outDir dist-probe-api --port 5190 --strictPort &)
// Chạy: node scripts/p3b-api-check.mjs [--url=http://localhost:5190] [--size=0,1,2] [--only=thieu-cot,...] [--no-write] [--v]
// Xong: tắt server nền, xóa apps/hub/dist-probe-api.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { SIZES } from './lib/p2a-real.mjs';
import { GAME_DATA_SEED, makeSession, startMockSupabase, TEACHER_ID } from './lib/mock-supabase.mjs';

const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const flag = (n) => process.argv.includes(`--${n}`);
const BASE = arg('url', 'http://localhost:5190');
const OUT = 'docs/screenshots/p3b';
const write = !flag('no-write');
const sizeIdx = arg('size', '0,1,2').split(',').map(Number);
const ALL = ['thieu-cot', 'thieu-cot-luc-ghi', 'tu-choi', 'mat-mang', 'tham-do-loi', 'thanh-cong', 'phan-hoi-muon'];
const only = arg('only', ALL.join(',')).split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (write) mkdirSync(OUT, { recursive: true });

const mock = await startMockSupabase(54399);
const results = [];
const shots = [];
const check = (ctx, area, name, ok, detail = '') => {
  results.push({ mode: 'api-gia', size: ctx.size.name, area, name, ok: Boolean(ok), detail });
  if (flag('v') || !ok) console.log(`   ${ok ? '·' : '✗'} [${ctx.size.name}] ${area}: ${name}${detail ? ` — ${detail}` : ''}`);
};

const USER_KEY = `sochung.v3.u.${TEACHER_ID}`;
const now = () => Date.now();
const seedProgress = () => ({ v: 1, owner: TEACHER_ID, progress: { levels: { 4: { played: true, completed: false, stars: { de: 2, tb: 0, kho: 0 }, bestScore: 0, updatedAt: now() } }, game: { goldenPages: 0, coins: 20, data: GAME_DATA_SEED, updatedAt: now() } } });

async function fresh(browser, size, { cfg = {}, seedReal = false } = {}) {
  await fetch('http://127.0.0.1:54399/__reset', { method: 'POST' });
  mock.reset();
  mock.setCfg(cfg);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((key, seed) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    if (seed) localStorage.setItem(key, JSON.stringify(seed)); else localStorage.removeItem(key);
  }, USER_KEY, seedReal ? seedProgress() : null);
  await page.setCookie({ name: 'sb-localhost-auth-token', value: `base64-${Buffer.from(JSON.stringify(makeSession())).toString('base64url')}`, url: BASE });
  return { page, size, errors, touch: size.touch };
}

async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 60 });
  if (buf.length >= 300000) throw new Error(`${name} lớn hơn 300 KB`);
  const file = `api-${name}-${ctx.size.name}.jpg`;
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
const waitFor = (ctx, fn, timeout = 30000, ...a) => ctx.page.waitForFunction(fn, { timeout, polling: 250 }, ...a);
const until = async (fn, timeout = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < timeout) { if (fn()) return true; await sleep(200); } return false; };

const VILLAGE = { 1: 'lang-giay', 2: 'lang-giay', 3: 'lang-giay' };
const KIND = (id) => (id === 1 ? 'lesson' : 'game');
async function openLevel(ctx, id) {
  await ctx.page.goto(`${BASE}/lang/${VILLAGE[id]}/man/${id}`, { waitUntil: 'domcontentloaded' });
  await waitFor(ctx, (k) => document.querySelector(k === 'lesson' ? '[data-testid="lesson-scroll"]' : '[data-testid="the-bat-dau"]'), 90000, KIND(id));
}
const btn = (ctx) => ctx.page.evaluateHandle(() => [...document.querySelectorAll('[data-testid="nut-tu-hoan-thanh"]')].find((b) => b.offsetParent !== null) ?? null);
const btnState = (ctx) => ctx.page.evaluate(() => { const b = [...document.querySelectorAll('[data-testid="nut-tu-hoan-thanh"]')].find((x) => x.offsetParent !== null); return b ? { exists: true, disabled: b.disabled } : { exists: false, disabled: false }; });
const noteText = (ctx) => ctx.page.evaluate(() => document.querySelector('[data-testid="tu-hoan-thanh-ghi-chu"]')?.textContent?.trim() ?? '');
/** Dòng ghi chú đọc được: đủ rộng (không bị bóp thành cột chữ hẹp), không tràn khỏi màn hình, chỉ có một dòng ghi chú hiện. */
const noteReadable = (ctx) => ctx.page.evaluate(() => {
  const notes = [...document.querySelectorAll('[data-testid="tu-hoan-thanh-ghi-chu"]')].filter((n) => n.offsetParent !== null || getComputedStyle(n).position === 'fixed');
  const visible = notes.filter((n) => getComputedStyle(n).display !== 'none');
  const r = visible[0]?.getBoundingClientRect();
  return { count: visible.length, ok: Boolean(r) && r.width >= Math.min(220, innerWidth - 40) && r.left >= 0 && r.right <= innerWidth + 1 && r.height <= innerHeight * 0.6, rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null };
});
const panelNotice = (ctx) => ctx.page.evaluate(() => document.querySelector('[data-testid="tu-hoan-thanh-chua-luu"]')?.textContent?.trim() ?? '');
const hasPanel = (ctx) => ctx.page.evaluate(() => Boolean(document.querySelector('[data-testid="da-tu-hoan-thanh"]')));
const bodyText = (ctx) => ctx.page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const localProgress = (ctx) => ctx.page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k))?.progress ?? null; } catch { return null; } }, USER_KEY);
const waitButton = async (ctx, { enabled = false, disabled = false } = {}) => {
  await waitFor(ctx, (en, dis) => { const b = [...document.querySelectorAll('[data-testid="nut-tu-hoan-thanh"]')].find((x) => x.offsetParent !== null); return Boolean(b) && (!en || !b.disabled) && (!dis || b.disabled); }, 40000, enabled, disabled);
};
const probeDone = () => until(() => mock.state().probes.some((p) => p.result && p.result !== ''), 20000);
const autoOk = () => mock.state().writes.filter((w) => w.auto && !w.failed);
const autoFailed = () => mock.state().writes.filter((w) => w.auto && w.failed);
const goOnline = (ctx) => ctx.page.evaluate(() => window.dispatchEvent(new Event('online')));
/** Bảng làng ở /ban-do: số màn đang ghi nhãn "Tự hoàn thành" (giáo viên thấy mọi màn đã mở nên chỉ nhãn này cho thấy cờ có hiệu lực). */
const chipCount = async (ctx, village = 'lang-giay') => {
  await ctx.page.goto(`${BASE}/ban-do`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForSelector(`button[data-village="${village}"]`, { timeout: 60000 });
  await tap(ctx, await ctx.page.$(`button[data-village="${village}"]`));
  await waitFor(ctx, () => document.querySelector('[data-testid="ban-do-bang-lang"]') || [...document.querySelectorAll('button')].some((b) => /^Bỏ qua/.test(b.innerText.trim())), 30000);
  const skip = await ctx.page.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /^Bỏ qua/.test(b.innerText.trim())) ?? null);
  if (skip.asElement()) await tap(ctx, skip.asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="ban-do-bang-lang"]'), 30000);
  await sleep(500);
  return ctx.page.evaluate(() => document.querySelectorAll('[data-testid="tu-hoan-thanh"]').length);
};
const noError = (ctx, area) => check(ctx, area, 'không lỗi trang (pageerror)', ctx.errors.length === 0, ctx.errors.join(' | '));

/** 1. Máy chủ chưa có cột (thăm dò báo 42703). Tiến độ thật đang chờ đẩy (đường thật lỗi mạng lúc đầu) phải lên được sau đó. */
async function scenThieuCot(browser, size) {
  const A = 'chưa có cột';
  const ctx = await fresh(browser, size, { cfg: { colMissing: true, failReal: true }, seedReal: true });
  await openLevel(ctx, 1);
  await waitButton(ctx, { disabled: true });
  const note = await noteText(ctx);
  check(ctx, A, 'nút bị vô hiệu và ghi rõ máy chủ chưa hỗ trợ (cơ sở dữ liệu chưa cập nhật)', /chưa hỗ trợ/.test(note) && /Tiến độ chơi thật vẫn lưu/.test(note), note);
  const nr = await noteReadable(ctx);
  check(ctx, A, 'ghi chú hiện đúng một chỗ, đủ rộng, nằm trong màn hình (không bị bóp thành cột chữ hẹp)', nr.count === 1 && nr.ok, JSON.stringify(nr));
  await shot(ctx, 'thieu-cot-vo-hieu');
  await tap(ctx, (await btn(ctx)).asElement());
  await sleep(800);
  check(ctx, A, 'bấm nút bị vô hiệu: không hiện khung "Đã tự hoàn thành", không báo đã lưu', !(await hasPanel(ctx)) && !/Đã tự hoàn thành/.test(await bodyText(ctx)));
  check(ctx, A, 'máy chủ không nhận bản ghi cờ nào (kể cả thử)', autoOk().length === 0 && autoFailed().length === 0);
  mock.setCfg({ failReal: false });
  await goOnline(ctx);
  check(ctx, A, 'tiến độ chơi thật (bài 4, đã chơi dở) vẫn đồng bộ lên máy chủ khi đường cờ bị khóa', await until(() => mock.state().levels[4]?.played === true && mock.state().levels[4]?.stars?.de === 2 && mock.state().game.coins === 20), JSON.stringify(mock.state().levels[4]));
  check(ctx, A, 'bản ghi thật không mang cờ', !mock.state().levels[4]?.auto_completed && autoOk().length === 0);
  check(ctx, A, 'trên máy không có cờ ở màn 1', !(await localProgress(ctx))?.levels?.[1]?.auto);
  check(ctx, A, 'tải lại, mở /ban-do: bảng Làng Giấy KHÔNG ghi "Tự hoàn thành" ở màn nào (không có cờ nào có hiệu lực)', (await chipCount(ctx)) === 0);
  await shot(ctx, 'thieu-cot-ban-do-khong-co-co');
  await openLevel(ctx, 1);
  await waitButton(ctx, { disabled: true });
  check(ctx, A, 'tải lại màn 1: nút vẫn vô hiệu kèm thông báo (máy chủ vẫn thiếu cột)', /chưa hỗ trợ/.test(await noteText(ctx)));
  await openLevel(ctx, 2);
  await waitButton(ctx, { disabled: true });
  const nr2 = await noteReadable(ctx);
  check(ctx, A, 'màn game (thẻ bắt đầu): nút vô hiệu, ghi chú đọc được', /chưa hỗ trợ/.test(await noteText(ctx)) && nr2.count === 1 && nr2.ok, JSON.stringify(nr2));
  await shot(ctx, 'thieu-cot-the-bat-dau');
  noError(ctx, A);
  await ctx.page.close();
}

/** 2. Thăm dò báo có cột nhưng lúc ghi lại báo thiếu cột (migration bị gỡ/đổi giữa chừng): gỡ cờ khỏi máy, nói rõ, tiến độ thật cùng lượt vẫn lên. */
async function scenThieuCotLucGhi(browser, size) {
  const A = 'thiếu cột lúc ghi';
  const ctx = await fresh(browser, size, { cfg: { colMissingWrite: true, failReal: true }, seedReal: true });
  await openLevel(ctx, 1);
  await waitButton(ctx, { enabled: true });
  await probeDone();
  mock.setCfg({ failReal: false });
  await tap(ctx, (await btn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="tu-hoan-thanh-ghi-chu"]'), 20000);
  const note = await noteText(ctx);
  check(ctx, A, 'hiện thông báo máy chủ chưa hỗ trợ, nút bị vô hiệu, KHÔNG hiện khung "Đã tự hoàn thành"', /chưa hỗ trợ/.test(note) && !(await hasPanel(ctx)) && (await btnState(ctx)).disabled, note);
  await shot(ctx, 'thieu-cot-luc-ghi');
  check(ctx, A, 'tiến độ chơi thật cùng lượt đẩy vẫn lên máy chủ dù đường cờ lỗi', mock.state().levels[4]?.played === true && mock.state().levels[4]?.stars?.de === 2 && mock.state().game.coins === 20, JSON.stringify(mock.state().levels[4]));
  check(ctx, A, 'cờ không lên máy chủ (1 lần thử bị 42703) và bị gỡ khỏi máy', autoOk().length === 0 && autoFailed().length === 1 && autoFailed()[0].failed === '42703' && !(await localProgress(ctx))?.levels?.[1]?.auto, JSON.stringify(autoFailed()));
  check(ctx, A, 'tải lại, mở /ban-do: không màn nào ghi "Tự hoàn thành"', (await chipCount(ctx)) === 0);
  noError(ctx, A);
  await ctx.page.close();
}

/** 3. Có cột nhưng máy chủ từ chối quyền ghi (trigger: không phải giáo viên). */
async function scenTuChoi(browser, size) {
  const A = 'từ chối quyền';
  const ctx = await fresh(browser, size, { cfg: { forbid: true, failReal: true }, seedReal: true });
  await openLevel(ctx, 1);
  await waitButton(ctx, { enabled: true });
  await probeDone();
  mock.setCfg({ failReal: false });
  await tap(ctx, (await btn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="tu-hoan-thanh-ghi-chu"]'), 20000);
  const note = await noteText(ctx);
  check(ctx, A, 'hiện thông báo máy chủ không cho tài khoản này dùng, nút vô hiệu, KHÔNG báo đã lưu', /không cho tài khoản này/.test(note) && !(await hasPanel(ctx)) && (await btnState(ctx)).disabled, note);
  check(ctx, A, 'thông báo khác với "chưa hỗ trợ" và "mất mạng" (đúng nguyên nhân)', !/chưa hỗ trợ|Chưa lưu được/.test(note));
  await shot(ctx, 'tu-choi');
  check(ctx, A, 'tiến độ chơi thật vẫn đồng bộ cùng lượt', mock.state().levels[4]?.played === true && mock.state().levels[4]?.stars?.de === 2 && mock.state().game.coins === 20);
  check(ctx, A, 'cờ không lên máy chủ (đúng 1 lần thử, bị P0001) và bị gỡ khỏi máy', autoOk().length === 0 && autoFailed().length === 1 && autoFailed()[0].failed === 'P0001' && !(await localProgress(ctx))?.levels?.[1]?.auto);
  check(ctx, A, 'tải lại, mở /ban-do: cờ bị từ chối không có hiệu lực (không màn nào ghi "Tự hoàn thành")', (await chipCount(ctx)) === 0);
  await shot(ctx, 'tu-choi-ban-do-khong-co-co');
  await openLevel(ctx, 1);
  await waitButton(ctx, { enabled: true });
  await tap(ctx, (await btn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="tu-hoan-thanh-ghi-chu"]'), 20000);
  check(ctx, A, 'bấm lại sau khi tải lại: vẫn bị từ chối, vẫn không có cờ nào trên máy chủ', /không cho tài khoản này/.test(await noteText(ctx)) && autoOk().length === 0 && autoFailed().length === 2);
  const nr1 = await noteReadable(ctx);
  check(ctx, A, 'ghi chú từ chối ở thanh đầu bài học đọc được', nr1.count === 1 && nr1.ok, JSON.stringify(nr1));
  await openLevel(ctx, 2);
  await waitButton(ctx, { enabled: true });
  await tap(ctx, (await btn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="tu-hoan-thanh-ghi-chu"]'), 20000);
  const nr3 = await noteReadable(ctx);
  check(ctx, A, 'màn game (thẻ bắt đầu): bị từ chối, nút vô hiệu, ghi chú đọc được, không có cờ', /không cho tài khoản này/.test(await noteText(ctx)) && (await btnState(ctx)).disabled && nr3.count === 1 && nr3.ok && autoOk().length === 0, JSON.stringify(nr3));
  await shot(ctx, 'tu-choi-the-bat-dau');
  noError(ctx, A);
  await ctx.page.close();
}

/** 4. Mất mạng tạm thời (mọi yêu cầu đứt): chưa lưu được, KHÔNG kết luận thiếu cột hay khóa vĩnh viễn; có mạng lại thì lưu đúng một lần. */
async function scenMatMang(browser, size) {
  const A = 'mất mạng';
  const ctx = await fresh(browser, size);
  await openLevel(ctx, 1);
  await waitButton(ctx, { enabled: true });
  await probeDone();
  mock.setCfg({ offline: true });
  await tap(ctx, (await btn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 20000);
  const notice = await panelNotice(ctx);
  const body = await bodyText(ctx);
  check(ctx, A, 'khung hiện kèm lời nói rõ CHƯA lưu được lên máy chủ (có thể mất mạng)', /Chưa lưu được lên máy chủ/.test(notice), notice);
  check(ctx, A, 'không kết luận nhầm là thiếu migration hay bị từ chối', !/chưa hỗ trợ|không cho tài khoản này/.test(body));
  await shot(ctx, 'mat-mang-chua-luu');
  check(ctx, A, 'máy chủ chưa có cờ; trên máy đã ghi cờ để thử lại', autoOk().length === 0 && (await localProgress(ctx))?.levels?.[1]?.auto === true);
  await tap(ctx, (await ctx.page.evaluateHandle(() => document.querySelector('[data-testid="tu-hoan-thanh-choi-tiep"]'))).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="the-bat-dau"]'), 60000);
  await waitButton(ctx, { enabled: true });
  check(ctx, A, 'không khóa vĩnh viễn: sang màn 2 (mở nhờ cờ trên máy) nút vẫn dùng được, không có ghi chú khóa', !(await btnState(ctx)).disabled && (await noteText(ctx)) === '');
  await shot(ctx, 'mat-mang-man-2-nut-con-dung-duoc');
  mock.setCfg({ offline: false });
  await goOnline(ctx);
  check(ctx, A, 'có mạng lại: cờ tự lên máy chủ', await until(() => autoOk().length === 1, 20000));
  await goOnline(ctx);
  await sleep(300);
  await goOnline(ctx);
  await sleep(4000);
  const lv1 = mock.state().levels[1];
  check(ctx, A, 'thử lại không ghi trùng: đúng 1 lần ghi cờ thành công, một hàng màn 1', autoOk().length === 1 && autoOk()[0].levels.length === 1 && Object.keys(mock.state().levels).length === 1, JSON.stringify(autoOk()));
  check(ctx, A, 'hàng cờ không mang điểm/sao/hoàn thành thật, xu 0', lv1?.auto_completed === true && lv1.played === false && lv1.completed === false && lv1.best_score === 0 && mock.state().game.coins === 0 && mock.state().game.golden_pages === 0, JSON.stringify(lv1));
  await ctx.page.evaluate((k) => localStorage.removeItem(k), USER_KEY);
  check(ctx, A, 'xóa dữ liệu trên máy rồi tải lại: /ban-do vẫn ghi màn 1 "Tự hoàn thành" (cờ lấy từ máy chủ)', (await chipCount(ctx)) === 1);
  await shot(ctx, 'mat-mang-ban-do-co-lay-tu-may-chu');
  noError(ctx, A);
  await ctx.page.close();
}

/** 5. Thăm dò hỏng vì mạng (chưa biết), rồi đường ghi cờ lỗi tạm thời: vẫn là "chưa biết", không khóa; hết lỗi thì lưu đúng một lần. */
async function scenThamDoLoi(browser, size) {
  const A = 'thăm dò lỗi mạng';
  const ctx = await fresh(browser, size, { cfg: { probeFail: true, failAuto: true } });
  await openLevel(ctx, 1);
  await waitButton(ctx, { enabled: true });
  await probeDone();
  await sleep(500);
  check(ctx, A, 'thăm dò lỗi mạng: chưa biết máy chủ có hỗ trợ không nên nút KHÔNG bị khóa và không có ghi chú', !(await btnState(ctx)).disabled && (await noteText(ctx)) === '');
  await tap(ctx, (await btn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 20000);
  const notice = await panelNotice(ctx);
  check(ctx, A, 'ghi cờ lỗi tạm thời: nói rõ chưa lưu được, không nhầm là thiếu cột hay bị từ chối', /Chưa lưu được lên máy chủ/.test(notice) && !/chưa hỗ trợ|không cho tài khoản này/.test(await bodyText(ctx)), notice);
  await shot(ctx, 'tham-do-loi-chua-luu');
  mock.setCfg({ failAuto: false, probeFail: false });
  await goOnline(ctx);
  check(ctx, A, 'hết lỗi: cờ lên máy chủ đúng một lần', await until(() => autoOk().length === 1, 20000));
  await goOnline(ctx);
  await sleep(4000);
  check(ctx, A, 'không ghi trùng sau khi đã lưu', autoOk().length === 1 && Object.keys(mock.state().levels).length === 1 && autoFailed().length >= 1, JSON.stringify(mock.state().writes));
  noError(ctx, A);
  await ctx.page.close();
}

/** 6. Lưu thành công. */
async function scenThanhCong(browser, size) {
  const A = 'lưu thành công';
  const ctx = await fresh(browser, size);
  await openLevel(ctx, 1);
  await waitButton(ctx, { enabled: true });
  await probeDone();
  await ctx.page.evaluate(() => { const b = document.querySelector('[data-testid="nut-tu-hoan-thanh"]'); b.click(); b.click(); b.click(); });
  await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 20000);
  await sleep(2500);
  check(ctx, A, 'hiện khung "Đã tự hoàn thành" KHÔNG kèm lời cảnh báo chưa lưu', (await hasPanel(ctx)) && (await panelNotice(ctx)) === '');
  await shot(ctx, 'thanh-cong');
  const lv1 = mock.state().levels[1];
  check(ctx, A, 'bấm 3 lần liên tiếp: máy chủ nhận đúng 1 lần ghi cờ, 1 hàng', autoOk().length === 1 && autoFailed().length === 0 && Object.keys(mock.state().levels).length === 1, JSON.stringify(mock.state().writes));
  check(ctx, A, 'hàng trên máy chủ chỉ có cờ (không chơi, không hoàn thành, không sao/điểm); xu 0, trang 0', lv1?.auto_completed === true && lv1.played === false && lv1.completed === false && lv1.best_score === 0 && JSON.stringify(lv1.stars) === '{}' && mock.state().game.coins === 0 && mock.state().game.golden_pages === 0, JSON.stringify(lv1));
  await ctx.page.evaluate((k) => localStorage.removeItem(k), USER_KEY);
  check(ctx, A, 'xóa dữ liệu trên máy rồi tải lại: /ban-do ghi màn 1 "Tự hoàn thành" (cờ lấy từ máy chủ)', (await chipCount(ctx)) === 1);
  await shot(ctx, 'thanh-cong-ban-do-sau-tai-lai');
  await openLevel(ctx, 1);
  await sleep(1500);
  check(ctx, A, 'màn 1 đã tự hoàn thành: không còn nút', !(await btnState(ctx)).exists);
  check(ctx, A, 'không có lần ghi nào thêm sau khi tải lại', autoOk().length === 1);
  noError(ctx, A);
  await ctx.page.close();
}

/** 7. Phản hồi thăm dò cũ (báo thiếu cột) đến muộn sau khi cờ đã lưu thành công: không được hoàn lại. */
async function scenPhanHoiMuon(browser, size) {
  const A = 'phản hồi đến muộn';
  const ctx = await fresh(browser, size, { cfg: { staleProbe: { delayMs: 14000 } } });
  await openLevel(ctx, 1);
  await waitButton(ctx, { enabled: true });
  const t0 = Date.now();
  await tap(ctx, (await btn(ctx)).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="da-tu-hoan-thanh"]'), 20000);
  await sleep(800);
  check(ctx, A, 'lưu thành công trong lúc phản hồi thăm dò cũ còn treo', (await until(() => autoOk().length === 1, 5000)) && mock.state().probes[0]?.result === '', JSON.stringify(mock.state().probes));
  const staleArrived = await until(() => mock.state().probes[0]?.result === 'stale-42703', 30000);
  await sleep(1000);
  check(ctx, A, `phản hồi cũ (báo thiếu cột) đã đến muộn sau ${Math.round((Date.now() - t0) / 1000)} giây`, staleArrived);
  const body = await bodyText(ctx);
  check(ctx, A, 'khung "Đã tự hoàn thành" còn nguyên, không thông báo chưa hỗ trợ, không bị hoàn lại', (await hasPanel(ctx)) && !/chưa hỗ trợ/.test(body) && (await panelNotice(ctx)) === '');
  await shot(ctx, 'phan-hoi-muon-van-con-luu');
  await tap(ctx, (await ctx.page.evaluateHandle(() => document.querySelector('[data-testid="tu-hoan-thanh-choi-tiep"]'))).asElement());
  await waitFor(ctx, () => document.querySelector('[data-testid="the-bat-dau"]'), 60000);
  await waitButton(ctx, { enabled: true });
  check(ctx, A, 'sang màn 2: nút vẫn dùng được (trạng thái không bị đổi thành "chưa hỗ trợ")', !(await btnState(ctx)).disabled && (await noteText(ctx)) === '');
  check(ctx, A, 'cờ trên máy chủ và trên máy còn nguyên, chỉ một lần ghi', autoOk().length === 1 && mock.state().levels[1]?.auto_completed === true && (await localProgress(ctx))?.levels?.[1]?.auto === true);
  await shot(ctx, 'phan-hoi-muon-man-2');
  noError(ctx, A);
  await ctx.page.close();
}

const SCEN = { 'thieu-cot': scenThieuCot, 'thieu-cot-luc-ghi': scenThieuCotLucGhi, 'tu-choi': scenTuChoi, 'mat-mang': scenMatMang, 'tham-do-loi': scenThamDoLoi, 'thanh-cong': scenThanhCong, 'phan-hoi-muon': scenPhanHoiMuon };
const CHROME = [process.env.CHROME_PATH, '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find((p) => existsSync(p));
if (!CHROME) throw new Error('Không thấy Chrome: đặt CHROME_PATH');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const si of sizeIdx) {
    const size = SIZES[si];
    const before = results.length;
    for (const key of only) {
      try {
        await SCEN[key](browser, size);
      } catch (e) {
        results.push({ mode: 'api-gia', size: size.name, area: `lỗi chạy ${key}`, name: e.message, ok: false, detail: '' });
        console.log(`✗ ${size.name} ${key}: ${e.message}`);
        if (flag('v')) console.log(JSON.stringify({ probes: mock.state().probes, writes: mock.state().writes }));
      }
    }
    const mine = results.slice(before);
    console.log(`${mine.every((r) => r.ok) ? '✓' : '✗'} [api-gia] ${size.name}: ${mine.filter((r) => r.ok).length}/${mine.length}`);
  }
} finally {
  await browser.close();
  mock.close();
}
if (write) {
  writeFileSync(`${OUT}/ket-qua-api-gia.json`, JSON.stringify(results, null, 1));
  writeFileSync(`${OUT}/anh-api-gia.json`, JSON.stringify(shots, null, 1));
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `\nLỖI ${bad.length}/${results.length}` : `\nTất cả đạt (${results.length} kiểm).`);
process.exit(bad.length ? 1 : 0);
