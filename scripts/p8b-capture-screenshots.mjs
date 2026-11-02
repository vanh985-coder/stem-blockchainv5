import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:5193';
const OUT_DIR = 'docs/screenshots/p8b';
const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\1e39ed0d-2120-4c6a-a44c-3cf2d34b3087';

mkdirSync(OUT_DIR, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const chromePath = CHROME_PATHS.find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function passIntro(page) {
  for (let i = 0; i < 25; i++) {
    const skipped = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Bỏ qua');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (skipped) break;
    await sleep(200);
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

async function capture(page, filename) {
  const filePath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filePath });
  try {
    copyFileSync(filePath, path.join(ARTIFACT_DIR, filename));
  } catch (e) {
    console.error('Failed to copy to artifact dir:', e);
  }
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const guestCookieTB = {
    v: 1,
    lv: { '1': [1, 0, 3, 0, 0] },
    gp: 0,
    c: 10,
    u: Date.now(),
    st: 1,
    kc: [0, 0, 0, 0],
  };

  const guestCookieKho = {
    v: 1,
    lv: { '1': [1, 0, 3, 3, 0] },
    gp: 0,
    c: 20,
    u: Date.now(),
    st: 1,
    kc: [0, 0, 0, 0],
  };

  // 1. Chụp ảnh Màn 1 Trung bình tại 1366x768
  {
    console.log('\n--- Chụp Màn 1 Trung bình 1366x768 ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookieTB)),
      url: BASE_URL,
    });
    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // Bước 0: Giới thiệu
    await capture(page, 'p8b-tb-1366-step0-intro.png');

    // Chuyển sang Bước 1: Quan sát trang bị sửa
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Tiếp')
      );
      btn?.click();
    });
    await sleep(400);
    await capture(page, 'p8b-tb-1366-step1-inspect.png');

    // Chuyển sang Bước 2: Công thức tính lại
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Đã hiểu')
      );
      btn?.click();
    });
    await sleep(400);
    await capture(page, 'p8b-tb-1366-step2-formula.png');

    // Chuyển sang Bước 3: Ô nhập
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Thử tính ngay')
      );
      btn?.click();
    });
    await sleep(400);
    await capture(page, 'p8b-tb-1366-step3-input.png');

    // Nhập sai 15
    await page.click('[data-tutorial="code-input"] input');
    await page.keyboard.type('15');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(500);
    await capture(page, 'p8b-tb-1366-wrong-15.png');

    // Bấm Thử lại
    await page.evaluate(() => {
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      const btn = [...(tt?.querySelectorAll('button') || [])].find((b) => (b.textContent || '').includes('Thử lại'));
      btn?.click();
    });
    await sleep(400);

    // Sửa thành 67
    await page.focus('[data-tutorial="code-input"] input');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('67');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(500);
    await capture(page, 'p8b-tb-1366-correct-67.png');

    // Bắt đầu chơi thật
    await page.evaluate(() => {
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
        (b.textContent || '').includes('Bắt đầu chơi thật')
      );
      btn?.click();
    });
    await sleep(500);
    await capture(page, 'p8b-tb-1366-real-game.png');

    await page.close();
  }

  // 2. Chụp ảnh Màn 1 Khó tại 1366x768
  {
    console.log('\n--- Chụp Màn 1 Khó 1366x768 ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookieKho)),
      url: BASE_URL,
    });
    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // Bước 0: Giới thiệu (đồng hồ dừng 60s)
    await capture(page, 'p8b-kho-1366-step0-intro.png');

    // Chuyển sang Bước 1: Quan sát chỗ sai đầu tiên
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Tiếp')
      );
      btn?.click();
    });
    await sleep(400);
    await capture(page, 'p8b-kho-1366-step1-inspect.png');

    // Chuyển sang Bước 2: Công thức tính lại
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Đã hiểu')
      );
      btn?.click();
    });
    await sleep(400);
    await capture(page, 'p8b-kho-1366-step2-formula.png');

    // Chuyển sang Bước 3: Ô nhập
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Thử tính ngay')
      );
      btn?.click();
    });
    await sleep(400);
    await capture(page, 'p8b-kho-1366-step3-input.png');

    // Nhập sai 20
    await page.click('[data-tutorial="code-input"] input');
    await page.keyboard.type('20');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(500);
    await capture(page, 'p8b-kho-1366-wrong-20.png');

    // Bấm Thử lại
    await page.evaluate(() => {
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      const btn = [...(tt?.querySelectorAll('button') || [])].find((b) => (b.textContent || '').includes('Thử lại'));
      btn?.click();
    });
    await sleep(400);

    // Sửa thành 55
    await page.focus('[data-tutorial="code-input"] input');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('55');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(500);
    await capture(page, 'p8b-kho-1366-correct-55.png');

    // Bắt đầu chơi thật (đồng hồ chạy)
    await page.evaluate(() => {
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
        (b.textContent || '').includes('Bắt đầu chơi thật')
      );
      btn?.click();
    });
    await sleep(600);
    await capture(page, 'p8b-kho-1366-real-game.png');

    await page.close();
  }

  // 3. Chụp ảnh Mobile 360x800 (Trung bình và Khó)
  {
    console.log('\n--- Chụp Mobile 360x800 ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookieTB)),
      url: BASE_URL,
    });
    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    await capture(page, 'p8b-tb-360-step0.png');

    // Chuyển tới bước 3
    for (let s = 0; s < 3; s++) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find(
          (b) =>
            (b.textContent || '').includes('Tiếp') ||
            (b.textContent || '').includes('Đã hiểu') ||
            (b.textContent || '').includes('Thử tính ngay')
        );
        btn?.click();
      });
      await sleep(350);
    }
    await page.click('[data-tutorial="code-input"] input');
    await page.keyboard.type('67');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(500);
    await capture(page, 'p8b-tb-360-correct.png');

    await page.close();
  }

  // 4. Chụp ảnh Landscape 844x390 (Trung bình và Khó)
  {
    console.log('\n--- Chụp Landscape 844x390 ---');
    const page = await browser.newPage();
    await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookieKho)),
      url: BASE_URL,
    });
    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    await capture(page, 'p8b-kho-844-step0.png');

    // Chuyển tới bước 3
    for (let s = 0; s < 3; s++) {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find(
          (b) =>
            (b.textContent || '').includes('Tiếp') ||
            (b.textContent || '').includes('Đã hiểu') ||
            (b.textContent || '').includes('Thử tính ngay')
        );
        btn?.click();
      });
      await sleep(350);
    }
    await page.click('[data-tutorial="code-input"] input');
    await page.keyboard.type('55');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(500);
    await capture(page, 'p8b-kho-844-correct.png');

    await page.close();
  }

  await browser.close();
  console.log('\nHoàn thành chụp toàn bộ ảnh minh chứng P8b!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
