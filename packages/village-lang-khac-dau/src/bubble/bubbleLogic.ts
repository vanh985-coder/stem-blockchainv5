/**
 * Logic thuần của màn 9 "Bắn trứng khắc dấu" (spec 07, mục "Màn 9"): không import React hay canvas, có test (`bubbleLogic.test.ts`).
 * Số ngẫu nhiên từ `createMulberry32(seed)`: kế hoạch ba đợt (khóa riêng, khay nạp) rút sẵn khi tạo ván; bàn đầu đợt và hàng mới khi hạ bàn rút từ dòng số riêng,
 * nên cùng seed và cùng thao tác thì cùng kết quả. Mẫu công khai LUÔN tính bằng `publicKey` của Bài 3 (`lessons/bai-3/logic`).
 *
 * Luồng: nạp trứng (`pickTrayEgg`, `startRound`) → bắn (`selectType`, `shoot` dựng đường bay, `land` áp kết quả khi trứng tới nơi; bot gọi `shootAndLand`) → hết đợt thì nạp tiếp, hết đợt 3 hoặc hết tim thì `phase = 'ended'`.
 * Bàn lưới lục giác: hàng chẵn rộng 10 ô, hàng lẻ 9 ô (hàng đếm từ tấm trần). Hạ bàn là cả tấm trần cùng đàn trứng hạ xuống 1 hàng (`lowered` tăng 1), KHÔNG thêm trứng mới: ván hữu hạn, trứng tiến dần tới dây giới hạn.
 */
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { BUBBLE_SPEC, type BubbleSpec } from './bubbleConfig';

export type BubblePhase = 'load' | 'play' | 'ended';
export type EndReason = 'win' | 'hearts';
/** Loại trứng ở khay nạp: đúng (mẫu công khai của khóa trong đợt), ghi chính số khóa riêng, ghi mẫu công khai của khóa ngoài đợt */
export type TrayKind = 'dung' | 'rieng' | 'ngoai';

export interface TrayEgg {
  id: number;
  value: number;
  kind: TrayKind;
}

export interface RoundPlan {
  /** Khóa riêng của đợt */
  keys: readonly number[];
  /** Mẫu công khai đúng, cùng thứ tự với `keys` (tính bằng `publicKey`) */
  values: readonly number[];
  /** Khay nạp đã xáo: trứng đúng và 3 trứng nhiễu */
  tray: readonly TrayEgg[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Cell {
  r: number;
  c: number;
}

/** Trứng đang bay: đường gấp khúc từ máy bắn tới chỗ dừng, và ô nó sẽ dính vào */
export interface Flying {
  value: number;
  angle: number;
  path: readonly Point[];
  length: number;
  cell: Cell;
}

export interface BubbleStats {
  popped: number;
  dropped: number;
  cleanLoads: number;
  roundsCleared: number;
  shots: number;
  heartsLost: number;
  wrongPicks: number;
  descents: number;
}

export type BubbleEvent =
  | { type: 'land'; cell: Cell; value: number }
  | { type: 'pop'; cells: readonly Cell[]; value: number }
  | { type: 'drop'; cells: readonly (Cell & { value: number })[] }
  | { type: 'descend' }
  | { type: 'heart'; cleared: number }
  | { type: 'roundClear'; round: number }
  | { type: 'end'; reason: EndReason };

export interface BubbleState {
  spec: BubbleSpec;
  seed: number;
  rngBoard: () => number;
  plans: readonly RoundPlan[];
  phase: BubblePhase;
  round: number;
  /** Id các trứng đã chọn đúng ở khay nạp của đợt; `failed` là đã chọn sai ít nhất một lần */
  load: { picked: number[]; failed: boolean };
  /** Bàn: `board[r][c]` là mẫu công khai trên trứng (hoặc null) */
  board: (number | null)[][];
  shift: number;
  /** Số hàng tấm trần (cùng đàn trứng) đã hạ xuống trong đợt này */
  lowered: number;
  /** Chỉ số (trong `plans[round].values`) loại trứng em đã chọn ở máy bắn; null là chưa chọn */
  selected: number | null;
  shotsSinceDescent: number;
  hearts: number;
  flying: Flying | null;
  stats: BubbleStats;
  end: EndReason | null;
}

// ---------------------------------------------------------------- lưới lục giác

export const rowWidth = (shift: number, r: number): number => ((r + shift) % 2 === 0 ? BUBBLE_SPEC.width : BUBBLE_SPEC.width - 1);
export const rowOffset = (shift: number, r: number): number => (rowWidth(shift, r) === BUBBLE_SPEC.width ? 0.5 : 1);

/** Tâm ô trong hệ tọa độ bàn: x từ 0 đến `width`, y từ mép trên của khung xuống (hàng 0 của tấm trần chưa hạ có tâm ở 0,5); `lowered` là số hàng tấm trần đã hạ */
export function cellCenter(shift: number, r: number, c: number, out: Point = { x: 0, y: 0 }, lowered = 0): Point {
  out.x = c + rowOffset(shift, r);
  out.y = 0.5 + (r + lowered) * BUBBLE_SPEC.rowH;
  return out;
}

/** Ô kề (tối đa 6) của ô (r, c) trong lưới hiện tại, chỉ những ô nằm trong bàn */
export function neighbors(shift: number, r: number, c: number): Cell[] {
  const out: Cell[] = [];
  const o = rowOffset(shift, r);
  if (c > 0) out.push({ r, c: c - 1 });
  if (c < rowWidth(shift, r) - 1) out.push({ r, c: c + 1 });
  for (const rr of [r - 1, r + 1]) {
    if (rr < 0) continue;
    const o2 = rowOffset(shift, rr);
    const w2 = rowWidth(shift, rr);
    for (const cc of [c + o - o2 - 0.5, c + o - o2 + 0.5]) if (cc >= 0 && cc < w2) out.push({ r: rr, c: cc });
  }
  return out;
}

const makeRow = (shift: number, r: number): (number | null)[] => new Array<number | null>(rowWidth(shift, r)).fill(null);

function ensureRow(s: BubbleState, r: number): void {
  while (s.board.length <= r) s.board.push(makeRow(s.shift, s.board.length));
}

const valueAt = (s: BubbleState, r: number, c: number): number | null => s.board[r]?.[c] ?? null;

function trimRows(s: BubbleState): void {
  while (s.board.length > 0 && s.board[s.board.length - 1].every((v) => v === null)) s.board.pop();
}

export function eggCount(s: BubbleState): number {
  let n = 0;
  for (const row of s.board) for (const v of row) if (v !== null) n++;
  return n;
}

/** Các mẫu công khai còn trên bàn */
export function presentValues(s: BubbleState): Set<number> {
  const out = new Set<number>();
  for (const row of s.board) for (const v of row) if (v !== null) out.add(v);
  return out;
}

// ---------------------------------------------------------------- tạo ván và nạp trứng

function drawPlan(rng: () => number, spec: BubbleSpec, nKeys: number, nextId: { v: number }): RoundPlan {
  const [lo, hi] = spec.keyRange;
  const pool: number[] = [];
  for (let k = lo; k <= hi; k++) pool.push(k);
  const keys: number[] = [];
  while (keys.length < nKeys) keys.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const values = keys.map(publicKey);
  const taken = new Set<number>(values);
  const tray: TrayEgg[] = values.map((value) => ({ id: nextId.v++, value, kind: 'dung' as const }));
  // một trứng ghi chính số khóa riêng (không trùng mẫu đúng nào của đợt)
  const order = keys.map((k) => ({ k, o: rng() })).sort((a, b) => a.o - b.o);
  const bay = order.find((x) => !taken.has(x.k));
  if (bay) {
    taken.add(bay.k);
    tray.push({ id: nextId.v++, value: bay.k, kind: 'rieng' });
  }
  // các trứng còn lại ghi mẫu công khai của khóa ngoài đợt (số khác nhau, không trùng mẫu đúng)
  const outside: number[] = [];
  for (let k = 1; k <= 22; k++) if (!keys.includes(k) && !taken.has(publicKey(k))) outside.push(publicKey(k));
  while (tray.length < nKeys + spec.decoys && outside.length > 0) {
    const v = outside.splice(Math.floor(rng() * outside.length), 1)[0];
    if (taken.has(v)) continue;
    taken.add(v);
    tray.push({ id: nextId.v++, value: v, kind: 'ngoai' });
  }
  // xáo khay
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  return { keys, values, tray };
}

export function createBubbleGame(seed: number, spec: BubbleSpec = BUBBLE_SPEC): BubbleState {
  const rng = createMulberry32(seed);
  const nextId = { v: 1 };
  const plans = spec.rounds.map((r) => drawPlan(rng, spec, r.keys, nextId));
  return {
    spec,
    seed,
    rngBoard: createMulberry32((seed ^ 0x9e3779b9) >>> 0),
    plans,
    phase: 'load',
    round: 0,
    load: { picked: [], failed: false },
    board: [],
    shift: 0,
    lowered: 0,
    selected: null,
    shotsSinceDescent: 0,
    hearts: spec.hearts,
    flying: null,
    stats: { popped: 0, dropped: 0, cleanLoads: 0, roundsCleared: 0, shots: 0, heartsLost: 0, wrongPicks: 0, descents: 0 },
    end: null,
  };
}

export const planOf = (s: BubbleState): RoundPlan => s.plans[s.round];

/** Chọn một trứng ở khay nạp. 'dung': trứng bay vào máy bắn; 'sai': bật ra và đợt này mất thưởng nạp; 'bo-qua': không làm gì (đã chọn rồi, hay không ở bước nạp) */
export function pickTrayEgg(s: BubbleState, id: number): 'dung' | 'sai' | 'bo-qua' {
  if (s.phase !== 'load') return 'bo-qua';
  const egg = planOf(s).tray.find((e) => e.id === id);
  if (!egg || s.load.picked.includes(id)) return 'bo-qua';
  if (egg.kind === 'dung') {
    s.load.picked.push(id);
    return 'dung';
  }
  s.load.failed = true;
  s.stats.wrongPicks++;
  return 'sai';
}

export const loadComplete = (s: BubbleState): boolean => s.phase === 'load' && s.load.picked.length === planOf(s).keys.length;

/** Số trứng đã vào máy bắn và đã bị chọn nhầm ở khay: để vẽ */
export const trayIsPicked = (s: BubbleState, id: number): boolean => s.load.picked.includes(id);

export function groupAt(s: BubbleState, r: number, c: number): Cell[] {
  const v = valueAt(s, r, c);
  if (v === null) return [];
  const seen = new Set<number>([r * 32 + c]);
  const out: Cell[] = [{ r, c }];
  for (let i = 0; i < out.length; i++) {
    for (const n of neighbors(s.shift, out[i].r, out[i].c)) {
      const key = n.r * 32 + n.c;
      if (seen.has(key) || valueAt(s, n.r, n.c) !== v) continue;
      seen.add(key);
      out.push(n);
    }
  }
  return out;
}

function buildBoard(s: BubbleState): void {
  const { rows } = s.spec.rounds[s.round];
  const values = planOf(s).values;
  s.shift = 0;
  s.lowered = 0;
  s.board = [];
  for (let r = 0; r < rows; r++) {
    ensureRow(s, r);
    for (let c = 0; c < s.board[r].length; c++) {
      // chọn trong các loại không tạo thành cụm đủ số trứng vỡ (hết lựa chọn thì rút tùy ý): bàn đầu đợt hầu như không có sẵn cụm
      const ok: number[] = [];
      for (const v of values) {
        s.board[r][c] = v;
        if (groupAt(s, r, c).length < s.spec.minGroup) ok.push(v);
      }
      const pool = ok.length > 0 ? ok : values;
      s.board[r][c] = pool[Math.floor(s.rngBoard() * pool.length)];
    }
  }
}

/** Bắt đầu đợt đang nạp (cần nạp đủ trứng đúng): cộng thưởng nạp nếu chưa chọn sai, dựng bàn. Trả về true nếu bắt đầu được */
export function startRound(s: BubbleState): boolean {
  if (!loadComplete(s)) return false;
  if (!s.load.failed) s.stats.cleanLoads++;
  s.phase = 'play';
  s.selected = null;
  s.shotsSinceDescent = 0;
  s.flying = null;
  buildBoard(s);
  return true;
}

// ---------------------------------------------------------------- ngắm và bắn

export const launcherPoint = (spec: BubbleSpec = BUBBLE_SPEC, out: Point = { x: 0, y: 0 }): Point => {
  out.x = spec.width / 2;
  out.y = spec.limitRow * spec.rowH + 1.5;
  return out;
};

export const clampAngle = (angle: number, spec: BubbleSpec = BUBBLE_SPEC): number => Math.min(spec.maxAngle, Math.max(spec.minAngle, angle));

/** Chọn loại trứng ở máy bắn (chỉ số trong mẫu công khai của đợt); loại không còn trên bàn thì không chọn được. Trả về true nếu chọn được */
export function selectType(s: BubbleState, i: number): boolean {
  if (s.phase !== 'play' || s.flying) return false;
  const v = planOf(s).values[i];
  if (v === undefined || !presentValues(s).has(v)) return false;
  s.selected = i;
  return true;
}

export const canShoot = (s: BubbleState): boolean => s.phase === 'play' && s.flying === null && s.selected !== null;

/**
 * Đường bay của trứng bắn từ máy bắn theo góc `angle` (độ, 90 là thẳng lên) trên bàn hiện tại: nảy tường trái phải, dừng khi chạm trần hoặc gần một quả trứng.
 * `maxBounces` giới hạn số lần nảy tường lấy vào đường (vạch ngắm chỉ cần tới lần nảy đầu). Điểm cuối là chỗ trứng dừng.
 */
export function tracePath(s: BubbleState, angle: number, maxBounces = 12): Point[] {
  const spec = s.spec;
  const a = (clampAngle(angle, spec) * Math.PI) / 180;
  const R = 0.5;
  const left = R;
  const right = spec.width - R;
  const d = { x: Math.cos(a), y: -Math.sin(a) };
  const p = launcherPoint(spec);
  const path: Point[] = [{ x: p.x, y: p.y }];
  const hit2 = spec.hitDist * spec.hitDist;
  const c = { x: 0, y: 0 };
  for (let seg = 0; seg <= maxBounces; seg++) {
    const tCeil = (R + s.lowered * spec.rowH - p.y) / d.y;
    const tWall = d.x > 1e-9 ? (right - p.x) / d.x : d.x < -1e-9 ? (left - p.x) / d.x : Infinity;
    let tEgg = Infinity;
    const tMax = Math.min(tCeil, tWall);
    // chỉ xét các hàng quanh đoạn bay: lọc thô theo y
    for (let r = 0; r < s.board.length; r++) {
      const row = s.board[r];
      const cy = 0.5 + (r + s.lowered) * spec.rowH;
      if (cy > p.y + 1.1) break;
      const dy0 = p.y - cy;
      const dy1 = p.y + d.y * tMax - cy;
      if (dy0 > 1.1 && dy1 > 1.1) continue;
      if (dy0 < -1.1 && dy1 < -1.1) continue;
      for (let col = 0; col < row.length; col++) {
        if (row[col] === null) continue;
        cellCenter(s.shift, r, col, c, s.lowered);
        const fx = p.x - c.x;
        const fy = p.y - c.y;
        const b = fx * d.x + fy * d.y;
        const q = fx * fx + fy * fy - hit2;
        const disc = b * b - q;
        if (disc < 0) continue;
        const t = -b - Math.sqrt(disc);
        if (t >= 0 && t < tEgg) tEgg = t;
        else if (q <= 0 && tEgg > 0) tEgg = 0;
      }
    }
    const t = Math.min(tMax, tEgg);
    p.x += d.x * t;
    p.y += d.y * t;
    path.push({ x: p.x, y: p.y });
    if (t === tEgg || t === tCeil || seg === maxBounces) break;
    d.x = -d.x;
  }
  return path;
}

/** Ô trống gần chỗ dừng `stop` nhất mà trứng có thể dính vào (hàng 0, hoặc kề một quả trứng) */
export function snapCell(s: BubbleState, stop: Point): Cell {
  const rowH = s.spec.rowH;
  const r0 = Math.max(0, Math.round((stop.y - 0.5) / rowH) - s.lowered);
  const tmp = { x: 0, y: 0 };
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let radius = 1; radius <= 4 && best === null; radius++) {
    for (let r = Math.max(0, r0 - radius); r <= r0 + radius; r++) {
      const w = rowWidth(s.shift, r);
      for (let c = 0; c < w; c++) {
        if (valueAt(s, r, c) !== null) continue;
        const anchored = r === 0 || neighbors(s.shift, r, c).some((n) => valueAt(s, n.r, n.c) !== null);
        if (!anchored) continue;
        cellCenter(s.shift, r, c, tmp, s.lowered);
        const dd = (tmp.x - stop.x) ** 2 + (tmp.y - stop.y) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = { r, c };
        }
      }
    }
  }
  return best ?? { r: r0, c: 0 };
}

const pathLength = (path: readonly Point[]): number => {
  let n = 0;
  for (let i = 1; i < path.length; i++) n += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return n;
};

/** Bắn một phát theo góc `angle`. Cần đã chọn loại trứng ở máy bắn (`canShoot`); chưa chọn thì không bắn và trả null. Kết quả chỉ áp lên bàn khi gọi `land` */
export function shoot(s: BubbleState, angle: number): Flying | null {
  if (!canShoot(s)) return null;
  const a = clampAngle(angle, s.spec);
  const path = tracePath(s, a);
  const cell = snapCell(s, path[path.length - 1]);
  s.flying = { value: planOf(s).values[s.selected as number], angle: a, path, length: pathLength(path), cell };
  s.stats.shots++;
  return s.flying;
}

/** Toạ độ điểm cách đầu đường `dist` đơn vị (dùng cho hoạt cảnh; ghi vào `out`) */
export function pointAlong(path: readonly Point[], dist: number, out: Point = { x: 0, y: 0 }): Point {
  let left = dist;
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
    if (left <= seg || i === path.length - 1) {
      const t = seg === 0 ? 1 : Math.min(1, left / seg);
      out.x = path[i - 1].x + (path[i].x - path[i - 1].x) * t;
      out.y = path[i - 1].y + (path[i].y - path[i - 1].y) * t;
      return out;
    }
    left -= seg;
  }
  out.x = path[0].x;
  out.y = path[0].y;
  return out;
}

// ---------------------------------------------------------------- áp kết quả

/** Các ô còn nối được với trần (đi qua ô kề có trứng bắt đầu từ hàng 0) */
export function anchoredSet(s: BubbleState): Set<number> {
  const seen = new Set<number>();
  const queue: Cell[] = [];
  for (let c = 0; c < (s.board[0]?.length ?? 0); c++) {
    if (s.board[0][c] !== null) {
      seen.add(c);
      queue.push({ r: 0, c });
    }
  }
  for (let i = 0; i < queue.length; i++) {
    for (const n of neighbors(s.shift, queue[i].r, queue[i].c)) {
      const key = n.r * 32 + n.c;
      if (seen.has(key) || valueAt(s, n.r, n.c) === null) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

function dropFloaters(s: BubbleState, ev: BubbleEvent[], score: boolean): void {
  const anchored = anchoredSet(s);
  const cells: (Cell & { value: number })[] = [];
  for (let r = 0; r < s.board.length; r++) {
    for (let c = 0; c < s.board[r].length; c++) {
      const v = s.board[r][c];
      if (v !== null && !anchored.has(r * 32 + c)) {
        cells.push({ r, c, value: v });
        s.board[r][c] = null;
      }
    }
  }
  if (cells.length === 0) return;
  if (score) s.stats.dropped += cells.length;
  ev.push({ type: 'drop', cells });
}

/** Hàng thấp nhất còn trứng (tính từ tấm trần); -1 nếu bàn trống */
const lowestCell = (s: BubbleState): number => {
  for (let r = s.board.length - 1; r >= 0; r--) if (s.board[r].some((v) => v !== null)) return r;
  return -1;
};

/** Trứng chạm dây giới hạn: mất 1 tim, xóa các hàng dưới cùng (lặp tới khi không còn trứng chạm dây) */
function checkLimit(s: BubbleState, ev: BubbleEvent[]): void {
  if (lowestCell(s) + s.lowered < s.spec.limitRow) return;
  let cleared = 0;
  while (lowestCell(s) >= 0 && lowestCell(s) + s.lowered >= s.spec.limitRow) {
    for (let k = 0; k < s.spec.penaltyRows; k++) {
      const r = lowestCell(s);
      if (r < 0) break;
      cleared += s.board[r].filter((v) => v !== null).length;
      s.board[r].fill(null);
    }
  }
  trimRows(s);
  s.hearts--;
  s.stats.heartsLost++;
  ev.push({ type: 'heart', cleared });
  dropFloaters(s, ev, false);
}

function descend(s: BubbleState, ev: BubbleEvent[]): void {
  s.lowered++;
  s.stats.descents++;
  ev.push({ type: 'descend' });
}

function afterBoardChange(s: BubbleState, ev: BubbleEvent[]): boolean {
  if (s.hearts <= 0) {
    s.phase = 'ended';
    s.end = 'hearts';
    ev.push({ type: 'end', reason: 'hearts' });
    return true;
  }
  if (eggCount(s) === 0) {
    s.stats.roundsCleared++;
    ev.push({ type: 'roundClear', round: s.round });
    if (s.round >= s.spec.rounds.length - 1) {
      s.phase = 'ended';
      s.end = 'win';
      ev.push({ type: 'end', reason: 'win' });
    } else {
      s.round++;
      s.phase = 'load';
      s.load = { picked: [], failed: false };
      s.board = [];
      s.shift = 0;
      s.lowered = 0;
      s.selected = null;
    }
    return true;
  }
  return false;
}

/** Trứng đang bay tới nơi: dính vào ô, vỡ cụm, thả trứng rơi, hạ bàn khi đủ phát, trừ tim khi chạm dây. Trả về các sự kiện theo thứ tự để vẽ */
export function land(s: BubbleState): BubbleEvent[] {
  const f = s.flying;
  const ev: BubbleEvent[] = [];
  if (!f) return ev;
  s.flying = null;
  ensureRow(s, f.cell.r);
  s.board[f.cell.r][f.cell.c] = f.value;
  ev.push({ type: 'land', cell: f.cell, value: f.value });
  const group = groupAt(s, f.cell.r, f.cell.c);
  if (group.length >= s.spec.minGroup) {
    for (const g of group) s.board[g.r][g.c] = null;
    // trứng em bắn không tính điểm vỡ (chỉ tính trứng đã nằm trên bàn), để bắn thừa không được thêm điểm
    s.stats.popped += group.length - 1;
    ev.push({ type: 'pop', cells: group, value: f.value });
    dropFloaters(s, ev, true);
  }
  trimRows(s);
  // loại đang chọn không còn trên bàn thì bỏ chọn
  const present = presentValues(s);
  if (s.selected !== null && !present.has(planOf(s).values[s.selected])) s.selected = null;
  if (eggCount(s) > 0) checkLimit(s, ev);
  if (afterBoardChange(s, ev)) return ev;
  s.shotsSinceDescent++;
  if (s.shotsSinceDescent >= s.spec.rounds[s.round].descendEvery) {
    s.shotsSinceDescent = 0;
    descend(s, ev);
    checkLimit(s, ev);
    if (afterBoardChange(s, ev)) return ev;
  }
  const after = presentValues(s);
  if (s.selected !== null && !after.has(planOf(s).values[s.selected])) s.selected = null;
  return ev;
}

/** Bắn rồi áp kết quả ngay (bot và test); null nếu chưa bắn được */
export function shootAndLand(s: BubbleState, angle: number): BubbleEvent[] | null {
  if (!shoot(s, angle)) return null;
  return land(s);
}

/** Số phát còn lại trước lần hạ bàn kế tiếp */
export const shotsToDescend = (s: BubbleState): number => s.spec.rounds[Math.min(s.round, s.spec.rounds.length - 1)].descendEvery - s.shotsSinceDescent;

/** Điểm: trứng vỡ × 10 + trứng rơi × 20 + 30 mỗi đợt nạp không sai + 100 mỗi đợt xong + tim còn × 50 (cộng lúc hết ván) */
export function bubbleScore(s: BubbleState): number {
  const p = s.spec.points;
  const base = s.stats.popped * p.pop + s.stats.dropped * p.drop + s.stats.cleanLoads * p.cleanLoad + s.stats.roundsCleared * p.round;
  return base + (s.phase === 'ended' ? Math.max(0, s.hearts) * p.heart : 0);
}
