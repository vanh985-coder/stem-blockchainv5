/**
 * Bot giải thuật và lý thuyết trò chơi cho Bài 5 — Mức Khó
 * Hàm thuần túy, không phụ thuộc DOM, React hay localStorage.
 */

import {
  Owner,
  AttackMove,
  DefenseMove,
  legalAttacks,
  legalDefenses,
  resolve,
  evaluate,
  countH,
  attackKind,
  defenseKind,
} from './logic';
import { createMulberry32 } from '../../lib/rng';
import { GAME_CONFIG } from '../../config/gameConfig';

export type Habits = {
  hacker: { split: number; stack: number };
  defender: { spread: number; stack: number; recover: number };
};

export function initialHabits(): Habits {
  return {
    hacker: { split: 0, stack: 0 },
    defender: { spread: 0, stack: 0, recover: 0 },
  };
}

export function decayHabits(h: Habits, factor = 0.8): Habits {
  return {
    hacker: {
      split: h.hacker.split * factor,
      stack: h.hacker.stack * factor,
    },
    defender: {
      spread: h.defender.spread * factor,
      stack: h.defender.stack * factor,
      recover: h.defender.recover * factor,
    },
  };
}

export function recordHabit(
  h: Habits,
  role: 'H' | 'D',
  kind: string
): Habits {
  const next: Habits = {
    hacker: { ...h.hacker },
    defender: { ...h.defender },
  };
  if (role === 'H') {
    if (kind === 'split' || kind === 'stack') {
      next.hacker[kind] += 1;
    }
  } else {
    if (kind === 'spread' || kind === 'stack' || kind === 'recover') {
      next.defender[kind] += 1;
    }
  }
  return next;
}

export function positiveNormalize(arr: number[]): number[] {
  const len = arr.length;
  if (len === 0) return [];
  const pos = arr.map((x) => Math.max(0, x));
  const sum = pos.reduce((s, x) => s + x, 0);
  if (sum === 0) {
    return Array(len).fill(1 / len);
  }
  return pos.map((x) => x / sum);
}

export function normalize(arr: number[]): number[] {
  const len = arr.length;
  if (len === 0) return [];
  const sum = arr.reduce((s, x) => s + x, 0);
  if (sum === 0) {
    return Array(len).fill(1 / len);
  }
  return arr.map((x) => x / sum);
}

/**
 * Thuật toán Regret Matching tìm cân bằng Nash trong trò chơi tổng bằng 0
 */
export function solve(M: number[][], iters = 300) {
  const m = M.length;
  const n = M[0].length;
  const regR = Array(m).fill(0);
  const regC = Array(n).fill(0);
  const sumR = Array(m).fill(0);
  const sumC = Array(n).fill(0);

  for (let t = 0; t < iters; t++) {
    const pR = positiveNormalize(regR);
    const pC = positiveNormalize(regC);
    const uR = M.map((row) => row.reduce((s, v, j) => s + v * pC[j], 0));
    const uC = Array.from({ length: n }, (_, j) =>
      -M.reduce((s, row, i) => s + row[j] * pR[i], 0)
    );
    const vR = uR.reduce((s, u, i) => s + u * pR[i], 0);
    const vC = uC.reduce((s, u, j) => s + u * pC[j], 0);

    for (let i = 0; i < m; i++) {
      regR[i] += uR[i] - vR;
      sumR[i] += pR[i];
    }
    for (let j = 0; j < n; j++) {
      regC[j] += uC[j] - vC;
      sumC[j] += pC[j];
    }
  }

  return { attackMix: normalize(sumR), defenseMix: normalize(sumC) };
}

/**
 * Dự đoán xác suất từng nước đi của học sinh dựa trên thói quen
 */
export function predict(
  owner: readonly Owner[],
  h: Habits,
  studentRole: 'H' | 'D'
): {
  moveProbs: number[];
  exploitedKind: string;
  exploitedProb: number;
} {
  const priorHacker = 1.5;
  const priorDefender = 1.0;

  if (studentRole === 'H') {
    const attacks = legalAttacks(owner);
    const kinds = ['split', 'stack'] as const;
    const movesByKind: Record<'split' | 'stack', AttackMove[]> = {
      split: [],
      stack: [],
    };
    for (const m of attacks) {
      movesByKind[attackKind(m)].push(m);
    }

    let totalCount = 0;
    const kindCounts: Record<'split' | 'stack', number> = { split: 0, stack: 0 };
    for (const k of kinds) {
      if (movesByKind[k].length > 0) {
        const c = priorHacker + h.hacker[k];
        kindCounts[k] = c;
        totalCount += c;
      }
    }

    const kindProbs: Record<'split' | 'stack', number> = {
      split: totalCount > 0 ? kindCounts.split / totalCount : 0,
      stack: totalCount > 0 ? kindCounts.stack / totalCount : 0,
    };

    const moveProbs = attacks.map((m) => {
      const k = attackKind(m);
      const countMoves = movesByKind[k].length;
      return countMoves > 0 ? kindProbs[k] / countMoves : 0;
    });

    let bestKind = 'split';
    let maxP = -1;
    for (const k of kinds) {
      if (movesByKind[k].length > 0 && kindProbs[k] > maxP) {
        maxP = kindProbs[k];
        bestKind = k;
      }
    }

    return {
      moveProbs,
      exploitedKind: bestKind,
      exploitedProb: maxP,
    };
  }

  // studentRole === 'D'
  const defenses = legalDefenses(owner);
  const kinds = ['spread', 'stack', 'recover'] as const;
  const movesByKind: Record<'spread' | 'stack' | 'recover', DefenseMove[]> = {
    spread: [],
    stack: [],
    recover: [],
  };
  for (const m of defenses) {
    movesByKind[defenseKind(m)].push(m);
  }

  let totalCount = 0;
  const kindCounts: Record<'spread' | 'stack' | 'recover', number> = {
    spread: 0,
    stack: 0,
    recover: 0,
  };
  for (const k of kinds) {
    if (movesByKind[k].length > 0) {
      const c = priorDefender + h.defender[k];
      kindCounts[k] = c;
      totalCount += c;
    }
  }

  const kindProbs: Record<'spread' | 'stack' | 'recover', number> = {
    spread: totalCount > 0 ? kindCounts.spread / totalCount : 0,
    stack: totalCount > 0 ? kindCounts.stack / totalCount : 0,
    recover: totalCount > 0 ? kindCounts.recover / totalCount : 0,
  };

  const moveProbs = defenses.map((m) => {
    const k = defenseKind(m);
    const countMoves = movesByKind[k].length;
    return countMoves > 0 ? kindProbs[k] / countMoves : 0;
  });

  let bestKind = 'spread';
  let maxP = -1;
  for (const k of kinds) {
    if (movesByKind[k].length > 0 && kindProbs[k] > maxP) {
      maxP = kindProbs[k];
      bestKind = k;
    }
  }

  return {
    moveProbs,
    exploitedKind: bestKind,
    exploitedProb: maxP,
  };
}

export function lambda(h: Habits, studentRole: 'H' | 'D'): number {
  const n =
    studentRole === 'H'
      ? h.hacker.split + h.hacker.stack
      : h.defender.spread + h.defender.stack + h.defender.recover;
  return Math.min(0.6, Math.max(0, 0.12 * n));
}

function sampleDist(dist: number[], rng: () => number): number {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < dist.length; i++) {
    acc += dist[i];
    if (r <= acc || i === dist.length - 1) {
      return i;
    }
  }
  return dist.length - 1;
}

/**
 * Quyết định nước đi của bot.
 * BẮT BUỘC KHÔNG có tham số nào chứa nước đi của học sinh ở round hiện tại.
 */
export function decideBot(input: {
  owner: Owner[];
  round: number;
  maxRounds: number;
  botRole: 'H' | 'D';
  difficulty: 'smart' | 'medium';
  habits: Habits;
  rng: () => number;
}): {
  move: AttackMove | DefenseMove;
  reason: 'exploit' | 'equilibrium' | 'random';
  exploitedKind?: string;
  exploitedProb?: number;
} {
  const { owner, round, maxRounds, botRole, difficulty, habits, rng } = input;
  const studentRole: 'H' | 'D' = botRole === 'H' ? 'D' : 'H';
  const A = legalAttacks(owner);
  const D = legalDefenses(owner);
  const rLeft = maxRounds - round;

  // Xây dựng ma trận M[i][j]
  const M: number[][] = Array.from({ length: A.length }, () =>
    Array(D.length).fill(0)
  );
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < D.length; j++) {
      const nextOwner = resolve(owner, A[i], D[j]);
      M[i][j] = evaluate(nextOwner, rLeft);
    }
  }

  const { attackMix, defenseMix } = solve(M, 300);

  if (difficulty === 'smart') {
    const lam = lambda(habits, studentRole);
    const roll = rng();

    if (roll < lam) {
      // Khai thác (best response)
      const pred = predict(owner, habits, studentRole);
      const q = pred.moveProbs;

      if (botRole === 'H') {
        const evs = A.map((_, i) =>
          M[i].reduce((sum, val, j) => sum + val * q[j], 0)
        );
        const maxVal = Math.max(...evs);
        const bestRows: number[] = [];
        for (let i = 0; i < evs.length; i++) {
          if (evs[i] >= maxVal - 1e-9) {
            bestRows.push(i);
          }
        }
        const choice =
          bestRows.length === 1
            ? bestRows[0]
            : bestRows[Math.floor(rng() * bestRows.length)];
        return {
          move: A[choice],
          reason: 'exploit',
          exploitedKind: pred.exploitedKind,
          exploitedProb: pred.exploitedProb,
        };
      }

      // botRole === 'D'
      const evs = D.map((_, j) =>
        M.reduce((sum, row, i) => sum + row[j] * q[i], 0)
      );
      const minVal = Math.min(...evs);
      const bestCols: number[] = [];
      for (let j = 0; j < evs.length; j++) {
        if (evs[j] <= minVal + 1e-9) {
          bestCols.push(j);
        }
      }
      const choice =
        bestCols.length === 1
          ? bestCols[0]
          : bestCols[Math.floor(rng() * bestCols.length)];
      return {
        move: D[choice],
        reason: 'exploit',
        exploitedKind: pred.exploitedKind,
        exploitedProb: pred.exploitedProb,
      };
    }

    // roll >= lam: equilibrium
    if (botRole === 'H') {
      const idx = sampleDist(attackMix, rng);
      return { move: A[idx], reason: 'equilibrium' };
    } else {
      const idx = sampleDist(defenseMix, rng);
      return { move: D[idx], reason: 'equilibrium' };
    }
  }

  // difficulty === 'medium'
  const roll = rng();
  if (roll < 0.3) {
    if (botRole === 'H') {
      const idx = Math.floor(rng() * A.length);
      return { move: A[idx], reason: 'random' };
    } else {
      const idx = Math.floor(rng() * D.length);
      return { move: D[idx], reason: 'random' };
    }
  }

  if (botRole === 'H') {
    const idx = sampleDist(attackMix, rng);
    return { move: A[idx], reason: 'equilibrium' };
  } else {
    const idx = sampleDist(defenseMix, rng);
    return { move: D[idx], reason: 'equilibrium' };
  }
}

export interface BotLineContext {
  botRole: 'H' | 'D';
  ownerAfter: Owner[];
  isGameOver: boolean;
  botMove: AttackMove | DefenseMove;
  reason: 'exploit' | 'equilibrium' | 'random';
  exploitedKind?: string;
  exploitedProb?: number;
}

/**
 * Lời thoại của bot sau reveal
 */
export function botLine(ctx: BotLineContext, rng: () => number): string {
  // (1) 5 node, chưa kết thúc -> "Chỉ cần thêm 1 node nữa thôi…"
  if (ctx.botRole === 'H' && countH(ctx.ownerAfter) === 5 && !ctx.isGameOver) {
    return 'Chỉ cần thêm 1 node nữa thôi…';
  }

  // (2) reason = 'exploit' và exploitedProb >= 0.5 -> "Mình để ý em hay …, nên lần này mình …!"
  if (ctx.reason === 'exploit' && (ctx.exploitedProb ?? 0) >= 0.5) {
    let habitText = '';
    if (ctx.exploitedKind === 'spread') habitText = 'dàn 2 khiên ra 2 bên';
    else if (ctx.exploitedKind === 'recover') habitText = 'chọn phục hồi';
    else if (ctx.exploitedKind === 'split') habitText = 'đánh cả 2 phía';
    else if (ctx.exploitedKind === 'stack') {
      habitText =
        ctx.botRole === 'D' ? 'dồn quân vào 1 node' : 'dồn 2 khiên vào 1 node';
    }

    let botMoveText = '';
    if (ctx.botRole === 'H') {
      const k = attackKind(ctx.botMove as AttackMove);
      botMoveText = k === 'split' ? 'đánh cả 2 phía' : 'dồn quân';
    } else {
      const k = defenseKind(ctx.botMove as DefenseMove);
      if (k === 'recover') {
        botMoveText = 'lấy lại 1 node';
      } else if (k === 'spread') {
        botMoveText = 'chia khiên đều 2 bên';
      } else {
        botMoveText = 'dồn khiên vào 1 node';
      }
    }

    return `Mình để ý em hay ${habitText}, nên lần này mình ${botMoveText}!`;
  }

  // (3) bot chọn recover -> "Lấy lại N{x} trước đã!"
  if ('kind' in ctx.botMove && ctx.botMove.kind === 'recover') {
    return `Lấy lại N${ctx.botMove.node + 1} trước đã!`;
  }

  // (4) còn lại -> câu cân bằng
  return rng() < 0.5
    ? 'Mình chọn ngẫu nhiên có tính toán, đoán đi!'
    : 'Khó đoán chưa? 😎';
}

/**
 * Mô phỏng đấu với người chơi ngẫu nhiên
 */
export function simulateGames(input: {
  botRole: 'H' | 'D';
  difficulty: 'smart' | 'medium';
  games: number;
  seed: number;
}): number {
  const rng = createMulberry32(input.seed);
  let habits = initialHabits();
  let botWins = 0;
  const maxRounds = GAME_CONFIG.lesson5.hardMaxRounds;
  const studentRole: 'H' | 'D' = input.botRole === 'H' ? 'D' : 'H';

  for (let g = 0; g < input.games; g++) {
    habits = decayHabits(habits, 0.8);
    let owner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];

    for (let round = 1; round <= maxRounds; round++) {
      const botDecision = decideBot({
        owner,
        round,
        maxRounds,
        botRole: input.botRole,
        difficulty: input.difficulty,
        habits,
        rng,
      });

      let studentMove: AttackMove | DefenseMove;
      if (studentRole === 'H') {
        const legal = legalAttacks(owner);
        const idx = Math.floor(rng() * legal.length);
        studentMove = legal[idx];
      } else {
        const legal = legalDefenses(owner);
        const idx = Math.floor(rng() * legal.length);
        studentMove = legal[idx];
      }

      const attack: AttackMove =
        input.botRole === 'H'
          ? (botDecision.move as AttackMove)
          : (studentMove as AttackMove);
      const defense: DefenseMove =
        input.botRole === 'D'
          ? (botDecision.move as DefenseMove)
          : (studentMove as DefenseMove);

      owner = resolve(owner, attack, defense);

      if (studentRole === 'H') {
        const kind = attackKind(studentMove as AttackMove);
        habits = recordHabit(habits, 'H', kind);
      } else {
        const kind = defenseKind(studentMove as DefenseMove);
        habits = recordHabit(habits, 'D', kind);
      }

      const hCount = countH(owner);
      if (hCount >= 6) {
        if (input.botRole === 'H') botWins++;
        break;
      }
      if (hCount === 0) {
        if (input.botRole === 'D') botWins++;
        break;
      }
      if (round === maxRounds) {
        if (input.botRole === 'D') botWins++;
        break;
      }
    }
  }

  return botWins / input.games;
}
