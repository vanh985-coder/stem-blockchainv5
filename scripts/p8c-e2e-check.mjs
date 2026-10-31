import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p8c';
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
  // PHẦN 1: MÀN 4 TRẠM DỄ (DUYỆT TRANG MỚI - ĐỒNG Ý / TỪ CHỐI)
  // =========================================================================
  for (const vp of viewports) {
    console.log(`\n================= [DỄ] KIỂM TRA TẠI ${vp.name} =================`);

    // Cookie bắt đầu Màn 4 Dễ: Màn 1-3 đã xong
    const guestCookieDe = {
      v: 1,
      lv: { '1': [1, 1, 3, 0, 100], '2': [1, 1, 3, 0, 100], '3': [1, 1, 3, 0, 100] },
      gp: 0,
      c: 10,
      u: Date.now(),
      st: 1,
      kc: [0, 0, 0, 0],
    };

    // --- TEST DỄ 1: Chọn đúng "Đồng ý" (do X = 40, c = 15, code = 95) -> Chúc mừng -> Bắt đầu chơi thật
    {
      console.log(`\n[Dễ - ${vp.name}] Test 1: Chọn đúng Đồng ý`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieDe)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Đi từ bước 0 -> 1 -> 2 -> 3 -> 4
      for (let s = 0; s < 4; s++) {
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find(
            (b) =>
              (b.textContent || '').includes('Tiếp') ||
              (b.textContent || '').includes('Đã hiểu') ||
              (b.textContent || '').includes('Thử tính ngay') ||
              (b.textContent || '').includes('Xem quyết định')
          );
          btn?.click();
        });
        await sleep(350);
      }

      const stepBeforeDecide = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        isOpen: window.__tutorial?.isOpen,
      }));
      console.log(`[Dễ - ${vp.name}] Bước trước biểu quyết:`, stepBeforeDecide);

      // Nhấp nút "Đồng ý" bằng thao tác chuột / chạm thật
      const agreeBtnBox = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="decision-buttons"] button')].find((b) =>
          (b.textContent || '').includes('Đồng ý')
        );
        if (!btn) return null;
        btn.scrollIntoView({ block: 'center', inline: 'center' });
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      if (agreeBtnBox) {
        if (vp.hasTouch) {
          await page.touchscreen.tap(agreeBtnBox.x, agreeBtnBox.y);
        } else {
          await page.mouse.click(agreeBtnBox.x, agreeBtnBox.y);
        }
      }
      await sleep(400);

      const afterAgree = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Dễ - ${vp.name}] Sau khi bấm Đồng ý:`, afterAgree);

      // Bấm "Bắt đầu chơi thật"
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        btn?.click();
      });
      await sleep(500);

      const realGameState = await page.evaluate(() => ({
        tutorialOpen: window.__tutorial?.isOpen,
        hasSpotlight: Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')),
        hearts: document.querySelectorAll('[role="img"][aria-label*="tim"]').length,
      }));
      console.log(`[Dễ - ${vp.name}] Trạng thái bài thật:`, realGameState);

      results.push({
        name: `[Dễ] Test 1 (${vp.name}): Chọn đúng Đồng ý -> Vào bài thật sạch`,
        pass: afterAgree.result === 'correct' && realGameState.tutorialOpen === false && !realGameState.hasSpotlight,
      });

      await page.close();
    }

    // --- TEST DỄ 2: Chọn sai "Từ chối" -> Phản hồi sai -> Thử lại -> Chọn "Đồng ý" thành công
    {
      console.log(`\n[Dễ - ${vp.name}] Test 2: Chọn sai Từ chối -> Thử lại -> Chọn Đồng ý`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieDe)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Đi tới bước 4
      await page.evaluate(() => window.__tutorial?.setStep(4));
      await sleep(300);

      // Bấm "Từ chối"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="decision-buttons"] button')].find((b) =>
          (b.textContent || '').includes('Từ chối')
        );
        btn?.click();
      });
      await sleep(400);

      const wrongState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Dễ - ${vp.name}] Sau khi bấm Từ chối (sai):`, wrongState);

      // Bấm "Thử lại"
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        btn?.click();
      });
      await sleep(350);

      const afterRetry = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Dễ - ${vp.name}] Sau khi bấm Thử lại:`, afterRetry);

      // Bấm "Đồng ý"
      await page.evaluate(() => window.__tutorial?.decide(true));
      await sleep(400);

      const correctState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Dễ - ${vp.name}] Bấm Đồng ý lần 2:`, correctState);

      results.push({
        name: `[Dễ] Test 2 (${vp.name}): Chọn sai (Từ chối) -> Thử lại -> Chọn Đồng ý thành công`,
        pass: wrongState.result === 'wrong' && afterRetry.step === 4 && correctState.result === 'correct',
      });

      await page.close();
    }

    // --- TEST DỄ 3: Bỏ qua và Mở lại giữa bài bảo toàn bài thật
    {
      console.log(`\n[Dễ - ${vp.name}] Test 3: Bỏ qua và Mở lại giữa bài`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieDe)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Bấm Bỏ qua hướng dẫn
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(400);

      const skippedState = await page.evaluate(() => ({
        isOpen: window.__tutorial?.isOpen,
        hasSpotlight: Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')),
      }));

      // Bấm mở lại "💡 Hướng dẫn"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) =>
          (b.textContent || '').includes('Hướng dẫn') || (b.getAttribute('aria-label') || '').includes('Hướng dẫn')
        );
        btn?.click();
      });
      await sleep(400);

      const reopenedState = await page.evaluate(() => ({
        isOpen: window.__tutorial?.isOpen,
        hasSpotlight: Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')),
        step: window.__tutorial?.step,
      }));

      // Đóng hướng dẫn lại
      await page.evaluate(() => window.__tutorial?.skip());
      await sleep(350);

      const finalState = await page.evaluate(() => ({
        isOpen: window.__tutorial?.isOpen,
        hasSpotlight: Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')),
      }));

      results.push({
        name: `[Dễ] Test 3 (${vp.name}): Bỏ qua -> Mở lại giữa bài -> Bảo toàn nguyên vẹn`,
        pass: skippedState.isOpen === false && reopenedState.isOpen === true && finalState.isOpen === false,
      });

      await page.close();
    }
  }

  // =========================================================================
  // PHẦN 2: MÀN 4 TRẠM TRUNG BÌNH (SO SỔ TRƯỚC KHI DUYỆT - TÍ SỬA LÉN)
  // =========================================================================
  for (const vp of viewports) {
    console.log(`\n================= [TRUNG BÌNH] KIỂM TRA TẠI ${vp.name} =================`);

    // Cookie bắt đầu Màn 4 Trung bình: Màn 4 Dễ đã xong 3 sao
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

    // --- TEST TB 1: Chọn đúng "Từ chối" (vì Tí sửa lén trang 2 từ 14 sang 15) -> Chúc mừng -> Vào bài thật
    {
      console.log(`\n[TB - ${vp.name}] Test 1: Chọn đúng Từ chối`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieTb)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Đi tới bước 4
      for (let s = 0; s < 4; s++) {
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find(
            (b) =>
              (b.textContent || '').includes('Tiếp') ||
              (b.textContent || '').includes('Đã hiểu') ||
              (b.textContent || '').includes('Thử tính ngay') ||
              (b.textContent || '').includes('Xem quyết định')
          );
          btn?.click();
        });
        await sleep(350);
      }

      // Nhấp nút "Từ chối" bằng thao tác thật
      const rejectBtnBox = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="decision-buttons"] button')].find((b) =>
          (b.textContent || '').includes('Từ chối')
        );
        if (!btn) return null;
        btn.scrollIntoView({ block: 'center', inline: 'center' });
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      if (rejectBtnBox) {
        if (vp.hasTouch) {
          await page.touchscreen.tap(rejectBtnBox.x, rejectBtnBox.y);
        } else {
          await page.mouse.click(rejectBtnBox.x, rejectBtnBox.y);
        }
      }
      await sleep(400);

      const afterReject = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[TB - ${vp.name}] Sau khi bấm Từ chối:`, afterReject);

      // Bấm "Bắt đầu chơi thật"
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        btn?.click();
      });
      await sleep(500);

      const realGameState = await page.evaluate(() => ({
        tutorialOpen: window.__tutorial?.isOpen,
        hasSpotlight: Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')),
      }));

      results.push({
        name: `[Trung bình] Test 1 (${vp.name}): Chọn đúng Từ chối -> Vào bài thật sạch`,
        pass: afterReject.result === 'correct' && realGameState.tutorialOpen === false && !realGameState.hasSpotlight,
      });

      await page.close();
    }

    // --- TEST TB 2: Chọn sai "Đồng ý" -> Phản hồi sai -> Thử lại -> Chọn "Từ chối" thành công
    {
      console.log(`\n[TB - ${vp.name}] Test 2: Chọn sai Đồng ý -> Thử lại -> Chọn Từ chối`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieTb)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.evaluate(() => window.__tutorial?.setStep(4));
      await sleep(300);

      // Bấm "Đồng ý" (sai)
      await page.evaluate(() => window.__tutorial?.decide(true));
      await sleep(400);

      const wrongState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[TB - ${vp.name}] Sau khi bấm Đồng ý (sai):`, wrongState);

      // Bấm "Thử lại"
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        btn?.click();
      });
      await sleep(350);

      // Bấm "Từ chối"
      await page.evaluate(() => window.__tutorial?.decide(false));
      await sleep(400);

      const correctState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[TB - ${vp.name}] Bấm Từ chối lần 2:`, correctState);

      results.push({
        name: `[Trung bình] Test 2 (${vp.name}): Chọn sai (Đồng ý) -> Thử lại -> Chọn Từ chối thành công`,
        pass: wrongState.result === 'wrong' && correctState.result === 'correct',
      });

      await page.close();
    }
  }

  // =========================================================================
  // PHẦN 3: MÀN 4 TRẠM KHÓ (PROOF OF STAKE - ĐẶT CỌC & TẠO TRANG)
  // =========================================================================
  for (const vp of viewports) {
    console.log(`\n================= [KHÓ] KIỂM TRA TẠI ${vp.name} =================`);

    // Cookie bắt đầu Màn 4 Khó: Màn 4 Dễ + TB đã xong 3 sao
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

    // --- TEST KHÓ 1: Nhập đúng 68 ngay lần đầu -> Chúc mừng -> Vào bài thật
    {
      console.log(`\n[Khó - ${vp.name}] Test 1: Nhập đúng 68 lần đầu`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieKho)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
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

      const stepBeforeInput = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        isOpen: window.__tutorial?.isOpen,
      }));
      console.log(`[Khó - ${vp.name}] Bước nhập:`, stepBeforeInput);

      // Nhập 68 vào ô mã trang bằng bàn phím
      await page.waitForSelector('[data-tutorial="honest-card"] input', { timeout: 5000 });
      await page.focus('[data-tutorial="honest-card"] input');
      await page.keyboard.type('68');
      await sleep(200);

      // Bấm "Gửi trang"
      const submitBtnBox = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="honest-card"] button')].find((b) =>
          (b.textContent || '').includes('Gửi trang')
        );
        if (!btn) return null;
        btn.scrollIntoView({ block: 'center', inline: 'center' });
        const r = btn.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });

      if (submitBtnBox) {
        if (vp.hasTouch) {
          await page.touchscreen.tap(submitBtnBox.x, submitBtnBox.y);
        } else {
          await page.mouse.click(submitBtnBox.x, submitBtnBox.y);
        }
      }
      await sleep(400);

      const afterSubmit = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Khó - ${vp.name}] Sau khi gửi 68:`, afterSubmit);

      // Bấm "Bắt đầu chơi thật"
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        btn?.click();
      });
      await sleep(500);

      const realGameState = await page.evaluate(() => ({
        tutorialOpen: window.__tutorial?.isOpen,
        hasSpotlight: Boolean(document.querySelector('[data-testid="tutorial-spotlight"]')),
        hasStakePanel: Boolean(document.querySelector('[data-tutorial="stake-panel"]')),
      }));

      results.push({
        name: `[Khó] Test 1 (${vp.name}): Nhập đúng 68 -> Vào bài thật sạch`,
        pass: afterSubmit.result === 'correct' && realGameState.tutorialOpen === false && !realGameState.hasSpotlight,
      });

      await page.close();
    }

    // --- TEST KHÓ 2: Ô trống -> Cảnh báo -> Nhập sai 50 -> Thử lại giữ số -> Sửa thành 68
    {
      console.log(`\n[Khó - ${vp.name}] Test 2: Ô trống -> Sai 50 -> Giữ số -> Sửa 68`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookieKho)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      await page.waitForSelector('[data-tutorial="honest-card"] input', { timeout: 5000 });
      await page.evaluate(() => window.__tutorial?.setStep(3));
      await sleep(300);

      // Ô trống bấm Gửi trang -> Cảnh báo
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="honest-card"] button')].find((b) =>
          (b.textContent || '').includes('Gửi trang')
        );
        btn?.click();
      });
      await sleep(300);

      const emptyAlert = await page.evaluate(() => {
        const err = document.querySelector('[role="alert"]');
        return err ? err.textContent : null;
      });
      console.log(`[Khó - ${vp.name}] Cảnh báo ô trống:`, emptyAlert);

      // Nhập sai 50
      await page.focus('[data-tutorial="honest-card"] input');
      await page.keyboard.type('50');
      await sleep(200);
      await page.keyboard.press('Enter');
      await sleep(400);

      const wrongState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Khó - ${vp.name}] Sau khi gửi sai 50:`, wrongState);

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
        const inp = document.querySelector('[data-tutorial="honest-card"] input');
        return { val: inp?.value, step: window.__tutorial?.step };
      });
      console.log(`[Khó - ${vp.name}] Sau Thử lại (giữ số 50):`, afterRetry);

      // Sửa thành 68
      await page.focus('[data-tutorial="honest-card"] input');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('68');
      await sleep(200);
      await page.keyboard.press('Enter');
      await sleep(400);

      const correctState = await page.evaluate(() => ({
        step: window.__tutorial?.step,
        result: window.__tutorial?.practiceResult,
      }));
      console.log(`[Khó - ${vp.name}] Sửa thành 68:`, correctState);

      results.push({
        name: `[Khó] Test 2 (${vp.name}): Ô trống -> Sai (50) -> Giữ số -> Sửa 68 thành công`,
        pass:
          Boolean(emptyAlert) &&
          wrongState.result === 'wrong' &&
          afterRetry.val === '50' &&
          correctState.result === 'correct',
      });

      await page.close();
    }
  }

  // =========================================================================
  // PHẦN 4: KIỂM TRA COOKIE TIẾN ĐỘ THẬT (sc_guest không bị ghi bậy)
  // =========================================================================
  {
    console.log(`\n================= KIỂM TRA COOKIE TIẾN ĐỘ KHÁCH =================`);
    const page = await browser.newPage();
    const guestCookie = {
      v: 1,
      lv: { '1': [1, 1, 3, 0, 100], '2': [1, 1, 3, 0, 100], '3': [1, 1, 3, 0, 100] },
      gp: 0,
      c: 10,
      u: Date.now(),
      st: 1,
      kc: [0, 0, 0, 0],
    };
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_URL,
    });

    await page.goto(`${BASE_URL}/lang/lang-det/man/4?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // Bấm Đồng ý trong làm thử
    await page.evaluate(() => window.__tutorial?.setStep(4));
    await sleep(200);
    await page.evaluate(() => window.__tutorial?.decide(true));
    await sleep(300);

    const cookies = await page.cookies();
    const sc = cookies.find((c) => c.name === 'sc_guest');
    const parsed = sc ? JSON.parse(decodeURIComponent(sc.value)) : null;

    // Xác minh không có bản ghi hoàn thành màn 4 hoặc cờ gian lận
    const m4Progress = parsed?.lv?.['4'];
    const isClean = !m4Progress || (m4Progress[0] === 0 && m4Progress[1] === 0);

    console.log('Tiến độ cookie sau khi làm thử Màn 4:', parsed?.lv);
    results.push({
      name: `[Bảo toàn] Làm thử không tự ý trao thưởng hay ghi nhận tiến độ Màn 4`,
      pass: isClean,
    });

    await page.close();
  }

  await browser.close();

  console.log('\n================= TỔNG KẾT KIỂM TRA P8C =================');
  let allPass = true;
  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    console.log(`${icon} ${r.name}`);
    if (!r.pass) allPass = false;
  }

  writeFileSync(`${OUT}/ket-qua-p8c-e2e.json`, JSON.stringify(results, null, 2));
  console.log(`\nĐã ghi kết quả vào ${OUT}/ket-qua-p8c-e2e.json`);

  if (!allPass) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
