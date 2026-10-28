// Driver thao tác thật cho 3 trạm màn 1 (Làng Giấy, bài 1). Mỗi hàm chạy tại trạm đã bắt đầu.
import { clickText, findButton, inputByLabel, pageText, scrollDeep, shot, sleep, step, tap, typeInto } from './p2a-real.mjs';

/** Công thức đang hiện trên trang, ví dụ "(37 × 2 + 30) mod 100 = ?": trả đáp án tính độc lập. */
export async function formulaAnswer(page) {
  const t = await pageText(page);
  const all = [...t.matchAll(/\((\d+) × 2 \+ (\d+)\) mod 100 = \?/g)];
  const m = all[all.length - 1];
  if (!m) throw new Error('Không thấy công thức mã trang trên trang');
  return (2 * Number(m[1]) + Number(m[2])) % 100;
}

export async function stationDoneText(page) {
  try {
    await page.waitForFunction(() => /điều em vừa học/i.test(document.querySelector('.lesson-scroll')?.innerText ?? ''), { timeout: 4000 });
    return true;
  } catch {
    return false;
  }
}

/** Nhập mã vào ô "Mã trang n" rồi nộp bằng phím Enter hoặc nút. */
async function submitCode(ctx, n, value, via, buttonText) {
  const input = await inputByLabel(ctx, `Mã trang ${n}`);
  await typeInto(ctx, input, value);
  if (via === 'enter') await ctx.page.keyboard.press('Enter');
  else await clickText(ctx, buttonText);
}

/** Đóng hộp phản hồi nếu còn mở. Nộp sai bằng Enter thì phím Enter đó cũng đóng luôn hộp (có sẵn từ trước P2a, ghi nhận ở báo cáo). */
export async function closeSheet(ctx, label, text = 'Thử lại') {
  const open = Boolean(await findButton(ctx.page, text));
  await step(ctx, open ? label : `${label} (hộp đã tự đóng)`, 0, async () => { if (open) await clickText(ctx, text); }, { note: open ? undefined : 'hộp đóng ngay khi nộp sai bằng Enter' });
  return open;
}

async function deepIf(ctx) {
  if (ctx.deep) return scrollDeep(ctx);
  return null;
}

/** Màn 1, trạm Dễ: 5 trang, nhập mã trang. Các kiểu nộp: ô trống, sai, đúng bằng Enter, đúng bằng nút. */
export async function man1Tram0(ctx) {
  const { page } = ctx;
  await step(ctx, 'trang 1: bấm "Kiểm tra" khi ô còn trống', 0, async () => { await clickText(ctx, 'Kiểm tra'); });
  let ans = await formulaAnswer(page);
  await step(ctx, 'trang 1: nhập mã SAI rồi bấm "Kiểm tra"', 0, async () => { await submitCode(ctx, 1, (ans + 1) % 100, 'button', 'Kiểm tra'); });
  await step(ctx, 'trang 1: đóng hộp phản hồi bằng "Thử lại"', 0, async () => { await clickText(ctx, 'Thử lại'); });
  await deepIf(ctx);
  await step(ctx, 'trang 1: nhập mã ĐÚNG, nộp bằng phím Enter', 1, async () => { await submitCode(ctx, 1, ans, 'enter'); }, { shot: 'tram0-lan1' });
  ans = await formulaAnswer(page);
  await deepIf(ctx);
  await step(ctx, 'trang 2: nhập mã ĐÚNG, nộp bằng nút (đúng liên tiếp)', 1, async () => { await submitCode(ctx, 2, ans, 'button', 'Kiểm tra'); });
  ans = await formulaAnswer(page);
  await step(ctx, 'trang 3: nhập mã SAI (lần 1) rồi nộp bằng Enter', 0, async () => { await submitCode(ctx, 3, (ans + 7) % 100, 'enter'); });
  await closeSheet(ctx, 'trang 3: đóng hộp phản hồi');
  await step(ctx, 'trang 3: nhập SAI lần 2 (hộp lời giải từng bước)', 0, async () => { await submitCode(ctx, 3, (ans + 3) % 100, 'button', 'Kiểm tra'); });
  await closeSheet(ctx, 'trang 3: đóng hộp phản hồi');
  await deepIf(ctx);
  await step(ctx, 'trang 3: nhập mã ĐÚNG (sau hai lần sai)', 1, async () => { await submitCode(ctx, 3, ans, 'button', 'Kiểm tra'); });
  ans = await formulaAnswer(page);
  await deepIf(ctx);
  await step(ctx, 'trang 4: nhập mã ĐÚNG', 1, async () => { await submitCode(ctx, 4, ans, 'enter'); });
  ans = await formulaAnswer(page);
  await deepIf(ctx);
  await step(ctx, 'trang 5 (cuối): nhập mã ĐÚNG, xong trạm', 1, async () => { await submitCode(ctx, 5, ans, 'button', 'Kiểm tra'); });
  const done = await stationDoneText(page);
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: 'xong trạm: màn "Điều em vừa học" hiện', expect: 1, actual: done ? 1 : 0, ok: done, kind: 'trangThai' });
}

/** Màn 1, trạm Trung bình: Tí sửa trộm, em tính lại các trang lệch. */
export async function man1Tram1(ctx) {
  const { page } = ctx;
  // Chờ hoạt cảnh sửa trộm xong và ô nhập xuất hiện (hoạt cảnh có phát tiếng sai, không được khen).
  await page.waitForFunction(() => document.querySelector('input[aria-label^="Mã trang"]'), { timeout: 15000 });
  const logAfterAnim = (await page.evaluate(() => window.__praise.length));
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: 'hoạt cảnh Tí sửa trộm (tiếng sai tự phát) không sinh khen', expect: 0, actual: logAfterAnim, ok: logAfterAnim === 0, kind: 'hoatCanh' });
  let fixed = 0;
  for (let guard = 0; guard < 6; guard++) {
    const input = await page.$('input[aria-label^="Mã trang"]');
    if (!input) break;
    const n = Number((await input.evaluate((e) => e.getAttribute('aria-label'))).replace(/\D+/g, ''));
    const ans = await formulaAnswer(page);
    if (fixed === 0) {
      await step(ctx, `trang ${n}: bấm "Cập nhật mã" khi ô còn trống`, 0, async () => { await clickText(ctx, 'Cập nhật mã'); });
      await step(ctx, `trang ${n}: nhập mã SAI rồi bấm "Cập nhật mã"`, 0, async () => { await submitCode(ctx, n, (ans + 1) % 100, 'button', 'Cập nhật mã'); });
      await step(ctx, 'đóng hộp phản hồi', 0, async () => { await clickText(ctx, 'Thử lại'); });
    }
    await deepIf(ctx);
    await step(ctx, `trang ${n}: nhập mã ĐÚNG (${fixed === 0 ? 'Enter' : 'nút'})`, 1, async () => { await submitCode(ctx, n, ans, fixed === 0 ? 'enter' : 'button', 'Cập nhật mã'); }, fixed === 0 ? { shot: 'tram1-lan1' } : {});
    fixed++;
  }
  if (fixed < 2) throw new Error(`Chỉ sửa được ${fixed} trang`);
  // Câu suy ngẫm: chọn đáp án và chốt không được khen.
  await page.waitForSelector('[role="radio"]', { visible: true });
  const radios = await page.$$('[role="radio"]');
  await step(ctx, 'câu suy ngẫm: chọn một đáp án', 0, async () => { await tap(ctx, radios[0]); });
  await step(ctx, 'câu suy ngẫm: bấm "Chốt"', 0, async () => { await clickText(ctx, 'Chốt'); });
  await step(ctx, 'bấm "Xong trạm"', 0, async () => { await clickText(ctx, 'Xong trạm'); });
  const done = await stationDoneText(page);
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: 'xong trạm: màn "Điều em vừa học" hiện', expect: 1, actual: done ? 1 : 0, ok: done, kind: 'trangThai' });
}

/** Màn 1, trạm Khó: 60 giây sửa trang thật nhanh; sai chỉ rung, không hộp. */
export async function man1Tram2(ctx) {
  const { page } = ctx;
  const nextN = async () => {
    const input = await page.$('input[aria-label^="Mã trang"]');
    if (!input) return null;
    return Number((await input.evaluate((e) => e.getAttribute('aria-label'))).replace(/\D+/g, ''));
  };
  let fixed = 0;
  for (let guard = 0; guard < 4; guard++) {
    const n = await nextN();
    if (n === null) break;
    const ans = await formulaAnswer(page);
    if (fixed === 0) {
      await step(ctx, `trang ${n}: nhập mã SAI rồi nộp (sai thì rung, không hộp)`, 0, async () => { await submitCode(ctx, n, (ans + 1) % 100, 'enter'); });
    }
    await deepIf(ctx);
    await step(ctx, `trang ${n}: nhập mã ĐÚNG (${fixed % 2 === 0 ? 'Enter' : 'nút'})`, 1, async () => { await submitCode(ctx, n, ans, fixed % 2 === 0 ? 'enter' : 'button', 'Cập nhật mã'); }, fixed === 0 ? { shot: 'tram2-lan1' } : {});
    fixed++;
  }
  if (fixed < 2) throw new Error(`Chỉ sửa được ${fixed} trang`);
  ctx.hardWait = true;
}

/** Sau khi hết 60 giây: câu suy ngẫm và Xong trạm (tách riêng vì phải chờ). */
export async function man1Tram2Finish(ctx) {
  const { page } = ctx;
  await page.waitForFunction(() => /Hết giờ/i.test(document.body.innerText), { timeout: 70000 });
  await page.waitForSelector('[role="radio"]', { visible: true });
  const radios = await page.$$('[role="radio"]');
  await step(ctx, 'hết giờ → câu suy ngẫm: chọn đáp án', 0, async () => { await tap(ctx, radios[1]); });
  await step(ctx, 'câu suy ngẫm: bấm "Chốt"', 0, async () => { await clickText(ctx, 'Chốt'); });
  await step(ctx, 'bấm "Xong trạm"', 0, async () => { await clickText(ctx, 'Xong trạm'); });
  const done = await stationDoneText(page);
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: 'xong trạm: màn "Điều em vừa học" hiện', expect: 1, actual: done ? 1 : 0, ok: done, kind: 'trangThai' });
}

/** Nộp đúng nhanh một lần ở trạm Dễ màn 1 (dùng cho kiểm vòng đời). */
export async function quickCorrect1(ctx, label = 'nộp mã trang đúng', opts = {}) {
  const ans = await formulaAnswer(ctx.page);
  return step(ctx, label, 1, async () => { await submitCode(ctx, 1, ans, 'enter'); }, opts);
}
