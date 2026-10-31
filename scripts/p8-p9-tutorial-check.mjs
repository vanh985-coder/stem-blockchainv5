import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p8-p9-tutorial';
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
    console.log(`\n================= KIỂM TRA MÀN 8 & MÀN 9 TẠI ${vp.name} =================`);

    // =========================================================================
    // 1. MÀN 8: MEMORY "LẬT THẺ TÌM CẶP KHÓA"
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
          '7': [1, 1, 3, 3, 3],
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

      await page.goto(`${BASE_URL}/lang/lang-khac-dau/man/8?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passStartCard(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Màn 8 - ${vp.name}] TutorialSpotlight đã mở thành công`);

      // Bước 0: Intro
      const title0 = await page.$eval('#tutorial-step-title', (el) => el.innerText.toLowerCase());
      const hasStep0Title = title0.includes('lật thẻ');
      results.push({ name: `[Màn 8 - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });
      await page.screenshot({ path: `${OUT}/man8-${vp.name}-step0.png` });

      // Bước 1: Lưới thẻ
      await clickTutorialNext(page);
      const hasGridTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man8-grid') !== null;
      });
      results.push({ name: `[Màn 8 - ${vp.name}] Bước 1 Lưới thẻ`, pass: hasGridTarget });
      await page.screenshot({ path: `${OUT}/man8-${vp.name}-step1.png` });

      // Bước 2: Máy tính Mod
      await clickTutorialNext(page);
      const hasCalcTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man8-calc') !== null;
      });
      results.push({ name: `[Màn 8 - ${vp.name}] Bước 2 Máy tính Mod`, pass: hasCalcTarget });
      await page.screenshot({ path: `${OUT}/man8-${vp.name}-step2.png` });

      // Bước 3: Làm thử thao tác lật thẻ hoặc mở máy tính
      await clickTutorialNext(page);
      const hasPracticeButton = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Lật thử') || (b.textContent || '').includes('Mở máy tính'));
        return Boolean(btn);
      });
      results.push({ name: `[Màn 8 - ${vp.name}] Bước 3 Nút thao tác làm thử`, pass: hasPracticeButton });
      await page.screenshot({ path: `${OUT}/man8-${vp.name}-step3-practice.png` });

      // Bấm nút Lật thử một cặp thẻ
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Lật thử')) ||
          [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Mở máy tính'));
        if (btn) btn.click();
      });
      await sleep(1000);

      // Bước 4: Nút Bắt đầu chơi thật
      const hasActionBtn8 = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').toLowerCase().includes('bắt đầu chơi')));
      });
      results.push({ name: `[Màn 8 - ${vp.name}] Bước 4 Nút Bắt đầu chơi thật`, pass: hasActionBtn8 });
      await page.screenshot({ path: `${OUT}/man8-${vp.name}-step4-ready.png` });

      // Bấm "Bắt đầu chơi thật" -> Spotlight đóng
      await clickTutorialAction(page);
      await sleep(300);
      const isSpotlightClosed8 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') === null;
      });
      results.push({ name: `[Màn 8 - ${vp.name}] Bắt đầu bài thật thành công`, pass: isSpotlightClosed8 });

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
      const isReopened8 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') !== null;
      });
      results.push({ name: `[Màn 8 - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened8 });

      await page.close();
    }

    // =========================================================================
    // 2. MÀN 9: CHICKEN "CHỮA ĐÀN GÀ"
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
          '7': [1, 1, 3, 3, 3],
          '8': [1, 1, 3, 3, 3],
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

      await page.goto(`${BASE_URL}/lang/lang-khac-dau/man/9?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passStartCard(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Màn 9 - ${vp.name}] TutorialSpotlight đã mở thành công`);

      // Bước 0: Intro
      const title0 = await page.$eval('#tutorial-step-title', (el) => el.innerText.toLowerCase());
      const hasStep0Title = title0.includes('chữa đàn gà');
      results.push({ name: `[Màn 9 - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });
      await page.screenshot({ path: `${OUT}/man9-${vp.name}-step0.png` });

      // Bước 1: Khay nạp thuốc
      await clickTutorialNext(page);
      await page.waitForSelector('#tutorial-man9-load', { timeout: 3000 }).catch(() => {});
      const hasLoadTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man9-load') !== null;
      });
      results.push({ name: `[Màn 9 - ${vp.name}] Bước 1 Khay nạp thuốc`, pass: hasLoadTarget });
      await page.screenshot({ path: `${OUT}/man9-${vp.name}-step1.png` });

      // Bước 2: Bắn ná
      await clickTutorialNext(page);
      const hasShootStep = await page.evaluate(() => {
        const txt = document.querySelector('[data-testid="tutorial-tooltip"] p')?.textContent || '';
        return txt.toLowerCase().includes('bắn');
      });
      results.push({ name: `[Màn 9 - ${vp.name}] Bước 2 Bắn ná`, pass: hasShootStep });
      await page.screenshot({ path: `${OUT}/man9-${vp.name}-step2.png` });

      // Bước 3: Làm thử thao tác bắn ná
      await clickTutorialNext(page);
      const hasShootButton = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Bắn thử'));
        return Boolean(btn);
      });
      results.push({ name: `[Màn 9 - ${vp.name}] Bước 3 Nút Bắn thử`, pass: hasShootButton });
      await page.screenshot({ path: `${OUT}/man9-${vp.name}-step3-practice.png` });

      // Bấm nút Bắn thử
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Bắn thử'));
        if (btn) btn.click();
      });
      await sleep(500);

      // Bước 4: Nút Bắt đầu chơi thật
      const hasActionBtn9 = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').toLowerCase().includes('bắt đầu chơi')));
      });
      results.push({ name: `[Màn 9 - ${vp.name}] Bước 4 Nút Bắt đầu chơi thật`, pass: hasActionBtn9 });
      await page.screenshot({ path: `${OUT}/man9-${vp.name}-step4-ready.png` });

      // Bấm "Bắt đầu chơi thật" -> Spotlight đóng
      await clickTutorialAction(page);
      await sleep(300);
      const isSpotlightClosed9 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') === null;
      });
      results.push({ name: `[Màn 9 - ${vp.name}] Bắt đầu bài thật thành công`, pass: isSpotlightClosed9 });

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
      const isReopened9 = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') !== null;
      });
      results.push({ name: `[Màn 9 - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened9 });

      await page.close();
    }
  }

  await browser.close();

  writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify(results, null, 2));

  console.log('\n================= TỔNG HỢP KẾT QUẢ KIỂM TRA MÀN 8 & 9 =================');
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
