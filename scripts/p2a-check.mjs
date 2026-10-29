import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { launch } from './lib/p2a-real.mjs';
const out = 'docs/screenshots/p2a';
mkdirSync(out, {recursive:true});
const soundChunk = readdirSync('apps/hub/dist/assets').find(f => f.endsWith('.js') && readFileSync(`apps/hub/dist/assets/${f}`, 'utf8').includes('public playCorrect')) ?? readdirSync('apps/hub/dist/assets').find(f => f.endsWith('.js') && /playCorrect\([^)]*\)\{/.test(readFileSync(`apps/hub/dist/assets/${f}`, 'utf8')));
const browser = await launch();
const results=[];
const wait = ms => new Promise(r=>setTimeout(r,ms));
async function clickText(page,text) {
 for(const b of await page.$$('button')) if((await b.evaluate(e=>e.textContent.trim()))===text){await b.scrollIntoView(); if(page.viewport().hasTouch) await b.tap(); else await b.click(); return true;}
 return false;
}
try {
 for (const [width,height] of [[1366,768],[360,800],[844,390]]) {
  for (const [village,level] of [['lang-giay',1],['lang-det',4],['lang-khac-dau',7],['lang-bac',10]]) {
   const page=await browser.newPage(); const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.setViewport({width,height,hasTouch:width!==1366,isMobile:width!==1366});
    await page.goto('http://localhost:4180');
    await page.evaluate(()=>localStorage.setItem('sochung.v3.settings',JSON.stringify({soundEnabled:false,reducedMotion:false,quality:'low'})));
   await page.evaluate(()=>{document.cookie=`sc_guest=${encodeURIComponent(JSON.stringify({v:1,lv:Object.fromEntries([1,4,7,10].map(i=>[i,[1,1,3,3,3]])),gp:4,c:0,u:Date.now(),st:1,kc:[15,15,15,15],gt:8191,hd:2147483647}))}; path=/`;});
   await page.goto(`http://localhost:4180/lang/${village}/man/${level}?q=low`,{waitUntil:'networkidle0'});
   await page.waitForSelector('[data-testid="lesson-praise"]');
    await page.evaluate(async chunk=>{const m=await import(`/assets/${chunk}`); window.testSound=Object.values(m).find(v=>v&&typeof v.playCorrect==='function'); if(!window.testSound) throw Error('sound export not found'); window.testSound.setEnabled(false);},soundChunk);
    for (let station=0;station<3;station++) {
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
    await wait(150);
    const selector=`header ol li:nth-child(${station+1}) button`;
    await page.$eval(selector,e=>e.click());
    await wait(150); await clickText(page,'Bỏ qua'); await wait(150); await clickText(page,'Bắt đầu'); await wait(500);
    await page.evaluate(()=>window.scrollTo(0,0));
    const calculator=await page.$('[data-testid="page-code-x"]');
    if(calculator){await calculator.type('57'); await page.type('[data-testid="page-code-c"]','36'); await page.evaluate(()=>window.scrollTo(0,0));}
    assert.equal(await page.$eval('[data-testid="lesson-praise"]',e=>e.textContent),'');
    assert.equal(await page.evaluate(()=>window.testSound.isEnabled()),false);
    const before=await page.$eval('[data-testid="lesson-praise"]',e=>{window.testFocus=document.activeElement; return {height:e.getBoundingClientRect().height,pointer:getComputedStyle(e).pointerEvents};});
   // KIỂM TÍN HIỆU: phát đúng/sai qua đối tượng sound của bản production để thử vòng đời và gộp trùng. KHÔNG phải nộp bài thật (xem p2a-real-check.mjs).
   await page.evaluate(()=>window.testSound.playWrong()); await wait(50);
   assert.equal(await page.$eval('[data-testid="lesson-praise"]',e=>e.textContent),'');
   await page.evaluate(()=>{window.testSound.playCorrect();window.testSound.playCorrect();}); await wait(50);
   assert.equal(await page.$eval('[data-event]',e=>e.dataset.event),'1');
    assert.equal(await page.$eval('.lesson-fireworks',e=>e.children.length),24);
    const after=await page.$eval('[data-testid="lesson-praise"]',e=>({height:e.getBoundingClientRect().height,pointer:getComputedStyle(e).pointerEvents}));
    assert.ok(await page.evaluate(()=>document.activeElement===window.testFocus));
    assert.deepEqual(after,before);
    await page.evaluate(()=>window.testSound.playCorrect({answer:null})); await wait(50);
    assert.equal(await page.$eval('[data-event]',e=>e.dataset.event),'1');
   await wait(260); await page.evaluate(()=>window.testSound.playCorrect()); await wait(50);
   assert.equal(await page.$eval('[data-event]',e=>e.dataset.event),'2');
   await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]); await wait(50);
    await page.waitForFunction(()=>!document.querySelector('.lesson-fireworks'));
    assert.ok(await page.$eval('[data-testid="lesson-praise"]',e=>e.textContent.includes('em')));
    assert.deepEqual(errors,[]);
    results.push({level,station,width,height,errors:[...errors],scope:'production signal integration; muted; duplicate; consecutive; system reduced motion; station change'});
    }
    await page.evaluate(()=>localStorage.setItem('sochung.v3.settings',JSON.stringify({reducedMotion:true,soundEnabled:false,quality:'low'})));
    await page.reload({waitUntil:'networkidle0'});
    await page.waitForSelector('[data-testid="lesson-praise"]');
    await page.evaluate(async chunk=>{const m=await import(`/assets/${chunk}`); window.testSound=Object.values(m).find(v=>v&&typeof v.playCorrect==='function'); window.testSound.playCorrect();},soundChunk);
    await wait(100);
    assert.equal(await page.$('.lesson-fireworks'),null);
    assert.ok(await page.$eval('[data-testid="lesson-praise"]',e=>e.textContent.includes('Em')));
    await page.evaluate(()=>localStorage.removeItem('sochung.v3.settings'));
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
    await page.reload({waitUntil:'networkidle0'});
    await page.waitForSelector('[data-testid="lesson-praise"]');
    await page.evaluate(async chunk=>{const m=await import(`/assets/${chunk}`); window.testSound=Object.values(m).find(v=>v&&typeof v.playCorrect==='function'); window.testSound.setEnabled(false); window.testSound.playCorrect();},soundChunk);
    await page.waitForSelector('.lesson-fireworks');
    await page.click('a[href^="/dang-nhap"]');
    await page.waitForFunction(()=>!document.querySelector('[data-testid="lesson-praise"]'));
    await page.evaluate(()=>window.testSound.playCorrect());
   assert.equal(await page.$('[data-testid="lesson-praise"]'),null);
   assert.deepEqual(errors,[]);
   await page.close();
  }
 }
 writeFileSync(`${out}/signal-measurements.json`,JSON.stringify(results,null,2));
} finally {await browser.close();}
