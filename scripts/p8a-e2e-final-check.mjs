import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE_URL = 'http://localhost:5193';
const OUT = 'docs/screenshots/p8a';
mkdirSync(OUT, { recursive: true });

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
];
const chromePath = CHROME_PATHS.find((p) => p && existsSync(p));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const GUEST_COOKIE = {
  v: 1,
  lv: {},
  gp: 0,
  c: 0,
  u: Date.now(),
  st: 1,
  kc: [0, 0, 0, 0],
};

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

  for (const vp of viewports) {
    console.log(`\n================= BẮT ĐẦU KIỂM TRA TẠI ${vp.name} =================`);

    // ==========================================
    // TEST 1: NHẬP ĐÚNG NGAY LẦN ĐẦU (GÕ 29 -> KIỂM TRA -> CHÍNH XÁC -> BẮT ĐẦU CHƠI THẬT)
    // ==========================================
    {
      console.log(`\n[${vp.name}] Test 1: Nhập đúng ngay lần đầu (29)`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(GUEST_COOKIE)),
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

      // Xác minh đang ở bước 3 (nhập số)
      const step3Info = await page.evaluate(() => {
        const t = window.__tutorial;
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        const r = inp?.getBoundingClientRect();
        return {
          step: t?.step,
          inputExists: !!inp,
          inputRect: r ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right } : null,
        };
      });
      console.log(`[${vp.name}] Bước 3:`, step3Info);

      // Gõ 29 vào ô input bằng tương tác thật
      if (vp.hasTouch) {
        await page.touchscreen.tap(
          step3Info.inputRect.left + (step3Info.inputRect.right - step3Info.inputRect.left) / 2,
          step3Info.inputRect.top + (step3Info.inputRect.bottom - step3Info.inputRect.top) / 2
        );
      } else {
        await page.click('[data-tutorial="code-input"] input');
      }
      await page.keyboard.type('29');
      await sleep(300);

      // Kiểm tra giá trị ô input
      const valAfterType = await page.evaluate(() => {
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        return inp?.value;
      });
      console.log(`[${vp.name}] Giá trị sau khi gõ: ${valAfterType}`);

      // Bấm nút "Kiểm tra" bằng click thật
      const checkBtnInfo = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
          (b.textContent || '').includes('Kiểm tra')
        );
        const r = btn?.getBoundingClientRect();
        return {
          exists: !!btn,
          cx: r ? r.left + r.width / 2 : 0,
          cy: r ? r.top + r.height / 2 : 0,
        };
      });

      if (vp.hasTouch) {
        await page.touchscreen.tap(checkBtnInfo.cx, checkBtnInfo.cy);
      } else {
        await page.mouse.click(checkBtnInfo.cx, checkBtnInfo.cy);
      }
      await sleep(500);

      // Kiểm tra kết quả phản hồi đúng ở bước 5
      const resultCorrect = await page.evaluate(() => {
        const t = window.__tutorial;
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const actionBtn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        return {
          step: t?.step,
          practiceResult: t?.practiceResult,
          hasStartBtn: !!actionBtn,
          tooltipText: tt?.textContent || '',
        };
      });
      console.log(`[${vp.name}] Kết quả sau khi bấm Kiểm tra 29:`, {
        step: resultCorrect.step,
        practiceResult: resultCorrect.practiceResult,
        hasStartBtn: resultCorrect.hasStartBtn,
      });

      await page.screenshot({ path: `${OUT}/test1-correct-${vp.name}.png` });

      // Bấm nút "Bắt đầu chơi thật"
      const startBtnPoint = await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const btn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        const r = btn?.getBoundingClientRect();
        return { cx: r ? r.left + r.width / 2 : 0, cy: r ? r.top + r.height / 2 : 0 };
      });

      if (vp.hasTouch) {
        await page.touchscreen.tap(startBtnPoint.cx, startBtnPoint.cy);
      } else {
        await page.mouse.click(startBtnPoint.cx, startBtnPoint.cy);
      }
      await sleep(600);

      // Xác minh đã vào bài thật
      const isRealGame = await page.evaluate(() => {
        const t = window.__tutorial;
        const realInput = document.querySelector('[data-tutorial="code-input"] input');
        return {
          tutorialClosed: !t?.isOpen,
          realInputActive: !!realInput,
        };
      });
      console.log(`[${vp.name}] Trạng thái sau Bắt đầu chơi thật:`, isRealGame);

      results.push({
        name: `Test 1 (${vp.name}): Nhập đúng 29 -> vào bài thật`,
        pass: resultCorrect.practiceResult === 'correct' && resultCorrect.hasStartBtn && isRealGame.tutorialClosed,
      });

      await page.close();
    }

    // ==========================================
    // TEST 2: NHẬP SAI 2 LẦN -> THỬ LẠI -> SỬA ĐÚNG (GÕ 15 -> SAI -> THỬ LẠI -> GIỮ 15 -> SỬA 16 -> SAI -> THỬ LẠI -> SỬA 29 -> ĐÚNG)
    // ==========================================
    {
      console.log(`\n[${vp.name}] Test 2: Nhập sai 2 lần rồi sửa đúng (15 -> 16 -> 29)`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(GUEST_COOKIE)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

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

      // Lần 1: Gõ 15
      await page.click('[data-tutorial="code-input"] input');
      await page.keyboard.type('15');
      await sleep(250);

      // Bấm Kiểm tra lần 1
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
          (b.textContent || '').includes('Kiểm tra')
        );
        btn?.click();
      });
      await sleep(400);

      // Kiểm tra kết quả sai lần 1 và có nút "Thử lại"
      const wrong1Info = await page.evaluate(() => {
        const t = window.__tutorial;
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const retryBtn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        return {
          step: t?.step,
          practiceResult: t?.practiceResult,
          hasRetryBtn: !!retryBtn,
          practiceVal: t?.practiceVal,
        };
      });
      console.log(`[${vp.name}] Kết quả sau gõ 15:`, wrong1Info);

      // Bấm "Thử lại"
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const retryBtn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        retryBtn?.click();
      });
      await sleep(400);

      // Kiểm tra quay lại bước 3 VÀ GIỮ NGUYÊN GIÁ TRỊ 15 (không xóa trắng)
      const afterRetry1 = await page.evaluate(() => {
        const t = window.__tutorial;
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        return {
          step: t?.step,
          val: inp?.value,
          practiceVal: t?.practiceVal,
        };
      });
      console.log(`[${vp.name}] Sau Thử lại lần 1 (yêu cầu giữ 15):`, afterRetry1);

      // Lần 2: Sửa 15 thành 16 (Backspace 1 lần, gõ 6)
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('6');
      await sleep(250);

      // Bấm Kiểm tra lần 2 bằng phím Enter trong ô input
      await page.keyboard.press('Enter');
      await sleep(400);

      const wrong2Info = await page.evaluate(() => {
        const t = window.__tutorial;
        return {
          step: t?.step,
          practiceResult: t?.practiceResult,
          practiceVal: t?.practiceVal,
        };
      });
      console.log(`[${vp.name}] Kết quả sau gõ 16 (bằng phím Enter):`, wrong2Info);

      // Bấm "Thử lại" lần 2
      await page.evaluate(() => {
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const retryBtn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        retryBtn?.click();
      });
      await sleep(400);

      // Lần 3: Sửa 16 thành 29 (select all / backspace x2, gõ 29)
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.type('29');
      await sleep(250);

      // Bấm Kiểm tra lần 3
      await page.keyboard.press('Enter');
      await sleep(400);

      const finalCorrectInfo = await page.evaluate(() => {
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
      console.log(`[${vp.name}] Kết quả sửa thành 29:`, finalCorrectInfo);

      results.push({
        name: `Test 2 (${vp.name}): Nhập sai 2 lần (15 -> 16) -> giữ số -> sửa 29 thành công`,
        pass:
          wrong1Info.practiceResult === 'wrong' &&
          afterRetry1.val === '15' &&
          wrong2Info.practiceResult === 'wrong' &&
          finalCorrectInfo.practiceResult === 'correct' &&
          finalCorrectInfo.hasStartBtn,
      });

      await page.close();
    }

    // ==========================================
    // TEST 3: Ô TRỐNG RỒI BẤM KIỂM TRA (KHÔNG BỊ KẸT, HIỆN CẢNH BÁO RÕ, SỬA ĐƯỢC TIẾP)
    // ==========================================
    {
      console.log(`\n[${vp.name}] Test 3: Ô trống rồi bấm Kiểm tra`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(GUEST_COOKIE)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

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

      // Ô đang trống (chưa nhập gì), chuyển tiếp sang bước 4
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Tiếp')
        );
        btn?.click();
      });
      await sleep(350);

      // Bấm nút "Kiểm tra" khi ô trống
      const checkBtnInfo = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
          (b.textContent || '').includes('Kiểm tra')
        );
        const r = btn?.getBoundingClientRect();
        return { cx: r ? r.left + r.width / 2 : 0, cy: r ? r.top + r.height / 2 : 0 };
      });

      if (vp.hasTouch) {
        await page.touchscreen.tap(checkBtnInfo.cx, checkBtnInfo.cy);
      } else {
        await page.mouse.click(checkBtnInfo.cx, checkBtnInfo.cy);
      }
      await sleep(500);

      // Kiểm tra cảnh báo hiển thị rõ ràng, không bị kẹt vô tận
      const emptyCheckState = await page.evaluate(() => {
        const t = window.__tutorial;
        const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        const errText = document.querySelector('[data-tutorial="code-input"] [role="alert"]')?.textContent;
        const statusText = tt?.querySelector('[role="status"]')?.textContent;
        return {
          step: t?.step,
          isInputActive: document.activeElement === inp,
          statusText: statusText || '',
          errText: errText || '',
        };
      });
      console.log(`[${vp.name}] Trạng thái sau khi bấm Kiểm tra với ô trống:`, emptyCheckState);

      // Thao tác gõ số 29 ngay sau cảnh báo để xác minh không kẹt
      await page.keyboard.type('29');
      await sleep(250);
      await page.keyboard.press('Enter');
      await sleep(400);

      const resolvedState = await page.evaluate(() => {
        const t = window.__tutorial;
        return {
          step: t?.step,
          practiceResult: t?.practiceResult,
        };
      });
      console.log(`[${vp.name}] Nhập 29 sau cảnh báo ô trống:`, resolvedState);

      results.push({
        name: `Test 3 (${vp.name}): Ô trống bấm Kiểm tra -> có cảnh báo rõ -> gõ 29 tiếp không kẹt`,
        pass: emptyCheckState.step === 3 && (emptyCheckState.statusText.length > 0 || emptyCheckState.errText.length > 0) && resolvedState.practiceResult === 'correct',
      });

      await page.close();
    }

    // ==========================================
    // TEST 4: BỎ QUA HƯỚNG DẪN & MỞ LẠI GIỮA BÀI (BẢO LƯU TIẾN ĐỘ THẬT)
    // ==========================================
    {
      console.log(`\n[${vp.name}] Test 4: Bỏ qua hướng dẫn & mở lại giữa bài`);
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h, isMobile: vp.isMobile, hasTouch: vp.hasTouch });
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(GUEST_COOKIE)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // Bấm "Bỏ qua hướng dẫn" ở tooltip
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(400);

      const tutorialClosed = await page.evaluate(() => !window.__tutorial?.isOpen);
      console.log(`[${vp.name}] Đã bấm Bỏ qua hướng dẫn, tutorial đóng:`, tutorialClosed);

      // Ở bài thật: gõ số 25 vào ô thật (để tạo trạng thái bài dở)
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.type('25');
      await sleep(300);

      // Bấm nút "💡 Hướng dẫn" để mở lại
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Hướng dẫn'));
        btn?.click();
      });
      await sleep(400);

      const reviewOpen = await page.evaluate(() => window.__tutorial?.isOpen);
      console.log(`[${vp.name}] Mở lại hướng dẫn giữa bài:`, reviewOpen);

      // Bấm "Bỏ qua" để đóng hướng dẫn
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(400);

      // Xác minh bài thật giữ nguyên giá trị '25'
      const realValPreserved = await page.evaluate(() => {
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        return inp?.value;
      });
      console.log(`[${vp.name}] Giá trị bài thật sau khi đóng hướng dẫn: ${realValPreserved}`);

      results.push({
        name: `Test 4 (${vp.name}): Bỏ qua hướng dẫn & mở lại giữa bài bảo toàn bài thật`,
        pass: tutorialClosed && reviewOpen && realValPreserved === '25',
      });

      await page.close();
    }
  }

  // ==========================================
  // TEST 5: KIỂM TRA TIẾN ĐỘ THẬT (KHÔNG CỘNG XU, KHÔNG PHẦN THƯỞNG KHI CHỈ LÀM THỬ)
  // ==========================================
  {
    console.log(`\n================= TEST 5: KIỂM TRA COOKIE TIẾN ĐỘ THẬT =================`);
    const page = await browser.newPage();
    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(GUEST_COOKIE)),
      url: BASE_URL,
    });
    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // Chơi làm thử đúng 29
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
    await page.keyboard.type('29');
    await sleep(200);
    await page.keyboard.press('Enter');
    await sleep(400);

    // Đọc cookie sc_guest ngay lúc này
    const cookies = await page.cookies();
    const guestCookie = cookies.find((c) => c.name === 'sc_guest');
    const parsed = guestCookie ? JSON.parse(decodeURIComponent(guestCookie.value)) : null;
    console.log('Cookie sc_guest sau khi làm thử đúng 29:', parsed);

    const noRewardGiven = parsed && parsed.c === 0 && (!parsed.lv || Object.keys(parsed.lv).length === 0);
    results.push({
      name: 'Test 5: Làm thử đúng 29 không tự ý cộng xu, sao hay hoàn thành trạm',
      pass: !!noRewardGiven,
    });

    await page.close();
  }

  await browser.close();

  console.log('\n==============================================');
  console.log('              TỔNG HỢP KẾT QUẢ KIỂM TRA P8a     ');
  console.log('==============================================');
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.pass ? 'PASS' : 'FAIL'}] ${r.name}`);
    if (!r.pass) allPassed = false;
  }
  console.log(`\nKết luận: ${allPassed ? 'TẤT CẢ 13/13 TEST ĐẠT HOÀN TOÀN!' : 'CÓ TEST THẤT BẠI'}`);

  writeFileSync(`${OUT}/ket-qua-p8a-e2e.json`, JSON.stringify(results, null, 2), 'utf-8');
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
