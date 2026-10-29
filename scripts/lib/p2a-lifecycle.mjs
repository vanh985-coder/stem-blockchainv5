// Kiểm vòng đời lời khen bằng thao tác thật: tắt âm, giảm chuyển động, đổi trạm / rời bài giữa hiệu ứng, FeedbackSheet render lại.
import { clickText, gotoStation, openLesson, shot, sleep, step } from './p2a-real.mjs';
import { quickCorrect1 } from './p2a-stations-1.mjs';
import { quickCorrect4 } from './p2a-stations-2.mjs';
import { quickCorrect7 } from './p2a-stations-3.mjs';
import { quickCorrect10 } from './p2a-stations-4.mjs';

const QUICK = {
  1: { tram: 0, fn: quickCorrect1 },
  4: { tram: 0, fn: quickCorrect4 },
  7: { tram: 2, fn: quickCorrect7 },
  10: { tram: 0, fn: quickCorrect10 },
};

const nowPraise = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-testid="lesson-praise"]');
  return el ? { text: el.textContent.trim(), sparks: el.querySelectorAll('.lesson-fireworks i').length } : null;
});

function fact(ctx, text, ok, extra = {}) {
  ctx.records.push({ man: ctx.man, tram: ctx.tram, size: ctx.size.name, step: text, expect: 1, actual: ok ? 1 : 0, ok: Boolean(ok), kind: 'vongDoi', ...extra });
}

export async function lifecycle(browser, size, man, { base } = {}) {
  const q = QUICK[man];
  const out = [];
  const run = async (name, openOpts, body) => {
    const ctx = await openLesson(browser, size, man, q.tram, openOpts);
    ctx.deep = size.touch;
    ctx.scenario = name;
    try { await body(ctx); } catch (e) { fact(ctx, `${name}: lỗi chạy ${e.message}`, false); }
    if (ctx.errors.length) fact(ctx, `${name}: có lỗi trang: ${ctx.errors.join(' | ')}`, false);
    out.push(ctx);
    await ctx.page.close();
  };

  await run('tắt âm', { sound: false }, async (ctx) => {
    const rec = await q.fn(ctx, 'tắt âm: nộp đúng', {});
    fact(ctx, `tắt âm: vẫn có lời khen (${rec.events.length} đợt) và không phát nốt nhạc nào (${rec.oscDelta})`, rec.actual === 1 && rec.oscDelta === 0 && rec.events[0].sparks === 24);
  });

  await run('có âm', { sound: true }, async (ctx) => {
    const rec = await q.fn(ctx, 'bật âm: nộp đúng (đối chứng, có phát nốt nhạc)', {});
    fact(ctx, `bật âm: có phát nốt nhạc (${rec.oscDelta}) và lời khen`, rec.actual === 1 && rec.oscDelta > 0);
  });

  await run('giảm chuyển động (cài đặt)', { reducedSetting: true }, async (ctx) => {
    const rec = await q.fn(ctx, 'giảm chuyển động (cài đặt của game): nộp đúng', { shot: `giam-chuyen-dong`, shotDelay: 120 });
    fact(ctx, 'cài đặt "Giảm chuyển động": chỉ có chữ khen, không có hạt pháo hoa', rec.actual === 1 && rec.events[0].sparks === 0 && rec.events[0].text.length > 0);
  });

  await run('giảm chuyển động (hệ điều hành)', { reducedMedia: true }, async (ctx) => {
    const rec = await q.fn(ctx, 'giảm chuyển động (hệ điều hành): nộp đúng', {});
    fact(ctx, 'media prefers-reduced-motion: chỉ có chữ khen, không có hạt', rec.actual === 1 && rec.events[0].sparks === 0 && rec.events[0].text.length > 0);
  });

  await run('đổi media giữa hiệu ứng', {}, async (ctx) => {
    const rec = await q.fn(ctx, 'đổi media giữa hiệu ứng: nộp đúng (có hạt)', {});
    const before = await nowPraise(ctx.page);
    await ctx.page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await sleep(150);
    const after = await nowPraise(ctx.page);
    fact(ctx, `bật giảm chuyển động giữa chừng: hạt biến mất (${before.sparks} → ${after.sparks}), chữ khen còn`, rec.actual === 1 && before.sparks === 24 && after.sparks === 0 && after.text.length > 0);
  });

  await run('chuyển trạm giữa hiệu ứng', {}, async (ctx) => {
    const rec = await q.fn(ctx, 'chuyển trạm: nộp đúng', {});
    const n0 = (await ctx.page.evaluate(() => window.__praise.length));
    const target = q.tram === 0 ? 1 : 0;
    await ctx.page.$eval(`header ol li:nth-child(${target + 1}) button`, (e) => e.click());
    await sleep(120);
    const mid = await nowPraise(ctx.page);
    await sleep(2300);
    const end = await nowPraise(ctx.page);
    const n1 = (await ctx.page.evaluate(() => window.__praise.length));
    fact(ctx, `đổi trạm khi đang khen: lời khen và hạt biến mất ngay, không khen lại sau 2,3 giây (đợt: ${n0} → ${n1})`, rec.actual === 1 && mid.text === '' && mid.sparks === 0 && end.text === '' && n1 === n0);
  });

  await run('rời bài giữa hiệu ứng', {}, async (ctx) => {
    const rec = await q.fn(ctx, 'rời bài: nộp đúng', {});
    const link = await ctx.page.$('a[href^="/dang-nhap"]');
    await link.evaluate((e) => e.click());
    await ctx.page.waitForFunction(() => !document.querySelector('[data-testid="lesson-praise"]'), { timeout: 5000 });
    await sleep(2300);
    fact(ctx, 'rời bài (điều hướng SPA) khi đang khen: vùng khen bị gỡ, 2,3 giây sau không lỗi và không dựng lại', rec.actual === 1 && !(await ctx.page.$('[data-testid="lesson-praise"]')) && ctx.errors.length === 0);
  });

  return out;
}

/** FeedbackSheet: hộp ĐÚNG đang mở, bố cục đổi (cỡ khung nhìn) làm cha render lại với callback mới. Khen không được phát lại. */
export async function sheetRerender(browser, size, label, openBase) {
  const ctx = await openLesson(browser, size, 4, 0, openBase ? { base: openBase } : {});
  ctx.scenario = label;
  try {
    const rec = await quickCorrect4(ctx, `${label}: quyết định đúng, hộp phản hồi mở`, { shot: label.includes('dev') ? undefined : undefined });
    const sheet = await ctx.page.evaluate(() => Boolean(document.querySelector('.lesson-window .fixed.z-50')));
    const osc0 = await ctx.page.evaluate(() => window.__osc);
    const n0 = await ctx.page.evaluate(() => window.__praise.length);
    for (let i = 1; i <= 4; i++) {
      await ctx.page.setViewport({ width: size.w + i * 7, height: size.h, hasTouch: size.touch, isMobile: size.touch });
      await sleep(250);
    }
    const n1 = await ctx.page.evaluate(() => window.__praise.length);
    const osc1 = await ctx.page.evaluate(() => window.__osc);
    fact(ctx, `${label}: hộp đang mở (${sheet}), cha render lại ${4} lần: số đợt khen ${n0} → ${n1} (không phát lại); nốt nhạc phát lại ${osc1 - osc0} lần`, rec.actual === 1 && sheet && n1 === n0, { oscReplay: osc1 - osc0 });
    await clickText(ctx, 'Vòng tiếp theo');
    await sleep(300);
    const rec2 = ctx.records.length;
    void rec2;
  } catch (e) {
    fact(ctx, `${label}: lỗi chạy ${e.message}`, false);
  }
  if (ctx.errors.length) fact(ctx, `${label}: có lỗi trang: ${ctx.errors.join(' | ')}`, false);
  await ctx.page.close();
  return ctx;
}
