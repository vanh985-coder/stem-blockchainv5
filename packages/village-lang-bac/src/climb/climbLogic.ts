/**
 * Logic màn 12 "Leo bậc gỗ" (spec 08, mục "Màn 12"). Hàm thuần (không React, không Three); ngẫu nhiên chỉ qua `rng` (createMulberry32) nên cùng seed cùng kết quả.
 * Giá trị các nút dựng bằng `buildTree` và `combine` của Bài 4 (combine(a, b) = a × 10 + b), không viết lại công thức.
 *
 * Tầng gọi theo chiều leo: tầng 0 là hàng lá, tầng `depth` là gốc (đúng thứ tự của `buildTree`). Nút i ở tầng k có cha là nút i >> 1 ở tầng k + 1; i chẵn là con trái.
 * Em đứng ở bậc của lá bị tráo (tầng 0). Ở mỗi tầng, bên cạnh em là bậc anh em đã biết giá trị; phía trên là các bậc lựa chọn, đúng một bậc ghi combine(trái, phải) đúng thứ tự.
 *
 * Vật lý: một người chơi (x, y là chân), đi ngang, nhảy, rơi. Bậc là mặt phẳng một chiều: chỉ đáp xuống khi đang rơi và chân đi qua độ cao của bậc; phần giao theo trục x của thân
 * với bậc từ `minOverlap` trở lên mới đứng được. Mỗi bước dt chia nhỏ tối đa `SUBSTEP` giây nên kết quả không phụ thuộc dt của màn hình.
 */
import { buildTree, combine } from '@so-chung/core/lessons/bai-4/logic';
import { medalOf, type Medal } from '@so-chung/core';
import { createMulberry32, randInt, shuffle } from '@so-chung/core/lib/rng';
import { CLIMB_SPEC, type ClimbRoundSpec } from './climbConfig';

const SUBSTEP = 1 / 120;
const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Cây

export interface ClimbTree {
  /** Số tầng trên hàng lá (số lá = 2^depth) */
  depth: number;
  /** Lá gốc (trong sổ) và lá sau khi {phanDien} tráo (hiện tại): chữ số 1–9 */
  leaves: number[];
  tamperedLeaves: number[];
  tamperedIndex: number;
  /** Giá trị theo tầng, tầng 0 là lá: `book[k][i]` trong sổ, `now[k][i]` hiện tại */
  book: number[][];
  now: number[][];
}

export function makeTree(leaves: readonly number[], tamperedIndex: number, newDigit: number): ClimbTree {
  const tamperedLeaves = [...leaves];
  tamperedLeaves[tamperedIndex] = newDigit;
  const book = buildTree(leaves);
  const now = buildTree(tamperedLeaves);
  return { depth: book.length - 1, leaves: [...leaves], tamperedLeaves, tamperedIndex, book, now };
}

/** Sinh cây của một vòng: lá là chữ số 1–9; đúng 1 lá bị tráo sang chữ số 1–9 khác. */
export function generateTree(rng: () => number, leafCount: number): ClimbTree {
  const leaves = Array.from({ length: leafCount }, () => randInt(1, 9, rng));
  const tamperedIndex = randInt(0, leafCount - 1, rng);
  let newDigit = randInt(1, 8, rng);
  if (newDigit >= leaves[tamperedIndex]) newDigit++;
  return makeTree(leaves, tamperedIndex, newDigit);
}

/** Chỉ số nút trên đường từ lá bị tráo lên gốc, ở tầng k. */
export const pathIndex = (tree: ClimbTree, k: number): number => tree.tamperedIndex >> k;
/** Nút trên đường có là con trái không (tầng k < depth). */
export const isLeftChild = (tree: ClimbTree, k: number): boolean => (pathIndex(tree, k) & 1) === 0;
export const nodeValue = (tree: ClimbTree, k: number): number => tree.now[k][pathIndex(tree, k)];
/** Giá trị bậc anh em của nút trên đường ở tầng k (tầng k < depth). Anh em nằm ngoài đường lệch nên số trong sổ và số hiện tại giống nhau. */
export const siblingValue = (tree: ClimbTree, k: number): number => tree.now[k][pathIndex(tree, k) ^ 1];

// ---------------------------------------------------------------------------
// Các bậc lựa chọn của một tầng

/** Số lệch đúng 1 chữ số so với `value` (khác `value`, không bắt đầu bằng 0), không nằm trong `taken`. */
export function digitOff(value: number, rng: () => number, taken: ReadonlySet<number>): number {
  const s = String(value);
  const cands: number[] = [];
  for (let i = 0; i < s.length; i++) {
    for (let d = 0; d <= 9; d++) {
      if (String(d) === s[i] || (i === 0 && d === 0 && s.length > 1)) continue;
      const n = Number(s.slice(0, i) + d + s.slice(i + 1));
      if (n !== value && !taken.has(n)) cands.push(n);
    }
  }
  if (cands.length > 0) return cands[Math.floor(rng() * cands.length)];
  // chỉ xảy ra khi mọi biến thể đã bị lấy: tăng dần cho tới khi khác
  let n = value + 1;
  while (taken.has(n) || n === value) n++;
  return n;
}

/**
 * Giá trị các bậc lựa chọn khi nút trái là `left`, nút phải là `right`: phần tử 0 là đáp án đúng combine(left, right); các bậc nhiễu khác nhau và khác đáp án, lấy từ:
 * đảo thứ tự combine(right, left), left + right, số đúng lệch 1 chữ số. Có 3 lựa chọn thì luôn có bậc đảo thứ tự (nếu nó khác đáp án).
 */
export function choiceValues(left: number, right: number, count: number, rng: () => number): number[] {
  const correct = combine(left, right);
  const taken = new Set<number>([correct]);
  const out = [correct];
  const swap = combine(right, left);
  const sum = left + right;
  const kinds = shuffle(['swap', 'sum', 'digit'] as const, rng);
  if (count >= 3) kinds.sort((a, b) => (a === 'swap' ? -1 : b === 'swap' ? 1 : 0));
  for (const kind of kinds) {
    if (out.length >= count) break;
    const v = kind === 'swap' ? swap : kind === 'sum' ? sum : digitOff(correct, rng, taken);
    if (taken.has(v)) continue;
    taken.add(v);
    out.push(v);
  }
  while (out.length < count) {
    const v = digitOff(correct, rng, taken);
    taken.add(v);
    out.push(v);
  }
  return out;
}

export interface ClimbTier {
  /** Giá trị hai nút con theo thứ tự trái, phải */
  left: number;
  right: number;
  /** options[0] là đáp án đúng */
  options: number[];
}

/** Các tầng của cây: tier[k] là bước từ tầng k lên tầng k + 1. */
export function buildTiers(tree: ClimbTree, count: number, rng: () => number): ClimbTier[] {
  const tiers: ClimbTier[] = [];
  for (let k = 0; k < tree.depth; k++) {
    const mine = nodeValue(tree, k);
    const sib = siblingValue(tree, k);
    const left = isLeftChild(tree, k) ? mine : sib;
    const right = isLeftChild(tree, k) ? sib : mine;
    tiers.push({ left, right, options: choiceValues(left, right, count, rng) });
  }
  return tiers;
}

// ---------------------------------------------------------------------------
// Hình học

/** Độ cao mặt bậc của tầng k. */
export const tierY = (k: number): number => k * CLIMB_SPEC.gap;

/** x của nút trên đường ở tầng k < depth: con trái đứng bên trái, con phải bên phải. */
export const nodeX = (tree: ClimbTree, k: number): number => (isLeftChild(tree, k) ? -CLIMB_SPEC.pairX : CLIMB_SPEC.pairX);
/** x của bậc anh em ở tầng k < depth (đối xứng với nút). Tầng gốc không có bậc anh em, nút đứng giữa. */
export const siblingX = (tree: ClimbTree, k: number): number => -nodeX(tree, k);
/** x của nút ở tầng k, tầng gốc ở giữa. */
export const standX = (tree: ClimbTree, k: number): number => (k >= tree.depth ? 0 : nodeX(tree, k));

/** Sóng tam giác chu kỳ 4 trong [−1; 1]. */
export const tri = (u: number): number => Math.abs((((u % 4) + 4) % 4) - 2) - 1;

export interface ClimbChoice {
  value: number;
  correct: boolean;
  /** Chỗ (0 tới count − 1) trên hàng bậc */
  slot: number;
  /** Pha trượt (0 tới 4) */
  phase: number;
  /** null: bậc còn nguyên. Số giây còn lại trước khi biến mất khi vừa bị nhảy trúng sai (đang nứt). 0: đã biến mất HẲN cho tới hết tầng này (không đáp được, không vẽ); sang tầng kế thì bậc mới tạo lại, crack null */
  crack: number | null;
}

/** x của bậc lựa chọn: x gốc của chỗ cộng độ trượt theo đồng hồ trượt của ván. */
export function choiceX(s: Pick<ClimbState, 'slideClock' | 'round' | 'choices'>, c: ClimbChoice): number {
  const spec = CLIMB_SPEC.rounds[Math.min(s.round, CLIMB_SPEC.rounds.length - 1)];
  return choiceBaseX(s.choices.length, c.slot) + slideOffset(spec.slide, s.slideClock, c.phase);
}
export const choiceBaseX = (count: number, slot: number): number => CLIMB_SPEC.choiceX[count]?.[slot] ?? 0;
export function slideOffset(speed: number, clock: number, phase: number): number {
  if (speed <= 0) return 0;
  const A = CLIMB_SPEC.slideAmplitude;
  return A * tri((clock * speed) / A + phase);
}

/** Phần giao theo trục x giữa thân (tâm px) và bậc (tâm sx). */
export function overlapX(px: number, sx: number): number {
  const a = Math.max(px - CLIMB_SPEC.playerHalf, sx - CLIMB_SPEC.stepWidth / 2);
  const b = Math.min(px + CLIMB_SPEC.playerHalf, sx + CLIMB_SPEC.stepWidth / 2);
  return b - a;
}

// ---------------------------------------------------------------------------
// Ván chơi

export type ClimbPhase = 'playing' | 'roundDone' | 'won' | 'lost';
/** free: đi, nhảy, rơi; crack: đứng trên bậc sai đang nứt; fall: bậc đã biến mất, rơi về bậc vừa đứng */
export type ClimbMode = 'free' | 'crack' | 'fall';

export interface ClimbPlayer {
  x: number;
  /** Độ cao chân */
  y: number;
  vy: number;
  grounded: boolean;
  /** Bậc đang đứng (hay vừa đứng): 0 là nút hiện tại, 1 là bậc anh em */
  on: 0 | 1;
  /** Chiều đang giữ phím: −1, 0, +1 */
  move: -1 | 0 | 1;
  /** Đang bay từ một cú nhảy mà chưa chạm bậc nào */
  airborne: boolean;
}

export interface ClimbState {
  seed: number;
  rng: () => number;
  /** Vòng hiện tại (0 tới 2) */
  round: number;
  tree: ClimbTree;
  tiers: ClimbTier[];
  /** Tầng em đang đứng (0 là hàng lá) */
  level: number;
  choices: ClimbChoice[];
  player: ClimbPlayer;
  mode: ClimbMode;
  /** Đồng hồ của vòng (giây); đứng yên khi tạm dừng */
  time: number;
  /** Đồng hồ trượt của bậc lựa chọn (chạy chậm lại khi `slow`) */
  slideClock: number;
  /** Giảm chuyển động: bậc trượt chậm lại một nửa */
  slow: boolean;
  /** Không nhảy được trước thời điểm này */
  lockUntil: number;
  /** Chờ bậc sai biến mất (giây còn lại); chỉ có nghĩa ở mode crack */
  crackLeft: number;
  /** Đã hết tim: khi rơi về xong thì thua */
  dying: boolean;
  hearts: number;
  roundsDone: number;
  /** Số lần nhảy nhầm bậc sai cả ván */
  mistakes: number;
  /** Đã lên tới gốc và gốc em tính ra khác gốc trong sổ */
  rootRevealed: boolean;
  phase: ClimbPhase;
  /** Ván làm thử: không tính điểm, không ghi tiến độ (chỉ để hướng dẫn) */
  practice: boolean;
}

export type ClimbEvent =
  | { kind: 'jump' }
  /** Nhảy trúng bậc đúng: lên tầng `level`; `fromX` là x lúc đáp (hình trượt về chỗ nút) */
  | { kind: 'up'; level: number; fromX: number }
  /** Nhảy trúng bậc sai (đứng trên bậc đang nứt), mất 1 tim */
  | { kind: 'wrong'; choice: number; hearts: number }
  /** Bậc sai biến mất, em bắt đầu rơi về bậc vừa đứng */
  | { kind: 'vanish'; choice: number }
  /** Rơi về xong, làm lại tầng: bậc sai đã biến mất hẳn tới hết tầng, các bậc còn lại GIỮ NGUYÊN chỗ và pha trượt */
  | { kind: 'retry' }
  /** Nhảy hụt, không chạm bậc nào, đáp về bậc cũ */
  | { kind: 'miss' }
  /** Rơi khỏi mép bậc (hay trượt xuống dưới bậc), về bậc cũ */
  | { kind: 'fell'; fromX: number }
  | { kind: 'roundDone'; round: number; rootBook: number; rootNow: number; mismatch: boolean }
  | { kind: 'won' }
  | { kind: 'lost' };

function layoutChoices(tier: ClimbTier, rng: () => number): ClimbChoice[] {
  const slots = shuffle(tier.options.map((_, i) => i), rng);
  return tier.options.map((value, i) => ({ value, correct: i === 0, slot: slots[i], phase: rng() * 4, crack: null }));
}

function startRound(s: ClimbState, tree: ClimbTree, spec: ClimbRoundSpec): void {
  s.tree = tree;
  s.tiers = buildTiers(tree, spec.choices, s.rng);
  s.level = 0;
  s.choices = layoutChoices(s.tiers[0], s.rng);
  s.player = { x: nodeX(tree, 0), y: tierY(0), vy: 0, grounded: true, on: 0, move: 0, airborne: false };
  s.mode = 'free';
  s.time = 0;
  s.slideClock = 0;
  s.lockUntil = 0;
  s.crackLeft = 0;
  s.dying = false;
  s.rootRevealed = false;
  s.phase = 'playing';
}

/** Khởi tạo ván mới từ seed: vòng 1, đứng ở bậc của lá bị tráo, đủ tim. `slow` là "Giảm chuyển động". */
export function createClimbGame(seed: number, slow = false): ClimbState {
  const rng = createMulberry32(seed);
  const spec = CLIMB_SPEC.rounds[0];
  const tree = generateTree(rng, spec.leaves);
  const s = { seed, rng, round: 0, slow, hearts: CLIMB_SPEC.hearts, roundsDone: 0, mistakes: 0, practice: false } as ClimbState;
  startRound(s, tree, spec);
  return s;
}

/** Cây mẫu 4 lá của phần hướng dẫn: [3, 7, 5, 2], lá thứ hai bị tráo thành 8. Dữ liệu riêng, 2 lựa chọn, bậc đứng yên. */
export function createPracticeGame(seed = 7): ClimbState {
  const rng = createMulberry32(seed);
  const s = { seed, rng, round: 0, slow: false, hearts: CLIMB_SPEC.hearts, roundsDone: 0, mistakes: 0, practice: true } as ClimbState;
  startRound(s, makeTree([3, 7, 5, 2], 1, 8), { leaves: 4, choices: 2, slide: 0 });
  return s;
}

export const roundSpec = (s: Pick<ClimbState, 'round' | 'practice'>): ClimbRoundSpec =>
  s.practice ? { leaves: 4, choices: 2, slide: 0 } : CLIMB_SPEC.rounds[s.round];

/** Bật/tắt chế độ giảm chuyển động giữa ván (bậc trượt chậm lại một nửa). */
export function setSlow(s: ClimbState, slow: boolean): void {
  s.slow = slow;
}

/** Chiều đang giữ phím (−1 trái, 0 đứng, +1 phải). */
export function setMove(s: ClimbState, dir: -1 | 0 | 1): void {
  s.player.move = dir;
}

/** Nhảy. Chỉ nhảy được khi đang đứng trên bậc, chưa bị khóa và đang chơi. Trả về có nhảy hay không. */
export function jump(s: ClimbState): boolean {
  const p = s.player;
  if (s.phase !== 'playing' || s.mode !== 'free' || !p.grounded || s.time < s.lockUntil) return false;
  p.vy = Math.sqrt(2 * CLIMB_SPEC.gravity * CLIMB_SPEC.jumpApex);
  p.grounded = false;
  p.airborne = true;
  return true;
}

/** x của bậc đang đứng (nút hay anh em) ở tầng hiện tại. */
export function standingX(s: ClimbState, on: 0 | 1 = s.player.on): number {
  return on === 0 ? standX(s.tree, s.level) : siblingX(s.tree, s.level);
}

/** Bậc có thể chạm nhau (nút, anh em) ở tầng hiện tại: tầng gốc chỉ có nút. */
function hasSibling(s: ClimbState): boolean {
  return s.level < s.tree.depth;
}

function land(s: ClimbState, out: ClimbEvent[]): void {
  const p = s.player;
  p.y = tierY(s.level);
  p.vy = 0;
  p.grounded = true;
  if (p.airborne) {
    p.airborne = false;
    s.lockUntil = s.time + CLIMB_SPEC.missLock;
    out.push({ kind: 'miss' });
  }
}

function rescue(s: ClimbState, out: ClimbEvent[]): void {
  const p = s.player;
  out.push({ kind: 'fell', fromX: p.x });
  p.x = standingX(s);
  p.y = tierY(s.level);
  p.vy = 0;
  p.grounded = true;
  p.airborne = false;
  s.lockUntil = s.time + CLIMB_SPEC.missLock;
}

/** Nhảy trúng bậc `c` (đang rơi, chân vừa qua độ cao của bậc). */
function touchChoice(s: ClimbState, ci: number, out: ClimbEvent[]): void {
  const c = s.choices[ci];
  const p = s.player;
  if (c.correct) {
    const fromX = p.x;
    s.level += 1;
    p.x = standX(s.tree, s.level);
    p.y = tierY(s.level);
    p.vy = 0;
    p.grounded = true;
    p.airborne = false;
    p.on = 0;
    out.push({ kind: 'up', level: s.level, fromX });
    if (s.level >= s.tree.depth) {
      s.choices = [];
      const rootBook = s.tree.book[s.tree.depth][0];
      const rootNow = s.tree.now[s.tree.depth][0];
      s.rootRevealed = rootBook !== rootNow;
      if (!s.practice) s.roundsDone += 1;
      out.push({ kind: 'roundDone', round: s.round, rootBook, rootNow, mismatch: s.rootRevealed });
      if (s.practice || s.round >= CLIMB_SPEC.rounds.length - 1) {
        s.phase = 'won';
        out.push({ kind: 'won' });
      } else s.phase = 'roundDone';
    } else s.choices = layoutChoices(s.tiers[s.level], s.rng);
    return;
  }
  // bậc sai: đứng trên bậc đang nứt, mất 1 tim
  c.crack = CLIMB_SPEC.crackSeconds;
  s.crackLeft = CLIMB_SPEC.crackSeconds;
  s.mode = 'crack';
  p.y = tierY(s.level + 1);
  p.vy = 0;
  p.grounded = true;
  p.airborne = false;
  p.move = 0;
  s.mistakes += 1;
  s.hearts = Math.max(0, s.hearts - 1);
  if (s.hearts === 0) s.dying = true;
  out.push({ kind: 'wrong', choice: ci, hearts: s.hearts });
}

function stepFree(s: ClimbState, h: number, out: ClimbEvent[]): void {
  const p = s.player;
  const B = CLIMB_SPEC.bounds;
  p.x = Math.max(-B, Math.min(B, p.x + p.move * CLIMB_SPEC.moveSpeed * h));
  if (p.grounded) {
    // đứng trên bậc: còn đứng vững không (bước ra khỏi mép thì rơi)
    const own = overlapX(p.x, standingX(s, p.on));
    const other = hasSibling(s) ? overlapX(p.x, standingX(s, p.on === 0 ? 1 : 0)) : -1;
    if (own < CLIMB_SPEC.minOverlap) {
      if (other >= CLIMB_SPEC.minOverlap) p.on = p.on === 0 ? 1 : 0;
      else p.grounded = false;
    }
    if (p.grounded) return;
  }
  const prevY = p.y;
  p.y += p.vy * h - 0.5 * CLIMB_SPEC.gravity * h * h;
  p.vy -= CLIMB_SPEC.gravity * h;
  if (p.vy < 0) {
    // bậc lựa chọn (tầng trên)
    const tc = tierY(s.level + 1);
    if (prevY >= tc - EPS && p.y <= tc && s.choices.length > 0) {
      let best = -1;
      let bestOverlap: number = CLIMB_SPEC.minOverlap;
      s.choices.forEach((c, i) => {
        if (c.crack !== null) return;
        const o = overlapX(p.x, choiceX(s, c));
        if (o >= bestOverlap) {
          best = i;
          bestOverlap = o;
        }
      });
      if (best >= 0) {
        touchChoice(s, best, out);
        return;
      }
    }
    // bậc của tầng đang đứng
    const tb = tierY(s.level);
    if (prevY >= tb - EPS && p.y <= tb) {
      const a = overlapX(p.x, standingX(s, 0));
      const b = hasSibling(s) ? overlapX(p.x, standingX(s, 1)) : -1;
      if (Math.max(a, b) >= CLIMB_SPEC.minOverlap) {
        p.on = a >= b ? 0 : 1;
        land(s, out);
        return;
      }
    }
    if (p.y < tb - CLIMB_SPEC.fallRescue) rescue(s, out);
  }
}

function stepCrack(s: ClimbState, h: number, out: ClimbEvent[]): void {
  s.crackLeft -= h;
  // `crack` của bậc nứt là số giây còn lại (cảnh mờ dần theo nó): giảm cùng đồng hồ nứt, về 0 thì bậc biến mất và nằm yên ở 0 tới hết tầng
  for (const c of s.choices) if (c.crack !== null) c.crack = Math.max(0, s.crackLeft);
  if (s.crackLeft > 0) return;
  const ci = s.choices.findIndex((c) => c.crack !== null);
  out.push({ kind: 'vanish', choice: ci });
  s.mode = 'fall';
  s.crackLeft = 0;
  const p = s.player;
  p.x = standingX(s);
  p.grounded = false;
  p.vy = 0;
}

function stepFall(s: ClimbState, h: number, out: ClimbEvent[]): void {
  const p = s.player;
  p.y += p.vy * h - 0.5 * CLIMB_SPEC.gravity * h * h;
  p.vy -= CLIMB_SPEC.gravity * h;
  if (p.y > tierY(s.level)) return;
  p.y = tierY(s.level);
  p.vy = 0;
  p.grounded = true;
  p.airborne = false;
  s.mode = 'free';
  if (s.dying) {
    s.phase = 'lost';
    out.push({ kind: 'lost' });
    return;
  }
  out.push({ kind: 'retry' });
}

/** Bước thời gian `dt` giây (chia nhỏ tối đa 1/120 giây). */
export function stepClimb(s: ClimbState, dt: number): ClimbEvent[] {
  const out: ClimbEvent[] = [];
  if (s.phase !== 'playing' || !(dt > 0)) return out;
  const scale = s.slow ? CLIMB_SPEC.reducedSlideScale : 1;
  let left = dt;
  while (left > EPS && s.phase === 'playing') {
    const h = Math.min(SUBSTEP, left);
    left -= h;
    s.time += h;
    s.slideClock += h * scale;
    if (s.mode === 'free') stepFree(s, h, out);
    else if (s.mode === 'crack') stepCrack(s, h, out);
    else stepFall(s, h, out);
  }
  return out;
}

/**
 * Bước thời gian khi có thể đang tạm dừng (nút "?", tab ẩn, hướng dẫn, bảng báo): `paused` thì KHÔNG có gì đổi (đồng hồ, bậc trượt, người chơi đứng yên) và không có sự kiện.
 */
export function tickClimb(s: ClimbState, dt: number, paused: boolean): ClimbEvent[] {
  return paused ? [] : stepClimb(s, dt);
}

/** Sang vòng kế tiếp sau khi xong vòng: cây mới, về bậc của lá bị tráo (tim giữ nguyên). */
export function advanceRound(s: ClimbState): boolean {
  if (s.phase !== 'roundDone') return false;
  s.round += 1;
  const spec = CLIMB_SPEC.rounds[s.round];
  startRound(s, generateTree(s.rng, spec.leaves), spec);
  return true;
}

/** Điểm = số vòng xong × 100 + số tim còn × 50 (tối đa 450). */
export function climbScore(s: Pick<ClimbState, 'roundsDone' | 'hearts'>): number {
  const p = CLIMB_SPEC.points;
  return s.roundsDone * p.perRound + s.hearts * p.perHeart;
}

export function climbMedal(score: number): Medal {
  return medalOf(score, CLIMB_SPEC.medals);
}
