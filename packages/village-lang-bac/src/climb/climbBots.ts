/**
 * Bot mô phỏng cả ván màn 12 để kiểm tra cân bằng mốc điểm. Chỉ dùng trong test, không vào bản chạy.
 *
 * Bot chỉ dùng thao tác của học sinh (`setMove`, `jump`) và chỉ biết những gì học sinh nhìn thấy: giá trị hai nút con (trái, phải) và các số trên bậc lựa chọn đang trượt.
 * Mỗi tầng bot tự tính combine(trái, phải), chọn bậc, nhảy rồi lái trên không về chỗ bậc sẽ tới lúc chạm độ cao của bậc. Bot chạy từng khung 1/60 giây như màn chơi thật.
 */
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { CLIMB_SPEC } from './climbConfig';
import { advanceRound, choiceX, climbScore, createClimbGame, jump, setMove, stepClimb, tierY, type ClimbState } from './climbLogic';

export interface ClimbBotProfile {
  name: string;
  /** Xác suất mỗi lần thử nhắm vào bậc sai (nhầm thứ tự hay nhầm phép ghép) */
  misorder: number;
  /** Xác suất mỗi lần thử nhảy hụt (nhảy tại chỗ, không lái về bậc nào) */
  miss: number;
  /** Thời gian nhìn và quyết định sau mỗi lần đáp (giây) */
  react: number;
}

/** Bot giỏi: tính đúng, canh đúng, không nhầm, không hụt. */
export const GOOD_BOT: ClimbBotProfile = { name: 'good', misorder: 0, miss: 0, react: 0.3 };
/** Bot trung bình (lời giao): nhầm thứ tự 15%, nhảy hụt 10%. */
export const AVERAGE_BOT: ClimbBotProfile = { name: 'average', misorder: 0.15, miss: 0.1, react: 0.6 };

export interface ClimbSimResult {
  score: number;
  roundsDone: number;
  hearts: number;
  mistakes: number;
  misses: number;
  /** Hết tim trước khi xong vòng cuối */
  lost: boolean;
}

const DT = 1 / 60;
const MAX_TICKS = 60 * 900;

/** Thời gian (giây) từ lúc này tới lúc chân đi xuống qua độ cao `ty` (đang rơi); Infinity nếu không bao giờ tới. */
function timeToCross(y: number, vy: number, ty: number): number {
  const disc = vy * vy + 2 * CLIMB_SPEC.gravity * (y - ty);
  return disc < 0 ? Infinity : (vy + Math.sqrt(disc)) / CLIMB_SPEC.gravity;
}

export function simulateClimb(seed: number, profile: ClimbBotProfile, trace?: string[]): ClimbSimResult {
  const s: ClimbState = createClimbGame(seed);
  const rnd = createMulberry32(seed ^ 0x9e3779b9);
  let misses = 0;
  let waitUntil = profile.react;
  /** Quyết định của lần thử hiện tại: nhắm bậc nào (chỉ số trong s.choices), có nhảy hụt không */
  let plan: { target: number; hole: boolean } | null = null;
  let planLevel = -1;
  let ticks = 0;
  while ((s.phase === 'playing' || s.phase === 'roundDone') && ticks++ < MAX_TICKS) {
    if (s.phase === 'roundDone') {
      advanceRound(s);
      waitUntil = s.time + profile.react;
      plan = null;
      continue;
    }
    const p = s.player;
    if (s.mode !== 'free') {
      setMove(s, 0);
      plan = null;
      waitUntil = s.time + profile.react;
    } else if (p.grounded) {
      setMove(s, 0);
      if (s.time >= waitUntil && s.time >= s.lockUntil) {
        if (!plan || planLevel !== s.level) {
          const correct = s.choices.findIndex((c) => c.correct);
          const wrongs = s.choices.map((_, i) => i).filter((i) => i !== correct);
          const pickWrong = rnd() < profile.misorder && wrongs.length > 0;
          plan = { target: pickWrong ? wrongs[Math.floor(rnd() * wrongs.length)] : correct, hole: rnd() < profile.miss };
          planLevel = s.level;
        }
        jump(s);
      }
    } else if (plan && !plan.hole) {
      // trên không: lái về x của bậc sẽ tới lúc chân qua độ cao của bậc lựa chọn
      const c = s.choices[plan.target];
      if (c) {
        const t = timeToCross(p.y, p.vy, tierY(s.level + 1));
        const future = choiceX({ slideClock: s.slideClock + (Number.isFinite(t) ? t : 0) * (s.slow ? CLIMB_SPEC.reducedSlideScale : 1), round: s.round, choices: s.choices }, c);
        const dx = future - p.x;
        setMove(s, Math.abs(dx) < 0.08 ? 0 : dx > 0 ? 1 : -1);
      }
    } else setMove(s, 0);
    const events = stepClimb(s, DT);
    for (const e of events) {
      if (e.kind === 'miss' || e.kind === 'fell') misses++;
      trace?.push(`${s.time.toFixed(2)} r${s.round} L${s.level} ${JSON.stringify(e)} px=${s.player.x.toFixed(2)}`);
    }
    if (events.some((e) => e.kind === 'up')) {
      plan = null;
      waitUntil = s.time + profile.react;
    } else if (events.some((e) => e.kind === 'miss' || e.kind === 'fell' || e.kind === 'retry')) {
      plan = null;
      waitUntil = s.time + profile.react;
    }
  }
  return { score: climbScore(s), roundsDone: s.roundsDone, hearts: s.hearts, mistakes: s.mistakes, misses, lost: s.phase === 'lost' };
}

export interface ClimbSimSummary {
  games: number;
  mean: number;
  min: number;
  max: number;
  medals: { chua: number; dong: number; bac: number; vang: number };
  lost: number;
  meanMistakes: number;
  meanMisses: number;
}

export function simulateMany(profile: ClimbBotProfile, games: number, thresholds: MedalThresholds): ClimbSimSummary {
  const out: ClimbSimSummary = { games, mean: 0, min: Infinity, max: -Infinity, medals: { chua: 0, dong: 0, bac: 0, vang: 0 }, lost: 0, meanMistakes: 0, meanMisses: 0 };
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateClimb(seed, profile);
    out.mean += r.score;
    out.min = Math.min(out.min, r.score);
    out.max = Math.max(out.max, r.score);
    out.meanMistakes += r.mistakes;
    out.meanMisses += r.misses;
    if (r.lost) out.lost++;
    out.medals[(['chua', 'dong', 'bac', 'vang'] as const)[medalOf(r.score, thresholds)]]++;
  }
  out.mean /= games;
  out.meanMistakes /= games;
  out.meanMisses /= games;
  return out;
}
