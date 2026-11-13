/** Làng Giấy: màn 1 (ba trạm), màn 2 (chạy 3D), màn 3 (kéo thả) và cảnh trao Trang Sổ Vàng. */
import { bai1Texts } from '../../content/lessons/bai-1';
import { boardNodeId } from '../../three/world/worldLayout';
import { tutorialTexts } from '../../content/tutorial';
import { clickEl, dragEl, q, typeInto, type Ctx } from '../actions';
import { getProbe } from '../probe';
import { buttonByText, dwell, playVnDialogs } from '../ui';
import { demoWorld, engageWorld, walkAndInteract, waitWorldReady, type WalkOpts } from '../world';
import { DEMO_HD, DEMO_MEN } from '../config';
import { hdStationEnd, hdStationStart, hdTurn, startFastForward, stopFastForward } from '../hdStats';
import { pace, PACING } from '../pacing';
import { finishMiniGame, nextFrame, onPath, startMiniGame } from './common';
import { answerReflection, driveLesson, lessonStage, skipTutorial } from './lesson';
import { afterCheck, hdLesson, pointAt } from './hdLesson';
import { man1Acts, man2Acts, walkTutorial } from './tutorial';

interface Man1Probe {
  station: 'de' | 'tb' | 'kho';
  tutorialOpen: boolean;
  expected: number | null;
  reflection?: boolean;
  timeUp?: boolean;
  /** Trạm Khó: số trang mạng đã đi trước phần sổ đúng (khoảng cách) */
  remaining?: number;
  fixed?: number;
  networkAdded?: number;
}
export const man1Probe = () => getProbe<Man1Probe>('man1');

/** Từ làng đi tới biển màn `level` và nhấn E để vào màn (nếu chưa ở trang màn). */
export async function enterLevelFromVillage(ctx: Ctx, village: 'lang-giay', level: number, opts: WalkOpts & { before?: () => Promise<void> } = {}): Promise<void> {
  const path = `/lang/${village}/man/${level}`;
  if (onPath(path)) return;
  await waitWorldReady(ctx);
  await engageWorld(ctx);
  const board = demoWorld()?.world.villages.find((v) => v.id === village)?.layout.boards.find((b) => b.level === level);
  if (!board) throw new Error(`no board for level ${level}`);
  await walkAndInteract(ctx, boardNodeId(level), (t) => t.kind === 'board' && t.level === level, { x: board.x, z: board.z }, opts);
  await ctx.ctl.waitFor(() => onPath(path), `route ${path}`, 15000);
}

/** Nhập đáp án đúng của trang đang làm rồi bấm Kiểm tra (hoặc Enter ở trạm Khó cho kịp giờ). Trả false nếu chưa có đề. */
export async function answerPage(ctx: Ctx, fast: boolean, range?: readonly [number, number], slow = false): Promise<boolean> {
  const p = man1Probe();
  if (!p || p.expected === null) return false;
  const input = q<HTMLInputElement>('[data-tutorial="code-input"] input');
  if (!input) return false;
  // video hướng dẫn (trạm Dễ, Trung bình): chỉ vào công thức, gõ chậm, dừng đọc phản hồi
  const hd = slow ? hdLesson() : null;
  if (hd) {
    await pointAt(ctx, [q('[data-tutorial="formula-box"]')]);
    range = hd.typeMs;
  }
  await typeInto(ctx, input, String(p.expected), { noClick: fast, range });
  if (fast) {
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code: 'Enter', key: 'Enter' }));
    await ctx.ctl.sleep(500);
  } else {
    const check = q<HTMLButtonElement>('[data-tutorial="check-button"] button');
    if (check) await clickEl(ctx, check, { settle: 900 });
  }
  if (hd) await afterCheck(ctx);
  hdTurn();
  return true;
}

async function playMan1Station(ctx: Ctx, idx: number): Promise<void> {
  const { ctl } = ctx;
  const name = (['de', 'tb', 'kho'] as const)[idx];
  await ctl.waitFor(() => man1Probe()?.station === name, `man 1 probe ${name}`, 15000);
  if (man1Probe()?.tutorialOpen) {
    // video hướng dẫn: làm thử trọn bộ ở trạm Dễ; hai trạm sau bỏ qua nhanh
    if (DEMO_HD && idx === 0) await walkTutorial(ctx, man1Acts);
    else await skipTutorial(ctx);
  }
  await ctl.sleep(pace(1200));
  if (idx === 0) {
    // trạm Dễ: 5 trang, mỗi trang một đáp án
    while (lessonStage() === 'play') {
      if (!(await answerPage(ctx, false, undefined, true))) await ctl.sleep(250);
    }
    return;
  }
  if (idx === 1) {
    // trạm Trung bình: chờ kẻ gian sửa trộm rồi sửa dây chuyền các trang lệch
    await ctl.sleep(pace(1500));
    while (!man1Probe()?.reflection) {
      if (!(await answerPage(ctx, false, undefined, true))) await ctl.sleep(300);
    }
    // nhịp video: bỏ câu suy ngẫm (nút xong trạm không phụ thuộc vào nó)
    if (!PACING) await answerReflection(ctx);
    const done = await ctl.waitFor(() => buttonByText(bai1Texts.tb.xongTram), 'station finish button', 5000);
    await clickEl(ctx, done, { settle: 600 });
    return;
  }
  if (PACING) {
    await raceAndLose(ctx);
  } else {
    // trạm Khó: cuộc đua 60 giây, sửa liên tục tới khi hết giờ
    while (!man1Probe()?.timeUp) {
      if (!(await answerPage(ctx, true))) await ctx.ctl.sleep(200);
    }
  }
  // nhịp video: bỏ câu suy ngẫm (nút xong trạm không phụ thuộc vào nó)
    if (!PACING) await answerReflection(ctx);
  const done = await ctl.waitFor(() => buttonByText(bai1Texts.kho.xongTram), 'station finish button', 5000);
  await clickEl(ctx, done, { settle: 600 });
}

/**
 * Nhịp video, trạm Khó: bot cố tình sửa chậm (nghỉ giữa hai lần sửa, gõ chậm, bấm nút) trong khi mạng sinh trang nhanh, để lúc hết giờ chuỗi của làng dài hơn chuỗi của bot 10 đến 20 trang.
 * Bot không sửa khi khoảng cách đã xuống sát mức thấp nhất. Hết giờ thì ghi khoảng cách vào `window.__demoStats` và dừng trên khung tổng kết để người xem thấy.
 */
async function raceAndLose(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const L = PACING!.lesson1;
  while (!man1Probe()?.timeUp) {
    const p = man1Probe();
    if (!p || p.expected === null || ((p.fixed ?? 0) >= L.hardMinFixed && (p.remaining ?? 0) <= L.gapMin + 3)) {
      await ctl.sleep(150);
      continue;
    }
    await ctl.sleep(L.botPauseMs);
    if (man1Probe()?.timeUp) break;
    await answerPage(ctx, false, L.botTypeMs);
  }
  const end = man1Probe();
  const stats = { gap: end?.remaining ?? -1, fixed: end?.fixed ?? 0, networkAdded: end?.networkAdded ?? 0 };
  (window as unknown as { __demoStats?: Record<string, unknown> }).__demoStats = { ...((window as unknown as { __demoStats?: Record<string, unknown> }).__demoStats ?? {}), man1Hard: stats };
  console.info(`[demo] man-1 hard gap ${JSON.stringify(stats)}`);
  await ctl.sleep(L.gapHoldMs);
}

export async function giayMan1(ctx: Ctx): Promise<void> {
  await enterLevelFromVillage(ctx, 'lang-giay', 1);
  await ctx.ctl.waitFor(() => lessonStage(), 'lesson page', 30000);
  await driveLesson(ctx, {
    playStation: async (c, i) => {
      hdStationStart((['de', 'tb', 'kho'] as const)[i]);
      try {
        await playMan1Station(c, i);
      } finally {
        hdStationEnd();
      }
    },
  });
  await ctx.ctl.sleep(DEMO_HD ? 4000 : PACING ? 3000 : 2500);
}

interface RunnerSessionLike {
  state: { phase: string; roundTime: number; roundSec: number };
  score?: number;
  over: boolean;
  queue: { length: number };
  frameEvents: unknown[];
  command: (c: 'left' | 'right' | 'jump' | 'slide') => void;
  update: (dt: number, paused: boolean) => number;
}
interface RunnerBrain {
  decide: (s: never) => { move?: number; jump?: boolean; slide?: boolean };
}
interface Man2Probe {
  session: RunnerSessionLike;
  makeBrain: () => Promise<RunnerBrain>;
  tutorialActive: boolean;
  correctIndex: number | null;
}
export const man2Probe = () => getProbe<Man2Probe>('man2');

/** Bước mô phỏng cố định của ván chạy (giây); cùng giá trị với `FIXED_STEP` của runnerCommands */
const RUNNER_STEP = 1 / 60;

/**
 * Bot lái ván chạy: bộ não bot giỏi quyết định MỖI bước mô phỏng (1/60 giây) rồi gửi lệnh như phím (trái/phải/nhảy/trượt) vào hàng đợi lệnh của ván. Quyết định theo từng bước chứ không theo từng khung hình
 * vẽ, để máy vẽ chậm cũng không nhảy trễ. Phím P tạm dừng cả ván. Luật và vật lý của ván không đổi.
 */
export function installRunnerAutopilot(ctx: Ctx, session: RunnerSessionLike, brain: RunnerBrain): void {
  const original = session.update.bind(session);
  const events: unknown[] = [];
  session.update = (dt, paused) => {
    if (paused || ctx.ctl.paused) return original(dt, true);
    events.length = 0;
    let ran = 0;
    let left = dt;
    while (left > 1e-9) {
      const chunk = Math.min(RUNNER_STEP, left);
      left -= chunk;
      const st = session.state;
      // chỉ quyết định khi hàng đợi lệnh trống: một bước có thể chưa chạy (làm tròn thời gian) và lệnh cũ còn chờ, không để lệnh dồn lại
      if (session.queue.length === 0 && (st.phase === 'run' || st.phase === 'slow' || st.phase === 'resume')) {
        const i = brain.decide(st as never);
        if (i.move) session.command(i.move > 0 ? 'left' : 'right');
        if (i.jump) session.command('jump');
        if (i.slide) session.command('slide');
      }
      ran += original(chunk, false);
      for (const e of session.frameEvents) events.push(e);
      if (session.over) break;
    }
    session.frameEvents.length = 0;
    for (const e of events) session.frameEvents.push(e);
    return ran;
  };
}

/** Câu hỏi giữa vòng: đọc, chọn đáp án đúng, đọc giải thích, bấm Chạy tiếp. */
export async function answerRunnerQuiz(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const panel = await ctl.waitFor(() => q('[data-testid="cau-hoi"]'), 'runner quiz panel', 8000);
  const opts = await ctl.waitFor(() => {
    const b = [...panel.querySelectorAll<HTMLButtonElement>('ul button')];
    return b.length > 0 && man2Probe()?.correctIndex != null ? b : null;
  }, 'quiz options', 8000);
  await dwell(ctx, panel.querySelector('h2')?.textContent ?? '');
  await ctl.sleep(pace(800));
  const idx = man2Probe()?.correctIndex ?? 0;
  await clickEl(ctx, opts[idx], { settle: 500 });
  await dwell(ctx, q('[data-testid="quiz-giai-thich"]')?.textContent ?? '');
  const next = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="quiz-tiep"] button'), 'quiz continue', 6000);
  await clickEl(ctx, next, { settle: 500 });
}

export async function giayMan2(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const path = '/lang/lang-giay/man/2';
  if (!onPath(path)) {
    const extra = q<HTMLButtonElement>('[data-demo="complete-extra"]');
    if (extra) await clickEl(ctx, extra, { settle: 600 });
    else await enterLevelFromVillage(ctx, 'lang-giay', 2);
    await ctl.waitFor(() => onPath(path), `route ${path}`, 20000);
  }
  await startMiniGame(ctx);
  const probe = await ctl.waitFor(() => man2Probe(), 'runner probe', 60000);
  // hướng dẫn làm thử (nếu có): xem nhanh rồi Bỏ qua
  if (probe.tutorialActive) {
    if (DEMO_HD) {
      await walkTutorial(ctx, man2Acts);
    } else {
      const tut = await ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'runner tutorial', 60000);
      await ctl.sleep(pace(2500));
      await clickEl(ctx, tut, { settle: 800 });
    }
  }
  const brain = await probe.makeBrain();
  installRunnerAutopilot(ctx, probe.session, brain);
  await ctl.sleep(800);
  while (!q('[data-testid="diem"]')) {
    await nextFrame(ctx);
    const s = man2Probe()?.session.state;
    // video hướng dẫn: chơi thường tới 30% vòng đầu rồi tua nhanh (câu hỏi giữ tốc độ thường)
    if (DEMO_HD && s?.phase === 'run' && s.roundTime >= 0.3 * s.roundSec) startFastForward();
    if (s?.phase === 'quiz') await answerRunnerQuiz(ctx);
  }
  stopFastForward();
  console.info(`[demo] man-2 end ${JSON.stringify({ ...probe.session.state, rows: undefined, items: undefined, score: probe.session.score })}`.slice(0, 600));
  await finishMiniGame(ctx, DEMO_MEN ? null : '/lang/lang-giay/man/3');
}

interface Man3Probe {
  phase: string;
  tutorialActive: boolean;
  fakeId: () => string | null;
  rightId: () => string | null;
}
export const man3Probe = () => getProbe<Man3Probe>('man3');
export const cardEl = (id: string) => q(`[data-card-id="${id}"]`);

export async function giayMan3(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  const path = '/lang/lang-giay/man/3';
  if (!onPath(path)) {
    const next = q<HTMLButtonElement>('[data-testid="choi-tiep"]');
    if (next) await clickEl(ctx, next, { settle: 600 });
    else await enterLevelFromVillage(ctx, 'lang-giay', 3);
    await ctl.waitFor(() => onPath(path), `route ${path}`, 20000);
  }
  await startMiniGame(ctx);
  await ctl.waitFor(() => man3Probe(), 'man 3 probe', 60000);
  if (man3Probe()?.tutorialActive) {
    const tut = await ctl.waitFor(() => buttonByText(tutorialTexts.chung.boQua), 'man 3 tutorial', 60000);
    await ctl.sleep(2500);
    await clickEl(ctx, tut, { settle: 800 });
  }
  await ctl.waitFor(() => man3Probe()?.phase === 'play', 'play phase', 30000);
  await ctl.sleep(1500);
  // soi công thức một lần cho người xem thấy: bật Soi, chạm một thẻ ở khay, đọc kết quả, tắt Soi
  const soi = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="nut-soi"]'), 'inspect button', 5000);
  await clickEl(ctx, soi, { settle: 500 });
  const first = await ctl.waitFor(() => q('[data-testid="the-khay"]'), 'tray card', 5000);
  await clickEl(ctx, first, { settle: 600 });
  const line = await ctl.waitFor(() => q('[data-testid="soi-ket-qua"]'), 'inspect result', 5000);
  await dwell(ctx, line.textContent ?? '');
  await ctl.sleep(1500);
  await clickEl(ctx, soi, { settle: 500 });
  // ghép: thẻ giả (công thức không khớp) bỏ vào rổ, thẻ đúng mã trước ghép vào chuỗi
  while (q('[data-testid="man3"]')) {
    await ctl.checkpoint();
    const p = man3Probe();
    if (!p) {
      await ctl.sleep(200);
      continue;
    }
    if (p.phase === 'roundDone') {
      const go = await ctl.waitFor(() => q<HTMLButtonElement>('[data-testid="nut-tiep"]'), 'round banner button', 8000).catch(() => null);
      if (go) {
        await ctl.sleep(1800);
        await clickEl(ctx, go, { settle: 800 });
      }
      continue;
    }
    if (p.phase !== 'play') {
      await ctl.sleep(250);
      continue;
    }
    const fake = p.fakeId();
    const id = fake ?? p.rightId();
    const card = id ? cardEl(id) : null;
    const target = q(fake ? '[data-drop="basket"]' : '[data-drop="chain"]');
    if (!card || !target) {
      await ctl.sleep(250);
      continue;
    }
    await dragEl(ctx, card, target);
    await ctl.sleep(500);
  }
  await finishMiniGame(ctx, null);
}

/** Về làng sau màn 3: cảnh người dẫn trao Trang Sổ Vàng thứ nhất (đợt sau nối tiếp từ đây). */
export async function giayTraoTrang(ctx: Ctx): Promise<void> {
  const { ctl } = ctx;
  if (!onPath('/cho')) {
    const leave = await ctl.waitFor(() => q<HTMLButtonElement>('[data-demo="game-leave"]'), 'leave button', 8000);
    await clickEl(ctx, leave, { settle: 800 });
    await ctl.waitFor(() => onPath('/cho'), 'back to the market page', 20000);
  }
  await waitWorldReady(ctx);
  await ctl.waitFor(() => demoWorld()?.dialogOpen, 'golden page ceremony', 40000);
  await playVnDialogs(ctx);
  await ctl.sleep(3000);
}
