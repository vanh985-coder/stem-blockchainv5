// Run against a built hub with VITE_PROBE=true, VITE_MERGED=true and local assets.
// No server data is changed: an isolated browser context uses a guest cookie.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const base = process.env.P1A_URL || 'http://localhost:4173';
const out = 'docs/screenshots/p1a';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const results = [];
let activePage;
async function settle(page) {
  await page.evaluate(async () => {
    const animations = document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.all(animations.map(a => a.finished.catch(() => {})));
  });
}
async function shot(page, name) {
  await settle(page);
  return page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 65 });
}
async function pressText(page, text) {
  const buttons = await page.$$('button');
  for (const b of buttons) if ((await b.evaluate(el => el.textContent.trim())) === text) { await b.click(); return; }
  throw new Error(`Missing button: ${text}`);
}
async function frames(page, ms = 1100) {
  return page.evaluate(ms => new Promise(resolve => {
    let start, count = 0, previous, max = 0;
    function frame(now) {
      if (start === undefined) start = now;
      if (previous !== undefined) { count++; max = Math.max(max, now - previous); }
      previous = now;
      if (now - start < ms) requestAnimationFrame(frame);
      else resolve({ frames: count, elapsedMs: now - start, fps: count * 1000 / (now - start), maxFrameMs: max });
    }
    requestAnimationFrame(frame);
  }), ms);
}
async function activate(page, selector, touch) {
  const el = await page.waitForSelector(selector, { visible: true });
  await el.scrollIntoView();
  await page.waitForFunction(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) && !el.disabled;
  }, {}, el);
  if (touch) await el.tap(); else await el.click();
}
async function replaceInput(page, text) {
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.type(text);
}
async function enter(page, village, level) {
  console.log('enter', level, page.viewport());
  await page.goto(`${base}/lang/${village}/man/${level}?q=low`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Bắt đầu'));
  await pressText(page, 'Bắt đầu');
}
try {
  for (const [width, height] of [[1366, 768], [360, 800], [844, 390]]) {
    const touch = width !== 1366;
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    activePage = page;
    await page.setViewport({ width, height, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(() => {
      const lv = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, [1, 1, 3, 3, 3]]));
      document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify({ v: 1, lv, gp: 4, c: 0, u: Date.now(), st: 1, kc: [15, 15, 15, 15], gt: 8191, hd: 2147483647 }))}; path=/`;
    });
    const row = { width, height, input: touch ? 'emulated touch' : 'mouse' };
    await enter(page, 'lang-khac-dau', 8);
    await page.waitForSelector('[data-testid="may-tinh-mod"]', { visible: true });
    await page.waitForFunction(() => document.querySelector('[data-testid="the"]')?.getAttribute('aria-disabled') === 'false');
    assert.equal(await page.$eval('[data-testid="o-nhap-x"]', el => document.activeElement === el), false);
    const overlapping = await page.evaluate(() => {
      const a = document.querySelector('[data-testid="may-tinh-mod"]').getBoundingClientRect();
      return [...document.querySelectorAll('[data-testid="the"]')].some(el => {
        const b = el.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
    });
    assert.equal(overlapping, false, 'calculator covers cards');
    await activate(page, '[data-testid="o-nhap-x"]', touch);
    await page.type('[data-testid="o-nhap-x"]', '3');
    assert.match(await page.$eval('[data-testid="ket-qua-mod"]', el => el.textContent), /10/);
    await replaceInput(page, '99');
    assert.equal(await page.evaluate(() => {
      const a = document.querySelector('[data-testid="may-tinh-mod"]').getBoundingClientRect();
      return [...document.querySelectorAll('[data-testid="the"]')].some(el => {
        const b = el.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
    }), false, 'invalid-input message covers cards');
    await replaceInput(page, '3');
    await activate(page, '[data-testid="the"]', touch);
    await page.waitForFunction(() => window.__memory.cards.some(c => c.isFlipped));
    // Solve rounds 1/2 through real card buttons, then inspect round-3 clocks.
    for (let round = 0; round < 2; round++) {
      const pairs = await page.evaluate(() => [...new Set(window.__memory.cards.map(c => c.pairKey))]);
      for (const key of pairs) {
        const cards = await page.evaluate(key => window.__memory.cards.filter(c => c.pairKey === key && !c.isMatched).map(c => ({ id: c.id, up: c.isFlipped })), key);
        // First exploratory flip might belong to another pair: let mismatches settle.
        const opened = await page.evaluate(() => window.__memory.cards.filter(c => c.isFlipped && !c.isMatched).map(c => c.pairKey));
        if (opened.length && opened[0] !== key) {
          const other = await page.evaluate(key => window.__memory.cards.find(c => c.pairKey === key && !c.isFlipped && !c.isMatched)?.id, key);
          if (other) await activate(page, `[data-id="${other}"]`, touch);
          await page.waitForFunction(() => !window.__memory.waitingFlipBack);
        }
        for (const c of cards) {
          const needed = await page.evaluate(id => { const c = window.__memory.cards.find(c => c.id === id); return !c.isFlipped && !c.isMatched; }, c.id);
          if (needed) await activate(page, `[data-id="${c.id}"]`, touch);
        }
      }
      await activate(page, '[data-testid="nut-tiep"]', touch);
      await page.waitForFunction(r => window.__memory.round === r, {}, round + 1);
    }
    await activate(page, '[data-testid="o-nhap-x"]', touch);
    const stopped = await page.evaluate(() => window.__memory.swapTimerMs);
    await replaceInput(page, '99');
    assert.equal(await page.evaluate(() => {
      const a = document.querySelector('[data-testid="may-tinh-mod"]').getBoundingClientRect();
      return [...document.querySelectorAll('[data-testid="the"]')].some(el => {
        const b = el.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
    }), false, 'invalid input covers the 4×4 grid');
    await replaceInput(page, '3');
    await frames(page);
    assert.equal(await page.evaluate(() => window.__memory.swapTimerMs), stopped);
    await activate(page, '[data-testid="the"]', touch);
    await frames(page);
    assert.ok(await page.evaluate(v => window.__memory.swapTimerMs > v, stopped));
    await activate(page, '[data-testid="nut-goi-y"]', touch);
    const hintClock = await page.evaluate(() => window.__memory.swapTimerMs);
    await frames(page);
    assert.equal(await page.evaluate(() => window.__memory.swapTimerMs), hintClock);
    await pressText(page, 'Chơi tiếp');
    await page.waitForFunction(() => !document.querySelector('[data-testid="hop-goi-y"]'));
    const mismatch = await page.evaluate(() => {
      const first = window.__memory.cards.find(c => c.isFlipped && !c.isMatched);
      return window.__memory.cards.find(c => !c.isFlipped && !c.isMatched && c.pairKey !== first.pairKey).id;
    });
    await activate(page, `[data-id="${mismatch}"]`, touch);
    await activate(page, '[data-testid="o-nhap-x"]', touch);
    await page.waitForFunction(() => !window.__memory.waitingFlipBack);
    assert.equal(await page.evaluate(() => window.__memory.cards.some(c => c.isFlipped && !c.isMatched)), false);
    await page.keyboard.press('Escape');
    await activate(page, '[data-testid="the"]', touch);
    await shot(page, `man8-${width}x${height}`);
    row.memory = 'visible calculator, no overlap, input 3→10, flips, focus pauses swap clock and blur resumes; hint pauses; mismatch flip-back still runs while using calculator';
    await enter(page, 'lang-det', 6);
    if (width < height) {
      await page.waitForFunction(() => document.body.innerText.includes('Xoay ngang'));
      await shot(page, `man6-${width}x${height}`);
      row.kite = 'portrait rotation notice';
    } else {
      await page.waitForFunction(() => window.__kiteUi?.ready);
      await activate(page, '[data-testid="man6-khung"]', touch);
      await page.waitForFunction(() => window.__kite.phase === 'play');
      row.graphics = await page.evaluate(() => {
        const gl = document.querySelector('canvas').getContext('webgl2');
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      });
      row.kiteFrames = await frames(page, 3000);
      await shot(page, `man6-${width}x${height}`);
      row.kite = 'pointer flap starts play';
    }
    await enter(page, 'lang-giay', 3);
    if (width < height) {
      await page.waitForFunction(() => document.body.innerText.includes('Xoay ngang'));
      await shot(page, `man3-${width}x${height}`);
      row.rebuild = 'portrait rotation notice';
    } else {
      await page.waitForFunction(() => window.__rebuild?.phase === 'play');
      await page.waitForFunction(() => !document.querySelector('[data-testid="the-khay"]').disabled);
      for (let round = 0; round < 2; round++) {
        await page.waitForFunction(() => window.__rebuild.phase === 'play');
        const cards = await page.evaluate(() => window.__rebuild.deal.real.map(c => c.id));
        for (const [index, id] of cards.entries()) {
          await activate(page, `[data-testid="the-khay"][data-card-id="${id}"]`, touch);
          await page.waitForFunction(id => document.querySelector(`[data-card-id="${id}"]`)?.getAttribute('aria-pressed') === 'true', {}, id);
          await activate(page, '[data-drop="chain"]', touch);
          await page.waitForFunction(n => window.__rebuild.chain.length === n, {}, index + 1);
        }
        await activate(page, '[data-testid="nut-tiep"]', touch);
      }
      await activate(page, '[data-testid="nut-bat-dau-giu-so"]', touch);
      await page.waitForSelector('[data-testid="dong-ho"]');
      row.clock = await page.$eval('[data-testid="dong-ho"]', el => ({ font: getComputedStyle(el).fontSize, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height }));
      row.clock.clearOfCards = await page.evaluate(() => document.querySelector('[data-testid="hud"]').getBoundingClientRect().bottom <= document.querySelector('[data-testid="chuoi"]').getBoundingClientRect().top);
      assert.equal(row.clock.clearOfCards, true);
      await shot(page, `man3-${width}x${height}`);
      row.rebuild = 'rounds 1/2 placed by real clicks/taps, keep clock visible';
    }
    await page.goto(`${base}/lang/lang-bac/man/10`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('ol button');
    await activate(page, 'ol li:nth-child(3) button', touch);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Bắt đầu'));
    await pressText(page, 'Bắt đầu');
    await page.waitForSelector('[data-testid="cay-compact"]');
    const tree = await page.$('[data-testid="cay-compact"]');
    await tree.scrollIntoView();
    await settle(page);
    row.tree = await tree.evaluate(el => {
      const bounds = el.getBoundingClientRect();
      const nodeElements = [...el.querySelectorAll('.z-10')];
      const nodes = nodeElements.map(n => { const b = n.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; });
      const overlaps = nodes.some((a, i) => nodes.slice(i + 1).some(b => a.x < b.x + b.width - 0.1 && a.x + a.width > b.x + 0.1 && a.y < b.y + b.height - 0.1 && a.y + a.height > b.y + 0.1));
      const covered = nodeElements.some(n => { const b = n.getBoundingClientRect(); return !n.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); });
      return { width: bounds.width, height: bounds.height, scroll: el.scrollWidth > el.clientWidth, nodes: nodes.length, minTarget: Math.min(...nodes.map(n => Math.min(n.width, n.height))), overlaps, covered, allNodesInViewport: nodes.every(n => n.y >= 0 && n.y + n.height <= innerHeight && n.x >= 0 && n.x + n.width <= innerWidth) };
    });
    assert.equal(row.tree.scroll, false);
    assert.equal(row.tree.nodes, 15);
    assert.ok(row.tree.minTarget >= 43.9);
    assert.equal(row.tree.overlaps, false);
    assert.equal(row.tree.covered, false);
    assert.equal(row.tree.allNodesInViewport, true);
    await shot(page, `man10-${width}x${height}`);
    const piece = await page.$('[role="button"][aria-pressed]');
    const pieceText = await piece.evaluate(el => el.textContent.trim());
    if (touch) await piece.tap(); else await piece.click();
    await activate(page, '[data-testid="cay-compact"] [role="region"]', touch);
    await page.waitForFunction(text => [...document.querySelectorAll('[data-testid="cay-compact"] [role="region"]')].some(el => el.textContent.includes(text)), {}, pieceText);
    row.tree.placement = 'tray piece selected and placed using real mouse/touch';
    assert.deepEqual(errors, []);
    row.errors = errors;
    results.push(row);
    writeFileSync(`${out}/measurements.json`, JSON.stringify({ browser: await browser.version(), results }, null, 2));
    console.log(JSON.stringify(row));
    await context.close();
  }
} catch (error) {
  console.log(await activePage.evaluate(() => ({ text: document.body.innerText, state: window.__rebuild && { phase: window.__rebuild.phase, chain: window.__rebuild.chain.length, hearts: window.__rebuild.hearts } })));
  await activePage.screenshot({ path: 'C:/Users/Acer/AppData/Local/Temp/opencode/p1a-failure.jpg' });
  throw error;
} finally { await browser.close(); }
