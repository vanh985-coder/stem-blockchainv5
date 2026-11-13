/** Chế độ trọn: Làng Dệt (D01 đến D12). Dịch chuyển bằng bản đồ lớn; thẻ đọc và trả lời nhanh gấp 1,5 lần Làng Giấy. */
import { bai2Texts } from '../../content/lessons/bai-2';
import { whackUi } from '../../content/games';
import { clickEl, q, qa, typeInto, type Ctx } from '../actions';
import { getProbe } from '../probe';
import { buttonByText, dwell, playVnDialogs } from '../ui';
import { demoWorld, waitWorldReady } from '../world';
import { driveLesson, answerReflection, lessonStage, skipTutorial } from '../scenes/lesson';
import { man5 } from '../scenes/det';
import { nextFrame, onPath } from '../scenes/common';
import { tutorialTexts } from '../../content/tutorial';
import { hold, tronEnterLevel, tronEnterVillage, tronTeleportCards } from './common';
import { beginSeg, endSeg, markSeg } from './marks';

const T = bai2Texts;
const VILLAGE = 'lang-det' as const;

/** D01 bản đồ lớn + dịch chuyển tới cổng, D02 cảnh mở đầu của cụ Bình. */
export const tronDetVao = (ctx: Ctx): Promise<void> => tronEnterVillage(ctx, VILLAGE, 'det', 'D01', 'D02');

/** D03 bốn thẻ "Em có biết?" của Làng Dệt. */
export const tronDetThe = (ctx: Ctx): Promise<void> => tronTeleportCards(ctx, VILLAGE, 'D03');

interface Man4Probe {
  station: 'de' | 'tb' | 'kho';
  tutorialOpen: boolean;
  feedbackOpen?: boolean;
  agree?: boolean | null;
  hard?: { stage: string | null; creator: string | null; expectedCode: number | null; proposalOk: boolean | null; voted: boolean; finished: boolean; turn: number };
}
const man4Probe = () => getProbe<Man4Probe>('man4');

const skipTut = (ctx: Ctx): Promise<void> => skipTutorial(ctx, 500);

/** Trạm Dễ và Trung bình: mỗi vòng đọc, bấm Đồng ý/Từ chối đúng, đọc phản hồi, sang vòng sau. */
async function voteStation(ctx: Ctx, name: 'de' | 'tb'): Promise<void> {
  const { ctl } = ctx;
  await ctl.waitFor(() => man4Probe()?.station === name, 'man 4 probe ' + name, 15000);
  if (man4Probe()?.tutorialOpen) await skipTut(ctx);
  await ctl.sleep(1000);
  while (lessonStage() === 'play') {
    const p = man4Probe();
    if (!p || p.station !== name || p.tutorialOpen) {
      await ctl.sleep(250);
      continue;
    }
    if (p.feedbackOpen) {
      const cont = q<HTMLButtonElement>('[data-demo="feedback-continue"]');
      if (!cont) {
        await ctl.sleep(250);
        continue;
      }
      await dwell(ctx, q('[role="dialog"]')?.textContent ?? '');
      await clickEl(ctx, cont, { settle: 500 });
      continue;
    }
    if (p.agree == null) {
      await ctl.sleep(250);
      continue;
    }
    const btns = qa<HTMLButtonElement>('[data-tutorial="decision-buttons"] button');
    if (btns.length < 2) {
      await ctl.sleep(250);
      continue;
    }
    await ctl.sleep(1800);
    await clickEl(ctx, btns[p.agree ? 0 : 1], { settle: 700 });
    await ctl.sleep(400);
  }
}

/** Trạm Khó: 8 lượt đặt cọc; em tạo trang thật, bỏ phiếu đúng cho trang của bot, đọc kết quả mỗi lượt, rồi câu suy ngẫm và "Xong trạm". */
async function hardStation(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await ctl.waitFor(() => man4Probe()?.station === 'kho', 'man 4 probe kho', 15000);
  if (man4Probe()?.tutorialOpen) await skipTut(ctx);
  await ctl.sleep(1000);
  for (;;) {
    await ctl.checkpoint();
    const h = man4Probe()?.hard;
    if (!h || man4Probe()?.tutorialOpen) {
      await ctl.sleep(250);
      continue;
    }
    if (h.finished) break;
    if (h.stage === 'skipped') {
      const b = buttonByText(T.kho.sangLuotTiep);
      if (b) await clickEl(ctx, b, { settle: 600 });
      continue;
    }
    if (h.stage === 'creator-choice' && h.creator === 'em' && h.expectedCode !== null) {
      const input = q<HTMLInputElement>('[data-tutorial="honest-card"] input');
      const send = buttonByText(T.kho.guiTrang);
      if (input && send) {
        await ctl.sleep(1500);
        await typeInto(ctx, input, String(h.expectedCode));
        await clickEl(ctx, send, { settle: 800 });
        await ctl.sleep(2500);
        continue;
      }
    }
    if (h.stage === 'voting' && h.creator !== 'em' && !h.voted && h.proposalOk !== null) {
      const want = h.proposalOk ? T.chung.dongY : T.chung.tuChoi;
      const b = [...document.querySelectorAll<HTMLButtonElement>('button')].find((x) => (x.textContent ?? '').includes(want) && !x.closest('[data-tutorial="decision-buttons"]'));
      if (b) {
        await ctl.sleep(2000);
        await clickEl(ctx, b, { settle: 800 });
        continue;
      }
    }
    if (h.stage === 'revealed') {
      const b = buttonByText(T.kho.luotTiep) ?? buttonByText(T.kho.xemTongKet);
      if (b) {
        await ctl.sleep(2500);
        await clickEl(ctx, b, { settle: 600 });
        continue;
      }
    }
    await ctl.sleep(300);
  }
  await answerReflection(ctx);
  const done = await ctl.waitFor(() => buttonByText(T.chung.xongTram), 'finish station', 8000);
  await clickEl(ctx, done, { settle: 600 });
}

/** D04 trạm Dễ, D05 trạm Trung bình, D06 trạm Khó, D07 màn kết quả màn 4. */
export async function tronDetM4(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await tronEnterLevel(ctx, VILLAGE, 4, hold(ctx));
  await ctl.waitFor(() => lessonStage(), 'lesson page', 30000);
  markSeg('D04');
  await driveLesson(ctx, {
    playStation: async (c, i) => {
      if (i === 1) markSeg('D05');
      if (i === 2) markSeg('D06');
      if (i === 0) await voteStation(c, 'de');
      else if (i === 1) await voteStation(c, 'tb');
      else await hardStation(c);
    },
    beforeNext: hold(ctx),
  });
  markSeg('D07');
  await ctl.sleep(1500);
}

/** D08 màn 5 bắt đầu, D09 lượt chuột câu hỏi. */
export async function tronDetM5(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await endSeg(ctx);
  const path = '/lang/lang-det/man/5';
  if (!onPath(path)) {
    const extra = q<HTMLButtonElement>('[data-demo="complete-extra"]');
    if (extra) await clickEl(ctx, extra, { settle: 600 });
    await ctl.waitFor(() => onPath(path), 'route ' + path, 20000);
  }
  await man5(ctx, {
    onCard: () => markSeg('D08'),
    onQuiz: (n) => {
      if (n === 0) void beginSeg(ctx, 'D09');
    },
    beforeContinue: async (n) => {
      if (n >= 3) await endSeg(ctx);
    },
  });
}

interface Man6Probe {
  state: { phase: string; passed: number };
  tutorialActive: boolean;
  quizOpen: boolean;
  quizDone: boolean;
  correctIndex: number | null;
  setAutopilot: (fn: ((s: never) => void) | null) => void;
  makeAutopilot: () => Promise<(s: never) => void>;
}
const man6Probe = () => getProbe<Man6Probe>('man6');

/** D10 màn 6 bắt đầu, D11 cổng làng đầu tiên mở. */
export async function tronDetM6(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await endSeg(ctx);
  const path = '/lang/lang-det/man/6';
  if (!onPath(path)) {
    const next = q<HTMLButtonElement>('[data-testid="choi-tiep"]');
    if (next) await clickEl(ctx, next, { settle: 600 });
    await ctl.waitFor(() => onPath(path), 'route ' + path, 20000);
  }
  await ctl.waitFor(() => q('[data-testid="the-bat-dau"]'), 'game start card', 30000);
  markSeg('D10');
  await dwell(ctx, q('[data-testid="the-luat"]')?.textContent ?? '');
  const start = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-start"]'), 'start button', 5000);
  await clickEl(ctx, start, { settle: 600 });
  const probe = await ctl.waitFor(() => man6Probe(), 'kite probe', 60000);
  if (probe.tutorialActive) {
    const tut = await ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'kite tutorial', 60000);
    await ctl.sleep(500);
    await clickEl(ctx, tut, { settle: 800 });
  }
  const pilot = await probe.makeAutopilot();
  probe.setAutopilot((s) => {
    if (ctl.paused) return;
    pilot(s);
  });
  let quizSeen = false;
  while (!q('[data-demo="game-leave"]')) {
    await nextFrame(ctx);
    const endBtn = q<HTMLButtonElement>('[data-testid="nut-ket-qua"]');
    if (endBtn) {
      await ctl.sleep(1500);
      await clickEl(ctx, endBtn, { settle: 600 });
      continue;
    }
    const p = man6Probe();
    if (p?.quizOpen && !quizSeen && p.correctIndex != null) {
      quizSeen = true;
      await beginSeg(ctx, 'D11');
      const panel = await ctl.waitFor(() => q('[data-kite-ui]'), 'kite quiz panel', 5000).catch(() => null);
      const opts = qa<HTMLButtonElement>('[data-kite-ui] ul button');
      await dwell(ctx, panel?.textContent ?? '');
      if (opts[p.correctIndex]) await clickEl(ctx, opts[p.correctIndex], { settle: 600 });
      await ctl.sleep(1500);
      await endSeg(ctx);
      const cont = await ctl.waitFor(() => buttonByText(whackUi.tiepTuc) ?? q<HTMLButtonElement>('[data-kite-ui] button[autofocus]'), 'kite continue', 8000).catch(() => null);
      if (cont) await clickEl(ctx, cont, { settle: 600 });
    }
  }
  probe.setAutopilot(null);
  await ctl.sleep(3000);
}

/** D12 cụ Bình trao Trang Sổ Vàng thứ hai. */
export async function tronDetTrao(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  await endSeg(ctx);
  if (!onPath('/cho')) {
    const leave = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-leave"]'), 'leave button', 8000);
    await clickEl(ctx, leave, { settle: 800 });
    await ctl.waitFor(() => onPath('/cho'), 'back to the market page', 20000);
  }
  await waitWorldReady(ctx);
  await ctl.waitFor(() => demoWorld()?.dialogOpen, 'golden page ceremony', 40000);
  markSeg('D12');
  await playVnDialogs(ctx, { beforeLast: hold(ctx) });
  await ctl.sleep(2000);
}
