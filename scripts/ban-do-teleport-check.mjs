// Script kiểm tra tính năng Dịch chuyển tức thời trên Bản đồ lớn (bước X4)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const PORT = 5473;
const BASE = `http://localhost:${PORT}`;
const OUT = 'docs/screenshots/ban-do-dich-chuyen';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const guestCookie = {
  v: 1,
  lv: {},
  gp: 0,
  c: 0,
  u: Date.now(),
  st: 1,
  kc: [0, 0, 0, 0], // 16 thẻ chưa nhặt để hiện đầy đủ trên bản đồ
  gt: 8191,
  hd: 2147483647,
};

async function ensureServer() {
  try {
    const res = await fetch(`${BASE}/cho`);
    if (res.ok) return null;
  } catch {}

  console.log(`Đang khởi động preview server tại cổng ${PORT}...`);
  const srv = spawn('pnpm', ['--filter', '@so-chung/hub', 'exec', 'vite', 'preview', '--outDir', 'dist-probe-teleport', '--port', String(PORT), '--strictPort'], {
    shell: true,
    stdio: 'pipe',
  });

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const res = await fetch(`${BASE}/cho`);
      if (res.ok) {
        console.log(`Server đã sẵn sàng tại ${BASE}`);
        return srv;
      }
    } catch {}
  }
  throw new Error(`Server không thể khởi động tại cổng ${PORT}`);
}

async function takeShot(page, name) {
  const buf = await page.screenshot({ type: 'jpeg', quality: 75 });
  if (buf.length >= 300000) {
    throw new Error(`Ảnh ${name} vượt quá 300 KB (${buf.length} bytes)`);
  }
  const filePath = `${OUT}/${name}.jpg`;
  writeFileSync(filePath, buf);
  console.log(`   [Ảnh] Đã lưu ${filePath} (${(buf.length / 1024).toFixed(1)} KB)`);
  return buf.length;
}

async function settleVillage(page) {
  for (let i = 0; i < 60; i++) {
    const entering = await page.evaluate(() => /Đang vào làng/.test(document.body.innerText));
    if (!entering) break;
    await sleep(300);
  }
  for (let i = 0; i < 5; i++) {
    const skipped = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim()));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    if (skipped) {
      await sleep(600);
    } else {
      break;
    }
  }
  await sleep(300);
}

async function openBigMap(page, isTouch = false) {
  for (let i = 0; i < 30; i++) {
    if (isTouch) {
      const minimap = await page.$('[aria-label*="Bản đồ nhỏ"]');
      if (minimap) await minimap.tap();
    } else {
      await page.keyboard.press('KeyM');
    }
    await sleep(400);
    const big = await page.$('[data-testid="ban-do-lon"]');
    if (big) return;
    await sleep(300);
  }
  throw new Error(`Không thể mở Bản đồ lớn bằng ${isTouch ? 'chạm bản đồ nhỏ' : 'phím M'}`);
}

async function doTeleportAndVerify(page, markerSelector, name) {
  await page.waitForSelector(markerSelector, { timeout: 5000 });
  await page.click(markerSelector);
  const dialog = await page.waitForSelector('[data-testid="khung-dich-chuyen"]', { timeout: 3000 });
  const targetX = await dialog.evaluate((el) => parseFloat(el.getAttribute('data-target-x')));
  const targetZ = await dialog.evaluate((el) => parseFloat(el.getAttribute('data-target-z')));
  const targetYaw = await dialog.evaluate((el) => parseFloat(el.getAttribute('data-target-yaw')));

  await page.click('[data-testid="nut-di-toi"]');
  await sleep(650); // Chờ 300ms fade + teleport và requestPointerLock
  await settleVillage(page);

  const pos = await page.evaluate(() => ({
    x: window.__walkPlayer.x,
    z: window.__walkPlayer.z,
    yaw: window.__walkPlayer.yaw,
  }));
  const d = Math.hypot(pos.x - targetX, pos.z - targetZ);
  if (d >= 3) {
    throw new Error(`Dịch chuyển tới ${name} thất bại: cách đích ${d.toFixed(2)} đơn vị (yêu cầu < 3)`);
  }
  return { d, targetX, targetZ, targetYaw, pos };
}

async function run() {
  const srv = await ensureServer();

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const summary = [];

  try {
    // ==========================================
    // 1. Màn hình máy tính 1366x768 (phím, chuột)
    // ==========================================
    console.log('\n--- Kiểm tra 1: Desktop 1366x768 ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768, isMobile: false, hasTouch: false });

    // Mock pointer lock
    await page.evaluateOnNewDocument(() => {
      Element.prototype.requestPointerLock = function () {
        Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true });
        document.dispatchEvent(new Event('pointerlockchange'));
      };
    });

    await page.goto(`${BASE}/cho?q=low&warmup=off`);
    await page.evaluate((cookie) => {
      localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(cookie))}; path=/`;
    }, guestCookie);

    await page.goto(`${BASE}/cho?q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="cho"][data-ready="true"]', { timeout: 60000 });
    await page.waitForSelector('[data-testid="ban-do-nho"]', { timeout: 30000 });
    await page.waitForFunction(() => window.__walkPlayer !== undefined, { timeout: 30000 });
    await sleep(500);

    // Mở bản đồ bằng phím M
    await openBigMap(page, false);
    console.log('✓ Đã mở Bản đồ lớn bằng phím M trên 1366x768');
    summary.push('Mở Bản đồ lớn bằng phím M: ĐẠT');

    // Kiểm tra bấm Hủy và Esc không dịch chuyển
    const initialPos = await page.evaluate(() => ({ x: window.__walkPlayer.x, z: window.__walkPlayer.z }));
    await page.click('[data-testid="teleport-gate:giay"]');
    await page.waitForSelector('[data-testid="khung-dich-chuyen"]', { timeout: 2000 });
    await page.click('[data-testid="nut-huy-dich-chuyen"]');
    await sleep(200);
    const afterCancel = await page.evaluate(() => ({ x: window.__walkPlayer.x, z: window.__walkPlayer.z }));
    if (Math.hypot(afterCancel.x - initialPos.x, afterCancel.z - initialPos.z) > 0.01) {
      throw new Error('Bấm Hủy làm dịch chuyển người chơi!');
    }
    console.log('✓ Bấm Hủy không làm dịch chuyển người chơi');
    summary.push('Bấm Hủy không dịch chuyển: ĐẠT');

    // Thử mở lại và bấm Esc để hủy
    await page.click('[data-testid="teleport-gate:giay"]');
    await page.waitForSelector('[data-testid="khung-dich-chuyen"]', { timeout: 2000 });
    await page.keyboard.press('Escape');
    await sleep(200);
    const afterEsc = await page.evaluate(() => ({ x: window.__walkPlayer.x, z: window.__walkPlayer.z }));
    if (Math.hypot(afterEsc.x - initialPos.x, afterEsc.z - initialPos.z) > 0.01) {
      throw new Error('Bấm Esc làm dịch chuyển người chơi!');
    }
    console.log('✓ Bấm Esc khi khung mở không làm dịch chuyển người chơi');
    summary.push('Bấm Esc không dịch chuyển: ĐẠT');

    // Chụp ảnh khung xác nhận dịch chuyển
    await page.click('[data-testid="teleport-gate:giay"]');
    await page.waitForSelector('[data-testid="khung-dich-chuyen"]', { timeout: 2000 });
    await takeShot(page, '01-khung-xac-nhan-1366');

    // 1. Dịch chuyển tới Cổng Làng Giấy
    const resGiay = await doTeleportAndVerify(page, '[data-testid="teleport-gate:giay"]', 'Cổng Làng Giấy');
    console.log(`✓ Dịch chuyển tới Cổng Làng Giấy thành công (cách đích: ${resGiay.d.toFixed(2)} < 3)`);
    summary.push(`Dịch chuyển Cổng Làng Giấy (cách ${resGiay.d.toFixed(2)}): ĐẠT`);
    await takeShot(page, '02-dich-chuyen-cong-giay-1366');

    // Kiểm tra sau dịch chuyển vẫn đi lại được
    const beforeWalk = await page.evaluate(() => ({ x: window.__walkPlayer.x, z: window.__walkPlayer.z }));
    await page.keyboard.down('KeyW');
    await sleep(400);
    await page.keyboard.up('KeyW');
    const posAfterWalk = await page.evaluate(() => ({ x: window.__walkPlayer.x, z: window.__walkPlayer.z }));
    const walkDist = Math.hypot(posAfterWalk.x - beforeWalk.x, posAfterWalk.z - beforeWalk.z);
    if (walkDist < 0.3) throw new Error('Sau dịch chuyển không đi lại được!');
    console.log(`✓ Sau dịch chuyển người chơi đi lại bình thường (di chuyển được: ${walkDist.toFixed(2)} đơn vị)`);
    summary.push('Sau dịch chuyển vẫn đi lại được: ĐẠT');

    // 2. Dịch chuyển tới Tâm chợ
    await openBigMap(page, false);
    const resMarket = await doTeleportAndVerify(page, '[data-testid="teleport-market"]', 'Tâm chợ');
    console.log(`✓ Dịch chuyển tới Tâm chợ thành công (cách đích: ${resMarket.d.toFixed(2)} < 3)`);
    summary.push(`Dịch chuyển Tâm chợ (cách ${resMarket.d.toFixed(2)}): ĐẠT`);
    await takeShot(page, '03-dich-chuyen-tam-cho-1366');

    // 3. Dịch chuyển tới 3 cổng làng còn lại
    const otherGates = [
      { id: 'gate:det', name: 'Cổng Làng Dệt' },
      { id: 'gate:khac-dau', name: 'Cổng Làng Khắc Dấu' },
      { id: 'gate:bac', name: 'Cổng Làng Bạc' },
    ];
    for (const g of otherGates) {
      await openBigMap(page, false);
      const res = await doTeleportAndVerify(page, `[data-testid="teleport-${g.id}"]`, g.name);
      console.log(`✓ Dịch chuyển tới ${g.name} thành công (cách: ${res.d.toFixed(2)} < 3)`);
      summary.push(`Dịch chuyển ${g.name} (cách ${res.d.toFixed(2)}): ĐẠT`);
    }
    await takeShot(page, '04-dich-chuyen-cong-bac-1366');

    // 4. Dịch chuyển tới 1 biển ở mỗi làng
    const boards = [
      { village: 'lang-giay', level: 1, name: 'Biển Màn 1 Làng Giấy' },
      { village: 'lang-det', level: 4, name: 'Biển Màn 4 Làng Dệt' },
      { village: 'lang-khac-dau', level: 7, name: 'Biển Màn 7 Làng Khắc Dấu' },
      { village: 'lang-bac', level: 10, name: 'Biển Màn 10 Làng Bạc' },
    ];
    for (const b of boards) {
      await openBigMap(page, false);
      const res = await doTeleportAndVerify(page, `[data-testid="teleport-board:${b.village}:${b.level}"]`, b.name);
      console.log(`✓ Dịch chuyển tới ${b.name} thành công (cách: ${res.d.toFixed(2)} < 3)`);
      summary.push(`Dịch chuyển ${b.name} (cách ${res.d.toFixed(2)}): ĐẠT`);
    }
    await takeShot(page, '05-dich-chuyen-bien-man10-1366');

    // 5. Dịch chuyển tới 1 thẻ Em có biết
    await openBigMap(page, false);
    const resScroll = await doTeleportAndVerify(page, '[data-testid="teleport-scroll:lang-giay:0"]', 'Thẻ 1 Làng Giấy');
    console.log(`✓ Dịch chuyển tới Thẻ Em có biết thành công (cách đích: ${resScroll.d.toFixed(2)} < 3)`);
    summary.push(`Dịch chuyển Thẻ Em có biết (cách đích ${resScroll.d.toFixed(2)}): ĐẠT`);
    await takeShot(page, '06-dich-chuyen-the-giay0-1366');

    await page.close();

    // ==========================================
    // 2. Màn hình điện thoại 360x800 (chạm cảm ứng)
    // ==========================================
    console.log('\n--- Kiểm tra 2: Mobile 360x800 ---');
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });

    await mobilePage.goto(`${BASE}/cho?q=low&warmup=off`);
    await mobilePage.evaluate((cookie) => {
      localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(cookie))}; path=/`;
    }, guestCookie);

    await mobilePage.goto(`${BASE}/cho?q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForSelector('[data-testid="cho"][data-ready="true"]', { timeout: 60000 });
    await mobilePage.waitForSelector('[data-testid="ban-do-nho"]', { timeout: 30000 });
    await mobilePage.waitForFunction(() => window.__walkPlayer !== undefined, { timeout: 30000 });
    await sleep(500);

    // Mở bản đồ bằng cách chạm vào Bản đồ nhỏ
    await openBigMap(mobilePage, true);
    console.log('✓ Đã mở Bản đồ lớn bằng chạm Bản đồ nhỏ trên 360x800');
    summary.push('Mở Bản đồ lớn bằng chạm Bản đồ nhỏ (360x800): ĐẠT');

    // Chạm chọn điểm Tâm chợ
    const marketBtn = await mobilePage.waitForSelector('[data-testid="teleport-market"]', { timeout: 3000 });
    await marketBtn.tap();
    await mobilePage.waitForSelector('[data-testid="khung-dich-chuyen"]', { timeout: 2000 });
    await takeShot(mobilePage, '07-khung-xac-nhan-360');

    // Chạm nút "Đi tới"
    const diToiBtn = await mobilePage.waitForSelector('[data-testid="nut-di-toi"]', { timeout: 2000 });
    await diToiBtn.tap();
    await sleep(650);

    const posMobileMarket = await mobilePage.evaluate(() => ({ x: window.__walkPlayer.x, z: window.__walkPlayer.z }));
    const distMobileMarket = Math.hypot(posMobileMarket.x - 0, posMobileMarket.z - (-12.5));
    if (distMobileMarket >= 3) throw new Error(`Vị trí Tâm chợ trên mobile cách ${distMobileMarket.toFixed(2)} đơn vị`);
    console.log(`✓ Dịch chuyển tới Tâm chợ trên mobile thành công (cách đích: ${distMobileMarket.toFixed(2)} < 3)`);
    summary.push(`Dịch chuyển Tâm chợ mobile (cách ${distMobileMarket.toFixed(2)}): ĐẠT`);
    await takeShot(mobilePage, '08-dich-chuyen-tam-cho-360');

    await mobilePage.close();

    console.log('\n==========================================');
    console.log('TỔNG HỢP KIỂM TRA BẢN ĐỒ DỊCH CHUYỂN:');
    summary.forEach((item) => console.log(` - ${item}`));
    console.log('TẤT CẢ KIỂM TRA HOÀN TẤT THÀNH CÔNG!');
    console.log('==========================================\n');

  } finally {
    await browser.close();
    if (srv) {
      srv.kill();
    }
  }
}

run().catch((err) => {
  console.error('\n❌ Lỗi kiểm tra:', err);
  process.exit(1);
});
