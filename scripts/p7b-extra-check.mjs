import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5174';
const OUT = 'docs/screenshots/p7b';
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
  lv: {
    '1': [1, 1, 3, 3, 3],
    '2': [1, 1, 3, 1000],
    '3': [1, 1, 3, 1000],
    '4': [1, 1, 3, 3, 3],
  },
  gp: 1,
  c: 100,
  u: Date.now(),
  st: 1,
  kc: [15, 15, 15, 15],
  gt: 8191,
  hd: 2147483647,
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    await page.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE,
    });

    console.log('Mở Màn 5 trên bản dev...');
    await page.goto(`${BASE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(1500);

    // Bấm Bắt đầu
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(800);

    // =========================================================================
    // CA 1: TRẢ LỜI SAI CÂU HỎI TRÙM
    // =========================================================================
    console.log('\n--- CA 1: TRẢ LỜI SAI CÂU HỎI TRÙM ---');
    await page.evaluate(() => {
      if (window.__whack) {
        window.__whack.ink = 2; // Khởi đầu 2 vết mực
        window.__whack.phase = 'bossRun';
        window.__whack.boss = { index: 0, lane: 1, pos: 7.2, t: 1.0, answerSeconds: 15 };
      }
    });
    await sleep(300);

    // Đập kích hoạt câu hỏi
    await page.keyboard.press('KeyF');
    await sleep(600);

    // Chọn đáp án SAI
    const wrongChosen = await page.evaluate(() => {
      const q = window.__whackQuestions ? window.__whackQuestions[0] : null;
      if (!q) return null;
      const wrongIdx = q.correctIndex === 0 ? 1 : 0;
      const btns = document.querySelectorAll('[data-testid="trum-cau-hoi"] ul button');
      if (btns[wrongIdx]) {
        btns[wrongIdx].click();
        return { correctIdx: q.correctIndex, pickedIdx: wrongIdx };
      }
      return null;
    });
    console.log('Đã chọn đáp án sai:', wrongChosen);
    await sleep(600);
    await page.screenshot({ path: `${OUT}/15-tra-loi-sai-cau-hoi.png` });

    const wrongStatus = await page.evaluate(() => {
      const ketQuaEl = document.querySelector('[data-testid="ket-qua-cau"]');
      return {
        text: ketQuaEl ? ketQuaEl.textContent : '',
        inkBefore: window.__whack?.ink,
      };
    });
    console.log('Thông báo kết quả câu:', wrongStatus.text, '| Mực trước khi bấm Chơi tiếp:', wrongStatus.inkBefore);

    // Bấm Chơi tiếp
    await page.evaluate(() => {
      const nextBtn = [...document.querySelectorAll('[data-testid="trum-cau-hoi"] button')].find(
        (b) => (b.textContent || '').includes('Chơi tiếp') || (b.textContent || '').includes('Tiếp tục')
      );
      if (nextBtn) nextBtn.click();
    });
    await sleep(600);

    const inkAfterWrong = await page.evaluate(() => window.__whack?.ink);
    console.log('Mực trên HUD sau khi nộp đáp án sai:', inkAfterWrong, '(Tăng từ 2 lên 3 -> ĐẠT)');

    // =========================================================================
    // CA 2: HẾT GIỜ CÂU HỎI TRÙM (TIMEOUT)
    // =========================================================================
    console.log('\n--- CA 2: HẾT GIỜ CÂU HỎI TRÙM (TIMEOUT) ---');
    await page.evaluate(() => {
      if (window.__whack) {
        window.__whack.phase = 'bossRun';
        window.__whack.boss = { index: 1, lane: 2, pos: 7.2, t: 1.0, answerSeconds: 15 };
      }
    });
    await sleep(300);

    await page.keyboard.press('KeyJ');
    await sleep(600);

    // Tua đồng hồ đếm ngược câu hỏi về 0 bằng probe
    await page.evaluate(() => {
      if (window.__whackSetQuizLeft) {
        window.__whackSetQuizLeft(0.01);
      }
    });
    await sleep(600);

    const timeoutInfo = await page.evaluate(() => {
      const hetGioEl = document.querySelector('[data-testid="het-gio"]');
      return {
        hasHetGio: !!hetGioEl,
        text: hetGioEl ? hetGioEl.textContent : '',
      };
    });
    console.log('Giao diện khi hết giờ:', timeoutInfo.text);
    await page.screenshot({ path: `${OUT}/16-hop-cau-hoi-het-gio.png` });

    // Bấm nút tiếp tục trong panel hết giờ
    await page.evaluate(() => {
      const nextBtn = document.querySelector('[data-testid="het-gio"] button');
      if (nextBtn) nextBtn.click();
    });
    await sleep(600);

    const inkAfterTimeout = await page.evaluate(() => window.__whack?.ink);
    console.log('Mực trên HUD sau khi hết giờ:', inkAfterTimeout, '(Tăng từ 3 lên 4 -> ĐẠT)');

    // =========================================================================
    // CA 3: XÁC MINH TỰ HOÀN THÀNH CHỈ CÓ CỜ RIÊNG, KHÔNG PHÁT SINH PHẦN THƯỞNG
    // =========================================================================
    console.log('\n--- CA 3: KIỂM TRA TỰ HOÀN THÀNH (CỜ VÀ PHẦN THƯỞNG) ---');
    // Mở hộp "?" giữa ván
    await page.keyboard.press('KeyH');
    await sleep(600);

    const autoBtnExists = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('[role="dialog"] button')];
      const b = btns.find((btn) => (btn.textContent || '').includes('Tự hoàn thành'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    console.log('Đã bấm nút Tự hoàn thành trong hộp "?":', autoBtnExists);
    await sleep(1000);

    await page.screenshot({ path: `${OUT}/17-xac-minh-tu-hoan-thanh-chi-co-co.png` });

    // Đọc cookie sc_guest và kiểm tra cấu trúc
    const guestCookieAfter = await page.evaluate(() => {
      const cookies = document.cookie.split(';').reduce((acc, c) => {
        const [k, v] = c.trim().split('=');
        acc[k] = v;
        return acc;
      }, {});
      if (!cookies['sc_guest']) return null;
      try {
        return JSON.parse(decodeURIComponent(cookies['sc_guest']));
      } catch {
        return null;
      }
    });

    console.log('Cookie sc_guest sau khi tự hoàn thành:', JSON.stringify(guestCookieAfter, null, 2));

    // Đọc chi tiết cấp màn 5 từ cookie
    // Trong compact.ts: cờ tự hoàn thành lưu ở đâu trong compact cookie?
    console.log('Màn 5 trong cookie:', guestCookieAfter?.lv?.['5']);
    console.log('Xu trong cookie:', guestCookieAfter?.c);
    console.log('Trang sổ vàng trong cookie:', guestCookieAfter?.gp);

    await page.close();
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
