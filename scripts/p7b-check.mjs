// Script kiểm tra chuyên sâu P7b: Hoàn thiện và kiểm lối chơi Đập Chuột 2D
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_PROBE = 'http://localhost:5194';
const BASE_DEV = 'http://localhost:5174';
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

  const testReport = {
    timestamp: new Date().toISOString(),
    tests: [],
  };

  try {
    // =========================================================================
    // PHẦN A: KIỂM TRA TRÊN 3 KÍCH THƯỚC (GIAO DIỆN, THỐNG NHẤT ĐIỀU KHIỂN & ĐO DỪNG)
    // =========================================================================
    for (const vp of VIEWPORTS) {
      console.log(`\n================ KÍCH THƯỚC ${vp.name} ================`);
      const page = await browser.newPage();
      await page.setViewport(vp);

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_PROBE,
      });

      await page.goto(`${BASE_PROBE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await sleep(1000);

      // 1. Thẻ bắt đầu
      await page.screenshot({ path: `${OUT}/01-bat-dau-${vp.name}.png` });
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
        if (btn) btn.click();
      });
      await sleep(800);

      // 2. Giao diện đang chơi
      await page.screenshot({ path: `${OUT}/02-dang-choi-${vp.name}.png` });

      // 3. Kiểm tra thống nhất điều khiển: đập khi ngoài vùng đập vs trong vùng đập
      await page.evaluate(() => {
        if (window.__whack) {
          window.__whack.mice = [
            { id: 991, kind: 'thuong', lane: 0, pos: 3.0, speed: 2, hits: 1, freeze: 0, flash: false, changed: false },
            { id: 992, kind: 'thuong', lane: 1, pos: 7.5, speed: 2, hits: 1, freeze: 0, flash: false, changed: false },
          ];
        }
      });
      await sleep(100);

      // Đập làn 0 (chuột ở pos 3.0 ngoài vùng đập)
      if (vp.hasTouch) await page.tap('[data-testid="nut-dap-0"]');
      else await page.keyboard.press('KeyD');
      await sleep(150);

      const hitOutsideResult = await page.evaluate(() => {
        const m = window.__whack?.mice.find((x) => x.id === 991);
        return { mouseAlive: !!m, pos: m?.pos };
      });
      console.log(`[${vp.name}] Đập khi chuột ngoài vùng đập: Chuột vẫn còn = ${hitOutsideResult.mouseAlive}`);

      // Đập làn 1 (chuột ở pos 7.5 trong vùng đập)
      if (vp.hasTouch) await page.tap('[data-testid="nut-dap-1"]');
      else await page.keyboard.press('KeyF');
      await sleep(150);

      const hitInsideResult = await page.evaluate(() => {
        const m = window.__whack?.mice.find((x) => x.id === 992);
        return { mouseKilled: !m };
      });
      console.log(`[${vp.name}] Đập khi chuột trong vùng đập: Chuột đã bị hạ = ${hitInsideResult.mouseKilled}`);
      await page.screenshot({ path: `${OUT}/03-thao-tac-dap-${vp.name}.png` });

      // 4. Đo trực tiếp thời gian và vị trí đối tượng khi mở hộp "?" (Xác nhận tạm dừng 100%)
      await page.evaluate(() => {
        if (window.__whack) {
          window.__whack.mice = [{ id: 993, kind: 'thuong', lane: 2, pos: 4.0, speed: 2, hits: 1, freeze: 0, flash: false, changed: false }];
        }
      });
      await sleep(100);

      // Mở hộp "?"
      const helpBtn = await page.$('button[aria-label*="Hướng dẫn"], button[aria-label*="giúp"], [data-testid="nut-tro-giup"]');
      if (helpBtn) await helpBtn.click();
      else await page.keyboard.press('KeyH');
      await sleep(400);

      // Đo thời điểm t0 trong lúc mở "?"
      const t0 = await page.evaluate(() => ({
        clock: window.__whack?.clock,
        pos: window.__whack?.mice[0]?.pos,
      }));
      await sleep(500); // Chờ 500ms
      // Đo thời điểm t1
      const t1 = await page.evaluate(() => ({
        clock: window.__whack?.clock,
        pos: window.__whack?.mice[0]?.pos,
      }));

      const pausedExact = t0.clock === t1.clock && t0.pos === t1.pos;
      console.log(`[${vp.name}] Đo dừng khi mở "?": t0(clock=${t0.clock}, pos=${t0.pos}) vs t1(clock=${t1.clock}, pos=${t1.pos}) -> Đứng yên 100%: ${pausedExact}`);
      await page.screenshot({ path: `${OUT}/04-do-dung-khi-mo-help-${vp.name}.png` });

      // Đóng hộp "?"
      await page.keyboard.press('Escape');
      await sleep(300);

      // Đo lại sau khi đóng hộp: thời gian tiếp tục chạy không nhảy cóc
      const t2 = await page.evaluate(() => ({
        clock: window.__whack?.clock,
        pos: window.__whack?.mice[0]?.pos,
      }));
      const resumedSmooth = t2.clock >= t1.clock;
      console.log(`[${vp.name}] Tiếp tục sau khi đóng "?": clock=${t2.clock} -> Mượt mà: ${resumedSmooth}`);

      // 5. Chuột câu hỏi ❓ và Chống click ma
      // Đặt chuột câu hỏi vào vùng đập
      await page.evaluate(() => {
        if (window.__whack) {
          window.__whack.phase = 'bossRun';
          window.__whack.boss = { index: 0, lane: 2, pos: 7.2, t: 1.0, answerSeconds: 15 };
        }
      });
      await sleep(200);
      await page.screenshot({ path: `${OUT}/05-chuot-cau-hoi-${vp.name}.png` });

      // Nhấn giữ chuột câu hỏi 650ms rồi nhấc tay (mô phỏng touch-hold)
      const bossEl = await page.$('[data-testid="chuot-cau-hoi"]');
      if (bossEl) {
        const box = await bossEl.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await sleep(650); // Giữ > 600ms
          await page.mouse.up();
        }
      }
      await sleep(500);

      // Kiểm tra: Dialog câu hỏi mở, chưa có đáp án nào bị chọn nhầm
      const ghostClickCheck = await page.evaluate(() => {
        const answeredStatus = !!document.querySelector('[data-testid="trum-cau-hoi"] [role="status"]');
        return { dialogOpen: !!document.querySelector('[data-testid="trum-cau-hoi"]'), answeredStatus };
      });
      console.log(`[${vp.name}] Chống click ma khi chạm giữ: Dialog mở = ${ghostClickCheck.dialogOpen}, Chưa nộp/chưa chọn nhầm = ${!ghostClickCheck.answeredStatus}`);
      await page.screenshot({ path: `${OUT}/06-hop-cau-hoi-chong-click-ma-${vp.name}.png` });

      // Chọn đáp án trong QuizCard (thẻ button trong danh sách ul)
      await page.evaluate(() => {
        const choiceBtn = document.querySelector('[data-testid="trum-cau-hoi"] ul button');
        if (choiceBtn) choiceBtn.click();
      });
      await sleep(600);
      await page.screenshot({ path: `${OUT}/07-giai-thich-cau-hoi-${vp.name}.png` });

      // Kiểm tra Enter giữ > 1s không tự "Chơi tiếp"
      await page.keyboard.down('Enter');
      await sleep(1100);
      const stillOpenAfterHoldEnter = await page.evaluate(() => !!document.querySelector('[data-testid="trum-cau-hoi"]'));
      await page.keyboard.up('Enter');
      console.log(`[${vp.name}] Giữ Enter > 1s không tự Chơi tiếp: Dialog vẫn mở = ${stillOpenAfterHoldEnter}`);

      // Bấm Chơi tiếp chu kỳ mới để tiếp tục
      await page.evaluate(() => {
        const nextBtn = [...document.querySelectorAll('[data-testid="trum-cau-hoi"] button')].find(
          (b) => (b.textContent || '').includes('Chơi tiếp') || (b.textContent || '').includes('Tiếp tục')
        );
        if (nextBtn) nextBtn.click();
      });
      await sleep(500);

      testReport.tests.push({
        viewport: vp.name,
        hitOutsideBlocked: hitOutsideResult.mouseAlive,
        hitInsideKilled: hitInsideResult.mouseKilled,
        pausedExact,
        resumedSmooth,
        ghostClickPrevented: !ghostClickCheck.answeredStatus,
        stillOpenAfterHoldEnter,
      });

      await page.close();
    }

    // =========================================================================
    // PHẦN B: CHƠI TRỌN VÁN THUA VÌ ĐẦY 8 VẾT MỰC & CHƠI LẠI
    // =========================================================================
    console.log(`\n================ KIỂM TRA TRỌN VÁN: THUA VÌ ĐẦY MỰC & CHƠI LẠI ================`);
    const pageLoss = await browser.newPage();
    await pageLoss.setViewport({ width: 1366, height: 768 });
    await pageLoss.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_PROBE,
    });

    await pageLoss.goto(`${BASE_PROBE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await pageLoss.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(600);

    // Để chuột lọt tới sổ đủ 8 vết mực
    await pageLoss.evaluate(() => {
      if (window.__whack) {
        window.__whack.ink = 7;
        window.__whack.mice = [{ id: 888, kind: 'thuong', lane: 0, pos: 9.99, speed: 2, hits: 1, freeze: 0, flash: false, changed: false }];
      }
    });
    await sleep(800);

    const lossResult = await pageLoss.evaluate(() => {
      const hetVan = document.querySelector('[data-testid="het-van"]');
      const text = hetVan ? hetVan.textContent : '';
      return {
        isEnded: window.__whack?.phase === 'ended',
        reason: window.__whack?.ended,
        ink: window.__whack?.ink,
        hetVanText: text,
      };
    });
    console.log(`[Thua mực] Kết thúc vì đầy mực: reason=${lossResult.reason}, ink=${lossResult.ink}, Text: ${lossResult.hetVanText}`);
    await pageLoss.screenshot({ path: `${OUT}/08-thua-vi-day-muc.png` });

    // Bấm "Xem kết quả"
    await pageLoss.evaluate(() => {
      const btn = document.querySelector('[data-testid="nut-ket-qua"]');
      if (btn) btn.click();
    });
    await sleep(800);
    await pageLoss.screenshot({ path: `${OUT}/09-man-ket-qua-thua.png` });

    // Bấm "Chơi lại"
    await pageLoss.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Chơi lại') || (b.textContent || '').includes('Thử lại'));
      if (btn) btn.click();
    });
    await sleep(1000);

    const replayed = await pageLoss.evaluate(() => {
      return window.__whack?.ink === 0 && window.__whack?.score === 0;
    });
    console.log(`[Thua mực] Bấm Chơi lại -> Reset ván mới: ink=0, score=0 -> Thành công: ${replayed}`);
    await pageLoss.screenshot({ path: `${OUT}/10-choi-lai-van-moi.png` });
    await pageLoss.close();

    // =========================================================================
    // PHẦN C: CHƠI TRỌN VÁN HOÀN THÀNH 10 TRÙM (THẮNG VÁN & PHẦN THƯỞNG 1 LẦN)
    // =========================================================================
    console.log(`\n================ KIỂM TRA TRỌN VÁN: HOÀN THÀNH ĐỦ 10 TRÙM ================`);
    const pageWin = await browser.newPage();
    await pageWin.setViewport({ width: 1366, height: 768 });
    await pageWin.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_PROBE,
    });

    await pageWin.goto(`${BASE_PROBE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await pageWin.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(600);

    // Tiến tới lượt trùm thứ 10 (đã xong 9 lượt)
    await pageWin.evaluate(() => {
      if (window.__whack) {
        window.__whack.bossesDone = 9;
        window.__whack.phase = 'bossRun';
        window.__whack.boss = { index: 9, lane: 1, pos: 7.2, t: 1.0, answerSeconds: 10 };
      }
    });
    await sleep(300);

    // Kích hoạt trùm 10 bằng cách gõ phím F
    await pageWin.keyboard.press('KeyF');
    await sleep(600);

    // Chọn đáp án trong QuizCard
    await pageWin.evaluate(() => {
      const choiceBtn = document.querySelector('[data-testid="trum-cau-hoi"] ul button');
      if (choiceBtn) choiceBtn.click();
    });
    await sleep(600);

    // Bấm Chơi tiếp
    await pageWin.evaluate(() => {
      const nextBtn = [...document.querySelectorAll('[data-testid="trum-cau-hoi"] button')].find(
        (b) => (b.textContent || '').includes('Chơi tiếp') || (b.textContent || '').includes('Tiếp tục')
      );
      if (nextBtn) nextBtn.click();
    });
    await sleep(800);

    const winResult = await pageWin.evaluate(() => {
      const hetVan = document.querySelector('[data-testid="het-van"]');
      return {
        isEnded: window.__whack?.phase === 'ended',
        reason: window.__whack?.ended,
        bossesDone: window.__whack?.bossesDone,
        hetVanText: hetVan ? hetVan.textContent : '',
      };
    });
    console.log(`[Thắng ván] Hoàn thành 10 trùm: reason=${winResult.reason}, bossesDone=${winResult.bossesDone}, Text: ${winResult.hetVanText}`);
    await pageWin.screenshot({ path: `${OUT}/11-thang-hoan-thanh-10-trum.png` });

    // Bấm Xem kết quả
    await pageWin.evaluate(() => {
      const btn = document.querySelector('[data-testid="nut-ket-qua"]');
      if (btn) btn.click();
    });
    await sleep(800);
    await pageWin.screenshot({ path: `${OUT}/12-man-ket-qua-thang.png` });
    await pageWin.close();

    // =========================================================================
    // PHẦN D: TỰ HOÀN THÀNH GIỮA VÁN TRÊN BẢN DEV
    // =========================================================================
    console.log(`\n================ KIỂM TRA TỰ HOÀN THÀNH GIỮA VÁN TRÊN BẢN DEV ================`);
    const pageDev = await browser.newPage();
    await pageDev.setViewport({ width: 1366, height: 768 });
    await pageDev.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_DEV,
    });

    await pageDev.goto(`${BASE_DEV}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await pageDev.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(600);

    // Mở hộp "?" giữa ván
    const devHelpBtn = await pageDev.$('button[aria-label*="Hướng dẫn"], button[aria-label*="giúp"], [data-testid="nut-tro-giup"]');
    if (devHelpBtn) await devHelpBtn.click();
    else await pageDev.keyboard.press('KeyH');
    await sleep(500);
    await pageDev.screenshot({ path: `${OUT}/13-dev-hop-tro-giup-giua-van.png` });

    // Bấm nút Tự hoàn thành trong hộp "?"
    await pageDev.evaluate(() => {
      const autoBtn = [...document.querySelectorAll('[role="dialog"] button')].find((b) => (b.textContent || '').includes('Tự hoàn thành'));
      if (autoBtn) autoBtn.click();
    });
    await sleep(1000);

    const autoDone = await pageDev.evaluate(() => {
      return document.body.textContent.includes('Đã tự động hoàn thành') || document.body.textContent.includes('tự hoàn thành');
    });
    console.log(`[Dev] Tự hoàn thành giữa ván thành công: ${autoDone}`);
    await pageDev.screenshot({ path: `${OUT}/14-dev-da-tu-hoan-thanh-giua-van.png` });
    await pageDev.close();

    writeFileSync(`${OUT}/ket-qua-p7b.json`, JSON.stringify(testReport, null, 2), 'utf-8');
    console.log('\nĐã hoàn thành toàn bộ kịch bản kiểm tra P7b và lưu kết quả vào ket-qua-p7b.json!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi kiểm tra P7b:', err);
  process.exit(1);
});
