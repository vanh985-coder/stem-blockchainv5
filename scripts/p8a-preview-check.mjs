import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_URL = 'http://localhost:5193';
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

const guestCookie = {
  v: 1,
  lv: {},
  gp: 0,
  c: 0,
  u: Date.now(),
  st: 1,
  kc: [0, 0, 0, 0],
};

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

  const previewReport = {
    timestamp: new Date().toISOString(),
    mode: 'production_build_preview',
    port: 5193,
    checks: {},
    screenshots: [],
  };

  try {
    console.log(`\n================================================================`);
    console.log(`KIỂM TRA LUỒNG CHÍNH P8a TRÊN BẢN BUILD LOCAL PREVIEW (CỔNG 5193)`);
    console.log(`================================================================`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_URL,
    });

    await page.goto(`${BASE_URL}/lang/lang-giay/man/1?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await passIntro(page);

    // 1. Kiểm tra bước 0: Spotlight mở tự động
    const step0Check = await page.evaluate(() => {
      const spot = document.querySelector('[data-testid="tutorial-spotlight"]');
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      return {
        hasSpot: !!spot,
        hasTooltip: !!tt,
        title: tt?.querySelector('#tutorial-step-title')?.textContent,
      };
    });
    console.log('1. Bước 0 (intro) trên bản build:', step0Check);
    previewReport.checks.step0Opened = step0Check.hasSpot && step0Check.hasTooltip;

    const shot0 = `${OUT}/p8a-build-step0-intro.png`;
    await page.screenshot({ path: shot0 });
    previewReport.screenshots.push(shot0);

    // 2. Chuyển qua các bước 1 -> 2 -> 3
    // Bấm Tiếp tục
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Tiếp')
      );
      if (btn) btn.click();
    });
    await sleep(400);

    // Bấm Đã hiểu
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Đã hiểu')
      );
      if (btn) btn.click();
    });
    await sleep(400);

    // Bấm Thử tính ngay
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Thử tính ngay')
      );
      if (btn) btn.click();
    });
    await sleep(400);

    // 3. Thao tác thật: Nhập sai (15) và bấm Kiểm tra
    console.log('2. Thực hành: Cố tình nhập sai (15)...');
    await page.focus('[data-tutorial="code-input"] input');
    await page.keyboard.type('15');
    await sleep(200);

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
        (b.textContent || '').includes('Kiểm tra')
      );
      if (btn) btn.click();
    });
    await sleep(500);

    const wrongCheck = await page.evaluate(() => {
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      const retryBtn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
        (b.textContent || '').includes('Thử lại')
      );
      return {
        hasRetry: !!retryBtn,
        text: tt ? tt.innerText : '',
      };
    });
    console.log('Phản hồi nhập sai trên bản build:', { hasRetry: wrongCheck.hasRetry });
    previewReport.checks.wrongHandled = wrongCheck.hasRetry;

    const shotWrong = `${OUT}/p8a-build-step-wrong.png`;
    await page.screenshot({ path: shotWrong });
    previewReport.screenshots.push(shotWrong);

    // 4. Bấm Thử lại và nhập đúng (29)
    console.log('3. Bấm Thử lại và nhập đúng (29)...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Thử lại')
      );
      if (btn) btn.click();
    });
    await sleep(400);

    await page.evaluate(() => {
      const inp = document.querySelector('[data-tutorial="code-input"] input');
      if (inp) {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.focus('[data-tutorial="code-input"] input');
    await page.keyboard.type('29');
    await sleep(200);

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) =>
        (b.textContent || '').includes('Kiểm tra')
      );
      if (btn) btn.click();
    });
    await sleep(500);

    const correctCheck = await page.evaluate(() => {
      const tt = document.querySelector('[data-testid="tutorial-tooltip"]');
      const startBtn = [...(tt?.querySelectorAll('button') || [])].find((b) =>
        (b.textContent || '').includes('Bắt đầu chơi thật')
      );
      return {
        hasStartReal: !!startBtn,
        text: tt ? tt.innerText : '',
      };
    });
    console.log('Phản hồi nhập đúng trên bản build:', { hasStartReal: correctCheck.hasStartReal });
    previewReport.checks.correctHandled = correctCheck.hasStartReal;

    const shotCorrect = `${OUT}/p8a-build-step-correct.png`;
    await page.screenshot({ path: shotCorrect });
    previewReport.screenshots.push(shotCorrect);

    // 5. Bấm Bắt đầu chơi thật -> Hướng dẫn đóng, bài thật xuất hiện
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) =>
        (b.textContent || '').includes('Bắt đầu chơi thật')
      );
      if (btn) btn.click();
    });
    await sleep(600);

    const realGameCheck = await page.evaluate(() => {
      const spot = document.querySelector('[data-testid="tutorial-spotlight"]');
      const guideBtn = [...document.querySelectorAll('button')].find((b) =>
        (b.textContent || '').includes('Hướng dẫn')
      );
      return {
        tutorialClosed: !spot,
        hasGuideButton: !!guideBtn,
      };
    });
    console.log('Chuyển sang bài thật sạch sẽ trên bản build:', realGameCheck);
    previewReport.checks.realGameClean = realGameCheck.tutorialClosed && realGameCheck.hasGuideButton;

    // 6. Mở lại hướng dẫn giữa bài và đóng
    console.log('4. Mở lại và đóng hướng dẫn giữa bài...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Hướng dẫn'));
      if (btn) btn.click();
    });
    await sleep(400);

    const reviewOpen = await page.evaluate(() => !!document.querySelector('[data-testid="tutorial-spotlight"]'));
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Bỏ qua'));
      if (btn) btn.click();
    });
    await sleep(400);

    const reviewClosed = await page.evaluate(() => !document.querySelector('[data-testid="tutorial-spotlight"]'));
    console.log('Mở lại và đóng trên bản build:', { reviewOpen, reviewClosed });
    previewReport.checks.reviewToggle = reviewOpen && reviewClosed;

    // Copy ảnh chụp sang Artifacts
    for (const f of previewReport.screenshots) {
      const baseName = f.split('/').pop();
      try {
        copyFileSync(f, `${ARTIFACT_DIR}/${baseName}`);
      } catch (e) {}
    }

    writeFileSync(`${OUT}/ket-qua-p8a-build-preview.json`, JSON.stringify(previewReport, null, 2), 'utf-8');
    console.log(`\nĐã lưu kết quả kiểm tra bản build preview vào: ${OUT}/ket-qua-p8a-build-preview.json`);

    await page.close();
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi chạy preview check P8a:', err);
  process.exit(1);
});
