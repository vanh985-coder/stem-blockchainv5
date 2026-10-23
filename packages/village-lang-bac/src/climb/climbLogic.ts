/**
 * Logic màn 12 "Leo cây tìm lá giả" (spec 08, mục "Màn 12"). Hàm thuần (không React, không Three); ngẫu nhiên chỉ qua `rng` (createMulberry32) nên cùng seed cùng kết quả.
 * Giá trị các nút dựng bằng `buildTree` của Bài 4 (công thức `combine`: T_ab = T_a × 10 + T_b), không viết lại công thức.
 *
 * Cách gọi tầng khi leo: tầng 0 là gốc (người chơi bắt đầu ở đây), tầng k gồm 2^k nút, tầng `depth` là các lá. Nút i ở tầng k có hai con 2i (trái) và 2i + 1 (phải) ở tầng k + 1.
 */
import { buildTree } from '@so-chung/core/lessons/bai-4/logic';
import { medalOf, type Medal } from '@so-chung/core';
import { createMulberry32, randInt } from '@so-chung/core/lib/rng';
import { CLIMB_SPEC, type ClimbRoundSpec } from './climbConfig';

// ---------------------------------------------------------------------------
// Cây: số trong sổ / số hiện tại

export interface ClimbTree {
  /** Số tầng trên lá (số lá = 2^depth) */
  depth: number;
  /** Lá gốc (trong sổ) và lá sau khi {phanDien} tráo (hiện tại): chữ số 1–9 */
  leaves: number[];
  tamperedLeaves: number[];
  /** Vị trí lá bị tráo */
  tamperedIndex: number;
  /** Giá trị theo tầng leo: `book[k][i]`, `now[k][i]` là nút i ở tầng k (k = 0 là gốc) */
  book: number[][];
  now: number[][];
  /** Mã rút gọn 4 chữ số theo tầng leo (vòng 3–4); null ở vòng hiện giá trị thật */
  bookCode: string[][] | null;
  nowCode: string[][] | null;
}

/** Đổi kết quả `buildTree` (tầng lá trước, gốc sau) sang thứ tự tầng leo (gốc trước, lá sau). */
function byClimbLevel(leaves: readonly number[]): number[][] {
  return buildTree(leaves).reverse();
}

/** Mã trong sổ: 4 chữ số cuối của giá trị trong sổ, đệm 0 bên trái. */
export function shortCode(value: number, digits: number = CLIMB_SPEC.codeDigits): string {
  const mod = 10 ** digits;
  return String(((value % mod) + mod) % mod).padStart(digits, '0');
}

/**
 * Biến mã của nút lệch: hoặc đổi một chữ số sang chữ số khác, hoặc đảo hai chữ số liền nhau KHÁC nhau (mã không có cặp liền nhau khác nhau, ví dụ "0000", thì đổi một chữ số).
 * Luôn khác mã trong sổ, khác 1 hoặc 2 chữ số. Không lấy từ chữ số cuối của giá trị hiện tại: lá bị sửa ở sâu thì độ lệch bị nhân 10^k nên 4 chữ số cuối có thể trùng.
 */
export function mutateCode(code: string, rng: () => number): string {
  const d = code.split('');
  const swaps: number[] = [];
  for (let i = 0; i + 1 < d.length; i++) if (d[i] !== d[i + 1]) swaps.push(i);
  if (swaps.length > 0 && rng() < 0.5) {
    const i = swaps[Math.floor(rng() * swaps.length)];
    [d[i], d[i + 1]] = [d[i + 1], d[i]];
    return d.join('');
  }
  const pos = Math.floor(rng() * d.length);
  const others = '0123456789'.split('').filter((c) => c !== d[pos]);
  d[pos] = others[Math.floor(rng() * others.length)];
  return d.join('');
}

/**
 * Dựng cây từ lá cho trước, đổi lá `tamperedIndex` thành `newDigit`. `codes` kèm `rng` thì sinh mã rút gọn: nút khớp có mã hiện tại = mã trong sổ, nút lệch có mã hiện tại biến từ mã trong sổ.
 */
export function makeTree(leaves: readonly number[], tamperedIndex: number, newDigit: number, codesRng: (() => number) | null = null): ClimbTree {
  const tamperedLeaves = [...leaves];
  tamperedLeaves[tamperedIndex] = newDigit;
  const book = byClimbLevel(leaves);
  const now = byClimbLevel(tamperedLeaves);
  let bookCode: string[][] | null = null;
  let nowCode: string[][] | null = null;
  if (codesRng) {
    bookCode = book.map((level) => level.map((v) => shortCode(v)));
    nowCode = bookCode.map((level, k) => level.map((c, i) => (book[k][i] === now[k][i] ? c : mutateCode(c, codesRng))));
  }
  return { depth: book.length - 1, leaves: [...leaves], tamperedLeaves, tamperedIndex, book, now, bookCode, nowCode };
}

/** Sinh cây của một vòng: lá là chữ số 1–9; chọn đúng 1 lá bị tráo, đổi sang chữ số 1–9 khác. */
export function generateTree(rng: () => number, round: ClimbRoundSpec): ClimbTree {
  const leaves = Array.from({ length: round.leaves }, () => randInt(1, 9, rng));
  const tamperedIndex = randInt(0, round.leaves - 1, rng);
  let newDigit = randInt(1, 8, rng);
  if (newDigit >= leaves[tamperedIndex]) newDigit++; // chữ số 1–9 khác chữ số cũ
  return makeTree(leaves, tamperedIndex, newDigit, round.codes ? rng : null);
}

/** Nút i ở tầng k có lệch không (số hiện tại khác số trong sổ). */
export const isMismatch = (tree: ClimbTree, level: number, index: number): boolean => tree.book[level][index] !== tree.now[level][index];

/** Hai số ghi trên tay nắm của nút (trong sổ / hiện tại): giá trị thật hay mã rút gọn. */
export function nodeLabel(tree: ClimbTree, level: number, index: number): { book: string; now: string } {
  if (tree.bookCode && tree.nowCode) return { book: tree.bookCode[level][index], now: tree.nowCode[level][index] };
  return { book: String(tree.book[level][index]), now: String(tree.now[level][index]) };
}

// ---------------------------------------------------------------------------
// Cặp tay nắm trượt

/** Chu kỳ của sóng tam giác c(t) (giây): đi hết 4 × sway với tốc độ `speed`. */
export const swayPeriod = (speed: number): number => (4 * CLIMB_SPEC.sway) / speed;

/** Tâm cặp tay nắm: sóng tam giác trong [−sway; sway], |dc/dt| = speed; `phase` (0 đến 4 × sway) là quãng đã đi lúc t = 0. */
export function handleCenter(t: number, speed: number, phase: number): number {
  const A = CLIMB_SPEC.sway;
  const span = 4 * A;
  const u = (((t * speed + phase) % span) + span) % span;
  return u < 2 * A ? -A + u : 3 * A - u;
}

/** Tay nắm nắm được khi người chơi (ở x = 0) với tới: 'left' (con 2i), 'right' (con 2i + 1) hay null. */
export function grabAt(center: number, reach: number): 'left' | 'right' | null {
  if (Math.abs(center - CLIMB_SPEC.halfGap) <= reach) return 'left';
  if (Math.abs(center + CLIMB_SPEC.halfGap) <= reach) return 'right';
  return null;
}

/** Độ dài cửa sổ nắm được một tay nắm trong mỗi chu kỳ (giây): tay trái nắm được khi c ở [halfGap − reach; sway], đi lên rồi đi xuống. */
export const grabWindow = (round: ClimbRoundSpec): number => (2 * Math.min(round.reach, CLIMB_SPEC.sway - (CLIMB_SPEC.halfGap - round.reach))) / round.speed;

// ---------------------------------------------------------------------------
// Ván chơi

export type ClimbPhase = 'playing' | 'roundDone' | 'won' | 'lost';

export interface ClimbState {
  seed: number;
  rng: () => number;
  /** Vòng hiện tại 0 đến 3 */
  round: number;
  tree: ClimbTree;
  /** Tầng người chơi đang giữ (0 = gốc) và chỉ số nút ở tầng đó */
  level: number;
  index: number;
  /** Pha của cặp tay nắm từng tầng (tầng k = cặp tay nắm là con của nút tầng k − 1), k từ 1 tới depth */
  phases: number[];
  /** Đồng hồ của vòng (giây) */
  time: number;
  /** Đang bật lên: thời điểm tới đỉnh; null nếu đang treo */
  peakAt: number | null;
  /** Không bật được trước thời điểm này */
  lockUntil: number;
  /** Giờ (đồng hồ của vòng) lúc lên tầng đang giữ: 0 ở gốc; dùng cho câu nhắc của nút "?" */
  arrivedAt: number;
  /** Chưa trượt hay ngõ cụt lần nào ở tầng đang giữ: leo qua được thì nhặt tiền đồng của khoảng đó */
  cleanTry: boolean;
  hearts: number;
  coins: number;
  roundsDone: number;
  phase: ClimbPhase;
}

export type ClimbEvent =
  /** Lên tầng trên; `coins` là số đồng nhặt được ở khoảng vừa leo qua, `lostCoins` là số đồng mất (đã trượt hay ngõ cụt ở tầng dưới) */
  | { kind: 'up'; level: number; index: number; coins: number; lostCoins: number }
  | { kind: 'deadEnd'; level: number; index: number; hearts: number }
  | { kind: 'miss' }
  | { kind: 'roundDone'; round: number }
  | { kind: 'won' }
  | { kind: 'lost' };

function newPhases(rng: () => number, depth: number): number[] {
  const out = [0];
  for (let k = 1; k <= depth; k++) out.push(rng() * 4 * CLIMB_SPEC.sway);
  return out;
}

/** Khởi tạo ván mới từ seed: vòng 1, đứng ở gốc, đủ tim. */
export function createClimbGame(seed: number): ClimbState {
  const rng = createMulberry32(seed);
  const tree = generateTree(rng, CLIMB_SPEC.rounds[0]);
  return {
    seed,
    rng,
    round: 0,
    tree,
    level: 0,
    index: 0,
    phases: newPhases(rng, tree.depth),
    time: 0,
    peakAt: null,
    lockUntil: 0,
    arrivedAt: 0,
    cleanTry: true,
    hearts: CLIMB_SPEC.hearts,
    coins: 0,
    roundsDone: 0,
    phase: 'playing',
  };
}

export const roundSpec = (s: Pick<ClimbState, 'round'>): ClimbRoundSpec => CLIMB_SPEC.rounds[s.round];

/** Tâm cặp tay nắm của tầng ngay trên người chơi lúc t. */
export function nextCenter(s: ClimbState, t: number = s.time): number {
  return handleCenter(t, roundSpec(s).speed, s.phases[s.level + 1] ?? 0);
}

/** Bật lên (chạm, bấm chuột, Space). Bỏ qua khi đang bay, đang bị khóa hay không còn chơi. Trả về có bật hay không. */
export function jump(s: ClimbState): boolean {
  if (s.phase !== 'playing' || s.peakAt !== null || s.time < s.lockUntil || s.level >= s.tree.depth) return false;
  s.peakAt = s.time + CLIMB_SPEC.jumpPeak;
  return true;
}

/** Xét cú bật ở đúng thời điểm đỉnh (không phụ thuộc bước dt). */
function resolvePeak(s: ClimbState, at: number, out: ClimbEvent[]): void {
  s.peakAt = null;
  const side = grabAt(nextCenter(s, at), roundSpec(s).reach);
  if (!side) {
    s.cleanTry = false;
    s.lockUntil = at + CLIMB_SPEC.lockAfterFail;
    out.push({ kind: 'miss' });
    return;
  }
  const level = s.level + 1;
  const index = 2 * s.index + (side === 'left' ? 0 : 1);
  if (!isMismatch(s.tree, level, index)) {
    // ngõ cụt: ở lại tầng cũ, mất 1 tim
    s.cleanTry = false;
    s.hearts = Math.max(0, s.hearts - 1);
    s.lockUntil = at + CLIMB_SPEC.lockAfterFail;
    out.push({ kind: 'deadEnd', level, index, hearts: s.hearts });
    if (s.hearts === 0) {
      s.phase = 'lost';
      out.push({ kind: 'lost' });
    }
    return;
  }
  s.level = level;
  s.index = index;
  s.arrivedAt = at;
  const coins = s.cleanTry ? CLIMB_SPEC.coinsPerGap : 0;
  addCoins(s, coins);
  s.cleanTry = true;
  out.push({ kind: 'up', level, index, coins, lostCoins: CLIMB_SPEC.coinsPerGap - coins });
  if (level === s.tree.depth) {
    // nắm được lá lệch: bắt được {phanDien}
    s.roundsDone++;
    out.push({ kind: 'roundDone', round: s.round });
    if (s.round >= CLIMB_SPEC.rounds.length - 1) {
      s.phase = 'won';
      out.push({ kind: 'won' });
    } else s.phase = 'roundDone';
  }
}

/** Bước thời gian `dt` giây: tay nắm trượt theo đồng hồ; tới đỉnh cú bật thì xét nắm. */
export function stepClimb(s: ClimbState, dt: number): ClimbEvent[] {
  const out: ClimbEvent[] = [];
  if (s.phase !== 'playing' || !(dt > 0)) return out;
  const end = s.time + dt;
  if (s.peakAt !== null && s.peakAt <= end) resolvePeak(s, s.peakAt, out);
  s.time = end;
  return out;
}

/**
 * Bước thời gian khi có thể đang tạm dừng (nút "?", tab ẩn, bảng báo): `paused` thì KHÔNG có gì đổi (tay nắm đứng yên, đồng hồ của vòng đứng yên, cú bật đang bay giữ nguyên) và không có sự kiện.
 */
export function tickClimb(s: ClimbState, dt: number, paused: boolean): ClimbEvent[] {
  return paused ? [] : stepClimb(s, dt);
}

/** Sang vòng kế tiếp sau khi xong vòng: cây mới, về gốc, đồng hồ về 0 (tim và tiền đồng giữ nguyên). */
export function advanceRound(s: ClimbState): boolean {
  if (s.phase !== 'roundDone') return false;
  s.round++;
  s.tree = generateTree(s.rng, roundSpec(s));
  s.phases = newPhases(s.rng, s.tree.depth);
  s.level = 0;
  s.index = 0;
  s.time = 0;
  s.arrivedAt = 0;
  s.peakAt = null;
  s.lockUntil = 0;
  s.cleanTry = true;
  s.phase = 'playing';
  return true;
}

/** Cộng tiền đồng nhặt được (luật nhặt: xem `coinsPerGap`; hình đồng treo trên thân cây ở cảnh). */
export function addCoins(s: ClimbState, n = 1): void {
  if (n > 0) s.coins += n;
}

/** Điểm = số vòng xong × 100 + số tiền đồng + số tim còn × 50. */
export function climbScore(s: Pick<ClimbState, 'roundsDone' | 'coins' | 'hearts'>): number {
  const p = CLIMB_SPEC.points;
  return s.roundsDone * p.perRound + s.coins * p.perCoin + s.hearts * p.perHeart;
}

export function climbMedal(score: number): Medal {
  return medalOf(score, CLIMB_SPEC.medals);
}
