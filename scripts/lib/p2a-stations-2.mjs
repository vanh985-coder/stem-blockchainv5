// Driver thao tác thật cho 3 trạm màn 4 (Làng Dệt, bài 2). Đáp án mong đợi tính độc lập từ chữ hiện trên trang.
import { clickText, findButton, inputByLabel, pageText, praiseLog, scrollDeep, shot, sleep, step, tap, typeInto } from './p2a-real.mjs';
import { stationDoneText } from './p2a-stations-1.mjs';

const triple = /Mã trang trước\s+(\d+)\s+Nội dung\s+(\d+)\s+Mã trang\s+(\d+)/g;

function doneRecord(ctx, ok) {
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: 'xong trạm: màn "Điều em vừa học" hiện', expect: 1, actual: ok ? 1 : 0, ok, kind: 'trangThai' });
}

async function calculatorStep(ctx, label) {
  const x = await ctx.page.$('[data-testid="page-code-x"]');
  const c = await ctx.page.$('[data-testid="page-code-c"]');
  if (!x || !c) return false;
  await step(ctx, label, 0, async () => { await typeInto(ctx, x, '57'); await typeInto(ctx, c, '36'); });
  const out = await ctx.page.$eval('[data-testid="page-code-result"]', (e) => e.textContent.trim());
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: `máy tính mã trang hiện kết quả (${out})`, expect: 1, actual: out ? 1 : 0, ok: Boolean(out), kind: 'trangThai' });
  return true;
}

async function sheetShotStep(ctx, label, expect, fn, shot) {
  return step(ctx, label, expect, fn, expect === 1 && shot ? { shot, shotDelay: 750, note: 'chụp khi hộp phản hồi đang mở' } : {});
}

/** Vòng đồng ý/từ chối của trạm Dễ và Trung bình. `oracle` trả true nếu trang hợp lệ. */
async function decisionRounds(ctx, oracle, plan, shotTag) {
  const { page } = ctx;
  for (let i = 0; i < plan.length; i++) {
    const valid = await oracle();
    const wantRight = plan[i] === 'ok';
    const agree = wantRight ? valid : !valid;
    const label = `vòng ${i + 1}: bấm ${agree ? '"Đồng ý"' : '"Từ chối"'} (trang ${valid ? 'hợp lệ' : 'không hợp lệ'}) → quyết định ${wantRight ? 'ĐÚNG' : 'SAI'}`;
    if (ctx.deep) await scrollDeep(ctx);
    await sheetShotStep(ctx, label, wantRight ? 1 : 0, async () => { await clickText(ctx, agree ? 'Đồng ý' : 'Từ chối'); }, shotTag && i === 0 ? shotTag : null);
    const last = i === plan.length - 1;
    const label2 = `vòng ${i + 1}: ${i % 2 === 0 || last ? 'bấm nút trong hộp' : 'phím Enter'} để sang tiếp`;
    await step(ctx, label2, 0, async () => {
      if (i % 2 === 0 || last) await clickText(ctx, last ? 'Vòng tiếp theo' : 'Vòng tiếp theo', { optional: false });
      else await page.keyboard.press('Enter');
    });
    await sleep(250);
  }
}

/** Màn 4, trạm Dễ: 5 vòng, 3 tim. Kế hoạch: đúng, sai, đúng, đúng, đúng. */
export async function man4Tram0(ctx) {
  const { page } = ctx;
  const oracle = async () => {
    const t = await pageText(page);
    const a = t.match(/Tính: \((\d+) × 2 \+ (\d+)\) mod 100\./);
    const b = t.match(/mã trang họ gửi \((\d+)\)/);
    if (!a || !b) throw new Error('Không đọc được phép tính trạm Dễ');
    return (2 * Number(a[1]) + Number(a[2])) % 100 === Number(b[1]);
  };
  await calculatorStep(ctx, 'Máy tính mã trang: nhập X = 57, c = 36 (không phải câu trả lời)');
  await decisionRounds(ctx, oracle, ['ok', 'bad', 'ok', 'ok', 'ok'], 'tram0-hop');
  doneRecord(ctx, await stationDoneText(page));
}

/** Màn 4, trạm Trung bình: so sổ của em với sổ người gửi, rồi mới biểu quyết. */
export async function man4Tram1(ctx) {
  const { page } = ctx;
  const oracle = async () => {
    const t = await pageText(page);
    const i1 = t.indexOf('Sổ của em');
    const m = t.slice(i1).match(/Sổ của (?!em)/);
    if (i1 < 0 || !m) throw new Error('Không thấy hai sổ trên trang');
    const i2 = i1 + m.index;
    const mine = [...t.slice(i1, i2).matchAll(triple)].map((x) => x.slice(1).map(Number));
    const theirs = [...t.slice(i2).matchAll(triple)].map((x) => x.slice(1).map(Number));
    if (mine.length !== 3 || theirs.length !== 4) throw new Error(`Đọc sổ sai: ${mine.length}/${theirs.length} trang`);
    const same = mine.every((p, k) => p.every((v, j) => v === theirs[k][j]));
    const [prev, content, code] = theirs[3];
    const chain = prev === mine[2][2];
    return same && chain && (2 * prev + content) % 100 === code;
  };
  await calculatorStep(ctx, 'Máy tính mã trang: nhập X = 57, c = 36 (không phải câu trả lời)');
  await decisionRounds(ctx, oracle, ['ok', 'bad', 'ok', 'ok', 'ok'], 'tram1-hop');
  doneRecord(ctx, await stationDoneText(page));
}

async function waitTurnState(page) {
  for (let i = 0; i < 150; i++) {
    const s = await page.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const btn = (t) => [...document.querySelectorAll('button')].some((b) => vis(b) && b.textContent.includes(t));
      if (document.querySelector('[role="radio"]')) return 'ketThuc';
      if (btn('Lượt tiếp theo') || btn('Xem tổng kết')) return 'daLat';
      if (btn('Sang lượt tiếp theo')) return 'boLuot';
      if (document.querySelector('input[aria-label="Mã trang mới"]')) return 'emTao';
      if (document.body.innerText.includes('Em bỏ phiếu cho trang này') && btn('Đồng ý') && btn('Từ chối')) return 'emBo';
      return null;
    });
    if (s) return s;
    await sleep(200);
  }
  throw new Error('Trạm Khó đứng yên ở trạng thái lạ');
}

async function ledgerCount(page) {
  return page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.includes('Sổ chung'));
    const box = h && h.parentElement && h.parentElement.parentElement;
    return box ? (box.innerText.match(/Mã trang trước/g) || []).length : -1;
  });
}

/** Màn 4, trạm Khó (Proof of Stake, 8 lượt): em tạo trang thật/gian, em bỏ phiếu cho trang của node khác. */
export async function man4Tram2(ctx) {
  const { page } = ctx;
  ctx.combos = ctx.combos ?? [];
  let emTurn = 0;
  let voteTurn = 0;
  const votePlan = ['ok', 'bad', 'ok', 'ok', 'bad', 'ok'];
  for (let turn = 0; turn < 40; turn++) {
    const state = await waitTurnState(page);
    if (state === 'ketThuc') break;
    if (state === 'boLuot') {
      await step(ctx, 'một node không đủ cọc: bấm "Sang lượt tiếp theo"', 0, async () => { await clickText(ctx, 'Sang lượt tiếp theo'); });
      continue;
    }
    if (state === 'daLat') {
      await step(ctx, 'bấm "Lượt tiếp theo / Xem tổng kết"', 0, async () => { await clickText(ctx, /* nút lật mở */ (await findButton(page, 'Xem tổng kết')) ? 'Xem tổng kết' : 'Lượt tiếp theo'); });
      continue;
    }
    if (state === 'emTao') {
      const t = await pageText(page);
      const last = Number(t.match(/Mã trang cuối của sổ chung:\s*(\d+)/)[1]);
      const nd = Number(t.match(/Nội dung được giao:\s*(\d+)/)[1]);
      const right = (2 * last + nd) % 100;
      if (emTurn === 0) {
        await step(ctx, 'em tạo trang: bấm "Gửi trang" khi ô trống', 0, async () => { await clickText(ctx, 'Gửi trang'); });
        const input = await inputByLabel(ctx, 'Mã trang mới');
        await step(ctx, 'em tạo trang: nhập mã SAI rồi "Gửi trang"', 0, async () => { await typeInto(ctx, input, (right + 1) % 100); await clickText(ctx, 'Gửi trang'); });
        if (ctx.deep) await scrollDeep(ctx);
        await step(ctx, 'em tạo trang: nhập mã ĐÚNG, nộp bằng Enter (ghi trang thật)', 1, async () => { await typeInto(ctx, input, right); await page.keyboard.press('Enter'); }, { shot: 'tram2-em-that' });
      } else {
        await step(ctx, 'em tạo trang: bấm "Ghi trang gian" (hiện hộp xác nhận)', 0, async () => { await clickText(ctx, 'Ghi trang gian', { exact: true }); });
        await step(ctx, 'em xác nhận "Vẫn ghi gian" (trang gian lọt hay bị bắt đều không khen)', 0, async () => { await clickText(ctx, 'Vẫn ghi gian'); });
      }
      emTurn++;
      // Các node khác bỏ phiếu cho trang của em, rồi lật mở: không được khen thêm.
      const before = (await praiseLog(page)).length;
      await waitRevealed(page);
      const added = (await praiseLog(page)).length - before;
      ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: `lượt em tạo trang ${emTurn}: các node bỏ phiếu và lật mở không sinh thêm khen`, expect: 0, actual: added, ok: added === 0, kind: 'trangThai' });
      continue;
    }
    if (state === 'emBo') {
      const t = await pageText(page);
      const g = (re) => Number(t.match(re)[1]);
      const prev = g(/Mã trang trước \(theo sổ người gửi\):\s*(\d+)/);
      const nd = g(/Nội dung:\s*(\d+)/);
      const code = g(/Mã trang:\s*(\d+)/);
      const last = g(/Mã trang cuối trong sổ của em:\s*(\d+)/);
      const valid = prev === last && (2 * prev + nd) % 100 === code;
      const plan = votePlan[voteTurn % votePlan.length];
      const right = plan === 'ok';
      const agree = right ? valid : !valid;
      voteTurn++;
      const ledger0 = await ledgerCount(page);
      const rec = await step(
        ctx,
        `bỏ phiếu lượt bot: trang ${valid ? 'hợp lệ' : 'gian/tính nhầm'}, em bấm ${agree ? '"Đồng ý"' : '"Từ chối"'} → quyết định ${right ? 'ĐÚNG' : 'SAI'} (chưa lật: chưa khen)`,
        0,
        async () => { if (ctx.deep) await scrollDeep(ctx); await clickText(ctx, agree ? 'Đồng ý' : 'Từ chối'); },
        { settle: 300 },
      );
      const before = (await praiseLog(page)).length;
      await waitRevealed(page);
      if (right && !ctx.voteShot) { ctx.voteShot = true; await sleep(30); ctx.voteShotBytes = await shot(ctx, 'tram2-bo-phieu'); }
      await sleep(350);
      const log = await praiseLog(page);
      const added = log.length - before;
      const accepted = (await ledgerCount(page)) > ledger0;
      ctx.combos.push(`${right ? 'đúng' : 'sai'}/${accepted ? 'nhận' : 'bị loại'}`);
      const stepRec = {
        man: ctx.man, tram: ctx.tram, tramTen: 'Khó', size: ctx.size.name,
        step: `lật mở: em bỏ phiếu ${right ? 'ĐÚNG' : 'SAI'}, trang bị ${accepted ? 'NHẬN vào sổ' : 'LOẠI'} → ${right ? 'phải khen' : 'không khen'}`,
        expect: right ? 1 : 0, actual: added, ok: added === (right ? 1 : 0), kind: 'quyetDinh', accepted, vote: agree ? 'đồng ý' : 'từ chối', events: log.slice(before).map((e) => ({ text: e.text, inViewport: e.strip.top >= 0 && e.strip.bottom <= e.vh, aboveContent: e.winTop >= e.strip.bottom - 0.5, pointer: e.pointer, sparks: e.sparks })),
      };
      ctx.records.push(stepRec);
      void rec;
    }
  }
  // Kết thúc ván: câu suy ngẫm và Xong trạm
  await page.waitForSelector('[role="radio"]', { visible: true, timeout: 30000 });
  const radios = await page.$$('[role="radio"]');
  await step(ctx, 'câu suy ngẫm: chọn đáp án', 0, async () => { await tap(ctx, radios[0]); });
  await step(ctx, 'câu suy ngẫm: bấm "Chốt"', 0, async () => { await clickText(ctx, 'Chốt'); });
  await step(ctx, 'bấm "Xong trạm"', 0, async () => { await clickText(ctx, 'Xong trạm'); });
  doneRecord(ctx, await stationDoneText(page));
}

async function waitRevealed(page) {
  for (let i = 0; i < 100; i++) {
    const ok = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => /Lượt tiếp theo|Xem tổng kết/.test(b.textContent)));
    if (ok) return;
    await sleep(200);
  }
  throw new Error('Không thấy lật mở');
}

/** Nộp đúng nhanh một lần ở trạm Dễ màn 4. */
export async function quickCorrect4(ctx, label = 'quyết định đúng ở vòng 1', opts = {}) {
  const t = await pageText(ctx.page);
  const a = t.match(/Tính: \((\d+) × 2 \+ (\d+)\) mod 100\./);
  const b = t.match(/mã trang họ gửi \((\d+)\)/);
  const valid = (2 * Number(a[1]) + Number(a[2])) % 100 === Number(b[1]);
  return step(ctx, label, 1, async () => { await clickText(ctx, valid ? 'Đồng ý' : 'Từ chối'); }, opts);
}
