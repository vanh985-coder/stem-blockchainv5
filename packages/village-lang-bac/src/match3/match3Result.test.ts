import { describe, expect, it } from 'vitest';
import { AVERAGE_BOT, GOOD_BOT, RANDOM_BOT, bestMove, randomMove, type Match3BotProfile } from './match3Bots';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { MATCH3_SPEC } from './match3Config';
import { advanceRound, createMatch3Game, swapCells, type Match3State } from './match3Logic';
import { match3Summary, partsTotal } from './match3Result';

/** Chơi trọn ván bằng thao tác của học sinh, giống cảnh: hết vòng thì sang vòng sau tới khi `phase` là `ended`. */
function playGame(seed: number, bot: Match3BotProfile): Match3State {
  const s = createMatch3Game(seed);
  const rng = createMulberry32(seed ^ 0xabc);
  let guard = 0;
  while (s.phase !== 'ended' && guard++ < 3000) {
    if (s.phase === 'roundEnd') {
      advanceRound(s);
      continue;
    }
    const m = rng() < bot.smart ? bestMove(s, rng) : randomMove(s, rng);
    if (!m) break;
    swapCells(s, m.a, m.b);
  }
  return s;
}

describe('match3Result: kết quả đưa vào màn kết quả = đúng điểm và thống kê của ván', () => {
  for (const bot of [GOOD_BOT, AVERAGE_BOT, RANDOM_BOT]) {
    it(`bot ${bot.name}: 60 ván, điểm tổng = điểm logic = tổng các phần; số cây, lượt dư, lá giả khớp thống kê`, () => {
      let notDone = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const s = playGame(seed, bot);
        expect(s.phase, `seed ${seed}`).toBe('ended');
        const m = match3Summary(s);
        expect(m.rounds).toBe(3);
        expect(m.score, `seed ${seed}`).toBe(s.score);
        expect(m.score, `seed ${seed}`).toBe(partsTotal(s, m));
        expect(m.score, `seed ${seed}`).toBeGreaterThan(0);
        expect(m.leaves).toBe(s.stats.leavesCleared);
        expect(m.slots).toBe(s.stats.slotsFilled);
        expect(m.fakesGone).toBe(s.stats.fakesGone);
        expect(m.trees).toBe(s.results.filter((r) => r.done).length);
        expect(s.results).toHaveLength(3);
        const P = MATCH3_SPEC.points;
        expect(m.score).toBe(m.leaves * P.leaf + m.slots * P.slot + m.trees * P.tree + m.spare * P.spare);
        if (!s.results[2].done) notDone++;
      }
      if (bot === RANDOM_BOT) expect(notDone).toBeGreaterThan(0); // có ván hết lượt ở vòng 3 mà chưa đủ cây: vẫn có điểm đúng
    });
  }

  it('ván kết thúc vì hết lượt ở vòng 3 (cây chưa đủ): kết quả vẫn có điểm của cả ba vòng', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = playGame(seed, RANDOM_BOT);
      if (s.results[2].done) continue;
      const m = match3Summary(s);
      expect(s.results[2].turnsLeft).toBe(0);
      expect(m.score).toBe(s.score);
      expect(m.score).toBeGreaterThan(0);
      expect(m.score).toBe(s.results.reduce((a, r) => a + r.score, 0));
      return;
    }
    throw new Error('no game ended by running out of turns in round 3');
  });
});
