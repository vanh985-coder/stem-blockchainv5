import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p7-tutorial';
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const chromePath = CHROME_PATHS.find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function passIntro(page) {
  for (let i = 0; i < 15; i++) {
    const skipped = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Bỏ qua');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (skipped) break;
    await sleep(150);
  }
  await sleep(400);

  for (let i = 0; i < 20; i++) {
    const started = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Bắt đầu');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (started) break;
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

  const viewports = [
    { name: '1366x768', w: 1366, h: 768, isMobile: false, hasTouch: false },
    { name: '360x800', w: 360, h: 800, isMobile: true, hasTouch: true },
    { name: '844x390', w: 844, h: 390, isMobile: true, hasTouch: true },
  ];

  for (const vp of viewports) {
    console.log(`\n================= KIỂM TRA MÀN 7 TẠI ${vp.name} =================`);

    // =========================================================================
    // 1. TRẠM DỄ: KÝ & XÁC MINH CHỮ KÝ SỐ
    // =========================================================================
    {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookieDe = {
        v: 1,
        lv: { '1': [1, 1, 3, 0, 100], '2': [1, 1, 3, 0, 100], '3': [1, 1, 3, 0, 100], '4': [1, 1, 3, 0, 100], '5': [1, 1, 3, 0, 100], '6': [1, 1, 3, 0, 100] },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 1,
        kc: [0, 0, 0, 0],
      };

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieDe)),
        domain: 'localhost',
        path: '/',
      });

      await page.goto(`${BASE_URL}/lang/lang-khac-dau/man/7`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Dễ - ${vp.name}] TutorialSpotlight đã mở thành công`);

      const titleStep0 = await page.$eval('[data-testid="tutorial-tooltip"]', (el) => el.innerText.toLowerCase());
      const hasStep0Title = titleStep0.includes('ký và xác minh');
      results.push({ name: `[Dễ - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });

      await page.screenshot({ path: `${OUT}/man7-de-${vp.name}-step0.png` });

      // Tiến qua các bước
      await page.evaluate(() => window.__tutorial?.next());
      await sleep(300);

      await page.evaluate(() => window.__tutorial?.next());
      await sleep(300);

      // Bước ký: Bấm Ký
      await page.evaluate(() => {
        const btn = document.querySelector('#tutorial-man7de-sign-btn button');
        if (btn) btn.click();
      });
      await sleep(600);

      // Bấm nút "Thả vào máy xác minh"
      await page.evaluate(() => {
        const btn = document.querySelector('#tutorial-man7de-verify-btn button');
        if (btn) btn.click();
      });
      // Chờ quét danh bạ
      await sleep(1500);

      await page.screenshot({ path: `${OUT}/man7-de-${vp.name}-verified.png` });

      const isVerified = await page.evaluate(() => {
        const result = document.querySelector('#tutorial-man7de-machine-result');
        return Boolean(result && result.textContent.includes('Chữ ký chính chủ'));
      });
      results.push({ name: `[Dễ - ${vp.name}] Xác minh máy thành công`, pass: isVerified });

      // Bấm "Bắt đầu chơi thật"
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        const btn = buttons.find((b) => b.textContent.includes('Bắt đầu chơi thật'));
        if (btn) btn.click();
      });
      await sleep(500);

      const isRealGame = await page.evaluate(() => window.__tutorial?.isActive === false);
      results.push({ name: `[Dễ - ${vp.name}] Bắt đầu chơi thật đóng tutorial`, pass: isRealGame });

      // Bấm nút "💡 Hướng dẫn" để mở lại
      await page.evaluate(() => {
        const btn = document.querySelector('button[aria-label="Hướng dẫn"]');
        if (btn) btn.click();
      });
      await sleep(400);

      const isReopened = await page.evaluate(() => window.__tutorial?.isActive === true);
      results.push({ name: `[Dễ - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened });

      await context.close();
    }

    // =========================================================================
    // 2. TRẠM TRUNG BÌNH: THẨM ĐỊNH DANH BẠ
    // =========================================================================
    {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookieTb = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 0, 100], '2': [1, 1, 3, 0, 100], '3': [1, 1, 3, 0, 100],
          '4': [1, 1, 3, 0, 100], '5': [1, 1, 3, 0, 100], '6': [1, 1, 3, 0, 100],
          '7': [1, 0, 3, 0, 0],
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 1,
        kc: [0, 0, 0, 0],
      };

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieTb)),
        domain: 'localhost',
        path: '/',
      });

      await page.goto(`${BASE_URL}/lang/lang-khac-dau/man/7`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[TB - ${vp.name}] TutorialSpotlight đã mở`);

      const titleTb = await page.$eval('[data-testid="tutorial-tooltip"]', (el) => el.innerText.toLowerCase());
      const hasStep0Tb = titleTb.includes('thẩm định giao dịch');
      results.push({ name: `[TB - ${vp.name}] Bước 0 intro`, pass: hasStep0Tb });

      await page.screenshot({ path: `${OUT}/man7-tb-${vp.name}-step0.png` });

      // Chuyển qua các bước
      await page.evaluate(() => window.__tutorial?.next());
      await sleep(300);

      // Thao tác chọn 1 dòng trong danh bạ và chọn 1 thẻ
      await page.evaluate(() => {
        const row = document.querySelector('#tutorial-man7tb-danhba [role="button"], #tutorial-man7tb-danhba table tr[class*="cursor-pointer"]');
        if (row) row.click();
        const card = document.querySelector('#tutorial-man7tb-first-tx');
        if (card) card.click();
      });
      await sleep(500);

      // Bấm nút Kiểm tra chữ ký
      await page.evaluate(() => {
        const btn = document.querySelector('#tutorial-man7tb-verify-btn button');
        if (btn && !btn.disabled) btn.click();
      });
      await sleep(1000);

      await page.screenshot({ path: `${OUT}/man7-tb-${vp.name}-verified.png` });

      // Đóng tutorial bắt đầu chơi thật
      await page.evaluate(() => window.__tutorial?.skip());
      await sleep(400);

      const isRealTb = await page.evaluate(() => window.__tutorial?.isActive === false);
      results.push({ name: `[TB - ${vp.name}] Bắt đầu chơi thật`, pass: isRealTb });

      await context.close();
    }

    // =========================================================================
    // 3. TRẠM KHÓ: DÒ KHÓA RIÊNG (HÀM MỘT CHIỀU)
    // =========================================================================
    {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookieKho = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 0, 100], '2': [1, 1, 3, 0, 100], '3': [1, 1, 3, 0, 100],
          '4': [1, 1, 3, 0, 100], '5': [1, 1, 3, 0, 100], '6': [1, 1, 3, 0, 100],
          '7': [1, 0, 3, 3, 0],
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 1,
        kc: [0, 0, 0, 0],
      };

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieKho)),
        domain: 'localhost',
        path: '/',
      });

      await page.goto(`${BASE_URL}/lang/lang-khac-dau/man/7`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Khó - ${vp.name}] TutorialSpotlight đã mở`);

      const titleKho = await page.$eval('[data-testid="tutorial-tooltip"]', (el) => el.innerText.toLowerCase());
      const hasStep0Kho = titleKho.includes('dò tìm khóa riêng');
      results.push({ name: `[Khó - ${vp.name}] Bước 0 intro`, pass: hasStep0Kho });

      await page.screenshot({ path: `${OUT}/man7-kho-${vp.name}-step0.png` });

      // Nhập x = 2 thử nghiệm bằng React prototype setter
      await page.evaluate(() => {
        const input = document.querySelector('#tutorial-man7kho-input-box input');
        if (input) {
          const proto = window.HTMLInputElement.prototype;
          const setVal = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setVal) setVal.call(input, '2');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const btn = document.querySelector('#tutorial-man7kho-try-btn button');
        if (btn) btn.click();
      });
      await sleep(500);

      const hasHistory = await page.evaluate(() => {
        const hist = document.querySelector('#tutorial-man7kho-history');
        return Boolean(hist && hist.textContent.includes('mod 23'));
      });
      results.push({ name: `[Khó - ${vp.name}] Ghi nhận lịch sử thử x=2`, pass: hasHistory });

      // Nhập x = 7
      await page.evaluate(() => {
        const input = document.querySelector('#tutorial-man7kho-input-box input');
        if (input) {
          const proto = window.HTMLInputElement.prototype;
          const setVal = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
          if (setVal) setVal.call(input, '7');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const btn = document.querySelector('#tutorial-man7kho-try-btn button');
        if (btn) btn.click();
      });
      await sleep(600);

      await page.screenshot({ path: `${OUT}/man7-kho-${vp.name}-found.png` });

      const isFound = await page.evaluate(() => {
        return Boolean(document.body.innerText.includes('Đã tìm ra khóa riêng') || document.body.innerText.includes('đã tìm thấy khóa riêng'));
      });
      results.push({ name: `[Khó - ${vp.name}] Tìm ra x = 7 chính xác`, pass: isFound });

      // Bấm "Bắt đầu chơi thật"
      await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        const btn = buttons.find((b) => b.textContent.includes('Bắt đầu chơi thật'));
        if (btn) btn.click();
      });
      await sleep(400);

      const isRealKho = await page.evaluate(() => window.__tutorial?.isActive === false);
      results.push({ name: `[Khó - ${vp.name}] Bắt đầu chơi thật`, pass: isRealKho });

      await context.close();
    }
  }

  await browser.close();

  console.log('\n================= TỔNG HỢP KẾT QUẢ KIỂM TRA MÀN 7 =================');
  let passCount = 0;
  for (const r of results) {
    console.log(`${r.pass ? '✅' : '❌'} ${r.name}`);
    if (r.pass) passCount++;
  }
  console.log(`\nTổng: ${passCount}/${results.length} tests đạt.`);
  writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));

  if (passCount < results.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Lỗi khi chạy script:', err);
  process.exit(1);
});
