// P5: trạng thái "tự hoàn thành" trên BẢN DEV (chỉ giáo viên/bản dev được dùng cờ này, progress/ProgressProvider canUseAutoComplete): cột hiện dáng "xong" ở cả 3 biển mỗi làng,
// và việc đó không phát sinh phần thưởng (Trang Sổ Vàng, xu, sao, điểm, cảnh trao trang).
// Chuẩn bị: pnpm dev:assets &  rồi  (cd apps/hub && VITE_MERGED=true VITE_ASSETS_URL=http://localhost:5180 npx vite --port 5174 --strictPort) &
// Chạy: node scripts/p5-dev-auto.mjs [--base=http://localhost:5174]
import { existsSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5174').slice(7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORDER = ['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'];
const FIRST = { 'lang-giay': 1, 'lang-det': 4, 'lang-khac-dau': 7, 'lang-bac': 10 };
// khách mới tinh (không màn nào xong thật, không thẻ, 0 trang) nhưng cả 12 màn có cờ tự hoàn thành (ac = 4095)
const prog = { v: 1, lv: {}, gp: 0, c: 0, u: Date.now(), st: 1, kc: [0, 0, 0, 0], gt: 8191, hd: 2147483647, ac: 4095 };
const CHROME = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = [];
const log = (name, ok, detail = '') => {
  out.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const cookieOf = (page) => page.evaluate(() => { const m = document.cookie.match(/sc_guest=([^;]+)/); return m ? JSON.parse(decodeURIComponent(m[1])) : null; });

try {
  for (const id of ORDER) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.evaluateOnNewDocument(() => { Element.prototype.requestPointerLock = function () { Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true }); document.dispatchEvent(new Event('pointerlockchange')); }; });
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto(BASE);
    await page.evaluate((p) => {
      localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
    }, prog);
    await page.goto(`${BASE}/cho?tu=${id}&q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__walkPlayer && window.__world && window.__worldInteractables, { timeout: 240000 });
    await page.waitForFunction((v) => window.__worldInside === v && window.__worldInteractables.filter((i) => i.id.startsWith(`board:${v}:`)).length === 3, { timeout: 240000 }, id);
    await sleep(3000);
    for (let i = 0; i < 4; i++) { await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim())); if (b) b.click(); }); await sleep(1500); }
    await sleep(3000);
    await page.waitForFunction((f) => [f, f + 1, f + 2].every((l) => window.__boardKinds?.[l]), { timeout: 240000 }, FIRST[id]); // chờ vùng làng dựng xong biển
    const kinds = await page.evaluate((f) => [f, f + 1, f + 2].map((l) => window.__boardKinds?.[l] ?? null), FIRST[id]);
    log(`${id}: cả 3 cột hiện dáng "xong" (tự hoàn thành)`, kinds.join() === 'done,done,done', kinds.join());
    const info = await page.evaluate((v) => { const w = window.__world.villages.find((q) => q.id === v).frame; return { dx: w.dirX, dz: w.dirZ, yaw: w.yaw, b: window.__worldInteractables.find((i) => i.id === `board:${v}:${[1, 4, 7, 10][['lang-giay', 'lang-det', 'lang-khac-dau', 'lang-bac'].indexOf(v)] + 1}`) }; }, id);
    await page.evaluate((i) => { window.__walkPlayer.x = i.b.x - i.dx * 6; window.__walkPlayer.z = i.b.z - i.dz * 6; window.__walkPlayer.yaw = i.yaw; window.__walkApi.camera.yaw = i.yaw; }, info);
    await sleep(4000);
    if (id === 'lang-giay' || id === 'lang-bac') await page.screenshot({ path: `docs/screenshots/p5/dev-tu-hoan-thanh-${id}-1366x768.jpg`, type: 'jpeg', quality: 60 });
    await sleep(2500); // chờ ghi tiến độ
    const body = await page.evaluate(() => document.body.innerText);
    const c = await cookieOf(page);
    log(`${id}: không phát sinh phần thưởng`, (c?.gp ?? 0) === 0 && (c?.c ?? 0) === 0 && Object.values(c?.lv ?? {}).every((r) => r.every((n) => n === 0)) && !/trao em Trang Sổ Vàng|Trang Sổ Vàng thứ/.test(body) && (body.match(/Chưa nhận Trang Sổ Vàng/g) ?? []).length === 4, `gp=${c?.gp} xu=${c?.c} lv: ${Object.keys(c?.lv ?? {}).length} hàng rỗng (chỉ mang cờ tự hoàn thành, không điểm, không sao, chưa chơi, chưa xong) cờ ac=${c?.ac}`);
    log(`${id}: không lỗi trang`, errors.length === 0, errors.slice(0, 2).join(' | '));
    await page.close();
  }
} catch (e) {
  log('lỗi chạy', false, e.message);
}
await browser.close();
writeFileSync('docs/screenshots/p5/ket-qua-dev-tu-hoan-thanh.json', JSON.stringify(out, null, 1));
process.exit(out.every((o) => o.ok) ? 0 : 1);
