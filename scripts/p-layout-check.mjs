import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.URL || 'http://localhost:5173';
const OUT = 'docs/screenshots/doi-chieu';
mkdirSync(OUT, { recursive: true });

const SIZES = [
  { name: '1366x768', w: 1366, h: 768, touch: false },
  { name: '360x800', w: 360, h: 800, touch: true },
  { name: '844x390', w: 844, h: 390, touch: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const baseCookie = {
  v: 1,
  lv: { '1': [1, 1, 3, 3, 3], '2': [1, 1, 3, 100], '3': [1, 1, 3, 100] },
  gp: 1,
  c: 10,
  u: Date.now(),
  st: 1,
  kc: [15, 15, 15, 15],
  gt: 4095,
  hd: 2147483647,
  vs: 15,
  vi: 15,
};

const results = [];
function check(tag, name, ok, detail = '') {
  results.push({ tag, name, ok: Boolean(ok), detail });
  console.log(`   ${ok ? '✓' : '✗'} [${tag}] ${name}${detail ? ` (${detail})` : ''}`);
}

async function tap(ctx, handle) {
  await handle.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  const b = await handle.boundingBox();
  if (!b) {
    await handle.click();
    return;
  }
  const x = b.x + b.width / 2;
  const y = b.y + b.height / 2;
  if (ctx.touch) await ctx.page.touchscreen.tap(x, y);
  else await ctx.page.mouse.click(x, y);
}

async function shot(ctx, name) {
  const buf = await ctx.page.screenshot({ type: 'jpeg', quality: 65 });
  if (buf.length >= 300000) throw new Error(`${name} vượt quá 300 KB (${buf.length})`);
  const file = `${OUT}/${name}-${ctx.size.name}.jpg`;
  writeFileSync(file, buf);
}

async function advanceToPlay(page) {
  for (let i = 0; i < 8; i++) {
    const calc = await page.$('[data-testid="page-code-calculator"]');
    if (calc) return true;
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const boQua = btns.find((b) => b.textContent && b.textContent.includes('Bỏ qua'));
      if (boQua) { boQua.click(); return; }
      const batDau = btns.find((b) => b.textContent && b.textContent.includes('Bắt đầu'));
      if (batDau) { batDau.click(); return; }
      const tiep = btns.find((b) => b.textContent && b.textContent.includes('Tiếp'));
      if (tiep) { tiep.click(); return; }
    });
    await sleep(400);
  }
  await page.waitForSelector('[data-testid="page-code-calculator"]', { timeout: 10000 });
  return true;
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  for (const size of SIZES) {
    console.log(`\n--- Kiểm tra kích thước ${size.name} ---`);
    const page = await browser.newPage();
    const ctx = { page, size, touch: size.touch };
    await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });

    // ==========================================
    // 1. Trạm Dễ (Màn 4): Duyệt trang mới
    // ==========================================
    await page.goto(BASE);
    await page.evaluate((p) => {
      localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
      const prog = { ...p, lv: { ...p.lv, '4': [1, 0, 0, 0, 0] } };
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(prog))}; path=/`;
    }, baseCookie);

    await page.goto(`${BASE}/lang/lang-det/man/4`, { waitUntil: 'domcontentloaded' });
    await advanceToPlay(page);
    await sleep(600);

    const isDesktop = size.w >= 768;
    const tagEasy = `Easy ${size.name}`;

    // Kiểm tra cấu trúc layout
    const easyLayout = await page.evaluate(() => {
      const grid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
      const headerBar = document.querySelector('.rounded-bang.border-2.border-nau-go\\/50.bg-white\\/60');
      const calc = document.querySelector('[data-testid="page-code-calculator"]');
      const voteBtns = document.querySelectorAll('.grid.grid-cols-2 button');
      return {
        hasGrid: Boolean(grid),
        hasHeaderBar: Boolean(headerBar),
        hasCalc: Boolean(calc),
        voteBtnsCount: voteBtns.length,
      };
    });

    check(tagEasy, 'Thanh vòng/tim nằm trên cùng', easyLayout.hasHeaderBar);
    check(tagEasy, 'Có bố cục đối chiếu 2 cột khi rộng (grid-cols-1 md:grid-cols-2)', easyLayout.hasGrid);
    check(tagEasy, 'Máy tính PageCodeCalculator hiển thị', easyLayout.hasCalc);
    check(tagEasy, 'Đủ 2 nút biểu quyết (Đồng ý / Từ chối)', easyLayout.voteBtnsCount >= 2);

    // Kiểm tra nhập máy tính và tính toán
    const inputX = await page.$('[data-testid="page-code-x"]');
    const inputC = await page.$('[data-testid="page-code-c"]');
    if (inputX && inputC) {
      await inputX.click({ clickCount: 3 });
      await inputX.type('10');
      await inputC.click({ clickCount: 3 });
      await inputC.type('24');
      await sleep(200);

      const calcResult = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="page-code-result"]');
        return el ? el.innerText.trim() : '';
      });
      check(tagEasy, 'Máy tính tính đúng công thức (10 × 2 + 24) mod 100 = 44', calcResult.includes('44'), calcResult);
    }

    await shot(ctx, 'de-bo-cuc-doi-chieu');

    // Nhấn nút Đồng ý để mở FeedbackSheet
    const dongYBtn = await page.evaluateHandle(() => {
      return [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Đồng ý'));
    });
    if (dongYBtn.asElement()) {
      await tap(ctx, dongYBtn.asElement());
      await page.waitForSelector('.rounded-t-3xl', { timeout: 10000 });
      await sleep(400);

      const feedbackOpen = await page.evaluate(() => {
        return Boolean(document.querySelector('.rounded-t-3xl'));
      });
      check(tagEasy, 'Bấm biểu quyết mở FeedbackSheet giải thích', feedbackOpen);
      await shot(ctx, 'de-feedback-mo');

      // Đóng FeedbackSheet để chuyển tiếp
      const continueBtn = await page.evaluateHandle(() => {
        return [...document.querySelectorAll('.rounded-t-3xl button')].find(
          (b) => b.innerText.includes('Vòng tiếp') || b.innerText.includes('Xem kết quả') || b.innerText.includes('Tiếp tục')
        );
      });
      if (continueBtn.asElement()) {
        await tap(ctx, continueBtn.asElement());
        await sleep(500);
        const feedbackClosed = await page.evaluate(() => {
          return !document.querySelector('.rounded-t-3xl');
        });
        check(tagEasy, 'Đóng FeedbackSheet tiếp tục vòng chơi bình thường', feedbackClosed);
      }
    }

    // ==========================================
    // 2. Trạm Trung bình (Màn 4): So sổ trước khi duyệt
    // ==========================================
    // Cài tiến độ đã hoàn thành Trạm Dễ (3 sao) để tự động vào Trạm Trung bình
    await page.evaluate((p) => {
      const prog = { ...p, lv: { ...p.lv, '4': [1, 0, 3, 0, 0] } };
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(prog))}; path=/`;
    }, baseCookie);
    await page.goto(`${BASE}/lang/lang-det/man/4`, { waitUntil: 'domcontentloaded' });
    await advanceToPlay(page);
    await sleep(600);

    const tagMed = `Medium ${size.name}`;
    const medLayout = await page.evaluate(() => {
      const grid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2');
      const headerBar = document.querySelector('.rounded-bang.border-2.border-nau-go\\/50.bg-white\\/60');
      const calc = document.querySelector('[data-testid="page-code-calculator"]');
      const voteBtns = document.querySelectorAll('.grid.grid-cols-2 button');
      return {
        hasGrid: Boolean(grid),
        hasHeaderBar: Boolean(headerBar),
        hasCalc: Boolean(calc),
        voteBtnsCount: voteBtns.length,
      };
    });

    check(tagMed, 'Thanh vòng/tim nằm trên cùng', medLayout.hasHeaderBar);
    check(tagMed, 'Có bố cục đối chiếu 2 cột khi rộng (grid-cols-1 md:grid-cols-2)', medLayout.hasGrid);
    check(tagMed, 'Máy tính PageCodeCalculator hiển thị', medLayout.hasCalc);
    check(tagMed, 'Đủ 2 nút biểu quyết (Đồng ý / Từ chối)', medLayout.voteBtnsCount >= 2);

    // Kiểm tra tính toán trên trạm Trung bình
    const medInputX = await page.$('[data-testid="page-code-x"]');
    const medInputC = await page.$('[data-testid="page-code-c"]');
    if (medInputX && medInputC) {
      await medInputX.click({ clickCount: 3 });
      await medInputX.type('15');
      await medInputC.click({ clickCount: 3 });
      await medInputC.type('30');
      await sleep(200);

      const medCalcResult = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="page-code-result"]');
        return el ? el.innerText.trim() : '';
      });
      check(tagMed, 'Máy tính tính đúng công thức (15 × 2 + 30) mod 100 = 60', medCalcResult.includes('60'), medCalcResult);
    }

    await shot(ctx, 'tb-bo-cuc-doi-chieu');

    // Thao tác nút Từ chối để mở FeedbackSheet
    const tuChoiBtn = await page.evaluateHandle(() => {
      return [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Từ chối'));
    });
    if (tuChoiBtn.asElement()) {
      await tap(ctx, tuChoiBtn.asElement());
      await page.waitForSelector('.rounded-t-3xl', { timeout: 10000 });
      await sleep(400);

      const medFeedbackOpen = await page.evaluate(() => {
        return Boolean(document.querySelector('.rounded-t-3xl'));
      });
      check(tagMed, 'Bấm biểu quyết mở FeedbackSheet giải thích', medFeedbackOpen);
      await shot(ctx, 'tb-feedback-mo');

      const medContinueBtn = await page.evaluateHandle(() => {
        return [...document.querySelectorAll('.rounded-t-3xl button')].find(
          (b) => b.innerText.includes('Vòng tiếp') || b.innerText.includes('Xem kết quả') || b.innerText.includes('Tiếp tục')
        );
      });
      if (medContinueBtn.asElement()) {
        await tap(ctx, medContinueBtn.asElement());
        await sleep(500);
        const medFeedbackClosed = await page.evaluate(() => {
          return !document.querySelector('.rounded-t-3xl');
        });
        check(tagMed, 'Đóng FeedbackSheet tiếp tục vòng chơi bình thường', medFeedbackClosed);
      }
    }

    await page.close();
  }

  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  console.log(`\nKết quả kiểm tra bố cục đối chiếu: ${passed}/${total} đạt.`);
  writeFileSync(`${OUT}/ket-qua-doi-chieu.json`, JSON.stringify(results, null, 2));

  if (passed < total) process.exit(1);
}

run().catch((e) => {
  console.error('Lỗi kiểm tra:', e);
  process.exit(1);
});
