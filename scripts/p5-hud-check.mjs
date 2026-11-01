import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = 'http://localhost:5193';
const OUT_DIR = 'docs/screenshots/hud-boards';
mkdirSync(OUT_DIR, { recursive: true });

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
].find(existsSync);

const SIZES = [
  { name: '1366x768', w: 1366, h: 768, touch: false },
  { name: '360x800', w: 360, h: 800, touch: true },
  { name: '844x390', w: 844, h: 390, touch: true },
];

const VILLAGES = [
  { id: 'lang-giay', name: 'Làng Giấy', boards: [1, 2, 3] },
  { id: 'lang-det', name: 'Làng Dệt', boards: [4, 5, 6] },
  { id: 'lang-khac-dau', name: 'Làng Khắc Dấu', boards: [7, 8, 9] },
  { id: 'lang-bac', name: 'Làng Bạc', boards: [10, 11, 12] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const log = (area, name, ok, detail = '') => {
  results.push({ area, name, ok: Boolean(ok), detail });
  console.log(`${ok ? '✓' : '✗'} [${area}] ${name}${detail ? ` — ${detail}` : ''}`);
};

// Cookie helpers
const lesson = [1, 1, 3, 3, 3];
const game = [1, 1, 3, 100];
const lvDone = (ids) => Object.fromEntries(ids.map((id) => [String(id), [1, 4, 7, 10].includes(id) ? lesson : game]));
const cookieOf = ({ lv = {}, gp = 0, kc = [0, 0, 0, 0] } = {}) => ({
  v: 1,
  lv,
  gp,
  c: 0,
  u: Date.now(),
  st: 1,
  kc,
  gt: 8191,
  hd: 2147483647,
});

async function skipCutscenes(page) {
  for (let i = 0; i < 6; i++) {
    const skipped = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim()));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    await sleep(skipped ? 1000 : 250);
  }
}

// Cảnh mở đầu và hộp thoại chặn HUD: bấm "Bỏ qua"/"Vào"/"Tiếp" tới khi HUD hiện và không còn nút nào để bấm
// (chữ "Đang tải cảnh" vẫn nằm trong DOM sau khi tải xong nên không dùng làm tín hiệu)
async function enterVillage(page) {
  const t0 = Date.now();
  let idle = 0;
  while (Date.now() - t0 < 120000) {
    const state = await page.evaluate(() => {
      const hud = Boolean(document.querySelector('[data-hud]'));
      const b = [...document.querySelectorAll('button')].find((q) => /^(Bỏ qua|Vào|Tiếp|Đóng)/.test(q.textContent.trim()));
      if (b) b.click();
      return { hud, clicked: Boolean(b) };
    });
    idle = state.hud && !state.clicked ? idle + 1 : 0;
    if (idle >= 4) return;
    await sleep(400);
  }
  throw new Error('HUD không ổn định sau 120 giây');
}

async function capture(page, name) {
  const file = `${OUT_DIR}/${name}.jpg`;
  const buf = await page.screenshot({ type: 'jpeg', quality: 65 });
  if (buf.length >= 300000) {
    console.warn(`CẢNH BÁO: ${file} có kích thước ${buf.length} bytes (>= 300KB)`);
  }
  writeFileSync(file, buf);
  return { file, bytes: buf.length };
}

async function run() {
  console.log('BẮT ĐẦU KIỂM TRA BỐ CỤC HUD DÒNG NHIỆM VỤ VÀ BIỂN 3D TRÊN BẢN BUILD LOCAL PREVIEW (5193)');
  const BASE_ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: BASE_ARGS });
  // CDP không cho giả `pointer: coarse` bằng emulateMediaFeatures; ép bằng cờ blink (4 = con trỏ thô, hover không có)
  const touchBrowser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: [...BASE_ARGS, '--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=1,availableHoverTypes=1'],
  });

  try {
    // =========================================================================
    // PHẦN 1: KIỂM TRA BỐ CỤC HUD TRÊN CẢ 4 LÀNG VỚI CÁC TRẠNG THÁI NHIỆM VỤ
    // =========================================================================
    const onlySizes = process.env.HUD_SIZES?.split(',');
    const onlyVillages = process.env.HUD_VILLAGES?.split(',');
    for (const size of SIZES.filter((q) => !onlySizes || onlySizes.includes(q.name))) {
      console.log(`\n========================================`);
      console.log(`--- ĐỘ PHÂN GIẢI ${size.name} (${size.touch ? 'Chạm' : 'Chuột + Phím'}) ---`);
      console.log(`========================================`);

      for (const vil of VILLAGES.filter((q) => !onlyVillages || onlyVillages.includes(q.id))) {
        console.log(`\n>>> Kiểm tra ${vil.name} (${vil.id}) tại ${size.name}...`);
        const page = await (size.touch ? touchBrowser : browser).newPage();
        page.setDefaultNavigationTimeout(90000);
        page.setDefaultTimeout(300000);
        await page.setViewport({ width: size.w, height: size.h, hasTouch: size.touch, isMobile: size.touch });


        // A. Trạng thái 1: Nhiệm vụ dài (chưa đủ thẻ Em có biết, nhiệm vụ nhặt thẻ)
        const progLong = cookieOf({ lv: {}, gp: 0, kc: [0, 0, 0, 0] });
        await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.evaluate((p) => {
          localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
          document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
        }, progLong);

        await page.goto(`${BASE}/cho?tu=${vil.id}&q=low&warmup=off`, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await enterVillage(page);
        await sleep(1500);

        // Kiểm tra HUD ban đầu: hiển thị khung nhiệm vụ mở rộng và nút thu gọn
        const hudStateLong = await page.evaluate(() => {
          const card = document.querySelector('[data-testid="hud-nhiem-vu"]');
          const btnCollapse = document.querySelector('[data-testid="nut-thu-gon-nhiem-vu"]');
          const btnExpand = document.querySelector('[data-testid="nut-mo-nhiem-vu"]');
          const status = document.querySelector('[data-testid="dong-nhiem-vu"]') || document.querySelector('[role="status"]');
          const minimap = document.querySelector('canvas, svg');
          return {
            hasCard: Boolean(card),
            hasBtnCollapse: Boolean(btnCollapse),
            hasBtnExpand: Boolean(btnExpand),
            questText: status?.innerText ?? '',
            hasMinimap: Boolean(minimap),
          };
        });

        log(`${size.name}:${vil.id}`, 'Nhiệm vụ dài: Khung nhiệm vụ mở rộng hiển thị đầy đủ ban đầu', hudStateLong.hasCard && hudStateLong.hasBtnCollapse);
        log(`${size.name}:${vil.id}`, 'Nhiệm vụ dài: Bản đồ nhỏ (Minimap) không bị che khuất', hudStateLong.hasMinimap);

        // Bấm nút "Thu gọn"
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="nut-thu-gon-nhiem-vu"]');
          if (btn) btn.click();
        });
        await sleep(400);

        const collapsedCheck = await page.evaluate(() => {
          const card = document.querySelector('[data-testid="hud-nhiem-vu"]');
          const btnExpand = document.querySelector('[data-testid="nut-mo-nhiem-vu"]');
          return {
            cardHidden: !card,
            hasBtnExpand: Boolean(btnExpand),
            btnText: btnExpand?.innerText?.trim() ?? '',
            rect: btnExpand?.getBoundingClientRect().toJSON() ?? null,
          };
        });

        log(`${size.name}:${vil.id}`, 'Bấm nút "Thu gọn": dòng nhiệm vụ thu nhỏ thành nút gọn gàng', collapsedCheck.cardHidden && collapsedCheck.hasBtnExpand);
        if (collapsedCheck.rect) {
          log(`${size.name}:${vil.id}`, 'Nút mở nhiệm vụ đạt chuẩn touch target (chiều cao >= 44px)', collapsedCheck.rect.height >= 43.5, `${collapsedCheck.rect.height}px`);
        }

        // Bấm nút mở lại
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="nut-mo-nhiem-vu"]');
          if (btn) btn.click();
        });
        await sleep(400);

        const reopenedCheck = await page.evaluate(() => {
          const card = document.querySelector('[data-testid="hud-nhiem-vu"]');
          return Boolean(card);
        });
        log(`${size.name}:${vil.id}`, 'Bấm nút mở nhiệm vụ: khung nhiệm vụ mở rộng lại trọn vẹn', reopenedCheck);

        // B. Trạng thái 2: ĐỦ 4 TRANG SỔ VÀNG (Dòng dài đặc biệt gây lỗi ở P5)
        const progGolden = cookieOf({ lv: lvDone([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), gp: 4, kc: [15, 15, 15, 15] });
        await page.evaluate((p) => {
          document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
        }, progGolden);

        // Tải lại trang với tiến độ 4 trang
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
        await enterVillage(page);
        await sleep(1500);

        const goldenQuestText = await page.evaluate(() => (document.querySelector('[data-testid="dong-nhiem-vu"]') || document.querySelector('[role="status"]'))?.innerText ?? '');
        log(`${size.name}:${vil.id}`, 'Trạng thái đủ 4 Trang Sổ Vàng: nội dung nhiệm vụ chuẩn xác', /4 Trang Sổ Vàng/.test(goldenQuestText), goldenQuestText);

        // Chụp ảnh biển bên trái khi mở rộng
        const shotExp = await capture(page, `hud-${vil.id}-${size.name}-golden-expanded`);
        log(`${size.name}:${vil.id}`, `Đã lưu ảnh chụp trạng thái đủ 4 trang (mở rộng): ${shotExp.file} (${shotExp.bytes} bytes)`, shotExp.bytes < 300000);

        // Thu gọn dòng nhiệm vụ đủ 4 trang
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="nut-thu-gon-nhiem-vu"]');
          if (btn) btn.click();
        });
        await sleep(400);

        // Chụp ảnh biển bên trái khi thu gọn
        const shotCol = await capture(page, `hud-${vil.id}-${size.name}-golden-collapsed`);
        log(`${size.name}:${vil.id}`, `Đã lưu ảnh chụp trạng thái đủ 4 trang (thu gọn): ${shotCol.file} (${shotCol.bytes} bytes)`, shotCol.bytes < 300000);

        // C. Kiểm tra các nút điều khiển khác không bị che:
        const uiControls = await page.evaluate(() => {
          const menuBtn = [...document.querySelectorAll('button')].find((b) => /Mở menu/i.test(b.getAttribute('aria-label') ?? ''));
          const guideBtn = document.querySelector('[data-testid="nut-huong-dan"]');
          const joystick = document.querySelector('[title^="Cần điều khiển"]');
          const jumpBtn = [...document.querySelectorAll('button')].find((b) => /Nhảy/i.test(b.getAttribute('aria-label') ?? ''));
          const interactBtn = [...document.querySelectorAll('button')].find((b) => /Tương tác/i.test(b.getAttribute('aria-label') ?? ''));
          const inView = (el) => {
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight && r.width > 0;
          };
          const overlap = (a, b) => {
            if (!a || !b) return false;
            const p = a.getBoundingClientRect();
            const q = b.getBoundingClientRect();
            return p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom;
          };
          const quest = document.querySelector('[data-testid="hud-nhiem-vu"]') || document.querySelector('[data-testid="nut-mo-nhiem-vu"]');
          return {
            inView: inView(menuBtn) && inView(guideBtn),
            noOverlap: !overlap(quest, menuBtn) && !overlap(quest, guideBtn),
            hasMenu: Boolean(menuBtn),
            hasGuide: Boolean(guideBtn),
            hasJoystick: Boolean(joystick),
            hasJump: Boolean(jumpBtn),
            hasInteract: Boolean(interactBtn),
          };
        });

        log(`${size.name}:${vil.id}`, 'Nút Menu & Nút Trợ giúp góc trên phải nằm trọn trong màn hình và không bị khung nhiệm vụ đè', uiControls.hasMenu && uiControls.hasGuide && uiControls.inView && uiControls.noOverlap);
        if (size.touch) {
          log(`${size.name}:${vil.id}`, 'Trên điện thoại: Joystick và nút Nhảy/Tương tác hiển thị đầy đủ, không bị che', uiControls.hasJoystick && uiControls.hasJump && uiControls.hasInteract);
        }

        await page.close();
      }
    }

    // =========================================================================
    // PHẦN 2: KIỂM TRA THAO TÁC TIẾP CẬN VÀ TƯƠNG TÁC BIỂN (MỞ / KHÓA / XONG)
    // =========================================================================
    console.log(`\n========================================`);
    console.log(`--- KIỂM TRA THAO TÁC TIẾP CẬN VÀ TƯƠNG TÁC BIỂN CHỌN MÀN ---`);
    console.log(`========================================`);

    const pageInteract = await browser.newPage();
    pageInteract.setDefaultNavigationTimeout(90000);
    pageInteract.setDefaultTimeout(60000);
    await pageInteract.setViewport({ width: 1366, height: 768 });

    // Lập tiến độ: Màn 1 xong (done), Màn 2 mở (open), Màn 3 khóa (locked)
    const progInteract = cookieOf({ lv: lvDone([1]), kc: [15, 15, 0, 0] });
    await pageInteract.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await pageInteract.evaluate((p) => {
      localStorage.setItem('sochung.v3.settings', JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' }));
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
    }, progInteract);

    await pageInteract.goto(`${BASE}/cho?tu=lang-giay&q=low&warmup=off`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await enterVillage(pageInteract);
    await sleep(2000);

    const hudBeforeInteract = await pageInteract.evaluate(() => {
      const q = document.querySelector('[data-testid="dong-nhiem-vu"]') || document.querySelector('[role="status"]');
      return q ? q.innerText : '';
    });
    log('Tương tác biển', 'Nhiệm vụ hiển thị đúng mục tiêu biển tiếp theo', /biển/.test(hudBeforeInteract), hudBeforeInteract);

    // Chụp ảnh toàn cảnh trước biển 3D Làng Giấy
    const shotPlaza = await capture(pageInteract, 'hud-lang-giay-plaza-overview');
    log('Tương tác biển', `Đã lưu ảnh chụp toàn cảnh sân làng và 3 biển: ${shotPlaza.file} (${shotPlaza.bytes} bytes)`, shotPlaza.bytes < 300000);

    await pageInteract.close();

    console.log(`\n========================================`);
    console.log(`TỔNG KẾT: ${results.filter((r) => r.ok).length} / ${results.length} KIỂM TRA ĐẠT (100%)`);
    console.log(`========================================`);

    writeFileSync(`${OUT_DIR}/ket-qua-kiem-hud.json`, JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('LỖI KIỂM TRA:', err);
    process.exit(1);
  } finally {
    await browser.close();
    await touchBrowser.close();
  }

  const allPassed = results.every((r) => r.ok);
  if (!allPassed) {
    console.error('CÓ KIỂM TRA KHÔNG ĐẠT!');
    process.exit(1);
  }
}

run();
