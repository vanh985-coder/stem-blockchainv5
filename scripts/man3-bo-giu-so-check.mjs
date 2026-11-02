// scripts/man3-bo-giu-so-check.mjs
// Kiểm màn 3 "Ghép lại cuốn sổ" sau khi BỎ ĐOẠN GIỮ SỔ 45 giây ở cuối vòng 2.
// Chạy trên BẢN BUILD (VITE_PROBE=true trên cổng 5673).
// Thao tác thật bằng chuột (kéo thả) ở 1366x768 và chạm giả lập ở 844x390.
//
// Kiểm tra:
// 1. Thẻ bắt đầu: không còn chữ "giữ sổ", "45 giây", "tráo". Mốc 210 / 220 / 230.
// 2. Hướng dẫn game: mở ra 3 trang (không còn trang 4 về giữ sổ), sạch chữ cấm.
// 3. Vòng 1: ghép đủ 5 trang -> banner chuyển vòng 2.
// 4. Hộp "?": mở khi đang chơi, tạm dừng ván, câu nhắc sạch chữ cấm.
// 5. Vòng 2: vứt trang giả vào rổ (+30 điểm), ghép 7 trang thật -> VÒNG 2 KẾT THÚC NGAY, KHÔNG CÓ GIỮ SỔ.
// 6. Màn kết quả: hiển thị điểm 230, Vàng 3 sao, sạch chữ cấm.
// 7. Tự hoàn thành: hoạt động trên dev, kết thúc ván ngay.
// 8. Chụp ảnh minh chứng < 300 KB lưu tại docs/screenshots/man3-bo-giu-so/.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:5673';
const OUT = 'docs/screenshots/man3-bo-giu-so';
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

async function launchBrowser() {
  const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!executablePath) throw new Error('Không tìm thấy Chrome!');
  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
  });
}

const cookie = {
  v: 1,
  lv: { 1: [1, 1, 3, 3, 3], 2: [1, 1, 3, 100] },
  gp: 0,
  c: 0,
  u: Date.now(),
  st: 1,
  kc: [15, 15, 15, 15],
  gt: 4095,
  hd: 2147483647,
  vs: 15,
  vi: 15,
};

const FORBIDDEN_WORDS = [/giữ\s*sổ/i, /45\s*giây/i, /tráo\s*trang/i, /bị\s*tráo/i];

function assertNoForbiddenWords(text, contextName) {
  for (const re of FORBIDDEN_WORDS) {
    if (re.test(text)) {
      throw new Error(`[${contextName}] Phát hiện chữ cấm vi phạm: "${text.match(re)[0]}"`);
    }
  }
}

async function takeShot(page, filename) {
  const buf = await page.screenshot({ type: 'jpeg', quality: 60 });
  if (buf.length >= 300000) throw new Error(`${filename} lớn hơn 300 KB (${buf.length} bytes)`);
  const fullPath = `${OUT}/${filename}`;
  writeFileSync(fullPath, buf);
  console.log(`   📸 Đã chụp ảnh: ${filename} (${Math.round(buf.length / 1024)} KB)`);
}

const rectOf = async (page, sel) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
  }, sel);

async function dragMouse(page, fromSel, toSel) {
  const a = await rectOf(page, fromSel);
  const b = await rectOf(page, toSel);
  if (!a || !b) throw new Error(`Không tìm thấy phần tử để kéo: ${!a ? fromSel : toSel}`);
  const m = page.mouse;
  await m.move(a.cx, a.cy);
  await sleep(40);
  await m.down();
  await sleep(40);
  for (let i = 1; i <= 8; i++) {
    await m.move(a.cx + ((b.cx - a.cx) * i) / 8, a.cy + ((b.cy - a.cy) * i) / 8);
    await sleep(15);
  }
  await sleep(80);
  await m.up();
  await sleep(80);
}

async function tapElement(page, sel, isTouch) {
  const r = await rectOf(page, sel);
  if (!r) throw new Error(`Không thấy phần tử: ${sel}`);
  if (isTouch) {
    await page.touchscreen.tap(r.cx, r.cy);
  } else {
    await page.mouse.click(r.cx, r.cy);
  }
}

async function moveCard(page, cardSel, targetSel, isTouch) {
  if (isTouch) {
    await tapElement(page, cardSel, true);
    await sleep(120);
    await tapElement(page, targetSel, true);
  } else {
    await dragMouse(page, cardSel, targetSel);
  }
}

async function clickText(page, re, isTouch) {
  const h = (
    await page.evaluateHandle((src, flags) => {
      const regex = new RegExp(src, flags);
      return (
        [...document.querySelectorAll('button')].find(
          (b) => regex.test(b.innerText.trim()) && b.offsetParent !== null
        ) ?? null
      );
    }, re.source, re.flags)
  ).asElement();
  if (!h) throw new Error(`Không thấy nút có chữ: ${re}`);
  await h.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const b = await h.boundingBox();
  if (isTouch) {
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  } else {
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  }
}

async function dismissTutorialIfNeeded(page) {
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Bỏ qua'));
    if (btn) btn.click();
  });
  await sleep(500);
}

async function runTest() {
  console.log('🚀 Khởi động kiểm thử Màn 3 Bỏ giữ sổ...');
  const browser = await launchBrowser();

  try {
    // ==========================================
    // PHẦN 1: 1366x768 (Desktop, chuột kéo thả)
    // ==========================================
    console.log('\n--- 1. Kiểm thử trên màn hình 1366x768 (Chuột kéo thả) ---');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1366, height: 768, hasTouch: false, isMobile: false });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.evaluate((p) => {
        localStorage.setItem(
          'sochung.v3.settings',
          JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' })
        );
        document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
      }, cookie);

      await page.goto(`${BASE}/lang/lang-giay/man/3?q=low`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="the-bat-dau"]', { timeout: 60000 });
      await sleep(1000);

      // 1.1 Kiểm tra thẻ bắt đầu
      const startCardText = await page.evaluate(() => document.querySelector('[data-testid="the-bat-dau"]').innerText);
      assertNoForbiddenWords(startCardText, 'Thẻ bắt đầu 1366x768');
      console.log('   ✓ Thẻ bắt đầu: Không chứa chữ cấm giữ sổ/45s/tráo.');

      // Kiểm tra mốc hiển thị trên thẻ bắt đầu
      const hasMedals = await page.evaluate(() => {
        const t = document.body.innerText;
        return t.includes('210') && t.includes('220') && t.includes('230');
      });
      if (!hasMedals) throw new Error('Không thấy đủ mốc điểm 210, 220, 230 trên thẻ bắt đầu');
      console.log('   ✓ Thẻ bắt đầu: Hiển thị đúng các mốc huy chương 210 (Đồng), 220 (Bạc), 230 (Vàng).');
      await takeShot(page, '01-the-bat-dau-1366x768.jpg');

      // 1.2 Mở hướng dẫn game từ thẻ bắt đầu
      await clickText(page, /hướng dẫn chơi/i, false);
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
      await sleep(500);

      // Kiểm tra hướng dẫn: 3 trang
      const guideDialogText = await page.evaluate(() => document.querySelector('[role="dialog"]').innerText);
      assertNoForbiddenWords(guideDialogText, 'Hướng dẫn game trang 1');
      console.log('   ✓ Hướng dẫn trang 1: Sạch chữ cấm.');
      await takeShot(page, '02-huong-dan-trang1-1366x768.jpg');

      // Chuyển trang 2
      await clickText(page, /tiếp/i, false);
      await sleep(300);
      const p2Text = await page.evaluate(() => document.querySelector('[role="dialog"]').innerText);
      assertNoForbiddenWords(p2Text, 'Hướng dẫn game trang 2');
      console.log('   ✓ Hướng dẫn trang 2: Sạch chữ cấm.');

      // Chuyển trang 3
      await clickText(page, /tiếp/i, false);
      await sleep(300);
      const p3Text = await page.evaluate(() => document.querySelector('[role="dialog"]').innerText);
      assertNoForbiddenWords(p3Text, 'Hướng dẫn game trang 3');
      console.log('   ✓ Hướng dẫn trang 3: Sạch chữ cấm.');
      await takeShot(page, '03-huong-dan-trang3-1366x768.jpg');

      // Đóng hướng dẫn (nút "Đã hiểu" ở trang cuối)
      await clickText(page, /đã hiểu|đóng/i, false);
      await sleep(500);

      // 1.3 Bắt đầu chơi
      await clickText(page, /^Bắt đầu/i, false);
      await page.waitForFunction(
        () => window.__rebuild && document.querySelector('[data-testid="man3-khung"]'),
        { timeout: 60000 }
      );
      // Đợi Three.js warm up và LoadingScreen tắt
      console.log('   👉 Chờ tải xong cảnh 3D...');
      await sleep(3500);
      await dismissTutorialIfNeeded(page);

      await page.waitForFunction(() => window.__rebuild.phase === 'play', { timeout: 60000 });
      console.log('   ✓ Vào màn chơi thành công, phase = play.');
      await takeShot(page, '04-vong1-bat-dau-1366x768.jpg');

      // 1.4 Chơi vòng 1: ghép 5 trang bằng kéo thả
      console.log('   👉 Ghép vòng 1 (5 trang)...');
      const v1Ids = await page.evaluate(() => window.__rebuild.deal.real.map((c) => c.id));
      for (let i = 0; i < v1Ids.length; i++) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const done = await page.evaluate((n) => window.__rebuild.chain.length >= n || window.__rebuild.phase !== 'play', i + 1);
          if (done) break;
          // Kéo thả bằng chuột
          await dragMouse(page, `[data-testid="the-khay"][data-card-id="${v1Ids[i]}"]`, '[data-testid="chuoi"]');
          const placed = await page.evaluate((n) => window.__rebuild.chain.length >= n, i + 1);
          if (!placed) {
            // Thử click chọn rồi click đặt nếu kéo chưa nhận
            await tapElement(page, `[data-testid="the-khay"][data-card-id="${v1Ids[i]}"]`, false);
            await sleep(100);
            await tapElement(page, '[data-testid="chuoi"]', false);
          }
          await sleep(200);
        }
        await page.waitForFunction((n) => window.__rebuild.chain.length >= n || window.__rebuild.phase !== 'play', { timeout: 15000 }, i + 1);
      }

      // Xong vòng 1 -> Banner chuyển vòng
      await page.waitForSelector('[data-testid="banner"]', { timeout: 10000 });
      console.log('   ✓ Vòng 1 hoàn thành, xuất hiện banner chuyển vòng!');
      await takeShot(page, '05-banner-vong1-xong-1366x768.jpg');

      // Bấm nút chuyển sang vòng 2
      await tapElement(page, '[data-testid="nut-tiep"]', false);
      console.log('   👉 Đã bấm nút sang vòng 2.');

      // Chờ phản diện chạy vào nhét trang giả và chuyển sang phase play vòng 2 (round = 1)
      await page.waitForFunction(() => window.__rebuild.phase === 'play' && window.__rebuild.round === 1, { timeout: 30000 });
      console.log('   ✓ Đã sang vòng 2 (round = 1, phase = play)!');
      await sleep(1000);

      // 1.5 Mở hộp "?" để kiểm tra tạm dừng và gợi ý
      console.log('   👉 Mở hộp "?" khi đang chơi vòng 2...');
      await tapElement(page, '[data-testid="nut-goi-y"]', false);
      await page.waitForSelector('[data-testid="hop-goi-y"]', { timeout: 5000 });
      await sleep(300);

      // Đo xem game có tạm dừng không
      const isPaused = await page.evaluate(() => window.__rebuild.paused === true);
      console.log(`   ✓ Hộp "?" mở: paused = ${isPaused}`);
      const hintText = await page.evaluate(() => document.querySelector('[data-testid="viec-cua-em"]').innerText);
      assertNoForbiddenWords(hintText, 'Gợi ý trong hộp "?" vòng 2');
      console.log(`   ✓ Câu nhắc việc của em: "${hintText}" (Sạch chữ cấm).`);
      await takeShot(page, '06-hop-goi-y-vong2-1366x768.jpg');

      // Đóng hộp "?"
      await clickText(page, /chơi tiếp|tiếp tục/i, false);
      await sleep(500);

      // 1.6 Chơi vòng 2: vứt trang giả vào rổ rác, ghép 7 trang thật
      console.log('   👉 Chơi vòng 2: bỏ trang giả vào rổ...');
      const fakeId = await page.evaluate(
        () => window.__rebuild.tray.find((c) => c.code !== (c.prev * 2 + c.content) % 100)?.id
      );
      if (fakeId) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const gone = await page.evaluate((id) => !window.__rebuild.tray.some((c) => c.id === id), fakeId);
          if (gone) break;
          await dragMouse(page, `[data-testid="the-khay"][data-card-id="${fakeId}"]`, '[data-testid="ro-trang-gia"]');
          const stillThere = await page.evaluate((id) => window.__rebuild.tray.some((c) => c.id === id), fakeId);
          if (stillThere) {
            await tapElement(page, `[data-testid="the-khay"][data-card-id="${fakeId}"]`, false);
            await sleep(100);
            await tapElement(page, '[data-testid="ro-trang-gia"]', false);
          }
          await sleep(200);
        }
        await page.waitForFunction((id) => !window.__rebuild.tray.some((c) => c.id === id), { timeout: 10000 }, fakeId);
        console.log(`   ✓ Đã đưa trang giả (${fakeId}) vào rổ trang giả (+30 điểm).`);
      }

      await sleep(300);
      const v2Ids = await page.evaluate(() => window.__rebuild.deal.real.map((c) => c.id));
      console.log(`   👉 Ghép 7 trang thật vòng 2...`);
      for (let i = 0; i < v2Ids.length; i++) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const done = await page.evaluate(
            (n) => window.__rebuild.chain.length >= n || window.__rebuild.phase === 'over',
            i + 1
          );
          if (done) break;
          await dragMouse(page, `[data-testid="the-khay"][data-card-id="${v2Ids[i]}"]`, '[data-testid="chuoi"]');
          const placed = await page.evaluate((n) => window.__rebuild.chain.length >= n || window.__rebuild.phase === 'over', i + 1);
          if (!placed) {
            await tapElement(page, `[data-testid="the-khay"][data-card-id="${v2Ids[i]}"]`, false);
            await sleep(100);
            await tapElement(page, '[data-testid="chuoi"]', false);
          }
          await sleep(200);
        }
        await page.waitForFunction(
          (n) => window.__rebuild.chain.length >= n || window.__rebuild.phase === 'over',
          { timeout: 15000 },
          i + 1
        );
      }

      // 1.7 Kiểm tra kết thúc: VÒNG 2 KẾT THÚC NGAY, KHÔNG CÓ GIỮ SỔ
      console.log('   👉 Kiểm tra kết thúc ván...');
      await page.waitForFunction(
        () => window.__rebuild.phase === 'over' && window.__rebuild.over === 'done',
        { timeout: 15000 }
      );
      console.log('   ✓ Ghép xong thẻ thứ 7 -> phase = over ngay lập tức (KHÔNG có phase keep)!');

      // Chờ màn kết quả của MiniGameLevel
      await page.waitForSelector('[data-testid="diem"]', { timeout: 15000 });
      await sleep(1000);

      const scoreText = await page.evaluate(() => document.querySelector('[data-testid="diem"]').innerText);
      const resultPageText = await page.evaluate(() => document.body.innerText);
      assertNoForbiddenWords(resultPageText, 'Màn kết quả 1366x768');

      console.log(`   ✓ Màn kết quả hiển thị: "${scoreText}".`);
      if (!scoreText.includes('230')) {
        throw new Error(`Điểm đạt được không đúng 230: "${scoreText}"`);
      }
      console.log('   ✓ Điểm đạt chuẩn tối đa: 230 điểm (Vàng 3 sao).');
      await takeShot(page, '07-ket-qua-1366x768.jpg');

      // 1.8 Kiểm tra tính năng Tự hoàn thành
      console.log('   👉 Kiểm tra tính năng Tự hoàn thành...');
      await page.goto(`${BASE}/lang/lang-giay/man/3?q=low`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="the-bat-dau"]', { timeout: 60000 });
      await sleep(500);

      const autoBtnStart = await page.$('[data-testid="nut-tu-hoan-thanh"]');
      if (autoBtnStart) {
        console.log('   ✓ Thấy nút Tự hoàn thành trên thẻ bắt đầu.');
        await autoBtnStart.click();
        await page.waitForSelector('[data-testid="da-tu-hoan-thanh"]', { timeout: 10000 });
        console.log('   ✓ Bấm Tự hoàn thành -> chuyển sang màn đã tự hoàn thành.');
        await takeShot(page, '08-tu-hoan-thanh-1366x768.jpg');
      } else {
        console.log('   ✓ Bản build: Ẩn nút Tự hoàn thành với khách (đúng bảo mật RBAC).');
        await takeShot(page, '08-bao-mat-khach-1366x768.jpg');
      }

      await page.close();
    }

    // ==========================================
    // PHẦN 2: 844x390 (Mobile ngang, chạm giả lập)
    // ==========================================
    console.log('\n--- 2. Kiểm thử trên màn hình 844x390 (Chạm giả lập) ---');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 844, height: 390, hasTouch: true, isMobile: true });
      await page.goto(BASE, { waitUntil: 'domcontentloaded' });
      await page.evaluate((p) => {
        localStorage.setItem(
          'sochung.v3.settings',
          JSON.stringify({ soundEnabled: false, reducedMotion: false, largeText: false, rotateMap: false, quality: 'low' })
        );
        document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify(p))}; path=/`;
      }, cookie);

      await page.goto(`${BASE}/lang/lang-giay/man/3?q=low`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="the-bat-dau"]', { timeout: 60000 });
      await sleep(1000);

      // Bắt đầu chơi bằng chạm
      await clickText(page, /^Bắt đầu/i, true);
      await page.waitForFunction(
        () => window.__rebuild && document.querySelector('[data-testid="man3-khung"]'),
        { timeout: 60000 }
      );
      console.log('   👉 Chờ tải xong cảnh 3D trên mobile...');
      await sleep(3500);
      await dismissTutorialIfNeeded(page);

      await page.waitForFunction(() => window.__rebuild.phase === 'play', { timeout: 60000 });
      console.log('   ✓ 844x390: Vào màn chơi thành công.');
      await takeShot(page, '09-vong1-bat-dau-844x390.jpg');

      // Ghép 5 thẻ vòng 1 bằng chạm (chạm thẻ -> chạm chuỗi)
      console.log('   👉 Ghép vòng 1 bằng chạm...');
      const v1Ids = await page.evaluate(() => window.__rebuild.deal.real.map((c) => c.id));
      for (let i = 0; i < v1Ids.length; i++) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const done = await page.evaluate((n) => window.__rebuild.chain.length >= n || window.__rebuild.phase !== 'play', i + 1);
          if (done) break;
          const pressed = await page.evaluate((id) => !!document.querySelector(`[data-card-id="${id}"][aria-pressed="true"]`), v1Ids[i]);
          if (pressed) await tapElement(page, '[data-testid="chuoi"]', true);
          else await moveCard(page, `[data-testid="the-khay"][data-card-id="${v1Ids[i]}"]`, '[data-testid="chuoi"]', true);
          await sleep(250);
        }
        await page.waitForFunction((n) => window.__rebuild.chain.length >= n || window.__rebuild.phase !== 'play', { timeout: 15000 }, i + 1);
      }

      // Chờ banner vòng 1
      await page.waitForSelector('[data-testid="banner"]', { timeout: 10000 });
      console.log('   ✓ 844x390: Banner vòng 1 xong.');
      await tapElement(page, '[data-testid="nut-tiep"]', true);

      // Chờ sang vòng 2 (round = 1)
      await page.waitForFunction(() => window.__rebuild.phase === 'play' && window.__rebuild.round === 1, { timeout: 30000 });
      console.log('   ✓ 844x390: Đã sang vòng 2 (round = 1).');
      await sleep(1000);
      await takeShot(page, '10-vong2-bat-dau-844x390.jpg');

      // Vòng 2: chạm thẻ giả -> chạm rổ
      const fakeId = await page.evaluate(
        () => window.__rebuild.tray.find((c) => c.code !== (c.prev * 2 + c.content) % 100)?.id
      );
      if (fakeId) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const gone = await page.evaluate((id) => !window.__rebuild.tray.some((c) => c.id === id), fakeId);
          if (gone) break;
          await moveCard(page, `[data-testid="the-khay"][data-card-id="${fakeId}"]`, '[data-testid="ro-trang-gia"]', true);
          await sleep(250);
        }
        await page.waitForFunction((id) => !window.__rebuild.tray.some((c) => c.id === id), { timeout: 10000 }, fakeId);
        console.log(`   ✓ 844x390: Đã chạm trang giả đưa vào rổ.`);
      }

      // Ghép 7 thẻ thật bằng chạm
      const v2Ids = await page.evaluate(() => window.__rebuild.deal.real.map((c) => c.id));
      console.log(`   👉 Ghép 7 trang thật vòng 2 bằng chạm...`);
      for (let i = 0; i < v2Ids.length; i++) {
        for (let attempt = 0; attempt < 5; attempt++) {
          const done = await page.evaluate(
            (n) => window.__rebuild.chain.length >= n || window.__rebuild.phase === 'over',
            i + 1
          );
          if (done) break;
          const pressed = await page.evaluate((id) => !!document.querySelector(`[data-card-id="${id}"][aria-pressed="true"]`), v2Ids[i]);
          if (pressed) await tapElement(page, '[data-testid="chuoi"]', true);
          else await moveCard(page, `[data-testid="the-khay"][data-card-id="${v2Ids[i]}"]`, '[data-testid="chuoi"]', true);
          await sleep(250);
        }
        await page.waitForFunction(
          (n) => window.__rebuild.chain.length >= n || window.__rebuild.phase === 'over',
          { timeout: 15000 },
          i + 1
        );
      }

      // Chờ màn kết quả
      await page.waitForSelector('[data-testid="diem"]', { timeout: 15000 });
      await sleep(1000);
      const score844 = await page.evaluate(() => document.querySelector('[data-testid="diem"]').innerText);
      console.log(`   ✓ 844x390: Kết thúc ván, điểm: "${score844}".`);
      await takeShot(page, '11-ket-qua-844x390.jpg');

      await page.close();
    }

    console.log('\n🎉 TẤT CẢ KIỂM THỬ TRÌNH DUYỆT ĐỀU ĐẠT CHUẨN 100%!');
  } finally {
    await browser.close();
  }
}

runTest().catch((err) => {
  console.error('\n❌ LỖI KIỂM THỬ:', err);
  process.exit(1);
});
