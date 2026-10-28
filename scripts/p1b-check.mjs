import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
const out = 'docs/screenshots/p1b';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const results = [];
async function clickText(page, text) {
  const buttons = await page.$$('button');
  for (const button of buttons) if ((await button.evaluate(el => el.textContent.trim())) === text) {
    await button.scrollIntoView();
    if (page.viewport().hasTouch) await button.tap(); else await button.click();
    return true;
  }
  return false;
}
try {
  for (const [width, height] of [[1366,768],[360,800],[844,390]]) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width, height, hasTouch: width !== 1366, isMobile: width !== 1366 });
    await page.goto('http://localhost:4174');
    await page.evaluate(() => { document.cookie = `sc_guest=${encodeURIComponent(JSON.stringify({v:1,lv:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,[1,1,3,3,3]])),gp:4,c:0,u:Date.now(),st:1,kc:[15,15,15,15],gt:8191,hd:2147483647}))}; path=/`; });
    await page.goto('http://localhost:4174/lang/lang-det/man/4?q=low', {waitUntil:'networkidle0'});
    for (const station of ['de','tb']) {
      for (let i=0;i<20;i++) {
        if (await page.$('[data-testid="page-code-x"]')) break;
        for (const text of ['Bỏ qua','Bắt đầu','Trạm tiếp theo']) if (await clickText(page,text)) break;
        await new Promise(r=>setTimeout(r,200));
      }
      await page.waitForSelector('[data-testid="page-code-x"]');
      assert.equal(await page.$eval('[data-testid="page-code-x"]',el=>el.value),'');
      assert.equal(await page.$eval('[data-testid="page-code-result"]',el=>el.textContent),'');
      const x = await page.$('[data-testid="page-code-x"]');
      await x.scrollIntoView();
      if (width!==1366) await x.tap(); else await x.click();
      await page.keyboard.type('57');
      await page.keyboard.press('Tab');
      await page.keyboard.type('36');
      assert.match(await page.$eval('[data-testid="page-code-result"]',el=>el.textContent),/= 50/);
      assert.ok(await page.$eval('[data-testid="page-code-calculator"]', el => {
        const r=el.getBoundingClientRect();
        return r.left>=0 && r.right<=innerWidth && getComputedStyle(el).position==='static';
      }));
      const image = await page.screenshot({path:`${out}/${station}-${width}x${height}.jpg`,type:'jpeg',quality:60,fullPage:true});
      assert.ok(image.length<300000);
      await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
      await page.keyboard.type('bad');
      assert.match(await page.$eval('[data-testid="page-code-result"]',el=>el.textContent),/0 đến 99/);
      assert.ok(await clickText(page,'✓ Đồng ý'));
      await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(el=>el.textContent.includes('Vòng tiếp')));
      results.push({width,height,station,imageBytes:image.length,errors:[...errors]});
      if (station==='de') {
        await page.evaluate(()=>window.__stationDone());
        await clickText(page,'Trạm tiếp theo');
      }
    }
    assert.deepEqual(errors,[]);
    await context.close();
  }
  writeFileSync(`${out}/measurements.json`,JSON.stringify(results,null,2));
} finally { await browser.close(); }
