import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p10-tutorial';
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
    const btn = buttons.find((b) => (b.textContent || '').includes('Bắt đầu chơi thật') || (b.textContent || '').includes('Quay lại bài làm'));
    if (btn) btn.click();
  });
  await sleep(400);
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
    console.log(`\n================= KIỂM TRA MÀN 10 TẠI ${vp.name} =================`);

    // =========================================================================
    // 1. TRẠM DỄ: GHÉP CẶP GIAO DỊCH
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookieDe = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 0, 100],
          '2': [1, 1, 3, 0, 100],
          '3': [1, 1, 3, 0, 100],
          '4': [1, 1, 3, 0, 100],
          '5': [1, 1, 3, 0, 100],
          '6': [1, 1, 3, 0, 100],
          '7': [1, 1, 3, 0, 100],
          '8': [1, 1, 3, 0, 100],
          '9': [1, 1, 3, 0, 100],
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 1,
        kc: [15, 15, 15, 15],
      };

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieDe)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-bac/man/10?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Dễ - ${vp.name}] TutorialSpotlight đã mở thành công`);

      const titleStep0 = await page.$eval('[data-testid="tutorial-tooltip"]', (el) => el.innerText.toLowerCase());
      const hasStep0Title = titleStep0.includes('ghép cặp giao dịch');
      results.push({ name: `[Dễ - ${vp.name}] Bước 0 intro`, pass: hasStep0Title });

      await page.screenshot({ path: `${OUT}/man10-de-${vp.name}-step0.png` });

      // Next sang Bước 1 (Bảng tra cứu)
      await clickTutorialNext(page);
      const hasTableTarget = await page.evaluate(() => {
        const spot = document.querySelector('[data-testid="tutorial-spotlight"]');
        return Boolean(spot) && document.querySelector('#tutorial-man10de-table') !== null;
      });
      results.push({ name: `[Dễ - ${vp.name}] Bước 1 Bảng tra cứu`, pass: hasTableTarget });

      // Next sang Bước 2 (Cặp thẻ ghép)
      await clickTutorialNext(page);
      const hasPairTarget = await page.evaluate(() => {
        return document.querySelector('#tutorial-man10de-pair') !== null;
      });
      results.push({ name: `[Dễ - ${vp.name}] Bước 2 Cặp thẻ ghép`, pass: hasPairTarget });

      // Đọc đáp án đúng từ 2 thẻ
      const expected = await page.evaluate(() => {
        const cards = document.querySelectorAll('#tutorial-man10de-pair .font-display.font-extrabold.text-2xl');
        if (cards.length >= 2) {
          const v1 = parseInt(cards[0].textContent || '0', 10);
          const v2 = parseInt(cards[1].textContent || '0', 10);
          return v1 * 10 + v2;
        }
        return 37;
      });

      // Next sang Bước 3 (Làm thử: Nhập số)
      await clickTutorialNext(page);
      const isInputStep = await page.evaluate(() => {
        return document.querySelector('#tutorial-man10de-input input') !== null;
      });
      results.push({ name: `[Dễ - ${vp.name}] Bước 3 Ô nhập`, pass: isInputStep });
      await page.screenshot({ path: `${OUT}/man10-de-${vp.name}-step3-input.png` });

      // Thử nhập sai số
      const wrongVal = expected === 11 ? '12' : '11';
      await page.click('#tutorial-man10de-input input');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(wrongVal);
      await sleep(200);

      // Bấm nút Ghép giao dịch hoặc Enter
      await page.keyboard.press('Enter');
      await sleep(400);

      // Kiểm tra có báo lỗi
      const hasErrorText = await page.evaluate(() => {
        const el =
          document.querySelector('#tutorial-man10de-input [role="alert"]') ||
          document.querySelector('#tutorial-man10de-input p') ||
          document.querySelector('[data-testid="tutorial-tooltip"] [role="status"]');
        return Boolean(el && el.innerText.toLowerCase().includes('chưa đúng'));
      });
      results.push({ name: `[Dễ - ${vp.name}] Nhập sai có phản hồi lỗi`, pass: hasErrorText });

      // Bây giờ nhập đúng số expected
      await page.click('#tutorial-man10de-input input');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.keyboard.type(String(expected));
      await sleep(200);

      // Bấm Enter để nộp đáp án đúng
      await page.keyboard.press('Enter');
      await sleep(1000);

      // Bước 4 (Hoàn thành làm thử)
      const hasActionBtn = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').toLowerCase().includes('bắt đầu chơi thật')));
      });
      results.push({ name: `[Dễ - ${vp.name}] Nhập đúng hiện nút Bắt đầu chơi thật`, pass: hasActionBtn });
      await page.screenshot({ path: `${OUT}/man10-de-${vp.name}-step4-correct.png` });

      // Bấm "Bắt đầu chơi thật" -> Spotlight biến mất
      await clickTutorialAction(page);
      await sleep(400);
      const isSpotlightClosed = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') === null;
      });
      results.push({ name: `[Dễ - ${vp.name}] Bắt đầu bài thật thành công`, pass: isSpotlightClosed });

      // Bấm nút "💡 Hướng dẫn" để mở lại giữa bài
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.innerText || '').includes('Hướng dẫn'));
        if (btn) btn.click();
      });
      await sleep(500);

      const isReopened = await page.evaluate(() => {
        return document.querySelector('[data-testid="tutorial-spotlight"]') !== null;
      });
      results.push({ name: `[Dễ - ${vp.name}] Mở lại hướng dẫn giữa bài`, pass: isReopened });

      await page.close();
    }

    // =========================================================================
    // 2. TRẠM TRUNG BÌNH: DỰNG CÂY VÀ SOI CÂY MERKLE
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookieTb = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 0, 100],
          '2': [1, 1, 3, 0, 100],
          '3': [1, 1, 3, 0, 100],
          '4': [1, 1, 3, 0, 100],
          '5': [1, 1, 3, 0, 100],
          '6': [1, 1, 3, 0, 100],
          '7': [1, 1, 3, 0, 100],
          '8': [1, 1, 3, 0, 100],
          '9': [1, 1, 3, 0, 100],
          '10': [1, 0, 3, 0, 0], // Dễ đã có 3 sao -> vào thẳng Trung bình
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 2,
        kc: [15, 15, 15, 15],
      };

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieTb)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-bac/man/10?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[TB - ${vp.name}] TutorialSpotlight đã mở thành công`);

      const titleTb0 = await page.$eval('[data-testid="tutorial-tooltip"]', (el) => el.innerText.toLowerCase());
      results.push({ name: `[TB - ${vp.name}] Bước 0 intro`, pass: titleTb0.includes('dựng cây và soi cây') });
      await page.screenshot({ path: `${OUT}/man10-tb-${vp.name}-step0.png` });

      // Next sang Bước 1 (Cây Merkle)
      await clickTutorialNext(page);
      const hasTree = await page.evaluate(() => document.querySelector('#tutorial-man10tb-tree') !== null);
      results.push({ name: `[TB - ${vp.name}] Bước 1 Cây Merkle`, pass: hasTree });

      // Next sang Bước 2 (Phép tính)
      await clickTutorialNext(page);
      const hasCalc = await page.evaluate(() => document.querySelector('#tutorial-man10tb-calc') !== null);
      results.push({ name: `[TB - ${vp.name}] Bước 2 Phép tính`, pass: hasCalc });

      // Next sang Bước 3 (Điều khiển)
      await clickTutorialNext(page);
      const hasControls = await page.evaluate(() => document.querySelector('#tutorial-man10tb-controls') !== null);
      results.push({ name: `[TB - ${vp.name}] Bước 3 Điều khiển`, pass: hasControls });

      // Next sang Bước 4 (Hoàn tất)
      await clickTutorialNext(page);
      const hasActionTb = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').includes('Bắt đầu chơi thật')));
      });
      results.push({ name: `[TB - ${vp.name}] Bước 4 Nút Bắt đầu chơi thật`, pass: hasActionTb });
      await page.screenshot({ path: `${OUT}/man10-tb-${vp.name}-step4.png` });

      // Bắt đầu chơi thật
      await clickTutorialAction(page);
      const isTbClosed = await page.evaluate(() => document.querySelector('[data-testid="tutorial-spotlight"]') === null);
      results.push({ name: `[TB - ${vp.name}] Bắt đầu bài thật thành công`, pass: isTbClosed });

      await page.close();
    }

    // =========================================================================
    // 3. TRẠM KHÓ: HOÀN THIỆN CÂY MERKLE 8 GIAO DỊCH
    // =========================================================================
    {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      const guestCookieKho = {
        v: 1,
        lv: {
          '1': [1, 1, 3, 0, 100],
          '2': [1, 1, 3, 0, 100],
          '3': [1, 1, 3, 0, 100],
          '4': [1, 1, 3, 0, 100],
          '5': [1, 1, 3, 0, 100],
          '6': [1, 1, 3, 0, 100],
          '7': [1, 1, 3, 0, 100],
          '8': [1, 1, 3, 0, 100],
          '9': [1, 1, 3, 0, 100],
          '10': [1, 0, 3, 3, 0], // Dễ & TB đều 3 sao -> vào thẳng Khó
        },
        gp: 0,
        c: 10,
        u: Date.now(),
        st: 3,
        kc: [15, 15, 15, 15],
      };

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieKho)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-bac/man/10?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.waitForSelector('[data-testid="tutorial-spotlight"]', { timeout: 8000 });
      console.log(`[Khó - ${vp.name}] TutorialSpotlight đã mở thành công`);

      const titleKho0 = await page.$eval('[data-testid="tutorial-tooltip"]', (el) => el.innerText.toLowerCase());
      results.push({ name: `[Khó - ${vp.name}] Bước 0 intro`, pass: titleKho0.includes('cây merkle 8 giao dịch') });
      await page.screenshot({ path: `${OUT}/man10-kho-${vp.name}-step0.png` });

      // Next sang Bước 1 (Bảng 8 giao dịch)
      await clickTutorialNext(page);
      const hasKhoTable = await page.evaluate(() => document.querySelector('#tutorial-man10kho-table') !== null);
      results.push({ name: `[Khó - ${vp.name}] Bước 1 Bảng 8 giao dịch`, pass: hasKhoTable });

      // Next sang Bước 2 (Cây Merkle 8 giao dịch)
      await clickTutorialNext(page);
      const hasKhoTree = await page.evaluate(() => document.querySelector('#tutorial-man10kho-tree') !== null);
      results.push({ name: `[Khó - ${vp.name}] Bước 2 Cây Merkle`, pass: hasKhoTree });

      // Next sang Bước 3 (Khay mảnh ghép)
      await clickTutorialNext(page);
      const hasKhoTray = await page.evaluate(() => document.querySelector('#tutorial-man10kho-tray') !== null);
      results.push({ name: `[Khó - ${vp.name}] Bước 3 Khay mảnh ghép`, pass: hasKhoTray });

      // Next sang Bước 4 (Nút Kiểm tra)
      await clickTutorialNext(page);
      const hasKhoCheck = await page.evaluate(() => document.querySelector('#tutorial-man10kho-check') !== null);
      results.push({ name: `[Khó - ${vp.name}] Bước 4 Nút Kiểm tra`, pass: hasKhoCheck });

      // Next sang Bước 5 (Hoàn tất)
      await clickTutorialNext(page);
      const hasActionKho = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')];
        return Boolean(buttons.some((b) => (b.innerText || '').includes('Bắt đầu chơi thật')));
      });
      results.push({ name: `[Khó - ${vp.name}] Bước 5 Nút Bắt đầu chơi thật`, pass: hasActionKho });
      await page.screenshot({ path: `${OUT}/man10-kho-${vp.name}-step5.png` });

      // Bắt đầu chơi thật
      await clickTutorialAction(page);
      const isKhoClosed = await page.evaluate(() => document.querySelector('[data-testid="tutorial-spotlight"]') === null);
      results.push({ name: `[Khó - ${vp.name}] Bắt đầu bài thật thành công`, pass: isKhoClosed });

      await page.close();
    }
  }

  await browser.close();

  console.log('\n================= TỔNG KẾT KIỂM TRA MÀN 10 =================');
  let passCount = 0;
  for (const r of results) {
    const icon = r.pass ? '✅' : '❌';
    console.log(`${icon} ${r.name}`);
    if (r.pass) passCount++;
  }
  console.log(`\nKết quả: ${passCount} / ${results.length} đạt`);
  writeFileSync(`${OUT}/ket-qua.json`, JSON.stringify(results, null, 2), 'utf-8');
}

run().catch((err) => {
  console.error('Lỗi khi chạy kiểm tra:', err);
  process.exit(1);
});
