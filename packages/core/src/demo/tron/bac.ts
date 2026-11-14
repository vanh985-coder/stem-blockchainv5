/** Chế độ trọn: Làng Bạc (B01 đến B11). Dịch chuyển bằng bản đồ lớn; thẻ nhanh gấp 1,5 lần Làng Giấy. Màn 10 dùng lại bot màn 10 có sẵn; màn 11 đổi chỗ bằng nước tốt nhất của bot giỏi; màn 12 bộ lái leo bậc. */
import { tutorialTexts } from '../../content/tutorial';
import { clickAt, clickEl, q, type Ctx } from '../actions';
import { keyDown, keyTap, keyUp } from '../keys';
import { getProbe } from '../probe';
import { buttonByText, dwell, playVnDialogs, vnNext } from '../ui';
import { driveLesson, lessonStage } from '../scenes/lesson';
import { onPath, nextFrame } from '../scenes/common';
import { playMan10Station } from '../scenes/bac';
import { hold, tronEnterLevel, tronEnterVillage, tronTeleportCards } from './common';
import { endSeg, markSeg } from './marks';

const VILLAGE = 'lang-bac' as const;

/** B01 bản đồ lớn + cảnh thầy Linh. */
export const tronBacVao = (ctx: Ctx): Promise<void> => tronEnterVillage(ctx, VILLAGE, 'bac', 'B01', null);

/** B02 bốn thẻ "Em có biết?" của Làng Bạc. */
export const tronBacThe = (ctx: Ctx): Promise<void> => tronTeleportCards(ctx, VILLAGE, 'B02');

/** B03 trạm Dễ, B04 trạm Trung bình (cây 4 lá), B05 trạm Khó (cây 8 lá), B06 màn kết quả màn 10. */
export async function tronBacM10(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await tronEnterLevel(ctx, VILLAGE, 10, hold(ctx));
  await ctl.waitFor(() => lessonStage(), 'lesson page', 30000);
  markSeg('B03');
  await driveLesson(ctx, {
    playStation: async (c, i) => {
      if (i === 1) markSeg('B04');
      if (i === 2) markSeg('B05');
      await playMan10Station(c, i);
    },
    beforeNext: hold(ctx),
  });
  markSeg('B06');
  await ctl.sleep(1500);
}

/** Mở một game phụ từ màn kết quả trước (nút Chơi tiếp), ghi mã đoạn khi thẻ bắt đầu hiện, đọc luật rồi bấm Bắt đầu. */
async function openGame(ctx: Ctx, path: string, code: string): Promise<void> {
  const { ctl } = ctx;
  await endSeg(ctx);
  if (!onPath(path)) {
    const btn = q<HTMLButtonElement>('[data-demo="complete-extra"]') ?? q<HTMLButtonElement>('[data-testid="choi-tiep"]');
    if (btn) await clickEl(ctx, btn, { settle: 600 });
    await ctl.waitFor(() => onPath(path), 'route ' + path, 20000);
  }
  await ctl.waitFor(() => q('[data-testid="the-bat-dau"]'), 'game start card', 30000);
  markSeg(code);
  await dwell(ctx, q('[data-testid="the-luat"]')?.textContent ?? '');
  const start = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-start"]'), 'start button', 5000);
  await clickEl(ctx, start, { settle: 600 });
}

async function skipGameTutorial(ctx: Ctx, active: () => boolean | undefined): Promise<void> {
  if (!active()) return;
  const tut = await ctx.ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'game tutorial', 60000);
  await ctx.ctl.sleep(500);
  await clickEl(ctx, tut, { settle: 800 });
}

interface Man11Probe {
  state: { phase: string; turnsLeft: number };
  tutorialActive: boolean;
  ready: boolean;
  banner: boolean;
  canAct: () => boolean;
  bestMove: () => Promise<{ a: [number, number]; b: [number, number] } | null>;
}
const probe11 = () => getProbe<Man11Probe>('man11');

/** B07 màn 11 bắt đầu (vòng 1, 4 ô cây). */
export async function tronBacM11(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await openGame(ctx, '/lang/lang-bac/man/11', 'B07');
  await playVnDialogs(ctx);
  await ctl.waitFor(() => probe11(), 'match3 probe', 60000);
  await skipGameTutorial(ctx, () => probe11()?.tutorialActive);
  await playVnDialogs(ctx);
  await ctl.waitFor(() => probe11()?.ready && !probe11()?.tutorialActive, 'match3 ready', 60000);
  await ctl.sleep(1500);
  let guard = 0;
  while (!q('[data-demo="game-leave"]') && guard++ < 400) {
    await ctl.checkpoint();
    if (vnNext()) {
      await playVnDialogs(ctx);
      continue;
    }
    const p = probe11();
    if (!p) {
      await ctl.sleep(250);
      continue;
    }
    if (p.banner) {
      const go = q<HTMLButtonElement>('[data-testid="nut-tiep"]');
      if (go) {
        await ctl.sleep(2000);
        await endSeg(ctx);
        await clickEl(ctx, go, { settle: 800 });
      }
      await ctl.sleep(500);
      continue;
    }
    if (!p.canAct()) {
      await ctl.sleep(300);
      continue;
    }
    const move = await p.bestMove();
    if (!move) {
      await ctl.sleep(500);
      continue;
    }
    // chạm ô thứ nhất rồi chạm ô kề (như người chơi chạm bàn)
    const board = await ctl.waitFor(() => q('[data-testid="man11-ban"]'), 'board', 5000);
    const r = board.getBoundingClientRect();
    const size = r.width / 7;
    const at = (pos: [number, number]) => ({ x: r.left + (pos[1] + 0.5) * size, y: r.top + (pos[0] + 0.5) * size });
    await clickAt(ctx, board, at(move.a), { settle: 500 });
    await clickAt(ctx, board, at(move.b), { settle: 900 });
    await ctl.sleep(800);
  }
  await ctl.waitFor(() => q('[data-demo="game-leave"]'), 'result screen', 20000);
  await ctl.sleep(2500);
}

interface Man12Probe {
  state: { phase: string; level: number; roundsDone: number };
  tutorialActive: boolean;
  ready: boolean;
  tip: boolean;
  banner: boolean;
  setAutopilot: (fn: ((s: never) => void) | null) => void;
  makePilot: () => Promise<(s: never) => void>;
}
const probe12 = () => getProbe<Man12Probe>('man12');

/** B08 màn 12 bắt đầu (vòng 1, 8 lá), B09 leo tới gốc. */
export async function tronBacM12(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await openGame(ctx, '/lang/lang-bac/man/12', 'B08');
  await playVnDialogs(ctx);
  await ctl.waitFor(() => probe12(), 'climb probe', 60000);
  await skipGameTutorial(ctx, () => probe12()?.tutorialActive);
  await playVnDialogs(ctx);
  await ctl.waitFor(() => probe12()?.ready && !probe12()?.tutorialActive, 'climb ready', 60000);
  const tip = q<HTMLButtonElement>('[role="dialog"] button');
  if (probe12()?.tip && tip) await clickEl(ctx, tip, { settle: 700 });
  const pilot = await probe12()!.makePilot();
  // bot đọc trạng thái, bấm phím mũi tên (giữ) và Space (nhảy) thật như người chơi
  const decide = pilot as unknown as (s: never) => { move: -1 | 0 | 1; jump: boolean };
  let moving: -1 | 0 | 1 = 0;
  probe12()!.setAutopilot((s) => {
    if (ctl.paused) return;
    const d = decide(s);
    if (d.move !== moving) {
      if (moving === -1) keyUp('ArrowLeft');
      if (moving === 1) keyUp('ArrowRight');
      if (d.move === -1) keyDown('ArrowLeft');
      if (d.move === 1) keyDown('ArrowRight');
      moving = d.move;
    }
    if (d.jump) keyTap('Space', 40);
  });
  let marked = false;
  let climaxMarked = false;
  let guard = 0;
  while (!q('[data-demo="game-leave"]') && guard++ < 4000) {
    await nextFrame(ctx);
    // hộp thoại: trước khi chơi là lời mở đầu của game; sau khi xong vòng là cảnh cao trào (chiếu tự động sau ván, nhiều bước nối nhau)
    if (vnNext()) {
      if (marked) {
        if (!climaxMarked) {
          climaxMarked = true;
          await endSeg(ctx);
          markSeg('B10');
        }
        await playVnDialogs(ctx, { beforeLast: hold(ctx) });
      } else await playVnDialogs(ctx);
      continue;
    }
    const p = probe12();
    const go = q<HTMLButtonElement>('[data-testid="nut-tiep"]');
    if (p?.banner && go) {
      if (!marked) {
        marked = true;
        await endSeg(ctx);
        markSeg('B09');
      }
      {
        await ctl.sleep(2500);
        await endSeg(ctx);
        await clickEl(ctx, go, { settle: 800 });
      }
    }
  }
  probe12()?.setAutopilot(null);
  await ctl.waitFor(() => q('[data-demo="game-leave"]'), 'result screen', 20000);
  await ctl.sleep(2500);
}

/** B11 màn kết quả cuối (sau cảnh cao trào, ngay trên trang màn 12). */
export async function tronBacCaoTrao(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await ctl.waitFor(() => q('[data-demo="game-leave"]'), 'final result screen', 60000);
  await ctl.sleep(1500);
  await endSeg(ctx);
  markSeg('B11');
  await ctl.sleep(1500);
  await endSeg(ctx);
}
