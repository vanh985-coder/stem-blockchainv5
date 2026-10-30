// Script kiểm tra chuyên sâu P7c: Làm lại đồ họa 2D Màn 5 bằng bộ 15 ảnh hoạt hình
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_PROBE = 'http://localhost:5194';
const BASE_DEV = 'http://localhost:5174';
const OUT = 'docs/screenshots/p7c';
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

const PC_VIEWPORTS = [
  { name: '1366x768', width: 1366, height: 768, isMobile: false, hasTouch: false },
  { name: '1536x864', width: 1536, height: 864, isMobile: false, hasTouch: false },
  { name: '1920x1080', width: 1920, height: 1080, isMobile: false, hasTouch: false },
];

const MOBILE_VIEWPORTS = [
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
    pcLayout: [],
    mobileLayout: [],
    gameplay: [],
  };

  try {
    // =========================================================================
    // PHẦN 1: KIỂM TRA BỐ CỤC PC (1366x768, 1536x864, 1920x1080)
    // TẬN DỤNG CHIỀU CAO, KHÔNG KẸT NỬA TRÊN, KHÔNG CÓ NỀN KEM TRỐNG DƯỚI, KHÔNG SCROLLBAR
    // =========================================================================
    for (const vp of PC_VIEWPORTS) {
      console.log(`\n================ KIỂM TRA PC: ${vp.name} ================`);
      const page = await browser.newPage();
      await page.setViewport(vp);

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_PROBE,
      });

      await page.goto(`${BASE_PROBE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await sleep(1000);

      // 1.1 Thẻ bắt đầu
      await page.screenshot({ path: `${OUT}/01-pc-bat-dau-${vp.name}.png` });

      // Bấm "Bắt đầu"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
        if (btn) btn.click();
      });
      await sleep(800);

      // 1.2 Đo lường bố cục và chiều cao sân chơi
      const layoutMetrics = await page.evaluate(() => {
        const lanes = document.querySelector('[data-testid="man5-lanes"]');
        const hero = document.querySelector('[data-testid="hero-figure"]');
        const book = document.querySelector('[data-testid="so-chung-day"]');
        const footer = document.querySelector('footer');

        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const docScrollHeight = document.documentElement.scrollHeight;
        const hasScrollbar = docScrollHeight > windowHeight + 2;

        const lanesRect = lanes ? lanes.getBoundingClientRect() : null;
        const heroRect = hero ? hero.getBoundingClientRect() : null;
        const bookRect = book ? book.getBoundingClientRect() : null;
        const footerRect = footer ? footer.getBoundingClientRect() : null;

        const totalGameHeight = footerRect && heroRect ? (footerRect.bottom - heroRect.top) : 0;
        const heightOccupancyRatio = totalGameHeight / windowHeight;

        return {
          windowWidth,
          windowHeight,
          docScrollHeight,
          hasScrollbar,
          lanesRect: lanesRect ? { w: Math.round(lanesRect.width), h: Math.round(lanesRect.height), top: Math.round(lanesRect.top) } : null,
          heroRect: heroRect ? { w: Math.round(heroRect.width), h: Math.round(heroRect.height) } : null,
          bookRect: bookRect ? { w: Math.round(bookRect.width), h: Math.round(bookRect.height) } : null,
          footerRect: footerRect ? { w: Math.round(footerRect.width), h: Math.round(footerRect.height), bottom: Math.round(footerRect.bottom) } : null,
          totalGameHeight: Math.round(totalGameHeight),
          heightOccupancyRatio: Number(heightOccupancyRatio.toFixed(3)),
        };
      });

      console.log(`[PC ${vp.name}] Tỉ lệ chiếm chiều cao: ${(layoutMetrics.heightOccupancyRatio * 100).toFixed(1)}% (tổng ${layoutMetrics.totalGameHeight}px / ${layoutMetrics.windowHeight}px)`);
      console.log(`[PC ${vp.name}] Kích thước 4 làn: ${layoutMetrics.lanesRect?.w}px x ${layoutMetrics.lanesRect?.h}px`);
      console.log(`[PC ${vp.name}] Có thanh cuộn thừa: ${layoutMetrics.hasScrollbar ? 'CÓ (LỖI)' : 'KHÔNG (CHUẨN)'}`);

      testReport.pcLayout.push({
        viewport: vp.name,
        metrics: layoutMetrics,
        noScrollbar: !layoutMetrics.hasScrollbar,
        heightRatioPass: layoutMetrics.heightOccupancyRatio >= 0.70,
      });

      // 1.3 Kiểm tra asset ảnh nạp thành công, không dùng fallback
      const assetsStatus = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('img')];
        const man5Imgs = imgs.filter((img) => img.src.includes('man5-2d'));
        return man5Imgs.map((img) => ({
          src: img.src.split('/').pop(),
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          loaded: img.complete && img.naturalWidth > 0,
        }));
      });

      console.log(`[PC ${vp.name}] Số lượng ảnh man5-2d đang render: ${assetsStatus.length}`);
      for (const a of assetsStatus) {
        if (!a.loaded) console.error(`[PC ${vp.name}] LỖI nạp ảnh: ${a.src}`);
      }

      // Chụp ảnh sân chơi đang hoạt động
      await page.screenshot({ path: `${OUT}/02-pc-san-choi-${vp.name}.png` });

      // Thao tác đập phím D để kiểm tra hero vung búa
      await page.keyboard.press('KeyD');
      await sleep(50);
      const heroHitting = await page.evaluate(() => {
        const heroImg = document.querySelector('[data-testid="hero-img"]') || document.querySelector('img[alt*="nhân vật"]');
        return heroImg ? heroImg.src.includes('hero-hit') : false;
      });
      console.log(`[PC ${vp.name}] Hero chuyển sang sprite vung búa khi nhấn phím: ${heroHitting}`);
      await page.screenshot({ path: `${OUT}/03-pc-hero-vung-bua-${vp.name}.png` });

      await sleep(200);
      await page.close();
    }

    // =========================================================================
    // PHẦN 2: KIỂM TRA MOBILE (360x800 DỌC VÀ 844x390 NGANG)
    // NÚT BẤM >= 44px, KHÔNG VỠ KHUNG, RESPONSIVE VỪA VẶN
    // =========================================================================
    for (const vp of MOBILE_VIEWPORTS) {
      console.log(`\n================ KIỂM TRA MOBILE: ${vp.name} ================`);
      const page = await browser.newPage();
      await page.setViewport(vp);

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_PROBE,
      });

      await page.goto(`${BASE_PROBE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await sleep(800);

      // Bấm "Bắt đầu"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
        if (btn) btn.click();
      });
      await sleep(800);

      const mobileMetrics = await page.evaluate(() => {
        const btns = [0, 1, 2, 3].map((lane) => {
          const el = document.querySelector(`[data-testid="nut-dap-${lane}"]`);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { lane, width: Math.round(r.width), height: Math.round(r.height) };
        });

        const lanes = document.querySelector('[data-testid="man5-lanes"]');
        const lanesRect = lanes ? lanes.getBoundingClientRect() : null;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const hasHScroll = document.documentElement.scrollWidth > windowWidth;

        return {
          windowWidth,
          windowHeight,
          hasHScroll,
          lanesRect: lanesRect ? { w: Math.round(lanesRect.width), h: Math.round(lanesRect.height) } : null,
          buttons: btns,
        };
      });

      console.log(`[Mobile ${vp.name}] Kích thước nút đập: ${JSON.stringify(mobileMetrics.buttons)}`);
      const btnSizePass = mobileMetrics.buttons.every((b) => b && b.height >= 44);
      console.log(`[Mobile ${vp.name}] Đạt chuẩn chiều cao nút bấm >= 44px: ${btnSizePass}`);

      testReport.mobileLayout.push({
        viewport: vp.name,
        metrics: mobileMetrics,
        buttonHeightPass: btnSizePass,
        noHorizontalScroll: !mobileMetrics.hasHScroll,
      });

      await page.screenshot({ path: `${OUT}/04-mobile-san-choi-${vp.name}.png` });
      await page.close();
    }

    // =========================================================================
    // PHẦN 3: KIỂM TRA CHUYÊN SÂU LỐI CHƠI (GAMEPLAY & INTERACTION)
    // CHỐNG CLICK MA, DỪNG THỜI GIAN, ENTER LẶP, TRẢ LỜI CÂU HỎI & PROBE CHUYỂN TRẠNG THÁI
    // =========================================================================
    console.log('\n================ KIỂM TRA LỐI CHƠI & ĐIỀU KHIỂN ================');
    const pagePlay = await browser.newPage();
    await pagePlay.setViewport({ width: 1366, height: 768 });

    await pagePlay.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_PROBE,
    });

    await pagePlay.goto(`${BASE_PROBE}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await pagePlay.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(600);

    // 3.1 Bật chuột câu hỏi trùm qua probe để kiểm tra hiển thị ❓ vàng
    const bossTriggered = await pagePlay.evaluate(() => {
      if (window.__whackSetBoss) {
        window.__whackSetBoss(2, 7.2, 0);
        return true;
      }
      return false;
    });
    console.log(`[Probe] Đặt Trùm Chuột Câu Hỏi ở làn 2, pos 7.2: ${bossTriggered}`);
    await sleep(400);

    // Kiểm tra chuột câu hỏi có icon ❓ vàng lớn và nhãn
    const bossRendered = await pagePlay.evaluate(() => {
      const boss = document.querySelector('[data-testid="chuot-cau-hoi"]');
      if (!boss) return null;
      const text = boss.textContent || '';
      const hasQIcon = text.includes('❓');
      const rect = boss.getBoundingClientRect();
      return { hasQIcon, rect: { w: Math.round(rect.width), h: Math.round(rect.height) } };
    });
    console.log(`[Gameplay] Chuột Câu Hỏi render với icon ❓ vàng lớn: ${bossRendered?.hasQIcon}`);
    await pagePlay.screenshot({ path: `${OUT}/05-chuot-cau-hoi-xuat-hien.png` });

    // 3.2 Đập làn 2 bằng phím J để kích hoạt câu hỏi
    await pagePlay.keyboard.press('KeyJ');
    await sleep(500);

    // Kiểm tra Modal câu hỏi đã mở
    const quizOpened = await pagePlay.evaluate(() => {
      return !!document.querySelector('[data-testid="trum-cau-hoi"]');
    });
    console.log(`[Gameplay] Modal câu hỏi trùm mở thành công: ${quizOpened}`);
    await pagePlay.screenshot({ path: `${OUT}/06-modal-cau-hoi-mo.png` });

    // 3.3 Kiểm tra dừng thời gian 100% trong lúc mở modal câu hỏi
    const t0 = await pagePlay.evaluate(() => {
      const conGioEl = document.querySelector('[data-testid="con-gio"]');
      return conGioEl ? conGioEl.textContent : null;
    });
    await sleep(1500); // Đợi 1.5s
    const t1 = await pagePlay.evaluate(() => {
      const conGioEl = document.querySelector('[data-testid="con-gio"]');
      return conGioEl ? conGioEl.textContent : null;
    });
    console.log(`[Gameplay] Thời gian đứng yên khi mở câu hỏi: ${t0} === ${t1}`);

    // 3.4 Chọn đáp án đúng qua click
    await pagePlay.evaluate(() => {
      const q = window.__whackQuestions ? window.__whackQuestions[0] : null;
      if (!q) return;
      const btns = document.querySelectorAll('[data-testid="trum-cau-hoi"] ul button');
      if (btns[q.correctIndex]) {
        btns[q.correctIndex].click();
      }
    });
    await sleep(500);
    await pagePlay.screenshot({ path: `${OUT}/07-tra-loi-dung-cau-hoi.png` });

    // 3.5 Bấm "Tiếp tục" bằng phím Space
    await pagePlay.keyboard.press('Space');
    await sleep(500);

    // 3.6 Kiểm tra chuyển trạng thái thua khi đầy 8 vết mực
    console.log('\n--- Kiểm tra kết thúc ván: Thua do đầy 8 vết mực ---');
    await pagePlay.evaluate(() => {
      if (window.__whackTriggerEnd) {
        window.__whackTriggerEnd('ink');
      }
    });
    await sleep(500);

    // Kiểm tra xem ending xuất hiện
    const inkEndVisible = await pagePlay.evaluate(() => {
      const endDialog = document.querySelector('[data-testid="het-van"]');
      return endDialog ? (endDialog.textContent || '').includes('đầy mực') : false;
    });
    console.log(`[Gameplay] Modal kết thúc ván do đầy 8 mực hiển thị: ${inkEndVisible}`);
    await pagePlay.screenshot({ path: `${OUT}/08-ket-thuc-thua-muc.png` });

    // Bấm nút "Xem kết quả"
    await pagePlay.evaluate(() => {
      const btn = document.querySelector('[data-testid="nut-ket-qua"]');
      if (btn) btn.click();
    });
    await sleep(800);
    await pagePlay.screenshot({ path: `${OUT}/09-man-ket-qua-thua.png` });

    // Bấm "Chơi lại"
    await pagePlay.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Chơi lại'));
      if (btn) btn.click();
    });
    await sleep(800);

    // 3.7 Kiểm tra chuyển trạng thái thắng khi hoàn thành 10 trùm
    console.log('\n--- Kiểm tra kết thúc ván: Thắng sau 10 trùm ---');
    await pagePlay.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(600);

    // Dùng probe chuyển trạng thái kết thúc ván thắng
    await pagePlay.evaluate(() => {
      if (window.__whackTriggerEnd) {
        window.__whackTriggerEnd('complete');
      }
    });
    await sleep(500);

    const winEndVisible = await pagePlay.evaluate(() => {
      const endDialog = document.querySelector('[data-testid="het-van"]');
      return endDialog ? (endDialog.textContent || '').includes('10 lượt') : false;
    });
    console.log(`[Gameplay] Modal kết thúc ván thắng hiển thị: ${winEndVisible}`);
    await pagePlay.screenshot({ path: `${OUT}/10-ket-thuc-thang-10-trum.png` });

    // Bấm xem kết quả thắng
    await pagePlay.evaluate(() => {
      const btn = document.querySelector('[data-testid="nut-ket-qua"]');
      if (btn) btn.click();
    });
    await sleep(800);
    await pagePlay.screenshot({ path: `${OUT}/11-man-ket-qua-thang.png` });

    await pagePlay.close();

    // =========================================================================
    // PHẦN 4: KIỂM TRA BẢN DEV (CỜ TỰ HOÀN THÀNH GIỮA VÁN)
    // =========================================================================
    console.log('\n================ KIỂM TRA TỰ HOÀN THÀNH TRÊN DEV ================');
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
    await pageDev.screenshot({ path: `${OUT}/12-dev-hop-tro-giup.png` });

    // Bấm nút Tự hoàn thành
    await pageDev.evaluate(() => {
      const autoBtn = [...document.querySelectorAll('[role="dialog"] button')].find((b) => (b.textContent || '').includes('Tự hoàn thành'));
      if (autoBtn) autoBtn.click();
    });
    await sleep(1000);

    const autoDone = await pageDev.evaluate(() => {
      return document.body.textContent.includes('Đã tự động hoàn thành') || document.body.textContent.includes('tự hoàn thành');
    });
    console.log(`[Dev] Tự hoàn thành giữa ván thành công: ${autoDone}`);
    await pageDev.screenshot({ path: `${OUT}/13-dev-da-tu-hoan-thanh.png` });

    // Đọc cookie sc_guest và kiểm tra cấu trúc
    const devCookies = await pageDev.cookies(BASE_DEV);
    const guestCookieAfter = devCookies.find((c) => c.name === 'sc_guest');
    if (guestCookieAfter) {
      const parsed = JSON.parse(decodeURIComponent(guestCookieAfter.value));
      console.log(`[Dev] Cờ ac sau tự hoàn thành: ${parsed.ac}`);
      console.log(`[Dev] Bản ghi Màn 5 sau tự hoàn thành: ${JSON.stringify(parsed.lv?.[5])}`);
      console.log(`[Dev] Xu sau tự hoàn thành: ${parsed.c}`);
    }

    await pageDev.close();

    // Lưu kết quả tổng hợp
    writeFileSync(`${OUT}/ket-qua-p7c.json`, JSON.stringify(testReport, null, 2), 'utf-8');
    console.log(`\nToàn bộ kịch bản kiểm tra P7c đã hoàn thành và lưu vào ${OUT}/ket-qua-p7c.json!`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi chạy kiểm tra P7c:', err);
  process.exit(1);
});
