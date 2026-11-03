/** Làng Bạc: màn 10 "Cây gộp sổ" (bài 4, ba trạm). Đáp án lấy từ `combine`/cây đúng của đề (qua probe), không viết lại công thức. */
import { bai4Texts } from '../../content/lessons/bai-4';
import { clickEl, dragEl, q, typeInto, type Ctx } from '../actions';
import { getProbe } from '../probe';
import { buttonByText, dwell, playVnDialogs, vnNext } from '../ui';
import { onPath } from './common';
import { driveLesson, lessonStage, skipTutorial } from './lesson';

const TB = bai4Texts.tramTb;

interface Man10Probe {
  station: 'de' | 'tb' | 'kho';
  tutorialActive: boolean;
  expected?: number | null;
  phase?: string;
  expectB?: { t12: number; t34: number; root: number };
  solved?: { t12: boolean; t34: boolean; root: boolean };
  tamperedLeaf?: number;
  found?: boolean;
  tamperStep?: number;
  plan?: { slot: string; piece: string; placed: boolean }[];
}
const probe = () => getProbe<Man10Probe>('man10');
const cell = (id: string) => q<HTMLElement>(`[data-demo-cell="${id}"]`);

async function playEasy(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  while (lessonStage() === 'play') {
    const p = probe();
    const input = q<HTMLInputElement>('#tutorial-man10de-input input');
    if (!p || p.expected == null || !input || input.value !== '') {
      await ctl.sleep(250);
      continue;
    }
    await typeInto(ctx, input, String(p.expected));
    const check = q<HTMLButtonElement>('[data-demo="check"]');
    if (check) await clickEl(ctx, check, { settle: 1400 });
  }
}

async function playMedium(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  // phần A: xem dựng cây từng bước
  while (probe()?.phase === 'phase_a') {
    const next = buttonByText(TB.tiepTheo) ?? buttonByText(TB.tuEmXayCay);
    if (!next) {
      await ctl.sleep(250);
      continue;
    }
    await dwell(ctx, q('[data-testid="lesson-scroll"] h3')?.textContent ?? '');
    await ctl.sleep(1200);
    await clickEl(ctx, next, { settle: 500 });
  }
  // phần B: tự xây cây, nhập T12, T34 rồi gốc
  for (const [slot, cellId] of [['t12', '1-0'], ['t34', '1-1'], ['root', '2-0']] as const) {
    await ctl.waitFor(() => probe()?.phase === 'phase_b', 'phase B', 10000);
    if (probe()?.solved?.[slot]) continue;
    const c = await ctl.waitFor(() => cell(cellId), `tree cell ${cellId}`, 5000);
    await clickEl(ctx, c, { settle: 500 });
    const input = await ctl.waitFor(() => q<HTMLInputElement>('[data-testid="lesson-scroll"] input'), 'build input', 5000);
    await typeInto(ctx, input, String(probe()?.expectB?.[slot]));
    const check = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="check"]'), 'confirm button', 5000);
    await clickEl(ctx, check, { settle: 800 });
    await ctl.waitFor(() => probe()?.solved?.[slot], `slot ${slot} solved`, 6000);
  }
  const reveal = await ctl.waitFor(() => buttonByText(TB.khamPhaKhoanhKhacA), 'reveal button', 8000);
  await ctl.sleep(1500);
  await clickEl(ctx, reveal, { settle: 800 });
  // phần C: soi từ gốc xuống tới lá bị sửa, rồi xem ánh đỏ chạy ngược lên gốc
  await ctl.waitFor(() => probe()?.phase === 'phase_c', 'phase C', 10000);
  await dwell(ctx, q('[data-testid="lesson-scroll"] h3')?.textContent ?? '');
  await ctl.sleep(2000);
  const leaf = probe()?.tamperedLeaf ?? 0;
  for (const id of [`1-${leaf >> 1}`, `0-${leaf}`]) {
    const c = await ctl.waitFor(() => cell(id), `inspect cell ${id}`, 6000);
    await clickEl(ctx, c, { settle: 1200 });
  }
  await ctl.waitFor(() => probe()?.found && (probe()?.tamperStep ?? 0) >= 2, 'red pulse reaches the root', 15000);
  await ctl.sleep(3000);
  const done = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="station-finish"]'), 'finish button', 5000);
  await clickEl(ctx, done, { settle: 600 });
}

async function playHard(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await ctl.sleep(1500);
  while (lessonStage() === 'play') {
    // lời thầy Linh (lật tình huống ở trạm Trung bình) còn phủ lên: xem hết rồi mới làm
    if (vnNext()) {
      await playVnDialogs(ctx);
      continue;
    }
    const plan = probe()?.plan;
    if (!plan) {
      await ctl.sleep(250);
      continue;
    }
    const todo = plan.find((x) => !x.placed);
    if (todo) {
      const piece = q<HTMLElement>(`[data-dnd-id="${todo.piece}"]`);
      const slot = q<HTMLElement>(`[data-dnd-id="${todo.slot}"]`);
      if (!piece || !slot) {
        await ctl.sleep(300);
        continue;
      }
      // thả hơi lệch tâm ô cho tự nhiên (vẫn trong ô)
      const r = slot.getBoundingClientRect();
      const dx = Math.min(6, r.width * 0.12);
      const dy = Math.min(4, r.height * 0.1);
      await dragEl(ctx, piece, { x: Math.round(r.left + r.width / 2 + dx), y: Math.round(r.top + r.height / 2 - dy) });
      await ctl.sleep(500);
      continue;
    }
    const check = q<HTMLButtonElement>('[data-demo="check"]');
    if (check) await clickEl(ctx, check, { settle: 1500 });
    await ctl.sleep(500);
  }
}

async function playMan10Station(ctx: Ctx, idx: number): Promise<void> {
  const name = (['de', 'tb', 'kho'] as const)[idx];
  await ctx.ctl.waitFor(() => probe()?.station === name, `man 10 probe ${name}`, 20000);
  if (probe()?.tutorialActive) await skipTutorial(ctx);
  await ctx.ctl.sleep(1200);
  if (idx === 0) await playEasy(ctx);
  else if (idx === 1) await playMedium(ctx);
  else await playHard(ctx);
}

export async function man10(ctx: Ctx): Promise<void> {
  if (!onPath('/lang/lang-bac/man/10')) throw new Error('not on the level 10 route');
  await ctx.ctl.waitFor(() => lessonStage(), 'lesson page', 30000);
  await driveLesson(ctx, { playStation: playMan10Station });
  await ctx.ctl.sleep(2500);
}
