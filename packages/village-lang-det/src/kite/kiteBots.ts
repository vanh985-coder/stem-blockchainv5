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
 * Người chơi lý tưởng (`findIdealRun`, `replayRun`): biết trước toàn bộ khe và diều đen, không trễ; tìm một chuỗi bật/không bật không chạm gì bằng quy hoạch động nhìn trước có quay lui, rồi chạy lại chuỗi đó
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

interface Band {
  lo: number;
  hi: number;
}

/**
 * Các khoảng độ cao tâm diều không chạm gì ở bước có `x`, `passed`, `time` (đúng các điều kiện của `collision` trong `kiteLogic`, thêm `SAFE`): tối đa hai khoảng (khi diều đen chia khe làm hai). Ghi vào `out`, trả về số khoảng.
 */
function freeBands(s: KiteState, x: number, passed: number, time: number, out: Band[]): number {
  let lo = C.floor + C.kite.height / 2 + SAFE;
  let hi = C.ceiling - C.kite.height / 2 - SAFE;
  let cut0 = NaN;
  let cut1 = NaN;
  for (let i = Math.max(0, passed - 1); i <= Math.min(s.gaps.length - 1, passed); i++) {
    const g = s.gaps[i];
    const dx = Math.abs(x - g.x);
    if (dx < (C.pillarWidth + C.kite.width) / 2 + SAFE) {
      lo = Math.max(lo, g.bottom + C.kite.height / 2 + SAFE);
      hi = Math.min(hi, g.top - C.kite.height / 2 - SAFE);
    }
    const bb = blackBox(g, time);
    if (bb && dx < (C.black.width + C.kite.width) / 2 + SAFE) {
      cut0 = bb.y0 - C.kite.height / 2 - SAFE;
      cut1 = bb.y1 + C.kite.height / 2 + SAFE;
    }
  }
  let n = 0;
  if (Number.isNaN(cut0)) {
    if (lo <= hi) {
      out[0].lo = lo;
      out[0].hi = hi;
      n = 1;
    }
    return n;
  }
  if (lo <= Math.min(hi, cut0)) {
    out[n].lo = lo;
    out[n].hi = Math.min(hi, cut0);
    n++;
  }
  if (Math.max(lo, cut1) <= hi) {
    out[n].lo = Math.max(lo, cut1);
    out[n].hi = hi;
    n++;
  }
  return n;
}

export interface OracleOptions {
  /** Tầm nhìn trước (giây) */
  horizon?: number;
  /** Mỗi lần lập kế hoạch thực hiện chừng này giây đầu của đường đi (giây) */
  commit?: number;
  /** Ô lưới gom các trạng thái (độ cao) giống nhau khi quy hoạch */
  yBin?: number;
  /** Số trạng thái giữ lại tối đa mỗi bước */
  perTick?: number;
  /** Số phương án cuối đường đi được thử mỗi lần lập kế hoạch (khi gặp ngõ cụt thì quay lại thử phương án khác) */
  branch?: number;
  /** Số lần lập kế hoạch tối đa (quá thì bỏ cuộc) */
  maxPlans?: number;
}

export interface OracleRun {
  /** Hành động mỗi bước cố định kể từ sau lần bật đầu tiên: 1 là bật, 0 là không */
  actions: Uint8Array;
  plans: number;
  backtracks: number;
}

interface Plan {
  /** Số bước sống sót được (≤ tầm nhìn) */
  level: number;
  /** Số khe đã bay qua ở cuối đường đi */
  passedAtEnd: number;
  /** Các đường đi (chuỗi 0/1) tới những trạng thái cuối khác nhau */
  paths: Uint8Array[];
}

/**
 * Người chơi lý tưởng: biết trước toàn bộ khe và diều đen, không trễ. Tìm một chuỗi bật/không bật cho cả ván `seed` (không cổng, `gaps` khe) sao cho diều không chạm gì, bằng tìm kiếm có quay lui:
 * mỗi lần nhìn trước `horizon` giây bằng quy hoạch động (trạng thái = độ cao và vận tốc thật, mỗi bước chọn bật hay không, gom theo ô lưới `yBin`), chọn vài trạng thái cuối khác nhau, thử đi `commit` giây theo từng
 * đường rồi lập kế hoạch tiếp; gặp ngõ cụt thì quay lại thử đường khác. Trả về null nếu không tìm được trong `maxPlans` lần. Kết quả cần được CHẠY LẠI trên ván thật (`replayRun`) để kiểm.
 */
export function findIdealRun(seed: number, gaps: number, opts: OracleOptions = {}): OracleRun | null {
  const horizon = opts.horizon ?? 2;
  const commit = opts.commit ?? 0.6;
  const yBin = opts.yBin ?? 0.02;
  const perTick = opts.perTick ?? 12000;
  const branch = opts.branch ?? 5;
  const maxPlans = opts.maxPlans ?? 20000;
  const h = C.tick;
  const H = Math.round(horizon / h);
  const K = Math.round(commit / h);
  const cap = perTick * (H + 1);
  const Y = new Float64Array(cap);
  const V = new Float64Array(cap);
  const PAR = new Int32Array(cap);
  const ACT = new Uint8Array(cap);
  const start = new Int32Array(H + 2);
  const yCells = Math.round(C.ceiling / yBin) + 1;
  const stamp = new Int32Array(yCells * (TAU_MAX + 1)).fill(-1);
  const xs = new Float64Array(H + 1);
  const ps = new Int32Array(H + 1);
  const bands: Band[] = [{ lo: 0, hi: 0 }, { lo: 0, hi: 0 }];
  let planNo = 0;

  const root = createKiteGame(seed, { gapCount: gaps + Math.ceil(horizon * C.speedMax / C.gapSpacing) + 3, gateAfter: [] });
  flap(root);

  const planFrom = (s: KiteState): Plan => {
    planNo++;
    let x = s.x;
    let passed = s.passed;
    for (let i = 1; i <= H; i++) {
      x += speedAt(passed) * h;
      while (passed < s.gaps.length && x >= s.gaps[passed].x - 1e-9) passed++;
      xs[i] = x;
      ps[i] = passed;
    }
    Y[0] = s.y;
    V[0] = s.vy;
    PAR[0] = -1;
    ACT[0] = 0;
    start[0] = 0;
    start[1] = 1;
    let count = 1;
    let level = 0;
    // ô lưới thích nghi: số trạng thái mỗi bước vượt ngưỡng thì gom thô hơn (cho cả dải độ cao được phủ đều, thay vì cắt bỏ phần đuôi), ít đi thì mịn lại
    let mul = 1;
    for (let i = 1; i <= H; i++) {
      const prevCount = start[i] - start[i - 1];
      if (prevCount > perTick * 0.8 && mul < 8) mul++;
      else if (prevCount < perTick * 0.3 && mul > 1) mul--;
      const nb = freeBands(s, xs[i], ps[i], (s.ticks + i) * h, bands);
      let added = 0;
      for (let p = start[i - 1]; p < start[i]; p++) {
        for (let a = 0; a < 2; a++) {
          const v1 = Math.max(C.maxFall, (a === 1 ? C.flapVelocity : V[p]) - C.gravity * h);
          const y1 = Y[p] + v1 * h;
          let ok = false;
          for (let b = 0; b < nb; b++) if (y1 >= bands[b].lo && y1 <= bands[b].hi) ok = true;
          if (!ok) continue;
          const tau = Math.min(TAU_MAX, Math.max(0, Math.round((C.flapVelocity - v1) / (C.gravity * h))));
          const cell = Math.round(y1 / (yBin * mul)) * (TAU_MAX + 1) + tau;
          const key = planNo * 1000 + i;
          if (stamp[cell] === key || added >= perTick) continue;
          stamp[cell] = key;
          Y[count] = y1;
          V[count] = v1;
          PAR[count] = p;
          ACT[count] = a;
          count++;
          added++;
        }
      }
      start[i + 1] = count;
      if (added === 0) break;
      level = i;
    }
    // chọn tối đa `branch` trạng thái cuối khác nhau (cách nhau ≥ 0,25 về độ cao), ưu tiên gần giữa vùng trống và vận tốc nhỏ
    const nbEnd = freeBands(s, xs[Math.max(level, 1)], ps[Math.max(level, 1)], (s.ticks + Math.max(level, 1)) * h, bands);
    const scored: [number, number][] = [];
    for (let p = start[level]; p < start[level + 1]; p++) {
      let d = Infinity;
      for (let b = 0; b < nbEnd; b++) d = Math.min(d, Math.abs(Y[p] - (bands[b].lo + bands[b].hi) / 2));
      scored.push([d + 0.05 * Math.abs(V[p]), p]);
    }
    scored.sort((p, q) => p[0] - q[0]);
    const chosen: number[] = [];
    for (const [, p] of scored) {
      if (chosen.length >= branch) break;
      if (chosen.every((q) => Math.abs(Y[q] - Y[p]) >= 0.25)) chosen.push(p);
    }
    const paths: Uint8Array[] = chosen.map((end) => {
      const acts: number[] = [];
      for (let p = end; p > 0; p = PAR[p]) acts.push(ACT[p]);
      return Uint8Array.from(acts.reverse());
    });
    return { level, passedAtEnd: ps[Math.max(level, 1)], paths };
  };

  /** Bản sao của trạng thái, đi tiếp `steps` bước đầu của `path` trên ván thật. */
  const advance = (s: KiteState, path: Uint8Array, steps: number): KiteState => {
    const c: KiteState = { ...s, stats: { ...s.stats, hitsBy: { ...s.stats.hitsBy } } };
    for (let i = 0; i < steps && i < path.length; i++) {
      if (path[i] === 1) flap(c);
      stepKite(c, h);
    }
    return c;
  };

  interface Frame {
    state: KiteState;
    plan: Plan;
    next: number;
    /** Số hành động đã ghi trước khi vào khung này */
    mark: number;
  }
  const record: number[] = [];
  const stack: Frame[] = [];
  let backtracks = 0;
  const first = planFrom(root);
  stack.push({ state: root, plan: first, next: 0, mark: 0 });
  while (stack.length > 0) {
    const f = stack[stack.length - 1];
    if (f.next >= f.plan.paths.length) {
      stack.pop();
      record.length = f.mark;
      backtracks++;
      continue;
    }
    if (planNo >= maxPlans) return null;
    const path = f.plan.paths[f.next++];
    const steps = Math.min(K, path.length);
    const child = advance(f.state, path, steps);
    if (child.hearts < C.hearts) continue;
    record.length = f.mark;
    for (let i = 0; i < steps; i++) record.push(path[i]);
    if (child.passed >= gaps) return { actions: Uint8Array.from(record), plans: planNo, backtracks };
    const plan = planFrom(child);
    // ngõ cụt: không sống tới hết tầm nhìn mà cũng chưa tới đích
    if (plan.level < H && plan.passedAtEnd < gaps) continue;
    // đường tới đích nằm gọn trong tầm nhìn: dùng luôn
    if (plan.passedAtEnd >= gaps && plan.level >= 1 && plan.paths.length > 0 && plan.level < H) {
      const p0 = plan.paths[0];
      for (let i = 0; i < p0.length; i++) record.push(p0[i]);
      return { actions: Uint8Array.from(record), plans: planNo, backtracks };
    }
    stack.push({ state: child, plan, next: 0, mark: record.length });
  }
  return null;
}

export interface ReplayResult {
  gaps: number;
  hits: number;
  hearts: number;
  ticks: number;
}

/** Chạy lại một chuỗi hành động trên ván thật (cùng `seed`, không cổng): bật một lần lúc đầu rồi mỗi bước theo `actions`; dừng khi bay qua `gaps` khe, hết hành động hay mất tim. */
export function replayRun(seed: number, gaps: number, actions: Uint8Array): ReplayResult {
  const s = createKiteGame(seed, { gapCount: gaps + 8, gateAfter: [] });
  flap(s);
  let ticks = 0;
  for (let i = 0; i < actions.length && s.passed < gaps && s.hearts === C.hearts; i++) {
    if (actions[i] === 1) flap(s);
    stepKite(s, C.tick);
    ticks++;
  }
  return { gaps: s.passed, hits: s.stats.hits, hearts: s.hearts, ticks };
}
