// Driver thao tác thật cho 3 trạm màn 7 (Làng Khắc Dấu, bài 3).
import { clickText, dragOrTap, findButton, inputByLabel, pageText, scrollDeep, shot, sleep, step, tap, typeInto } from './p2a-real.mjs';
import { stationDoneText } from './p2a-stations-1.mjs';

function doneRecord(ctx, ok) {
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: 'xong trạm: màn "Điều em vừa học" hiện', expect: 1, actual: ok ? 1 : 0, ok, kind: 'trangThai' });
}
const fact = (ctx, text, ok) => ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: text, expect: 1, actual: ok ? 1 : 0, ok: Boolean(ok), kind: 'trangThai' });
const modPow = (b, e, m) => { let r = 1n; let x = BigInt(b) % BigInt(m); let k = BigInt(e); const M = BigInt(m); while (k > 0n) { if (k & 1n) r = (r * x) % M; x = (x * x) % M; k >>= 1n; } return Number(r); };

async function waitText(page, re, timeout = 8000) {
  await page.waitForFunction((src) => new RegExp(src).test(document.body.innerText), { timeout }, re.source);
}

async function cardByText(page, text, role = 'div[role="button"]') {
  const h = await page.evaluateHandle((t, sel) => [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(t) && e.getBoundingClientRect().width > 0) || null, text, role);
  return h.asElement();
}
async function slotByLabel(page, label) {
  const h = await page.evaluateHandle((l) => [...document.querySelectorAll('[role="region"]')].find((e) => e.getAttribute('aria-label') === l && e.getBoundingClientRect().width > 0) || null, label);
  return h.asElement();
}

/** Trạm Dễ: phần 1 (ký, thả thẻ vào máy tự quét) rồi phần 2 (gắn 5 thẻ khóa công khai). */
export async function man7Tram0(ctx) {
  const { page } = ctx;
  // Cách đưa thẻ vào máy đổi theo cỡ màn hình để phủ cả ba cách: kéo thả, chạm chọn + chạm ô, nút.
  const modes = { '1366x768': ['kéo thả', 'nút'], '360x800': ['chạm', 'chạm'], '844x390': ['nút', 'chạm'] }[ctx.size.name];
  const feed = async (mode, cardText, buttonText) => {
    if (mode === 'nút') { await clickText(ctx, buttonText); return; }
    const card = await cardByText(page, cardText);
    const slot = await slotByLabel(page, 'Kéo thẻ giao dịch vào đây');
    if (!card || !slot) throw new Error('Không thấy thẻ hoặc khe máy');
    await dragOrTap(ctx, card, slot);
  };
  await step(ctx, 'phần 1: chọn giao dịch mẫu "Chuyển 5 xu cho Bình"', 0, async () => { await clickText(ctx, 'Chuyển 5 xu cho Bình'); });
  await step(ctx, 'phần 1: bấm "Ký bằng khóa riêng của em"', 0, async () => { await clickText(ctx, 'Ký bằng khóa riêng của em'); });
  await step(ctx, `phần 1: đưa thẻ đã ký vào máy bằng ${modes[0]} (máy tự quét danh bạ, không phải câu trả lời)`, 0, async () => { await feed(modes[0], 'Chuyển 5 xu cho Bình', 'Thả vào máy xác minh'); }, { settle: 900 });
  await waitText(page, /Chữ ký chính chủ/);
  fact(ctx, 'máy báo "Chữ ký chính chủ" sau khi tự quét', true);
  await step(ctx, 'phần 1: bấm "Tiếp theo: Xem … gian lận"', 0, async () => { await clickText(ctx, 'gian lận ➔'); });
  await step(ctx, `phần 1: đưa thẻ giả vào máy bằng ${modes[1]} (máy tự quét 6 dòng, báo động)`, 0, async () => { await feed(modes[1], 'Chuyển 50 xu', 'Cho thẻ của'); }, { settle: 1600 });
  await waitText(page, /Phát hiện gian lận/);
  fact(ctx, 'máy báo "Phát hiện gian lận" sau khi tự quét', true);
  await step(ctx, 'phần 1: bấm "Sang phần 2"', 0, async () => { await clickText(ctx, 'Sang phần 2'); });

  // Phần 2: 5 bạn, mỗi bạn một khóa riêng; đáp án tính độc lập 5^x mod 23.
  const t = await pageText(page);
  const privs = [...t.matchAll(/Khóa riêng:\s*(\d+)/g)].map((m) => Number(m[1]));
  if (privs.length < 5) throw new Error(`Chỉ đọc được ${privs.length} khóa riêng`);
  const pubs = privs.slice(-5).map((x) => modPow(5, x, 23));
  const place = async (k, value, label) => {
    const slots = await page.$$('[role="region"][aria-label="?"]');
    const card = await cardByText(page, String(value));
    const exact = await page.evaluateHandle((v) => [...document.querySelectorAll('div[role="button"]')].find((e) => e.textContent.trim() === String(v) && e.getBoundingClientRect().width > 0) || null, value);
    const c = exact.asElement() ?? card;
    if (!c || !slots[k]) throw new Error(`Không đặt được thẻ ${value} vào ô ${k}`);
    const how = await dragOrTap(ctx, c, slots[k]);
    await sleep(150);
    return how;
  };
  const trapOf = (excl) => [16, 9].find((v) => !excl.includes(v));
  await step(ctx, 'phần 2: bấm "Kiểm tra kết quả" khi CHƯA đặt thẻ nào', 0, async () => { await clickText(ctx, 'Kiểm tra kết quả'); });
  if (ctx.deep) await scrollDeep(ctx);
  await step(ctx, 'phần 2: đặt 2 thẻ ĐÚNG (bạn 1, 2) rồi "Kiểm tra kết quả"', 1, async () => {
    await place(0, pubs[0]); await place(1, pubs[1]);
    await clickText(ctx, 'Kiểm tra kết quả');
  }, { shot: 'tram0-phan2' });
  await step(ctx, 'phần 2: bấm "Kiểm tra" lần nữa khi không có thẻ mới (không khen lại)', 0, async () => { await clickText(ctx, 'Kiểm tra kết quả'); });
  await step(ctx, 'phần 2: đặt thẻ BẪY vào bạn 3, thẻ đúng vào bạn 4 rồi kiểm tra (có chỗ sai)', 0, async () => {
    await place(2, trapOf(pubs)); await place(3, pubs[3]);
    await clickText(ctx, 'Kiểm tra kết quả');
  });
  if (ctx.deep) await scrollDeep(ctx);
  await step(ctx, 'phần 2: đặt đúng bạn 3 và bạn 5 rồi kiểm tra → xong trạm', 1, async () => {
    await place(2, pubs[2]); await place(4, pubs[4]);
    await clickText(ctx, 'Kiểm tra kết quả');
  });
  await sleep(300);
  doneRecord(ctx, await stationDoneText(page));
}

/** Trạm Trung bình: dùng Máy xác minh (công cụ) để đối chiếu, rồi nộp thẩm định 4 thẻ. */
export async function man7Tram1(ctx) {
  const { page } = ctx;
  const keyOf = async (name) => {
    const t = await pageText(page);
    const m = t.match(new RegExp(`${name}\\s+Khóa công khai\\s+(\\d+)`));
    if (!m) throw new Error(`Không thấy khóa của ${name}`);
    return Number(m[1]);
  };
  const cards = async () => {
    const heads = await page.$$eval('.lesson-scroll', (roots) => {
      const out = [];
      roots[0].querySelectorAll('button').forEach((b) => { if (/Đưa vào máy|Đang trong máy/.test(b.textContent)) out.push(true); });
      return out.length;
    });
    return heads;
  };
  // Với mỗi thẻ: đưa vào máy, nạp khóa của người gửi (không phải khóa đính kèm), kiểm tra chữ ký, đọc kết luận của máy.
  const judge = async () => {
    const n = await cards();
    if (n !== 4) throw new Error(`Cần 4 thẻ, thấy ${n}`);
    const verdicts = [];
    for (let i = 0; i < 4; i++) {
      const info = await page.evaluate((idx) => {
        const buttons = [...document.querySelectorAll('.lesson-scroll button')].filter((b) => /Đưa vào máy|Đang trong máy/.test(b.textContent));
        const card = buttons[idx].closest('div.relative');
        const m = card.innerText.match(/Người gửi\s+(.+)/);
        return { sender: m ? m[1].split('\n')[0].trim() : '' };
      }, i);
      const key = await keyOf(info.sender === 'Em' ? 'Em' : info.sender);
      const btnHandles = await page.evaluateHandle((idx) => [...document.querySelectorAll('.lesson-scroll button')].filter((b) => /Đưa vào máy|Đang trong máy/.test(b.textContent))[idx], i);
      const btn = btnHandles.asElement();
      await step(ctx, `máy xác minh: đưa thẻ ${i + 1} (${info.sender}) vào khe 2`, 0, async () => { await tap(ctx, btn); });
      // nạp khóa công khai của người gửi từ danh bạ
      const row = await page.evaluateHandle((k) => [...document.querySelectorAll('.lesson-scroll div[class*="cursor-pointer"]')].find((e) => e.textContent.trim().endsWith(String(k)) && e.getBoundingClientRect().width > 0) || null, key);
      await step(ctx, `máy xác minh: chạm khóa ${key} của ${info.sender} trong danh bạ vào khe 1`, 0, async () => { await tap(ctx, row.asElement()); });
      await step(ctx, `máy xác minh: bấm "Kiểm tra chữ ký" thẻ ${i + 1} (kết quả của máy không được khen)`, 0, async () => { await clickText(ctx, 'Kiểm tra chữ ký'); }, { settle: 700 });
      const t = await pageText(page);
      verdicts.push(!/Chữ ký không hợp lệ/.test(t) && /Chữ ký hợp lệ/.test(t));
    }
    return verdicts;
  };
  const decide = async (verdicts, flipIndex) => {
    for (let i = 0; i < 4; i++) {
      const real = flipIndex === i ? !verdicts[i] : verdicts[i];
      const group = await page.evaluateHandle((idx, wantReal) => {
        const heads = [...document.querySelectorAll('.lesson-scroll button')].filter((b) => /Đưa vào máy|Đang trong máy/.test(b.textContent));
        const card = heads[idx].closest('div.relative');
        return [...card.querySelectorAll('button')].find((b) => b.textContent.includes(wantReal ? 'Thật' : 'Giả')) || null;
      }, i, real);
      await step(ctx, `thẻ ${i + 1}: chọn "${real ? 'Thật' : 'Giả'}"${flipIndex === i ? ' (cố ý ngược với máy)' : ''}`, 0, async () => { await tap(ctx, group.asElement()); });
    }
  };
  // Lượt 1: một thẻ chọn ngược → nộp sai.
  let verdicts = await judge();
  await decide(verdicts, 1);
  await step(ctx, 'nộp thẩm định lượt 1 (có thẻ sai) → hộp phản hồi SAI', 0, async () => { await clickText(ctx, 'Nộp kết quả thẩm định'); });
  await step(ctx, 'bấm "Thử lại vòng mới" trong hộp', 0, async () => { await clickText(ctx, 'Thử lại vòng mới'); });
  // Lượt 2: đúng cả 4.
  verdicts = await judge();
  await decide(verdicts, -1);
  if (ctx.deep) await scrollDeep(ctx);
  await step(ctx, 'nộp thẩm định lượt 2 (đúng cả 4) → hộp phản hồi ĐÚNG', 1, async () => { await clickText(ctx, 'Nộp kết quả thẩm định'); }, { shot: 'tram1-hop', shotDelay: 750, note: 'chụp khi hộp phản hồi đang mở' });
  await sleep(1500);
  doneRecord(ctx, await stationDoneText(page));
}

async function setXAndTry(ctx, x) {
  const input = await ctx.page.waitForSelector('input[type="number"]', { visible: true });
  await typeInto(ctx, input, x);
  await clickText(ctx, 'Thử giá trị x');
}

/** Trạm Khó: dò khóa nhỏ (tự thử), dò khóa lớn (tự gõ, máy tự dò), tình huống mất khóa (câu hỏi). */
export async function man7Tram2(ctx) {
  const { page } = ctx;
  const right = [...Array(22).keys()].map((i) => i + 1).find((x) => modPow(5, x, 23) === 19);
  const wrong = [1, 2, 3].filter((x) => x !== right).slice(0, 3);
  for (const x of wrong) await step(ctx, `phần 1: thử x = ${x} (không ra 19)`, 0, async () => { await setXAndTry(ctx, x); });
  if (ctx.deep) await scrollDeep(ctx);
  await step(ctx, `phần 1: thử x = ${right} (5^x mod 23 = 19, em tự đoán trúng)`, 1, async () => { await setXAndTry(ctx, right); }, { shot: 'tram2-phan1' });
  const opt = await findButton(page, 'Vẫn tìm được');
  await step(ctx, 'phần 1: chọn một dự đoán (ý kiến, không chấm đúng sai)', 0, async () => { await tap(ctx, opt); });
  await step(ctx, 'phần 1: bấm "Sang phần 2"', 0, async () => { await clickText(ctx, 'Sang phần 2'); });

  const text = await pageText(page);
  const target = Number((text.match(/Khóa công khai của .* là (\d{1,3}(?:\.\d{3})*)/) ?? text.match(/2\^x mod 1\.000\.003 = (\d{1,3}(?:\.\d{3})*)/))[1].replace(/\./g, ''));
  let x2 = null;
  let acc = 1;
  for (let i = 1; i <= 1000001; i++) { acc = (acc * 2) % 1000003; if (acc === target) { x2 = i; break; } }
  if (x2 === null) throw new Error(`Không tìm được x cho đích ${target}`);
  const input = await page.waitForSelector('input[placeholder]', { visible: true });
  await step(ctx, 'phần 2: gõ x sai rồi nộp bằng Enter', 0, async () => { await typeInto(ctx, input, x2 === 5 ? 6 : 5); await page.keyboard.press('Enter'); });
  await step(ctx, `phần 2: gõ x = ${x2} (em tự đoán trúng) rồi bấm "Thử giá trị x"`, 1, async () => { await typeInto(ctx, input, x2); await clickText(ctx, 'Thử giá trị x'); });
  await step(ctx, 'phần 2: bấm "Xem kết luận số liệu"', 0, async () => { await clickText(ctx, 'Xem kết luận số liệu'); });
  await step(ctx, 'phần 2: bấm "Để máy thử xem nhanh hơn"', 0, async () => { await clickText(ctx, 'Để máy thử xem nhanh'); });
  for (const n of [0, 1, 2]) {
    const btn = (await page.$$('.lesson-scroll button.p-3'))[n];
    await step(ctx, `phần 2: máy dò cấu hình ${n + 1} (máy tự chạy, không khen)`, 0, async () => { await tap(ctx, btn); }, { settle: 600 });
    await waitText(page, /Hoàn thành!/, 20000);
  }
  await step(ctx, 'phần 2: bấm "Sang phần 3"', 0, async () => { await clickText(ctx, 'Sang phần 3'); });
  await step(ctx, 'phần 3: bấm "Thử rút 50 xu" (thất bại minh họa)', 0, async () => { await clickText(ctx, 'Thử rút 50 xu'); });
  await step(ctx, 'phần 3: chọn đáp án SAI "Ngân hàng"', 0, async () => { await clickText(ctx, 'Ngân hàng'); });
  if (ctx.deep) await scrollDeep(ctx);
  await step(ctx, 'phần 3: chọn đáp án ĐÚNG "Không ai cả"', 1, async () => { await clickText(ctx, 'Không ai cả'); }, { shot: 'tram2-phan3' });
  await sleep(2800);
  doneRecord(ctx, await stationDoneText(page));
}

/** Biến thể trạm Khó: máy tự dò ở phần 1 (không được khen). */
export async function man7Tram2Auto(ctx) {
  const { page } = ctx;
  for (const x of [1, 2, 3]) await step(ctx, `phần 1: tự thử x = ${x}`, 0, async () => { await setXAndTry(ctx, x); });
  await step(ctx, 'phần 1: bấm "Để máy thử lần lượt" (máy tự dò đến khi ra 19, không khen)', 0, async () => { await clickText(ctx, 'Để máy thử lần lượt'); }, { settle: 3500 });
  await waitText(page, /ĐÃ TÌM RA KHÓA RIÊNG/);
  fact(ctx, 'máy tự dò ra khóa riêng', true);
}

/** Nộp đúng nhanh một lần ở trạm Khó màn 7 (phần 1: tự thử đúng khóa riêng). */
export async function quickCorrect7(ctx, label = 'tự thử đúng khóa riêng x', opts = {}) {
  const right = [...Array(22).keys()].map((i) => i + 1).find((x) => modPow(5, x, 23) === 19);
  return step(ctx, label, 1, async () => { await setXAndTry(ctx, right); }, opts);
}
