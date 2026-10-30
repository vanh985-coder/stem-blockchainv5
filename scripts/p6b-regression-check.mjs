// Script kiểm tra hồi quy chuyên sâu P6b: Enter giữ > 1s và touch hold > 600ms
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:5194';
const OUT = 'docs/screenshots/p6b';
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

const cookieOf = (kc = [0, 0, 0, 0]) => ({
  v: 1,
  lv: {},
  gp: 0,
  c: 0,
  u: Date.now(),
  st: 1,
  kc,
  gt: 8191,
  hd: 2147483647,
});

async function skipScenes(page) {
  for (let k = 0; k < 6; k++) {
    const skipped = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((el) => {
        const t = (el.textContent || '').trim();
        return /^Bỏ qua/.test(t) || /^Tiếp tục/.test(t) || /^Đóng/.test(t);
      });
      if (b) {
        b.click();
        return true;
      }
      return false;
    });
    await sleep(skipped ? 1200 : 400);
  }
}

async function openVillage(page, id) {
  await page.goto(`${BASE}/cho?tu=${id}&q=low&warmup=off`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__walkPlayer && window.__world && window.__worldInteractables, { timeout: 120000 });
  await skipScenes(page);
  await page.waitForFunction(
    (v) => window.__worldInside === v && window.__worldInteractables.some((i) => i.id.startsWith(`scroll:${v}:`)),
    { timeout: 120000 },
    id
  );
  await skipScenes(page);
  await sleep(2000);
  await skipScenes(page);
}

const scrollsOf = (page, id) =>
  page.evaluate((v) =>
    window.__worldInteractables
      .filter((i) => i.id.startsWith(`scroll:${v}:`))
      .map((i) => ({ index: Number(i.id.split(':')[2]), x: i.x, z: i.z })),
    id
  );

async function teleportTo(page, x, z) {
  await page.evaluate((a, b) => {
    window.__walkPlayer.x = a;
    window.__walkPlayer.z = b;
  }, x, z);
  await sleep(1800);
}

async function openCard(page, id, idx, isTouch) {
  const sc = (await scrollsOf(page, id)).find((s) => s.index === idx);
  if (!sc) return false;
  const offs = [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35], [0.25, 0.25], [-0.25, -0.25]];
  for (let a = 0; a < 6; a++) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((q) => /^Bỏ qua/.test(q.textContent.trim()));
      if (b) b.click();
    });
    await sleep(500);
    await teleportTo(page, sc.x + offs[a][0], sc.z + offs[a][1]);
    if (isTouch) {
      const btn = await page.evaluateHandle(() =>
        [...document.querySelectorAll('button')].find((b) => /^Tương tác với/.test(b.getAttribute('aria-label') ?? ''))
      );
      const el = btn.asElement();
      if (el) {
        const r = await el.boundingBox();
        await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
      }
    } else {
      await page.keyboard.press('KeyE');
    }
    const opened = await page
      .waitForFunction(() => document.querySelector('[data-testid="the-co-cau-hoi"]'), { timeout: 6000 })
      .then(() => true, () => false);
    if (opened) return true;
  }
  return false;
}

async function press(page, sel) {
  const el = await page.$(sel);
  if (!el) throw new Error(`Không thấy ${sel}`);
  await el.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await sleep(150);
  const b = await el.boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}

async function cookieNow(page) {
  const cs = await page.cookies();
  const sc = cs.find((c) => c.name === 'sc_guest');
  if (!sc) return null;
  try {
    return JSON.parse(decodeURIComponent(sc.value));
  } catch {
    return null;
  }
}

async function run() {
  console.log(`Bắt đầu chạy kiểm tra hồi quy P6b trên ${BASE}...`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok: Boolean(ok), detail });
    console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  try {
    // ----------------------------------------------------
    // TEST 1: ENTER GIỮ > 1 GIÂY TRÊN 1366x768 (Desktop)
    // ----------------------------------------------------
    console.log('\n--- 1. Kiểm tra Enter giữ > 1s (Desktop 1366x768) ---');
    const pDesk = await browser.newPage();
    await pDesk.setViewport({ width: 1366, height: 768 });
    await pDesk.evaluateOnNewDocument(() => {
      Element.prototype.requestPointerLock = function () {
        Object.defineProperty(document, 'pointerLockElement', { value: this, configurable: true });
        document.dispatchEvent(new Event('pointerlockchange'));
      };
    });
    await pDesk.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(cookieOf([0, 0, 0, 0]))),
      domain: 'localhost',
      path: '/',
    });

    await openVillage(pDesk, 'lang-giay');
    check('Mở làng thành công, tìm thấy cuộn thẻ', (await scrollsOf(pDesk, 'lang-giay')).length === 4);

    const openedDesk = await openCard(pDesk, 'lang-giay', 0, false);
    check('Mở hộp thẻ #0 bằng phím E thành công', openedDesk);

    // Chọn đáp án A bằng click
    await pDesk.click('[data-testid="dap-an-0"]');
    await sleep(200);

    // Xác nhận đã chọn đáp án A
    const isPicked = await pDesk.evaluate(() => {
      const r = document.querySelector('[data-testid="dap-an-0"] input[type=radio]');
      return r?.checked;
    });
    check('Đã chọn đáp án A trước khi nộp', Boolean(isPicked));

    // Nhấn giữ phím Enter và nộp bài (mô phỏng phím Enter đè liên tục từ lúc nộp)
    console.log('   Nhấn giữ phím Enter và nộp bài...');
    await pDesk.keyboard.down('Enter');
    await pDesk.evaluate(() => document.querySelector('form')?.requestSubmit());
    await sleep(200);

    // Kiểm tra tại 500ms (vượt quá 400ms SAVE_GUARD_MS)
    await sleep(500);
    const mid500State = await pDesk.evaluate(() => ({
      open: Boolean(document.querySelector('[data-testid="the-co-cau-hoi"]')),
      phase: document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase,
    }));
    const mid500Cookie = await cookieNow(pDesk);
    const kc500 = mid500Cookie?.kc ?? [0, 0, 0, 0];
    check('Tại 500ms (vượt SAVE_GUARD_MS 400ms): hộp vẫn mở, feedback, cờ kc[0] === 0 (chưa cất)',
      mid500State.open && mid500State.phase === 'feedback' && kc500[0] === 0,
      `open=${mid500State.open}, phase=${mid500State.phase}, kc[0]=${kc500[0]}`
    );

    // Giữ tiếp đến 1200ms (> 1 giây)
    await sleep(700);
    const mid1200State = await pDesk.evaluate(() => ({
      open: Boolean(document.querySelector('[data-testid="the-co-cau-hoi"]')),
    }));
    const mid1200Cookie = await cookieNow(pDesk);
    const kc1200 = mid1200Cookie?.kc ?? [0, 0, 0, 0];
    check('Tại 1200ms (> 1s): hộp vẫn mở, cờ kc[0] === 0 tuyệt đối không tự cất',
      mid1200State.open && kc1200[0] === 0,
      `open=${mid1200State.open}, kc[0]=${kc1200[0]}`
    );

    // Nhả phím Enter
    console.log('   Nhả phím Enter...');
    await pDesk.keyboard.up('Enter');
    await sleep(200);

    const afterUpState = await pDesk.evaluate(() => ({
      open: Boolean(document.querySelector('[data-testid="the-co-cau-hoi"]')),
    }));
    const afterUpCookie = await cookieNow(pDesk);
    const kcAfterUp = afterUpCookie?.kc ?? [0, 0, 0, 0];
    check('Sau khi nhả phím: hộp vẫn mở chờ lệnh, cờ chưa ghi', afterUpState.open && kcAfterUp[0] === 0);

    // Nhấn Enter một lần mới (chu kỳ mới) để cất thẻ
    console.log('   Nhấn Enter lần mới để cất...');
    await pDesk.keyboard.press('Enter');
    await sleep(600);

    const endDeskState = await pDesk.evaluate(() => ({
      closed: !document.querySelector('[data-testid="the-co-cau-hoi"]'),
    }));
    const endDeskCookie = await cookieNow(pDesk);
    const kcEndDesk = endDeskCookie?.kc ?? [0, 0, 0, 0];
    check('Nhấn Enter chu kỳ mới: cất thẻ thành công (hộp đóng, kc[0] = 1)',
      endDeskState.closed && kcEndDesk[0] === 1,
      `closed=${endDeskState.closed}, kc[0]=${kcEndDesk[0]}`
    );
    await pDesk.close();

    // ----------------------------------------------------
    // TEST 2: TOUCH HOLD > 600MS TRÊN 360x800 (Mobile)
    // ----------------------------------------------------
    console.log('\n--- 2. Kiểm tra touch hold > 600ms (Mobile 360x800) ---');
    const pMob = await browser.newPage();
    await pMob.setViewport({ width: 360, height: 800, isMobile: true, hasTouch: true });
    await pMob.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(cookieOf([0, 0, 0, 0]))),
      domain: 'localhost',
      path: '/',
    });

    await openVillage(pMob, 'lang-giay');
    const sc = (await scrollsOf(pMob, 'lang-giay')).find((s) => s.index === 0);
    const offs = [[0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35]];
    let openedHold = false;
    for (let a = 0; a < offs.length; a++) {
      await teleportTo(pMob, sc.x + offs[a][0], sc.z + offs[a][1]);
      const handHandle = await pMob.evaluateHandle(() =>
        [...document.querySelectorAll('button')].find((b) => /^Tương tác với/.test(b.getAttribute('aria-label') ?? ''))
      );
      const handBtn = handHandle.asElement();
      if (!handBtn) continue;

      const box = await handBtn.boundingBox();
      if (!box) continue;
      const hx = box.x + box.width / 2;
      const hy = box.y + box.height / 2;

      // Chạm giữ 650ms trên nút ✋ rồi mới nhấc tay
      await pMob.touchscreen.touchStart(hx, hy);
      await sleep(650);
      await pMob.touchscreen.touchEnd();

      openedHold = await pMob
        .waitForFunction(() => document.querySelector('[data-testid="the-co-cau-hoi"]'), { timeout: 6000 })
        .then(() => true, () => false);
      if (openedHold) break;
    }
    check('Mở hộp thẻ bằng cử chỉ chạm giữ 650ms trên nút ✋', openedHold);
    await sleep(300);

    // Kiểm tra không có click ma: không có radio nào bị checked, không có lời nhắc
    const ghost = await pMob.evaluate(() => {
      const anyChecked = [...document.querySelectorAll('input[type=radio]')].some((r) => r.checked);
      const reminder = document.querySelector('[data-testid="nhac-tra-loi"]');
      const phase = document.querySelector('[data-testid="the-cau-hoi"]')?.dataset.phase;
      return { anyChecked, hasReminder: Boolean(reminder), phase };
    });
    check('Sau cú chạm giữ 650ms trên nút ✋: hộp mở sạch sẽ (chưa chọn gì, không nhắc nhở, phase ask)',
      !ghost.anyChecked && !ghost.hasReminder && ghost.phase === 'ask',
      JSON.stringify(ghost)
    );

    // Chạm bình thường vào đáp án A bên trong hộp: phải nhận ngay lập tức
    console.log('   Chạm chọn đáp án A bên trong hộp...');
    const opt0 = await pMob.$('[data-testid="dap-an-0"]');
    const optBox = await opt0.boundingBox();
    await pMob.touchscreen.tap(optBox.x + optBox.width / 2, optBox.y + optBox.height / 2);
    await sleep(150);

    const picked = await pMob.evaluate(() => {
      const r0 = document.querySelector('[data-testid="dap-an-0"] input[type=radio]');
      return r0?.checked;
    });
    check('Chạm thật bên trong dialog: nhận đáp án ngay tức thì không bị chặn', Boolean(picked));

    // Đóng hộp
    const closeBtn = await pMob.$('[data-testid="nut-dong"]');
    const cBox = await closeBtn.boundingBox();
    await pMob.touchscreen.tap(cBox.x + cBox.width / 2, cBox.y + cBox.height / 2);
    await sleep(500);

    check('Đóng hộp thành công, thẻ chưa cất', await pMob.evaluate(() => !document.querySelector('[data-testid="the-co-cau-hoi"]')));
    await pMob.close();

    // ----------------------------------------------------
    // TEST 3: LANDSCAPE 844x390 - HOÀN CHỈNH MỘT LUỒNG CHẠM
    // ----------------------------------------------------
    console.log('\n--- 3. Kiểm tra Landscape 844x390 (Chạm toàn luồng) ---');
    const pLand = await browser.newPage();
    await pLand.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
    await pLand.setCookie({
      name: 'sc_guest',
      value: encodeURIComponent(JSON.stringify(cookieOf([0, 0, 0, 0]))),
      domain: 'localhost',
      path: '/',
    });

    await openVillage(pLand, 'lang-giay');
    const openedLand = await openCard(pLand, 'lang-giay', 0, true);
    check('Mở hộp thẻ trên 844x390 thành công bằng chạm', openedLand);

    await press(pLand, '[data-testid="dap-an-0"]');
    await sleep(200);

    await press(pLand, '[data-testid="nut-kiem-tra"]');
    await pLand.waitForSelector('[data-testid="phan-hoi"]', { timeout: 6000 });
    check('Nộp bài trên 844x390 thành công, hiện giải thích', true);

    await sleep(500);
    await press(pLand, '[data-testid="nut-cat-vao-so"]');
    await sleep(500);

    const landClosed = await pLand.evaluate(() => !document.querySelector('[data-testid="the-co-cau-hoi"]'));
    const landCookie = await cookieNow(pLand);
    const kcLand = landCookie?.kc ?? [0, 0, 0, 0];
    check('Cất thẻ thành công trên 844x390 bằng chạm', landClosed && kcLand[0] === 1, `closed=${landClosed}, kc[0]=${kcLand[0]}`);
    await pLand.close();

  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.ok).length;
  console.log(`\n=> KẾT QUẢ KIỂM TRA HỒI QUY: ${pass}/${results.length} ĐẠT.`);
  writeFileSync(`${OUT}/ket-qua-p6b-regression.json`, JSON.stringify(results, null, 2), 'utf-8');
  if (pass !== results.length) process.exit(1);
}

run().catch((e) => {
  console.error('Lỗi chạy kiểm tra:', e);
  process.exit(1);
});
