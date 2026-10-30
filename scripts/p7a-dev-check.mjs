// Script kiểm tra nút Tự hoàn thành Màn 5 trên bản dev (http://localhost:5174)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5174';
const OUT = 'docs/screenshots/p7a';
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
  lv: {
    '1': [1, 1, 3, 3, 3],
    '2': [1, 1, 3, 1000],
    '3': [1, 1, 3, 1000],
    '4': [1, 1, 3, 3, 3],
  },
  gp: 1,
  c: 100,
  u: Date.now(),
  st: 1,
  kc: [15, 15, 15, 15],
  gt: 8191,
  hd: 2147483647,
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE,
    });

    console.log('Mở Màn 5 trên bản dev...');
    await page.goto(`${BASE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // 1. Kiểm tra thẻ bắt đầu có nút Tự hoàn thành
    const autoBtnStart = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      return btns.some((b) => (b.textContent || '').includes('Tự hoàn thành'));
    });
    console.log(`[Dev] Thẻ bắt đầu có nút Tự hoàn thành: ${autoBtnStart}`);
    await page.screenshot({ path: `${OUT}/09-dev-the-bat-dau.png` });

    // 2. Bấm Bắt đầu vào chơi
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(1000);

    // 3. Mở hộp "?" giữa ván
    const helpBtn = await page.$('button[aria-label*="Hướng dẫn"], button[aria-label*="giúp"], [data-testid="nut-tro-giup"]');
    if (helpBtn) await helpBtn.click();
    else await page.keyboard.press('KeyH');
    await sleep(600);

    const autoBtnInside = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('[role="dialog"] button')];
      return btns.some((b) => (b.textContent || '').includes('Tự hoàn thành'));
    });
    console.log(`[Dev] Hộp "?" giữa ván có nút Tự hoàn thành: ${autoBtnInside}`);
    await page.screenshot({ path: `${OUT}/10-dev-hop-tro-giup.png` });

    // 4. Bấm nút Tự hoàn thành trong hộp "?"
    await page.evaluate(() => {
      const autoBtn = [...document.querySelectorAll('[role="dialog"] button')].find((b) => (b.textContent || '').includes('Tự hoàn thành'));
      if (autoBtn) autoBtn.click();
    });
    await sleep(1000);

    // 5. Kiểm tra panel tự hoàn thành
    const autoDone = await page.evaluate(() => {
      return document.body.textContent.includes('Đã tự động hoàn thành') || document.body.textContent.includes('tự hoàn thành');
    });
    console.log(`[Dev] Màn hình Đã tự hoàn thành xuất hiện: ${autoDone}`);
    await page.screenshot({ path: `${OUT}/11-dev-da-tu-hoan-thanh.png` });

    const devResults = {
      timestamp: new Date().toISOString(),
      autoBtnStart,
      autoBtnInside,
      autoDone,
    };
    writeFileSync(`${OUT}/ket-qua-p7a-dev.json`, JSON.stringify(devResults, null, 2), 'utf-8');
    console.log('Đã ghi kết quả dev vào ket-qua-p7a-dev.json!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi dev check:', err);
  process.exit(1);
});
