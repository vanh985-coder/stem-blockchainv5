/**
 * Logic màn 6 "Diều đưa sổ" (spec 06, mục "Màn 6"). Hàm thuần (không React, không Three); ngẫu nhiên chỉ qua `createMulberry32` và chỉ rút LÚC TẠO VÁN (toàn bộ khe, diều đen, trang bản sao
 * sinh sẵn), nên cùng seed cùng ván bất kể người chơi làm gì. Đơn vị thời gian là GIÂY: `dt` của `stepKite`, `time`, `inv`.
 *
 * Trạng thái ván:
 *  - `ready`: diều chờ, chưa chạy gì; lần bật đầu tiên (`flap`) bắt đầu ván (tự chọn, như Flappy Bird, để học sinh không rơi trước khi kịp chạm);
 *  - `play`: diều bay ngang với tốc độ tăng dần, rơi theo trọng lực, bật lên khi `flap`;
 *  - `quiz`: tới cổng làng, mọi chuyển động dừng, chờ `answerGate` (đếm giờ 20 giây và chọn câu hỏi do QuizCard/trang lo);
 *  - `ended`: hết ván (`ended` là 'complete' khi qua đủ cổng, 'hearts' khi hết tim).
 *
 * `stepKite` chia `dt` thành các bước cố định `KITE_SPEC.tick` (1/120 giây) nên kết quả không phụ thuộc tốc độ khung hình. Diều đứng yên theo x trong cảnh (cảnh cuộn); ở đây `x` là quãng diều đã bay.
 */
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { KITE_SPEC as C } from './kiteConfig';

const EPS = 1e-9;

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface BlackKite {
  /** Bám nửa trên hay nửa dưới của khe */
  side: 'top' | 'bottom';
  /** Pha dao động (radian) */
  phase: number;
  /** Bề rộng dải dao động (đơn vị) */
  range: number;
}

export interface Gap {
  /** Thứ tự khe, đếm từ 1 */
  k: number;
  /** Hoành độ tâm cặp cột */
  x: number;
  height: number;
  center: number;
  bottom: number;
  top: number;
  black: BlackKite | null;
  /** Độ cao tâm trang bản sao trong khe, hay null nếu khe không có trang */
  pageY: number | null;
}

export type KitePhase = 'ready' | 'play' | 'quiz' | 'ended';
export type KiteEnd = 'complete' | 'hearts';
export type HitReason = 'floor' | 'ceiling' | 'pillar' | 'black';
export type GateResult = 'correct' | 'wrong' | 'timeout';

export interface KiteStats {
  flaps: number;
  hits: number;
  hitsBy: Record<HitReason, number>;
  pagesTaken: number;
  correct: number;
  wrong: number;
}

export interface KiteState {
  seed: number;
  gaps: Gap[];
  /** Sau khe thứ bấy nhiêu có cổng (theo thứ tự cổng 1, 2, …) */
  gateAfter: readonly number[];
  /** Số bước cố định đã chạy trong pha `play`; `time` = ticks × tick (đồng hồ ván, dừng ở câu hỏi) */
  ticks: number;
  time: number;
  /** Phần `dt` chưa đủ một bước cố định */
  acc: number;
  phase: KitePhase;
  ended: KiteEnd | null;
  /** Vị trí diều: x là quãng đã bay, y là độ cao tâm diều; vy là vận tốc đứng (lên là dương) */
  x: number;
  y: number;
  vy: number;
  hearts: number;
  /** Còn bất tử bấy nhiêu giây */
  inv: number;
  /** Số khe đã bay qua (tâm khe đã qua sau lưng diều) = chỉ số của khe kế tiếp */
  passed: number;
  /** Số trang bản sao nhặt được; `pageTaken[i]` là khe i + 1 đã bị nhặt trang */
  pages: number;
  pageTaken: boolean[];
  /** Số câu đúng ở cổng */
  correct: number;
  /** Số cổng đã qua (đã trả lời) */
  gatesDone: number;
  score: number;
  stats: KiteStats;
}

export type KiteEvent =
  | { type: 'flap' }
  | { type: 'pass'; gap: number; speed: number }
  | { type: 'page'; gap: number }
  | { type: 'hit'; why: HitReason; hearts: number }
  | { type: 'gate'; gate: number }
  | { type: 'gateAnswer'; gate: number; result: GateResult; hearts: number }
  | { type: 'end'; reason: KiteEnd };

// ---------------------------------------------------------------------------
// Số liệu theo thứ tự khe (hàm thuần)

/** Chiều cao khe thứ `k` (đếm từ 1): max(2,4; 3,2 − 0,04 × k). Làm tròn 1e-9 để đúng 2,4 ở khe 20. */
export function gapHeight(k: number): number {
  const h = Math.round((C.gapHeight0 - C.gapShrink * k) * 1e9) / 1e9;
  return Math.max(C.gapHeightMin, h);
}

/** Hoành độ tâm cặp cột của khe thứ `k` (đếm từ 1). */
export function gapX(k: number): number {
  return C.firstGapX + C.gapSpacing * (k - 1);
}

/** Tốc độ ngang sau khi đã bay qua `passed` khe: 4 + 0,1 × khe, tối đa 6,5. */
export function speedAt(passed: number): number {
  return Math.min(C.speedMax, C.speed0 + C.speedStep * passed);
}

/** Bề rộng dải dao động của diều đen trong khe cao `height`: để phần trống còn lại luôn ≥ `minFree` (trừ 1e-9 cho khỏi sai số làm tròn). */
export function blackRange(height: number): number {
  return Math.max(0, height - C.black.height - C.black.minFree - EPS);
}

/** Hộp của diều đen của khe `gap` lúc `time` giây của ván; khe không có diều đen thì null. Diều đen dao động hình sin theo thời gian trong dải sát mép trên (hay mép dưới) của khe. */
export function blackBox(gap: Gap, time: number): Box | null {
  const b = gap.black;
  if (!b) return null;
  const off = b.range * (0.5 - 0.5 * Math.cos((2 * Math.PI * time) / C.black.period + b.phase));
  const y0 = b.side === 'top' ? gap.top - off - C.black.height : gap.bottom + off;
  return { x0: gap.x - C.black.width / 2, x1: gap.x + C.black.width / 2, y0, y1: y0 + C.black.height };
}

/** Khoảng trống cao nhất còn lại của khe (một dải liền) lúc `time`: khe không có diều đen thì cả chiều cao khe. */
export function freeSpace(gap: Gap, time: number): number {
  const bb = blackBox(gap, time);
  if (!bb) return gap.height;
  return Math.max(bb.y0 - gap.bottom, gap.top - bb.y1);
}

/** Dải trống lớn hơn của khe lúc `time` (giữa mép khe và diều đen): [dưới, trên]; tâm dải là chỗ nên nhắm. */
export function freeInterval(gap: Gap, time: number): [number, number] {
  const bb = blackBox(gap, time);
  if (!bb) return [gap.bottom, gap.top];
  const below = bb.y0 - gap.bottom;
  const above = gap.top - bb.y1;
  return below >= above ? [gap.bottom, bb.y0] : [bb.y1, gap.top];
}

/**
 * Sinh `count` khe liên tiếp từ `rng`: tâm khe ngẫu nhiên trong phạm vi để khe nằm trọn [0,5; 9,5] và tâm hai khe liền nhau chênh tối đa `maxCenterShift`; từ khe `black.fromGap` mỗi khe có `black.chance` có diều đen;
 * mỗi khe có `page.chance` có một trang bản sao đặt trong phần trống chắc chắn của khe. Mỗi khe luôn rút đủ số ngẫu nhiên (kể cả khi không dùng) để số ngẫu nhiên của khe sau không phụ thuộc khe trước.
 */
export function generateGaps(rng: () => number, count: number): Gap[] {
  const gaps: Gap[] = [];
  let prev = NaN;
  for (let k = 1; k <= count; k++) {
    const height = gapHeight(k);
    const lo = C.gapMin + height / 2;
    const hi = C.gapMax - height / 2;
    const lo2 = Number.isNaN(prev) ? lo : Math.max(lo, prev - C.maxCenterShift);
    const hi2 = Number.isNaN(prev) ? hi : Math.min(hi, prev + C.maxCenterShift);
    const center = lo2 + rng() * (hi2 - lo2);
    prev = center;
    const blackRoll = rng();
    const sideRoll = rng();
    const phase = rng() * 2 * Math.PI;
    const pageRoll = rng();
    const pageU = rng();
    const bottom = center - height / 2;
    const top = center + height / 2;
    const black: BlackKite | null = k >= C.black.fromGap && blackRoll < C.black.chance ? { side: sideRoll < 0.5 ? 'top' : 'bottom', phase, range: blackRange(height) } : null;
    let pageY: number | null = null;
    if (pageRoll < C.page.chance) {
      // phần trống chắc chắn: nửa không có diều đen đủ cao `minFree`
      let a = bottom;
      let b = top;
      if (black) {
        if (black.side === 'top') b = top - black.range - C.black.height;
        else a = bottom + black.range + C.black.height;
      }
      pageY = a + C.page.size / 2 + pageU * Math.max(0, b - a - C.page.size);
    }
    gaps.push({ k, x: gapX(k), height, center, bottom, top, black, pageY });
  }
  return gaps;
}

// ---------------------------------------------------------------------------
// Tạo ván

export interface KiteOptions {
  /** Số khe sinh sẵn (mặc định: tới khe cuối cùng có cổng) */
  gapCount?: number;
  /** Thay danh sách cổng (sau khe thứ bấy nhiêu); `[]` là không cổng (dùng để thử bay thật dài) */
  gateAfter?: readonly number[];
}

export function createKiteGame(seed: number, opts: KiteOptions = {}): KiteState {
  const gateAfter = opts.gateAfter ?? C.gates.after;
  const gapCount = opts.gapCount ?? Math.max(...C.gates.after);
  const rng = createMulberry32(seed);
  const gaps = generateGaps(rng, gapCount);
  return {
    seed,
    gaps,
    gateAfter,
    ticks: 0,
    time: 0,
    acc: 0,
    phase: 'ready',
    ended: null,
    x: 0,
    y: gaps[0].center,
    vy: 0,
    hearts: C.hearts,
    inv: 0,
    passed: 0,
    pages: 0,
    pageTaken: new Array<boolean>(gaps.length).fill(false),
    correct: 0,
    gatesDone: 0,
    score: 0,
    stats: { flaps: 0, hits: 0, hitsBy: { floor: 0, ceiling: 0, pillar: 0, black: 0 }, pagesTaken: 0, correct: 0, wrong: 0 },
  };
}

/** Điểm theo công thức của spec: số khe × 10 + số trang × 5 + số câu đúng × 50. */
export function scoreOf(gaps: number, pages: number, correct: number): number {
  return gaps * C.points.gap + pages * C.points.page + correct * C.gates.correctPoints;
}

/** Hoành độ cổng thứ `gate` (đếm từ 0): giữa khe `gateAfter[gate]` và khe kế. */
export function gateXOf(s: KiteState, gate: number): number {
  return s.gaps[s.gateAfter[gate] - 1].x + C.gates.offset;
}

/** Hộp va chạm của diều ở (x, y). */
export function kiteBox(x: number, y: number): Box {
  return { x0: x - C.kite.width / 2, x1: x + C.kite.width / 2, y0: y - C.kite.height / 2, y1: y + C.kite.height / 2 };
}

const overlap = (a: Box, b: Box): boolean => a.x0 < b.x1 - EPS && a.x1 > b.x0 + EPS && a.y0 < b.y1 - EPS && a.y1 > b.y0 + EPS;

// ---------------------------------------------------------------------------
// Một bước cố định

function endGame(s: KiteState, reason: KiteEnd, out: KiteEvent[]): void {
  s.phase = 'ended';
  s.ended = reason;
  out.push({ type: 'end', reason });
}

/** Đặt diều giữa khe kế tiếp (khe đầu tiên mà tâm còn ở phía trước diều; hết khe thì khe cuối), vận tốc đứng 0. */
function placeAtNextGap(s: KiteState): void {
  const g = s.gaps[Math.min(s.passed, s.gaps.length - 1)];
  s.y = g.center;
  s.vy = 0;
}

/** Diều chạm gì (đất, trần, cột tre, diều đen) ở vị trí hiện tại; không chạm thì null. */
function collision(s: KiteState): HitReason | null {
  const box = kiteBox(s.x, s.y);
  if (box.y0 <= C.floor + EPS) return 'floor';
  if (box.y1 >= C.ceiling - EPS) return 'ceiling';
  // chỉ khe vừa qua và khe kế tiếp có thể đang chồng lên diều (hai khe cách nhau 5, hộp rộng chưa tới 1)
  for (let i = Math.max(0, s.passed - 1); i <= Math.min(s.gaps.length - 1, s.passed); i++) {
    const g = s.gaps[i];
    if (Math.abs(s.x - g.x) < (C.pillarWidth + C.kite.width) / 2 - EPS && (box.y1 > g.top + EPS || box.y0 < g.bottom - EPS)) return 'pillar';
    const bb = blackBox(g, s.time);
    if (bb && overlap(box, bb)) return 'black';
  }
  return null;
}

function hit(s: KiteState, why: HitReason, out: KiteEvent[]): void {
  s.hearts--;
  s.stats.hits++;
  s.stats.hitsBy[why]++;
  out.push({ type: 'hit', why, hearts: s.hearts });
  if (s.hearts <= 0) return endGame(s, 'hearts', out);
  s.inv = C.invSeconds;
  placeAtNextGap(s);
}

function stepOnce(s: KiteState, out: KiteEvent[]): void {
  const h = C.tick;
  s.ticks++;
  s.time = s.ticks * h;
  s.vy = Math.max(C.maxFall, s.vy - C.gravity * h);
  s.y += s.vy * h;
  s.x += speedAt(s.passed) * h;

  // bay qua tâm khe
  while (s.passed < s.gaps.length && s.x >= s.gaps[s.passed].x - EPS) {
    s.passed++;
    s.score += C.points.gap;
    out.push({ type: 'pass', gap: s.passed, speed: speedAt(s.passed) });
  }

  // bất tử: chính bước mất tim không trừ giờ bất tử, nên bất tử đủ 1 giây (120 bước) kể từ bước kế tiếp
  const invActive = s.inv > EPS;
  if (!invActive) {
    const why = collision(s);
    if (why) {
      hit(s, why, out);
      if (s.phase === 'ended') return;
    }
  } else s.inv = s.inv <= h + EPS ? 0 : s.inv - h;

  // nhặt trang bản sao
  const box = kiteBox(s.x, s.y);
  for (let i = Math.max(0, s.passed - 1); i <= Math.min(s.gaps.length - 1, s.passed); i++) {
    const g = s.gaps[i];
    if (g.pageY === null || s.pageTaken[i]) continue;
    const half = C.page.size / 2;
    if (overlap(box, { x0: g.x - half, x1: g.x + half, y0: g.pageY - half, y1: g.pageY + half })) {
      s.pageTaken[i] = true;
      s.pages++;
      s.stats.pagesTaken++;
      s.score += C.points.page;
      out.push({ type: 'page', gap: g.k });
    }
  }

  // tới cổng làng: dừng, hiện câu hỏi
  if (s.gatesDone < s.gateAfter.length && s.passed >= s.gateAfter[s.gatesDone] && s.x >= gateXOf(s, s.gatesDone) - EPS) {
    s.phase = 'quiz';
    out.push({ type: 'gate', gate: s.gatesDone });
  }
}

/**
 * Chạy `dt` GIÂY của ván (chia thành các bước cố định `KITE_SPEC.tick`); trả về các sự kiện theo thứ tự. Chỉ chạy ở pha `play`: chờ bắt đầu (`ready`), câu hỏi ở cổng (`quiz`) và hết ván (`ended`) thì không có gì chạy.
 */
export function stepKite(s: KiteState, dt: number): KiteEvent[] {
  const out: KiteEvent[] = [];
  if (!(dt > 0)) return out;
  if (s.phase !== 'play') {
    s.acc = 0;
    return out;
  }
  s.acc += dt;
  while (s.acc >= C.tick - EPS && s.phase === 'play') {
    s.acc = Math.max(0, s.acc - C.tick);
    stepOnce(s, out);
  }
  if (s.phase !== 'play') s.acc = 0;
  return out;
}

/** Bước thời gian khi có thể đang tạm dừng (nút "?", tab ẩn, nhắc xoay ngang): `paused` thì KHÔNG có gì đổi và không có sự kiện. */
export function tickKite(s: KiteState, dt: number, paused: boolean): KiteEvent[] {
  return paused ? [] : stepKite(s, dt);
}

// ---------------------------------------------------------------------------
// Thao tác của học sinh

/** Bật diều lên: vận tốc đứng thành 5,5. Lần bật đầu tiên bắt đầu ván. Ở câu hỏi hay hết ván thì không nhận. */
export function flap(s: KiteState): KiteEvent[] {
  if (s.phase === 'ready') s.phase = 'play';
  if (s.phase !== 'play') return [];
  s.vy = C.flapVelocity;
  s.stats.flaps++;
  return [{ type: 'flap' }];
}

/**
 * Kết quả câu hỏi ở cổng (chỉ nhận khi đang ở pha `quiz`). Đúng: +50 điểm. Sai hoặc hết giờ: mất 1 tim; cổng vẫn mở. Rồi: hết tim thì kết thúc ('hearts'); qua đủ cổng thì thắng ('complete');
 * không thì diều đặt lại giữa khe kế tiếp, vận tốc đứng 0, bất tử 1 giây, và ván chạy tiếp.
 */
export function answerGate(s: KiteState, result: GateResult): KiteEvent[] {
  if (s.phase !== 'quiz') return [];
  const out: KiteEvent[] = [];
  const gate = s.gatesDone;
  if (result === 'correct') {
    s.correct++;
    s.stats.correct++;
    s.score += C.gates.correctPoints;
  } else {
    s.hearts--;
    s.stats.wrong++;
  }
  s.gatesDone++;
  out.push({ type: 'gateAnswer', gate, result, hearts: s.hearts });
  if (s.hearts <= 0) endGame(s, 'hearts', out);
  else if (s.gatesDone >= s.gateAfter.length) endGame(s, 'complete', out);
  else {
    placeAtNextGap(s);
    s.inv = C.invSeconds;
    s.acc = 0;
    s.phase = 'play';
  }
  return out;
}

/** Điểm cả ván. */
export function kiteScore(s: KiteState): number {
  return s.score;
}
