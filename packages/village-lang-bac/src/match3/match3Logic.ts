/**
 * Logic màn 11 "Ghép lá cây sổ" (spec 08, mục "Màn 11"). Hàm thuần (không React, không Three); ngẫu nhiên chỉ qua `createMulberry32` nên cùng seed cùng ván. Không có thời gian: mỗi thao tác (đổi chỗ hai ô)
 * trả về DANH SÁCH SỰ KIỆN theo thứ tự để cảnh diễn hoạt đúng thứ tự (đổi, trả về, đợt nổ, tạo hoa sen / gió xoáy, lá giả biến mất, lấp ô cây, gộp cành, xong cây, rơi, thêm lá, ném lá giả, xáo bàn, hết vòng).
 *
 * Bàn là mảng hàng × cột (hàng 0 ở trên). Mỗi ô là lá thường (loại 0, 1, …), lá giả hoặc ô gió xoáy; lá thường có thể là hoa sen (giữ loại lá, vẫn ghép hàng được).
 *
 * Một "hàng" = một nhóm liền nhau từ 3 lá cùng loại thẳng hàng (ngang hoặc dọc) trở lên; hai đường cùng loại giao nhau (hình L, T, +) là MỘT nhóm, độ dài tính theo đường dài nhất. Nổ dây chuyền: mỗi đợt xét mọi hàng
 * cùng lúc, rồi xóa, rồi lá rơi, rồi thêm lá từ trên, lặp lại tới khi hết hàng.
 *
 * Hai nguồn ngẫu nhiên tách riêng: bàn đầu vòng và các ô cây của vòng rút từ rng RIÊNG của vòng (theo seed và số vòng) nên không phụ thuộc người chơi đã chơi thế nào; còn lá mới, lá giả ném và xáo bàn rút từ rng
 * của ván (phụ thuộc chuỗi nước đi, nhưng cùng seed cùng chuỗi nước đi thì cùng ván).
 */
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { MATCH3_SPEC, type Match3Spec } from './match3Config';

// ---------------------------------------------------------------------------
// Ô và bàn

export type CellKind = 'leaf' | 'fake' | 'wind';
export interface Cell {
  kind: CellKind;
  /** Loại lá (lá thường); −1 với lá giả và ô gió xoáy */
  leaf: number;
  /** Hoa sen: lá thường đặc biệt, giữ loại lá, khi nổ xóa cả hàng ngang */
  lotus: boolean;
}
export type Board = Cell[][];
/** Vị trí [hàng, cột] */
export type Pos = readonly [number, number];

export const FAKE: Cell = { kind: 'fake', leaf: -1, lotus: false };
export const WIND: Cell = { kind: 'wind', leaf: -1, lotus: false };
export const leafCell = (leaf: number, lotus = false): Cell => ({ kind: 'leaf', leaf, lotus });

const key = (r: number, c: number) => r * 64 + c;
const sameCell = (a: Pos, b: Pos) => a[0] === b[0] && a[1] === b[1];

export const rowsOf = (b: Board) => b.length;
export const colsOf = (b: Board) => (b.length ? b[0].length : 0);
const inside = (b: Board, r: number, c: number) => r >= 0 && r < rowsOf(b) && c >= 0 && c < colsOf(b);
const isLeaf = (x: Cell | null | undefined): x is Cell => !!x && x.kind === 'leaf';

/**
 * Đọc bàn từ chữ để viết test: hàng ngăn bằng "/", khoảng trắng bị bỏ. A đến G là lá loại 0 đến 6, chữ thường a đến g là hoa sen của loại đó, X là lá giả, W là ô gió xoáy.
 * Ví dụ `AAAB / CDEF` là bàn 2 hàng, 4 cột.
 */
export function parseBoard(text: string): Board {
  return text
    .split('/')
    .map((row) => row.replace(/\s+/g, ''))
    .filter((row) => row.length > 0)
    .map((row) =>
      [...row].map((ch) => {
        if (ch === 'X') return FAKE;
        if (ch === 'W') return WIND;
        const up = ch.toUpperCase();
        const idx = up.charCodeAt(0) - 65;
        if (idx < 0 || idx > 25) throw new Error(`Unknown board symbol: ${ch}`);
        return leafCell(idx, ch !== up);
      }),
    );
}

/** Ngược lại với `parseBoard` (hàng ngăn bằng " / "). */
export function boardToText(b: Board): string {
  return b
    .map((row) => row.map((x) => (x.kind === 'fake' ? 'X' : x.kind === 'wind' ? 'W' : x.lotus ? String.fromCharCode(97 + x.leaf) : String.fromCharCode(65 + x.leaf))).join(''))
    .join(' / ');
}

const cloneBoard = (b: Board): Board => b.map((row) => [...row]);

// ---------------------------------------------------------------------------
// Tìm hàng

export interface Run {
  type: number;
  dir: 'h' | 'v';
  cells: Pos[];
}
export interface Group {
  type: number;
  /** Mọi ô của nhóm (không trùng), theo thứ tự hàng rồi cột */
  cells: Pos[];
  /** Độ dài đường thẳng dài nhất trong nhóm */
  length: number;
  runs: Run[];
}

/** Mọi đường thẳng từ 3 lá thường cùng loại trở lên (lá giả và ô gió không tính; hoa sen tính theo loại của nó). */
function findRuns(b: Board): Run[] {
  const rows = rowsOf(b);
  const cols = colsOf(b);
  const runs: Run[] = [];
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const x = b[r][c];
      if (!isLeaf(x)) {
        c++;
        continue;
      }
      let j = c;
      while (j + 1 < cols && isLeaf(b[r][j + 1]) && b[r][j + 1].leaf === x.leaf) j++;
      if (j - c + 1 >= 3) runs.push({ type: x.leaf, dir: 'h', cells: Array.from({ length: j - c + 1 }, (_, k) => [r, c + k] as Pos) });
      c = j + 1;
    }
  }
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const x = b[r][c];
      if (!isLeaf(x)) {
        r++;
        continue;
      }
      let j = r;
      while (j + 1 < rows && isLeaf(b[j + 1][c]) && b[j + 1][c].leaf === x.leaf) j++;
      if (j - r + 1 >= 3) runs.push({ type: x.leaf, dir: 'v', cells: Array.from({ length: j - r + 1 }, (_, k) => [r + k, c] as Pos) });
      r = j + 1;
    }
  }
  return runs;
}

/** Các nhóm hàng của bàn: các đường cùng loại giao nhau gộp thành một nhóm; sắp theo ô đầu (hàng rồi cột). */
export function findGroups(b: Board): Group[] {
  const runs = findRuns(b);
  const parent = runs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const owner = new Map<number, number>();
  runs.forEach((run, i) => {
    for (const [r, c] of run.cells) {
      const had = owner.get(key(r, c));
      if (had === undefined) owner.set(key(r, c), i);
      else parent[find(i)] = find(had);
    }
  });
  const byRoot = new Map<number, Run[]>();
  runs.forEach((run, i) => {
    const root = find(i);
    const list = byRoot.get(root) ?? [];
    list.push(run);
    byRoot.set(root, list);
  });
  const groups: Group[] = [];
  for (const list of byRoot.values()) {
    const seen = new Set<number>();
    const cells: Pos[] = [];
    for (const run of list) for (const p of run.cells) if (!seen.has(key(p[0], p[1]))) (seen.add(key(p[0], p[1])), cells.push(p));
    cells.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    groups.push({ type: list[0].type, cells, length: Math.max(...list.map((x) => x.cells.length)), runs: list });
  }
  groups.sort((g, h) => g.cells[0][0] - h.cells[0][0] || g.cells[0][1] - h.cells[0][1]);
  return groups;
}

/** Vị trí ô đặc biệt của một nhóm: ô vừa đổi nếu nó nằm trong nhóm (ô đầu tiên trong `swapped` thỏa), không thì ô giữa của đường dài nhất (ô thứ ⌊(n − 1) / 2⌋). */
export function specialPosition(g: Group, swapped: readonly Pos[] = []): Pos {
  for (const p of swapped) if (g.cells.some((q) => sameCell(p, q))) return p;
  const longest = g.runs.reduce((best, run) => (run.cells.length > best.cells.length ? run : best), g.runs[0]);
  return longest.cells[Math.floor((longest.cells.length - 1) / 2)];
}

// ---------------------------------------------------------------------------
// Nước đi

export interface Move {
  a: Pos;
  b: Pos;
}

/** Đường thẳng dài nhất qua (r, c) theo hướng (dr, dc) cả hai phía, cho lá thường loại `leaf`. */
function lineThrough(b: Board, r: number, c: number, leaf: number, dr: number, dc: number): number {
  let n = 1;
  for (const s of [1, -1]) {
    let rr = r + dr * s;
    let cc = c + dc * s;
    while (inside(b, rr, cc) && isLeaf(b[rr][cc]) && b[rr][cc].leaf === leaf) {
      n++;
      rr += dr * s;
      cc += dc * s;
    }
  }
  return n;
}

function makesLine(b: Board, r: number, c: number): boolean {
  const x = b[r][c];
  if (!isLeaf(x)) return false;
  return lineThrough(b, r, c, x.leaf, 0, 1) >= 3 || lineThrough(b, r, c, x.leaf, 1, 0) >= 3;
}

/** Đổi chỗ hai ô kề nhau này có hiệu lực không (không có lá giả; có ô gió thì luôn có hiệu lực; còn lại phải tạo được hàng). Không đổi bàn. */
export function isLegalMove(b: Board, m: Move): boolean {
  const [r1, c1] = m.a;
  const [r2, c2] = m.b;
  if (!inside(b, r1, c1) || !inside(b, r2, c2)) return false;
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
  const x = b[r1][c1];
  const y = b[r2][c2];
  if (x.kind === 'fake' || y.kind === 'fake') return false;
  if (x.kind === 'wind' || y.kind === 'wind') return true;
  b[r1][c1] = y;
  b[r2][c2] = x;
  const ok = makesLine(b, r1, c1) || makesLine(b, r2, c2);
  b[r1][c1] = x;
  b[r2][c2] = y;
  return ok;
}

/** Mọi nước đi hợp lệ (mỗi cặp ô kề nhau một lần; a ở trên hay bên trái b). */
export function legalMoves(b: Board): Move[] {
  const rows = rowsOf(b);
  const cols = colsOf(b);
  const out: Move[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && isLegalMove(b, { a: [r, c], b: [r, c + 1] })) out.push({ a: [r, c], b: [r, c + 1] });
      if (r + 1 < rows && isLegalMove(b, { a: [r, c], b: [r + 1, c] })) out.push({ a: [r, c], b: [r + 1, c] });
    }
  }
  return out;
}

export function hasMove(b: Board): boolean {
  const rows = rowsOf(b);
  const cols = colsOf(b);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && isLegalMove(b, { a: [r, c], b: [r, c + 1] })) return true;
      if (r + 1 < rows && isLegalMove(b, { a: [r, c], b: [r + 1, c] })) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Cây

export interface SlotState {
  /** Loại lá cần ghép */
  need: number;
  filled: boolean;
}

/** Số mức gộp của cây `n` ô lá (n là lũy thừa của 2): 4 ô → 2 mức (2 cành, gốc); 8 ô → 3 mức. */
export function treeLevels(n: number): number {
  return Math.round(Math.log2(n));
}

/** Ô cây của một vòng: mỗi ô một loại lá, chọn theo rng sao cho không loại nào quá `cap` ô (cap = ⌈n × maxSameOf8 / 8⌉). */
export function makeSlots(spec: Match3Spec, n: number, rng: () => number): SlotState[] {
  const cap = Math.ceil((n * spec.maxSameOf8) / 8);
  const count = new Array(spec.kinds).fill(0) as number[];
  const slots: SlotState[] = [];
  for (let i = 0; i < n; i++) {
    const open = count.map((v, k) => (v < cap ? k : -1)).filter((k) => k >= 0);
    const k = open[Math.floor(rng() * open.length)];
    count[k]++;
    slots.push({ need: k, filled: false });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Sự kiện

export interface ClearedCell {
  pos: Pos;
  kind: 'leaf' | 'lotus' | 'wind';
  /** Loại lá (−1 với ô gió xoáy) */
  leaf: number;
}

export type Match3Event =
  | { type: 'swap'; a: Pos; b: Pos }
  | { type: 'swapBack'; a: Pos; b: Pos }
  /** Bắt đầu đợt nổ thứ `n` (đếm từ 1) của nước đi */
  | { type: 'wave'; n: number }
  | { type: 'spawnLotus'; pos: Pos; leaf: number }
  | { type: 'spawnWind'; pos: Pos }
  /** Các lá nổ trong đợt này, điểm cộng; `lotusRows` là các hàng bị hoa sen xóa; `windOf` là loại lá bị gió xoáy xóa (−1: gió + gió, xóa mọi lá thường) */
  | { type: 'clear'; wave: number; cells: ClearedCell[]; points: number; lotusRows: number[]; windOf?: number }
  | { type: 'fakeGone'; pos: Pos }
  | { type: 'slotFilled'; slot: number; leaf: number; from: Pos }
  /** Hai ô (cành) anh em cùng đầy thì gộp: `level` 1 là cành trên ô lá, `root` là gốc */
  | { type: 'branchMerged'; level: number; index: number; root: boolean }
  | { type: 'treeDone' }
  | { type: 'fall'; moves: { col: number; from: number; to: number }[] }
  | { type: 'fill'; cells: { pos: Pos; leaf: number }[] }
  | { type: 'throwFake'; pos: Pos }
  | { type: 'shuffle'; cells: { pos: Pos; leaf: number }[] }
  | { type: 'roundEnd'; round: number; done: boolean; turnsLeft: number; bonus: number }
  | { type: 'roundStart'; round: number }
  | { type: 'gameEnd' };

// ---------------------------------------------------------------------------
// Ván

export type Match3Phase = 'play' | 'roundEnd' | 'ended';

export interface RoundResult {
  done: boolean;
  turnsLeft: number;
  /** Điểm của riêng vòng này (kể cả thưởng lượt dư) */
  score: number;
  slotsFilled: number;
}

export interface Match3Stats {
  moves: number;
  swapBacks: number;
  leavesCleared: number;
  slotsFilled: number;
  lotus: number;
  wind: number;
  fakesThrown: number;
  fakesGone: number;
  shuffles: number;
  maxWaves: number;
}

export interface Match3State {
  spec: Match3Spec;
  seed: number;
  round: number;
  phase: Match3Phase;
  board: Board;
  slots: SlotState[];
  /** `merged[level][index]`: cành (mức 1 trở lên) đã gộp; mức 0 là ô lá (`slots[i].filled`) */
  merged: boolean[][];
  turnsLeft: number;
  turnsUsed: number;
  score: number;
  roundScore: number;
  results: RoundResult[];
  stats: Match3Stats;
  /** rng của ván: lá mới, lá giả ném, xáo bàn */
  rng: () => number;
}

const newStats = (): Match3Stats => ({ moves: 0, swapBacks: 0, leavesCleared: 0, slotsFilled: 0, lotus: 0, wind: 0, fakesThrown: 0, fakesGone: 0, shuffles: 0, maxWaves: 0 });

/** rng riêng của vòng (bàn đầu vòng và ô cây): chỉ phụ thuộc seed và số vòng. */
export function roundRng(seed: number, round: number): () => number {
  return createMulberry32((Math.imul(seed >>> 0, 0x9e3779b1) ^ Math.imul(round + 1, 0x85ebca6b)) >>> 0);
}

/** Một loại lá ngẫu nhiên không tạo ra đường 3 cùng loại với hai ô bên trái hay hai ô phía trên (đã đặt). */
function leafAvoidingRuns(b: Board, r: number, c: number, kinds: number, rng: () => number): number {
  const ok: number[] = [];
  for (let t = 0; t < kinds; t++) {
    const left = c >= 2 && isLeaf(b[r][c - 1]) && isLeaf(b[r][c - 2]) && b[r][c - 1].leaf === t && b[r][c - 2].leaf === t;
    const up = r >= 2 && isLeaf(b[r - 1][c]) && isLeaf(b[r - 2][c]) && b[r - 1][c].leaf === t && b[r - 2][c].leaf === t;
    if (!left && !up) ok.push(t);
  }
  return ok[Math.floor(rng() * ok.length)];
}

/** Bàn đầu vòng: không có hàng sẵn, có ít nhất một nước đi, `fakes` lá giả đặt ngẫu nhiên. */
export function makeBoard(spec: Match3Spec, fakes: number, rng: () => number): Board {
  const n = spec.size;
  for (let attempt = 0; attempt < 500; attempt++) {
    const b: Board = Array.from({ length: n }, () => new Array<Cell>(n));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) b[r][c] = leafCell(leafAvoidingRuns(b, r, c, spec.kinds, rng));
    const cells = Array.from({ length: n * n }, (_, i) => i);
    for (let i = 0; i < fakes; i++) {
      const j = i + Math.floor(rng() * (cells.length - i));
      [cells[i], cells[j]] = [cells[j], cells[i]];
      b[Math.floor(cells[i] / n)][cells[i] % n] = FAKE;
    }
    if (hasMove(b)) return b;
  }
  throw new Error('Could not build a board with a legal move');
}

function emptyMerged(n: number): boolean[][] {
  const levels = treeLevels(n);
  return Array.from({ length: levels }, (_, i) => new Array<boolean>(n >> (i + 1)).fill(false));
}

function setupRound(s: Match3State, round: number): void {
  const spec = s.spec;
  const r = spec.rounds[round];
  const rng = roundRng(s.seed, round);
  s.round = round;
  s.phase = 'play';
  s.slots = makeSlots(spec, r.slots, rng);
  s.board = makeBoard(spec, r.fakes, rng);
  s.merged = emptyMerged(r.slots);
  s.turnsLeft = r.turns;
  s.turnsUsed = 0;
  s.roundScore = 0;
}

export function createMatch3Game(seed: number, spec: Match3Spec = MATCH3_SPEC): Match3State {
  const s: Match3State = {
    spec,
    seed,
    round: 0,
    phase: 'play',
    board: [],
    slots: [],
    merged: [],
    turnsLeft: 0,
    turnsUsed: 0,
    score: 0,
    roundScore: 0,
    results: [],
    stats: newStats(),
    rng: createMulberry32((seed ^ 0x51ed270b) >>> 0),
  };
  setupRound(s, 0);
  return s;
}

/** Ván từ một bàn cho sẵn (viết test): vòng 0, ô cây và số lượt tùy chọn. `slots` là chuỗi chữ cái loại lá (ví dụ "AABB") hay mảng loại. Không kiểm bàn có hàng sẵn hay có nước đi. */
export function createMatch3FromBoard(board: Board | string, opts: { seed?: number; spec?: Match3Spec; slots?: string | readonly number[]; turns?: number; round?: number } = {}): Match3State {
  const spec = opts.spec ?? MATCH3_SPEC;
  const seed = opts.seed ?? 1;
  const s = createMatch3Game(seed, spec);
  const b = typeof board === 'string' ? parseBoard(board) : cloneBoard(board);
  if (opts.round !== undefined) setupRound(s, opts.round);
  s.board = b;
  if (opts.slots !== undefined) {
    const needs = typeof opts.slots === 'string' ? [...opts.slots.replace(/\s+/g, '')].map((ch) => ch.charCodeAt(0) - 65) : [...opts.slots];
    s.slots = needs.map((need) => ({ need, filled: false }));
    s.merged = emptyMerged(needs.length);
  }
  if (opts.turns !== undefined) s.turnsLeft = opts.turns;
  return s;
}

export const slotsDone = (s: Match3State): boolean => s.slots.length > 0 && s.slots.every((x) => x.filled);

// ---------------------------------------------------------------------------
// Một đợt nổ

interface WavePlan {
  /** Ô nổ (khóa → vị trí) */
  exploded: Map<number, Pos>;
  /** Ô đặc biệt mới tạo (không nổ) */
  created: Map<number, { pos: Pos; kind: 'lotus' | 'wind'; leaf: number }>;
  /** Mỗi hàng loại X (hay lần gió xoáy xóa loại X) lấp tối đa một ô cây loại X; `from` là chỗ lá bay lên */
  slotGroups: { type: number; from: Pos }[];
  windOf?: number;
}

/** Kế hoạch đợt nổ từ các nhóm hàng đang có trên bàn. `swapped` là hai ô vừa đổi (chỉ đợt đầu của một nước đi). */
function planFromGroups(groups: readonly Group[], swapped: readonly Pos[]): WavePlan {
  const plan: WavePlan = { exploded: new Map(), created: new Map(), slotGroups: [] };
  for (const g of groups) {
    const keep = g.length >= 4 ? specialPosition(g, swapped) : null;
    if (keep) plan.created.set(key(keep[0], keep[1]), { pos: keep, kind: g.length === 4 ? 'lotus' : 'wind', leaf: g.type });
    for (const p of g.cells) if (!keep || !sameCell(p, keep)) plan.exploded.set(key(p[0], p[1]), p);
    plan.slotGroups.push({ type: g.type, from: g.cells[0] });
  }
  return plan;
}

/** Kế hoạch khi đổi ô gió xoáy với một ô: gió + lá (hay hoa sen) loại X xóa mọi lá loại X và chính nó; gió + gió xóa mọi lá thường. */
function planFromWind(b: Board, a: Pos, c: Pos): WavePlan {
  const x = b[a[0]][a[1]];
  const y = b[c[0]][c[1]];
  const plan: WavePlan = { exploded: new Map(), created: new Map(), slotGroups: [] };
  const rows = rowsOf(b);
  const cols = colsOf(b);
  const add = (p: Pos) => plan.exploded.set(key(p[0], p[1]), p);
  if (x.kind === 'wind' && y.kind === 'wind') {
    add(a);
    add(c);
    plan.windOf = -1;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (isLeaf(b[r][k])) add([r, k]);
    return plan;
  }
  const wind = x.kind === 'wind' ? a : c;
  const other = x.kind === 'wind' ? y : x;
  add(wind);
  plan.windOf = other.leaf;
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) if (isLeaf(b[r][k]) && b[r][k].leaf === other.leaf) add([r, k]);
  plan.slotGroups.push({ type: other.leaf, from: x.kind === 'wind' ? c : a });
  return plan;
}

/**
 * Mở rộng tập ô nổ: hoa sen nổ xóa cả hàng ngang của nó (kể cả lá giả, ô gió; trừ ô đặc biệt vừa tạo), hoa sen trong hàng đó nổ theo. Trả về các hàng bị hoa sen xóa. Rồi lá giả sát một ô nổ (trên, dưới, trái, phải) biến mất.
 */
function expandPlan(b: Board, plan: WavePlan): { lotusRows: number[]; fakes: Pos[] } {
  const cols = colsOf(b);
  const lotusRows: number[] = [];
  const doneRows = new Set<number>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const p of [...plan.exploded.values()]) {
      const x = b[p[0]][p[1]];
      if (isLeaf(x) && x.lotus && !doneRows.has(p[0])) {
        doneRows.add(p[0]);
        lotusRows.push(p[0]);
        for (let c = 0; c < cols; c++) {
          if (plan.created.has(key(p[0], c))) continue;
          if (!plan.exploded.has(key(p[0], c))) (plan.exploded.set(key(p[0], c), [p[0], c]), (grew = true));
        }
      }
    }
  }
  const fakes: Pos[] = [];
  const seen = new Set<number>();
  for (const p of plan.exploded.values()) {
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const r = p[0] + dr;
      const c = p[1] + dc;
      if (inside(b, r, c) && b[r][c].kind === 'fake' && !plan.exploded.has(key(r, c)) && !seen.has(key(r, c))) (seen.add(key(r, c)), fakes.push([r, c]));
    }
  }
  return { lotusRows: lotusRows.sort((p, q) => p - q), fakes };
}

/** Lấp ô cây và gộp cành: một nhóm loại X lấp ô trống nhỏ nhất cần loại X (nếu có). */
export function fillSlot(s: Match3State, type: number, from: Pos, events: Match3Event[]): void {
  const i = s.slots.findIndex((x) => !x.filled && x.need === type);
  if (i < 0) return;
  s.slots[i].filled = true;
  s.stats.slotsFilled++;
  s.score += s.spec.points.slot;
  s.roundScore += s.spec.points.slot;
  events.push({ type: 'slotFilled', slot: i, leaf: type, from });
  const n = s.slots.length;
  const levels = treeLevels(n);
  const full = (level: number, idx: number) => (level === 0 ? s.slots[idx].filled : s.merged[level - 1][idx]);
  let level = 0;
  let idx = i;
  while (level < levels && full(level, idx ^ 1) && !s.merged[level][idx >> 1]) {
    s.merged[level][idx >> 1] = true;
    events.push({ type: 'branchMerged', level: level + 1, index: idx >> 1, root: level + 1 === levels });
    level++;
    idx >>= 1;
  }
  if (slotsDone(s) && s.merged[levels - 1][0]) events.push({ type: 'treeDone' });
}

/** Chạy một đợt nổ: ô đặc biệt, điểm, lá giả, ô cây, rơi và thêm lá. */
function runWave(s: Match3State, plan: WavePlan, n: number, events: Match3Event[]): void {
  const b = s.board;
  const rows = rowsOf(b);
  const cols = colsOf(b);
  events.push({ type: 'wave', n });
  const { lotusRows, fakes } = expandPlan(b, plan);
  // ô đặc biệt mới tạo (đặt trước khi xóa các ô khác; nằm tại chỗ, không nổ)
  for (const sp of plan.created.values()) {
    if (sp.kind === 'lotus') {
      b[sp.pos[0]][sp.pos[1]] = leafCell(sp.leaf, true);
      s.stats.lotus++;
      events.push({ type: 'spawnLotus', pos: sp.pos, leaf: sp.leaf });
    } else {
      b[sp.pos[0]][sp.pos[1]] = WIND;
      s.stats.wind++;
      events.push({ type: 'spawnWind', pos: sp.pos });
    }
  }
  // lá nổ và điểm (lá giả bị hoa sen xóa không tính điểm)
  const cleared: ClearedCell[] = [];
  const fakeGone: Pos[] = [...fakes];
  for (const p of plan.exploded.values()) {
    const x = b[p[0]][p[1]];
    if (x.kind === 'fake') fakeGone.push(p);
    else cleared.push({ pos: p, kind: x.kind === 'wind' ? 'wind' : x.lotus ? 'lotus' : 'leaf', leaf: x.leaf });
  }
  cleared.sort((p, q) => p.pos[0] - q.pos[0] || p.pos[1] - q.pos[1]);
  const leaves = cleared.filter((x) => x.kind !== 'wind').length;
  const points = leaves * s.spec.points.leaf;
  s.score += points;
  s.roundScore += points;
  s.stats.leavesCleared += leaves;
  events.push({ type: 'clear', wave: n, cells: cleared, points, lotusRows, ...(plan.windOf !== undefined ? { windOf: plan.windOf } : {}) });
  for (const p of plan.exploded.values()) b[p[0]][p[1]] = null as unknown as Cell;
  for (const p of fakeGone) {
    b[p[0]][p[1]] = null as unknown as Cell;
    s.stats.fakesGone++;
    events.push({ type: 'fakeGone', pos: p });
  }
  // ô cây
  for (const g of plan.slotGroups) fillSlot(s, g.type, g.from, events);
  // rơi
  const moves: { col: number; from: number; to: number }[] = [];
  for (let c = 0; c < cols; c++) {
    let write = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      if (b[r][c]) {
        if (write !== r) {
          b[write][c] = b[r][c];
          b[r][c] = null as unknown as Cell;
          moves.push({ col: c, from: r, to: write });
        }
        write--;
      }
    }
  }
  if (moves.length) events.push({ type: 'fall', moves });
  // thêm lá từ trên (theo cột rồi hàng, từ trên xuống)
  const fill: { pos: Pos; leaf: number }[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (!b[r][c]) {
        const leaf = Math.floor(s.rng() * s.spec.kinds);
        b[r][c] = leafCell(leaf);
        fill.push({ pos: [r, c], leaf });
      }
    }
  }
  if (fill.length) events.push({ type: 'fill', cells: fill });
}

/** Giải quyết mọi hàng đang có trên bàn (nổ dây chuyền tới khi hết hàng), bắt đầu bằng kế hoạch `first` nếu có. Trả về số đợt. */
function cascade(s: Match3State, first: WavePlan | null, swapped: readonly Pos[], events: Match3Event[]): number {
  let n = 0;
  let plan = first;
  let sw = swapped;
  for (let guard = 0; guard < 200; guard++) {
    if (!plan) {
      const groups = findGroups(s.board);
      if (groups.length === 0) break;
      plan = planFromGroups(groups, sw);
    }
    n++;
    runWave(s, plan, n, events);
    plan = null;
    sw = [];
  }
  s.stats.maxWaves = Math.max(s.stats.maxWaves, n);
  return n;
}

/**
 * Giải quyết các hàng đang có sẵn trên bàn (không đổi chỗ, không mất lượt): để thử và để cảnh dọn bàn. Trả về các sự kiện (rỗng nếu không có hàng).
 */
export function settleBoard(s: Match3State): Match3Event[] {
  const events: Match3Event[] = [];
  cascade(s, null, [], events);
  return events;
}

// ---------------------------------------------------------------------------
// Xáo bàn và lá giả

/** Xáo lại các lá thường (không phải hoa sen): lá giả và ô đặc biệt giữ chỗ. Tới khi bàn không có hàng sẵn và còn nước đi. Trả về các ô đổi loại; rỗng nếu không xáo được. */
export function shuffleBoard(s: Match3State): { pos: Pos; leaf: number }[] {
  const b = s.board;
  const rows = rowsOf(b);
  const cols = colsOf(b);
  const spots: Pos[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (isLeaf(b[r][c]) && !b[r][c].lotus) spots.push([r, c]);
  const original = spots.map((p) => b[p[0]][p[1]].leaf);
  const apply = (types: readonly number[]) => spots.forEach((p, i) => (b[p[0]][p[1]] = leafCell(types[i])));
  const good = () => findRuns(b).length === 0 && hasMove(b);
  for (let attempt = 0; attempt < 400; attempt++) {
    const types = [...original];
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(s.rng() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    apply(types);
    if (good()) return spots.map((p, i) => ({ pos: p, leaf: types[i] }));
  }
  for (let attempt = 0; attempt < 400; attempt++) {
    // làm mới hẳn: loại ngẫu nhiên tránh tạo đường (các ô còn lại giữ nguyên)
    for (const p of spots) b[p[0]][p[1]] = leafCell(leafAvoidingRuns(b, p[0], p[1], s.spec.kinds, s.rng));
    if (good()) return spots.map((p) => ({ pos: p, leaf: b[p[0]][p[1]].leaf }));
  }
  apply(original);
  return [];
}

/** {phanDien} ném một lá giả vào một ô lá thường ngẫu nhiên (không phải hoa sen, ô gió hay lá giả). Trả về vị trí, hay null nếu không có ô nào. */
export function throwFake(s: Match3State): Pos | null {
  const b = s.board;
  const spots: Pos[] = [];
  for (let r = 0; r < rowsOf(b); r++) for (let c = 0; c < colsOf(b); c++) if (isLeaf(b[r][c]) && !b[r][c].lotus) spots.push([r, c]);
  if (spots.length === 0) return null;
  const p = spots[Math.floor(s.rng() * spots.length)];
  b[p[0]][p[1]] = FAKE;
  s.stats.fakesThrown++;
  return p;
}

// ---------------------------------------------------------------------------
// Thao tác của người chơi

export type SwapResult = { ok: true; events: Match3Event[] } | { ok: false; why: 'phase' | 'range' | 'adjacent' | 'fake' | 'noMatch'; events: Match3Event[] };

function endRound(s: Match3State, events: Match3Event[]): void {
  const done = slotsDone(s);
  const bonus = done ? s.spec.points.tree + s.spec.points.spare * s.turnsLeft : 0;
  s.score += bonus;
  s.roundScore += bonus;
  s.results.push({ done, turnsLeft: s.turnsLeft, score: s.roundScore, slotsFilled: s.slots.filter((x) => x.filled).length });
  s.phase = 'roundEnd';
  events.push({ type: 'roundEnd', round: s.round, done, turnsLeft: s.turnsLeft, bonus });
}

/**
 * Đổi chỗ hai ô kề nhau. Không tạo được hàng thì hai ô trả về chỗ cũ và KHÔNG mất lượt (`ok: false`, `why: 'noMatch'`, sự kiện đổi rồi trả về). Hợp lệ thì: các đợt nổ (dây chuyền), mất một lượt, rồi nếu xong cây hay hết lượt
 * thì hết vòng (thưởng lượt dư nếu xong cây); không thì cứ đủ `throwEvery` lượt {phanDien} ném một lá giả, và hết nước đi thì xáo lại.
 */
export function swapCells(s: Match3State, a: Pos, b: Pos): SwapResult {
  if (s.phase !== 'play') return { ok: false, why: 'phase', events: [] };
  const board = s.board;
  if (!inside(board, a[0], a[1]) || !inside(board, b[0], b[1])) return { ok: false, why: 'range', events: [] };
  if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return { ok: false, why: 'adjacent', events: [] };
  const x = board[a[0]][a[1]];
  const y = board[b[0]][b[1]];
  if (x.kind === 'fake' || y.kind === 'fake') return { ok: false, why: 'fake', events: [] };
  const events: Match3Event[] = [{ type: 'swap', a, b }];
  if (x.kind === 'wind' || y.kind === 'wind') {
    cascade(s, planFromWind(board, a, b), [], events);
  } else {
    board[a[0]][a[1]] = y;
    board[b[0]][b[1]] = x;
    if (!makesLine(board, a[0], a[1]) && !makesLine(board, b[0], b[1])) {
      board[a[0]][a[1]] = x;
      board[b[0]][b[1]] = y;
      s.stats.swapBacks++;
      events.push({ type: 'swapBack', a, b });
      return { ok: false, why: 'noMatch', events };
    }
    cascade(s, null, [a, b], events);
  }
  s.stats.moves++;
  s.turnsLeft--;
  s.turnsUsed++;
  if (slotsDone(s) || s.turnsLeft <= 0) {
    endRound(s, events);
    return { ok: true, events };
  }
  if (s.turnsUsed % s.spec.throwEvery === 0) {
    const p = throwFake(s);
    if (p) events.push({ type: 'throwFake', pos: p });
  }
  if (!hasMove(s.board)) {
    const cells = shuffleBoard(s);
    s.stats.shuffles++;
    events.push({ type: 'shuffle', cells });
  }
  return { ok: true, events };
}

/** Sau khi hết vòng: sang vòng sau (bàn và ô cây mới), hay hết ván sau vòng cuối. */
export function advanceRound(s: Match3State): Match3Event[] {
  if (s.phase !== 'roundEnd') return [];
  if (s.round + 1 < s.spec.rounds.length) {
    setupRound(s, s.round + 1);
    return [{ type: 'roundStart', round: s.round }];
  }
  s.phase = 'ended';
  return [{ type: 'gameEnd' }];
}

export const match3Score = (s: Match3State): number => s.score;

/** Điểm tính lại từ thống kê và kết quả các vòng (để kiểm công thức): lá nổ × 1 + ô cây × 50 + mỗi cây xong (200 + 20 × lượt dư). */
export function scoreFromStats(spec: Match3Spec, stats: Pick<Match3Stats, 'leavesCleared' | 'slotsFilled'>, results: readonly RoundResult[]): number {
  const spare = results.reduce((sum, r) => sum + (r.done ? spec.points.tree + r.turnsLeft * spec.points.spare : 0), 0);
  return stats.leavesCleared * spec.points.leaf + stats.slotsFilled * spec.points.slot + spare;
}

// ---------------------------------------------------------------------------
// Xem trước một nước đi (cho bot và gợi ý): không đổi ván

export interface MovePreview {
  /** Số ô cây sẽ lấp ngay ở đợt nổ đầu (chưa tính lá rơi xuống) */
  slots: number;
  /** Số lá nổ ở đợt đầu (kể cả hoa sen, gió xoáy xóa thêm) */
  leaves: number;
  /** Số hàng ở đợt đầu */
  groups: number;
}

/** Nước đi này nổ gì ở đợt đầu (chỉ nhìn bàn hiện tại, không đoán lá rơi xuống). Nước đi không hợp lệ thì null. */
export function previewMove(s: Match3State, m: Move): MovePreview | null {
  const board = cloneBoard(s.board);
  if (!isLegalMove(board, m)) return null;
  const [a, b] = [m.a, m.b];
  const x = board[a[0]][a[1]];
  const y = board[b[0]][b[1]];
  let plan: WavePlan;
  if (x.kind === 'wind' || y.kind === 'wind') plan = planFromWind(board, a, b);
  else {
    board[a[0]][a[1]] = y;
    board[b[0]][b[1]] = x;
    plan = planFromGroups(findGroups(board), [a, b]);
  }
  expandPlan(board, plan);
  const needs = s.slots.map((q) => (q.filled ? -1 : q.need));
  let slots = 0;
  for (const g of plan.slotGroups) {
    const i = needs.indexOf(g.type);
    if (i >= 0) {
      needs[i] = -1;
      slots++;
    }
  }
  let leaves = 0;
  for (const p of plan.exploded.values()) if (isLeaf(board[p[0]][p[1]])) leaves++;
  return { slots, leaves, groups: plan.slotGroups.length };
}
