import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.URL || 'http://localhost:5173';
const OUT = 'docs/screenshots/may-tinh-man8';
mkdirSync(OUT, { recursive: true });

const SIZES = [
  { name: '1366x768', w: 1366, h: 768, touch: false },
  { name: '360x800', w: 360, h: 800, touch: true },
  { name: '844x390', w: 844, h: 390, touch: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const guestCookie = {
  v: 1,
  lv: {
    '1': [1, 1, 3, 3, 3],
    '7': [1, 1, 3, 3, 3],
    '8': [1, 0, 0, 0, 0],
  },
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
  if (!handle) return;
  await handle.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
  try {
    if (ctx.touch && handle.tap) {
      await handle.tap();
    } else {
      await handle.click();
    }
  } catch {
    await handle.evaluate((el) => el.click());
  }
}

async function shot(ctx, name) {
  const path = `${OUT}/${name}.jpg`;
  await ctx.page.screenshot({ path, type: 'jpeg', quality: 75 });
}

async function replaceInput(page, text) {
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.type(text);
}

async function main() {
  console.log('=== KIỂM THỬ PHÓNG TO MÁY TÍNH MÀN 8 (LẬT THẺ TÌM CẶP KHÓA) ===');
  console.log(`URL: ${BASE}`);
  console.log(`Chrome: ${CHROME}`);
  console.log(`Thư mục lưu ảnh: ${OUT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const measurements = [];

  try {
    for (const size of SIZES) {
      console.log(`\n--- Kiểm tra kích thước ${size.name} (${size.touch ? 'Chạm giả lập' : 'Chuột + Bàn phím'}) ---`);
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      const ctx = { page, touch: size.touch, size };

      await page.setViewport({
        width: size.w,
        height: size.h,
        hasTouch: size.touch,
        isMobile: size.touch,
        deviceScaleFactor: 1,
      });

      // Set cookie khách
      await page.goto(`${BASE}/ban-do`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((cookieData) => {
        document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(cookieData))}; path=/`;
      }, guestCookie);

      // Điều hướng vào màn 8
      await page.goto(`${BASE}/lang/lang-khac-dau/man/8?q=low`, { waitUntil: 'networkidle0' });
      await sleep(1000);

      // Thẻ bắt đầu
      const startBtn = await page.waitForSelector('button ::-p-text(Bắt đầu)', { visible: true, timeout: 8000 });
      check(size.name, 'Thẻ bắt đầu game hiện rõ', !!startBtn);
      await tap(ctx, startBtn);

      // Chờ vào game
      await page.waitForFunction(() => window.__memory && window.__memory.phase === 'playing', { timeout: 10000 });
      await sleep(1000);

      // 1. Kiểm tra máy tính hiện sẵn
      const calcEl = await page.waitForSelector('[data-testid="may-tinh-mod"]', { visible: true, timeout: 5000 });
      check(size.name, 'Máy tính mod hiện sẵn trên màn hình', !!calcEl);

      const inputEl = await page.waitForSelector('[data-testid="o-nhap-x"]', { visible: true });
      check(size.name, 'Ô nhập x hiện sẵn', !!inputEl);

      // 2. Đo kích thước chữ và ô nhập thực tế
      const dims = await page.evaluate(() => {
        const calc = document.querySelector('[data-testid="may-tinh-mod"]');
        const input = document.querySelector('[data-testid="o-nhap-x"]');
        const label = calc?.querySelector('label');
        const title = calc?.querySelector('p.font-display');
        const result = document.querySelector('[data-testid="ket-qua-mod"]');

        const calcRect = calc?.getBoundingClientRect();
        const inputRect = input?.getBoundingClientRect();

        const inputStyle = window.getComputedStyle(input);
        const labelStyle = window.getComputedStyle(label);
        const titleStyle = window.getComputedStyle(title);
        const resultStyle = window.getComputedStyle(result);

        const cards = [...document.querySelectorAll('[data-testid="the"]')].map((el) => {
          const r = el.getBoundingClientRect();
          return { id: el.dataset.id, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        });

        const hud = document.querySelector('[data-testid="hud"]')?.getBoundingClientRect();
        const line = document.querySelector('[data-testid="dong-ket-qua"]')?.getBoundingClientRect();
        const hintBtn = document.querySelector('[data-testid="nut-goi-y"]')?.getBoundingClientRect();

        const overlapsCards = cards.some(
          (c) => calcRect.left < c.right && calcRect.right > c.left && calcRect.top < c.bottom && calcRect.bottom > c.top
        );
        const overlapsHud = hud
          ? calcRect.left < hud.right && calcRect.right > hud.left && calcRect.top < hud.bottom && calcRect.bottom > hud.top
          : false;
        const overlapsLine = line
          ? calcRect.left < line.right && calcRect.right > line.left && calcRect.top < line.bottom && calcRect.bottom > line.top
          : false;
        const overlapsHint = hintBtn
          ? calcRect.left < hintBtn.right && calcRect.right > hintBtn.left && calcRect.top < hintBtn.bottom && calcRect.bottom > hintBtn.top
          : false;

        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = window.innerWidth;

        return {
          calcW: Math.round(calcRect.width * 10) / 10,
          calcH: Math.round(calcRect.height * 10) / 10,
          inputH: Math.round(inputRect.height * 10) / 10,
          inputW: Math.round(inputRect.width * 10) / 10,
          inputFontSize: parseFloat(inputStyle.fontSize),
          labelFontSize: parseFloat(labelStyle.fontSize),
          titleFontSize: parseFloat(titleStyle.fontSize),
          resultFontSize: parseFloat(resultStyle.fontSize),
          overlapsCards,
          overlapsHud,
          overlapsLine,
          overlapsHint,
          hasHScroll: scrollWidth > clientWidth,
        };
      });

      console.log(`   Số đo thực tế ${size.name}:`, dims);
      measurements.push({ size: size.name, ...dims });

      check(size.name, 'Cỡ chữ nhãn >= 16px', dims.labelFontSize >= 16, `${dims.labelFontSize}px`);
      check(size.name, 'Cỡ chữ tiêu đề >= 16px', dims.titleFontSize >= 16, `${dims.titleFontSize}px`);
      check(size.name, 'Cỡ chữ kết quả >= 16px', dims.resultFontSize >= 16, `${dims.resultFontSize}px`);
      check(size.name, 'Chiều cao ô nhập thực tế >= 44px', dims.inputH >= 44, `${dims.inputH}px`);
      check(size.name, 'Không đè lên bất kỳ thẻ nào ở Vòng 1', !dims.overlapsCards);
      check(size.name, 'Không đè lên HUD', !dims.overlapsHud);
      check(size.name, 'Không đè lên dòng kết quả', !dims.overlapsLine);
      check(size.name, 'Không đè lên nút gợi ý "?"', !dims.overlapsHint);
      check(size.name, 'Không gây cuộn ngang toàn trang', !dims.hasHScroll);

      // Chụp ảnh Vòng 1
      await shot(ctx, `man8-${size.name}-vong1`);

      // 3. Thử nghiệm nhập x = 3 -> 5^3 mod 23 = 10
      await tap(ctx, inputEl);
      await page.type('[data-testid="o-nhap-x"]', '3');
      await sleep(200);

      const resText = await page.$eval('[data-testid="ket-qua-mod"]', (el) => el.textContent);
      check(size.name, 'Nhập x = 3 cho kết quả 5³ mod 23 = 10', /10/.test(resText), resText);

      // 4. Thử nghiệm nhập số không hợp lệ 99 -> thông báo lỗi
      await replaceInput(page, '99');
      await sleep(200);
      const errDims = await page.evaluate(() => {
        const errSpan = document.querySelector('[data-testid="ket-qua-mod"] span.text-do-son-dam');
        const errText = errSpan?.textContent || '';
        const fs = errSpan ? parseFloat(window.getComputedStyle(errSpan).fontSize) : 0;
        return { errText, fs };
      });
      check(size.name, 'Nhập 99 hiện lỗi hợp lệ', errDims.errText.includes('1 đến 22'), errDims.errText);
      check(size.name, 'Cỡ chữ thông báo lỗi >= 16px', errDims.fs >= 16, `${errDims.fs}px`);

      // Xóa và nhập lại x = 3
      await replaceInput(page, '3');
      await sleep(200);

      // 5. Thử mở và đóng hộp gợi ý "?"
      const hintBtn = await page.$('[data-testid="nut-goi-y"]');
      if (hintBtn) {
        await tap(ctx, hintBtn);
        await sleep(400);
        const hintOpen = await page.$('[data-testid="hop-goi-y"]');
        check(size.name, 'Mở hộp gợi ý "?" thành công', !!hintOpen);
        // Đóng lại bằng nút "Chơi tiếp"
        const closeBtn = await page.waitForSelector('button ::-p-text(Chơi tiếp)', { visible: true });
        await tap(ctx, closeBtn);
        await page.waitForFunction(() => !document.querySelector('[data-testid="hop-goi-y"]'), { timeout: 3000 });
        await sleep(400);
        const valAfterHint = await page.$eval('[data-testid="o-nhap-x"]', (el) => el.value);
        check(size.name, 'Sau khi đóng gợi ý, máy tính giữ nguyên giá trị', valAfterHint === '3');
      }

      // 6. Giải Vòng 1 và Vòng 2 để kiểm tra Vòng 2 và Vòng 3
      console.log(`   Tiến hành giải qua các vòng...`);
      for (let round = 0; round < 2; round++) {
        const pairs = await page.evaluate(() => [...new Set(window.__memory.cards.map((c) => c.pairKey))]);
        console.log(`   Vòng ${round + 1}: có ${pairs.length} cặp:`, pairs);
        for (const key of pairs) {
          const cardIds = await page.evaluate(
            (k) => window.__memory.cards.filter((c) => c.pairKey === k && !c.isMatched).map((c) => c.id),
            key
          );
          for (const cid of cardIds) {
            await page.waitForFunction(() => !window.__memory.waitingFlipBack, { timeout: 5000 }).catch(() => {});
            const needed = await page.evaluate((id) => {
              const c = window.__memory.cards.find((cd) => cd.id === id);
              return c && !c.isFlipped && !c.isMatched;
            }, cid);
            if (needed) {
              const handle = await page.$(`[data-id="${cid}"]`);
              if (handle) {
                console.log(`     Bấm thẻ ${cid}`);
                await tap(ctx, handle);
                await sleep(200);
              }
            }
          }
          const matchedState = await page.evaluate((k) => {
            const pairCards = window.__memory.cards.filter((c) => c.pairKey === k);
            return pairCards.map((c) => ({ id: c.id, flipped: c.isFlipped, matched: c.isMatched }));
          }, key);
          console.log(`     Cặp ${key}:`, matchedState);
        }

        // Chờ kết thúc vòng
        console.log(`   Chờ vòng ${round + 1} kết thúc...`);
        await page.waitForFunction(
          () => window.__memory.phase === 'roundDone' || window.__memory.phase === 'gameOver',
          { timeout: 10000 }
        );
        console.log(`   Vòng ${round + 1} hoàn thành!`);
        await sleep(500);

        if (round === 0) {
          // Bấm tiếp sang Vòng 2 bằng tap/click thật
          const nextBtn = await page.waitForSelector('[data-testid="nut-tiep"]', { visible: true });
          await tap(ctx, nextBtn);
          await page.waitForFunction(() => window.__memory.round === 1 && window.__memory.phase === 'playing', {
            timeout: 8000,
          });
          await sleep(800);

          // Kiểm tra Vòng 2 (12 thẻ)
          console.log(`   Đã vào Vòng 2 (12 thẻ).`);
          const v2Check = await page.evaluate(() => {
            const calc = document.querySelector('[data-testid="may-tinh-mod"]')?.getBoundingClientRect();
            const cards = [...document.querySelectorAll('[data-testid="the"]')].map((el) => el.getBoundingClientRect());
            const overlaps = cards.some(
              (c) => calc.left < c.right && calc.right > c.left && calc.top < c.bottom && calc.bottom > c.top
            );
            return { count: cards.length, overlaps };
          });
          check(size.name, 'Vòng 2 có 12 thẻ', v2Check.count === 12, `${v2Check.count} thẻ`);
          check(size.name, 'Vòng 2 (12 thẻ): máy tính không che thẻ nào', !v2Check.overlaps);
          await shot(ctx, `man8-${size.name}-vong2`);
        } else if (round === 1) {
          // Bấm tiếp sang Vòng 3 bằng tap/click thật
          const nextBtn = await page.waitForSelector('[data-testid="nut-tiep"]', { visible: true });
          await tap(ctx, nextBtn);
          await page.waitForFunction(() => window.__memory.round === 2 && window.__memory.phase === 'playing', {
            timeout: 8000,
          });
          await sleep(800);

          // Kiểm tra Vòng 3 (16 THẺ)
          console.log(`   Đã vào Vòng 3 (16 thẻ).`);
          const v3Check = await page.evaluate(() => {
            const calc = document.querySelector('[data-testid="may-tinh-mod"]')?.getBoundingClientRect();
            const cards = [...document.querySelectorAll('[data-testid="the"]')].map((el) => el.getBoundingClientRect());
            const overlaps = cards.some(
              (c) => calc.left < c.right && calc.right > c.left && calc.top < c.bottom && calc.bottom > c.top
            );
            return {
              count: cards.length,
              overlaps,
              calcW: Math.round(calc.width * 10) / 10,
              calcH: Math.round(calc.height * 10) / 10,
            };
          });
          check(size.name, 'Vòng 3 có đúng 16 thẻ', v3Check.count === 16, `${v3Check.count} thẻ`);
          check(size.name, 'Vòng 3 (16 thẻ): máy tính không che bất kỳ thẻ nào', !v3Check.overlaps);

          // Kiểm tra cơ chế dừng đồng hồ tráo khi focus ô nhập
          const timerBeforeFocus = await page.evaluate(() => window.__memory.swapTimerMs);
          const inputHandle = await page.$('[data-testid="o-nhap-x"]');
          if (inputHandle) {
            await tap(ctx, inputHandle);
            await sleep(300);
            const timerDuringFocus = await page.evaluate(() => window.__memory.swapTimerMs);
            await sleep(300);
            const timerStillPaused = await page.evaluate(() => window.__memory.swapTimerMs);
            check(
              size.name,
              'Khi focus ô nhập, đồng hồ tráo tạm dừng',
              timerDuringFocus === timerStillPaused,
              `timer: ${timerDuringFocus}ms`
            );
          }

          await shot(ctx, `man8-${size.name}-vong3`);
        }
      }

      await context.close();
    }

    // Ghi file kết quả đo
    const reportData = {
      timestamp: new Date().toISOString(),
      measurements,
      totalChecks: results.length,
      passedChecks: results.filter((r) => r.ok).length,
      failedChecks: results.filter((r) => !r.ok).length,
      results,
    };
    writeFileSync(`${OUT}/so-do-man8.json`, JSON.stringify(reportData, null, 2), 'utf-8');

    console.log('\n=== TỔNG KẾT KIỂM THỬ ===');
    console.log(`Tổng số kiểm tra: ${results.length}`);
    console.log(`Đạt: ${reportData.passedChecks}`);
    console.log(`Lỗi: ${reportData.failedChecks}`);

    if (reportData.failedChecks > 0) {
      console.error('CÓ KIỂM TRA THẤT BẠI!');
      process.exitCode = 1;
    } else {
      console.log('TẤT CẢ KIỂM TRA ĐẠT HOÀN TOÀN!');
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Lỗi thực thi kiểm tra:', err);
  process.exit(1);
});
