/** Thao tác ở mức giao diện chung: lật hộp thoại, đóng hướng dẫn, trả lời thẻ "Em có biết?" (luôn đúng). */
import { huongDan } from '../content/huongDan';
import { knowQuizOf } from '../lib/knowQuiz';
import { parseNumberAnswer } from '../lib/knowQuiz';
import type { VillageId } from '../village';
import { clickEl, q, qa, typeInto, type Ctx } from './actions';
import { readTime } from './timing';

/** Tìm nút theo chữ (so khớp nguyên văn đã bỏ khoảng trắng thừa) trong `root`. */
export function buttonByText(text: string, root: ParentNode = document): HTMLButtonElement | null {
  const want = text.trim();
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => (b.textContent ?? '').trim() === want) ?? null;
}

export function buttonByPrefix(prefix: string, root: ParentNode = document): HTMLButtonElement | null {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((b) => (b.textContent ?? '').trim().startsWith(prefix)) ?? null;
}

/** Dừng "đọc" một đoạn chữ. */
export function dwell(ctx: Ctx, text: string): Promise<void> {
  return ctx.ctl.sleep(readTime(text));
}

export const vnNext = (): HTMLButtonElement | null => q<HTMLButtonElement>('[data-demo="vn-next"]:not([disabled])');

/** Lật hết các lượt của hộp thoại kiểu truyện đang mở (và cả những hộp nối tiếp ngay sau đó). Trả số lượt đã lật. */
export async function playVnDialogs(ctx: Ctx, opts: { extraDwell?: number } = {}): Promise<number> {
  let turns = 0;
  let idle = 0;
  while (idle < 8) {
    const next = vnNext();
    if (!next) {
      idle++;
      await ctx.ctl.sleep(100);
      continue;
    }
    idle = 0;
    const text = q('[data-testid="vn-text"]')?.textContent ?? '';
    await dwell(ctx, text);
    if (opts.extraDwell) await ctx.ctl.sleep(opts.extraDwell);
    await clickEl(ctx, next, { settle: 300 });
    turns++;
  }
  return turns;
}

/** Hộp "Hướng dẫn chơi" tự mở lần đầu: cho xem một lúc rồi bấm Đóng. */
export async function dismissGuideIfOpen(ctx: Ctx): Promise<boolean> {
  const dlg = q('[data-testid="huong-dan"]');
  if (!dlg) return false;
  await ctx.ctl.sleep(2200);
  const close = dlg.querySelector<HTMLButtonElement>(`button[aria-label="${huongDan.dong}"]`);
  if (close) await clickEl(ctx, close, { settle: 500 });
  return true;
}

/** Trả lời thẻ "Em có biết?" đang mở: đọc thẻ, chọn/gõ đáp án ĐÚNG, đọc giải thích, bấm Cất vào sổ. */
export async function answerKnowCard(ctx: Ctx, village: VillageId, index: number): Promise<void> {
  const quiz = knowQuizOf(village, index);
  if (!quiz) throw new Error(`no quiz for ${village}#${index}`);
  await ctx.ctl.waitFor(() => q('[data-testid="the-co-cau-hoi"]'), 'know dialog', 6000);
  await dwell(ctx, q('[data-testid="the-noi-dung"]')?.textContent ?? '');
  await ctx.ctl.sleep(600);
  if (quiz.kind === 'abcd') {
    const opt = await ctx.ctl.waitFor(() => q(`[data-testid="dap-an-${quiz.correct}"]`), 'option', 4000);
    await clickEl(ctx, opt, { settle: 500 });
  } else {
    const input = await ctx.ctl.waitFor(() => q<HTMLInputElement>('[data-testid="o-nhap-so"]'), 'number input', 4000);
    const parsed = parseNumberAnswer(String(quiz.answer));
    await typeInto(ctx, input, parsed.kind === 'ok' ? String(parsed.value) : String(quiz.answer));
  }
  const check = await ctx.ctl.waitFor(() => q('[data-testid="nut-kiem-tra"]'), 'check button', 4000);
  await clickEl(ctx, check, { settle: 500 });
  const fb = await ctx.ctl.waitFor(() => q('[data-testid="phan-hoi"]'), 'feedback', 4000);
  await dwell(ctx, fb.textContent ?? '');
  await ctx.ctl.sleep(500);
  const stash = await ctx.ctl.waitFor(() => q('[data-testid="nut-cat-vao-so"]'), 'stash button', 4000);
  await clickEl(ctx, stash, { settle: 600 });
}

export { qa };
