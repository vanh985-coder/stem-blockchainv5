import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p8c';
const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\1e39ed0d-2120-4c6a-a44c-3cf2d34b3087';
mkdirSync(OUT, { recursive: true });

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

async function saveCompressed(page, filename) {
  const tmpPath = path.join(OUT, `tmp-${filename}`);
  const finalPath = path.join(OUT, filename);
  await page.screenshot({ path: tmpPath, fullPage: false });

  await sharp(tmpPath)
    .png({ quality: 80, palette: true })
    .toFile(finalPath);

  if (existsSync(ARTIFACT_DIR)) {
    copyFileSync(finalPath, path.join(ARTIFACT_DIR, filename));
  }
  console.log(`Đã lưu ảnh: ${filename}`);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const guestCookieDe = {
    v: 1,
    lv: { '1': [1, 1, 3, 0, 100], '2': [1, 1, 3, 0, 100], '3': [1, 1, 3, 0, 100] },
    gp: 0,
    c: 10,
    u: Date.now(),
    st: 1,
    kc: [0, 0, 0, 0],
  };

  const guestCookieTb = {
    v: 1,
    lv: {
      '1': [1, 1, 3, 0, 100],
      '2': [1, 1, 3, 0, 100],
      '3': [1, 1, 3, 0, 100],
      '4': [1, 0, 3, 0, 0],
    },
    gp: 0,
    c: 10,
    u: Date.now(),
    st: 1,
    kc: [0, 0, 0, 0],
  };

  const guestCookieKho = {
    v: 1,
    lv: {
      '1': [1, 1, 3, 0, 100],
      '2': [1, 1, 3, 0, 100],
      '3': [1, 1, 3, 0, 100],
      '4': [1, 0, 3, 3, 0],
    },
    gp: 0,
    c: 10,
    u: Date.now(),
    st: 1,
    kc: [0, 0, 0, 0],
  };

  // -------------------------------------------------------------
  // 1. MÀN 4 DỄ (1366x768)
  // -------------------------------------------------------------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(guestCookieDe)), url: BASE_URL });
    await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // Bước 0: Intro
    await saveCompressed(page, 'p8c-de-1366-step0-intro.png');

    // Bước 2: Proposal
    await page.evaluate(() => window.__tutorial?.setStep(2));
    await sleep(400);
    await saveCompressed(page, 'p8c-de-1366-step2-proposal.png');

    // Bước 4: Decision
    await page.evaluate(() => window.__tutorial?.setStep(4));
    await sleep(400);
    await saveCompressed(page, 'p8c-de-1366-step4-decision.png');

    // Phản hồi sai
    await page.evaluate(() => window.__tutorial?.decide(false));
    await sleep(400);
    await saveCompressed(page, 'p8c-de-1366-wrong.png');

    // Phản hồi đúng
    await page.evaluate(() => window.__tutorial?.decide(true));
    await sleep(400);
    await saveCompressed(page, 'p8c-de-1366-correct.png');

    // Vào bài thật
    await page.evaluate(() => window.__tutorial?.skip());
    await sleep(400);
    await saveCompressed(page, 'p8c-de-1366-real-game.png');

    await page.close();
  }

  // -------------------------------------------------------------
  // 2. MÀN 4 TRUNG BÌNH (1366x768)
  // -------------------------------------------------------------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(guestCookieTb)), url: BASE_URL });
    await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // Bước 0: Intro
    await saveCompressed(page, 'p8c-tb-1366-step0-intro.png');

    // Bước 1: So sánh hai sổ
    await page.evaluate(() => window.__tutorial?.setStep(1));
    await sleep(400);
    await saveCompressed(page, 'p8c-tb-1366-step1-compare.png');

    // Bước 2: Phát hiện trang bị sửa lén
    await page.evaluate(() => window.__tutorial?.setStep(2));
    await sleep(400);
    await saveCompressed(page, 'p8c-tb-1366-step2-tampered.png');

    // Phản hồi sai (Đồng ý)
    await page.evaluate(() => window.__tutorial?.decide(true));
    await sleep(400);
    await saveCompressed(page, 'p8c-tb-1366-wrong.png');

    // Phản hồi đúng (Từ chối)
    await page.evaluate(() => window.__tutorial?.decide(false));
    await sleep(400);
    await saveCompressed(page, 'p8c-tb-1366-correct.png');

    await page.close();
  }

  // -------------------------------------------------------------
  // 3. MÀN 4 KHÓ (1366x768)
  // -------------------------------------------------------------
  {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(guestCookieKho)), url: BASE_URL });
    await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    await page.waitForSelector('[data-tutorial="honest-card"] input', { timeout: 5000 });

    // Bước 0: Intro cọc
    await saveCompressed(page, 'p8c-kho-1366-step0-intro.png');

    // Bước 2: Create info
    await page.evaluate(() => window.__tutorial?.setStep(2));
    await sleep(400);
    await saveCompressed(page, 'p8c-kho-1366-step2-create.png');

    // Bước 3: Input
    await page.evaluate(() => window.__tutorial?.setStep(3));
    await sleep(400);
    await saveCompressed(page, 'p8c-kho-1366-step3-input.png');

    // Gõ sai 50
    await page.evaluate(() => {
      window.__tutorial?.setPracticeVal(50);
      window.__tutorial?.checkPractice();
    });
    await sleep(400);
    await saveCompressed(page, 'p8c-kho-1366-wrong-50.png');

    // Gõ đúng 68
    await page.evaluate(() => {
      window.__tutorial?.setPracticeVal(68);
      window.__tutorial?.checkPractice();
    });
    await sleep(400);
    await saveCompressed(page, 'p8c-kho-1366-correct-68.png');

    await page.close();
  }

  // -------------------------------------------------------------
  // 4. MÀN DI ĐỘNG (360x800 & 844x390)
  // -------------------------------------------------------------
  {
    // 360x800 Dễ
    const page360 = await browser.newPage();
    await page360.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
    await page360.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(guestCookieDe)), url: BASE_URL });
    await page360.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page360);

    await saveCompressed(page360, 'p8c-de-360-step0.png');
    await page360.evaluate(() => window.__tutorial?.decide(true));
    await sleep(400);
    await saveCompressed(page360, 'p8c-de-360-correct.png');
    await page360.close();

    // 360x800 TB
    const page360Tb = await browser.newPage();
    await page360Tb.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
    await page360Tb.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(guestCookieTb)), url: BASE_URL });
    await page360Tb.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page360Tb);

    await page360Tb.evaluate(() => window.__tutorial?.setStep(1));
    await sleep(400);
    await saveCompressed(page360Tb, 'p8c-tb-360-step1.png');
    await page360Tb.evaluate(() => window.__tutorial?.decide(false));
    await sleep(400);
    await saveCompressed(page360Tb, 'p8c-tb-360-correct.png');
    await page360Tb.close();

    // 844x390 Khó
    const page844 = await browser.newPage();
    await page844.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
    await page844.setCookie({ name: 'sc_guest', value: encodeURIComponent(JSON.stringify(guestCookieKho)), url: BASE_URL });
    await page844.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page844);

    await page844.waitForSelector('[data-tutorial="honest-card"] input', { timeout: 5000 });
    await page844.evaluate(() => window.__tutorial?.setStep(3));
    await sleep(400);
    await saveCompressed(page844, 'p8c-kho-844-step3.png');

    await page844.evaluate(() => {
      window.__tutorial?.setPracticeVal(68);
      window.__tutorial?.checkPractice();
    });
    await sleep(400);
    await saveCompressed(page844, 'p8c-kho-844-correct.png');
    await page844.close();
  }

  await browser.close();
  console.log('\nĐã chụp và nén hoàn tất toàn bộ ảnh minh chứng P8c!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
