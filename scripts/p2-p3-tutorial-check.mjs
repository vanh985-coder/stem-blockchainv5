import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p2-p3-tutorial';
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
  await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
    const btn = buttons.find((b) => {
      const txt = (b.textContent || '').trim().toLowerCase();
      return txt.includes('bắt đầu chơi') || txt.includes('bắt đầu chơi thật');
    });
    if (btn) btn.click();
  });
  await sleep(400);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n================= KIỂM TRA MÀN 2 & MÀN 3 TẠI ${vp.name} =================`);

    // =========================================================================
    // 1. MÀN 2: RUNNER "ĐUỔI THEO {PHANDIEN}"
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookie = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 3, 3],
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

      await page.goto(`${BASE_URL}/lang/lang-giay/man/2?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passStartCard(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Màn 2 - ${vp.name}] TutorialSpotlight đã mở thành công`);

      // Bước 0: Intro
      const title0 = await page.$eval('#tutorial-step-title', (el) => el.innerText.toLowerCase());
      const hasStep0Title = title0.includes('đuổi theo');
      results.push({ name: `[Màn 2 - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });
      await page.screenshot({ path: `${OUT}/man2-${vp.name}-step0.png` });

      // Bước 1: HUD
      await clickTutorialNext(page);
      const hasHudTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man2-hud') !== null;
      });
      results.push({ name: `[Màn 2 - ${vp.name}] Bước 1 Thanh HUD`, pass: hasHudTarget });
      await page.screenshot({ path: `${OUT}/man2-${vp.name}-step1.png` });

      // Bước 2: Điều khiển
      await clickTutorialNext(page);
      const hasControlsStep = await page.evaluate(() => {
        const txt = document.querySelector('[data-testid="tutorial-tooltip"] p')?.textContent || '';
        return txt.toLowerCase().includes('điều khiển');
      });
      results.push({ name: `[Màn 2 - ${vp.name}] Bước 2 Điều khiển`, pass: hasControlsStep });

      // Bước 3: Làm thử thao tác Nhảy
      await clickTutorialNext(page);
      const hasJumpButton = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Nhảy thử'));
        return Boolean(btn);
      });
      results.push({ name: `[Màn 2 - ${vp.name}] Bước 3 Nút Nhảy thử`, pass: hasJumpButton });
      await page.screenshot({ path: `${OUT}/man2-${vp.name}-step3-practice.png` });

      // Bấm nút Nhảy thử
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Nhảy thử'));
        if (btn) btn.click();
      });
      await sleep(500);

      // Bước 4: Nút Bắt đầu chơi thật
      const hasActionBtn2 = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').toLowerCase().includes('bắt đầu chơi')));
      });
      results.push({ name: `[Màn 2 - ${vp.name}] Bước 4 Nút Bắt đầu chơi thật`, pass: hasActionBtn2 });
      await page.screenshot({ path: `${OUT}/man2-${vp.name}-step4-ready.png` });

      // Bấm "Bắt đầu chơi thật" -> Spotlight đóng
      await clickTutorialAction(page);
      await sleep(300);
      const isSpotlightClosed2 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') === null;
      });
      results.push({ name: `[Màn 2 - ${vp.name}] Bắt đầu bài thật thành công`, pass: isSpotlightClosed2 });

      // Mở lại hướng dẫn bằng nút "💡 Hướng dẫn"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => {
          const aria = b.getAttribute('aria-label') || '';
          const txt = b.textContent || '';
          return aria.includes('Hướng dẫn') || txt.includes('💡') || txt.includes('Hướng dẫn');
        });
        if (btn) btn.click();
      });
      await sleep(400);
      const isReopened2 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') !== null;
      });
      results.push({ name: `[Màn 2 - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened2 });

      await page.close();
    }

    // =========================================================================
    // 2. MÀN 3: GHÉP SỔ "GHÉP LẠI CUỐN SỔ"
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookie = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 3, 3],
          '2': [1, 1, 3, 100],
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
      await passStartCard(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Màn 3 - ${vp.name}] TutorialSpotlight đã mở thành công`);

      // Bước 0: Intro
      const title0 = await page.$eval('#tutorial-step-title', (el) => el.innerText.toLowerCase());
      const hasStep0Title = title0.includes('ghép lại');
      results.push({ name: `[Màn 3 - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });
      await page.screenshot({ path: `${OUT}/man3-${vp.name}-step0.png` });

      // Bước 1: Chuỗi trang
      await clickTutorialNext(page);
      const hasChainTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man3-chain') !== null;
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Bước 1 Chuỗi trang`, pass: hasChainTarget });
      await page.screenshot({ path: `${OUT}/man3-${vp.name}-step1.png` });

      // Bước 2: Khay thẻ
      await clickTutorialNext(page);
      const hasTrayTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man3-tray') !== null;
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Bước 2 Khay thẻ`, pass: hasTrayTarget });

      // Bước 3: Rổ trang giả
      await clickTutorialNext(page);
      const hasBasketTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man3-basket') !== null;
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Bước 3 Rổ trang giả`, pass: hasBasketTarget });

      // Bước 4: Nút Soi công thức
      await clickTutorialNext(page);
      const hasSoiTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man3-soi') !== null;
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Bước 4 Nút Soi công thức`, pass: hasSoiTarget });

      // Bước 5: Làm thử thao tác Ghép trang hoặc Soi
      await clickTutorialNext(page);
      const hasPracticeAction = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Ghép thử vào chuỗi') || (b.textContent || '').includes('Soi công thức'));
        return Boolean(btn);
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Bước 5 Nút thao tác làm thử`, pass: hasPracticeAction });
      await page.screenshot({ path: `${OUT}/man3-${vp.name}-step5-practice.png` });

      // Bấm nút Ghép thử vào chuỗi
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Ghép thử vào chuỗi') || (b.textContent || '').includes('Soi công thức'));
        if (btn) btn.click();
      });
      await sleep(500);

      // Bước 6: Nút Bắt đầu chơi thật
      const hasActionBtn3 = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').toLowerCase().includes('bắt đầu chơi')));
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Bước 6 Nút Bắt đầu chơi thật`, pass: hasActionBtn3 });
      await page.screenshot({ path: `${OUT}/man3-${vp.name}-step6-ready.png` });

      // Bấm "Bắt đầu chơi thật" -> Spotlight đóng
      await clickTutorialAction(page);
      await sleep(300);
      const isSpotlightClosed3 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') === null;
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Bắt đầu bài thật thành công`, pass: isSpotlightClosed3 });

      // Mở lại hướng dẫn bằng nút "💡 Hướng dẫn"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => {
          const aria = b.getAttribute('aria-label') || '';
          const txt = b.textContent || '';
          return aria.includes('Hướng dẫn') || txt.includes('💡') || txt.includes('Hướng dẫn');
        });
        if (btn) btn.click();
      });
      await sleep(400);
      const isReopened3 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') !== null;
      });
      results.push({ name: `[Màn 3 - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened3 });

      await page.close();
    }
  }

  await browser.close();

  console.log('\n================= TỔNG KẾT KIỂM TRA MÀN 2 & MÀN 3 =================');
  let passCount = 0;
  for (const r of results) {
    if (r.pass) {
      passCount++;
      console.log(`✅ ${r.name}`);
    } else {
      console.log(`❌ ${r.name}`);
    }
  }
  console.log(`\nKết quả: ${passCount} / ${results.length} đạt`);
  writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify(results, null, 2), 'utf-8');
}

main().catch(console.error);
