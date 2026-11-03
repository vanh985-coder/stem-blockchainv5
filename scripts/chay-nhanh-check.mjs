/**
 * Kiểm "Chạy nhanh" ở thế giới 3D bằng Chrome thật (puppeteer-core), bản build probe:
 *   cd apps/hub && VITE_MERGED=true VITE_PROBE=true VITE_ASSETS_URL=http://localhost:5180 npx vite build --outDir dist-probe
 *   npx vite preview --outDir dist-probe --port 5773 --strictPort      (cùng pnpm dev:assets ở 5180)
 * Chạy: node scripts/chay-nhanh-check.mjs   (URL=... đổi địa chỉ; CHROME=... đổi đường dẫn Chrome)
 * Mỗi ca in ✓ hoặc ✗; ảnh JPEG dưới 300 KB lưu ở docs/screenshots/chay-nhanh/. Thoát mã 1 nếu có ca hỏng.
 */
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, statSync } from 'node:fs';

const BASE = process.env.URL || 'http://localhost:5773';
const OUT = 'docs/screenshots/chay-nhanh';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => existsSync(p));
if (!CHROME) {
  console.error('Không tìm thấy Google Chrome');
  process.exit(1);
}

const results = [];
function check(tag, name, ok, detail = '') {
  results.push({ ok: Boolean(ok) });
  console.log(`   ${ok ? '✓' : '✗'} [${tag}] ${name}${detail ? ` (${detail})` : ''}`);
}

const cookie = { v: 1, lv: {}, gp: 0, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 8191, hd: 2147483647, vs: 15, vi: 15 };

async function shot(page, tag, name) {
  const file = `${OUT}/${tag}-${name}.jpg`;
  for (const q of [62, 48, 36]) {
    await page.screenshot({ path: file, type: 'jpeg', quality: q });
    if (statSync(file).size < 300 * 1024) break;
  }
  const kb = Math.round(statSync(file).size / 1024);
  check(tag, `ảnh ${name}.jpg dưới 300 KB`, kb < 300, `${kb} KB`);
}

async function open(browser, size, touch, query) {
  const page = await browser.newPage();
  await page.setViewport({ width: size[0], height: size[1], isMobile: touch, hasTouch: touch, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((ck) => {
    Element.prototype.requestPointerLock = function () {
      Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true });
      document.dispatchEvent(new Event('pointerlockchange'));
      return Promise.resolve();
    };
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(ck))}; path=/`;
    // Ghi vị trí người chơi mỗi khung hình.
    window.__log = [];
    const loop = (t) => {
      const p = window.__walkPlayer;
      if (p) window.__log.push([t, p.x, p.z, p.y]);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }, cookie);
  await page.goto(`${BASE}/cho?${query}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="cho"][data-ready="true"]', { timeout: 90000 });
  await page.waitForFunction(() => window.__walkPlayer !== undefined && window.__worldObstacles !== undefined, { timeout: 30000 });
  await sleep(1500);
  return page;
}

/** Tốc độ (đơn vị/giây) trong cửa sổ [t0, t1] giây tính từ mốc `from` (ms). */
const speedOf = (log, from, t0, t1) => {
  const a = log.find((r) => r[0] >= from + t0 * 1000);
  const b = [...log].reverse().find((r) => r[0] <= from + t1 * 1000);
  return Math.hypot(b[1] - a[1], b[2] - a[2]) / ((b[0] - a[0]) / 1000);
};

/** Khoảng cách nhỏ nhất từ các điểm lấy mẫu tới vật cản (trừ bán kính vật cản); < 0,35 là lọt vào trong. */
function minClearance(page, from) {
  return page.evaluate((from) => {
    const obs = window.__worldObstacles;
    let min = Infinity;
    const samples = window.__log.filter((r) => r[0] >= from && r[3] < 0.3);
    for (const [, x, z] of samples) {
      for (const o of obs) {
        let d;
        if (o.type === 'circle') d = Math.hypot(x - o.x, z - o.z) - o.r;
        else {
          let lx = x, lz = z, minX = o.minX, maxX = o.maxX, minZ = o.minZ, maxZ = o.maxZ;
          if (o.type === 'obox') {
            const c = Math.cos(o.yaw), s = Math.sin(o.yaw);
            const dx = x - o.x, dz = z - o.z;
            lx = dx * c - dz * s;
            lz = dx * s + dz * c;
            minX = -o.hx; maxX = o.hx; minZ = -o.hz; maxZ = o.hz;
          }
          const ex = Math.max(minX - lx, 0, lx - maxX);
          const ez = Math.max(minZ - lz, 0, lz - maxZ);
          const inside = ex === 0 && ez === 0;
          d = inside ? -1 : Math.hypot(ex, ez);
        }
        if (d < min) min = d;
      }
    }
    return { min, n: samples.length };
  }, from);
}

/** Chỗ đứng cách cổng Làng Giấy 8,5 đơn vị về phía chợ, nhìn vào cổng (như `?mo=`); đặt tại đó rồi khóa chuột. */
async function gotoGate(page) {
  const s = await page.evaluate(() => {
    const f = window.__world.villages.find((v) => v.id === 'lang-giay').frame;
    return { x: f.gateX - f.dirX * 8.5, z: f.gateZ - f.dirZ * 8.5, yaw: f.yaw };
  });
  await placeAt(page, s);
  await page.mouse.click(683, 384);
  await sleep(500);
  return s;
}
async function placeAt(page, s) {
  await page.evaluate((s) => {
    window.__walkApi.teleport(s.x, s.z, s.yaw);
    window.__walkApi.camera.yaw = s.yaw;
  }, s);
  await sleep(800);
}

/** Đóng cảnh mở đầu làng / hộp thoại nếu có, rồi khóa chuột lại. */
async function settle(page) {
  for (let i = 0; i < 6; i++) {
    await sleep(500);
    const b = await page.evaluateHandle(() => [...document.querySelectorAll('button')].find((q) => /^(Bỏ qua|Đóng|Tiếp tục)/.test(q.textContent.trim())) ?? null);
    const el = b.asElement();
    if (!el) break;
    await el.click();
  }
  await page.mouse.click(683, 384);
  await sleep(800);
}

const now = (page) => page.evaluate(() => performance.now());
const btn = '[data-testid="nut-chay-nhanh"]';
const pressed = (page) => page.$eval(btn, (b) => b.getAttribute('aria-pressed'));
const lockState = (page) => page.evaluate(() => ({ locked: document.pointerLockElement !== null, yaw: window.__walkApi.camera.yaw, pitch: window.__walkApi.camera.pitch }));

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  try {
    // ===== Máy tính 1366×768 =====
    console.log('\n--- Máy tính 1366×768 ---');
    const page = await open(browser, [1366, 768], false, 'q=low&warmup=off');
    await page.mouse.click(683, 384); // khóa chuột
    await sleep(600);
    const spawn = await gotoGate(page);
    console.log('   chỗ đứng trước cổng Giấy:', JSON.stringify(spawn));
    check('may', 'có nút "Chạy nhanh", chưa bật (aria-pressed=false)', (await pressed(page)) === 'false');
    await shot(page, 'may', 'nut-tat');

    // Đi thường (không Shift): tốc độ ≈ 4
    let t = await now(page);
    await page.keyboard.down('KeyW');
    await sleep(1300);
    await page.keyboard.up('KeyW');
    let log = await page.evaluate(() => window.__log);
    const walk = speedOf(log, t, 0.5, 1.1);
    check('may', 'đi thường ≈ 4 đơn vị/giây', Math.abs(walk - 4) < 0.4, walk.toFixed(2));

    // Giữ Shift từ chỗ cũ: tốc độ ≈ 7, hệ số ≈ 1,75; rồi chạy tiếp qua cổng vào Làng Giấy
    await placeAt(page, spawn);
    const start = { x: spawn.x, z: spawn.z };
    t = await now(page);
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    await sleep(1300);
    log = await page.evaluate(() => window.__log);
    const runSp = speedOf(log, t, 0.5, 1.1);
    check('may', 'giữ Shift ≈ 7 đơn vị/giây', Math.abs(runSp - 7) < 0.5, runSp.toFixed(2));
    check('may', 'hệ số chạy/đi ≈ 1,75 (±0,15)', Math.abs(runSp / walk - 1.75) < 0.15, (runSp / walk).toFixed(2));
    await sleep(2500);
    await shot(page, 'may', 'giu-shift-qua-cong');
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
    const end = await page.evaluate(() => ({ x: window.__walkPlayer.x, z: window.__walkPlayer.z, inside: window.__worldInside }));
    const travelled = Math.hypot(end.x - start.x, end.z - start.z);
    check('may', 'chạy từ chợ qua cổng vào Làng Giấy', end.inside === 'giay' || travelled > 14, `đi ${travelled.toFixed(1)}, trong làng: ${end.inside}`);
    const cl = await minClearance(page, t);
    check('may', 'không lọt vào vật cản nào (khoảng cách tâm ≥ 0,35)', cl.min >= 0.35, `nhỏ nhất ${cl.min.toFixed(3)} trên ${cl.n} mẫu`);
    await settle(page);

    // Chạy đâm thẳng vào tường/nhà liên tục (khung hình chậm nhất) rồi kiểm lại
    const wall = await page.evaluate(() => {
      // đứng ở giữa làng, quay mặt về phía nhà gần nhất rồi chạy vào
      const obs = window.__worldObstacles;
      const p = window.__walkPlayer;
      let best = null;
      for (const o of obs) {
        if (o.type !== 'obox') continue;
        const d = Math.hypot(o.x - p.x, o.z - p.z);
        if (d > 4 && (!best || d < best.d)) best = { d, x: o.x, z: o.z };
      }
      return best;
    });
    if (wall) {
      const yaw = await page.evaluate((w) => {
        const p = window.__walkPlayer;
        const a = Math.atan2(w.x - p.x, w.z - p.z);
        window.__walkApi.camera.yaw = a;
        return a;
      }, wall);
      t = await now(page);
      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down('KeyW');
      await sleep(3000);
      await page.keyboard.up('KeyW');
      await page.keyboard.up('ShiftLeft');
      const cw = await minClearance(page, t);
      check('may', 'chạy đâm thẳng vào nhà gần nhất: không xuyên', cw.min >= 0.35, `yaw ${yaw.toFixed(2)}, nhỏ nhất ${cw.min.toFixed(3)}`);
    }

    // Nút bật tắt
    const lock0 = await lockState(page);
    await page.click(btn);
    await sleep(150);
    check('may', 'bấm nút: aria-pressed=true', (await pressed(page)) === 'true');
    const lock1 = await lockState(page);
    check('may', 'bấm nút không mất khóa chuột', lock1.locked === lock0.locked && lock1.locked);
    await shot(page, 'may', 'nut-bat');
    t = await now(page);
    await page.evaluate(() => { window.__walkApi.camera.yaw = 0; });
    await page.keyboard.down('KeyS');
    await sleep(1000);
    await page.keyboard.up('KeyS');
    log = await page.evaluate(() => window.__log);
    const togSp = speedOf(log, t, 0.4, 0.9);
    check('may', 'nút bật (không giữ Shift): ≈ 7 đơn vị/giây', Math.abs(togSp - 7) < 0.7, togSp.toFixed(2));
    await page.click(btn);
    await sleep(150);
    check('may', 'bấm lần nữa: tắt (aria-pressed=false)', (await pressed(page)) === 'false');
    t = await now(page);
    await page.keyboard.down('KeyW');
    await sleep(900);
    await page.keyboard.up('KeyW');
    log = await page.evaluate(() => window.__log);
    const offSp = speedOf(log, t, 0.4, 0.8);
    check('may', 'nút tắt: về ≈ 4 đơn vị/giây', Math.abs(offSp - 4) < 0.5, offSp.toFixed(2));

    // Phím R bật/tắt chạy nhanh (chuột khóa thì con trỏ ẩn, không bấm được nút): nhãn nút có "(R)", giữ phím không lặp
    check('may', 'nhãn nút trên máy tính có phím tắt "(R)"', /\(R\)/.test(await page.$eval(btn, (b) => b.textContent || '')));
    await page.keyboard.press('KeyR');
    await sleep(150);
    check('may', 'bấm R: bật chạy nhanh (aria-pressed=true, dữ liệu runToggle)', (await pressed(page)) === 'true' && (await page.evaluate(() => window.__walkApi.input.runToggle)) === true);
    t = await now(page);
    await page.keyboard.down('KeyW');
    await sleep(900);
    await page.keyboard.up('KeyW');
    log = await page.evaluate(() => window.__log);
    const rSp = speedOf(log, t, 0.4, 0.8);
    check('may', 'bật bằng R (không giữ Shift): ≈ 7 đơn vị/giây', Math.abs(rSp - 7) < 0.7, rSp.toFixed(2));
    // giữ R (phím lặp) chỉ đổi một lần
    await page.keyboard.down('KeyR');
    for (let i = 0; i < 4; i++) {
      await page.keyboard.down('KeyR');
      await sleep(40);
    }
    await page.keyboard.up('KeyR');
    await sleep(150);
    check('may', 'giữ R (lặp phím) chỉ đổi một lần: tắt (không nhấp nháy bật tắt)', (await pressed(page)) === 'false' && (await page.evaluate(() => window.__walkApi.input.runToggle)) === false);
    // Shift vẫn là giữ để chạy khi R đang tắt
    await page.keyboard.down('ShiftLeft');
    await sleep(120);
    check('may', 'R tắt, giữ Shift: vẫn chạy nhanh (aria-pressed=true), nhả Shift thì tắt', (await pressed(page)) === 'true');
    await page.keyboard.up('ShiftLeft');
    await sleep(120);
    check('may', 'nhả Shift: về đi thường', (await pressed(page)) === 'false');

    // Mở bản đồ lớn thì tự tắt
    await page.click(btn);
    await sleep(100);
    check('may', 'bật lại trước khi mở bản đồ', (await pressed(page)) === 'true');
    await page.keyboard.press('KeyM');
    await page.waitForSelector('[data-testid="ban-do-lon"]', { timeout: 5000 });
    await sleep(300);
    check('may', 'mở bản đồ lớn: tự tắt chạy nhanh (nút + dữ liệu)', (await pressed(page)) === 'false' && (await page.evaluate(() => window.__walkApi.input.runToggle)) === false);
    await page.keyboard.press('KeyM');
    await sleep(500);
    check('may', 'đóng bản đồ: vẫn tắt', (await pressed(page)) === 'false');
    await page.close();

    // ===== Điện thoại 360×800 =====
    console.log('\n--- Điện thoại 360×800 ---');
    const m = await open(browser, [360, 800], true, 'q=low&warmup=off');
    await placeAt(m, spawn);
    const cdp = await m.createCDPSession();
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
    const box = await m.$eval(btn, (b) => { const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height }; });
    check('dt', 'nút "Chạy nhanh" ≥ 44px và nằm trong màn hình', box.w >= 44 && box.h >= 44 && box.x < 360 && box.y < 800, `${Math.round(box.w)}×${Math.round(box.h)}`);
    // Không chồng lên bản đồ nhỏ, dòng nhiệm vụ
    const overlap = await m.evaluate((sel) => {
      const b = document.querySelector(sel).getBoundingClientRect();
      const hit = [...document.querySelectorAll('[data-hud], [data-testid="ban-do-nho"]')].filter((e) => !e.matches(sel) && !e.contains(document.querySelector(sel)));
      return hit.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top; }).map((e) => e.getAttribute('data-testid') || e.className.toString().slice(0, 30));
    }, btn);
    check('dt', 'nút không chồng lên HUD (bản đồ nhỏ, nhiệm vụ, nút khác)', overlap.length === 0, overlap.join(', '));
    // Chạm nút: bật
    await touch('touchStart', [{ x: box.x, y: box.y, id: 1 }]);
    await touch('touchEnd', []);
    await sleep(200);
    check('dt', 'chạm nút: aria-pressed=true', (await pressed(m)) === 'true');
    // Chạm giữ cần điều khiển, đẩy nhẹ 28px (50%) lên
    let t2 = await now(m);
    await touch('touchStart', [{ x: 90, y: 600, id: 2 }]);
    await touch('touchMove', [{ x: 90, y: 572, id: 2 }]);
    await sleep(1400);
    await shot(m, 'dt', 'can-va-nut-bat');
    let log2 = await m.evaluate(() => window.__log);
    const dtRun = speedOf(log2, t2, 0.5, 1.1);
    await touch('touchEnd', []);
    check('dt', 'cần đẩy nhẹ + nút bật: ≈ 7 đơn vị/giây', Math.abs(dtRun - 7) < 0.7, dtRun.toFixed(2));
    // Tắt nút, đẩy nhẹ lại: đi thường
    await touch('touchStart', [{ x: box.x, y: box.y, id: 1 }]);
    await touch('touchEnd', []);
    await sleep(200);
    check('dt', 'chạm nút lần nữa: aria-pressed=false', (await pressed(m)) === 'false');
    await placeAt(m, spawn);
    t2 = await now(m);
    await touch('touchStart', [{ x: 90, y: 600, id: 2 }]);
    await touch('touchMove', [{ x: 90, y: 572, id: 2 }]);
    await sleep(1200);
    log2 = await m.evaluate(() => window.__log);
    const dtWalk = speedOf(log2, t2, 0.5, 1.0);
    await touch('touchEnd', []);
    check('dt', 'cần đẩy nhẹ, nút tắt: ≈ 4 đơn vị/giây', Math.abs(dtWalk - 4) < 0.5, dtWalk.toFixed(2));
    // Bật nút rồi mở bản đồ lớn bằng chạm bản đồ nhỏ: tự tắt
    await touch('touchStart', [{ x: box.x, y: box.y, id: 1 }]);
    await touch('touchEnd', []);
    await sleep(150);
    const mini = await m.$('[data-testid="ban-do-nho"]');
    if (mini) {
      await mini.tap();
      await m.waitForSelector('[data-testid="ban-do-lon"]', { timeout: 5000 }).catch(() => null);
      await sleep(300);
      check('dt', 'mở bản đồ lớn: tự tắt chạy nhanh', (await pressed(m)) === 'false');
    } else check('dt', 'tìm thấy bản đồ nhỏ', false);
    await m.close();

    // ===== FPS khi chạy nhanh qua chợ, mức Thấp =====
    console.log('\n--- FPS chạy nhanh qua chợ (mức Thấp, 1366×768) ---');
    const f = await open(browser, [1366, 768], false, 'q=low&warmup=off');
    await f.mouse.click(683, 384);
    await sleep(800);
    const fps = async (label, shift) => {
      await f.evaluate(() => { window.__frames = []; let last = performance.now(); const loop = (t) => { window.__frames.push(t - last); last = t; if (window.__fpsOn) requestAnimationFrame(loop); }; window.__fpsOn = true; requestAnimationFrame(loop); });
      if (shift) await f.keyboard.down('ShiftLeft');
      for (const [key, ms] of [['KeyW', 2500], ['KeyD', 1500], ['KeyS', 2500]]) {
        await f.keyboard.down(key);
        await sleep(ms);
        await f.keyboard.up(key);
      }
      if (shift) await f.keyboard.up('ShiftLeft');
      const fr = await f.evaluate(() => { window.__fpsOn = false; return window.__frames.slice(5); });
      fr.sort((a, b) => a - b);
      const avg = fr.reduce((s, v) => s + v, 0) / fr.length;
      const p95 = fr[Math.floor(fr.length * 0.95)];
      const slow = fr.filter((v) => v > 50).length;
      console.log(`   ${label}: ${(1000 / avg).toFixed(1)} FPS trung bình, khung chậm nhất ${fr[fr.length - 1].toFixed(1)} ms, p95 ${p95.toFixed(1)} ms, ${slow} khung > 50 ms (${fr.length} khung)`);
      return { avg, slowest: fr[fr.length - 1] };
    };
    const a = await fps('đi thường', false);
    const b = await fps('chạy nhanh ', true);
    check('fps', 'chạy nhanh ≥ 30 FPS trung bình ở mức Thấp', 1000 / b.avg >= 30, `${(1000 / b.avg).toFixed(1)} (đi thường ${(1000 / a.avg).toFixed(1)})`);
    await f.close();
  } finally {
    await browser.close();
  }
  const bad = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - bad}/${results.length} ca đạt`);
  process.exit(bad ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
