// Chụp ảnh thật từ game cho "Hướng dẫn chơi". Chạy: pnpm guide:capture
// Tự mở Chrome (CHROME_PATH hoặc đường dẫn thường gặp), tự bật các máy chủ dev còn thiếu (hub 5173, làng Giấy 5174, đồ họa 5180) rồi tắt lại, ẩn HUD khi chụp cảnh đi lại,
// lưu PNG 960×540 vào assets/ui/huong-dan/<id>.png. Sau đó chạy `pnpm assets:build` để nén thành WebP và vào manifest.
// Danh sách id phải khớp GUIDE_SHOT_IDS trong packages/core/src/content/huongDan.ts (có test kiểm tra phía code; script này tự báo nếu lệch).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets/ui/huong-dan');
const W = 1280;
const H = 720;
const OUT_W = 960;
const OUT_H = 540;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SERVERS = [
  { name: 'dev:assets', port: 5180, url: 'http://localhost:5180/manifest.json' },
  { name: 'dev:hub', port: 5173, url: 'http://localhost:5173/' },
  { name: 'dev:lang-giay', port: 5174, url: 'http://localhost:5174/' },
];
const HUB = 'http://localhost:5173';
const LANG = 'http://localhost:5174';

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error('Không thấy Chrome. Đặt biến CHROME_PATH trỏ tới chrome.exe.');
  return found;
}

async function isUp(url) {
  try {
    const r = await fetch(url);
    return r.ok;
  } catch {
    return false;
  }
}

/** Bật máy chủ dev còn thiếu; trả hàm tắt các máy chủ do script bật. */
async function ensureServers() {
  const started = [];
  for (const s of SERVERS) {
    if (await isUp(s.url)) continue;
    console.log(`bật ${s.name} (cổng ${s.port})…`);
    const child = spawn('pnpm', [s.name], { cwd: ROOT, shell: true, stdio: 'ignore', windowsHide: true });
    started.push(child);
  }
  for (const s of SERVERS) {
    for (let i = 0; i < 80 && !(await isUp(s.url)); i++) await sleep(1500);
    if (!(await isUp(s.url))) throw new Error(`${s.name} không lên được ở cổng ${s.port}`);
  }
  return () => {
    for (const c of started) {
      if (process.platform === 'win32') spawn('taskkill', ['/PID', String(c.pid), '/T', '/F'], { shell: true, stdio: 'ignore' });
      else c.kill('SIGTERM');
    }
  };
}

// Cookie khách (xem progress/compact.ts): lv = các màn, gp = số Trang Sổ Vàng, vs/ks/gs/go/hd = cờ "đã xem" (tắt mọi hộp tự hiện khi chụp)
const PROGRESS = {
  none: { v: 1, lv: {}, gp: 0, c: 0, vs: 1, ks: 1, hd: 0x3f },
  oneGolden: { v: 1, lv: { 1: [1, 1, 3, 3, 3], 2: [1, 0, 1, 400], 3: [1, 0, 3, 340] }, gp: 1, c: 130, vs: 1, ks: 1, gs: 1, go: 1, hd: 0x3f },
  // đã chơi màn 1 (mở màn 2, màn 3): để vào được màn 2 và màn 3
  played: { v: 1, lv: { 1: [1, 1, 3, 3, 3] }, gp: 0, c: 0, vs: 1, ks: 1, hd: 0x3f },
};

const HIDE_WALK = '[data-hud],[data-walk-ui],[role="status"],[data-testid="crosshair"]{display:none !important}';

async function newPage(browser, progress) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: W, height: H });
  const guest = { ...PROGRESS[progress], u: Date.now() };
  await page.goto(`${HUB}/ban-do`, { waitUntil: 'load' });
  await page.evaluate((g) => {
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(g))}; path=/`;
  }, guest);
  return page;
}

// `crop`: cắt một vùng của ảnh chụp cả màn hình (không dùng `clip` của Chrome vì nó đổi cỡ khung và làm lệch các lớp cố định)
async function save(page, id, { crop } = {}) {
  mkdirSync(OUT, { recursive: true });
  const full = await page.screenshot();
  const buf = crop ? await sharp(full).extract(crop).toBuffer() : full;
  await sharp(buf).resize(OUT_W, OUT_H, { fit: 'cover' }).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${id}.png`));
  console.log(`  ✓ ${id}`);
}

const waitMarket = (page) => page.waitForFunction(() => window.__world && window.__marketStats && window.__marketStats.calls > 0 && window.__walkPlayer, { timeout: 180000 });
const place = (page, x, z, yaw) =>
  page.evaluate(
    (x, z, yaw) => {
      const s = window.__walkPlayer;
      s.x = x;
      s.z = z;
      s.yaw = yaw;
      window.__walkApi.camera.yaw = yaw;
      window.__walkApi.camera.pitch = 0.33;
    },
    x,
    z,
    yaw,
  );

async function marketShots(browser) {
  // 1-4. cảnh đi lại ở chợ: ẩn HUD
  let page = await newPage(browser, 'none');
  await page.goto(`${HUB}/cho?q=high`, { waitUntil: 'load' });
  await waitMarket(page);
  await page.addStyleTag({ content: HIDE_WALK });
  await sleep(3500);
  await save(page, 'cho-di-lai');
  // thế giới mở (bước W1): cổng ở đầu làng, cách tâm chợ 72; đứng trên đường cách cổng 9
  await place(page, 0, -63, Math.PI);
  await sleep(5000);
  await save(page, 'cong-dong');
  await place(page, 0, 63, 0);
  await sleep(5000);
  await save(page, 'cong-mo');
  await page.browserContext().close();

  // HUD Trang Sổ Vàng: chụp góc trên bên phải, ẩn dòng nhiệm vụ
  page = await newPage(browser, 'oneGolden');
  await page.goto(`${HUB}/cho?q=high`, { waitUntil: 'load' });
  await waitMarket(page);
  await page.addStyleTag({ content: '[data-hud] > p{display:none !important}[role="status"]{display:none !important}' });
  await sleep(3500);
  await save(page, 'hud-trang-vang', { crop: { left: W - 640, top: 0, width: 640, height: 360 } });
  await page.browserContext().close();

  // bản đồ
  page = await newPage(browser, 'oneGolden');
  await page.goto(`${HUB}/ban-do`, { waitUntil: 'load' });
  await sleep(4000);
  await save(page, 'ban-do');
  await page.browserContext().close();
}

async function villageShots(browser) {
  // biển gỗ trong làng (thế giới mở: /cho?tu=<làng> xuất hiện cạnh các biển): ẩn HUD
  let page = await newPage(browser, 'none');
  await page.goto(`${HUB}/cho?q=high&tu=lang-giay`, { waitUntil: 'load' });
  await waitMarket(page);
  await page.addStyleTag({ content: HIDE_WALK });
  await sleep(6000);
  await save(page, 'bien-go');
  await page.browserContext().close();

  // trang bài học (3 trạm)
  page = await newPage(browser, 'none');
  await page.goto(`${LANG}/lang/lang-giay/man/1`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.innerText.includes('Dễ'), { timeout: 60000 });
  await sleep(6000);
  await save(page, 'bai-hoc');
  await page.browserContext().close();
}

async function runnerShots(browser) {
  const page = await newPage(browser, 'played');
  await page.goto(`${LANG}/lang/lang-giay/man/2?q=high&bot=good`, { waitUntil: 'load' });
  await sleep(1500);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Bắt đầu')?.click());
  await page.waitForFunction(() => window.__runner && window.__runner.steps > 5, { timeout: 120000 });
  let ranShot = false;
  for (let i = 0; i < 1200; i++) {
    const s = await page.evaluate(() => {
      const st = window.__runner.state;
      return { phase: st.phase, pages: st.pages, coins: st.coins, answered: st.quiz ? st.quiz.answered : null };
    });
    if (!ranShot && s.phase === 'run' && s.coins >= 3 && s.pages >= 1) {
      ranShot = true;
      await save(page, 'man-2-chay');
    }
    if (s.phase === 'quiz' && s.answered === null) {
      await sleep(700);
      await save(page, 'man-2-cau-hoi');
      break;
    }
    await sleep(200);
  }
  if (!ranShot) console.warn('  ! không chụp được man-2-chay (chưa nhặt đủ vật)');
  await page.browserContext().close();
}

async function rebuildShots(browser) {
  // Ảnh màn 3 chụp ở vòng giữ sổ (bước X2b): vòng 3 có chuỗi 6 trang, {phanDien} vừa tráo một trang (chuỗi đang lệch) và hai thẻ mới rơi ra bàn.
  // Nhảy thẳng tới vòng 3 bằng cách đặt trạng thái 'vòng 2 xong' (cầu nối window.__rebuild có ở bản dev) rồi bấm 'Vòng tiếp theo' như người chơi.
  const page = await newPage(browser, 'oneGolden');
  await page.goto(`${LANG}/lang/lang-giay/man/3?q=high`, { waitUntil: 'load' });
  await sleep(1500);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Bắt đầu')?.click());
  await page.waitForFunction(() => window.__rebuild &&document.querySelector('[data-testid=man3-khung]'), { timeout: 120000 });
  await sleep(2500);
  await page.evaluate(() => {
    const s = window.__rebuild;
    s.round = 1;
    s.phase = 'roundDone';
    s.parts.push({ round: 0, errors: 0, fakeBinned: false, points: 100 }, { round: 1, errors: 0, fakeBinned: true, points: 130 });
    document.querySelector('[data-testid=nut-soi]')?.click(); // vẽ lại để hiện bảng 'Vòng 2 xong'
  });
  await sleep(500);
  await page.evaluate(() => document.querySelector('[data-testid=nut-tiep]')?.click());
  await page.evaluate(() => document.querySelector('[data-testid=nut-soi]')?.click()); // đóng lại ô soi công thức đã bật ở trên
  await page.waitForFunction(() => window.__rebuild?.phase === 'keep', { timeout: 10000 });
  await sleep(500);
  await page.evaluate(() => document.querySelector('[data-testid=nut-bat-dau-giu-so]')?.click());
  await page.waitForFunction(() => (window.__rebuild?.keep?.swapCount ?? 0) >= 1, { timeout: 20000 });
  await save(page, 'man-3-ban');
  await page.browserContext().close();
}

const only = process.argv.slice(2);
const steps = { cho: marketShots, lang: villageShots, chay: runnerShots, ghep: rebuildShots };
const stop = await ensureServers();
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
let failed = false;
try {
  // đối chiếu danh sách id với nội dung
  const src = readFileSync(path.join(ROOT, 'packages/core/src/content/huongDan.ts'), 'utf8');
  const ids = [...src.slice(src.indexOf('GUIDE_SHOT_IDS = ['), src.indexOf('] as const', src.indexOf('GUIDE_SHOT_IDS = ['))).matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
  console.log(`Chụp ${ids.length} ảnh: ${ids.join(', ')}`);
  for (const [name, fn] of Object.entries(steps)) {
    if (only.length && !only.includes(name)) continue;
    console.log(`[${name}]`);
    await fn(browser);
  }
  const missing = ids.filter((id) => !existsSync(path.join(OUT, `${id}.png`)));
  if (missing.length) {
    failed = true;
    console.error(`Thiếu ảnh: ${missing.join(', ')}`);
  } else console.log(`Xong. Ảnh ở ${path.relative(ROOT, OUT)}. Chạy tiếp: pnpm assets:build`);
} finally {
  await browser.close();
  stop();
}
if (failed) process.exit(1);
