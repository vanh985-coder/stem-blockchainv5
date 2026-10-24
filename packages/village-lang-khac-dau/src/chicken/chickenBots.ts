/**
 * Bot mô phỏng cả ván màn 9 để kiểm tra cân bằng mốc điểm và độ khó (bước B10). Chỉ dùng trong test, không vào bản chạy. Đơn vị thời gian: giây; bước mô phỏng bằng đúng bước cố định của logic (1/120 giây).
 *
 * Bot chỉ dùng thao tác của học sinh (`dropLabel`, `startWave`, `selectMedicine`, `shoot`) và chỉ biết những gì học sinh nhìn thấy (thẻ trên gà, mẫu công khai tính bằng `publicKey`).
 *  - Nạp đạn: với xác suất `1 − cleanLoad` bot kéo SAI một nhãn (nhãn nhiễu vào một thuốc) trước khi nạp đúng hết; còn lại nạp đúng ngay. Nạp đạn không tính giờ.
 *  - Bắn: luôn nhắm con gà GẦN CỔNG NHẤT chưa có viên thuốc nào đang bay tới; chọn đúng thuốc với xác suất `accuracy` (không thì chọn ngẫu nhiên một thuốc khác); mỗi phát nghĩ `think` giây (không dưới
 *    thời gian chờ giữa hai phát 0,35 giây); lúc chưa có gà nào để nhắm thì chờ, hễ có gà là bắn nếu đã nghĩ xong.
 * Số ngẫu nhiên của bot lấy từ rng riêng (không đụng rng của ván nên cùng seed vẫn cùng chuỗi gà).
 */
import { publicKey } from '@so-chung/core/lessons/bai-3/logic';
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { CHICKEN_SPEC, type ChickenSpec } from './chickenConfig';
import { chickenScore, createChickenGame, dropLabel, phaseOf, selectMedicine, shoot, startWave, stepChicken, type ChickenState, type EndReason } from './chickenLogic';

export interface ChickenBotProfile {
  name: string;
  /** Giây nghĩ mỗi phát bắn */
  think: number;
  /** Xác suất chọn đúng thuốc */
  accuracy: number;
  /** Xác suất nạp đạn một đợt không sai lần nào */
  cleanLoad: number;
}

/** Bot giỏi (lời giao B10): 0,4 giây mỗi phát, đúng thuốc 98%, nạp không sai ở 90% số đợt. */
export const GOOD_BOT: ChickenBotProfile = { name: 'good', think: 0.4, accuracy: 0.98, cleanLoad: 0.9 };
/** Bot trung bình (lời giao B10): 0,8 giây mỗi phát, đúng thuốc 85%, nạp sai ít nhất 1 lần ở 50% số đợt. */
export const AVERAGE_BOT: ChickenBotProfile = { name: 'average', think: 0.8, accuracy: 0.85, cleanLoad: 0.5 };
/** Bot chậm (sửa sau B10): 1,2 giây mỗi phát, đúng thuốc 80%, nạp sai ít nhất 1 lần ở 60% số đợt (nạp không sai ở 40%). */
export const SLOW_BOT: ChickenBotProfile = { name: 'slow', think: 1.2, accuracy: 0.8, cleanLoad: 0.4 };
/** Người chơi lý tưởng (chỉ để ước điểm tối đa, không phải bot cân bằng): không nghĩ, không bao giờ sai. */
export const ORACLE_BOT: ChickenBotProfile = { name: 'oracle', think: 0, accuracy: 1, cleanLoad: 1 };

export interface ChickenSimResult {
  score: number;
  ended: EndReason;
  hearts: number;
  cured: number;
  wrongShots: number;
  voidShots: number;
  leaked: number;
  cleanLoads: number;
  reachedBoss: boolean;
  bossCleared: boolean;
  bossCures: number;
  /** Số giây ván kéo dài (đồng hồ của bot) */
  seconds: number;
}

const MAX_SECONDS = 900;

/** Bot nạp đạn cho đợt đang mở: có thể kéo sai một nhãn nhiễu trước, rồi nạp đúng hết. */
function botLoad(s: ChickenState, rnd: () => number, p: ChickenBotProfile): void {
  const load = s.loads[s.round];
  const keys = s.spec.rounds[s.round].keys;
  if (rnd() >= p.cleanLoad) {
    const decoys = load.labels.filter((l) => l.kind !== 'dung');
    const l = decoys[Math.floor(rnd() * decoys.length)];
    dropLabel(s, l.id, Math.floor(rnd() * keys.length));
  }
  keys.forEach((k, i) => {
    const right = load.labels.find((l) => l.kind === 'dung' && l.value === publicKey(k))!;
    dropLabel(s, right.id, i);
  });
}

/** Con gà gần cổng nhất mà chưa có viên thuốc nào đang bay tới; không có thì null. */
function pickTarget(s: ChickenState): ChickenState['chickens'][number] | null {
  let best: ChickenState['chickens'][number] | null = null;
  for (const c of s.chickens) {
    if (s.projectiles.some((q) => q.chickenId === c.id)) continue;
    if (best === null || c.pos > best.pos) best = c;
  }
  return best;
}

/** Chơi trọn một ván với `seed` và hồ sơ bot `p` (luật `spec`). */
export function simulateChicken(seed: number, p: ChickenBotProfile, spec: ChickenSpec = CHICKEN_SPEC): ChickenSimResult {
  const s = createChickenGame(seed, spec);
  const rnd = createMulberry32((seed * 2654435761) >>> 0);
  const h = spec.tick;
  let t = 0;
  let nextShot = 0;
  while (s.phase !== 'ended' && t < MAX_SECONDS) {
    if (s.phase === 'load') {
      botLoad(s, rnd, p);
      startWave(s);
      nextShot = t + p.think;
      continue;
    }
    stepChicken(s, h);
    t += h;
    if (phaseOf(s) === 'ended' || t < nextShot - 1e-9) continue;
    const target = pickTarget(s);
    if (!target) continue;
    const right = spec.rounds[s.round].keys.findIndex((k) => publicKey(k) === target.card);
    let med = right;
    if (rnd() >= p.accuracy) {
      const others = spec.rounds[s.round].keys.map((_, i) => i).filter((i) => i !== right);
      med = others[Math.floor(rnd() * others.length)];
    }
    selectMedicine(s, med);
    if (shoot(s, target.id).ok) nextShot = t + Math.max(p.think, spec.cooldown);
  }
  return {
    score: chickenScore(s),
    ended: s.ended ?? 'hearts',
    hearts: s.hearts,
    cured: s.stats.cured,
    wrongShots: s.stats.wrongShots,
    voidShots: s.stats.voidShots,
    leaked: s.stats.leaked,
    cleanLoads: s.stats.cleanLoads,
    reachedBoss: s.stats.reachedBoss,
    bossCleared: s.stats.bossCleared,
    bossCures: s.stats.bossCures,
    seconds: t,
  };
}

export interface ChickenBalance {
  games: number;
  mean: number;
  min: number;
  max: number;
  /** Số ván theo mốc: chưa đạt, Đồng, Bạc, Vàng */
  medals: { chua: number; dong: number; bac: number; vang: number };
  /** Điểm từng ván (theo seed 1 đến `games`), để tính phân vị khi đặt mốc */
  scores: number[];
  /** Số ván tới được gà trùm, số ván chữa xong trùm, số ván hết tim, số ván gà trùm tới cổng */
  reachedBoss: number;
  bossCleared: number;
  lostHearts: number;
  bossEscaped: number;
  /** Số tim mất trung bình mỗi ván (tim ban đầu − tim còn lại) */
  meanHeartsLost: number;
  meanCured: number;
  meanWrong: number;
  meanCleanLoads: number;
  meanSeconds: number;
}

/** Chơi `games` ván (seed 1 đến `games`) và tổng hợp theo mốc `medals`. */
export function simulateMany(profile: ChickenBotProfile, games: number, medals: MedalThresholds, spec: ChickenSpec = CHICKEN_SPEC): ChickenBalance {
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  const scores: number[] = [];
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let reached = 0;
  let cleared = 0;
  let lost = 0;
  let escaped = 0;
  let heartsLost = 0;
  let cured = 0;
  let wrong = 0;
  let clean = 0;
  let seconds = 0;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateChicken(seed, profile, spec);
    scores.push(r.score);
    sum += r.score;
    min = Math.min(min, r.score);
    max = Math.max(max, r.score);
    if (r.reachedBoss) reached++;
    if (r.bossCleared) cleared++;
    if (r.ended === 'hearts') lost++;
    if (r.ended === 'boss') escaped++;
    heartsLost += spec.hearts - Math.max(0, r.hearts);
    cured += r.cured;
    wrong += r.wrongShots;
    clean += r.cleanLoads;
    seconds += r.seconds;
    count[(['chua', 'dong', 'bac', 'vang'] as const)[medalOf(r.score, medals)]]++;
  }
  return {
    games,
    mean: sum / games,
    min,
    max,
    medals: count,
    scores,
    reachedBoss: reached,
    bossCleared: cleared,
    lostHearts: lost,
    bossEscaped: escaped,
    meanHeartsLost: heartsLost / games,
    meanCured: cured / games,
    meanWrong: wrong / games,
    meanCleanLoads: clean / games,
    meanSeconds: seconds / games,
  };
}

/** Phân vị `q` (0 đến 1) theo hạng gần nhất: phần tử thứ ceil(q × n) của mảng sắp tăng. */
export function percentile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}
