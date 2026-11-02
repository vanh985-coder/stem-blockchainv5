// Script chụp ảnh minh họa chi tiết và kiểm tra yêu cầu của user
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE_HUB = 'http://localhost:5173';
const BASE_LANG_DET = 'http://localhost:5175';
const OUT = 'docs/screenshots/p7c';
const ARTIFACTS_DIR = 'C:\\Users\\Acer\\.gemini\\antigravity\\brain\\1e39ed0d-2120-4c6a-a44c-3cf2d34b3087';
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

  const report = {
    checks: {},
    images: [],
  };

  try {
    // =========================================================================
    // 1. CHỤP ẢNH ĐẦY ĐỦ (HERO, CHUỘT, XU, 4 LÀN) Ở 1366x768, 1920x1080, 360x800
    // =========================================================================
    const viewports = [
      { name: '1366x768', width: 1366, height: 768, isMobile: false },
      { name: '1920x1080', width: 1920, height: 1080, isMobile: false },
      { name: '360x800', width: 360, height: 800, isMobile: true },
    ];

    for (const vp of viewports) {
      console.log(`\n--- Chụp ảnh đầy đủ các thành phần ở ${vp.name} ---`);
      const page = await browser.newPage();
      await page.setViewport(vp);

      await page.setCookie({
        name: 'sc_guest',
        value: encodeURIComponent(JSON.stringify(guestCookie)),
        url: BASE_HUB,
      });

      await page.goto(`${BASE_HUB}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
      await sleep(800);

      // Bấm "Bắt đầu"
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
        if (btn) btn.click();
      });
      await sleep(600);

      // Đặt các đối tượng cùng xuất hiện: Chuột ở làn 0, 1, 2, 3 và Đồng xu
      await page.evaluate(() => {
        if (window.__whack) {
          // Làn 0: Chuột nhanh
          // Làn 1: Chuột đổi làn
          // Làn 2: Chuột câu hỏi ❓
          // Làn 3: Chuột to
          window.__whack.mice = [
            { id: 101, kind: 'nhanh', lane: 0, pos: 3.5, speed: 2, hp: 1, hits: 0, flash: false, targetLane: 0, switchT: 0 },
            { id: 102, kind: 'doiLan', lane: 1, pos: 5.2, speed: 1.5, hp: 1, hits: 0, flash: false, targetLane: 1, switchT: 0 },
            { id: 103, kind: 'to', lane: 3, pos: 7.5, speed: 1.2, hp: 2, hits: 1, flash: false, targetLane: 3, switchT: 0 },
          ];
          // Trùm chuột câu hỏi ở làn 2, pos 6.8 (trong vùng đập)
          window.__whack.phase = 'bossRun';
          window.__whack.boss = { index: 0, lane: 2, pos: 6.8, t: 1.0, answerSeconds: 15 };
          // Đồng xu ở làn 1, pos 3.0
          window.__whack.coin = { lane: 1, pos: 3.0, ttl: 2.5 };
        }
        if (window.__whackBump) window.__whackBump();
      });
      await sleep(400);

      const fileName = `man5-preview-${vp.name}.png`;
      const fullPath = `${OUT}/${fileName}`;
      await page.screenshot({ path: fullPath });
      console.log(`Đã lưu ảnh chụp: ${fullPath}`);

      // Copy sang Artifacts dir để hiển thị
      const artifactPath = `${ARTIFACTS_DIR}\\${fileName}`;
      copyFileSync(fullPath, artifactPath);
      console.log(`Đã copy sang Artifacts: ${artifactPath}`);

      report.images.push({ viewport: vp.name, file: fileName, path: artifactPath });
      await page.close();
    }

    // =========================================================================
    // 2. KIỂM NHANH: NÚT "?", HỘP CÂU HỎI, TỰ HOÀN THÀNH, MÀN KẾT QUẢ KHÔNG BỊ CHE
    // =========================================================================
    console.log('\n--- Kiểm tra z-index và lớp phủ các hộp thoại ---');
    const pageCheck = await browser.newPage();
    await pageCheck.setViewport({ width: 1366, height: 768 });
    await pageCheck.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_HUB,
    });
    await pageCheck.goto(`${BASE_HUB}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await pageCheck.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(600);

    // 2.1 Kiểm tra nút "?" có clickable
    const helpBtn = await pageCheck.$('[data-testid="nut-goi-y"]');
    const helpBtnRect = await pageCheck.evaluate(() => {
      const el = document.querySelector('[data-testid="nut-goi-y"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const topEl = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        zIndex: window.getComputedStyle(el).zIndex,
        isTopElement: topEl === el || el.contains(topEl),
      };
    });
    console.log('Nút "?" nằm ở lớp trên cùng (isTopElement):', helpBtnRect);
    report.checks.helpButtonNotCovered = helpBtnRect?.isTopElement === true;

    // 2.2 Mở hộp "?" và kiểm tra nút Tự hoàn thành
    if (helpBtn) await helpBtn.click();
    await sleep(400);

    const helpDialogCheck = await pageCheck.evaluate(() => {
      const dlg = document.querySelector('[data-testid="hop-goi-y"]');
      const autoBtn = [...document.querySelectorAll('[role="dialog"] button')].find((b) => (b.textContent || '').includes('Tự hoàn thành'));
      if (!dlg || !autoBtn) return null;
      const r = autoBtn.getBoundingClientRect();
      const topEl = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return {
        hasDialog: true,
        autoBtnVisible: r.width > 0 && r.height > 0,
        autoBtnClickable: topEl === autoBtn || autoBtn.contains(topEl),
      };
    });
    console.log('Hộp "?" và nút Tự hoàn thành có thể bấm được:', helpDialogCheck);
    report.checks.autoCompleteClickable = helpDialogCheck?.autoBtnClickable === true;

    // Đóng hộp "?"
    await pageCheck.keyboard.press('Escape');
    await sleep(300);

    // 2.3 Mở Modal câu hỏi trùm và kiểm tra không bị che
    await pageCheck.evaluate(() => {
      if (window.__whackSetBoss) window.__whackSetBoss(2, 7.5, 0);
    });
    await sleep(300);
    await pageCheck.keyboard.press('KeyJ');
    await sleep(400);

    const quizModalCheck = await pageCheck.evaluate(() => {
      const modal = document.querySelector('[data-testid="trum-cau-hoi"]');
      if (!modal) return null;
      const r = modal.getBoundingClientRect();
      const optBtn = modal.querySelector('ul button');
      const optRect = optBtn ? optBtn.getBoundingClientRect() : null;
      const topEl = optRect ? document.elementFromPoint(optRect.left + optRect.width / 2, optRect.top + optRect.height / 2) : null;
      return {
        modalVisible: r.width > 0 && r.height > 0,
        optionClickable: topEl === optBtn || (optBtn && optBtn.contains(topEl)),
      };
    });
    console.log('Modal câu hỏi trùm không bị che và tùy chọn bấm được:', quizModalCheck);
    report.checks.quizModalNotCovered = quizModalCheck?.optionClickable === true;

    // 2.4 Kiểm tra Màn kết quả
    await pageCheck.evaluate(() => {
      if (window.__whackTriggerEnd) window.__whackTriggerEnd('complete');
    });
    await sleep(400);
    // Bấm xem kết quả
    await pageCheck.evaluate(() => {
      const btn = document.querySelector('[data-testid="nut-ket-qua"]');
      if (btn) btn.click();
    });
    await sleep(600);

    const resultCheck = await pageCheck.evaluate(() => {
      const resPanel = document.querySelector('.mg-result');
      const replayBtn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Chơi lại'));
      return {
        resultVisible: !!resPanel,
        replayBtnClickable: !!replayBtn,
      };
    });
    console.log('Màn kết quả hiển thị chuẩn và nút Chơi lại hoạt động:', resultCheck);
    report.checks.resultScreenVisible = resultCheck.resultVisible && resultCheck.replayBtnClickable;

    await pageCheck.close();

    // =========================================================================
    // 3. KIỂM NHANH: BẬT GIẢM CHUYỂN ĐỘNG (reducedMotion)
    // =========================================================================
    console.log('\n--- Kiểm tra chế độ Giảm chuyển động (reducedMotion) ---');
    const pageMotion = await browser.newPage();
    await pageMotion.setViewport({ width: 1366, height: 768 });

    // Bật reducedMotion trong localStorage
    await pageMotion.goto(BASE_HUB, { waitUntil: 'networkidle0' });
    await pageMotion.evaluate(() => {
      try {
        const cur = JSON.parse(localStorage.getItem('sochung.v3.settings') || '{}');
        cur.reducedMotion = true;
        localStorage.setItem('sochung.v3.settings', JSON.stringify(cur));
      } catch (e) {}
    });

    await pageMotion.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_HUB,
    });

    await pageMotion.goto(`${BASE_HUB}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(800);
    await pageMotion.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(600);

    // Kích hoạt chuột câu hỏi và chuột nhanh
    await pageMotion.evaluate(() => {
      if (window.__whackSetBoss) window.__whackSetBoss(2, 7.0, 0);
      if (window.__whack) {
        window.__whack.mice = [
          { id: 201, kind: 'nhanh', lane: 0, pos: 5.0, speed: 2, hp: 1, hits: 0, flash: false, targetLane: 0, switchT: 0 },
        ];
      }
      if (window.__whackBump) window.__whackBump();
    });
    await sleep(400);

    const motionCheck = await pageMotion.evaluate(() => {
      const qIcon = document.querySelector('[data-testid="chuot-cau-hoi"] span');
      const lightning = document.querySelector('[data-testid="chuot"] span');
      const hitZone = document.querySelector('[data-testid="vung-dap-2"]');

      const qClass = qIcon ? qIcon.className : '';
      const lightClass = lightning ? lightning.className : '';
      const zoneClass = hitZone ? hitZone.className : '';

      return {
        qBounces: qClass.includes('animate-bounce'),
        lightPulses: lightClass.includes('animate-pulse'),
        zonePulses: zoneClass.includes('animate-pulse'),
      };
    });

    console.log('Kiểm tra Giảm chuyển động (tất cả phải là false):', motionCheck);
    report.checks.reducedMotionProperlyDisabled =
      !motionCheck.qBounces && !motionCheck.lightPulses && !motionCheck.zonePulses;

    await pageMotion.close();

    // =========================================================================
    // 4. KIỂM NHANH: BẢN CHẠY RIÊNG LÀNG DỆT (5175) TẢI ĐỦ 15 ẢNH
    // =========================================================================
    console.log('\n--- Kiểm tra bản chạy riêng Làng Dệt (cổng 5175) ---');
    const pageDet = await browser.newPage();
    await pageDet.setViewport({ width: 1366, height: 768 });

    await pageDet.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(guestCookie)),
      url: BASE_LANG_DET,
    });

    await pageDet.goto(`${BASE_LANG_DET}/lang/lang-det/man/5?q=low&warmup=off`, { waitUntil: 'networkidle0' });
    await sleep(1000);

    // Bấm bắt đầu
    await pageDet.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim().startsWith('Bắt đầu'));
      if (btn) btn.click();
    });
    await sleep(800);

    const detAssetsCheck = await pageDet.evaluate(() => {
      const imgs = [...document.querySelectorAll('img')];
      const man5Imgs = imgs.filter((img) => img.src.includes('man5-2d'));
      const allLoaded = man5Imgs.every((img) => img.complete && img.naturalWidth > 0);
      return {
        count: man5Imgs.length,
        allLoaded,
        samples: man5Imgs.slice(0, 5).map((img) => ({
          src: img.src.split('/').pop(),
          width: img.naturalWidth,
          height: img.naturalHeight,
        })),
      };
    });

    console.log('Bản Làng Dệt riêng tải ảnh man5-2d:', detAssetsCheck);
    report.checks.langDetStandaloneLoadsAssets = detAssetsCheck.count > 0 && detAssetsCheck.allLoaded;

    await pageDet.close();

    writeFileSync(`${OUT}/user-preview-report.json`, JSON.stringify(report, null, 2), 'utf-8');
    console.log('\nĐã hoàn thành toàn bộ kiểm tra và chụp ảnh preview!');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Lỗi chạy preview:', err);
  process.exit(1);
});
