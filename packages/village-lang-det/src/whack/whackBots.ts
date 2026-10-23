/**
 * Bot mô phỏng cả ván màn 5 để kiểm tra cân bằng mốc điểm (bước B6, đổi mô hình ở bước sửa sau B6). Chỉ dùng trong test, không vào bản chạy. Đơn vị thời gian: giây; khung hình giả lập 1/60 giây.
 *
 * Bot "canh trước" (người thật không đợi chuột vào vùng rồi mới nhìn, mà đoán giờ chuột tới): với mỗi con chuột bot chọn thời điểm đập lúc con đó ở GIỮA vùng đập, lệch giờ theo phân phối chuẩn
 * độ lệch `sigma` giây (đổi ra vị trí theo tốc độ của chính con đó). Bot chỉ dùng thao tác của học sinh (`hitLane`, `collectCoin`, `answerBoss`) và chỉ biết những gì học sinh nhìn thấy.
 *  - Bỏ sót `skip`: xác suất bot không để ý tới một con chuột (hay đồng), không bao giờ ra tay với nó.
 *  - Một tay: hai cú đập cách nhau ít nhất `tapGap` giây (0,15 giây); nhiều con cùng sẵn sàng thì xếp hàng theo thứ tự tới vùng (con sẵn sàng trước đập trước). Chỉ đập con thấp nhất của làn (con mà cú đập sẽ trúng).
 *  - Chuột to: cú thứ hai vào lúc cú đầu cộng 0,3 giây khựng cộng độ lệch giờ (không sớm hơn `tapGap`).
 *  - Tiền đồng (tự chọn): bot ra tay sau 0,3 giây cộng |độ lệch giờ| kể từ lúc đồng hiện, sau mọi con chuột sẵn sàng.
 *  - Câu hỏi: bot trả lời sau `answerDelay` giây (còn lại = thời hạn − `answerDelay`; không còn thì hết giờ), đúng với xác suất `correct`.
 * Số ngẫu nhiên của bot lấy từ rng riêng (không đụng rng của ván nên cùng seed vẫn cùng chuỗi chuột).
 */
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { WHACK_SPEC } from './whackConfig';
import { answerBoss, collectCoin, createWhackGame, hitLane, lowestInZone, stepWhack, type Coin, type EndReason, type WhackPhase, type WhackState } from './whackLogic';

export interface WhackBotProfile {
  name: string;
  /** Độ lệch chuẩn của giờ đập so với lúc chuột ở giữa vùng đập (giây) */
  sigma: number;
  /** Xác suất bỏ sót một con chuột / một đồng */
  skip: number;
  /** Xác suất trả lời đúng */
  correct: number;
  /** Giây bot nghĩ trước khi trả lời */
  answerDelay: number;
  /** Giây tối thiểu giữa hai cú đập (một tay) */
  tapGap: number;
}

/** Bot giỏi (theo lời giao sửa sau B6): σ 0,05 giây, bỏ sót 2% chuột, đúng câu hỏi 95%, trả lời sau 4 giây. */
export const GOOD_BOT: WhackBotProfile = { name: 'good', sigma: 0.05, skip: 0.02, correct: 0.95, answerDelay: 4, tapGap: 0.15 };
/** Bot trung bình (theo lời giao sửa sau B6): σ 0,12 giây, bỏ sót 10% chuột, đúng 70%, trả lời sau 7 giây. */
export const AVERAGE_BOT: WhackBotProfile = { name: 'average', sigma: 0.12, skip: 0.1, correct: 0.7, answerDelay: 7, tapGap: 0.15 };
/** Người chơi lý tưởng (chỉ để ước điểm tối đa lý thuyết, không phải bot cân bằng): đập đúng lúc chuột ở giữa vùng, không sót, đúng hết, trả lời ngay (còn trọn thời hạn). */
export const ORACLE_BOT: WhackBotProfile = { name: 'oracle', sigma: 0, skip: 0, correct: 1, answerDelay: 0, tapGap: 0 };

export interface WhackSimResult {
  score: number;
  ended: EndReason;
  ink: number;
  spawned: number;
  hits: number;
  leaked: number;
  misses: number;
  coinsTaken: number;
  bossCorrect: number;
  /** Số lượt trùm đã trả lời (số lượt trùm gặp được) */
  bosses: number;
}

const FRAME = 1 / 60;
const MID = (WHACK_SPEC.zoneStart + WHACK_SPEC.zoneEnd) / 2;

const phaseOf = (s: WhackState): WhackPhase => s.phase;

/** Số ngẫu nhiên phân phối chuẩn (Box–Muller) từ rng. */
function gaussian(rnd: () => number): number {
  const u = Math.max(1e-12, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

interface MouseRec {
  ignore: boolean;
  /** Độ lệch giờ (giây) */
  jitter: number;
  /** Vị trí mà từ đó bot đập (giữa vùng cộng độ lệch giờ × tốc độ), đã kẹp vào [đầu vùng; ...] */
  target: number;
  hits: number;
  /** Lúc đập cú đầu (chuột to) */
  hitAt: number;
  /** Lúc bắt đầu sẵn sàng (để xếp hàng) */
  readyAt: number;
}

/** Chơi trọn một ván với `seed` và hồ sơ bot `p`. */
export function simulateWhack(seed: number, p: WhackBotProfile): WhackSimResult {
  const s = createWhackGame(seed);
  const bot = createMulberry32(((seed * 2654435761) ^ 0x9e3779b9) >>> 0);
  const recs = new Map<number, MouseRec>();
  const coinSeen = new Map<Coin, { ignore: boolean; due: number }>();
  let now = 0;
  let lastTap = -Infinity;
  for (let frame = 0; frame < 200000 && phaseOf(s) !== 'ended'; frame++) {
    if (phaseOf(s) === 'quiz') {
      const left = s.boss!.answerSeconds - p.answerDelay;
      if (left <= 0) answerBoss(s, 'timeout', 0);
      else answerBoss(s, bot() < p.correct ? 'correct' : 'wrong', left);
      continue;
    }
    stepWhack(s, FRAME);
    now += FRAME;
    // stepWhack đổi s.phase mà TypeScript không thấy: đọc qua hàm để không bị thu hẹp kiểu
    if (phaseOf(s) === 'ended' || phaseOf(s) === 'quiz') continue;

    // ghi nhận chuột mới: bỏ sót hay không, lệch giờ bao nhiêu
    for (const m of s.mice) {
      if (recs.has(m.id)) continue;
      const jitter = gaussian(bot) * p.sigma;
      recs.set(m.id, { ignore: bot() < p.skip, jitter, target: Math.max(WHACK_SPEC.zoneStart, MID + jitter * m.speed), hits: m.hits, hitAt: -Infinity, readyAt: Infinity });
    }

    // con sẵn sàng: thấp nhất của làn, trong vùng đập, tới giờ đập; xếp hàng theo lúc sẵn sàng
    let bestLane = -1;
    let bestAt = Infinity;
    for (let lane = 0; lane < WHACK_SPEC.lanes; lane++) {
      const m = lowestInZone(s, lane);
      if (!m) continue;
      const rec = recs.get(m.id)!;
      if (rec.hits !== m.hits) {
        rec.hits = m.hits;
        rec.hitAt = now;
        rec.readyAt = Infinity;
      }
      if (rec.ignore || s.rest[lane] > 0) continue;
      const due = rec.hitAt > -Infinity ? now >= rec.hitAt + Math.max(p.tapGap, WHACK_SPEC.bigFreeze + rec.jitter) : m.pos >= rec.target;
      if (!due) continue;
      if (rec.readyAt === Infinity) rec.readyAt = now;
      if (rec.readyAt < bestAt) {
        bestAt = rec.readyAt;
        bestLane = lane;
      }
    }
    if (now - lastTap < p.tapGap - 1e-9) continue;
    if (bestLane >= 0) {
      hitLane(s, bestLane);
      lastTap = now;
      continue;
    }
    if (s.coin) {
      let rec = coinSeen.get(s.coin);
      if (!rec) {
        rec = { ignore: bot() < p.skip, due: now + 0.3 + Math.abs(gaussian(bot) * p.sigma) };
        coinSeen.set(s.coin, rec);
      }
      if (!rec.ignore && now >= rec.due) {
        collectCoin(s);
        lastTap = now;
      }
    }
  }
  return {
    score: s.score,
    ended: s.ended ?? 'ink',
    ink: s.ink,
    spawned: s.stats.spawned,
    hits: s.stats.hits,
    leaked: s.stats.leaked,
    misses: s.stats.misses,
    coinsTaken: s.stats.coinsTaken,
    bossCorrect: s.stats.bossCorrect,
    bosses: s.bossesDone,
  };
}

export interface WhackBalance {
  games: number;
  mean: number;
  min: number;
  max: number;
  /** Số ván theo mốc: chưa đạt, Đồng, Bạc, Vàng */
  medals: { chua: number; dong: number; bac: number; vang: number };
  /** Số ván thua vì đủ `inkMax` vết mực */
  lost: number;
  /** Số ván chơi hết cả 10 lượt trùm */
  fullBosses: number;
  /** Điểm từng ván (theo seed 1 đến `games`), để tính phân vị khi đặt mốc */
  scores: number[];
  meanSpawned: number;
  meanHits: number;
  meanLeaked: number;
  meanCoins: number;
  /** Số lượt trùm gặp được, trung bình */
  meanBosses: number;
  meanBossCorrect: number;
}

/** Chơi `games` ván (seed 1 đến `games`) và tổng hợp theo mốc `medals`. */
export function simulateMany(profile: WhackBotProfile, games: number, medals: MedalThresholds): WhackBalance {
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  const scores: number[] = [];
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let lost = 0;
  let full = 0;
  let spawned = 0;
  let hits = 0;
  let leaked = 0;
  let coins = 0;
  let bosses = 0;
  let correct = 0;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateWhack(seed, profile);
    scores.push(r.score);
    sum += r.score;
    min = Math.min(min, r.score);
    max = Math.max(max, r.score);
    if (r.ended === 'ink') lost++;
    if (r.bosses >= WHACK_SPEC.boss.count) full++;
    spawned += r.spawned;
    hits += r.hits;
    leaked += r.leaked;
    coins += r.coinsTaken;
    bosses += r.bosses;
    correct += r.bossCorrect;
    count[(['chua', 'dong', 'bac', 'vang'] as const)[medalOf(r.score, medals)]]++;
  }
  return {
    games,
    mean: sum / games,
    min,
    max,
    medals: count,
    lost,
    fullBosses: full,
    scores,
    meanSpawned: spawned / games,
    meanHits: hits / games,
    meanLeaked: leaked / games,
    meanCoins: coins / games,
    meanBosses: bosses / games,
    meanBossCorrect: correct / games,
  };
}

/** Phân vị `q` (0 đến 1) theo hạng gần nhất: phần tử thứ ceil(q × n) của mảng sắp tăng. */
export function percentile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
}
