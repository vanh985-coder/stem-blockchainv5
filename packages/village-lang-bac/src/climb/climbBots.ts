/**
 * Bot mô phỏng cả ván màn 12 (4 vòng) để kiểm tra cân bằng mốc điểm (bước B4). Chỉ dùng trong test, không vào bản chạy.
 *
 * Bot chỉ dùng thao tác của học sinh (`jump`) và chỉ biết những gì học sinh nhìn thấy: hai số trên tay nắm (so số trong sổ với số hiện tại để biết nhánh lệch) và chỗ tay nắm đang trượt.
 * Mỗi tầng bot chọn nhánh, chờ tay nắm của nhánh đó quay đầu ngay trên đầu mình (giữa cửa sổ nắm được) rồi bật sớm `jumpPeak` giây, cộng sai lệch giờ theo phân phối chuẩn độ lệch `sigma`.
 * Bot cần ít nhất `react` giây sau khi đáp xuống mới bật được lần tiếp.
 */
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { CLIMB_SPEC } from './climbConfig';
import { advanceRound, climbScore, createClimbGame, isMismatch, jump, roundSpec, stepClimb, type ClimbState } from './climbLogic';

export interface ClimbBotProfile {
  name: string;
  /** Độ lệch chuẩn của giờ bật so với giờ đúng (giây) */
  sigma: number;
  /** Xác suất đọc nhầm số, chọn nhầm sang nhánh khớp */
  misread: number;
  /** Thời gian nhìn và quyết định sau mỗi lần đáp (giây) */
  react: number;
}

/** Bot giỏi: canh gần như đúng giờ (σ 0,04 giây, tự chọn), không đọc nhầm. */
export const GOOD_BOT: ClimbBotProfile = { name: 'good', sigma: 0.04, misread: 0, react: 0.4 };
/** Bot trung bình (theo lời giao bước B4): σ khoảng 0,12 giây, đọc nhầm số 10% số lần. */
export const AVERAGE_BOT: ClimbBotProfile = { name: 'average', sigma: 0.12, misread: 0.1, react: 0.6 };

export interface ClimbSimResult {
  score: number;
  roundsDone: number;
  hearts: number;
  coins: number;
  /** Hết tim trước khi xong vòng 4 */
  lost: boolean;
  deadEnds: number;
  misses: number;
}

/** Số ngẫu nhiên phân phối chuẩn (Box–Muller) từ rng. */
function gaussian(rnd: () => number): number {
  const u = Math.max(1e-12, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/**
 * Giờ (≥ `from`) mà tay nắm `side` của tầng trên tới ngay trên đầu người chơi (c(t) quay đầu ở +sway với tay trái, −sway với tay phải): quãng sóng tam giác u = (t × tốc độ + pha) mod 4A
 * bằng 2A (tay trái) hay 0 (tay phải).
 */
export function nextOverhead(s: ClimbState, side: 'left' | 'right', from: number): number {
  const A = CLIMB_SPEC.sway;
  const v = roundSpec(s).speed;
  const phase = s.phases[s.level + 1];
  const target = side === 'left' ? 2 * A : 0;
  const n = Math.ceil((from * v + phase - target) / (4 * A));
  return (target - phase + 4 * A * n) / v;
}

/** Chơi trọn một ván với `seed` và hồ sơ bot `p`. */
export function simulateClimb(seed: number, p: ClimbBotProfile): ClimbSimResult {
  const s = createClimbGame(seed);
  const rnd = createMulberry32((seed * 2654435761) >>> 0);
  let deadEnds = 0;
  let misses = 0;
  let guard = 0;
  while (s.phase !== 'won' && s.phase !== 'lost' && guard++ < 1000) {
    if (s.phase === 'roundDone') {
      advanceRound(s);
      continue;
    }
    const good: 'left' | 'right' = isMismatch(s.tree, s.level + 1, 2 * s.index) ? 'left' : 'right';
    const side = rnd() < p.misread ? (good === 'left' ? 'right' : 'left') : good;
    const ready = Math.max(s.time, s.lockUntil) + p.react;
    const peak = nextOverhead(s, side, ready + CLIMB_SPEC.jumpPeak);
    const at = Math.max(Math.max(s.time, s.lockUntil), peak - CLIMB_SPEC.jumpPeak + gaussian(rnd) * p.sigma);
    if (at > s.time) stepClimb(s, at - s.time);
    jump(s);
    for (const e of stepClimb(s, CLIMB_SPEC.jumpPeak + 0.001)) {
      if (e.kind === 'deadEnd') deadEnds++;
      if (e.kind === 'miss') misses++;
    }
  }
  return { score: climbScore(s), roundsDone: s.roundsDone, hearts: s.hearts, coins: s.coins, lost: s.phase === 'lost', deadEnds, misses };
}

export interface ClimbBalance {
  games: number;
  mean: number;
  min: number;
  max: number;
  /** Số ván theo mốc: chua (chưa đạt), dong, bac, vang */
  medals: { chua: number; dong: number; bac: number; vang: number };
  /** Số ván hết tim */
  lost: number;
  meanCoins: number;
  meanDeadEnds: number;
  meanMisses: number;
}

export function simulateMany(profile: ClimbBotProfile, games: number, medals: MedalThresholds): ClimbBalance {
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let lost = 0;
  let coins = 0;
  let dead = 0;
  let miss = 0;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateClimb(seed, profile);
    sum += r.score;
    min = Math.min(min, r.score);
    max = Math.max(max, r.score);
    if (r.lost) lost++;
    coins += r.coins;
    dead += r.deadEnds;
    miss += r.misses;
    count[(['chua', 'dong', 'bac', 'vang'] as const)[medalOf(r.score, medals)]]++;
  }
  return { games, mean: sum / games, min, max, medals: count, lost, meanCoins: coins / games, meanDeadEnds: dead / games, meanMisses: miss / games };
}
