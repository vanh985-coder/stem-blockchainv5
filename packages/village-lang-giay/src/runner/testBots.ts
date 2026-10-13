/**
 * Người chơi giả để kiểm tra cân bằng màn 2 bằng mô phỏng (chỉ dùng trong test, không vào bản build). Bot chỉ đưa ra `RunnerInput` như người chơi thật,
 * chạy trên chính `stepRunner`; nó được phép nhìn trước các hàng chướng ngại và vật nhặt đã sinh (người chơi giỏi cũng nhìn thấy trước).
 *
 * - Bot giỏi: nhặt mọi vật nhặt với tới được trên đường (kế hoạch quy hoạch động theo hàng: mỗi khoảng giữa hai hàng chọn làn có nhiều điểm nhất, miễn là kịp đổi làn),
 *   nhảy và trượt đúng lúc, không bao giờ va, trả lời đúng mọi câu hỏi.
 * - Bot trung bình: bỏ qua ngẫu nhiên một phần vật nhặt, trả lời đúng một nửa số câu, cố tình không né 1 đến 2 chướng ngại.
 */
import { RUNNER_SPEC as SPEC, RUNNER_TUNING as T } from './runnerConfig';
import { createRunner, passable, runnerMedal, runnerScore, speedAt, stepRunner, type Item, type Lane, type Row, type RunnerEvent, type RunnerInput, type RunnerState } from './runnerLogic';

export interface BotProfile {
  name: string;
  /** Xác suất bot để ý tới một chuỗi vật nhặt và đi đường vòng để nhặt (1 = nhặt mọi thứ với tới được). Đi ngang qua vẫn nhặt, nên tỉ lệ nhặt thật cao hơn số này: 0,4 cho khoảng 60% vật đã đi qua. */
  noticeRate: number;
  /** Xác suất trả lời đúng mỗi câu hỏi */
  correctRate: number;
  /** Số chướng ngại cố tình không né (từ, đến) */
  mistakes: readonly [number, number];
}

export const GOOD_BOT: BotProfile = { name: 'good', noticeRate: 1, correctRate: 1, mistakes: [0, 0] };
export const AVERAGE_BOT: BotProfile = { name: 'average', noticeRate: 0.4, correctRate: 0.5, mistakes: [1, 2] };

export interface BotResult {
  score: number;
  medal: number;
  pages: number;
  coins: number;
  distance: number;
  correct: number;
  hearts: number;
  hits: number;
  over: string | null;
  /** Số vật nhặt đã đi qua (trong quãng đường đã chạy, trừ vật trên nóc xe) và số vật lấy được: dùng để tính tỉ lệ nhặt thật của bot */
  itemsPassed: number;
  itemsTaken: number;
  /** Tổng điểm của vật nhặt mà bot lấy được (trang × 10 + tiền) để so sánh mức "nhặt được bao nhiêu" */
  pickupPoints: number;
}

const VALUE = { trang: 10, dong: 1, nonla: 5, guoc: 2, tui: 6 } as const;
const DT = 1 / 30;

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rowNear = (r: Row): number => {
  let n = r.z - 0.5;
  for (const c of r.cells) if (c && c.z0 < n) n = c.z0;
  return n;
};
const rowFar = (r: Row): number => {
  let e = r.z;
  for (const c of r.cells) if (c && c.z1 > e) e = c.z1;
  return e;
};

/** Làn hiện tại trước, rồi hai làn bên cạnh. */
const around = (l: number): number[] => [l, l - 1, l + 1].filter((x) => x >= 0 && x <= 2);

/** Quãng đường cần để đổi `d` làn (theo tốc độ lớn nhất trong ván). */
const need = (d: number, speed: number): number => d * (T.laneChangeSec * speed + 0.7);

interface Plan {
  rows: Row[];
  /** Làn ở hàng k, làn ở khoảng trước hàng k, và z mà từ đó về làn hàng k */
  lane: Lane[];
  gapLane: Lane[];
  gapUntil: number[];
}

export function playBot(seed: number, profile: BotProfile, onEvent?: (e: RunnerEvent, s: RunnerState) => void): BotResult {
  const rnd = mulberry(seed * 7919 + 13);
  const s = createRunner({ seed });
  const notice = new Map<number, boolean>();
  const noticed = (it: Item): boolean => {
    // quyết định một lần cho mỗi chuỗi (nhóm vật nhặt) có để ý hay không; không để ý thì không đi đường vòng để nhặt, nhưng đi ngang qua vẫn nhặt được
    if (profile.noticeRate >= 1) return true;
    let v = notice.get(it.group);
    if (v === undefined) {
      v = rnd() < profile.noticeRate;
      notice.set(it.group, v);
    }
    return v;
  };
  // chọn trước các chướng ngại (đếm theo thứ tự gặp trong làn của bot) mà bot cố tình không né
  const mistakeCount = profile.mistakes[0] + Math.floor(rnd() * (profile.mistakes[1] - profile.mistakes[0] + 1));
  const skipAt = new Set<number>();
  while (skipAt.size < mistakeCount) skipAt.add(2 + Math.floor(rnd() * 18));
  // mỗi chướng ngại cần nhảy hoặc trượt được đánh số theo thứ tự gặp; số nằm trong skipAt thì bot không né
  const decided = new Map<string, boolean>();
  let ordinal = 0;
  const shouldSkip = (key: string): boolean => {
    let v = decided.get(key);
    if (v === undefined) {
      ordinal++;
      v = skipAt.has(ordinal);
      decided.set(key, v);
    }
    return v;
  };
  let plan: Plan | null = null;
  let planKey = '';
  let pickupPoints = 0;
  const seen = new Map<number, number>();
  let taken = 0;
  let hits = 0;
  let guard = 0;

  while (s.phase !== 'over' && guard++ < 200_000) {
    let input: RunnerInput = {};
    if (s.phase === 'quiz') {
      input = s.quiz!.answered === null ? { answer: rnd() < profile.correctRate } : { resume: true };
    } else {
      // chỉ lập lại kế hoạch khi hàng đầu tiên phía trước đổi (kế hoạch bao trùm cả đoạn tới hàng đó), để không đổi ý sát chướng ngại
      const first = s.rows.find((r) => rowFar(r) + 0.6 > s.z);
      const key = `${first?.id ?? 0}`;
      if (key !== planKey) {
        plan = makePlan(s, noticed);
        planKey = key;
      }
      input = control(s, plan, shouldSkip);
    }
    const before = { p: s.pages, c: s.coins };
    stepRunner(s, input, DT);
    for (const it of s.items) if (it.y < SPEC.roofHeight && !seen.has(it.id)) seen.set(it.id, it.z);
    for (const e of s.events) {
      if (e.type === 'hit') hits++;
      if (e.type === 'pickup' && seen.has(e.id)) taken++;
      onEvent?.(e, s);
    }
    pickupPoints += (s.pages - before.p) * 10 + (s.coins - before.c);
  }
  const score = runnerScore(s);
  let passed = 0;
  for (const z of seen.values()) if (z <= s.z) passed++;
  return { score, medal: runnerMedal(score), itemsPassed: passed, itemsTaken: taken, pages: s.pages, coins: s.coins, distance: s.distance, correct: s.correct, hearts: s.hearts, hits, over: s.over, pickupPoints };
}

/** Quy hoạch động các hàng phía trước: chọn làn ở từng hàng (và làn ở từng khoảng giữa) để nhặt được nhiều điểm nhất. */
function makePlan(s: RunnerState, noticed: (it: Item) => boolean): Plan | null {
  const rows = s.rows.filter((r) => rowFar(r) + 0.6 > s.z).slice(0, 7);
  if (rows.length === 0) return null;
  const speed = Math.max(speedAt(s.time), 8) + 1.5;
  const items = s.items.filter((it) => it.y < SPEC.roofHeight && noticed(it));
  const n = rows.length;
  const NEG = -1e9;
  // Giá trị nhặt được ở làn g trong đoạn [a, b] khi vào từ làn la và ra làn lb
  const gain = (a: number, b: number, g: number, la: number, lb: number): number => {
    const lo = a + need(Math.abs(g - la), speed);
    const hi = b - need(Math.abs(g - lb), speed);
    if (hi < lo) return g === la && g === lb ? 0 : NEG;
    let v = 0;
    for (const it of items) if (it.lane === g && it.z >= lo && it.z <= hi) v += VALUE[it.kind];
    return v;
  };
  // Ô làn l của hàng k đi qua được? (bot không nhảy lên nóc xe)
  const ok = (k: number, l: number): boolean => passable(rows[k].cells[l]);
  const inRow0 = s.z >= rowNear(rows[0]) - 0.8;
  // best[k][a]: giá trị tốt nhất từ hàng k ở làn a trở đi; from[k][a] = [g, b] của bước kế
  const best: number[][] = Array.from({ length: n }, () => [NEG, NEG, NEG]);
  const nextG: number[][] = Array.from({ length: n }, () => [0, 0, 0]);
  const nextB: number[][] = Array.from({ length: n }, () => [0, 0, 0]);
  for (let k = n - 1; k >= 0; k--) {
    for (let a = 0; a < 3; a++) {
      if (!ok(k, a)) continue;
      if (k === n - 1) {
        best[k][a] = 0;
        continue;
      }
      const za = rowFar(rows[k]) + 0.6;
      const zb = rowNear(rows[k + 1]) - 0.8;
      for (const g of around(a)) {
        for (const b of around(g)) {
          if (!ok(k + 1, b) || best[k + 1][b] <= NEG / 2) continue;
          const v = gain(za, zb, g, a, b);
          if (v <= NEG / 2) continue;
          const tot = v + best[k + 1][b] - 0.01 * (Math.abs(g - a) + Math.abs(b - g)); // ngang điểm thì ưu tiên ít đổi làn
          if (tot > best[k][a]) {
            best[k][a] = tot;
            nextG[k][a] = g;
            nextB[k][a] = b;
          }
        }
      }
    }
  }
  // Làn đầu: nếu đang ở trong vùng hàng đầu thì giữ làn hiện tại; ngược lại chọn làn đầu (và làn khoảng trước nó) tốt nhất từ vị trí hiện tại
  const lane: Lane[] = new Array(n).fill(1);
  const gapLane: Lane[] = new Array(n).fill(1);
  const gapUntil: number[] = new Array(n).fill(-Infinity);
  let a0: number;
  if (inRow0) {
    a0 = s.lane;
    if (!ok(0, a0) || best[0][a0] <= NEG / 2) a0 = [0, 1, 2].filter((l) => ok(0, l)).sort((x, y) => Math.abs(x - s.lane) - Math.abs(y - s.lane))[0] ?? s.lane;
    gapLane[0] = a0 as Lane;
  } else {
    // đoạn từ chỗ đang đứng tới hàng 0
    let bestV = NEG;
    a0 = [0, 1, 2].filter((l) => ok(0, l)).sort((x, y) => Math.abs(x - s.lane) - Math.abs(y - s.lane))[0] ?? s.lane;
    gapLane[0] = s.lane;
    for (const g of around(s.lane)) {
      for (const b of around(g)) {
        if (!ok(0, b) || best[0][b] <= NEG / 2) continue;
        const v = gain(s.z, rowNear(rows[0]) - 0.8, g, s.lane, b);
        if (v <= NEG / 2) continue;
        const tot = v + best[0][b] - 0.01 * (Math.abs(g - s.lane) + Math.abs(b - g));
        if (tot > bestV) {
          bestV = tot;
          gapLane[0] = g as Lane;
          a0 = b;
        }
      }
    }
  }
  lane[0] = a0 as Lane;
  for (let k = 0; k < n - 1; k++) {
    const a = lane[k];
    lane[k + 1] = (best[k][a] > NEG / 2 ? nextB[k][a] : a) as Lane;
    gapLane[k + 1] = (best[k][a] > NEG / 2 ? nextG[k][a] : a) as Lane;
  }
  // Điểm z mà hết đoạn giữa thì về làn của hàng kế: ngay sau vật nhặt cuối cùng của làn khoảng đó
  for (let k = 0; k < n; k++) {
    const g = gapLane[k];
    if (g === lane[k]) continue;
    const za = k === 0 ? s.z : rowFar(rows[k - 1]) + 0.6;
    const zb = rowNear(rows[k]) - 0.8;
    const from = k === 0 ? s.lane : lane[k - 1];
    const lo = za + need(Math.abs(g - from), speed);
    const hi = zb - need(Math.abs(g - lane[k]), speed);
    let last = za;
    for (const it of items) if (it.lane === g && it.z >= lo && it.z <= hi && it.z > last) last = it.z;
    gapUntil[k] = Math.min(last + 0.45, hi);
  }
  return { rows, lane, gapLane, gapUntil };
}

/** Lệnh cho bước này: đổi làn theo kế hoạch, nhảy hoặc trượt đúng lúc. */
function control(s: RunnerState, plan: Plan | null, shouldSkip: (key: string) => boolean): RunnerInput {
  if (!plan) return {};
  const input: RunnerInput = {};
  // làn mong muốn tại z hiện tại
  let desired: Lane = s.lane;
  for (let k = 0; k < plan.rows.length; k++) {
    const r = plan.rows[k];
    if (s.z >= rowFar(r) + 0.6) continue; // đã qua hàng này
    if (s.z >= rowNear(r) - 0.8) desired = plan.lane[k];
    else desired = s.z < plan.gapUntil[k] ? plan.gapLane[k] : plan.lane[k];
    break;
  }
  const settled = Math.abs(s.x - SPEC.laneX[s.lane]) < 0.06;
  if (desired !== s.lane && settled) input.move = desired > s.lane ? 1 : -1;

  // nhảy hoặc trượt khi sắp tới chướng ngại ở làn đang đứng
  if (s.grounded && s.phase === 'run') {
    const speed = speedAt(s.time) * s.speedScale;
    for (let k = 0; k < plan.rows.length; k++) {
      const r = plan.rows[k];
      if (s.z >= rowFar(r) + 0.6) continue; // đã qua hàng này
      const c = plan.lane[k] === s.lane ? r.cells[s.lane] : null;
      if (!c || (c.kind !== 'low' && c.kind !== 'high')) break;
      const mid = (c.z0 + c.z1) / 2;
      if (mid < s.z - 0.3) break;
      const tti = (mid - s.z) / Math.max(speed, 1);
      if (c.kind === 'low') {
        const peak = (s.boots > 0 ? SPEC.jump.v0Boots : SPEC.jump.v0) / SPEC.jump.gravity;
        if (tti <= peak && tti > 0 && !shouldSkip(`${r.id}:${s.lane}`)) input.jump = true;
      } else if (tti <= SPEC.slide.sec / 2 && tti > 0 && !shouldSkip(`${r.id}:${s.lane}`)) {
        input.slide = true;
      }
      break; // chỉ xét chướng ngại gần nhất
    }
  }
  return input;
}
