/** Video hướng dẫn: bot làm hướng dẫn làm thử P8 có sẵn từng bước. Mỗi bước: con trỏ giả chỉ vào vùng sáng, dừng theo độ dài chữ (2,5 đến 4 giây), làm thao tác của bước (nếu có) rồi bấm nút tiếp. */
import { tutorialTexts } from '../../content/tutorial';
import { clickEl, q, typeInto, type Ctx } from '../actions';
import { cursorPosition, moveCursor, placeCursor } from '../cursor';
import { hdGuideEnd } from '../hdStats';
import { readTime } from '../timing';

export interface TutorialAct {
  match: (text: string) => boolean;
  /** `seen`: chữ các bước đã qua (để lấy số mẫu), `text`: chữ bước này */
  run: (ctx: Ctx, text: string, seen: readonly string[]) => Promise<void>;
}

const TOOLTIP = '[data-testid="tutorial-tooltip"]';
export const TUT_READ_MS: readonly [number, number] = [2500, 4000];

const bodyText = (): string => q(`${TOOLTIP} [data-tooltip-body] p`)?.textContent ?? '';

/** Nút tiếp ở chân hộp hướng dẫn (bỏ nút Bỏ qua và Quay lại): nút cuối cùng. */
function footerButton(tip: Element): HTMLButtonElement | null {
  const list = [...tip.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.dataset.demo !== 'tut-skip' && (b.textContent ?? '').trim() !== tutorialTexts.chung.quayLai);
  return list.length > 0 ? list[list.length - 1] : null;
}

/** Chữ mẫu có chỗ trống `{x}` thành biểu thức chính quy để so khớp chữ đã thay số. */
export function templateRe(template: string): RegExp {
  const esc = template.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{[a-zA-Z0-9]+\}/g, '(.+?)');
  return new RegExp(`^${esc}$`);
}

/** Đi hết hướng dẫn làm thử đang mở. Trả số bước đã xem. */
export async function walkTutorial(ctx: Ctx, acts: readonly TutorialAct[]): Promise<number> {
  const { ctl } = ctx;
  await ctl.waitFor(() => q(TOOLTIP), 'tutorial tooltip', 15000);
  const seen: string[] = [];
  let steps = 0;
  for (let guard = 0; guard < 40; guard++) {
    const tip = q(TOOLTIP);
    if (!tip) break;
    const text = bodyText();
    if (seen[seen.length - 1] !== text) seen.push(text);
    const focus = q('[data-demo="tut-focus"]') ?? tip;
    const r = focus.getBoundingClientRect();
    await moveCursor(ctl, { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) });
    // dừng theo độ dài chữ; giữa chừng hiện lại con trỏ (nó tự mờ sau 3,5 giây không động)
    const wait = readTime(text, 1, TUT_READ_MS);
    await ctl.sleep(wait / 2);
    placeCursor(cursorPosition());
    await ctl.sleep(wait / 2);
    const act = acts.find((a) => a.match(text));
    if (act) {
      await act.run(ctx, text, seen);
      await ctl.sleep(250);
    }
    const again = q(TOOLTIP);
    if (!again) break;
    if (bodyText() === text) {
      const btn = footerButton(again);
      if (btn) await clickEl(ctx, btn, { settle: 400 });
      else await ctl.sleep(600);
    }
    steps++;
  }
  await ctl.waitFor(() => !q(TOOLTIP), 'tutorial closed', 8000);
  hdGuideEnd();
  return steps;
}

/** Làm thử Màn 1 trạm Dễ: tính mã trang mẫu (số lấy từ ví dụ ở bước công thức), gõ vào ô, bấm Kiểm tra. */
export const man1Acts: TutorialAct[] = [
  {
    match: (t) => t === tutorialTexts.man1De.input,
    run: async (ctx, _t, seen) => {
      // ví dụ mẫu dạng (a × 2 + b) = tổng nằm ở bước công thức
      const m = seen.map((t) => /\(\s*\d+\s*×\s*2\s*\+\s*\d+\s*\)\s*=\s*(\d+)/.exec(t)).find(Boolean) ?? null;
      const code = m ? Number(m[1]) % 100 : 0;
      const input = await ctx.ctl.waitFor(() => q<HTMLInputElement>('[data-tutorial="practice-area"] input'), 'practice input', 5000);
      await typeInto(ctx, input, String(code));
    },
  },
  {
    match: (t) => t === tutorialTexts.man1De.check,
    run: async (ctx) => {
      const b = await ctx.ctl.waitFor(() => q<HTMLButtonElement>('[data-tutorial="check-button"] button'), 'practice check button', 5000);
      await clickEl(ctx, b, { settle: 600 });
    },
  },
];

/** Màn 2: bấm "Nhảy thử". */
export const man2Acts: TutorialAct[] = [
  {
    match: (t) => t === tutorialTexts.man2.practice,
    run: async (ctx) => {
      const b = await ctx.ctl.waitFor(() => q<HTMLButtonElement>('[data-tutorial-obstacle] button'), 'jump practice button', 5000);
      await clickEl(ctx, b, { settle: 600 });
    },
  },
];

/** Màn 5: đập thử làn 1, rồi đập chuột mang đáp án đúng của câu mẫu. */
export const man5Acts: TutorialAct[] = [
  {
    match: (t) => t === tutorialTexts.man5.practice,
    run: async (ctx) => {
      const b = await ctx.ctl.waitFor(() => q<HTMLButtonElement>('[data-tutorial-obstacle] button'), 'whack practice button', 5000);
      await clickEl(ctx, b, { settle: 600 });
    },
  },
  {
    match: (t) => t === tutorialTexts.man5.practiceAnswer,
    run: async (ctx) => {
      const b = await ctx.ctl.waitFor(() => q<HTMLButtonElement>(`[data-testid="dap-mau-${tutorialTexts.man5.mau.dung}"]`), 'whack practice answer', 5000);
      await clickEl(ctx, b, { settle: 600 });
    },
  },
];

/** Màn 10 trạm Dễ: gõ kết quả ghép cặp (số có ngay trong chữ bước) rồi bấm "Ghép giao dịch". */
const man10InputRe = templateRe(tutorialTexts.man10De.input);
export const man10Acts: TutorialAct[] = [
  {
    match: (t) => man10InputRe.test(t),
    run: async (ctx, text) => {
      const v = man10InputRe.exec(text)?.[1] ?? '';
      const input = await ctx.ctl.waitFor(() => q<HTMLInputElement>('#tutorial-man10de-input input'), 'man10 practice input', 5000);
      await typeInto(ctx, input, v);
      const check = await ctx.ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="check"]'), 'man10 check', 5000);
      await clickEl(ctx, check, { settle: 800 });
    },
  },
];
