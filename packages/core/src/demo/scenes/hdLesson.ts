/** Video hướng dẫn, bài học (Màn 1, 10): nhịp chậm cho dễ theo dõi. Con trỏ chỉ vào các số dùng để tính trước mỗi lần nhập; dừng đọc phản hồi sau mỗi lần kiểm tra. Ngoài chế độ này mọi hàm không làm gì. */
import type { Ctx } from '../actions';
import { DEMO_HD } from '../config';
import { moveCursor } from '../cursor';
import { PACING } from '../pacing';

const rand = (r: readonly [number, number]): number => Math.round(r[0] + Math.random() * (r[1] - r[0]));

/** Nhịp riêng của bài học (null ngoài chế độ này). */
export const hdLesson = () => (DEMO_HD && PACING ? (PACING.hd ?? null) : null);

/** Chỉ con trỏ vào phần tử (hoặc nhiều phần tử lần lượt) trong 1 đến 1,5 giây tổng. */
export async function pointAt(ctx: Ctx, targets: ReadonlyArray<Element | null | undefined>): Promise<void> {
  const hd = hdLesson();
  if (!hd) return;
  const els = targets.filter((e): e is Element => !!e);
  if (els.length === 0) return;
  const total = rand(hd.pointMs);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    await moveCursor(ctx.ctl, { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
    await ctx.ctl.sleep(total / els.length);
  }
}

/** Dừng 1,5 đến 2 giây để người xem đọc phản hồi. */
export async function afterCheck(ctx: Ctx): Promise<void> {
  const hd = hdLesson();
  if (hd) await ctx.ctl.sleep(rand(hd.afterMs));
}
