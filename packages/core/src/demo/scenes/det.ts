/** Làng Dệt: màn 5 "Đập chuột" (2D, chuột đi lên). Bot giỏi `WhackBrain` quyết định theo từng bước mô phỏng; con trỏ giả đuổi theo nút chân làn. */
import { whackUi } from '../../content/games';
import { tutorialTexts } from '../../content/tutorial';
import { clickEl, fire, q, type Ctx } from '../actions';
import { DEMO_HD } from '../config';
import { startFastForward, stopFastForward } from '../hdStats';
import { chaseCursor, tapEffect } from '../cursor';
import { getProbe } from '../probe';
import { pace, PACING } from '../pacing';
import { buttonByText, dwell } from '../ui';
import { finishMiniGame, nextFrame, onPath, startMiniGame } from './common';
import { man5Acts, walkTutorial } from './tutorial';

interface WhackStateLike {
  phase: string;
  clock: number;
}
interface WhackIo {
  hit: (lane: number) => void;
  read: () => void;
  collect: () => void;
}
interface WhackBrainLike {
  act: (s: never, now: number, io: WhackIo) => void;
  endRound: () => void;
}
interface Man5Probe {
  state: WhackStateLike;
  tutorialActive: boolean;
  setAutopilot: (ap: { step: (s: WhackStateLike, dt: number) => void; paused: () => boolean } | null) => void;
  makeBrain: () => Promise<WhackBrainLike>;
}
const man5Probe = () => getProbe<Man5Probe>('man5');

function centerOf(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
}

/** Bấm bằng con trỏ giả ngay trong bước mô phỏng: con trỏ đuổi tới phần tử, sự kiện con trỏ gửi tức thì (để đập đúng giờ). */
function tapNow(el: Element | null, type: 'pointerdown' | 'click'): void {
  if (!el) return;
  const c = centerOf(el);
  chaseCursor(c);
  tapEffect();
  if (type === 'click') {
    fire(el, 'click', c.x, c.y);
    return;
  }
  fire(el, 'pointerdown', c.x, c.y, { buttons: 1 });
  fire(el, 'pointerup', c.x, c.y);
}

/** Chế độ trọn: móc vào các thời điểm của màn 5 để ghi mốc đoạn và giữ mức tối thiểu */
export interface Man5Hooks {
  onCard?: () => void;
  onQuiz?: (n: number) => void;
  beforeContinue?: (n: number) => Promise<void>;
}

export async function man5(ctx: Ctx, hooks: Man5Hooks = {}): Promise<void> {
  const { ctl } = ctx;
  if (!onPath('/lang/lang-det/man/5')) throw new Error('not on the level 5 route');
  if (hooks.onCard) {
    await ctl.waitFor(() => q('[data-testid="the-bat-dau"]'), 'game start card', 30000);
    hooks.onCard();
  }
  let quizzes = 0;
  let answerSeen = false;
  await startMiniGame(ctx);
  const probe = await ctl.waitFor(() => man5Probe(), 'whack probe', 60000);
  if (probe.tutorialActive) {
    if (DEMO_HD) {
      await walkTutorial(ctx, man5Acts);
    } else {
      const tut = await ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'whack tutorial', 60000);
      await ctl.sleep(pace(2500));
      await clickEl(ctx, tut, { settle: 800 });
    }
  }
  const brain = await probe.makeBrain();
  let now = 0;
  let lastAct = -10;
  const io: WhackIo = {
    hit: (lane) => {
      lastAct = now;
      tapNow(q(`[data-testid="nut-dap-${lane}"]`), 'pointerdown');
    },
    read: () => {
      // "Đọc xong" chỉ có khi lượt đáp án còn chờ; bấm một lần
      const b = q('[data-testid="doc-xong"]');
      if (b) {
        lastAct = now;
        tapNow(b, 'click');
      }
    },
    collect: () => {
      lastAct = now;
      tapNow(q('[data-testid="dong-tien"]'), 'pointerdown');
    },
  };
  probe.setAutopilot({
    step: (s, dt) => {
      now += dt;
      // video hướng dẫn: chơi thường tới 30% thời gian ván (đồng hồ ván tới lượt trùm) rồi tua nhanh; lượt đáp án giữ tốc độ thường
      if (DEMO_HD && PACING && s.clock >= 0.3 * PACING.whack.bossEvery) startFastForward();
      // lượt đáp án: con trỏ nằm ở cột câu hỏi bên phải trong lúc "đọc"
      if (s.phase === 'answer' && now - lastAct > 0.8) {
        const col = q('[data-testid="cot-cau-hoi"]');
        if (col) chaseCursor(centerOf(col));
      }
      brain.act(s as never, now, io);
    },
    paused: () => ctl.paused,
  });
  await ctl.sleep(500);
  while (q('[data-testid="man5"]')) {
    await nextFrame(ctx);
    const s = man5Probe()?.state;
    if (s?.phase === 'answer' && !answerSeen) {
      answerSeen = true;
      hooks.onQuiz?.(0);
    }
    if (s?.phase === 'quiz') {
      // kết quả lượt đáp án: đọc lời giải rồi "Chơi tiếp"
      const next = await ctl.waitFor(() => buttonByText(whackUi.tiepTuc), 'whack quiz continue', 10000);
      quizzes++;
      hooks.onQuiz?.(quizzes);
      await dwell(ctx, document.querySelector('[role="dialog"]')?.textContent ?? '');
      await ctl.sleep(pace(1200));
      if (hooks.beforeContinue) await hooks.beforeContinue(quizzes);
      await clickEl(ctx, next, { settle: 600 });
      brain.endRound();
      continue;
    }
    const end = q<HTMLButtonElement>('[data-testid="nut-ket-qua"]');
    if (end) {
      await ctl.sleep(pace(1800));
      await clickEl(ctx, end, { settle: 600 });
      stopFastForward();
    }
  }
  probe.setAutopilot(null);
  await finishMiniGame(ctx, null);
}
