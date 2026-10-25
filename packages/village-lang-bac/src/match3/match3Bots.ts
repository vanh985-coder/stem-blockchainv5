/**
 * Bot mô phỏng cả ván màn 11 để kiểm tra cân bằng mốc điểm và độ khó (bước B12). Chỉ dùng trong test, không vào bản chạy.
 *
 * Bot chỉ dùng thao tác của học sinh (`swapCells`, `advanceRound`) và chỉ biết những gì học sinh nhìn thấy: bàn hiện tại và các ô cây. Nó nhìn MỘT nước đi (`previewMove`: đợt nổ đầu, không đoán lá rơi xuống).
 *  - Bot giỏi: chọn nước lấp được nhiều ô cây nhất, rồi nổ nhiều lá nhất (hòa thì chọn ngẫu nhiên bằng rng riêng của bot).
 *  - Bot trung bình: 50% chọn như bot giỏi, 50% chọn ngẫu nhiên một nước hợp lệ.
 * Số ngẫu nhiên của bot lấy từ rng riêng (không đụng rng của ván).
 */
import { medalOf, type MedalThresholds } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { MATCH3_SPEC, type Match3Spec } from './match3Config';
import { advanceRound, createMatch3Game, legalMoves, previewMove, swapCells, type Match3State, type Move } from './match3Logic';

export interface Match3BotProfile {
  name: string;
  /** Xác suất chọn nước tốt nhất (còn lại chọn ngẫu nhiên một nước hợp lệ) */
  smart: number;
}

export const GOOD_BOT: Match3BotProfile = { name: 'good', smart: 1 };
export const AVERAGE_BOT: Match3BotProfile = { name: 'average', smart: 0.5 };
/** Chỉ để báo cáo mức sàn (không phải bot cân bằng): luôn chọn ngẫu nhiên một nước hợp lệ. */
export const RANDOM_BOT: Match3BotProfile = { name: 'random', smart: 0 };

/** Nước tốt nhất theo (ô cây lấp được, lá nổ); hòa thì ngẫu nhiên. null nếu không có nước hợp lệ. */
export function bestMove(s: Match3State, rng: () => number): Move | null {
  const moves = legalMoves(s.board);
  if (moves.length === 0) return null;
  let best: Move[] = [];
  let bestSlots = -1;
  let bestLeaves = -1;
  for (const m of moves) {
    const p = previewMove(s, m);
    if (!p) continue;
    if (p.slots > bestSlots || (p.slots === bestSlots && p.leaves > bestLeaves)) {
      best = [m];
      bestSlots = p.slots;
      bestLeaves = p.leaves;
    } else if (p.slots === bestSlots && p.leaves === bestLeaves) best.push(m);
  }
  return best[Math.floor(rng() * best.length)] ?? null;
}

export function randomMove(s: Match3State, rng: () => number): Move | null {
  const moves = legalMoves(s.board);
  return moves.length ? moves[Math.floor(rng() * moves.length)] : null;
}

export interface Match3SimResult {
  score: number;
  /** Vòng nào xong cây */
  done: readonly boolean[];
  /** Số lượt dư mỗi vòng */
  turnsLeft: readonly number[];
  slotsFilled: number;
  leaves: number;
  moves: number;
  shuffles: number;
  fakesThrown: number;
}

/** Chơi trọn một ván (cả ba vòng) bằng thao tác của học sinh. */
export function simulateMatch3(seed: number, profile: Match3BotProfile, spec: Match3Spec = MATCH3_SPEC): Match3SimResult {
  const s = createMatch3Game(seed, spec);
  const rng = createMulberry32(seed ^ 0xb07b07);
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 5000) {
    if (s.phase === 'roundEnd') {
      advanceRound(s);
      continue;
    }
    const m = rng() < profile.smart ? bestMove(s, rng) : randomMove(s, rng);
    if (!m) break; // không có nước đi (không xảy ra: bàn luôn được xáo lại)
    swapCells(s, m.a, m.b);
  }
  return {
    score: s.score,
    done: s.results.map((r) => r.done),
    turnsLeft: s.results.map((r) => r.turnsLeft),
    slotsFilled: s.stats.slotsFilled,
    leaves: s.stats.leavesCleared,
    moves: s.stats.moves,
    shuffles: s.stats.shuffles,
    fakesThrown: s.stats.fakesThrown,
  };
}

export interface Match3Summary {
  games: number;
  mean: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p75: number;
  /** Số ván chưa đạt, Đồng, Bạc, Vàng */
  medals: [number, number, number, number];
  /** Tỉ lệ xong cây ở từng vòng */
  doneRate: number[];
  meanSlots: number;
  meanShuffles: number;
}

const percentile = (sorted: readonly number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

/** Mô phỏng `games` ván (seed 1 đến `games`) và tóm tắt. */
export function simulateMany(profile: Match3BotProfile, spec: Match3Spec = MATCH3_SPEC, games = 300, medals: MedalThresholds = spec.medals): { results: Match3SimResult[]; summary: Match3Summary } {
  const results: Match3SimResult[] = [];
  for (let seed = 1; seed <= games; seed++) results.push(simulateMatch3(seed, profile, spec));
  const scores = results.map((r) => r.score).sort((a, b) => a - b);
  const medalCount: [number, number, number, number] = [0, 0, 0, 0];
  for (const r of results) medalCount[medalOf(r.score, medals)]++;
  const rounds = spec.rounds.length;
  return {
    results,
    summary: {
      games,
      mean: results.reduce((a, r) => a + r.score, 0) / games,
      min: scores[0],
      max: scores[scores.length - 1],
      p10: percentile(scores, 0.1),
      p25: percentile(scores, 0.25),
      p75: percentile(scores, 0.75),
      medals: medalCount,
      doneRate: Array.from({ length: rounds }, (_, i) => results.filter((r) => r.done[i]).length / games),
      meanSlots: results.reduce((a, r) => a + r.slotsFilled, 0) / games,
      meanShuffles: results.reduce((a, r) => a + r.shuffles, 0) / games,
    },
  };
}
