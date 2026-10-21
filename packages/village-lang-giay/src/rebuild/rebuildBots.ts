/**
 * Bot mô phỏng cả ván màn 3 (3 vòng) để kiểm tra cân bằng mốc điểm (bước X2). Chỉ dùng trong test và công cụ, không vào bản chạy.
 *
 * Bot chỉ dùng thao tác của học sinh (đặt thẻ, kéo vào rổ) và chỉ đọc những gì học sinh nhìn thấy (công thức trên thẻ, mã trước của ô), không đọc cờ `isFake`.
 * Vòng 1 và 2: bot giỏi chơi hoàn hảo; bot trung bình (`AVERAGE_BOT`, từ bước X3 là bot chính) mỗi lần đặt thẻ có xác suất đặt nhầm một thẻ sai mã trước, và ở vòng 2 có xác suất đặt thẳng trang giả vào chuỗi trước khi bỏ vào rổ; `AVERAGE_BOT_CLEAN` chơi hoàn hảo vòng 1, 2 để so sánh.
 * Vòng 3: mỗi lần {phanDien} tráo, bot phát hiện và sửa sau một độ trễ ngẫu nhiên trong `fixDelay`; có xác suất `misbin` kéo nhầm một trang thật vào rổ trước khi sửa.
 */
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { medalOf } from '@so-chung/core';
import { REBUILD_SPEC } from './rebuildConfig';
import {
  advance,
  beginKeep,
  binCard,
  binFromSlot,
  checkPlacement,
  createRebuild,
  formulaHolds,
  insertFake,
  placeCard,
  placeInSlot,
  rebuildScore,
  stepKeep,
  tailCode,
  type Card,
  type RebuildPhase,
  type RebuildState,
} from './rebuildLogic';

export interface RebuildBotProfile {
  name: string;
  /** Độ trễ từ lúc bị tráo đến lúc sửa xong, giây: [nhỏ nhất, lớn nhất] */
  fixDelay: readonly [number, number];
  /** Xác suất kéo nhầm một trang thật vào rổ trước khi sửa (vòng 3) */
  misbin: number;
  /** Xác suất mỗi lần đặt thẻ ở vòng 1, 2 bị đặt nhầm một thẻ sai mã trước */
  slip: number;
  /** Xác suất ở vòng 2 đặt thẳng trang giả vào chuỗi trước khi bỏ vào rổ */
  fakeMiss: number;
}

/** Bot giỏi: soi công thức và sửa trong 3 đến 4 giây, không kéo nhầm. */
export const GOOD_BOT: RebuildBotProfile = { name: 'good', fixDelay: [3, 4], misbin: 0, slip: 0, fakeMiss: 0 };
/** Bot trung bình: vòng 3 sửa trong 6 đến 9 giây, 15% kéo nhầm một trang thật vào rổ. */
export const AVERAGE_BOT: RebuildBotProfile = { name: 'average', fixDelay: [6, 9], misbin: 0.15, slip: 0.08, fakeMiss: 0.15 };
/** Như bot trung bình nhưng vòng 1, 2 chơi hoàn hảo (bước X2b gọi đây là bot trung bình): để so sánh. */
export const AVERAGE_BOT_CLEAN: RebuildBotProfile = { ...AVERAGE_BOT, name: 'average-clean', slip: 0, fakeMiss: 0 };

export interface RebuildSimResult {
  score: number;
  hearts: number;
  over: 'hearts' | 'done';
  /** Có tới được vòng 3 hay không */
  reachedKeep: boolean;
  /** Điểm riêng vòng 3 (0 nếu không tới hoặc dở dang) */
  keepPoints: number;
}

const DT = 0.1;

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

function playKeep(s: RebuildState, p: RebuildBotProfile, rnd: () => number): void {
  interface Task {
    due: number;
    slot: number;
    misbin: boolean;
  }
  const tasks: Task[] = [];
  beginKeep(s);
  let guard = 0;
  while (s.phase === 'keep' && guard++ < 10000) {
    for (const e of stepKeep(s, DT)) {
      if (e.kind === 'swap') tasks.push({ due: e.at + p.fixDelay[0] + rnd() * (p.fixDelay[1] - p.fixDelay[0]), slot: e.slot, misbin: rnd() < p.misbin });
    }
    const k = s.keep;
    if (!k) return;
    for (let i = 0; i < tasks.length && s.phase === 'keep'; i++) {
      const t = tasks[i];
      if (t.due > k.elapsed) continue;
      if (t.misbin) {
        const victim = k.slots.findIndex((c, j) => c !== null && j !== t.slot && formulaHolds(c));
        if (victim >= 0) binFromSlot(s, victim); // trang thật vào rổ: bật về, mất 1 tim
        t.misbin = false;
        t.due += 1;
        continue;
      }
      tasks.splice(i--, 1);
      binFromSlot(s, t.slot);
      const need = s.deal.real[t.slot].prev;
      const card = s.tray.find((c) => checkPlacement(need, c) === 'ok');
      if (card) placeInSlot(s, card.id, t.slot);
    }
  }
}

/** Chơi trọn một ván với `seed` và hồ sơ bot `p`. */
export function simulateRebuild(seed: number, p: RebuildBotProfile): RebuildSimResult {
  const s = createRebuild(seed);
  const rnd = createMulberry32((seed * 2654435761) >>> 0);
  let reachedKeep = false;
  for (let r = 0; r < REBUILD_SPEC.rounds.length && s.phase !== 'over'; r++) {
    if (REBUILD_SPEC.rounds[r].keep) {
      reachedKeep = true;
      playKeep(s, p, rnd);
    } else {
      playRound12(s, p, rnd);
    }
    advance(s);
  }
  const keepPart = s.parts.find((x) => x.keep);
  return { score: rebuildScore(s), hearts: s.hearts, over: s.over === 'hearts' ? 'hearts' : 'done', reachedKeep, keepPoints: keepPart ? keepPart.points : 0 };
}

export interface RebuildBalance {
  games: number;
  mean: number;
  min: number;
  p10: number;
  p50: number;
  p90: number;
  /** Số ván theo huy chương: chua (chưa đạt), dong, bac, vang */
  medals: { chua: number; dong: number; bac: number; vang: number };
  diedByHearts: number;
  meanKeep: number;
}

export function simulateMany(profile: RebuildBotProfile, games: number, medals: readonly [number, number, number]): RebuildBalance {
  const scores: number[] = [];
  const count = { chua: 0, dong: 0, bac: 0, vang: 0 };
  let died = 0;
  let keepSum = 0;
  for (let seed = 1; seed <= games; seed++) {
    const r = simulateRebuild(seed, profile);
    scores.push(r.score);
    const m = medalOf(r.score, medals);
    count[(['chua', 'dong', 'bac', 'vang'] as const)[m]]++;
    if (r.over === 'hearts') died++;
    keepSum += r.keepPoints;
  }
  scores.sort((a, b) => a - b);
  const at = (q: number): number => scores[Math.min(scores.length - 1, Math.floor(q * scores.length))];
  return { games, mean: scores.reduce((a, b) => a + b, 0) / games, min: scores[0], p10: at(0.1), p50: at(0.5), p90: at(0.9), medals: count, diedByHearts: died, meanKeep: keepSum / games };
}
