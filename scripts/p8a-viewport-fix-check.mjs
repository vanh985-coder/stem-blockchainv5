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
  console.log('Đang chờ đối thoại mở đầu hoặc LevelIntro...');
  // 1. Chờ nút Bỏ qua của đối thoại mở đầu xuất hiện và bấm
  for (let i = 0; i < 30; i++) {
    const skipped = await page.evaluate(() => {
      // Chỉ bấm nút Bỏ qua của hộp thoại cốt truyện (không bấm của tutorial)
      const btn = [...document.querySelectorAll('button')].find(
        (b) => (b.textContent || '').trim() === 'Bỏ qua' && !b.closest('[data-testid="tutorial-spotlight"]')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (skipped) {
      console.log('Đã bấm Bỏ qua đối thoại mở đầu.');
      break;
    }
    await sleep(200);
  }
  await sleep(400);

  // 2. Chờ nút Bắt đầu của LevelIntro xuất hiện và bấm
  for (let i = 0; i < 30; i++) {
    const started = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Bắt đầu');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (started) {
      console.log('Đã bấm Bắt đầu LevelIntro.');
      break;
    }
    await sleep(200);
  }
  await sleep(600);

  // 3. Chờ Tutorial Spotlight mở
  let ready = false;
  for (let i = 0; i < 30; i++) {
    ready = await page.evaluate(() => !!document.querySelector('[data-testid="tutorial-spotlight"]'));
    if (ready) {
      console.log('Tutorial Spotlight đã mở sẵn sàng.');
      break;
    }
    await sleep(200);
  }

  if (!ready) {
    const pageInfo = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      bodyText: document.body?.innerText?.slice(0, 300),
      buttons: [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()),
    }));
    console.error('Không tìm thấy Tutorial Spotlight sau 6s. Thông tin trang hiện tại:', pageInfo);
  }
}

// Hàm kiểm tra bounding rect của element có nằm hoàn toàn trong viewport không
async function checkElementInViewport(page, selector, desc) {
  return await page.evaluate(
    ({ sel, d }) => {
      const el = document.querySelector(sel);
      if (!el) return { desc: d, exists: false, inView: false, reason: 'Element not found' };
      const r = el.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      const fitsTop = r.top >= 0;
      const fitsBottom = r.bottom <= winH + 1; // Dung sai 1px subpixel
      const fitsLeft = r.left >= 0;
      const fitsRight = r.right <= winW + 1;

      const inView = fitsTop && fitsBottom && fitsLeft && fitsRight;
      return {
        desc: d,
        exists: true,
        inView,
        rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) },
        win: { width: winW, height: winH },
        fits: { fitsTop, fitsBottom, fitsLeft, fitsRight },
      };
    },
    { sel: selector, d: desc }
  );
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
    allPassed: true,
    screenshots: [],
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n================================================================`);
      console.log(`KIỂM TRA BẢN BUILD TẠI ĐỘ PHÂN GIẢI: ${vp.name}`);
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

      const vpReport = { checks: [], stepResults: {} };

      // 1. Bước 0 (intro): Kiểm tra vị trí Tooltip và nút Tiếp
      const btnIntroCheck = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"] button', 'Nút ở Bước 0 (intro)');
      console.log(`[${vp.name}] Bước 0 - Nút trong viewport:`, btnIntroCheck.inView, btnIntroCheck.rect);
      vpReport.checks.push(btnIntroCheck);
      if (!btnIntroCheck.inView) report.allPassed = false;

      const shot0 = `${OUT}/p8a-fix-${vp.name}-step0-intro.png`;
      await page.screenshot({ path: shot0 });
      report.screenshots.push(shot0);

      // Bấm Tiếp chuyển Bước 1
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => (b.textContent || '').includes('Tiếp'));
        btn?.click();
      });
      await sleep(400);

      // 2. Bước 1 (numbers)
      const btnStep1Check = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"] button', 'Nút ở Bước 1 (numbers)');
      console.log(`[${vp.name}] Bước 1 - Nút trong viewport:`, btnStep1Check.inView, btnStep1Check.rect);
      vpReport.checks.push(btnStep1Check);
      if (!btnStep1Check.inView) report.allPassed = false;

      const shot1 = `${OUT}/p8a-fix-${vp.name}-step1-numbers.png`;
      await page.screenshot({ path: shot1 });
      report.screenshots.push(shot1);

      // Bấm Đã hiểu chuyển Bước 2
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => (b.textContent || '').includes('Đã hiểu'));
        btn?.click();
      });
      await sleep(400);

      // 3. Bước 2 (formula): Kiểm tra nút "Thử tính ngay"
      const btnStep2Check = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"] button', 'Nút ở Bước 2 (formula)');
      console.log(`[${vp.name}] Bước 2 - Nút trong viewport:`, btnStep2Check.inView, btnStep2Check.rect);
      vpReport.checks.push(btnStep2Check);
      if (!btnStep2Check.inView) report.allPassed = false;

      const shot2 = `${OUT}/p8a-fix-${vp.name}-step2-formula.png`;
      await page.screenshot({ path: shot2 });
      report.screenshots.push(shot2);

      // Bấm Thử tính ngay chuyển Bước 3
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => (b.textContent || '').includes('Thử tính ngay'));
        btn?.click();
      });
      await sleep(400);

      // 4. Bước 3 (input): Kiểm tra ô nhập và Tooltip
      const inputCheck = await checkElementInViewport(page, '[data-tutorial="code-input"] input', 'Ô nhập mã trang');
      const tooltipStep3Check = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"]', 'Tooltip ở Bước 3');
      console.log(`[${vp.name}] Bước 3 - Ô nhập trong viewport:`, inputCheck.inView, inputCheck.rect);
      console.log(`[${vp.name}] Bước 3 - Tooltip trong viewport:`, tooltipStep3Check.inView, tooltipStep3Check.rect);
      vpReport.checks.push(inputCheck, tooltipStep3Check);
      if (!inputCheck.inView || !tooltipStep3Check.inView) report.allPassed = false;

      const shot3 = `${OUT}/p8a-fix-${vp.name}-step3-input.png`;
      await page.screenshot({ path: shot3 });
      report.screenshots.push(shot3);

      // 5. Thao tác thật: Nhập sai (15) rồi bấm Kiểm tra
      console.log(`[${vp.name}] Thực hành: Nhập sai (15) để kiểm tra phản hồi lỗi...`);
      await page.evaluate(() => {
        const inp = document.querySelector('[data-tutorial="code-input"] input');
        if (inp) {
          inp.value = '';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.focus('[data-tutorial="code-input"] input');
      await page.keyboard.type('15');
      await sleep(200);

      // Bấm nút Kiểm tra
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) => (b.textContent || '').includes('Kiểm tra'));
        btn?.click();
      });
      await sleep(500);

      // Kiểm tra phản hồi sai và nút "Thử lại"
      const retryBtnCheck = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"] button', 'Nút Thử lại khi sai');
      console.log(`[${vp.name}] Bước sai - Nút Thử lại trong viewport:`, retryBtnCheck.inView, retryBtnCheck.rect);
      vpReport.checks.push(retryBtnCheck);
      if (!retryBtnCheck.inView) report.allPassed = false;

      const shotWrong = `${OUT}/p8a-fix-${vp.name}-step-wrong.png`;
      await page.screenshot({ path: shotWrong });
      report.screenshots.push(shotWrong);

      // 6. Thao tác: Bấm nút "Thử lại"
      console.log(`[${vp.name}] Bấm nút Thử lại...`);
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => (b.textContent || '').includes('Thử lại'));
        btn?.click();
      });
      await sleep(400);

      // 7. Nhập đúng (29) rồi bấm Kiểm tra
      console.log(`[${vp.name}] Thực hành: Nhập đúng (29)...`);
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
        const btn = [...document.querySelectorAll('[data-tutorial="check-button"] button')].find((b) => (b.textContent || '').includes('Kiểm tra'));
        btn?.click();
      });
      await sleep(500);

      // Kiểm tra phản hồi đúng và nút "Bắt đầu chơi thật"
      const startRealBtnCheck = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"] button', 'Nút Bắt đầu chơi thật khi đúng');
      console.log(`[${vp.name}] Bước đúng - Nút Bắt đầu chơi thật trong viewport:`, startRealBtnCheck.inView, startRealBtnCheck.rect);
      vpReport.checks.push(startRealBtnCheck);
      if (!startRealBtnCheck.inView) report.allPassed = false;

      const shotCorrect = `${OUT}/p8a-fix-${vp.name}-step-correct.png`;
      await page.screenshot({ path: shotCorrect });
      report.screenshots.push(shotCorrect);

      // 8. Bấm "Bắt đầu chơi thật" -> Vào bài thật
      console.log(`[${vp.name}] Bấm Bắt đầu chơi thật...`);
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find((b) => (b.textContent || '').includes('Bắt đầu chơi thật'));
        btn?.click();
      });
      await sleep(600);

      // Xác minh Tutorial đã đóng và bài thật mở ra (nút Hướng dẫn xuất hiện)
      const inRealGame = await page.evaluate(() => {
        const spot = document.querySelector('[data-testid="tutorial-spotlight"]');
        const guideBtn = [...document.querySelectorAll('button')].find(
          (b) => (b.textContent || '').includes('Hướng dẫn') || b.getAttribute('aria-label')?.includes('Hướng dẫn')
        );
        return {
          spotClosed: !spot,
          hasGuideBtn: !!guideBtn,
        };
      });
      console.log(`[${vp.name}] Vào bài thật sạch sẽ:`, inRealGame);
      vpReport.checks.push({ desc: 'Vào bài thật sạch sẽ', inRealGame, pass: inRealGame.spotClosed && inRealGame.hasGuideBtn });
      if (!inRealGame.spotClosed || !inRealGame.hasGuideBtn) report.allPassed = false;

      const shotReal = `${OUT}/p8a-fix-${vp.name}-real-game.png`;
      await page.screenshot({ path: shotReal });
      report.screenshots.push(shotReal);

      // 9. Kiểm tra Mở lại hướng dẫn giữa bài thật và đóng lại
      console.log(`[${vp.name}] Bấm nút Hướng dẫn giữa bài thật...`);
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => (b.textContent || '').includes('Hướng dẫn') || b.getAttribute('aria-label')?.includes('Hướng dẫn')
        );
        btn?.click();
      });
      await sleep(500);

      const reopenedCheck = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"]', 'Tooltip khi mở lại giữa bài');
      console.log(`[${vp.name}] Mở lại giữa bài - Tooltip trong viewport:`, reopenedCheck.inView, reopenedCheck.rect);
      vpReport.checks.push(reopenedCheck);
      if (!reopenedCheck.inView) report.allPassed = false;

      // Đóng hướng dẫn qua nút Bỏ qua hướng dẫn
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('[data-testid="tutorial-tooltip"] button')].find(
          (b) => (b.textContent || '').includes('Bỏ qua')
        );
        btn?.click();
      });
      await sleep(400);

      // 10. Kiểm tra cuộn trang và mở lại hướng dẫn; đổi kích thước khi hướng dẫn đang mở
      console.log(`[${vp.name}] Thử thách: Cuộn trang xuống và mở lại hướng dẫn...`);
      await page.evaluate(() => {
        window.scrollTo(0, 250);
      });
      await sleep(200);

      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find(
          (b) => (b.textContent || '').includes('Hướng dẫn') || b.getAttribute('aria-label')?.includes('Hướng dẫn')
        );
        btn?.click();
      });
      await sleep(500);

      const scrollReopenedCheck = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"]', 'Tooltip khi đã cuộn trang');
      console.log(`[${vp.name}] Đã cuộn trang - Tooltip trong viewport:`, scrollReopenedCheck.inView, scrollReopenedCheck.rect);
      vpReport.checks.push(scrollReopenedCheck);
      if (!scrollReopenedCheck.inView) report.allPassed = false;

      // Đổi kích thước cửa sổ khi hướng dẫn đang mở
      console.log(`[${vp.name}] Thử thách: Đổi kích thước viewport khi hướng dẫn đang mở...`);
      await page.setViewport({
        width: Math.max(360, vp.width - 60),
        height: Math.max(350, vp.height - 40),
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
      });
      await sleep(400);

      const resizeCheck = await checkElementInViewport(page, '[data-testid="tutorial-tooltip"]', 'Tooltip sau khi resize');
      console.log(`[${vp.name}] Sau resize - Tooltip trong viewport:`, resizeCheck.inView, resizeCheck.rect);
      vpReport.checks.push(resizeCheck);
      if (!resizeCheck.inView) report.allPassed = false;

      report.viewports[vp.name] = vpReport;
      await page.close();
    }

    console.log(`\n================================================================`);
    console.log(`TỔNG KẾT KIỂM TRA P8A FIX: allPassed = ${report.allPassed}`);
    console.log(`================================================================`);

    // Copy screenshots sang ARTIFACT_DIR
    for (const s of report.screenshots) {
      const fname = s.split('/').pop();
      try {
        copyFileSync(s, `${ARTIFACT_DIR}/${fname}`);
      } catch (e) {}
    }

    writeFileSync(`${OUT}/ket-qua-p8a-fix.json`, JSON.stringify(report, null, 2), 'utf-8');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi khi chạy p8a-viewport-fix-check:', err);
  process.exit(1);
});
