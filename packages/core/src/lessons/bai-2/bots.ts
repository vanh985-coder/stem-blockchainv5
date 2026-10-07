import { pageCode } from '../../lib/chain';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createMulberry32 } from '../../lib/rng';

export type PlayerId = 'em' | 'binh' | 'chi' | 'ti';
export type Truth = 'valid' | 'cheat' | 'miscalc';
export type Vote = 'agree' | 'reject';

export interface SettleRoundResult {
  accepted: boolean;
  deltas: Record<PlayerId, number>;
}

/**
 * Tính toán kết quả biểu quyết và biến động điểm cọc sau mỗi lượt chơi:
 * - accepted = số phiếu 'agree' >= acceptThreshold (2)
 * - Lãi/lỗ ròng đã tính cọc 30:
 *   • valid & accepted: creator +10; ai agree +2; reject 0
 *   • valid & rejected: creator 0; ai agree +2; reject 0
 *   • cheat/miscalc & rejected: creator -30; reject +2; agree -15
 *   • cheat & accepted: creator +40; agree -15; reject +2
 *   • miscalc & accepted: creator 0; agree -15; reject +2
 */
export function settleRound(
  creator: PlayerId,
  truth: Truth,
  votes: Partial<Record<PlayerId, Vote>>,
  cfg: typeof GAME_CONFIG.lesson2.hard = GAME_CONFIG.lesson2.hard
): SettleRoundResult {
  const voters = Object.keys(votes) as PlayerId[];
  let agreeCount = 0;
  for (const v of voters) {
    if (votes[v] === 'agree') {
      agreeCount++;
    }
  }

  const accepted = agreeCount >= cfg.acceptThreshold;
  const deltas: Record<PlayerId, number> = { em: 0, binh: 0, chi: 0, ti: 0 };

  if (truth === 'valid') {
    deltas[creator] = accepted ? cfg.creatorValidAccepted : 0;
    for (const v of voters) {
      deltas[v] = votes[v] === 'agree' ? cfg.voterCorrect : 0;
    }
  } else if (truth === 'cheat') {
    deltas[creator] = accepted ? cfg.creatorCheatAccepted : cfg.creatorInvalidRejected;
    for (const v of voters) {
      deltas[v] = votes[v] === 'agree' ? cfg.voterAgreeInvalid : cfg.voterCorrect;
    }
  } else {
    // miscalc
    deltas[creator] = accepted ? cfg.creatorMiscalcAccepted : cfg.creatorInvalidRejected;
    for (const v of voters) {
      deltas[v] = votes[v] === 'agree' ? cfg.voterAgreeInvalid : cfg.voterCorrect;
    }
  }

  return { accepted, deltas };
}

/**
 * Xác suất ít nhất 2 trong 3 cử tri đồng ý:
 * P = p1*p2 + p1*p3 + p2*p3 - 2*p1*p2*p3
 */
export function pAccept3(p: [number, number, number]): number {
  return p[0] * p[1] + p[0] * p[2] + p[1] * p[2] - 2 * p[0] * p[1] * p[2];
}

/**
 * Kỳ vọng toán học khi gian lận:
 * EV = pLot * 40 - (1 - pLot) * 30
 */
export function evCheat(pLot: number): number {
  return pLot * 40 - (1 - pLot) * 30;
}

export const evHonest = 10;

/**
 * Cập nhật niềm tin Beta của Tí (chỉ gọi sau vòng cheat của Em hoặc Tí).
 * Với mỗi người bỏ phiếu: agree -> α + 1, reject -> β + 1.
 */
export function updateBeliefs(
  beliefs: Record<'em' | 'binh' | 'chi', readonly [number, number] | [number, number]>,
  votes: Partial<Record<PlayerId, Vote>>
): Record<'em' | 'binh' | 'chi', [number, number]> {
  const next: Record<'em' | 'binh' | 'chi', [number, number]> = {
    em: [beliefs.em[0], beliefs.em[1]],
    binh: [beliefs.binh[0], beliefs.binh[1]],
    chi: [beliefs.chi[0], beliefs.chi[1]],
  };

  for (const player of ['em', 'binh', 'chi'] as const) {
    if (votes[player]) {
      const [a, b] = next[player];
      if (votes[player] === 'agree') {
        next[player] = [a + 1, b];
      } else {
        next[player] = [a, b + 1];
      }
    }
  }

  return next;
}

export type TiDecisionReason = 'first' | 'ev' | 'gamble' | 'honest';

export interface TiDecision {
  cheat: boolean;
  reason: TiDecisionReason;
  pLot: number;
  ev: number;
}

/**
 * Quyết định hành vi của Tí:
 * - isFirstTurn -> cheat, 'first'
 * - pLot = pAccept3([em, binh, chi]), ev = evCheat(pLot)
 * - ev > 10 -> cheat 'ev'
 * - ngược lại rng() < tiGambleRate (0.15) -> cheat 'gamble'
 * - còn lại -> honest 'honest'
 */
export function tiDecide({
  isFirstTurn,
  beliefs,
  rng,
  cfg = GAME_CONFIG.lesson2.hard,
}: {
  isFirstTurn: boolean;
  beliefs: Record<'em' | 'binh' | 'chi', readonly [number, number] | [number, number]>;
  rng: () => number;
  cfg?: typeof GAME_CONFIG.lesson2.hard;
}): TiDecision {
  if (isFirstTurn) {
    return { cheat: true, reason: 'first', pLot: 0, ev: 0 };
  }

  const p_em = beliefs.em[0] / (beliefs.em[0] + beliefs.em[1]);
  const p_binh = beliefs.binh[0] / (beliefs.binh[0] + beliefs.binh[1]);
  const p_chi = beliefs.chi[0] / (beliefs.chi[0] + beliefs.chi[1]);

  const pLot = pAccept3([p_em, p_binh, p_chi]);
  const ev = evCheat(pLot);

  if (ev > 10) {
    return { cheat: true, reason: 'ev', pLot, ev };
  } else if (rng() < cfg.tiGambleRate) {
    return { cheat: true, reason: 'gamble', pLot, ev };
  } else {
    return { cheat: false, reason: 'honest', pLot, ev };
  }
}

/**
 * Lá phiếu của từng bot:
 * - Bình: trung thực (valid ? agree : reject)
 * - Chi: 25% vội vàng agree, còn lại trung thực
 * - Tí: luôn agree
 */
export function botVote(bot: 'binh' | 'chi' | 'ti', truth: Truth, rng: () => number): Vote {
  if (bot === 'binh') {
    return truth === 'valid' ? 'agree' : 'reject';
  } else if (bot === 'chi') {
    return rng() < 0.25 ? 'agree' : (truth === 'valid' ? 'agree' : 'reject');
  } else {
    return 'agree';
  }
}

/**
 * Chi tạo trang:
 * 30% tính nhầm lệch k trong 1..9; 70% tính đúng.
 */
export function chiCreate(
  correctCode: number,
  rng: () => number
): { truth: 'valid' | 'miscalc'; code: number } {
  if (rng() < 0.3) {
    const k = 1 + Math.floor(rng() * 9);
    const sign = rng() < 0.5 ? 1 : -1;
    const code = (((correctCode + sign * k) % 100) + 100) % 100;
    return { truth: 'miscalc', code };
  }
  return { truth: 'valid', code: correctCode };
}

/**
 * Tạo trang gian lận (50/50):
 * - kiểu A: prevCode = số 0..99 khác lastCode, code = pageCode(prevCode, content)
 * - kiểu B: prevCode = lastCode, code = số 0..99 khác pageCode(lastCode, content), note = "Thưởng thêm cho [tên]"
 */
export function makeCheatPage(
  lastCode: number,
  content: number,
  rng: () => number,
  creatorName: string = 'Tí'
): { prevCode: number; content: number; code: number; note?: string; type: 'A' | 'B' } {
  if (rng() < 0.5) {
    let prevCode = Math.floor(rng() * 100);
    while (prevCode === lastCode) {
      prevCode = Math.floor(rng() * 100);
    }
    return {
      prevCode,
      content,
      code: pageCode(prevCode, content),
      type: 'A',
    };
  } else {
    const correct = pageCode(lastCode, content);
    let code = Math.floor(rng() * 100);
    while (code === correct) {
      code = Math.floor(rng() * 100);
    }
    return {
      prevCode: lastCode,
      content,
      code,
      note: `Thưởng thêm cho ${creatorName}`,
      type: 'B',
    };
  }
}

/**
 * Tính số sao đạt được ở màn Khó:
 * - Nếu !emAgreedCheat và số người có điểm CAO HƠN em <= 1 -> 3 sao
 * - Ngược lại, nếu điểm em >= 100 -> 2 sao
 * - Còn lại -> 1 sao
 */
export function hardStars(
  scores: Record<PlayerId, number>,
  emAgreedCheat: boolean
): 1 | 2 | 3 {
  const higherCount = (['binh', 'chi', 'ti'] as const).filter(
    (bot) => scores[bot] > scores.em
  ).length;

  if (!emAgreedCheat && higherCount <= 1) {
    return 3;
  }
  if (scores.em >= 100) {
    return 2;
  }
  return 1;
}

export interface SimulationResult {
  avg: Record<PlayerId, number>;
  tiStrictLastRate: number;
}

/**
 * Chạy mô phỏng n ván chơi với seed cố định
 */
export function simulateGames(
  n: number,
  seed: number,
  emPolicy: 'honest' | 'cheatOnce'
): SimulationResult {
  const rng = createMulberry32(seed);
  const total: Record<PlayerId, number> = { em: 0, binh: 0, chi: 0, ti: 0 };
  let tiStrictLastCount = 0;
  const cfg = GAME_CONFIG.lesson2.hard;

  for (let i = 0; i < n; i++) {
    const scores: Record<PlayerId, number> = { em: 100, binh: 100, chi: 100, ti: 100 };
    let beliefs: Record<'em' | 'binh' | 'chi', [number, number]> = {
      em: [cfg.tiPriors.em[0], cfg.tiPriors.em[1]],
      binh: [cfg.tiPriors.binh[0], cfg.tiPriors.binh[1]],
      chi: [cfg.tiPriors.chi[0], cfg.tiPriors.chi[1]],
    };

    const genesis = 10 + Math.floor(rng() * 80);
    const c1 = 1 + Math.floor(rng() * 99);
    const c2 = 1 + Math.floor(rng() * 99);
    let lastCode = pageCode(pageCode(genesis, c1), c2);

    let tiTurnsCount = 0;
    let emCreateCount = 0;

    for (let turnIdx = 0; turnIdx < cfg.order.length; turnIdx++) {
      const creator = cfg.order[turnIdx] as PlayerId;
      if (scores[creator] < 30) {
        continue;
      }

      const content = 1 + Math.floor(rng() * 99);
      let truth: Truth = 'valid';
      let proposalCode = 0;

      if (creator === 'em') {
        const isFirstEm = emCreateCount === 0;
        emCreateCount++;
        if (emPolicy === 'cheatOnce' && isFirstEm) {
          truth = 'cheat';
          const p = makeCheatPage(lastCode, content, rng, 'Em');
          proposalCode = p.code;
        } else {
          truth = 'valid';
          proposalCode = pageCode(lastCode, content);
        }
      } else if (creator === 'binh') {
        truth = 'valid';
        proposalCode = pageCode(lastCode, content);
      } else if (creator === 'chi') {
        const res = chiCreate(pageCode(lastCode, content), rng);
        truth = res.truth;
        proposalCode = res.code;
      } else if (creator === 'ti') {
        const isFirstTurn = tiTurnsCount === 0;
        tiTurnsCount++;
        const decision = tiDecide({ isFirstTurn, beliefs, rng, cfg });
        if (decision.cheat) {
          truth = 'cheat';
          const p = makeCheatPage(lastCode, content, rng, 'Tí');
          proposalCode = p.code;
        } else {
          truth = 'valid';
          proposalCode = pageCode(lastCode, content);
        }
      }

      // Thu thập phiếu
      const votes: Partial<Record<PlayerId, Vote>> = {};
      const allPlayers: PlayerId[] = ['em', 'binh', 'chi', 'ti'];
      for (const p of allPlayers) {
        if (p === creator) continue;
        if (p === 'em') {
          votes.em = truth === 'valid' ? 'agree' : 'reject';
        } else {
          votes[p] = botVote(p, truth, rng);
        }
      }

      const outcome = settleRound(creator, truth, votes, cfg);
      for (const p of allPlayers) {
        scores[p] += outcome.deltas[p];
      }

      if (truth === 'cheat') {
        beliefs = updateBeliefs(beliefs, votes);
      }

      if (outcome.accepted) {
        lastCode = proposalCode;
      }
    }

    total.em += scores.em;
    total.binh += scores.binh;
    total.chi += scores.chi;
    total.ti += scores.ti;

    if (scores.ti < scores.em && scores.ti < scores.binh && scores.ti < scores.chi) {
      tiStrictLastCount++;
    }
  }

  return {
    avg: {
      em: total.em / n,
      binh: total.binh / n,
      chi: total.chi / n,
      ti: total.ti / n,
    },
    tiStrictLastRate: tiStrictLastCount / n,
  };
}

export type HistoryItem = {
  creator: PlayerId;
  skipped?: boolean;
  truth?: Truth;
  accepted?: boolean;
  deltas?: Record<PlayerId, number>;
};

/**
 * Tóm tắt kết quả thi đấu của từng người chơi theo quy tắc
 */
export function summarizePlayer(history: HistoryItem[], id: PlayerId, name: string): string {
  const signed = (n: number): string => {
    if (n > 0) return `+${n}`;
    if (n < 0) return `\u2212${Math.abs(n)}`;
    return '0';
  };

  let creatorNet = 0;
  let voteNet = 0;
  let totalCreationRounds = 0;
  let validCount = 0;
  let cheatCount = 0;
  let cheatBiBatCount = 0;
  let cheatLotCount = 0;
  let miscalcCount = 0;
  let skippedCount = 0;

  for (const item of history) {
    const isCreator = item.creator === id;
    if (isCreator) {
      totalCreationRounds++;
      if (item.skipped) {
        skippedCount++;
      } else {
        if (item.deltas && item.deltas[id] !== undefined) {
          creatorNet += item.deltas[id];
        }
        if (item.truth === 'valid') {
          validCount++;
        } else if (item.truth === 'cheat') {
          cheatCount++;
          if (item.accepted) {
            cheatLotCount++;
          } else {
            cheatBiBatCount++;
          }
        } else if (item.truth === 'miscalc') {
          miscalcCount++;
        }
      }
    } else {
      if (!item.skipped && item.deltas && item.deltas[id] !== undefined) {
        voteNet += item.deltas[id];
      }
    }
  }

  if (totalCreationRounds === 0) {
    return `${name} không tạo trang: bỏ phiếu ${signed(voteNet)}.`;
  }

  const parts: string[] = [];
  if (validCount > 0) {
    parts.push(`làm thật ${validCount} lượt`);
  }
  if (cheatCount > 0) {
    const details: string[] = [];
    if (cheatBiBatCount > 0) details.push(`bị bắt ${cheatBiBatCount}`);
    if (cheatLotCount > 0) details.push(`lọt ${cheatLotCount}`);
    if (details.length > 0) {
      parts.push(`gian ${cheatCount} lần (${details.join(', ')})`);
    } else {
      parts.push(`gian ${cheatCount} lần`);
    }
  }
  if (miscalcCount > 0) {
    parts.push(`tính nhầm ${miscalcCount} lần`);
  }
  if (skippedCount > 0) {
    parts.push(`bỏ lượt ${skippedCount} lần`);
  }

  return `${name} ${parts.join(', ')}: tạo trang ${signed(creatorNet)}, bỏ phiếu ${signed(voteNet)}.`;
}

