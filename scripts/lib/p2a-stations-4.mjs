// Driver thao tác thật cho 3 trạm màn 10 (Làng Bạc, bài 4).
import { clickText, dragOrTap, findButton, pageText, scrollDeep, sleep, step, tap, typeInto } from './p2a-real.mjs';
import { stationDoneText } from './p2a-stations-1.mjs';

function doneRecord(ctx, ok) {
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: 'xong trạm: màn "Điều em vừa học" hiện', expect: 1, actual: ok ? 1 : 0, ok, kind: 'trangThai' });
}
const fact = (ctx, text, ok) => ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: text, expect: 1, actual: ok ? 1 : 0, ok: Boolean(ok), kind: 'trangThai' });
const combine = (a, b) => a * 10 + b;

/** Trạm Dễ: 5 cặp giao dịch, nhập giá trị ghép Tab = Ta × 10 + Tb. */
export async function man10Tram0(ctx) {
  const { page } = ctx;
  const read = async () => {
    const t = await pageText(page);
    const seg = t.slice(t.search(/Bảng giao dịch/i));
    const vals = {};
    for (const m of seg.matchAll(/T(\d)\n[^\n]+\n(\d+)/g)) vals[m[1]] = Number(m[2]);
    const p = t.match(/GHÉP CẶP T(\d)(\d)/i);
    const q = t.match(/câu hỏi\s+(\d+)\s*\/\s*5/i);
    if (!p || !q) throw new Error('Không đọc được câu hỏi trạm Dễ');
    return { q: Number(q[1]), a: p[1], b: p[2], expect: combine(vals[p[1]], vals[p[2]]), reverse: combine(vals[p[2]], vals[p[1]]) };
  };
  const input = async () => page.waitForSelector('input[placeholder="??"]', { visible: true });
  const waitQuestion = async (q) => {
    await page.waitForFunction((n) => {
      const m = document.body.innerText.match(/câu hỏi\s+(\d+)\s*\/\s*5/i);
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('ghép giao dịch'));
      return m && Number(m[1]) === n && btn && !btn.disabled;
    }, { timeout: 8000 }, q);
    await sleep(150);
  };
  for (let q = 1; q <= 5; q++) {
    await waitQuestion(q);
    const cur = await read();
    const via = q % 2 === 1 ? 'enter' : 'button';
    const fire = async () => { if (via === 'enter') await page.keyboard.press('Enter'); else await clickText(ctx, 'ghép giao dịch'); };
    if (q === 1) {
      await step(ctx, 'câu 1: bấm "ghép giao dịch" khi ô còn trống', 0, async () => { await clickText(ctx, 'ghép giao dịch'); });
      await step(ctx, `câu 1: nhập ${cur.expect + 1} (SAI) rồi bấm nút`, 0, async () => { await typeInto(ctx, await input(), cur.expect + 1); await clickText(ctx, 'ghép giao dịch'); });
      await step(ctx, 'câu 1: đóng hộp phản hồi', 0, async () => { await clickText(ctx, 'Thử lại'); });
    } else if (cur.reverse !== cur.expect && q === 3) {
      await step(ctx, `câu ${q}: nhập ${cur.reverse} (ghép NGƯỢC thứ tự, bẫy)`, 0, async () => { await typeInto(ctx, await input(), cur.reverse); await fire(); });
      const open = Boolean(await findButton(page, 'Thử lại'));
      await step(ctx, `câu ${q}: đóng hộp phản hồi${open ? '' : ' (hộp đã tự đóng bởi Enter)'}`, 0, async () => { if (open) await clickText(ctx, 'Thử lại'); });
    }
    if (ctx.deep) await scrollDeep(ctx);
    await step(ctx, `câu ${q}: nhập ${cur.expect} (ĐÚNG, ghép T${cur.a}T${cur.b}) bằng ${via === 'enter' ? 'phím Enter' : 'nút'}`, 1, async () => { await typeInto(ctx, await input(), cur.expect); await fire(); }, q === 1 ? { shot: 'tram0-lan1' } : {});
  }
  await sleep(1000);
  doneRecord(ctx, await stationDoneText(page));
}

async function ledgerLeaves(page) {
  const t = await pageText(page);
  const seg = t.slice(t.search(/Thử thách tự xây cây|THỬ THÁCH TỰ XÂY CÂY/i));
  const m = [...seg.matchAll(/T(\d)\n(\d+)/g)].slice(0, 4).map((x) => Number(x[2]));
  return m;
}

/** Trạm Trung bình: xem dựng cây, tự xây cây nhập T12, T34, gốc, rồi soi cây tìm lá bị sửa. */
export async function man10Tram1(ctx) {
  const { page } = ctx;
  for (let i = 0; i < 4; i++) await step(ctx, `phần 1: bấm "Tiếp theo" (bước ${i + 1}/4 của hoạt cảnh dựng cây)`, 0, async () => { await clickText(ctx, 'Tiếp theo'); });
  await step(ctx, 'phần 1: bấm "Tự em xây cây"', 0, async () => { await clickText(ctx, 'Tự em xây cây'); });
  await sleep(300);
  const leaves = await ledgerLeaves(page);
  if (leaves.length !== 4) throw new Error(`Đọc lá sai: ${leaves.join(',')}`);
  const t12 = combine(leaves[0], leaves[1]);
  const t34 = combine(leaves[2], leaves[3]);
  const root = combine(t12, t34);
  const field = async () => page.waitForSelector('input[placeholder="nhập kết quả"]', { visible: true });
  await step(ctx, 'phần 2: bấm "Xác nhận" khi ô trống', 0, async () => { await clickText(ctx, 'Xác nhận'); });
  await step(ctx, `phần 2: nhập ${t12 + 1} (SAI) cho T12`, 0, async () => { await typeInto(ctx, await field(), t12 + 1); await clickText(ctx, 'Xác nhận'); });
  await step(ctx, 'phần 2: đóng hộp phản hồi', 0, async () => { await clickText(ctx, 'Thử lại'); });
  if (ctx.deep) await scrollDeep(ctx);
  await step(ctx, `phần 2: nhập ${t12} (ĐÚNG) cho T12, nộp bằng Enter`, 1, async () => { await typeInto(ctx, await field(), t12); await page.keyboard.press('Enter'); }, { shot: 'tram1-t12' });
  await step(ctx, `phần 2: nhập ${t34} (ĐÚNG) cho T34, nộp bằng nút`, 1, async () => { await typeInto(ctx, await field(), t34); await clickText(ctx, 'Xác nhận'); });
  await step(ctx, `phần 2: nhập ${root} (ĐÚNG) cho gốc, nộp bằng Enter`, 1, async () => { await typeInto(ctx, await field(), root); await page.keyboard.press('Enter'); });
  await step(ctx, 'phần 3: bấm "Khám phá khoảnh khắc À ra thế"', 0, async () => { await clickText(ctx, 'Khám phá khoảnh khắc'); });
  await sleep(300);

  // Soi cây: bấm các ô "?" đang mở từ trên xuống. Chỉ lá bị sửa mới được khen.
  let found = false;
  let probes = 0;
  for (let guard = 0; guard < 12 && !found; guard++) {
    const opens = await page.$$('section[aria-label] button[aria-disabled="false"]');
    if (opens.length === 0) break;
    const btn = opens[0];
    const label = await btn.evaluate((e) => e.getAttribute('aria-label'));
    const isLeaf = /^T\d:/.test(label);
    const rec = await step(
      ctx,
      `phần 3: soi ô ${label.split(':')[0]}`,
      0,
      async () => { if (ctx.deep) await scrollDeep(ctx); await tap(ctx, btn); },
      { settle: 150, lateExpect: async () => (isLeaf ? ((await page.$$eval('section[aria-label] [role="img"]', (els) => els.some((e) => { const l = e.getAttribute('aria-label') || ''; return /^T\d:/.test(l) && l.includes('bây giờ') && /khác$/.test(l); }))) ? 1 : 0) : 0), shotIfLate: 'tram1-soi' },
    );
    probes++;
    if (rec.actual === 1) found = true;
  }
  if (!found) throw new Error(`Không tìm ra lá bị sửa sau ${probes} lần soi`);
  // Hoạt cảnh sửa trộm phát tiếng sai (700 ms sau khi trúng): lời khen vẫn còn.
  await sleep(1000);
  const still = await page.evaluate(() => document.querySelector('[data-testid="lesson-praise"]').textContent.trim().length > 0);
  fact(ctx, 'hoạt cảnh sửa trộm phát tiếng sai 1 giây sau khi trúng nhưng lời khen vẫn hiện', still);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Hoàn thành màn học') && !b.disabled), { timeout: 8000 });
  // Hoạt cảnh xong thì thầy Linh nói một lời (hộp thoại phủ bài): em đọc rồi bỏ qua.
  await page.waitForFunction(() => /Thấy chưa/.test(document.body.innerText), { timeout: 6000 });
  await step(ctx, 'thầy Linh nói lời kết hoạt cảnh: bấm "Bỏ qua"', 0, async () => { await clickText(ctx, 'Bỏ qua'); });
  await step(ctx, 'bấm "Hoàn thành màn học"', 0, async () => { await clickText(ctx, 'Hoàn thành màn học'); });
  doneRecord(ctx, await stationDoneText(page));
}

async function readTree(page) {
  return page.evaluate(() => {
    const canvas = [...document.querySelectorAll('.lesson-scroll div.relative.shrink-0')].find((e) => e.querySelector(':scope > svg'));
    const cells = [...canvas.children].filter((c) => c.tagName !== 'svg');
    return cells.map((c) => {
      const hidden = Boolean(c.querySelector('[role="region"]')) || /ĐÚNG/i.test(c.textContent);
      const m = c.innerText.replace(/\./g, '').match(/(\d+)\s*$/);
      return { hidden, value: hidden ? null : m ? Number(m[1]) : null };
    });
  });
}

/** Trạm Khó: cây Merkle 8 lá, kéo/chạm 6 mảnh vào ô trống. */
export async function man10Tram2(ctx) {
  const { page } = ctx;
  const cells = await readTree(page);
  if (cells.length !== 15) throw new Error(`Cây có ${cells.length} ô, cần 15`);
  // Dựng lại cây từ các ô nhìn thấy: lá ẩn thử chữ số 1..9 cho đến khi khớp mọi ô hiện.
  const leafIdx = [0, 1, 2, 3, 4, 5, 6, 7];
  const hiddenLeaves = leafIdx.filter((i) => cells[i].hidden);
  const build = (leaves) => {
    const l1 = [0, 1, 2, 3].map((i) => combine(leaves[2 * i], leaves[2 * i + 1]));
    const l2 = [0, 1].map((i) => combine(l1[2 * i], l1[2 * i + 1]));
    return [...leaves, ...l1, ...l2, combine(l2[0], l2[1])];
  };
  // Khay có 6 mảnh đúng và 2 mảnh bẫy: mọi ô ẩn phải có giá trị nằm trong khay, nhờ đó chọn được nghiệm duy nhất.
  const tray = await page.$$eval('.lesson-scroll div[role="button"]', (els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => Number(e.textContent.replace(/\./g, '').trim())).filter((n) => Number.isFinite(n)));
  let full = null;
  const total = 9 ** hiddenLeaves.length;
  for (let n = 0; n < total && !full; n++) {
    const leaves = cells.slice(0, 8).map((c) => c.value);
    let k = n;
    for (const i of hiddenLeaves) { leaves[i] = (k % 9) + 1; k = Math.floor(k / 9); }
    const tree = build(leaves);
    const hiddenOk = tree.every((v, i) => !cells[i].hidden || tray.includes(v));
    if (hiddenOk && tree.every((v, i) => cells[i].hidden || cells[i].value === v)) full = tree;
  }
  if (!full) throw new Error('Không dựng lại được cây từ các ô nhìn thấy');
  const hiddenOrder = cells.map((c, i) => (c.hidden ? i : -1)).filter((i) => i >= 0);
  const want = hiddenOrder.map((i) => full[i]);
  const slots = async () => page.$$('.lesson-scroll div.relative.shrink-0 [role="region"]');
  const pieceEl = async (v) => {
    const h = await page.evaluateHandle((val) => [...document.querySelectorAll('.lesson-scroll div[role="button"]')].find((e) => e.getBoundingClientRect().width > 0 && e.textContent.replace(/\./g, '').trim() === String(val)) || null, v);
    return h.asElement();
  };
  const put = async (slotIdx, value) => {
    const s = (await slots())[slotIdx];
    const p = await pieceEl(value);
    if (!p || !s) throw new Error(`Không đặt được mảnh ${value} vào ô ${slotIdx}`);
    await dragOrTap(ctx, p, s);
    await sleep(200);
  };
  await step(ctx, 'bấm "Kiểm tra cây Merkle" khi chưa đặt mảnh nào', 0, async () => { await clickText(ctx, 'Kiểm tra cây Merkle'); });
  await step(ctx, 'đặt 3 mảnh đúng rồi bấm kiểm tra (chưa xếp đủ ô)', 0, async () => { for (let k = 0; k < 3; k++) await put(k, want[k]); await clickText(ctx, 'Kiểm tra cây Merkle'); }, { settle: 300 });
  // Hoán đổi hai ô cuối (đặt nhầm), các ô còn lại đúng: có chỗ sai → không khen.
  await step(ctx, 'đặt nốt 3 mảnh, ô 5 và ô 6 đặt NHẦM chỗ nhau, rồi kiểm tra', 0, async () => {
    await put(3, want[3]); await put(4, want[5]); await put(5, want[4]);
    await clickText(ctx, 'Kiểm tra cây Merkle');
  });
  await step(ctx, 'đóng hộp phản hồi', 0, async () => { await clickText(ctx, 'Thử lại'); });
  if (ctx.deep) await scrollDeep(ctx);
  await step(ctx, 'đặt đúng hai ô còn lại rồi kiểm tra → xong cây', 1, async () => {
    await put(0, want[4]); await put(1, want[5]);
    await clickText(ctx, 'Kiểm tra cây Merkle');
  }, { shot: 'tram2-cuoi' });
  await sleep(900);
  doneRecord(ctx, await stationDoneText(page));
}

/** Nộp đúng nhanh một lần ở trạm Dễ màn 10. */
export async function quickCorrect10(ctx, label = 'ghép đúng cặp đầu tiên', opts = {}) {
  const { page } = ctx;
  const t = await pageText(page);
  const seg = t.slice(t.search(/Bảng giao dịch/i));
  const vals = {};
  for (const m of seg.matchAll(/T(\d)\n[^\n]+\n(\d+)/g)) vals[m[1]] = Number(m[2]);
  const p = t.match(/GHÉP CẶP T(\d)(\d)/i);
  const expect = combine(vals[p[1]], vals[p[2]]);
  const input = await page.waitForSelector('input[placeholder="??"]', { visible: true });
  return step(ctx, label, 1, async () => { await typeInto(ctx, input, expect); await page.keyboard.press('Enter'); }, opts);
}
