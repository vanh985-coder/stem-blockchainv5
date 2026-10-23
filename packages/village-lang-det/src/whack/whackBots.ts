/**
 * Bot mô phỏng cả ván màn 5 để kiểm tra cân bằng mốc điểm (bước B6). Chỉ dùng trong test, không vào bản chạy. Đơn vị thời gian: giây; khung hình giả lập 1/60 giây.
 *
 * Bot chỉ dùng thao tác của học sinh (`hitLane`, `collectCoin`, `answerBoss`) và chỉ biết những gì học sinh nhìn thấy: chuột đang trong vùng đập, đồng đang hiện, bảng câu hỏi.
 *  - Phản xạ `reflex`: từ lúc một con chuột (hoặc đồng) vào tầm đập tới lúc bot ra tay. Chuột vào vùng rồi ra khỏi vùng (hoặc lọt) trước đó thì bot lỡ.
 *  - Bỏ sót `skip`: xác suất bot không để ý tới một con chuột (hay đồng) nào đó, không bao giờ ra tay với nó.
 *  - Một tay: hai cú đập cách nhau ít nhất `tapGap` giây (tự chọn: 0,15 giây bot giỏi, 0,2 giây bot trung bình; người thật không đập hai làn cùng lúc được). Nhiều con cùng sẵn sàng thì đập con thấp nhất trước.
 *  - Chuột to: sau cú đập đầu, bot đếm lại `reflex` rồi mới đập tiếp.
 *  - Câu hỏi: bot trả lời sau `answerDelay` giây (còn lại = thời hạn − `answerDelay`; không còn thì hết giờ), đúng với xác suất `correct`.
 * Số ngẫu nhiên của bot lấy từ rng riêng (không đụng rng của ván nên cùng seed vẫn cùng chuỗi chuột).
 */
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { WHACK_SPEC } from './whackConfig';
import { answerBoss, collectCoin, createWhackGame, hitLane, lowestInZone, stepWhack, type Coin, type EndReason, type WhackPhase, type WhackState } from './whackLogic';

export interface WhackBotProfile {
  name: string;
  /** Phản xạ (giây) */
  reflex: number;
  /** Xác suất bỏ sót một con chuột / một đồng */
  skip: number;
  /** Xác suất trả lời đúng */
  correct: number;
  /** Giây bot nghĩ trước khi trả lời */
  answerDelay: number;
  /** Giây tối thiểu giữa hai cú đập (một tay) */
  tapGap: number;
}

/** Bot giỏi (theo lời giao bước B6): phản xạ 0,25 giây, trả lời đúng 95%, trả lời sau 4 giây, không bỏ sót chuột. */
export const GOOD_BOT: WhackBotProfile = { name: 'good', reflex: 0.25, skip: 0, correct: 0.95, answerDelay: 4, tapGap: 0.15 };
/** Bot trung bình (theo lời giao bước B6): phản xạ 0,45 giây, bỏ sót 25% chuột, đúng 70%, trả lời sau 7 giây. */
export const AVERAGE_BOT: WhackBotProfile = { name: 'average', reflex: 0.45, skip: 0.25, correct: 0.7, answerDelay: 7, tapGap: 0.2 };
/** Người chơi lý tưởng (chỉ để ước điểm tối đa lý thuyết, không phải bot cân bằng): ra tay ngay khung đầu chuột vào vùng, đúng hết, trả lời ngay (còn trọn thời hạn). */
export const ORACLE_BOT: WhackBotProfile = { name: 'oracle', reflex: 0, skip: 0, correct: 1, answerDelay: 0, tapGap: 0 };

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
  /** Số lượt trùm đã trả lời */
  bosses: number;
}

const FRAME = 1 / 60;

const phaseOf = (s: WhackState): WhackPhase => s.phase;

/** Chơi trọn một ván với `seed` và hồ sơ bot `p`. */
export function simulateWhack(seed: number, p: WhackBotProfile): WhackSimResult {
  const s = createWhackGame(seed);
  const bot = createMulberry32(((seed * 2654435761) ^ 0x9e3779b9) >>> 0);
  /** Chuột đã thấy: lúc thấy (hoặc lúc đập đầu của chuột to), có bị bỏ sót, số cú còn lại lúc ghi */
  const seen = new Map<number, { t: number; ignore: boolean; hits: number }>();
  const coinSeen = new Map<Coin, { t: number; ignore: boolean }>();
  let now = 0;
  let lastTap = -Infinity;
  for (let frame = 0; frame < 200000 && s.phase !== 'ended'; frame++) {
    if (s.phase === 'quiz') {
      const total = s.boss!.answerSeconds;
      const left = total - p.answerDelay;
      if (left <= 0) answerBoss(s, 'timeout', 0);
      else answerBoss(s, bot() < p.correct ? 'correct' : 'wrong', left);
      continue;
    }
    stepWhack(s, FRAME);
    now += FRAME;
    // stepWhack đổi s.phase mà TypeScript không thấy: đọc qua hàm để không bị thu hẹp kiểu
    if (phaseOf(s) === 'ended' || phaseOf(s) === 'quiz') continue;
    const canTap = now - lastTap >= p.tapGap - 1e-9;
    // chọn con sẵn sàng thấp nhất (vị trí lớn nhất)
    let bestLane = -1;
    let bestPos = -Infinity;
    for (let lane = 0; lane < WHACK_SPEC.lanes; lane++) {
      const m = lowestInZone(s, lane);
      if (!m) continue;
      let rec = seen.get(m.id);
      if (!rec) {
        rec = { t: now, ignore: bot() < p.skip, hits: m.hits };
        seen.set(m.id, rec);
      } else if (rec.hits !== m.hits) {
        rec.t = now;
        rec.hits = m.hits;
      }
      if (rec.ignore || now - rec.t < p.reflex - 1e-9 || s.rest[lane] > 0) continue;
      if (m.pos > bestPos) {
        bestPos = m.pos;
        bestLane = lane;
      }
    }
    if (!canTap) continue;
    if (bestLane >= 0) {
      hitLane(s, bestLane);
      lastTap = now;
      continue;
    }
    if (s.coin) {
      let rec = coinSeen.get(s.coin);
      if (!rec) {
        rec = { t: now, ignore: bot() < p.skip };
        coinSeen.set(s.coin, rec);
      }
      if (!rec.ignore && now - rec.t >= p.reflex - 1e-9) {
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
  /** Số ván thua vì đủ 5 vết mực */
  lost: number;
  meanSpawned: number;
  meanHits: number;
  meanLeaked: number;
  meanCoins: number;
  meanBosses: number;
  meanBossCorrect: number;
}

/** Chơi `games` ván (seed 1 đến `games`) và tổng hợp theo mốc `medals`. */
export function simulateMany(profile: WhackBotProfile, games: number, medals: MedalThresholds): WhackBalance {
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let lost = 0;
  let spawned = 0;
  let hits = 0;
  let leaked = 0;
  let coins = 0;
  let bosses = 0;
  let correct = 0;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateWhack(seed, profile);
    sum += r.score;
    min = Math.min(min, r.score);
    max = Math.max(max, r.score);
    if (r.ended === 'ink') lost++;
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
    meanSpawned: spawned / games,
    meanHits: hits / games,
    meanLeaked: leaked / games,
    meanCoins: coins / games,
    meanBosses: bosses / games,
    meanBossCorrect: correct / games,
  };
}
