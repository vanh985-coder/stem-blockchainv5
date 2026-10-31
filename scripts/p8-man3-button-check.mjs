import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/man3-buttons';
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const chromePath = CHROME_PATHS.find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function passStartCard(page) {
  for (let i = 0; i < 25; i++) {
    const started = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => {
        const txt = (b.textContent || '').trim().toLowerCase();
        return txt.includes('bắt đầu');
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (started) break;
    await sleep(200);
  }
  await sleep(800);
}

async function skipTutorial(page) {
  for (let i = 0; i < 15; i++) {
    const clicked = await page.evaluate(() => {
      const skipBtn = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent || '').includes('Bỏ qua')
      );
      if (skipBtn) {
        skipBtn.click();
        return true;
      }
      return false;
    });
    if (clicked) break;
    await sleep(200);
  }
  await sleep(600);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  try {
    // -------------------------------------------------------------
    // Test 1: Desktop 1366x768
    // -------------------------------------------------------------
    console.log('\n=== Kiểm tra 1366x768 (Desktop) ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 768, isMobile: false, hasTouch: false });

      const guestCookie = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 3, 3],
          '2': [1, 300, 3, 3],
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 1,
        kc: [15, 15, 15, 15],
      };
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/3?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, quality: 'low' }));
      });

      await passStartCard(page);

      // Đợi game load
      await page.waitForSelector('[data-testid="nut-goi-y"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="nut-soi"]', { timeout: 10000 });

      // Nếu có tutorial, kiểm tra bước soi trước khi pass tutorial
      const hasTutorial = await page.evaluate(() => Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')));
      if (hasTutorial) {
        console.log('Phát hiện tutorial Màn 3, tiến tới bước Soi công thức...');
        for (let i = 0; i < 4; i++) {
          await page.evaluate(() => {
            const nextBtn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => {
              const txt = (b.textContent || '').trim().toLowerCase();
              return txt.includes('đã hiểu') || txt.includes('tiếp');
            });
            if (nextBtn) nextBtn.click();
          });
          await sleep(350);
        }
        await sleep(500);

        // Kiểm tra target của tutorial không đè lên nut-goi-y
        const tutCheck = await page.evaluate(() => {
          const soi = document.querySelector('#tutorial-man3-soi')?.getBoundingClientRect();
          const hint = document.querySelector('[data-testid="nut-goi-y"]')?.getBoundingClientRect();
          if (!soi || !hint) return { ok: false, soi: Boolean(soi), hint: Boolean(hint) };
          const overlap = !(soi.right <= hint.left || soi.left >= hint.right || soi.bottom <= hint.top || soi.top >= hint.bottom);
          return { ok: !overlap, soiRight: soi.right, hintLeft: hint.left, gap: hint.left - soi.right };
        });
        results.push({ name: '[1366x768] Tutorial Spotlight soi không đè nút ?', pass: tutCheck.ok, detail: tutCheck });
        await page.screenshot({ path: `${OUT}/1366x768-tutorial-soi.png` });

        // Thực hiện thao tác làm thử ghép thẻ để hoàn thành tutorial
        await page.evaluate(() => {
          const nextBtn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => (b.textContent || '').includes('Thử tính ngay'));
          if (nextBtn) nextBtn.click();
        });
        await sleep(400);

        // Bấm nút Ghép thử vào chuỗi
        await page.evaluate(() => {
          const ghepBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Ghép thử vào chuỗi'));
          if (ghepBtn) ghepBtn.click();
        });
        await sleep(400);

        // Bấm Bắt đầu chơi thật
        await page.evaluate(() => {
          const playBtn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => (b.textContent || '').includes('Bắt đầu chơi thật'));
          if (playBtn) playBtn.click();
        });
        await sleep(600);
      }

      // Đảm bảo tutorial đã tắt hoàn toàn
      const tutActive = await page.evaluate(() => Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')));
      if (tutActive) {
        await skipTutorial(page);
      }

      // Đo tọa độ nút Soi và nút Gợi ý (?)
      const coords = await page.evaluate(() => {
        const hint = document.querySelector('[data-testid="nut-goi-y"]')?.getBoundingClientRect();
        const soi = document.querySelector('[data-testid="nut-soi"]')?.getBoundingClientRect();
        const hud = document.querySelector('[data-testid="hud"]')?.getBoundingClientRect();

        return {
          hint: hint ? { x: hint.x, y: hint.y, w: hint.width, h: hint.height, right: hint.right, left: hint.left } : null,
          soi: soi ? { x: soi.x, y: soi.y, w: soi.width, h: soi.height, right: soi.right, left: soi.left } : null,
          hud: hud ? { x: hud.x, y: hud.y, w: hud.width, h: hud.height, right: hud.right, left: hud.left } : null,
        };
      });

      console.log('Tọa độ 1366x768:', coords);

      results.push({ name: '[1366x768] Nút ? và Nút Soi đều hiện diện', pass: Boolean(coords.hint && coords.soi) });

      const sizeOk = coords.hint && coords.soi && coords.hint.w >= 44 && coords.hint.h >= 44 && coords.soi.w >= 44 && coords.soi.h >= 44;
      results.push({ name: '[1366x768] Kích thước nút đạt tối thiểu 44x44 px', pass: sizeOk, detail: coords.hint && coords.soi ? { hint: [coords.hint.w, coords.hint.h], soi: [coords.soi.w, coords.soi.h] } : null });

      const gap = coords.hint && coords.soi ? coords.hint.left - coords.soi.right : -1;
      const noOverlap = coords.hint && coords.soi && coords.soi.right < coords.hint.left && gap >= 16;
      results.push({ name: '[1366x768] Hai nút tách biệt rõ ràng (gap >= 16px)', pass: noOverlap, detail: { gap, soiRight: coords.soi?.right, hintLeft: coords.hint?.left } });

      await page.screenshot({ path: `${OUT}/1366x768-gameplay.png` });

      // Bấm nút "Soi công thức" mở panel soi, không mở hộp ?
      await page.click('[data-testid="nut-soi"]');
      await sleep(400);
      const soiOpened = await page.evaluate(() => {
        const soiPanel = Boolean(document.querySelector('[data-testid="soi-cong-thuc"]'));
        const hintModal = Boolean(document.querySelector('[data-testid="hop-goi-y"]'));
        return { soiPanel, hintModal };
      });
      results.push({ name: '[1366x768] Bấm Soi công thức mở panel Soi và không mở hộp ?', pass: soiOpened.soiPanel && !soiOpened.hintModal });
      await page.screenshot({ path: `${OUT}/1366x768-soi-open.png` });

      // Bấm nút Soi lần nữa để đóng
      await page.click('[data-testid="nut-soi"]');
      await sleep(400);
      const soiClosed = await page.evaluate(() => !document.querySelector('[data-testid="soi-cong-thuc"]'));
      results.push({ name: '[1366x768] Bấm Soi công thức lần 2 đóng panel Soi', pass: soiClosed });

      // Bấm nút "?" mở hộp gợi ý, tạm dừng game
      await page.click('[data-testid="nut-goi-y"]');
      await sleep(400);
      const hintOpened = await page.evaluate(() => {
        const hintModal = Boolean(document.querySelector('[data-testid="hop-goi-y"]'));
        const soiPanel = Boolean(document.querySelector('[data-testid="soi-cong-thuc"]'));
        return { hintModal, soiPanel };
      });
      results.push({ name: '[1366x768] Bấm nút ? mở hộp gợi ý và không mở panel Soi', pass: hintOpened.hintModal && !hintOpened.soiPanel });
      await page.screenshot({ path: `${OUT}/1366x768-hint-open.png` });

      // Đóng hộp gợi ý bằng nút "Chơi tiếp"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="hop-goi-y"] button')].find((b) => (b.textContent || '').includes('Chơi tiếp') || (b.textContent || '').includes('Tiếp tục'));
        if (btn) btn.click();
      });
      await sleep(400);
      const hintClosed = await page.evaluate(() => !document.querySelector('[data-testid="hop-goi-y"]'));
      results.push({ name: '[1366x768] Đóng hộp gợi ý thành công', pass: hintClosed });

      await page.close();
    }

    // -------------------------------------------------------------
    // Test 2: Mobile Landscape 844x390
    // -------------------------------------------------------------
    console.log('\n=== Kiểm tra 844x390 (Mobile Landscape) ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });

      const guestCookie = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 3, 3],
          '2': [1, 300, 3, 3],
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 1,
        kc: [15, 15, 15, 15],
      };
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/3?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, quality: 'low' }));
      });

      await passStartCard(page);

      await page.waitForSelector('[data-testid="nut-goi-y"]', { timeout: 10000 });
      await page.waitForSelector('[data-testid="nut-soi"]', { timeout: 10000 });

      // Đợi warmup 2.5D hoàn tất (overlay chuyển pointer-events: auto)
      await page.waitForFunction(() => {
        const overlay = document.querySelector('.scene25d-overlay');
        return overlay && getComputedStyle(overlay).pointerEvents === 'auto';
      }, { timeout: 10000 });

      // Bỏ qua tutorial nếu có để vào thẳng ván thật
      await skipTutorial(page);

      const coords = await page.evaluate(() => {
        const hint = document.querySelector('[data-testid="nut-goi-y"]')?.getBoundingClientRect();
        const soi = document.querySelector('[data-testid="nut-soi"]')?.getBoundingClientRect();
        return {
          hint: hint ? { x: hint.x, y: hint.y, w: hint.width, h: hint.height, right: hint.right, left: hint.left } : null,
          soi: soi ? { x: soi.x, y: soi.y, w: soi.width, h: soi.height, right: soi.right, left: soi.left } : null,
        };
      });

      console.log('Tọa độ 844x390:', coords);
      results.push({ name: '[844x390] Nút ? và Nút Soi đều hiện diện', pass: Boolean(coords.hint && coords.soi) });

      const sizeOk = coords.hint && coords.soi && coords.hint.w >= 44 && coords.hint.h >= 44 && coords.soi.w >= 44 && coords.soi.h >= 44;
      results.push({ name: '[844x390] Kích thước nút đạt tối thiểu 44x44 px', pass: sizeOk, detail: coords.hint && coords.soi ? { hint: [coords.hint.w, coords.hint.h], soi: [coords.soi.w, coords.soi.h] } : null });

      const gap = coords.hint && coords.soi ? coords.hint.left - coords.soi.right : -1;
      const noOverlap = coords.hint && coords.soi && coords.soi.right < coords.hint.left && gap >= 16;
      results.push({ name: '[844x390] Hai nút tách biệt rõ ràng (gap >= 16px)', pass: noOverlap, detail: { gap, soiRight: coords.soi?.right, hintLeft: coords.hint?.left } });

      await page.screenshot({ path: `${OUT}/844x390-gameplay.png` });

      // Chạm thử nút Soi
      await page.tap('[data-testid="nut-soi"]');
      await sleep(400);
      const debugState = await page.evaluate(() => {
        return {
          hasTutorial: Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')),
          hasSoiPanel: Boolean(document.querySelector('[data-testid="soi-cong-thuc"]')),
          nutSoiPressed: document.querySelector('[data-testid="nut-soi"]')?.getAttribute('aria-pressed'),
          rebuildPhase: window.__rebuild?.phase,
        };
      });
      console.log('debugState 844x390:', debugState);

      const soiOpened = Boolean(debugState.hasSoiPanel);
      results.push({ name: '[844x390] Chạm Soi công thức mở panel Soi', pass: soiOpened });
      await page.screenshot({ path: `${OUT}/844x390-soi-open.png` });

      await page.tap('[data-testid="nut-soi"]');
      await sleep(400);

      // Chạm thử nút ?
      await page.tap('[data-testid="nut-goi-y"]');
      await sleep(400);
      const hintOpened = await page.evaluate(() => Boolean(document.querySelector('[data-testid="hop-goi-y"]')));
      results.push({ name: '[844x390] Chạm nút ? mở hộp gợi ý', pass: hintOpened });
      await page.screenshot({ path: `${OUT}/844x390-hint-open.png` });

      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="hop-goi-y"] button')].find((b) => (b.textContent || '').includes('Chơi tiếp') || (b.textContent || '').includes('Tiếp tục'));
        if (btn) btn.click();
      });
      await sleep(400);

      await page.close();
    }

    // -------------------------------------------------------------
    // Test 3: Mobile Portrait 360x800
    // -------------------------------------------------------------
    console.log('\n=== Kiểm tra 360x800 (Mobile Portrait) ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });

      const guestCookie = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 3, 3],
          '2': [1, 300, 3, 3],
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 1,
        kc: [15, 15, 15, 15],
      };
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/3?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await page.evaluate(() => {
        localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, quality: 'low' }));
      });

      await passStartCard(page);

      // Màn hình dọc phải hiện nhắc "Xoay ngang để chơi"
      await page.waitForSelector('[data-testid="scene25d"]', { timeout: 10000 });
      const promptInfo = await page.evaluate(() => {
        const prompt = document.querySelector('[data-testid="rotate-prompt"]') || document.body.innerText.includes('Xoay ngang');
        const hintBtn = document.querySelector('[data-testid="nut-goi-y"]')?.getBoundingClientRect();
        return {
          hasPrompt: Boolean(prompt),
          hintBtn: hintBtn ? { w: hintBtn.width, h: hintBtn.height } : null,
        };
      });

      results.push({ name: '[360x800] Màn hình dọc hiện thông báo nhắc xoay ngang', pass: promptInfo.hasPrompt });
      results.push({ name: '[360x800] Nút ? vẫn có kích thước tối thiểu >= 44x44 px', pass: Boolean(promptInfo.hintBtn && promptInfo.hintBtn.w >= 44 && promptInfo.hintBtn.h >= 44) });
      await page.screenshot({ path: `${OUT}/360x800-portrait.png` });

      // Xoay sang ngang 800x360 để xác nhận xoay lại thì chơi được
      await page.setViewport({ width: 800, height: 360, isMobile: true, hasTouch: true });
      await sleep(600);

      const rotatedInfo = await page.evaluate(() => {
        const prompt = document.querySelector('[data-testid="rotate-prompt"]');
        const nutSoi = document.querySelector('[data-testid="nut-soi"]');
        return { promptVisible: Boolean(prompt), nutSoiVisible: Boolean(nutSoi) };
      });
      results.push({ name: '[360x800 -> 800x360] Xoay ngang nhắc nhở biến mất và nút Soi xuất hiện', pass: !rotatedInfo.promptVisible && rotatedInfo.nutSoiVisible });
      await page.screenshot({ path: `${OUT}/800x360-resumed.png` });

      await page.close();
    }
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('KẾT QUẢ KIỂM TRA MÀN 3 NÚT ? VÀ NÚT SOI');
  console.log('========================================');
  let allPass = true;
  for (const r of results) {
    const icon = r.pass ? '✓ ĐẠT' : '✗ LỖI';
    console.log(`${icon} | ${r.name} ${r.detail ? JSON.stringify(r.detail) : ''}`);
    if (!r.pass) allPass = false;
  }
  console.log(`\nTổng: ${results.filter((r) => r.pass).length}/${results.length} assertions đạt.`);

  if (!allPass) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
