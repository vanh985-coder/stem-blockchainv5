import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:5173';
const OUT = 'docs/screenshots/p8a';
const ARTIFACT_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\1e39ed0d-2120-4c6a-a44c-3cf2d34b3087';
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

// Khách thật chơi thử
const guestCookie = {
  v: 1,
  lv: {},
  gp: 0,
  c: 0,
  u: Date.now(),
  st: 1,
  kc: [0, 0, 0, 0],
};

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: '360x800', width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: '844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
];

async function passIntro(page) {
  // 1. Chờ nút Bỏ qua của đối thoại mở đầu xuất hiện và bấm
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

  // 2. Chờ nút Bắt đầu của LevelIntro xuất hiện và bấm
  for (let i = 0; i < 25; i++) {
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

  // 3. Chờ Tutorial Spotlight mở
  for (let i = 0; i < 25; i++) {
    const ready = await page.evaluate(() => !!document.querySelector('[data-testid="tutorial-spotlight"]'));
    if (ready) break;
    await sleep(200);
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const report = {
    timestamp: new Date().toISOString(),
    viewports: {},
    checks: {},
    screenshots: [],
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n================================================================`);
      console.log(`KIỂM TRA TẠI ĐỘ PHÂN GIẢI: ${vp.name}`);
      console.log(`================================================================`);

      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      });

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_URL,
      });

      await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await passIntro(page);

      // 1. Kiểm tra mở đầu: Tutorial spotlight tự động xuất hiện
      const initialTutorial = await page.evaluate(() => {
        const spot = document.querySelector('[data-testid="tutorial-spotlight"]');
        const tooltip = document.querySelector('[data-testid="tutorial-tooltip"]');
        const title = tooltip ? tooltip.querySelector('#tutorial-step-title')?.textContent : null;
        return {
          hasSpot: !!spot,
          hasTooltip: !!tooltip,
          title,
        };
      });

      console.log(`[${vp.name}] Bước 0 (intro):`, initialTutorial);
      const shot0 = `${OUT}/p8a-${vp.name}-step0-intro.png`;
      await page.screenshot({ path: shot0 });
      report.screenshots.push(shot0);

      // 2. Chuyển sang Bước 1 (numbers)
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Tiếp')
        );
        if (btn) btn.click();
      });
      await sleep(400);

      const shot1 = `${OUT}/p8a-${vp.name}-step1-numbers.png`;
      await page.screenshot({ path: shot1 });
      report.screenshots.push(shot1);

      // 3. Chuyển sang Bước 2 (formula)
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Đã hiểu')
        );
        if (btn) btn.click();
      });
      await sleep(400);

      const shot2 = `${OUT}/p8a-${vp.name}-step2-formula.png`;
      await page.screenshot({ path: shot2 });
      report.screenshots.push(shot2);

      // 4. Chuyển sang Bước 3 (input)
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Thử tính ngay')
        );
        if (btn) btn.click();
      });
      await sleep(400);

      const shot3 = `${OUT}/p8a-${vp.name}-step3-input.png`;
      await page.screenshot({ path: shot3 });
      report.screenshots.push(shot3);

      // 5. Thao tác thật: Nhập sai (15) rồi bấm Kiểm tra
      console.log(`[${vp.name}] Thực hành: Cố tình nhập sai (15)...`);
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.type('15');
      await sleep(300);

      // Bấm nút Kiểm tra
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
          (b.textContent || '').includes('Kiểm tra')
        );
        if (btn) btn.click();
      });
      await sleep(500);

      const wrongFeedback = await page.evaluate(() => {
        const tooltip = document.querySelector('[data-testid="tutorial-tooltip"]');
        const retryBtn = [...(tooltip?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        return {
          text: tooltip ? tooltip.innerText : '',
          hasRetry: !!retryBtn,
        };
      });
      console.log(`[${vp.name}] Phản hồi khi nhập sai:`, { hasRetry: wrongFeedback.hasRetry });

      const shotWrong = `${OUT}/p8a-${vp.name}-step-wrong.png`;
      await page.screenshot({ path: shotWrong });
      report.screenshots.push(shotWrong);

      // 6. Bấm Thử lại, nhập đúng (29)
      console.log(`[${vp.name}] Bấm Thử lại và nhập đúng (29)...`);
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Thử lại')
        );
        if (btn) btn.click();
      });
      await sleep(400);

      // Xóa ô nhập và gõ 29
      await page.evaluate(() => {
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        if (inp) {
          inp.value = '';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.type('29');
      await sleep(300);

      // Bấm nút Kiểm tra
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
          (b.textContent || '').includes('Kiểm tra')
        );
        if (btn) btn.click();
      });
      await sleep(500);

      const correctFeedback = await page.evaluate(() => {
        const tooltip = document.querySelector('[data-testid="tutorial-tooltip"]');
        const startBtn = [...(tooltip?.querySelectorAll('button') || [])].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        return {
          text: tooltip ? tooltip.innerText : '',
          hasStartReal: !!startBtn,
        };
      });
      console.log(`[${vp.name}] Phản hồi khi nhập đúng:`, { hasStartReal: correctFeedback.hasStartReal });

      const shotCorrect = `${OUT}/p8a-${vp.name}-step-correct.png`;
      await page.screenshot({ path: shotCorrect });
      report.screenshots.push(shotCorrect);

      // 7. Bấm "Bắt đầu chơi thật": chuyển sang bài thật sạch sẽ
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
          (b.textContent || '').includes('Bắt đầu chơi thật')
        );
        if (btn) btn.click();
      });
      await sleep(600);

      const realPlayCheck = await page.evaluate(() => {
        const spot = document.querySelector('[data-testid="tutorial-spotlight"]');
        const guideBtn = [...document.querySelectorAll('button')].find((b) =>
          (b.textContent || '').includes('Hướng dẫn')
        );
        return {
          tutorialClosed: !spot,
          hasGuideButton: !!guideBtn,
        };
      });
      console.log(`[${vp.name}] Trạng thái bài thật sau khi xong hướng dẫn:`, realPlayCheck);

      const shotReal = `${OUT}/p8a-${vp.name}-real-game.png`;
      await page.screenshot({ path: shotReal });
      report.screenshots.push(shotReal);

      // 8. Mở lại Hướng dẫn giữa bài thật và đóng lại
      console.log(`[${vp.name}] Mở lại hướng dẫn giữa bài...`);
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Hướng dẫn'));
        if (btn) btn.click();
      });
      await sleep(400);

      const reviewOpen = await page.evaluate(() => {
        return !!document.querySelector('[data-testid="tutorial-spotlight"]');
      });

      // Bấm Bỏ qua hướng dẫn để quay lại bài thật
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Bỏ qua'));
        if (btn) btn.click();
      });
      await sleep(400);

      const reviewClosed = await page.evaluate(() => {
        return !document.querySelector('[data-testid="tutorial-spotlight"]');
      });
      console.log(`[${vp.name}] Mở lại và đóng hướng dẫn giữa bài:`, { reviewOpen, reviewClosed });

      report.viewports[vp.name] = {
        initialTutorial: initialTutorial.hasSpot && initialTutorial.hasTooltip,
        wrongHandled: wrongFeedback.hasRetry,
        correctHandled: correctFeedback.hasStartReal,
        realGameClean: realPlayCheck.tutorialClosed && realPlayCheck.hasGuideButton,
        reviewToggle: reviewOpen && reviewClosed,
      };

      await page.close();
    }

    // =========================================================================
    // KIỂM TRA BỔ SUNG: TIẾN ĐỘ THẬT VÀ BÀN PHÍM
    // =========================================================================
    console.log(`\n--- Kiểm tra xác minh: Làm thử KHÔNG đổi tiến độ thật ---`);
    const pageCheck = await browser.newPage();
    await pageCheck.setViewport({ width: 1366, height: 768 });
    await pageCheck.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_URL,
    });

    await pageCheck.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(pageCheck);

    // Đi đến bước nhập đúng và bắt đầu bài thật
    await pageCheck.evaluate(() => {
      if (window.__tutorial) {
        window.__tutorial.setPracticeVal(29);
        window.__tutorial.checkPractice();
      }
    });
    await sleep(300);

    // Đọc cookie tiến độ sau khi hoàn thành làm thử
    const cookiesAfterPractice = await pageCheck.cookies();
    const guestAfterPractice = cookiesAfterPractice.find((c) => c.name === 'sc_guest');
    let progressUnchanged = true;
    if (guestAfterPractice) {
      try {
        const parsed = JSON.parse(decodeURIComponent(guestAfterPractice.value));
        // Tiến độ bài 1 chưa hoàn thành
        progressUnchanged = !parsed.lv?.['1'] && (!parsed.c || parsed.c === 0) && (!parsed.gp || parsed.gp === 0);
      } catch (e) {}
    }
    console.log('Tiến độ không bị đổi khi làm thử:', progressUnchanged);
    report.checks.progressUnchangedAfterPractice = progressUnchanged;

    // Kiểm tra bàn phím: Enter giữ / lặp không tự kích hoạt bài thật khi đang ở ô nhập
    console.log('\n--- Kiểm tra bàn phím: Enter trong ô nhập ---');
    await pageCheck.evaluate(() => {
      if (window.__tutorial) window.__tutorial.review();
    });
    await sleep(300);

    // Chuyển sang bước nhập
    await pageCheck.evaluate(() => {
      if (window.__tutorial) window.__tutorial.setStep(3);
    });
    await sleep(300);

    // Xóa ô nhập và gõ 29
    await pageCheck.evaluate(() => {
      const inp = document.querySelector('[data-tutorial="code-input"] input');
      if (inp) {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await pageCheck.focus('[data-tutorial="code-input"] input');
    await pageCheck.keyboard.type('29');
    await pageCheck.keyboard.down('Enter');
    await sleep(800);
    await pageCheck.keyboard.up('Enter');
    await sleep(400);

    // Sau khi nộp bằng Enter, spotlight phải dừng ở bước result (có nút "Bắt đầu chơi thật"), KHÔNG được tự ý bắt đầu bài thật
    const enterHoldSafe = await pageCheck.evaluate(() => {
      const spot = document.querySelector('[data-testid="tutorial-spotlight"]');
      const startBtn = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent || '').includes('Bắt đầu chơi thật')
      );
      return !!spot && !!startBtn;
    });
    console.log('Enter không bị kích hoạt đúp vào bài thật:', enterHoldSafe);
    report.checks.enterHoldSafe = enterHoldSafe;

    // Thoát ra bài thật và kiểm tra bài thật vẫn hoàn thành bình thường
    await pageCheck.evaluate(() => {
      if (window.__tutorial) window.__tutorial.skip();
    });
    await sleep(400);

    // Hoàn thành trạm bài thật bằng probe stationDone
    await pageCheck.evaluate(() => {
      if (window.__stationDone) window.__stationDone(3);
    });
    await sleep(600);

    const stationDoneVisible = await pageCheck.evaluate(() => {
      return document.body.innerText.includes('Xong trạm') || document.body.innerText.includes('Trạm tiếp theo');
    });
    console.log('Bài thật hoàn thành bình thường sau hướng dẫn:', stationDoneVisible);
    report.checks.realStationDoneNormally = stationDoneVisible;

    await pageCheck.close();

    // Copy ảnh chụp màn hình sang Artifacts directory để hiển thị cho người dùng
    for (const f of report.screenshots) {
      const baseName = f.split('/').pop();
      try {
        copyFileSync(f, `${ARTIFACT_DIR}/${baseName}`);
      } catch (e) {}
    }

    writeFileSync(`${OUT}/ket-qua-p8a.json`, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\nĐã lưu kết quả kiểm tra P8a vào: ${OUT}/ket-qua-p8a.json`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi chạy check P8a:', err);
  process.exit(1);
});
