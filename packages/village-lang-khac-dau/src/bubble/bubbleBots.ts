/**
 * Bot cân bằng màn 9 (chỉ dùng trong test, không vào bản build): chơi bằng đúng thao tác của học sinh: chọn trứng ở khay nạp, bấm "Bắt đầu đợt", chọn loại trứng ở máy bắn rồi chọn góc bắn.
 * Bot không biết trước kết quả của lần rút số ngẫu nhiên sau; nó thử nhiều góc trên bàn hiện tại (như em ngắm bằng vạch ngắm) và chọn phát cho nhiều điểm nhất.
 */
import { createMulberry32 } from '@so-chung/core/lib/rng';
import {
  anchoredSet,
  bubbleScore,
  clampAngle,
  createBubbleGame,
  groupAt,
  loadComplete,
  neighbors,
  pickTrayEgg,
  planOf,
  presentValues,
  selectType,
  shootAndLand,
  snapCell,
  startRound,
  tracePath,
  type BubbleState,
} from './bubbleLogic';

export interface BubbleBot {
  name: string;
  /** Xác suất chọn nhầm một trứng nhiễu trước khi chọn đúng, mỗi đợt nạp */
  loadMistake: number;
  /** Bước quét góc (độ) khi dò phát bắn */
  angleStep: number;
  /** Độ lệch chuẩn của góc bắn (độ): tay không chính xác */
  noise: number;
  /** Xác suất một phát bắn không ngắm kỹ (góc và loại trứng ngẫu nhiên) */
  sloppy: number;
  /** Xác suất chọn loại trứng ngẫu nhiên (không theo kết quả dò) */
  wrongType: number;
}

export const GOOD_BOT: BubbleBot = { name: 'good', loadMistake: 0.1, angleStep: 2, noise: 0.4, sloppy: 0.02, wrongType: 0 };
export const AVERAGE_BOT: BubbleBot = { name: 'average', loadMistake: 0.5, angleStep: 4, noise: 2, sloppy: 0.2, wrongType: 0.12 };
export const WEAK_BOT: BubbleBot = { name: 'weak', loadMistake: 0.7, angleStep: 5, noise: 3, sloppy: 0.35, wrongType: 0.2 };

/** Kết quả tạm của một phát: số trứng vỡ, số trứng rơi, ô dính, và số ô kề cùng số (khi không vỡ) */
function evaluate(s: BubbleState, value: number, cell: { r: number; c: number }): { pop: number; drop: number; same: number } {
  while (s.board.length <= cell.r) s.board.push(new Array(0));
  const row = s.board[cell.r];
  const w = row.length === 0 ? ((cell.r + s.shift) % 2 === 0 ? 10 : 9) : row.length;
  if (row.length === 0) {
    for (let i = 0; i < w; i++) row.push(null);
  }
  row[cell.c] = value;
  const same = neighbors(s.shift, cell.r, cell.c).filter((n) => s.board[n.r]?.[n.c] === value).length;
  const group = groupAt(s, cell.r, cell.c);
  let pop = 0;
  let drop = 0;
  if (group.length >= s.spec.minGroup) {
    pop = group.length;
    const saved = group.map((g) => ({ g, v: s.board[g.r][g.c] }));
    for (const g of group) s.board[g.r][g.c] = null;
    const anchored = anchoredSet(s);
    for (let r = 0; r < s.board.length; r++) for (let c = 0; c < s.board[r].length; c++) if (s.board[r][c] !== null && !anchored.has(r * 32 + c)) drop++;
    for (const x of saved) s.board[x.g.r][x.g.c] = x.v;
  }
  row[cell.c] = null;
  while (s.board.length > 0 && s.board[s.board.length - 1].every((v) => v === null)) s.board.pop();
  return { pop, drop, same };
}

/** Chọn phát bắn tốt nhất: trả loại trứng (chỉ số) và góc */
function bestShot(s: BubbleState, bot: BubbleBot): { type: number; angle: number } {
  const values = planOf(s).values;
  const present = presentValues(s);
  const types = values.map((v, i) => (present.has(v) ? i : -1)).filter((i) => i >= 0);
  let best = { type: types[0], angle: 90, score: -Infinity };
  for (let a = 12; a <= 168; a += bot.angleStep) {
    const path = tracePath(s, a);
    const cell = snapCell(s, path[path.length - 1]);
    for (const t of types) {
      const e = evaluate(s, values[t], cell);
      const score = e.pop * 10 + e.drop * 20 + (e.pop === 0 ? e.same * 2 - cell.r * 0.05 : 0);
      if (score > best.score) best = { type: t, angle: a, score };
    }
  }
  return { type: best.type, angle: best.angle };
}

const gauss = (rng: () => number): number => Math.sqrt(-2 * Math.log(Math.max(1e-9, rng()))) * Math.cos(2 * Math.PI * rng());

export interface BubbleRun {
  state: BubbleState;
  score: number;
  /** Điểm và số tim lúc kết thúc */
  hearts: number;
}

/** Chơi trọn một ván bằng bot; `seed` quyết định ván, bot dùng dòng số riêng nên không đổi ván */
export function simulateBubble(seed: number, bot: BubbleBot): BubbleRun {
  const s = createBubbleGame(seed);
  const rng = createMulberry32((seed * 7919 + 13) >>> 0);
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 3000) {
    if (s.phase === 'load') {
      const plan = planOf(s);
      if (rng() < bot.loadMistake) {
        const bad = plan.tray.find((e) => e.kind !== 'dung');
        if (bad) pickTrayEgg(s, bad.id);
      }
      for (const e of plan.tray) if (e.kind === 'dung') pickTrayEgg(s, e.id);
      if (!loadComplete(s) || !startRound(s)) throw new Error('bot could not load');
      continue;
    }
    const values = planOf(s).values;
    const present = [...presentValues(s)];
    let type: number;
    let angle: number;
    if (rng() < bot.sloppy) {
      type = values.indexOf(present[Math.floor(rng() * present.length)]);
      angle = 12 + rng() * 156;
    } else {
      const b = bestShot(s, bot);
      type = b.type;
      angle = b.angle;
      if (rng() < bot.wrongType) type = values.indexOf(present[Math.floor(rng() * present.length)]);
    }
    selectType(s, type);
    shootAndLand(s, clampAngle(angle + gauss(rng) * bot.noise));
  }
  return { state: s, score: bubbleScore(s), hearts: s.hearts };
}
