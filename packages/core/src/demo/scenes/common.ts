/** Việc chung của các cảnh màn chơi. */
import { q, clickEl, type Ctx } from '../actions';
import { dwell } from '../ui';

export const onPath = (p: string): boolean => location.pathname === p;

/** Thẻ bắt đầu của game phụ: đọc luật một lúc rồi bấm Bắt đầu. */
export async function startMiniGame(ctx: Ctx): Promise<void> {
  await ctx.ctl.waitFor(() => q('[data-testid="the-bat-dau"]'), 'game start card', 30000);
  await dwell(ctx, q('[data-testid="the-luat"]')?.textContent ?? '');
  await ctx.ctl.sleep(1200);
  const start = await ctx.ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-start"]'), 'start button', 5000);
  await clickEl(ctx, start, { settle: 600 });
}

/** Màn kết quả của game phụ: xem điểm một lúc rồi sang màn kế (nút "Chơi tiếp") nếu có. */
export async function finishMiniGame(ctx: Ctx, expectPath: string | null): Promise<void> {
  await ctx.ctl.waitFor(() => q('[data-testid="diem"]'), 'result screen', 60000);
  await ctx.ctl.sleep(4000);
  if (expectPath) {
    const next = await ctx.ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="choi-tiep"]'), 'next level button', 5000);
    await clickEl(ctx, next, { settle: 600 });
    await ctx.ctl.waitFor(() => onPath(expectPath), `route ${expectPath}`, 15000);
  }
}

export const nextFrame = (ctx: Ctx): Promise<void> => new Promise<void>((r) => requestAnimationFrame(() => r())).then(() => ctx.ctl.checkpoint());

