// Script kiểm tra DOM và chụp ảnh minh chứng P7a: Màn 5 Đập chuột 2D
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE || 'http://localhost:5194';
const OUT = 'docs/screenshots/p7a';
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

// Cookie khách thật: hoàn thành Màn 1, 2, 3, 4 để mở khóa Màn 5 Làng Dệt
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

const VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: '360x800', width: 360, height: 800, isMobile: true, hasTouch: true },
  { name: '844x390', width: 844, height: 390, isMobile: true, hasTouch: true },
];

async function run() {
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const results = {
    timestamp: new Date().toISOString(),
    viewports: [],
  };

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n=== Kiểm tra kích thước ${vp.name} ===`);
      const page = await browser.newPage();
      await page.setViewport(vp);

      // Đặt cookie tiến độ khách thật qua url
      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE,
      });

      // Mở màn 5 Làng Dệt
      await page.goto(`${BASE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await sleep(1000);

      // 1. Kiểm tra màn bắt đầu
      let startCard = await page.$('[data-testid="the-bat-dau"]');
      if (!startCard) {
        // Kiểm tra xem có đang ở trang khóa hay không
        const isLocked = await page.evaluate(() => document.body.textContent.includes('khoá') || document.body.textContent.includes('khóa'));
        console.log(`[${vp.name}] Cảnh báo: Trang có bị khóa không? ${isLocked}`);
      }

      const autoBtnStart = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        return btns.some((b) => (b.textContent || '').includes('Tự hoàn thành'));
      });

      console.log(`[${vp.name}] Thẻ bắt đầu hiện: ${!!startCard}, Có nút tự hoàn thành: ${autoBtnStart}`);
      await page.screenshot({ path: `${OUT}/01-bat-dau-${vp.name}.png` });

      // Bấm nút "Bắt đầu"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
        if (btn) btn.click();
      });
      await sleep(1000);

      // 2. Kiểm tra giao diện đang chơi 2D
      const gameFrame = await page.$('[data-testid="man5-khung"]');
      const lanes = await page.$$('[data-testid^="lan-"]');
      const hitButtons = await page.$$('[data-testid^="nut-dap-"]');
      const inkDots = await page.$('[data-testid="cham-muc"]');
      const scoreEl = await page.$('[data-testid="diem"]');

      console.log(`[${vp.name}] Khung chơi 2D: ${!!gameFrame}, Số làn: ${lanes.length}, Số nút đập: ${hitButtons.length}, Bàn sổ mực: ${!!inkDots}`);
      await page.screenshot({ path: `${OUT}/02-dang-choi-${vp.name}.png` });

      // 3. Thao tác đập chuột thường
      if (vp.hasTouch) {
        await page.tap('[data-testid="nut-dap-0"]');
        await sleep(150);
        await page.tap('[data-testid="nut-dap-1"]');
      } else {
        await page.keyboard.press('KeyD');
        await sleep(150);
        await page.keyboard.press('KeyF');
      }
      await sleep(300);

      // Chụp ảnh khi đập
      await page.screenshot({ path: `${OUT}/03-thao-tac-dap-${vp.name}.png` });

      // 4. Kiểm tra Chuột câu hỏi (Trùm ❓)
      // Cho chuột câu hỏi xuất hiện qua probe
      await page.evaluate(() => {
        if (window.__whack) {
          window.__whack.phase = 'bossRun';
          window.__whack.boss = {
            index: 0,
            lane: 1,
            pos: 6.8, // Vào vùng đập
            t: 1.0,
            answerSeconds: 15,
          };
        }
      });
      await sleep(300);

      const bossMouse = await page.$('[data-testid="chuot-cau-hoi"]');
      const bossText = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="chuot-cau-hoi"]');
        return el ? el.textContent : null;
      });
      console.log(`[${vp.name}] Chuột câu hỏi ❓ xuất hiện: ${!!bossMouse}, Nhãn: ${bossText}`);
      await page.screenshot({ path: `${OUT}/04-chuot-cau-hoi-${vp.name}.png` });

      // 5. Bấm vào chuột câu hỏi để mở hộp Quiz
      if (bossMouse) {
        if (vp.hasTouch) {
          await page.tap('[data-testid="chuot-cau-hoi"]');
        } else {
          await page.click('[data-testid="chuot-cau-hoi"]');
        }
      } else {
        // Kích hoạt phase quiz qua probe nếu click chưa kịp
        await page.evaluate(() => {
          if (window.__whack && window.__whack.boss) {
            window.__whack.phase = 'quiz';
          }
        });
      }
      await sleep(600);

      const quizModal = await page.$('[data-testid="trum-cau-hoi"]');
      const quizTimeText = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="con-gio"]');
        return el ? el.textContent : null;
      });
      console.log(`[${vp.name}] Hộp câu hỏi mở: ${!!quizModal}, Đồng hồ câu hỏi: ${quizTimeText}`);
      await page.screenshot({ path: `${OUT}/05-hop-cau-hoi-${vp.name}.png` });

      // 6. Trả lời câu hỏi
      const answered = await page.evaluate(() => {
        const options = [...document.querySelectorAll('input[type="radio"]')];
        if (options.length > 0) {
          options[0].click();
          return true;
        }
        return false;
      });
      await sleep(400);

      // Bấm nộp câu trả lời
      await page.evaluate(() => {
        const submitBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().includes('Kiểm tra'));
        if (submitBtn) submitBtn.click();
      });
      await sleep(600);
      await page.screenshot({ path: `${OUT}/06-giai-thich-cau-hoi-${vp.name}.png` });

      // Bấm "Chơi tiếp" để đóng câu hỏi
      await page.evaluate(() => {
        const nextBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().includes('Chơi tiếp') || (b.textContent || '').trim().includes('Tiếp tục'));
        if (nextBtn) nextBtn.click();
      });
      await sleep(600);

      // 7. Mở hộp "?" giữa ván
      const helpBtn = await page.$('button[aria-label*="Hướng dẫn"], button[aria-label*="giúp"], [data-testid="nut-tro-giup"]');
      if (helpBtn) {
        if (vp.hasTouch) await page.tap('button[aria-label*="Hướng dẫn"], button[aria-label*="giúp"], [data-testid="nut-tro-giup"]');
        else await helpBtn.click();
      } else {
        // Hoặc ấn phím H
        await page.keyboard.press('KeyH');
      }
      await sleep(600);

      const helpModal = await page.$('[role="dialog"]');
      const autoBtnInside = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('[role="dialog"] button')];
        return btns.some((b) => (b.textContent || '').includes('Tự hoàn thành'));
      });
      console.log(`[${vp.name}] Hộp "?" mở giữa ván: ${!!helpModal}, Có nút tự hoàn thành: ${autoBtnInside}`);
      await page.screenshot({ path: `${OUT}/07-hop-tro-giup-giua-van-${vp.name}.png` });

      // 8. Bấm nút Tự hoàn thành
      await page.evaluate(() => {
        const autoBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Tự hoàn thành'));
        if (autoBtn) autoBtn.click();
      });
      await sleep(800);

      const autoDone = await page.evaluate(() => {
        return document.body.textContent.includes('Đã tự động hoàn thành') || document.body.textContent.includes('tự hoàn thành');
      });
      console.log(`[${vp.name}] Tự hoàn thành màn 5 thành công: ${autoDone}`);
      await page.screenshot({ path: `${OUT}/08-da-tu-hoan-thanh-${vp.name}.png` });

      results.viewports.push({
        viewport: vp.name,
        startCard: !!startCard,
        autoBtnStart,
        gameFrame: !!gameFrame,
        lanesCount: lanes.length,
        hitButtonsCount: hitButtons.length,
        inkDots: !!inkDots,
        bossMouse: !!bossMouse,
        bossText,
        quizModal: !!quizModal,
        quizTimeText,
        answered,
        helpModal: !!helpModal,
        autoBtnInside,
        autoDone,
      });

      await page.close();
    }

    writeFileSync(`${OUT}/ket-qua-p7a.json`, JSON.stringify(results, null, 2), 'utf-8');
    console.log('\nĐã hoàn thành kiểm tra và ghi kết quả vào ket-qua-p7a.json!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi kiểm tra:', err);
  process.exit(1);
});
