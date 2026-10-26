/**
 * Kế hoạch diễn hoạt màn 11 (hàm thuần, không import three): đổi DANH SÁCH SỰ KIỆN mà logic trả về (`match3Logic.ts`) thành một dòng thời gian cho cảnh. Không tính lại luật: mọi vị trí, loại lá, ô cây lấp,
 * lá giả đều lấy từ sự kiện; ở đây chỉ quyết định thời lượng và chuyển động.
 *
 * Bàn hiển thị là `BoardView`: 49 miếng (`TileState`, mỗi miếng một mesh trong cảnh) và `grid[r][c]` là chỉ số miếng đang ở ô đó (−1: trống). `planEvents(view, events)` trả về:
 *  - `tracks`: với từng miếng bị đụng tới, các khóa (thời điểm, hàng và cột có thể lẻ, độ phóng, độ trong) và các lần đổi mặt (loại lá, lá giả, ô gió, hoa sen) theo thời điểm;
 *  - `flights`: lá bay từ bàn lên ô cây, lá giả {phanDien} ném vào bàn; `bursts`: vòng nổ; `villain`: độ cao {phanDien} ló ra rồi rụt lại;
 *  - `marks`: mốc thời gian để phát âm thanh và cập nhật cây (ô lấp, gộp cành, gốc, hết vòng).
 * và `view` đã ở trạng thái CUỐI (khớp bàn của logic). Cảnh chỉ việc lấy mẫu dòng thời gian theo giờ (`sampleTrack`), không cấp phát trong `useFrame`.
 *
 * "Giảm chuyển động": không nảy, nổ và rơi bằng mờ dần nhanh, lá không bay vòng (dịch thẳng), không vòng nổ.
 */
import type { Board, Cell, Match3Event, Pos } from './match3Logic';

// ---------------------------------------------------------------------------
// Bàn hiển thị

export type FaceKind = 'leaf' | 'fake' | 'wind';

/** Mặt của một miếng: lá thường (loại 0, 1, …), lá giả hay ô gió xoáy; `lotus` là hoa sen phủ lên lá. */
export interface Face {
  kind: FaceKind;
  leaf: number;
  lotus: boolean;
}

export interface TileState extends Face {
  /** Hàng và cột (đơn vị ô, có thể lẻ hay âm lúc đang rơi) */
  r: number;
  c: number;
  s: number;
  a: number;
}

export interface BoardView {
  rows: number;
  cols: number;
  tiles: TileState[];
  /** Chỉ số miếng ở từng ô, −1 nếu trống */
  grid: number[][];
}

export const faceOf = (x: Cell): Face => ({ kind: x.kind, leaf: x.leaf, lotus: x.lotus });

/** Số hiệu hình nền của mặt: lá loại k → k; lá giả → `FAKE_FACE`; ô gió → `WIND_FACE`. */
export const FAKE_FACE = 6;
export const WIND_FACE = 7;
export const faceId = (f: Face): number => (f.kind === 'fake' ? FAKE_FACE : f.kind === 'wind' ? WIND_FACE : f.leaf);

/** Bàn hiển thị khớp một bàn của logic: miếng i nằm ở hàng ⌊i / cột⌋, cột i mod cột. */
export function viewFromBoard(board: Board): BoardView {
  const rows = board.length;
  const cols = rows ? board[0].length : 0;
  const tiles: TileState[] = [];
  const grid: number[][] = [];
  for (let r = 0; r < rows; r++) {
    grid.push([]);
    for (let c = 0; c < cols; c++) {
      grid[r].push(tiles.length);
      tiles.push({ ...faceOf(board[r][c]), r, c, s: 1, a: 1 });
    }
  }
  return { rows, cols, tiles, grid };
}

export function cloneView(v: BoardView): BoardView {
  return { rows: v.rows, cols: v.cols, tiles: v.tiles.map((t) => ({ ...t })), grid: v.grid.map((row) => [...row]) };
}

/** Bàn hiển thị có khớp bàn của logic không (mặt, vị trí đúng ô, đủ lớn, đủ rõ). Trả về chuỗi mô tả chỗ lệch, hoặc null nếu khớp. */
export function viewMismatch(v: BoardView, board: Board): string | null {
  for (let r = 0; r < v.rows; r++) {
    for (let c = 0; c < v.cols; c++) {
      const id = v.grid[r][c];
      if (id < 0) return `empty at ${r},${c}`;
      const t = v.tiles[id];
      const x = board[r][c];
      if (t.kind !== x.kind || t.leaf !== x.leaf || t.lotus !== x.lotus) return `face at ${r},${c}: ${t.kind}${t.leaf}${t.lotus ? 'L' : ''} vs ${x.kind}${x.leaf}${x.lotus ? 'L' : ''}`;
      if (Math.abs(t.r - r) > 1e-9 || Math.abs(t.c - c) > 1e-9) return `position at ${r},${c}: ${t.r},${t.c}`;
      if (Math.abs(t.s - 1) > 1e-9 || Math.abs(t.a - 1) > 1e-9) return `scale/alpha at ${r},${c}: ${t.s},${t.a}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dòng thời gian

export type Ease = 0 | 1 | 2;
/** Khóa chuyển động: giữa hai khóa nội suy tuyến tính rồi làm mượt theo `e` của khóa SAU (0 đều, 1 chậm dần, 2 nhanh dần). */
export interface Key {
  t: number;
  r: number;
  c: number;
  s: number;
  a: number;
  e: Ease;
}
export interface FaceKey extends Face {
  t: number;
}
export interface TileTrack {
  id: number;
  keys: Key[];
  faces: FaceKey[];
  /** Con trỏ lấy mẫu (đổi khi phát; đặt lại bằng `resetTimeline`) */
  ki: number;
  fi: number;
}

export interface Flight {
  kind: 'slot' | 'fake';
  /** Loại lá bay (lá giả: bỏ qua) */
  leaf: number;
  t0: number;
  t1: number;
  /** Nơi xuất phát: ô của bàn (hàng, cột), hay `null` là chỗ {phanDien} ló ra */
  from: { r: number; c: number } | null;
  /** Ô cây đích (lá lên cây) */
  slot: number;
  /** Ô bàn đích (lá giả ném vào) */
  to: { r: number; c: number } | null;
  /** Độ cong của đường bay (đơn vị thế giới, 0 là bay thẳng) */
  arc: number;
}

export interface Burst {
  t0: number;
  r: number;
  c: number;
  leaf: number;
  lotus: boolean;
}

export interface VillainKey {
  t: number;
  /** 0 ẩn dưới mép khung, 1 ló ra: cảnh nội suy giữa hai độ cao của bố cục */
  k: number;
  e: Ease;
}

export type MarkType = 'swap' | 'swapBack' | 'clear' | 'lotus' | 'wind' | 'fakeGone' | 'slot' | 'branch' | 'tree' | 'fall' | 'fill' | 'swing' | 'throw' | 'land' | 'cheer' | 'shuffle' | 'roundEnd' | 'roundStart' | 'gameEnd';

export interface Mark {
  t: number;
  type: MarkType;
  /** Ô cây (`slot`), mức và chỉ số cành (`branch`) */
  slot?: number;
  level?: number;
  index?: number;
  root?: boolean;
  leaf?: number;
  /** Số lá nổ (`clear`) */
  count?: number;
  /** Hết vòng: xong cây không, lượt dư, thưởng */
  done?: boolean;
  bonus?: number;
  turnsLeft?: number;
  round?: number;
}

export interface Timeline {
  /** Mili giây tới lúc xong mọi thứ */
  duration: number;
  tracks: TileTrack[];
  flights: Flight[];
  bursts: Burst[];
  villain: VillainKey[];
  marks: Mark[];
}

export const emptyTimeline = (): Timeline => ({ duration: 0, tracks: [], flights: [], bursts: [], villain: [], marks: [] });

/** Đặt lại con trỏ lấy mẫu (khi phát từ đầu). */
export function resetTimeline(tl: Timeline): void {
  for (const tr of tl.tracks) {
    tr.ki = 0;
    tr.fi = 0;
  }
}

// ---------------------------------------------------------------------------
// Thời lượng (ms): bình thường và "Giảm chuyển động"

export interface Durations {
  swap: number;
  swapBack: number;
  /** Nghỉ giữa hai đợt nổ liền nhau */
  gap: number;
  clear: number;
  /** Mỗi cột cách nhau chừng này khi hoa sen quét cả hàng */
  sweep: number;
  pop: number;
  flight: number;
  flightStagger: number;
  branchStep: number;
  treeDone: number;
  /** Cây đã xong: giữ cây đầy và gốc sáng thêm chừng này (ms) cho em nhìn rõ rồi mới hiện hộp hết vòng */
  treeHold: number;
  fallBase: number;
  fallPerRow: number;
  fallMax: number;
  bounce: number;
  fillBase: number;
  fillPerRow: number;
  shuffle: number;
  villainIn: number;
  /** Từ lúc ló ra tới lúc bắt đầu vung tay */
  swingAfter: number;
  /** Từ lúc bắt đầu vung tới lúc lá rời tay */
  release: number;
  throwFlight: number;
  cheer: number;
  villainOut: number;
  roundEnd: number;
}

export const NORMAL: Durations = {
  swap: 160,
  swapBack: 160,
  gap: 60,
  clear: 260,
  sweep: 30,
  pop: 220,
  flight: 560,
  flightStagger: 70,
  branchStep: 170,
  treeDone: 260,
  treeHold: 1400,
  fallBase: 120,
  fallPerRow: 70,
  fallMax: 430,
  bounce: 130,
  fillBase: 130,
  fillPerRow: 70,
  shuffle: 340,
  villainIn: 420,
  swingAfter: 90,
  release: 160,
  throwFlight: 460,
  cheer: 700,
  villainOut: 320,
  roundEnd: 220,
};

export const REDUCED: Durations = {
  swap: 70,
  swapBack: 70,
  gap: 30,
  clear: 90,
  sweep: 0,
  pop: 0,
  flight: 230,
  flightStagger: 40,
  branchStep: 90,
  treeDone: 120,
  treeHold: 500,
  fallBase: 90,
  fallPerRow: 0,
  fallMax: 90,
  bounce: 0,
  fillBase: 90,
  fillPerRow: 0,
  shuffle: 150,
  villainIn: 140,
  swingAfter: 40,
  release: 160,
  throwFlight: 230,
  cheer: 350,
  villainOut: 150,
  roundEnd: 120,
};

// ---------------------------------------------------------------------------
// Kế hoạch

class Planner {
  readonly view: BoardView;
  readonly start: TileState[];
  readonly tl: Timeline = emptyTimeline();
  private readonly trackOf = new Map<number, TileTrack>();
  private readonly d: Durations;
  private readonly reduced: boolean;
  /** Đồng hồ chính (ms) */
  T = 0;
  /** Lúc xong các hoạt cảnh chạy song song (lá bay, cây, {phanDien}) */
  tail = 0;

  constructor(view: BoardView, reduced: boolean) {
    this.view = cloneView(view);
    this.start = view.tiles.map((t) => ({ ...t }));
    this.reduced = reduced;
    this.d = reduced ? REDUCED : NORMAL;
  }

  private track(id: number): TileTrack {
    let tr = this.trackOf.get(id);
    if (!tr) {
      const s = this.start[id];
      tr = { id, keys: [{ t: 0, r: s.r, c: s.c, s: s.s, a: s.a, e: 0 }], faces: [{ t: 0, kind: s.kind, leaf: s.leaf, lotus: s.lotus }], ki: 0, fi: 0 };
      this.trackOf.set(id, tr);
      this.tl.tracks.push(tr);
    }
    return tr;
  }

  /** Giữ nguyên trạng thái tới `t` (để đoạn chuyển động sau bắt đầu đúng lúc). */
  private hold(tr: TileTrack, t: number): void {
    const last = tr.keys[tr.keys.length - 1];
    if (last.t < t) tr.keys.push({ ...last, t, e: 0 });
  }

  /** Miếng `id` chuyển tới trạng thái mới từ `t0` tới `t1`. Cập nhật luôn trạng thái cuối của bàn hiển thị. */
  private tween(id: number, t0: number, t1: number, to: Partial<Pick<TileState, 'r' | 'c' | 's' | 'a'>>, e: Ease = 1): void {
    const tr = this.track(id);
    const last = tr.keys[tr.keys.length - 1];
    const from = Math.max(t0, last.t);
    this.hold(tr, from);
    const tile = this.view.tiles[id];
    Object.assign(tile, to);
    tr.keys.push({ t: Math.max(t1, from), r: tile.r, c: tile.c, s: tile.s, a: tile.a, e });
  }

  private setFace(id: number, t: number, f: Face): void {
    const tr = this.track(id);
    const tile = this.view.tiles[id];
    tile.kind = f.kind;
    tile.leaf = f.leaf;
    tile.lotus = f.lotus;
    tr.faces.push({ t, kind: f.kind, leaf: f.leaf, lotus: f.lotus });
  }

  private mark(t: number, m: Omit<Mark, 't'>): void {
    this.tl.marks.push({ t, ...m });
    this.tail = Math.max(this.tail, t);
  }

  private at(p: Pos): number {
    return this.view.grid[p[0]][p[1]];
  }

  /** Hai miếng ở `a` và `b` đổi chỗ. */
  private swap(a: Pos, b: Pos, dur: number): void {
    const ia = this.at(a);
    const ib = this.at(b);
    this.view.grid[a[0]][a[1]] = ib;
    this.view.grid[b[0]][b[1]] = ia;
    if (ia >= 0) this.tween(ia, this.T, this.T + dur, { r: b[0], c: b[1] }, 1);
    if (ib >= 0) this.tween(ib, this.T, this.T + dur, { r: a[0], c: a[1] }, 1);
  }

  private pop(id: number, t: number): void {
    if (this.reduced) return;
    this.tween(id, t, t + this.d.pop * 0.45, { s: 1.32 }, 1);
    this.tween(id, t + this.d.pop * 0.45, t + this.d.pop, { s: 1 }, 2);
  }

  run(events: readonly Match3Event[]): void {
    const d = this.d;
    let phaseStart = 0;
    let lastLand = 0;
    let lastBranch = 0;
    let slotCount = 0;
    let waveSeen = 0;
    let treeAt = -1;
    for (const e of events) {
      switch (e.type) {
        case 'swap':
          this.mark(this.T, { type: 'swap' });
          this.swap(e.a, e.b, d.swap);
          this.T += d.swap;
          break;
        case 'swapBack':
          this.mark(this.T, { type: 'swapBack' });
          this.swap(e.a, e.b, d.swapBack);
          this.T += d.swapBack;
          break;
        case 'wave':
          if (waveSeen > 0) this.T += d.gap;
          waveSeen++;
          slotCount = 0;
          break;
        case 'spawnLotus': {
          const id = this.at(e.pos);
          this.setFace(id, this.T, { kind: 'leaf', leaf: e.leaf, lotus: true });
          this.pop(id, this.T);
          this.mark(this.T, { type: 'lotus', leaf: e.leaf });
          break;
        }
        case 'spawnWind': {
          const id = this.at(e.pos);
          this.setFace(id, this.T, { kind: 'wind', leaf: -1, lotus: false });
          this.pop(id, this.T);
          this.mark(this.T, { type: 'wind' });
          break;
        }
        case 'clear': {
          phaseStart = this.T;
          const sweepRows = new Set(e.lotusRows);
          let end = phaseStart + d.clear;
          for (const cell of e.cells) {
            const id = this.at(cell.pos);
            if (id < 0) continue;
            const delay = sweepRows.has(cell.pos[0]) ? cell.pos[1] * d.sweep : 0;
            const t0 = phaseStart + delay;
            if (this.reduced) this.tween(id, t0, t0 + d.clear, { a: 0 }, 0);
            else {
              this.tween(id, t0, t0 + d.clear * 0.4, { s: cell.kind === 'lotus' ? 1.4 : 1.25 }, 1);
              this.tween(id, t0 + d.clear * 0.4, t0 + d.clear, { s: 0, a: 0 }, 2);
              this.tl.bursts.push({ t0, r: cell.pos[0], c: cell.pos[1], leaf: cell.leaf, lotus: cell.kind === 'lotus' });
            }
            this.view.grid[cell.pos[0]][cell.pos[1]] = -1;
            end = Math.max(end, t0 + d.clear);
          }
          this.mark(phaseStart, { type: 'clear', count: e.cells.length });
          this.T = end;
          break;
        }
        case 'fakeGone': {
          const id = this.at(e.pos);
          if (id < 0) break;
          const t0 = phaseStart;
          if (this.reduced) this.tween(id, t0, t0 + d.clear, { a: 0 }, 0);
          else {
            this.tween(id, t0, t0 + d.clear * 0.4, { s: 1.15 }, 1);
            this.tween(id, t0 + d.clear * 0.4, t0 + d.clear, { s: 0, a: 0 }, 2);
          }
          this.view.grid[e.pos[0]][e.pos[1]] = -1;
          this.mark(t0, { type: 'fakeGone' });
          break;
        }
        case 'slotFilled': {
          const t0 = phaseStart + d.clear * 0.15 + slotCount * d.flightStagger;
          slotCount++;
          const t1 = t0 + d.flight;
          this.tl.flights.push({ kind: 'slot', leaf: e.leaf, t0, t1, from: { r: e.from[0], c: e.from[1] }, slot: e.slot, to: null, arc: this.reduced ? 0 : 1.4 });
          this.mark(t1, { type: 'slot', slot: e.slot, leaf: e.leaf });
          lastLand = t1;
          lastBranch = t1;
          break;
        }
        case 'branchMerged': {
          const t = lastLand + d.branchStep * e.level;
          lastBranch = Math.max(lastBranch, t);
          this.mark(t, { type: 'branch', level: e.level, index: e.index, root: e.root });
          break;
        }
        case 'treeDone':
          treeAt = Math.max(lastLand, lastBranch) + d.treeDone;
          this.mark(treeAt, { type: 'tree' });
          break;
        case 'fall': {
          let maxD = 0;
          for (const m of e.moves) {
            const id = this.view.grid[m.from][m.col];
            if (id < 0) continue;
            const dist = m.to - m.from;
            const dur = this.reduced ? d.fallBase : Math.min(d.fallMax, d.fallBase + d.fallPerRow * dist);
            this.view.grid[m.from][m.col] = -1;
            this.view.grid[m.to][m.col] = id;
            if (this.reduced) {
              // "Giảm chuyển động": không rơi, lá mờ dần ở chỗ cũ rồi hiện lại đúng chỗ mới
              const half = dur / 2;
              this.tween(id, this.T, this.T + half, { a: 0 }, 0);
              this.tween(id, this.T + half, this.T + half, { r: m.to }, 0);
              this.tween(id, this.T + half, this.T + dur, { a: 1 }, 0);
            } else this.tween(id, this.T, this.T + dur, { r: m.to }, 2);
            if (!this.reduced && d.bounce > 0) {
              this.tween(id, this.T + dur, this.T + dur + d.bounce * 0.45, { s: 1.1 }, 1);
              this.tween(id, this.T + dur + d.bounce * 0.45, this.T + dur + d.bounce, { s: 1 }, 2);
            }
            maxD = Math.max(maxD, dur);
          }
          this.mark(this.T, { type: 'fall' });
          this.T += maxD;
          break;
        }
        case 'fill': {
          const free: number[] = [];
          const used = new Set<number>();
          for (const row of this.view.grid) for (const id of row) if (id >= 0) used.add(id);
          for (let id = 0; id < this.view.tiles.length; id++) if (!used.has(id)) free.push(id);
          const perCol = new Map<number, number>();
          for (const f of e.cells) perCol.set(f.pos[1], (perCol.get(f.pos[1]) ?? 0) + 1);
          let maxD = 0;
          for (const f of e.cells) {
            const id = free.pop();
            if (id === undefined) throw new Error('No free tile for a new leaf');
            const m = perCol.get(f.pos[1]) ?? 1;
            const dur = this.reduced ? d.fillBase : d.fillBase + d.fillPerRow * m;
            const tile = this.view.tiles[id];
            // vị trí ban đầu: trên đầu bàn (các lá mới xếp chồng phía trên hàng 0), trong suốt
            const r0 = this.reduced ? f.pos[0] : f.pos[0] - m;
            this.track(id);
            Object.assign(tile, { r: r0, c: f.pos[1], s: 1, a: 0 });
            this.setFace(id, this.T, { kind: 'leaf', leaf: f.leaf, lotus: false });
            const tr = this.track(id);
            this.hold(tr, this.T);
            tr.keys.push({ t: this.T, r: r0, c: f.pos[1], s: 1, a: 0, e: 0 });
            this.view.grid[f.pos[0]][f.pos[1]] = id;
            if (this.reduced) this.tween(id, this.T, this.T + dur, { r: f.pos[0], a: 1 }, 0);
            else {
              this.tween(id, this.T, this.T + dur * 0.3, { a: 1 }, 0);
              this.tween(id, this.T + dur * 0.3, this.T + dur, { r: f.pos[0] }, 2);
            }
            maxD = Math.max(maxD, dur);
          }
          this.mark(this.T, { type: 'fill' });
          this.T += maxD;
          break;
        }
        case 'throwFake': {
          const t0 = this.T;
          this.tl.villain.push({ t: t0, k: 0, e: 0 }, { t: t0 + d.villainIn, k: 1, e: 1 });
          const tSwing = t0 + d.villainIn + d.swingAfter;
          this.mark(tSwing, { type: 'swing' });
          const tRelease = tSwing + d.release;
          this.mark(tRelease, { type: 'throw' });
          const tLand = tRelease + d.throwFlight;
          this.tl.flights.push({ kind: 'fake', leaf: -1, t0: tRelease, t1: tLand, from: null, slot: -1, to: { r: e.pos[0], c: e.pos[1] }, arc: this.reduced ? 0 : 1.2 });
          const id = this.at(e.pos);
          this.setFace(id, tLand, { kind: 'fake', leaf: -1, lotus: false });
          this.pop(id, tLand);
          this.mark(tLand, { type: 'land' });
          this.mark(tLand + 60, { type: 'cheer' });
          const tOut = tLand + d.cheer;
          this.tl.villain.push({ t: tOut, k: 1, e: 0 }, { t: tOut + d.villainOut, k: 0, e: 2 });
          this.T = tOut + d.villainOut;
          break;
        }
        case 'shuffle': {
          const half = d.shuffle / 2;
          for (const f of e.cells) {
            const id = this.at(f.pos);
            if (id < 0) continue;
            if (this.reduced) {
              this.tween(id, this.T, this.T + half, { a: 0 }, 0);
              this.setFace(id, this.T + half, { kind: 'leaf', leaf: f.leaf, lotus: false });
              this.tween(id, this.T + half, this.T + d.shuffle, { a: 1 }, 0);
            } else {
              this.tween(id, this.T, this.T + half, { s: 0 }, 2);
              this.setFace(id, this.T + half, { kind: 'leaf', leaf: f.leaf, lotus: false });
              this.tween(id, this.T + half, this.T + d.shuffle, { s: 1 }, 1);
            }
          }
          this.mark(this.T, { type: 'shuffle' });
          this.T += d.shuffle;
          break;
        }
        case 'roundEnd': {
          // cây xong: hộp hết vòng chỉ hiện khi mọi hoạt cảnh đã xong VÀ cây đầy, gốc sáng đã được giữ ít nhất `treeHold` kể từ mốc gốc sáng (cây thấy rõ)
          const t = Math.max(Math.max(this.T, this.tail) + d.roundEnd, e.done && treeAt >= 0 ? treeAt + d.treeHold : 0);
          this.mark(t, { type: 'roundEnd', done: e.done, bonus: e.bonus, turnsLeft: e.turnsLeft, round: e.round });
          break;
        }
        case 'roundStart':
          this.mark(Math.max(this.T, this.tail), { type: 'roundStart', round: e.round });
          break;
        case 'gameEnd':
          this.mark(Math.max(this.T, this.tail), { type: 'gameEnd' });
          break;
      }
    }
    const tl = this.tl;
    let end = Math.max(this.T, this.tail);
    for (const f of tl.flights) end = Math.max(end, f.t1);
    for (const tr of tl.tracks) end = Math.max(end, tr.keys[tr.keys.length - 1].t);
    for (const v of tl.villain) end = Math.max(end, v.t);
    tl.duration = end;
    tl.marks.sort((p, q) => p.t - q.t);
    // trạng thái cuối của mọi miếng phải nằm đúng chỗ (kể cả miếng không có đường đi)
    for (const tr of tl.tracks) {
      const tile = this.view.tiles[tr.id];
      const last = tr.keys[tr.keys.length - 1];
      if (last.t < end) tr.keys.push({ t: end, r: tile.r, c: tile.c, s: tile.s, a: tile.a, e: 0 });
    }
  }
}

/**
 * Lập dòng thời gian cho các sự kiện của MỘT thao tác (kết quả của `swapCells`, hay `settleBoard`, `advanceRound`) từ bàn hiển thị `view` (không đổi); trả về bàn hiển thị ở trạng thái cuối.
 * `reduced` là "Giảm chuyển động".
 */
export function planEvents(view: BoardView, events: readonly Match3Event[], reduced = false): { timeline: Timeline; view: BoardView } {
  const p = new Planner(view, reduced);
  p.run(events);
  return { timeline: p.tl, view: p.view };
}

// ---------------------------------------------------------------------------
// Lấy mẫu (cảnh gọi mỗi khung hình, không cấp phát)

export interface Sample {
  r: number;
  c: number;
  s: number;
  a: number;
  /** Số hiệu hình nền (`faceId`) */
  face: number;
  lotus: boolean;
}

export const newSample = (): Sample => ({ r: 0, c: 0, s: 1, a: 1, face: 0, lotus: false });

const ease = (u: number, e: Ease): number => (e === 1 ? 1 - (1 - u) * (1 - u) : e === 2 ? u * u : u);

/** Trạng thái của một miếng ở thời điểm `t` (ms từ lúc bắt đầu dòng thời gian); con trỏ trong `tr` chỉ tiến (phát lại thì gọi `resetTimeline`). */
export function sampleTrack(tr: TileTrack, t: number, out: Sample): void {
  const ks = tr.keys;
  let i = tr.ki;
  if (i >= ks.length || ks[i].t > t) i = 0;
  while (i + 1 < ks.length && ks[i + 1].t <= t) i++;
  tr.ki = i;
  const a = ks[i];
  const b = i + 1 < ks.length ? ks[i + 1] : null;
  if (!b || b.t <= a.t) {
    out.r = a.r;
    out.c = a.c;
    out.s = a.s;
    out.a = a.a;
  } else {
    const u = ease(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))), b.e);
    out.r = a.r + (b.r - a.r) * u;
    out.c = a.c + (b.c - a.c) * u;
    out.s = a.s + (b.s - a.s) * u;
    out.a = a.a + (b.a - a.a) * u;
  }
  const fs = tr.faces;
  let j = tr.fi;
  if (j >= fs.length || fs[j].t > t) j = 0;
  while (j + 1 < fs.length && fs[j + 1].t <= t) j++;
  tr.fi = j;
  out.face = faceId(fs[j]);
  out.lotus = fs[j].lotus;
}

/** Độ ló của {phanDien} (0 ẩn, 1 ló ra) ở thời điểm `t`. */
export function villainAt(keys: readonly VillainKey[], t: number): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0].t) return keys[0].k;
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) return b.t <= a.t ? b.k : a.k + (b.k - a.k) * ease((t - a.t) / (b.t - a.t), b.e);
  }
  return keys[keys.length - 1].k;
}

/** Vị trí hàng/cột có thể lẻ → không dùng ngoài lấy mẫu; tiện ích cho test: mọi khóa có thời gian không giảm. */
export const keysSorted = (tl: Timeline): boolean => tl.tracks.every((tr) => tr.keys.every((k, i) => i === 0 || k.t >= tr.keys[i - 1].t) && tr.faces.every((f, i) => i === 0 || f.t >= tr.faces[i - 1].t));

/** Tiến đồng hồ hoạt cảnh (ms) thêm `dtMs` nhưng tối đa 100 ms mỗi khung (tab chậm không nhảy cóc); tạm dừng ("?" mở, tab ẩn) thì đứng yên. */
export const stepClock = (t: number, dtMs: number, paused: boolean, duration: number): number => (paused ? t : Math.min(duration, t + Math.min(100, Math.max(0, dtMs))));
