import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p11-p12-tutorial';
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const chromePath = CHROME_PATHS.find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VIEWPORTS = [
  { name: '1366x768', w: 1366, h: 768, isMobile: false, hasTouch: false },
  { name: '360x800', w: 360, h: 800, isMobile: true, hasTouch: true },
  { name: '844x390', w: 844, h: 390, isMobile: true, hasTouch: true },
];

async function passStartCard(page) {
  for (let i = 0; i < 20; i++) {
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
  await sleep(600);
}

async function clickTutorialNext(page) {
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
    const btn = buttons.find((b) => {
      const txt = (b.textContent || '').trim();
      return txt === 'Tiếp tục' || txt === 'Đã hiểu' || txt === 'Thử tính ngay' || txt === 'Tiếp';
    });
    if (btn) btn.click();
  });
  await sleep(350);
}

async function clickTutorialAction(page) {
  const buttons = await page.$$('[data-testid="tutorial-tooltip"] button');
  for (const b of buttons) {
    const txt = await b.evaluate((el) => (el.textContent || '').trim().toLowerCase());
    if (txt.includes('bắt đầu chơi') || txt.includes('bắt đầu chơi thật')) {
      await b.click();
      break;
    }
  }
  await sleep(400);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  const guestCookie = {
    v: 1,
    lv: {
      '1': [1, 1, 3, 3, 3],
      '2': [1, 1, 3, 3, 3],
      '3': [1, 1, 3, 3, 3],
      '4': [1, 1, 3, 3, 3],
      '5': [1, 1, 3, 3, 3],
      '6': [1, 1, 3, 3, 3],
      '7': [1, 1, 3, 3, 3],
      '8': [1, 1, 3, 3, 3],
      '9': [1, 1, 3, 3, 3],
      '10': [1, 1, 3, 3, 3],
      '11': [1, 1, 3, 3, 3],
      '12': [1, 1, 3, 3, 3],
    },
    gp: 0,
    c: 10,
    u: Date.now(),
    st: 1,
    kc: [15, 15, 15, 15],
  };

  for (const vp of VIEWPORTS) {
    console.log(`\n================= KIỂM TRA MÀN 11 & MÀN 12 TẠI ${vp.name} =================`);

    // =========================================================================
    // 1. MÀN 11: MATCH-3 "GHÉP LÁ CÂY SỔ"
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-bac/man/11?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await sleep(1000);
      await passStartCard(page);

      // Chờ tutorial xuất hiện
      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 6000 });
      await sleep(400);

      // Bước 0: Intro
      const step0Title = await page.$eval('#tutorial-step-title', (el) => el.textContent.trim());
      await page.screenshot({ path: `${OUT}/man11-${vp.name}-step0.png` });
      console.log(`[${vp.name}] Màn 11 Bước 0 Intro: "${step0Title}"`);
      results.push({ test: `Màn 11 - ${vp.name} - Bước 0 Intro`, passed: step0Title.toLowerCase().includes('ghép lá') });

      // Sang Bước 1: Focus Bàn 7x7 (#tutorial-man11-board)
      await clickTutorialNext(page);
      await sleep(300);
      await page.screenshot({ path: `${OUT}/man11-${vp.name}-step1.png` });
      const step1Text = await page.$eval('[data-testid="tutorial-tooltip"] p', (el) => el.textContent.trim());
      console.log(`[${vp.name}] Màn 11 Bước 1 Bàn ghép lá: "${step1Text.slice(0, 50)}..."`);
      results.push({ test: `Màn 11 - ${vp.name} - Bước 1 Bàn ghép`, passed: step1Text.includes('Bàn ghép lá') });

      // Sang Bước 2: Focus Thanh HUD (#tutorial-man11-hud)
      await clickTutorialNext(page);
      await sleep(300);
      await page.screenshot({ path: `${OUT}/man11-${vp.name}-step2.png` });
      const step2Text = await page.$eval('[data-testid="tutorial-tooltip"] p', (el) => el.textContent.trim());
      console.log(`[${vp.name}] Màn 11 Bước 2 Thanh HUD: "${step2Text.slice(0, 50)}..."`);
      results.push({ test: `Màn 11 - ${vp.name} - Bước 2 Thanh HUD`, passed: step2Text.includes('Cây Merkle') || step2Text.includes('lượt') });

      // Sang Bước 3: Thực hành làm thử tráo lá
      await clickTutorialNext(page);
      await sleep(300);
      await page.waitForSelector('#tutorial-man11-swap-btn', { timeout: 3000 });
      await page.screenshot({ path: `${OUT}/man11-${vp.name}-step3-practice.png` });
      console.log(`[${vp.name}] Màn 11 Bước 3 Thực hành tráo: hiển thị nút tráo thử`);
      results.push({ test: `Màn 11 - ${vp.name} - Bước 3 Nút tráo thử`, passed: true });

      // Click tráo thử
      await page.click('#tutorial-man11-swap-btn');
      await sleep(500);

      // Bước 4: Hoàn thành làm thử
      await page.screenshot({ path: `${OUT}/man11-${vp.name}-step4-ready.png` });
      const step4Text = await page.$eval('[data-testid="tutorial-tooltip"] p', (el) => el.textContent.trim());
      console.log(`[${vp.name}] Màn 11 Bước 4 Hoàn thành: "${step4Text.slice(0, 50)}..."`);
      results.push({ test: `Màn 11 - ${vp.name} - Bước 4 Hoàn thành`, passed: step4Text.includes('khớp hàng') || step4Text.includes('Merkle') });

      // Bắt đầu chơi thật
      await clickTutorialAction(page);
      await sleep(500);

      // Spotlight đã đóng, ván thật đang chạy
      const spotlightGone = await page.evaluate(() => !document.querySelector('[data-testid="tutorial-spotlight"]'));
      console.log(`[${vp.name}] Màn 11 Đóng spotlight vào ván thật: ${spotlightGone}`);
      results.push({ test: `Màn 11 - ${vp.name} - Đóng spotlight vào ván thật`, passed: spotlightGone });

      // Kiểm tra mở lại giữa bài qua nút "💡 Hướng dẫn"
      await page.click('#tutorial-man11-guide-btn');
      await sleep(400);
      const reopened = await page.evaluate(() => !!document.querySelector('[data-testid="tutorial-spotlight"]'));
      console.log(`[${vp.name}] Màn 11 Mở lại hướng dẫn giữa ván: ${reopened}`);
      results.push({ test: `Màn 11 - ${vp.name} - Mở lại hướng dẫn giữa ván`, passed: reopened });

      await page.close();
    }

    // =========================================================================
    // 2. MÀN 12: CLIMB "LEO CÂY TÌM LÁ GIẢ"
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-bac/man/12?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await sleep(1000);
      await passStartCard(page);

      // Chờ tutorial xuất hiện
      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 6000 });
      await sleep(400);

      // Bước 0: Intro
      const step0Title = await page.$eval('#tutorial-step-title', (el) => el.textContent.trim());
      await page.screenshot({ path: `${OUT}/man12-${vp.name}-step0.png` });
      console.log(`[${vp.name}] Màn 12 Bước 0 Intro: "${step0Title}"`);
      results.push({ test: `Màn 12 - ${vp.name} - Bước 0 Intro`, passed: step0Title.toLowerCase().includes('leo cây') });

      // Sang Bước 1: Focus Cây (#tutorial-man12-tree)
      await clickTutorialNext(page);
      await sleep(300);
      await page.screenshot({ path: `${OUT}/man12-${vp.name}-step1.png` });
      const step1Text = await page.$eval('[data-testid="tutorial-tooltip"] p', (el) => el.textContent.trim());
      console.log(`[${vp.name}] Màn 12 Bước 1 Thân cây: "${step1Text.slice(0, 50)}..."`);
      results.push({ test: `Màn 12 - ${vp.name} - Bước 1 Thân cây`, passed: step1Text.includes('Cặp tay nắm') || step1Text.includes('tay nắm') });

      // Sang Bước 2: Focus Thanh HUD (#tutorial-man12-hud)
      await clickTutorialNext(page);
      await sleep(300);
      await page.screenshot({ path: `${OUT}/man12-${vp.name}-step2.png` });
      const step2Text = await page.$eval('[data-testid="tutorial-tooltip"] p', (el) => el.textContent.trim());
      console.log(`[${vp.name}] Màn 12 Bước 2 Thanh HUD: "${step2Text.slice(0, 50)}..."`);
      results.push({ test: `Màn 12 - ${vp.name} - Bước 2 Thanh HUD`, passed: step2Text.includes('tim') || step2Text.includes('tiền đồng') });

      // Sang Bước 3: Thực hành làm thử nhảy bám
      await clickTutorialNext(page);
      await sleep(300);
      await page.waitForSelector('#tutorial-man12-jump-btn', { timeout: 3000 });
      await page.screenshot({ path: `${OUT}/man12-${vp.name}-step3-practice.png` });
      console.log(`[${vp.name}] Màn 12 Bước 3 Thực hành nhảy: hiển thị nút nhảy thử`);
      results.push({ test: `Màn 12 - ${vp.name} - Bước 3 Nút nhảy thử`, passed: true });

      // Click nhảy thử
      await page.click('#tutorial-man12-jump-btn');
      await sleep(600);

      // Bước 4: Hoàn thành làm thử
      await page.screenshot({ path: `${OUT}/man12-${vp.name}-step4-ready.png` });
      const step4Text = await page.$eval('[data-testid="tutorial-tooltip"] p', (el) => el.textContent.trim());
      console.log(`[${vp.name}] Màn 12 Bước 4 Hoàn thành: "${step4Text.slice(0, 50)}..."`);
      results.push({ test: `Màn 12 - ${vp.name} - Bước 4 Hoàn thành`, passed: step4Text.includes('nhịp nhàng') || step4Text.includes('đối chiếu') });

      // Bắt đầu chơi thật
      await clickTutorialAction(page);
      await sleep(500);

      // Spotlight đã đóng, ván thật đang chạy
      const spotlightGone = await page.evaluate(() => !document.querySelector('[data-testid="tutorial-spotlight"]'));
      console.log(`[${vp.name}] Màn 12 Đóng spotlight vào ván thật: ${spotlightGone}`);
      results.push({ test: `Màn 12 - ${vp.name} - Đóng spotlight vào ván thật`, passed: spotlightGone });

      // Kiểm tra mở lại giữa bài qua nút "💡 Hướng dẫn"
      await page.click('#tutorial-man12-guide-btn');
      await sleep(400);
      const reopened = await page.evaluate(() => !!document.querySelector('[data-testid="tutorial-spotlight"]'));
      console.log(`[${vp.name}] Màn 12 Mở lại hướng dẫn giữa ván: ${reopened}`);
      results.push({ test: `Màn 12 - ${vp.name} - Mở lại hướng dẫn giữa ván`, passed: reopened });

      await page.close();
    }
  }

  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`\n======================================================`);
  console.log(`TỔNG KẾT KIỂM TRA MÀN 11 & MÀN 12: ${passed}/${total} ĐẠT`);
  console.log(`======================================================\n`);

  writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify({ total, passed, results }, null, 2));

  if (passed !== total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('LỖI KIỂM TRA MÀN 11 & 12:', err);
  process.exit(1);
});
