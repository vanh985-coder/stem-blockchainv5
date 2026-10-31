import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p8b';
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

  // =========================================================================
  // PHẦN 1: MÀN 1 TRẠM TRUNG BÌNH (TÍ SỬA TRỘM - DOMINO EFFECT)
  // =========================================================================
  for (const vp of viewports) {
    console.log(`\n================= [TRUNG BÌNH] KIỂM TRA TẠI ${vp.name} =================`);

    // Cookie bắt đầu ở trạm Trung bình: lv: { "1": [1, 0, 3, 0, 0] } (Dễ đã xong 3 sao)
    const guestCookieTB = {
      v: 1,
      lv: { '1': [1, 0, 3, 0, 0] },
      gp: 0,
      c: 10,
      u: Date.now(),
      st: 1,
      kc: [0, 0, 0, 0],
    };

    // --- TEST TB 1: Nhập đúng ngay lần đầu (67) -> Chúc mừng -> Bắt đầu chơi thật
    {
      console.log(`\n[TB - ${vp.name}] Test 1: Nhập đúng 67 lần đầu`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieTB)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Đi từ bước 0 -> 1 -> 2 -> 3
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

      // Xác minh đang ở bước 3
      const step3 = await page.evaluate(() => window.__tutorial?.step);
      console.log(`[TB - ${vp.name}] Bước 3: step = ${step3}`);

      // Gõ 67 vào ô input
      await page.click('[data-tutorial="code-input"] input');
      await page.keyboard.type('67');
      await sleep(250);

      // Nộp bài bằng phím Enter trên ô nhập (chuẩn thao tác học sinh)
      await page.keyboard.press('Enter');
      await sleep(500);

      // Kiểm tra kết quả phản hồi đúng ở bước 5
      const resultCorrect = await page.evaluate(() => {
        const t = window.__tutorial;
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const startBtn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        return {
          step: t?.step,
          practiceResult: t?.practiceResult,
          hasStartBtn: !!startBtn,
        };
      });
      console.log(`[TB - ${vp.name}] Kết quả sau khi nhập 67:`, resultCorrect);

      // Chờ action button vũ trang (>400ms)
      await sleep(500);

      // Bấm "Bắt đầu chơi thật" bằng thao tác thật
      const startBtnBox = await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        if (!btn) return null;
        btn.scrollIntoView({ block: 'nearest' });
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      if (startBtnBox) {
        if (vp.hasTouch) {
          await page.touchscreen.tap(startBtnBox.x, startBtnBox.y);
        } else {
          await page.mouse.click(startBtnBox.x, startBtnBox.y);
        }
      } else {
        await page.keyboard.press('Enter');
      }
      await sleep(600);

      const isRealGame = await page.evaluate(() => !window.__tutorial?.isOpen);
      console.log(`[TB - ${vp.name}] Chuyển sang bài thật:`, isRealGame);

      results.push({
        name: `[Trung bình] Test 1 (${vp.name}): Nhập đúng 67 -> vào bài thật`,
        pass: resultCorrect.practiceResult === 'correct' && resultCorrect.hasStartBtn && isRealGame,
      });

      await page.close();
    }

    // --- TEST TB 2: Nhập sai -> Thử lại giữ số -> Sửa đúng 67
    {
      console.log(`\n[TB - ${vp.name}] Test 2: Nhập sai (15) -> Giữ số -> Sửa 67`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieTB)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

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

      // Gõ sai 15
      await page.click('[data-tutorial="code-input"] input');
      await page.keyboard.type('15');
      await sleep(200);

      // Bấm Cập nhật mã
      await page.keyboard.press('Enter');
      await sleep(400);

      const wrongState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[TB - ${vp.name}] Gõ sai 15:`, wrongState);

      // Bấm Thử lại
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        btn?.click();
      });
      await sleep(350);

      const afterRetry = await page.evaluate(() => {
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        return { val: inp?.value, step: window.__tutorial?.step };
      });
      console.log(`[TB - ${vp.name}] Sau Thử lại (giữ số):`, afterRetry);

      // Sửa thành 67
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('67');
      await sleep(200);
      await page.keyboard.press('Enter');
      await sleep(400);

      const correctState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[TB - ${vp.name}] Sửa thành 67:`, correctState);

      results.push({
        name: `[Trung bình] Test 2 (${vp.name}): Nhập sai (15) -> Giữ số -> Sửa 67 thành công`,
        pass: wrongState.result === 'wrong' && afterRetry.val === '15' && correctState.result === 'correct',
      });

      await page.close();
    }

    // --- TEST TB 3: Ô trống bấm Kiểm tra & Bỏ qua, Mở lại giữa bài
    {
      console.log(`\n[TB - ${vp.name}] Test 3: Ô trống bấm Kiểm tra & Mở lại giữa bài`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieTB)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

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

      // Ô trống bấm Cập nhật mã
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
          (b.textContent || '').includes('Cập nhật mã')
        );
        btn?.click();
      });
      await sleep(400);

      const emptyWarning = await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        return tt?.querySelector('[role="status"]')?.textContent || '';
      });
      console.log(`[TB - ${vp.name}] Cảnh báo ô trống:`, emptyWarning);

      // Bấm Bỏ qua hướng dẫn để vào bài thật
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(400);

      // Ở bài thật: gõ số 70 vào ô thật
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.type('70');
      await sleep(200);

      // Mở lại hướng dẫn giữa bài
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Hướng dẫn'));
        btn?.click();
      });
      await sleep(400);

      const reviewOpen = await page.evaluate(() => window.__tutorial?.isOpen);

      // Đóng hướng dẫn
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(400);

      const realVal = await page.evaluate(() => {
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        return inp?.value;
      });
      console.log(`[TB - ${vp.name}] Giá trị bài thật sau khi đóng hướng dẫn:`, realVal);

      results.push({
        name: `[Trung bình] Test 3 (${vp.name}): Ô trống cảnh báo rõ & Mở lại giữa bài bảo toàn bài thật`,
        pass: emptyWarning.length > 0 && reviewOpen && realVal === '70',
      });

      await page.close();
    }
  }

  // =========================================================================
  // PHẦN 2: MÀN 1 TRẠM KHÓ (ĐUA VỚI MẠNG LƯỚI)
  // =========================================================================
  for (const vp of viewports) {
    console.log(`\n================= [KHÓ] KIỂM TRA TẠI ${vp.name} =================`);

    // Cookie bắt đầu ở trạm Khó: lv: { "1": [1, 0, 3, 3, 0] } (Dễ và TB đã xong 3 sao)
    const guestCookieKho = {
      v: 1,
      lv: { '1': [1, 0, 3, 3, 0] },
      gp: 0,
      c: 20,
      u: Date.now(),
      st: 1,
      kc: [0, 0, 0, 0],
    };

    // --- TEST KHÓ 1: Đồng hồ dừng trong hướng dẫn -> Nhập đúng 55 -> Bắt đầu chơi thật
    {
      console.log(`\n[Khó - ${vp.name}] Test 1: Đồng hồ dừng & Nhập đúng 55`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieKho)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Đọc thời gian đồng hồ ban đầu trong hướng dẫn
      const t0 = await page.evaluate(() => {
        const timerText = document.querySelector('[role="timer"]')?.textContent;
        return {
          isPaused: window.__hardTimer?.isPaused,
          text: timerText,
        };
      });
      await sleep(1500); // Chờ 1.5s xem đồng hồ có bị chạy ngầm không
      const t1 = await page.evaluate(() => {
        const timerText = document.querySelector('[role="timer"]')?.textContent;
        return {
          isPaused: window.__hardTimer?.isPaused,
          text: timerText,
        };
      });
      console.log(`[Khó - ${vp.name}] Kiểm tra đồng hồ trong hướng dẫn:`, { t0, t1 });
      const timerStoppedInTutorial = t0.isPaused === true && t0.text === t1.text;

      // Đi tới bước 3
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

      // Gõ 55 vào ô input
      await page.click('[data-tutorial="code-input"] input');
      await page.keyboard.type('55');
      await sleep(250);

      // Bấm nút "Cập nhật mã"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
          (b.textContent || '').includes('Cập nhật mã')
        );
        btn?.click();
      });
      await sleep(400);

      const resultCorrect = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Khó - ${vp.name}] Kết quả gõ 55:`, resultCorrect);

      // Bấm "Bắt đầu chơi thật"
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        btn?.click();
      });
      await sleep(600);

      // Xác minh bài thật bắt đầu và đồng hồ bắt đầu chạy
      const realGameState = await page.evaluate(() => ({
        tutorialClosed: !window.__tutorial?.isOpen,
        isPaused: window.__hardTimer?.isPaused,
      }));
      console.log(`[Khó - ${vp.name}] Trạng thái sau Bắt đầu chơi thật:`, realGameState);

      results.push({
        name: `[Khó] Test 1 (${vp.name}): Đồng hồ dừng trong hướng dẫn & Nhập đúng 55 -> vào bài thật`,
        pass: timerStoppedInTutorial && resultCorrect.result === 'correct' && realGameState.tutorialClosed && !realGameState.isPaused,
      });

      await page.close();
    }

    // --- TEST KHÓ 2: Nhập sai (20) -> Giữ số -> Sửa 55
    {
      console.log(`\n[Khó - ${vp.name}] Test 2: Nhập sai (20) -> Giữ số -> Sửa 55`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieKho)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

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

      // Gõ sai 20
      await page.click('[data-tutorial="code-input"] input');
      await page.keyboard.type('20');
      await sleep(200);

      await page.keyboard.press('Enter');
      await sleep(400);

      const wrongState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Khó - ${vp.name}] Gõ sai 20:`, wrongState);

      // Bấm Thử lại
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        btn?.click();
      });
      await sleep(350);

      const afterRetry = await page.evaluate(() => {
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        return inp?.value;
      });
      console.log(`[Khó - ${vp.name}] Sau Thử lại (giữ số 20):`, afterRetry);

      // Sửa thành 55
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('55');
      await sleep(200);
      await page.keyboard.press('Enter');
      await sleep(400);

      const correctState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Khó - ${vp.name}] Sửa thành 55:`, correctState);

      results.push({
        name: `[Khó] Test 2 (${vp.name}): Nhập sai (20) -> Giữ số -> Sửa 55 thành công`,
        pass: wrongState.result === 'wrong' && afterRetry === '20' && correctState.result === 'correct',
      });

      await page.close();
    }

    // --- TEST KHÓ 3: Mở lại giữa bài tạm dừng đồng hồ & đóng hướng dẫn tiếp tục thời gian còn lại
    {
      console.log(`\n[Khó - ${vp.name}] Test 3: Mở lại giữa bài tạm dừng đồng hồ`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieKho)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Bỏ qua hướng dẫn để vào bài thật
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(2500); // Cho đồng hồ bài thật đếm ngược khoảng 2-3 giây

      const beforePause = await page.evaluate(() => {
        const timerText = document.querySelector('[role="timer"]')?.textContent;
        return timerText;
      });
      console.log(`[Khó - ${vp.name}] Thời gian bài thật trước khi mở Hướng dẫn:`, beforePause);

      // Bấm nút "💡 Hướng dẫn" giữa bài
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Hướng dẫn'));
        btn?.click();
      });
      await sleep(400);

      const isPausedInReview = await page.evaluate(() => window.__hardTimer?.isPaused);
      await sleep(1500); // Chờ 1.5s xem đồng hồ có đứng yên không
      const duringPause = await page.evaluate(() => document.querySelector('[role="timer"]')?.textContent);
      console.log(`[Khó - ${vp.name}] Thời gian khi mở Hướng dẫn:`, duringPause);
      const timerHeldDuringReview = isPausedInReview && beforePause === duringPause;

      // Đóng hướng dẫn
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(1500); // Tiếp tục chạy bài thật 1.5s

      const afterResume = await page.evaluate(() => document.querySelector('[role="timer"]')?.textContent);
      console.log(`[Khó - ${vp.name}] Thời gian sau khi đóng Hướng dẫn tiếp tục:`, afterResume);

      results.push({
        name: `[Khó] Test 3 (${vp.name}): Mở lại giữa bài tạm dừng đồng hồ & đóng tiếp tục đúng thời gian`,
        pass: timerHeldDuringReview && afterResume !== duringPause,
      });

      await page.close();
    }
  }

  // =========================================================================
  // PHẦN 3: KIỂM HỒI QUY MÀN 1 DỄ (DÙNG CHUNG TUTORIAL SPOTLIGHT)
  // =========================================================================
  {
    console.log(`\n================= KIỂM HỒI QUY MÀN 1 DỄ =================`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify({ v: 1, lv: {}, gp: 0, c: 0, u: Date.now(), st: 1, kc: [0, 0, 0, 0] })),
      url: BASE_URL,
    });
    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

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
      await sleep(300);
    }

    await page.click('[data-tutorial="code-input"] input');
    await page.keyboard.type('29');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(400);

    const deResult = await page.evaluate(() => ({
      step: window.__tutorial?.step,
      result: window.__tutorial?.practiceResult,
    }));
    console.log('Hồi quy Màn 1 Dễ nhập 29:', deResult);

    results.push({
      name: 'Hồi quy Màn 1 Dễ: Nhập đúng 29 hoạt động bình thường',
      pass: deResult.result === 'correct',
    });

    await page.close();
  }

  // =========================================================================
  // PHẦN 4: KIỂM TRA COOKIE TIẾN ĐỘ THẬT KHÔNG BỊ ẢNH HƯỞNG
  // =========================================================================
  {
    console.log(`\n================= KIỂM TRA COOKIE TIẾN ĐỘ =================`);
    const page = await browser.newPage();
    const guestCookieInitial = {
      v: 1,
      lv: { '1': [1, 0, 3, 0, 0] },
      gp: 0,
      c: 10,
      u: 1793400000000,
      st: 1,
      kc: [0, 0, 0, 0],
    };
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookieInitial)),
      url: BASE_URL,
    });
    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // Chơi làm thử 67
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
      await sleep(250);
    }
    await page.click('[data-tutorial="code-input"] input');
    await page.keyboard.type('67');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(400);

    const cookies = await page.cookies();
    const guestCookie = cookies.find((c) => c.name === 'sc_guest');
    const parsed = guestCookie ? JSON.parse(decodeURIComponent(guestCookie.value)) : null;
    console.log('Cookie sc_guest sau khi làm thử:', parsed);

    const untouched = parsed && parsed.c === 10 && parsed.lv['1'][3] === 0; // sao tb vẫn là 0
    results.push({
      name: 'Kiểm tra cookie sc_guest: làm thử không tự ý cộng sao hay xu',
      pass: !!untouched,
    });

    await page.close();
  }

  await browser.close();

  console.log('\n==============================================');
  console.log('              TỔNG HỢP KẾT QUẢ KIỂM TRA P8b     ');
  console.log('==============================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (!r.pass) allPassed = false;
  }
  console.log(`\nKết luận: ${allPassed ? `TẤT CẢ ${results.length}/${results.length} TEST ĐẠT HOÀN TOÀN!` : 'CÓ TEST THẤT BẠI'}`);

  writeFileSync(`${OUT}/ket-qua-p8b-e2e.json`, JSON.stringify(results, null, 2), 'utf-8');
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
