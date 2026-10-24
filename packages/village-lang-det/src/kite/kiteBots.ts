/**
 * Bot mô phỏng cả ván màn 6 để kiểm tra cân bằng mốc điểm (bước B8). Chỉ dùng trong test, không vào bản chạy. Đơn vị thời gian: giây; khung hình giả lập 1/60 giây.
 *
 * Bot "nhắm tâm khe kế tiếp" (chỉ dùng thao tác của học sinh: `flap`, `answerGate`; chỉ biết những gì học sinh nhìn thấy):
 *  - nhắm tâm dải trống của khe kế tiếp (khe đầu tiên mà tâm còn ở phía trước diều); khe có diều đen thì nhắm tâm dải trống lớn hơn, tính theo vị trí diều đen lúc diều TỚI khe đó (dao động của diều đen đều đặn nên
 *    người chơi giỏi đoán được; tự chọn);
 *  - mỗi khung hình đoán độ cao diều lúc cú bật tới nơi (sau độ trễ `delay`); nếu dự đoán thấp hơn tâm một khoảng `margin` thì ra lệnh bật, và cú bật thực sự có hiệu lực sau `delay` + lệch giờ (phân phối chuẩn
 *    σ = `sigma`, không âm); chỉ một lệnh chờ tại một lúc. `margin` (tự chọn, 0,5): nửa độ cao một cú bật (1,08), để diều dao động QUANH tâm chứ không vọt cao hơn tâm (margin 0, đúng chữ "dự đoán rơi dưới tâm",
 *    cho bot giỏi chỉ khoảng 1,3 cổng và gần như không Vàng: xem spec 06);
 *  - bắt đầu ván bằng một cú bật ngay; ở cổng trả lời đúng với xác suất `correct`.
 * Số ngẫu nhiên của bot lấy từ rng riêng (không đụng rng của ván nên cùng seed vẫn cùng khe).
 *
 * Người chơi lý tưởng (`findIdealRun`, `replayRun`): biết trước toàn bộ khe và diều đen, không trễ; tìm một chuỗi bật/không bật không chạm gì bằng đúng kiểu tìm kiếm của `passable` (duyệt sâu có ghi nhớ, quyết định mỗi 1/60 giây), rồi chạy lại chuỗi đó
 * trên ván thật để kiểm. Dùng để chứng tỏ luật chơi qua được mà không chạm.
 */
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { KITE_SPEC as C } from './kiteConfig';
import { answerGate, blackBox, createKiteGame, flap, freeInterval, speedAt, stepKite, type KiteEnd, type KiteOptions, type KiteState } from './kiteLogic';

export interface KiteBotProfile {
  name: string;
  /** Độ trễ từ lúc bot quyết định bật tới lúc cú bật có hiệu lực (giây) */
  delay: number;
  /** Độ lệch chuẩn của giờ bật (giây) */
  sigma: number;
  /** Xác suất trả lời đúng câu hỏi ở cổng */
  correct: number;
  /** Bật khi dự đoán thấp hơn tâm khe chừng này */
  margin: number;
  /** Cách chọn độ cao nhắm (mặc định `targetY`) */
  aim?: (s: KiteState) => number;
}

const MARGIN = 0.5;
/** Bot giỏi (lời giao B8): trễ 0,08 giây, lệch giờ σ 0,03, đúng câu hỏi 95%. */
export const GOOD_BOT: KiteBotProfile = { name: 'good', delay: 0.08, sigma: 0.03, correct: 0.95, margin: MARGIN };
/** Bot trung bình (lời giao B8): trễ 0,18 giây, σ 0,08, đúng 70%. */
export const AVERAGE_BOT: KiteBotProfile = { name: 'average', delay: 0.18, sigma: 0.08, correct: 0.7, margin: MARGIN };

export interface KiteSimResult {
  score: number;
  ended: KiteEnd;
  /** Số khe đã bay qua */
  gaps: number;
  pages: number;
  correct: number;
  /** Số cổng đã qua (đã trả lời) */
  gates: number;
  hits: number;
  hearts: number;
}

const FRAME = 1 / 60;
/** Tâm dải trống của khe `g` lúc `time` (khe có diều đen thì tâm dải trống lớn hơn). */
function gapAim(g: KiteState['gaps'][number], time: number): number {
  const [lo, hi] = freeInterval(g, time);
  return (lo + hi) / 2;
}

/**
 * Độ cao bot nhắm: tâm dải trống của khe kế tiếp (khe đầu tiên mà tâm còn ở phía trước diều), tính theo vị trí diều đen lúc diều TỚI khe đó (đoán theo tốc độ ngang hiện tại; dao động của diều đen đều đặn nên
 * người chơi giỏi đoán được; khe không có diều đen thì chỉ là tâm khe).
 */
export function targetY(s: KiteState): number {
  const g = s.gaps[Math.min(s.passed, s.gaps.length - 1)];
  const arrive = Math.max(0, (g.x - s.x) / speedAt(s.passed));
  return gapAim(g, s.time + arrive);
}

/** Số ngẫu nhiên phân phối chuẩn (Box–Muller) từ rng. */
function gaussian(rnd: () => number): number {
  const u = Math.max(1e-12, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/** Chơi trọn một ván với `seed` và hồ sơ bot `p`. */
export function simulateKite(seed: number, p: KiteBotProfile, opts: KiteOptions = {}): KiteSimResult {
  const s = createKiteGame(seed, opts);
  const rnd = createMulberry32(((seed * 2654435761) ^ 0x9e3779b9) >>> 0);
  let now = 0;
  let due = -1; // giờ cú bật đang chờ có hiệu lực; < 0 là không có
  flap(s);
  const guard = 60 * 60 * 20; // tối đa 20 phút mô phỏng
  for (let i = 0; i < guard && s.phase !== 'ended'; i++) {
    if (s.phase === 'quiz') {
      answerGate(s, rnd() < p.correct ? 'correct' : 'wrong');
      due = -1;
      continue;
    }
    if (due >= 0 && now >= due - 1e-9) {
      flap(s);
      due = -1;
    }
    if (due < 0) {
      const d = p.delay;
      const predicted = s.y + s.vy * d - 0.5 * C.gravity * d * d;
      if (predicted < (p.aim ?? targetY)(s) - p.margin) due = now + Math.max(0, p.delay + p.sigma * gaussian(rnd));
    }
    stepKite(s, FRAME);
    now += FRAME;
  }
  return { score: s.score, ended: s.ended ?? 'hearts', gaps: s.passed, pages: s.pages, correct: s.correct, gates: s.gatesDone, hits: s.stats.hits, hearts: s.hearts };
}

export interface KiteBalance {
  games: number;
  mean: number;
  min: number;
  max: number;
  medals: { chua: number; dong: number; bac: number; vang: number };
  /** Số ván qua đủ 4 cổng (thắng) */
  complete: number;
  scores: number[];
  meanGaps: number;
  meanGates: number;
  meanPages: number;
  meanCorrect: number;
  meanHits: number;
  /** Số ván qua ít nhất n cổng, n = 0 đến 4 */
  gateCounts: number[];
}

/** Chơi `games` ván, seed 1 đến `games`, tổng hợp theo `medals`. */
export function simulateMany(profile: KiteBotProfile, games: number, medals: MedalThresholds): KiteBalance {
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  const scores: number[] = [];
  const gateCounts = new Array<number>(C.gates.after.length + 1).fill(0);
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let complete = 0;
  let gaps = 0;
  let gates = 0;
  let pages = 0;
  let correct = 0;
  let hits = 0;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateKite(seed, profile);
    scores.push(r.score);
    sum += r.score;
    min = Math.min(min, r.score);
    max = Math.max(max, r.score);
    if (r.ended === 'complete') complete++;
    gaps += r.gaps;
    gates += r.gates;
    pages += r.pages;
    correct += r.correct;
    hits += r.hits;
    for (let n = 0; n <= r.gates; n++) gateCounts[n]++;
    count[(['chua', 'dong', 'bac', 'vang'] as const)[medalOf(r.score, medals)]]++;
  }
  return { games, mean: sum / games, min, max, medals: count, complete, scores, meanGaps: gaps / games, meanGates: gates / games, meanPages: pages / games, meanCorrect: correct / games, meanHits: hits / games, gateCounts };
}

/** Phân vị `q` (0 đến 1) theo hạng gần nhất: phần tử thứ ceil(q × n) của mảng sắp tăng. */
export function percentile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}

// ---------------------------------------------------------------------------
// Người chơi lý tưởng

/** Khoảng hở an toàn (đơn vị) giữ quanh hộp va chạm khi lập kế hoạch, để sai số số học không thành va chạm */
const SAFE = 0.002;
/** Số bước kể từ lần bật cuối tới khi vận tốc chạm mức rơi nhanh nhất */
const TAU_MAX = Math.ceil((C.flapVelocity - C.maxFall) / (C.gravity * C.tick));
/** Số bước cố định giữa hai lần quyết định bật (2 bước = 1/60 giây, như `passable`) và ô lưới gom các trạng thái giống nhau */
const STEP = 2;
const Y_BIN = 0.04;

export interface OracleRun {
  /** Hành động mỗi bước cố định kể từ sau lần bật đầu tiên: 1 là bật, 0 là không */
  actions: Uint8Array;
  /** Số trạng thái đã duyệt */
  expanded: number;
}

/**
 * Người chơi lý tưởng: biết trước toàn bộ khe và diều đen, không trễ. Tìm một chuỗi bật/không bật (quyết định mỗi 1/60 giây) cho cả ván `seed` (không cổng, `gaps` khe) sao cho diều không chạm gì, bằng đúng kiểu tìm kiếm
 * của `passable`: duyệt theo chiều sâu trên (độ cao, vận tốc) thật, thử trước lựa chọn đưa diều về phía tâm dải trống của khe kế, mỗi (bước quyết định, ô lưới) chỉ xét một lần; trạng thái đã duyệt mà bế tắc thì không xét lại.
 * Trả về null nếu duyệt quá `maxExpanded` trạng thái. Kết quả cần được CHẠY LẠI trên ván thật (`replayRun`) để kiểm độc lập.
 */
export function findIdealRun(seed: number, gaps: number, maxExpanded = 3_000_000): OracleRun | null {
  const h = C.tick;
  const half = C.kite.height / 2;
  const root = createKiteGame(seed, { gapCount: gaps + 2, gateAfter: [] });
  // đích: diều ra khỏi cột của khe cuối cùng
  const endX = root.gaps[gaps - 1].x + (C.pillarWidth + C.kite.width) / 2 + 0.05;
  // quỹ đạo x theo bước (không phụ thuộc cách bật): x[i], khe đã qua passed[i]
  const xs: number[] = [0];
  const ps: number[] = [0];
  {
    let x = 0;
    let passed = 0;
    while (x < endX) {
      x += speedAt(passed) * h;
      while (passed < root.gaps.length && x >= root.gaps[passed].x - 1e-9) passed++;
      xs.push(x);
      ps.push(passed);
    }
  }
  const T = xs.length - 1;
  // vùng không chạm của từng bước (≤ 2 khoảng) và độ cao nên nhắm (tâm dải trống của khe kế)
  const lo0 = new Float64Array(T + 1);
  const hi0 = new Float64Array(T + 1);
  const lo1 = new Float64Array(T + 1);
  const hi1 = new Float64Array(T + 1);
  const cnt = new Uint8Array(T + 1);
  const aim = new Float64Array(T + 1);
  for (let i = 1; i <= T; i++) {
    let lo = C.floor + half + SAFE;
    let hi = C.ceiling - half - SAFE;
    let cut0 = NaN;
    let cut1 = NaN;
    const time = (root.ticks + i) * h;
    for (let j = Math.max(0, ps[i] - 1); j <= Math.min(root.gaps.length - 1, ps[i]); j++) {
      const g = root.gaps[j];
      const dx = Math.abs(xs[i] - g.x);
      if (dx < (C.pillarWidth + C.kite.width) / 2 + SAFE) {
        lo = Math.max(lo, g.bottom + half + SAFE);
        hi = Math.min(hi, g.top - half - SAFE);
      }
      const bb = blackBox(g, time);
      if (bb && dx < (C.black.width + C.kite.width) / 2 + SAFE) {
        cut0 = bb.y0 - half - SAFE;
        cut1 = bb.y1 + half + SAFE;
      }
    }
    let n = 0;
    if (Number.isNaN(cut0)) {
      if (lo <= hi) {
        lo0[i] = lo;
        hi0[i] = hi;
        n = 1;
      }
    } else {
      if (lo <= Math.min(hi, cut0)) {
        lo0[i] = lo;
        hi0[i] = Math.min(hi, cut0);
        n = 1;
      }
      if (Math.max(lo, cut1) <= hi) {
        if (n === 0) {
          lo0[i] = Math.max(lo, cut1);
          hi0[i] = hi;
        } else {
          lo1[i] = Math.max(lo, cut1);
          hi1[i] = hi;
        }
        n++;
      }
    }
    cnt[i] = n;
    const g = root.gaps[Math.min(ps[i], root.gaps.length - 1)];
    const [a, b] = freeInterval(g, time);
    aim[i] = (a + b) / 2;
  }
  const inBand = (i: number, y: number): boolean => (y >= lo0[i] && y <= hi0[i]) || (cnt[i] > 1 && y >= lo1[i] && y <= hi1[i]);

  const seen = new Set<number>();
  const record: number[] = [];
  let expanded = 0;
  // duyệt theo chiều sâu (đệ quy; độ sâu tối đa T / 2, vài nghìn)
  const visit = (i: number, y: number, v: number): boolean => {
    if (i >= T) return true;
    if (++expanded > maxExpanded) return false;
    const steps = Math.min(STEP, T - i);
    const first = y < aim[Math.min(i + steps, T)] ? 1 : 0;
    for (let k = 0; k < 2; k++) {
      const a = k === 0 ? first : 1 - first;
      let yy = y;
      let vv = a === 1 ? C.flapVelocity : v;
      let ok = true;
      for (let st = 1; st <= steps; st++) {
        vv = Math.max(C.maxFall, vv - C.gravity * h);
        yy += vv * h;
        if (!inBand(i + st, yy)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const tau = Math.min(TAU_MAX, Math.max(0, Math.round((C.flapVelocity - vv) / (C.gravity * h))));
      const key = ((i / STEP) * 1024 + Math.round(yy / Y_BIN)) * 128 + tau;
      if (seen.has(key)) continue;
      seen.add(key);
      record.push(a);
      if (steps === 2) record.push(0);
      if (visit(i + steps, yy, vv)) return true;
      record.length -= steps === 2 ? 2 : 1;
      if (expanded > maxExpanded) return false;
    }
    return false;
  };
  // sau lần bật đầu tiên diều ở tâm khe 1 với vận tốc 5,5; mỗi quyết định dùng cho STEP bước: bật ở bước đầu rồi không bật ở bước sau
  if (!visit(0, root.gaps[0].center, C.flapVelocity)) return null;
  return { actions: Uint8Array.from(record), expanded };
}

export interface ReplayResult {
  gaps: number;
  hits: number;
  hearts: number;
  ticks: number;
}

/** Chạy lại một chuỗi hành động trên ván thật (cùng `seed`, không cổng): bật một lần lúc đầu rồi mỗi bước theo `actions`; dừng khi bay qua `gaps` khe, hết hành động hay mất tim. */
export function replayRun(seed: number, gaps: number, actions: Uint8Array): ReplayResult {
  const s = createKiteGame(seed, { gapCount: gaps + 2, gateAfter: [] });
  flap(s);
  let ticks = 0;
  for (let i = 0; i < actions.length && s.passed < gaps && s.hearts === C.hearts; i++) {
    if (actions[i] === 1) flap(s);
    stepKite(s, C.tick);
    ticks++;
  }
  return { gaps: s.passed, hits: s.stats.hits, hearts: s.hearts, ticks };
}
