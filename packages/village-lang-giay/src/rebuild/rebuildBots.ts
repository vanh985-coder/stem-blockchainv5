/**
 * Bot mô phỏng cả ván màn 3 (2 vòng ghép sổ) để kiểm tra cân bằng mốc điểm. Chỉ dùng trong test và công cụ, không vào bản chạy.
 *
 * Bot chỉ dùng thao tác của học sinh (đặt thẻ, kéo vào rổ) và chỉ đọc những gì học sinh nhìn thấy (công thức trên thẻ, mã trước của ô), không đọc cờ `isFake`.
 * Vòng 1 và 2: bot giỏi chơi hoàn hảo; bot trung bình (`AVERAGE_BOT`, từ bước X3 là bot chính) mỗi lần đặt thẻ có xác suất đặt nhầm một thẻ sai mã trước, và ở vòng 2 có xác suất đặt thẳng trang giả vào chuỗi trước khi bỏ vào rổ; `AVERAGE_BOT_CLEAN` chơi hoàn hảo vòng 1, 2 để so sánh.
 */
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { medalOf } from '@so-chung/core';
import { REBUILD_SPEC } from './rebuildConfig';
import {
  advance,
  binCard,
  checkPlacement,
  createRebuild,
  formulaHolds,
  insertFake,
  placeCard,
  rebuildScore,
  tailCode,
  type Card,
  type RebuildPhase,
  type RebuildState,
} from './rebuildLogic';

export interface RebuildBotProfile {
  name: string;
  /** Xác suất mỗi lần đặt thẻ ở vòng 1, 2 bị đặt nhầm một thẻ sai mã trước */
  slip: number;
  /** Xác suất ở vòng 2 đặt thẳng trang giả vào chuỗi trước khi bỏ vào rổ */
  fakeMiss: number;
}

/** Bot giỏi: soi công thức và ghép chuẩn xác, không sai sót. */
export const GOOD_BOT: RebuildBotProfile = { name: 'good', slip: 0, fakeMiss: 0 };
/** Bot trung bình: 8% đặt nhầm thẻ sai mã trước, 15% đặt thẳng trang giả vào chuỗi. */
export const AVERAGE_BOT: RebuildBotProfile = { name: 'average', slip: 0.08, fakeMiss: 0.15 };
/** Như bot trung bình nhưng chơi hoàn hảo không lỗi: để so sánh. */
export const AVERAGE_BOT_CLEAN: RebuildBotProfile = { ...AVERAGE_BOT, name: 'average-clean', slip: 0, fakeMiss: 0 };

export interface RebuildSimResult {
  score: number;
  hearts: number;
  over: 'hearts' | 'done';
}

function rightCard(s: RebuildState): Card {
  return s.tray.find((c) => checkPlacement(tailCode(s), c) === 'ok') as Card;
}

const phaseOf = (s: RebuildState): RebuildPhase => s.phase;

function playRound12(s: RebuildState, p: RebuildBotProfile, rnd: () => number): void {
  if (s.phase === 'villain') {
    insertFake(s);
    const fake = s.tray.find((c) => !formulaHolds(c));
    if (fake) {
      if (rnd() < p.fakeMiss) placeCard(s, fake.id); // đặt thẳng vào chuỗi: bật ra, mất 1 tim
      if (phaseOf(s) === 'play') binCard(s, fake.id);
    }
  }
  let guard = 0;
  while (phaseOf(s) === 'play' && guard++ < 100) {
    if (rnd() < p.slip) {
      const wrong = s.tray.find((c) => formulaHolds(c) && c.prev !== tailCode(s));
      if (wrong) placeCard(s, wrong.id);
      if (phaseOf(s) !== 'play') return;
    }
    placeCard(s, rightCard(s).id);
  }
}

/** Chơi trọn một ván với `seed` và hồ sơ bot `p`. */
export function simulateRebuild(seed: number, p: RebuildBotProfile): RebuildSimResult {
  const s = createRebuild(seed);
  const rnd = createMulberry32((seed * 2654435761) >>> 0);
  for (let r = 0; r < REBUILD_SPEC.rounds.length && s.phase !== 'over'; r++) {
    playRound12(s, p, rnd);
    advance(s);
  }
  return { score: rebuildScore(s), hearts: s.hearts, over: s.over === 'hearts' ? 'hearts' : 'done' };
}

export interface RebuildBalance {
  games: number;
  mean: number;
  min: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  /** Số ván theo huy chương: chua (chưa đạt), dong, bac, vang */
  medals: { chua: number; dong: number; bac: number; vang: number };
  diedByHearts: number;
}

export function simulateMany(profile: RebuildBotProfile, games: number, medals: readonly [number, number, number]): RebuildBalance {
  const scores: number[] = [];
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  let died = 0;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateRebuild(seed, profile);
    scores.push(r.score);
    const m = medalOf(r.score, medals);
    count[(['chua', 'dong', 'bac', 'vang'] as const)[m]]++;
    if (r.over === 'hearts') died++;
  }
  scores.sort((a, b) => a - b);
  const at = (q: number): number => scores[Math.min(scores.length - 1, Math.floor(q * scores.length))];
  return {
    games,
    mean: scores.reduce((a, b) => a + b, 0) / games,
    min: scores[0],
    p10: at(0.1),
    p25: at(0.25),
    p50: at(0.5),
    p75: at(0.75),
    p90: at(0.9),
    medals: count,
    diedByHearts: died,
  };
}
