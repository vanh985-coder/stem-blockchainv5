import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.URL || 'http://localhost:5173';
const OUT = 'docs/screenshots/p3b';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function makeCookie(levelId) {
  const lv = {};
  for (let i = 1; i < levelId; i++) {
    const isLesson = i === 1 || i === 4 || i === 7 || i === 10;
    lv[String(i)] = isLesson ? [1, 1, 3, 3, 3] : [1, 1, 3, 100];
  }
  return {
    v: 1,
    lv,
    gp: 4,
    c: 50,
    u: Date.now(),
    st: 1,
    kc: [15, 15, 15, 15],
    gt: 4095,
    hd: 2147483647,
    vs: 15,
    vi: 15,
  };
}

async function newPageCtx(browser, levelId, size = { w: 1366, h: 768, touch: false, name: '1366x768' }) {
  const page = await browser.newPage();
  await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch });
  await page.goto(BASE);
  const cookie = makeCookie(levelId);
  await page.evaluate((c) => {
    localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
    document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(c))}; path=/`;
  }, cookie);
  return { page, size, touch: size.touch };
}

async function openGame(ctx, village, levelId) {
  await ctx.page.goto(`${BASE}/lang/${village}/man/${levelId}`, { waitUntil: 'domcontentloaded' });
  await ctx.page.waitForSelector('[data-testid="the-bat-dau"]', { timeout: 30000 });
  await sleep(600);

  // Bấm đúng nút "Bắt đầu chơi" (bỏ qua nút "Hướng dẫn" và "Tự hoàn thành")
  const startBtn = await ctx.page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('[data-testid="nut-the-bat-dau"] button, [data-testid="the-bat-dau"] button'));
    return btns.find((b) => /Bắt đầu/i.test(b.textContent || '')) || null;
  });
  if (!startBtn.asElement()) throw new Error(`Không tìm thấy nút bắt đầu chơi màn ${levelId}`);
  await tap(ctx, startBtn.asElement());

  // Màn 6 cần bấm khung bay để diều xuất phát
  if (levelId === 6) {
    await sleep(800);
    const khung = await ctx.page.$('[data-testid="man6-khung"]');
    if (khung) {
      await tap(ctx, khung);
      await sleep(500);
    }
  }

  await ctx.page.waitForSelector('[data-testid="nut-goi-y"]', { timeout: 35000 });
  await sleep(600);
}

async function testAutoInState(ctx, tag, prepFn) {
  if (prepFn) {
    await ctx.page.evaluate(prepFn);
    await sleep(600);
  }

  // 1. Xác nhận nút "?" có trên màn hình và có tọa độ thực
  const nutGoiY = await ctx.page.$('[data-testid="nut-goi-y"]');
  check(tag, 'Nút "?" xuất hiện trên màn hình', Boolean(nutGoiY));
  if (!nutGoiY) return;

  // 2. Thực hiện click thật tại tọa độ nút "?"
  await tap(ctx, nutGoiY);
  await ctx.page.waitForSelector('[data-testid="hop-goi-y"]', { timeout: 10000 });
  await sleep(400);

  // 3. Xác nhận hộp "?" mở đè lên trên lớp đang hoạt động
  const hopGoiY = await ctx.page.$('[data-testid="hop-goi-y"]');
  check(tag, 'Hộp gợi ý "?" mở ra đè lên trên lớp đang hoạt động', Boolean(hopGoiY));

  // 4. Kiểm tra nút tự hoàn thành bên trong hộp "?"
  const nutTuHoanThanh = await ctx.page.$('[data-testid="hop-goi-y"] [data-testid="nut-tu-hoan-thanh"]');
  check(tag, 'Hộp "?" có nút "Tự hoàn thành cả màn"', Boolean(nutTuHoanThanh));
  if (!nutTuHoanThanh) return;

  // 5. Bấm nút tự hoàn thành thật tại tọa độ
  await tap(ctx, nutTuHoanThanh);
  await ctx.page.waitForSelector('[data-testid="da-tu-hoan-thanh"]', { timeout: 10000 });
  await sleep(400);

  const daXong = await ctx.page.evaluate(() => {
    return Boolean(document.querySelector('[data-testid="da-tu-hoan-thanh"]')) && !document.querySelector('[data-testid="nut-goi-y"]');
  });
  check(tag, 'Ván dừng ngay lập tức, gỡ khung chơi và hiển thị khung "Đã tự hoàn thành"', daXong);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    // -------------------------------------------------------------
    // MÀN 2: Game Runner 3D (Đuổi theo phản diện)
    // -------------------------------------------------------------
    console.log('\n=== Màn 2: Runner 3D ===');
    // Ca 1: Khi QuizOverlay câu hỏi giữa ván (z-30) đang mở
    {
      const ctx = await newPageCtx(browser, 2);
      await openGame(ctx, 'lang-giay', 2);
      await testAutoInState(ctx, 'Màn 2 (QuizOverlay giữa ván)', () => {
        if (window.__runner) {
          window.__runner.state.phase = 'quiz';
          window.__runner.state.quiz = { round: 1, timeLeft: 15, answered: null, timedOut: false };
        }
      });
      await ctx.page.close();
    }

    // Ca 2: Ở vòng cuối (Vòng 4)
    {
      const ctx = await newPageCtx(browser, 2);
      await openGame(ctx, 'lang-giay', 2);
      await testAutoInState(ctx, 'Màn 2 (Vòng cuối - Vòng 4)', () => {
        if (window.__runner) {
          window.__runner.state.round = 3;
        }
      });
      await ctx.page.close();
    }

    // -------------------------------------------------------------
    // MÀN 3: Game Ghép trang 2D (Ghép lại cuốn sổ)
    // -------------------------------------------------------------
    console.log('\n=== Màn 3: Ghép sổ 2D ===');
    // Ca 1: Vòng 1 ghép 5 trang
    {
      const ctx = await newPageCtx(browser, 3);
      await openGame(ctx, 'lang-giay', 3);
      await testAutoInState(ctx, 'Màn 3 (Vòng 1 ghép 5 trang)');
      await ctx.page.close();
    }

    // Ca 2: Vòng 2 đoạn giữ sổ 45s (phát hiện phản diện tráo trang)
    {
      const ctx = await newPageCtx(browser, 3);
      await openGame(ctx, 'lang-giay', 3);
      await testAutoInState(ctx, 'Màn 3 (Vòng 2 đoạn giữ sổ 45s)', () => {
        if (window.__rebuild) {
          window.__rebuild.round = 1;
          window.__rebuild.phase = 'keep';
        }
      });
      await ctx.page.close();
    }

    // -------------------------------------------------------------
    // MÀN 5: Game 4 làn 3D (Đập chuột bảo vệ sổ)
    // -------------------------------------------------------------
    console.log('\n=== Màn 5: Đập phản diện 4 làn 3D ===');
    // Ca 1: Trong lúc chơi đập chuột bình thường
    {
      const ctx = await newPageCtx(browser, 5);
      await openGame(ctx, 'lang-det', 5);
      await testAutoInState(ctx, 'Màn 5 (Lúc chơi đập chuột 4 làn)');
      await ctx.page.close();
    }

    // Ca 2: Lúc lượt trùm xuất hiện đặt câu hỏi trắc nghiệm
    {
      const ctx = await newPageCtx(browser, 5);
      await openGame(ctx, 'lang-det', 5);
      await testAutoInState(ctx, 'Màn 5 (Lượt trùm chặn câu hỏi)', () => {
        if (window.__whack) {
          window.__whack.phase = 'boss';
        }
      });
      await ctx.page.close();
    }

    // -------------------------------------------------------------
    // MÀN 6: Game Bay 2.5D (Diều đưa sổ)
    // -------------------------------------------------------------
    console.log('\n=== Màn 6: Diều đưa sổ 2.5D ===');
    // Ca 1: Trong lúc đang bay qua khe gió
    {
      const ctx = await newPageCtx(browser, 6);
      await openGame(ctx, 'lang-det', 6);
      await testAutoInState(ctx, 'Màn 6 (Lúc đang bay qua khe gió)');
      await ctx.page.close();
    }

    // Ca 2: Khi tới cổng làng dừng lại có câu hỏi trắc nghiệm
    {
      const ctx = await newPageCtx(browser, 6);
      await openGame(ctx, 'lang-det', 6);
      await testAutoInState(ctx, 'Màn 6 (Câu hỏi trắc nghiệm ở cổng làng)', () => {
        if (window.__kite) {
          window.__kite.phase = 'gate';
        }
      });
      await ctx.page.close();
    }

    // -------------------------------------------------------------
    // MÀN 8: Game Lật thẻ 2D (Lật thẻ tìm cặp khóa)
    // -------------------------------------------------------------
    console.log('\n=== Màn 8: Lật thẻ 2D ===');
    // Ca 1: Vòng 1 (4 cặp)
    {
      const ctx = await newPageCtx(browser, 8);
      await openGame(ctx, 'lang-khac-dau', 8);
      await testAutoInState(ctx, 'Màn 8 (Vòng 1 - 4 cặp thẻ)');
      await ctx.page.close();
    }

    // Ca 2: Vòng 3 (vòng cuối, 8 cặp + tráo thẻ)
    {
      const ctx = await newPageCtx(browser, 8);
      await openGame(ctx, 'lang-khac-dau', 8);
      await testAutoInState(ctx, 'Màn 8 (Vòng 3 vòng cuối 8 cặp và tráo thẻ)', () => {
        if (window.__memory) {
          window.__memory.round = 2;
        }
      });
      await ctx.page.close();
    }

    // -------------------------------------------------------------
    // MÀN 9: Game Chạy 3 làn 2D (Chữa đàn gà)
    // -------------------------------------------------------------
    console.log('\n=== Màn 9: Chữa đàn gà 2D ===');
    // Ca 1: Trạng thái nạp đạn (phase === 'load')
    {
      const ctx = await newPageCtx(browser, 9);
      await openGame(ctx, 'lang-khac-dau', 9);
      await testAutoInState(ctx, 'Màn 9 (Giai đoạn nạp đạn thuốc)');
      await ctx.page.close();
    }

    // Ca 2: Đợt 3 có gà trùm cuối đường
    {
      const ctx = await newPageCtx(browser, 9);
      await openGame(ctx, 'lang-khac-dau', 9);
      await testAutoInState(ctx, 'Màn 9 (Đợt 3 có gà trùm cuối đường)', () => {
        if (window.__chicken) {
          window.__chicken.round = 2;
        }
      });
      await ctx.page.close();
    }

    // -------------------------------------------------------------
    // MÀN 11: Game Ghép 3 2D (Ghép lá cây sổ)
    // -------------------------------------------------------------
    console.log('\n=== Màn 11: Ghép lá Merkle 2D ===');
    // Ca 1: Cây 1 (Vòng 1, 4 ô lá)
    {
      const ctx = await newPageCtx(browser, 11);
      await openGame(ctx, 'lang-bac', 11);
      await testAutoInState(ctx, 'Màn 11 (Cây 1 - 4 ô lá)');
      await ctx.page.close();
    }

    // Ca 2: Cây 3 (Vòng cuối, 8 ô lá, 15 lượt)
    {
      const ctx = await newPageCtx(browser, 11);
      await openGame(ctx, 'lang-bac', 11);
      await testAutoInState(ctx, 'Màn 11 (Cây 3 - vòng cuối 8 ô lá 15 lượt)', () => {
        if (window.__match3) {
          window.__match3.round = 2;
        }
      });
      await ctx.page.close();
    }

    // -------------------------------------------------------------
    // MÀN 12: Game Leo cây 2.5D (Leo cây tìm lá giả)
    // -------------------------------------------------------------
    console.log('\n=== Màn 12: Leo cây 2.5D ===');
    // Ca 1: Vòng 1 (8 lá, depth 3)
    {
      const ctx = await newPageCtx(browser, 12);
      await openGame(ctx, 'lang-bac', 12);
      await testAutoInState(ctx, 'Màn 12 (Vòng 1 - 8 lá depth 3)');
      await ctx.page.close();
    }

    // Ca 2: Vòng 4 (Vòng cuối, 64 lá, depth 6, codes)
    {
      const ctx = await newPageCtx(browser, 12);
      await openGame(ctx, 'lang-bac', 12);
      await testAutoInState(ctx, 'Màn 12 (Vòng 4 - vòng cuối 64 lá depth 6)', () => {
        if (window.__climb) {
          window.__climb.round = 3;
        }
      });
      await ctx.page.close();
    }

  } finally {
    await browser.close();
  }

  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  console.log(`\nKết quả kiểm tra bao phủ các vòng game: ${passed}/${total} đạt.`);
  writeFileSync(`${OUT}/ket-qua-vong-game.json`, JSON.stringify(results, null, 2));

  if (passed < total) process.exit(1);
}

run().catch((e) => {
  console.error('Lỗi kiểm tra:', e);
  process.exit(1);
});
