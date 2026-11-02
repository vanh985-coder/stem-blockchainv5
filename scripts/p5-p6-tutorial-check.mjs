import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p5-p6-tutorial';
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
    console.log(`\n================= KIỂM TRA MÀN 5 & MÀN 6 TẠI ${vp.name} =================`);

    // =========================================================================
    // 1. MÀN 5: WHACK 2D "ĐẬP {PHANDIEN}"
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookie = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 3, 3],
          '2': [1, 1, 3, 3, 3],
          '3': [1, 1, 3, 3, 3],
          '4': [1, 1, 3, 3, 3],
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

      await page.goto(`${BASE_URL}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passStartCard(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Màn 5 - ${vp.name}] TutorialSpotlight đã mở thành công`);

      // Bước 0: Intro
      const title0 = await page.$eval('#tutorial-step-title', (el) => el.innerText.toLowerCase());
      const hasStep0Title = title0.includes('đập');
      results.push({ name: `[Màn 5 - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });
      await page.screenshot({ path: `${OUT}/man5-${vp.name}-step0.png` });

      // Bước 1: 4 Làn & Vùng đập
      await clickTutorialNext(page);
      const hasLanesTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man5-lanes') !== null;
      });
      results.push({ name: `[Màn 5 - ${vp.name}] Bước 1 Khung 4 làn`, pass: hasLanesTarget });
      await page.screenshot({ path: `${OUT}/man5-${vp.name}-step1.png` });

      // Bước 2: Cuốn Sổ Chung ở đáy
      await clickTutorialNext(page);
      const hasBookTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man5-book') !== null;
      });
      results.push({ name: `[Màn 5 - ${vp.name}] Bước 2 Cuốn Sổ Chung`, pass: hasBookTarget });
      await page.screenshot({ path: `${OUT}/man5-${vp.name}-step2.png` });

      // Bước 3: Nút đập chân làn
      await clickTutorialNext(page);
      const hasButtonsTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man5-buttons') !== null;
      });
      results.push({ name: `[Màn 5 - ${vp.name}] Bước 3 Nút chân làn`, pass: hasButtonsTarget });
      await page.screenshot({ path: `${OUT}/man5-${vp.name}-step3.png` });

      // Bước 4: Làm thử thao tác Đập làn 1
      await clickTutorialNext(page);
      const hasHitPracticeButton = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Đập thử'));
        return Boolean(btn);
      });
      results.push({ name: `[Màn 5 - ${vp.name}] Bước 4 Nút Đập thử`, pass: hasHitPracticeButton });
      await page.screenshot({ path: `${OUT}/man5-${vp.name}-step4-practice.png` });

      // Bấm nút Đập thử làn 1
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Đập thử'));
        if (btn) btn.click();
      });
      await sleep(500);

      // Bước 5: Nút Bắt đầu chơi thật
      const hasActionBtn5 = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').toLowerCase().includes('bắt đầu chơi')));
      });
      results.push({ name: `[Màn 5 - ${vp.name}] Bước 5 Nút Bắt đầu chơi thật`, pass: hasActionBtn5 });
      await page.screenshot({ path: `${OUT}/man5-${vp.name}-step5-ready.png` });

      // Bấm "Bắt đầu chơi thật" -> Spotlight đóng
      await clickTutorialAction(page);
      await sleep(300);
      const isSpotlightClosed5 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') === null;
      });
      results.push({ name: `[Màn 5 - ${vp.name}] Bắt đầu bài thật thành công`, pass: isSpotlightClosed5 });

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
      const isReopened5 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') !== null;
      });
      results.push({ name: `[Màn 5 - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened5 });

      await page.close();
    }

    // =========================================================================
    // 2. MÀN 6: DIỀU ĐƯA SỔ (KITE GAME 2.5D)
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookie = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 3, 3],
          '2': [1, 1, 3, 3, 3],
          '3': [1, 1, 3, 3, 3],
          '4': [1, 1, 3, 3, 3],
          '5': [1, 1, 3, 3, 3],
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

      await page.goto(`${BASE_URL}/lang/lang-det/man/6?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passStartCard(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Màn 6 - ${vp.name}] TutorialSpotlight đã mở thành công`);

      // Bước 0: Intro
      const title0 = await page.$eval('#tutorial-step-title', (el) => el.innerText.toLowerCase());
      const hasStep0Title = title0.includes('diều');
      results.push({ name: `[Màn 6 - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });
      await page.screenshot({ path: `${OUT}/man6-${vp.name}-step0.png` });

      // Bước 1: HUD
      await clickTutorialNext(page);
      const hasHudTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man6-hud') !== null;
      });
      results.push({ name: `[Màn 6 - ${vp.name}] Bước 1 Thanh HUD`, pass: hasHudTarget });
      await page.screenshot({ path: `${OUT}/man6-${vp.name}-step1.png` });

      // Bước 2: Điều khiển
      await clickTutorialNext(page);
      const hasControlsStep = await page.evaluate(() => {
        const txt = document.querySelector('[data-testid="tutorial-tooltip"] p')?.textContent || '';
        return txt.toLowerCase().includes('điều khiển');
      });
      results.push({ name: `[Màn 6 - ${vp.name}] Bước 2 Điều khiển`, pass: hasControlsStep });
      await page.screenshot({ path: `${OUT}/man6-${vp.name}-step2.png` });

      // Bước 3: Làm thử thao tác Vỗ cánh
      await clickTutorialNext(page);
      const hasFlapButton = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Vỗ cánh'));
        return Boolean(btn);
      });
      results.push({ name: `[Màn 6 - ${vp.name}] Bước 3 Nút Vỗ cánh thử`, pass: hasFlapButton });
      await page.screenshot({ path: `${OUT}/man6-${vp.name}-step3-practice.png` });

      // Bấm nút Vỗ cánh thử
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Vỗ cánh'));
        if (btn) btn.click();
      });
      await sleep(500);

      // Bước 4: Nút Bắt đầu chơi thật
      const hasActionBtn6 = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').toLowerCase().includes('bắt đầu chơi')));
      });
      results.push({ name: `[Màn 6 - ${vp.name}] Bước 4 Nút Bắt đầu chơi thật`, pass: hasActionBtn6 });
      await page.screenshot({ path: `${OUT}/man6-${vp.name}-step4-ready.png` });

      // Bấm "Bắt đầu chơi thật" -> Spotlight đóng
      await clickTutorialAction(page);
      await sleep(300);
      const isSpotlightClosed6 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') === null;
      });
      results.push({ name: `[Màn 6 - ${vp.name}] Bắt đầu bài thật thành công`, pass: isSpotlightClosed6 });

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
      const isReopened6 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') !== null;
      });
      results.push({ name: `[Màn 6 - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened6 });

      await page.close();
    }
  }

  await browser.close();

  writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify(results, null, 2));

  console.log('\n================= TỔNG HỢP KẾT QUẢ KIỂM TRA MÀN 5 & 6 =================');
  let passedCount = 0;
  for (const r of results) {
    if (r.pass) passedCount++;
    console.log(`${r.pass ? '✅' : '❌'} ${r.name}`);
  }
  console.log(`\nTổng số: ${passedCount}/${results.length} bài kiểm đạt (${Math.round((passedCount / results.length) * 100)}%)`);

  if (passedCount < results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Lỗi khi chạy kiểm tra Puppeteer:', err);
  process.exit(1);
});
