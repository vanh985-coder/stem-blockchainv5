// P5: phím E thật trên máy tính. Khóa chuột giả (CLAUDE.md mục 9) + một cú bấm chuột thật vào cảnh để phiên hết tạm dừng; rồi đứng cạnh biển, đọc lời nhắc "E: …" trong DOM,
// nhấn E bằng bàn phím (sự kiện tin cậy của Chrome) và kiểm màn mở ra hay hộp báo khóa. Ghi rõ từng bước để biết khóa chuột giả có đủ không.
// Chạy: node scripts/p5-e-key.mjs [--base=http://localhost:5193]
import { existsSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = (process.argv.find((a) => a.startsWith('--base=')) ?? '--base=http://localhost:5193').slice(7);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lesson = [1, 1, 3, 3, 3];
const prog = { v: 1, lv: { 1: lesson }, gp: 0, c: 0, u: Date.now(), st: 1, kc: [15, 15, 0, 0], gt: 8191, hd: 2147483647 };
const CHROME = ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = [];
const log = (name, ok, detail = '') => {
  out.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function fresh() {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Element.prototype.requestPointerLock = function () {
      Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true });
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  });
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(BASE);
  await page.evaluate((p) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
  }, prog);
  await page.goto(`${BASE}/cho?tu=lang-giay&q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__walkPlayer && window.__world && window.__worldInteractables, { timeout: 120000 });
  await page.waitForFunction(() => window.__worldInside === 'lang-giay' && window.__worldInteractables.filter((i) => i.id.startsWith('board:lang-giay:')).length === 3, { timeout: 170000 });
  return page;
}
const stand = async (page, level) => {
  const info = await page.evaluate((lv) => {
    const f = window.__world.villages.find((q) => q.id === 'lang-giay').frame;
    const b = window.__worldInteractables.find((i) => i.id === `board:lang-giay:${lv}`);
    return { dx: f.dirX, dz: f.dirZ, yaw: f.yaw, x: b.x, z: b.z };
  }, level);
  await page.evaluate((i) => { window.__walkPlayer.x = i.x - i.dx * 1.4; window.__walkPlayer.z = i.z - i.dz * 1.4; window.__walkPlayer.yaw = i.yaw; window.__walkApi.camera.yaw = i.yaw; }, info);
};
/** Bỏ qua cảnh mở đầu (nút), rồi bấm chuột thật vào cảnh cho tới khi lời nhắc "E:" hiện hoặc hết giờ. */
async function reachPrompt(page, ms = 150000) {
  const end = Date.now() + ms;
  let clicks = 0;
  while (Date.now() < end) {
    const st = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim()));
      if (b) b.click();
      return { skip: Boolean(b), prompt: /(^|\n)E: /.test(document.body.innerText), lock: Boolean(document.pointerLockElement) };
    });
    if (st.prompt && !st.skip) return { ok: true, clicks, lock: st.lock };
    if (!st.skip) { await page.mouse.click(683, 384); clicks++; }
    await sleep(st.skip ? 1500 : 1000);
  }
  return { ok: false, clicks, lock: await page.evaluate(() => Boolean(document.pointerLockElement)) };
}

try {
  // 1. màn mở: lời nhắc → E → vào màn 2
  let page = await fresh();
  await stand(page, 2);
  let r = await reachPrompt(page);
  const text = await page.evaluate(() => (document.body.innerText.match(/(^|\n)E: [^\n]+/) ?? [''])[0].trim());
  log('màn 2 (mở): lời nhắc "E: …" hiện sau khi bấm chuột thật vào cảnh', r.ok && /Vào màn: Đuổi theo/.test(text), `${text} (khóa chuột giả ${r.lock ? 'có' : 'không'}, ${r.clicks} cú bấm)`);
  const url0 = page.url();
  await page.keyboard.press('KeyE');
  const nav = await page.waitForFunction(() => location.pathname.includes('/man/2'), { timeout: 20000 }).then(() => true, () => false);
  log('màn 2 (mở): nhấn phím E (bàn phím thật) mở đúng /lang/lang-giay/man/2', nav && page.url() !== url0, page.url());
  await page.close();

  // 2. màn khóa: lời nhắc → E → hộp báo "Hoàn thành màn 2"
  page = await fresh();
  await stand(page, 3);
  r = await reachPrompt(page);
  const text3 = await page.evaluate(() => (document.body.innerText.match(/(^|\n)E: [^\n]+/) ?? [''])[0].trim());
  log('màn 3 (khóa): lời nhắc "E: Xem biển: …" hiện', r.ok && /Xem biển: Ghép lại cuốn sổ/.test(text3), `${text3} (khóa chuột giả ${r.lock ? 'có' : 'không'})`);
  const u3 = page.url();
  await page.keyboard.press('KeyE');
  await sleep(1500);
  const body = await page.evaluate(() => document.body.innerText);
  log('màn 3 (khóa): nhấn phím E hiện hộp báo "Hoàn thành màn 2 … để mở" và không chuyển trang', /Hoàn thành màn 2/.test(body) && page.url() === u3, '');
  await page.close();
} catch (e) {
  log('lỗi chạy', false, e.message);
}
await browser.close();
writeFileSync('docs/screenshots/p5/ket-qua-phim-e.json', JSON.stringify(out, null, 1));
process.exit(out.every((o) => o.ok) ? 0 : 1);
