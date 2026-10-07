/**
 * Self-test cho Bài 5 — Tấn công 51%
 * Thu thập tự động qua import.meta.glob('/src/**\/tests.ts')
 */

import {
  Owner,
  AttackMove,
  frontier,
  recoverable,
  legalAttacks,
  legalDefenses,
  resolve,
  countH,
  evaluate,
  hardStars,
  attackKind,
  maxPercentWithK,
  minNodesToWin,
  minPercentWithK,
  checkEasyTask,
  MEDIUM_PAIRS_A,
  MEDIUM_PAIRS_B,
  addPiece,
  removePieceAt,
} from './logic';
import {
  Habits,
  initialHabits,
  decayHabits,
  recordHabit,
  solve,
  predict,
  lambda,
  decideBot,
  simulateGames,
} from './bot';
import { GAME_CONFIG } from '../../config/gameConfig';
import { createMulberry32 } from '../../lib/rng';

export const tests: { name: string; expected: unknown; actual: () => unknown }[] = [
  // 1. Bắt đầu với H = {0, 1}
  {
    name: 'frontier với H = {0, 1} -> [2, 3, 8, 9]',
    expected: [2, 3, 8, 9],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return frontier(baseOwner);
    },
  },
  {
    name: 'recoverable với H = {0, 1} -> [0, 1]',
    expected: [0, 1],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return recoverable(baseOwner);
    },
  },
  {
    name: 'legalAttacks với H = {0, 1} -> 10 nước',
    expected: 10,
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return legalAttacks(baseOwner).length;
    },
  },
  {
    name: 'legalDefenses với H = {0, 1} -> 12 nước',
    expected: 12,
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return legalDefenses(baseOwner).length;
    },
  },
  {
    name: 'Tấn công (2,9) vs bảo vệ (2,9) -> H = {0, 1}',
    expected: [0, 1],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const res = resolve(baseOwner, [2, 9], { kind: 'protect', shields: [2, 9] });
      return res.map((o, i) => (o === 'H' ? i : -1)).filter((i) => i !== -1);
    },
  },
  {
    name: 'Tấn công (3,3) vs bảo vệ (2,9) -> H = {0, 1, 3}',
    expected: [0, 1, 3],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const res = resolve(baseOwner, [3, 3], { kind: 'protect', shields: [2, 9] });
      return res.map((o, i) => (o === 'H' ? i : -1)).filter((i) => i !== -1);
    },
  },
  {
    name: 'Tấn công (3,3) vs bảo vệ (3,3) -> H = {0, 1}',
    expected: [0, 1],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const res = resolve(baseOwner, [3, 3], { kind: 'protect', shields: [3, 3] });
      return res.map((o, i) => (o === 'H' ? i : -1)).filter((i) => i !== -1);
    },
  },
  {
    name: 'Tấn công (2,8) vs bảo vệ (3,3) -> H = {0, 1, 2, 8}',
    expected: [0, 1, 2, 8],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const res = resolve(baseOwner, [2, 8], { kind: 'protect', shields: [3, 3] });
      return res.map((o, i) => (o === 'H' ? i : -1)).filter((i) => i !== -1);
    },
  },
  {
    name: 'Tấn công (2,9) vs phục hồi 1 -> H = {0, 2, 9}',
    expected: [0, 2, 9],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const res = resolve(baseOwner, [2, 9], { kind: 'recover', node: 1 });
      return res.map((o, i) => (o === 'H' ? i : -1)).filter((i) => i !== -1);
    },
  },
  {
    name: 'Tấn công (3,3) vs phục hồi 1 -> H = {0, 3}',
    expected: [0, 3],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const res = resolve(baseOwner, [3, 3], { kind: 'recover', node: 1 });
      return res.map((o, i) => (o === 'H' ? i : -1)).filter((i) => i !== -1);
    },
  },
  {
    name: 'Tấn công (2,3) vs bảo vệ (8,9) -> H = {0, 1, 2, 3}',
    expected: [0, 1, 2, 3],
    actual: () => {
      const baseOwner: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const res = resolve(baseOwner, [2, 3], { kind: 'protect', shields: [8, 9] });
      return res.map((o, i) => (o === 'H' ? i : -1)).filter((i) => i !== -1);
    },
  },

  // 2. Các thế khác
  {
    name: 'H = {0, 3}: frontier [1, 2, 4, 5, 8, 9], recoverable [0, 3], 21 nước tấn công, 23 nước phòng thủ',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'D', 'D', 'H', 'D', 'D', 'D', 'D', 'D', 'D'];
      const f = frontier(o);
      const r = recoverable(o);
      const la = legalAttacks(o);
      const ld = legalDefenses(o);
      return (
        JSON.stringify(f) === JSON.stringify([1, 2, 4, 5, 8, 9]) &&
        JSON.stringify(r) === JSON.stringify([0, 3]) &&
        la.length === 21 &&
        ld.length === 23
      );
    },
  },
  {
    name: 'H = {0, 2, 9}: frontier [1, 3, 4, 7, 8], recoverable [0, 2, 9], 15 nước tấn công, 18 nước phòng thủ',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'D', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'H'];
      const f = frontier(o);
      const r = recoverable(o);
      const la = legalAttacks(o);
      const ld = legalDefenses(o);
      return (
        JSON.stringify(f) === JSON.stringify([1, 3, 4, 7, 8]) &&
        JSON.stringify(r) === JSON.stringify([0, 2, 9]) &&
        la.length === 15 &&
        ld.length === 18
      );
    },
  },
  {
    name: 'H = {0, 5}: 36 nước tấn công, 38 nước phòng thủ (ma trận lớn nhất)',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'D', 'D', 'D', 'D', 'H', 'D', 'D', 'D', 'D'];
      return legalAttacks(o).length === 36 && legalDefenses(o).length === 38;
    },
  },
  {
    name: 'resolve không sửa mảng vào',
    expected: true,
    actual: () => {
      const input: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const snapshot = JSON.stringify(input);
      resolve(input, [3, 3], { kind: 'protect', shields: [2, 9] });
      return JSON.stringify(input) === snapshot;
    },
  },

  // 3. evaluate (sai số 1e-9)
  {
    name: 'evaluate H={0,1}, r=3 → 0.02',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return Math.abs(evaluate(o, 3) - 0.02) < 1e-9;
    },
  },
  {
    name: 'evaluate H={0,1,2}, r=3 → 0.754',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return Math.abs(evaluate(o, 3) - 0.754) < 1e-9;
    },
  },
  {
    name: 'evaluate 5 node liền nhau, r=1 → 0.907',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'H', 'H', 'H', 'D', 'D', 'D', 'D', 'D'];
      return Math.abs(evaluate(o, 1) - 0.907) < 1e-9;
    },
  },
  {
    name: 'evaluate H={0,1}, r=9 → 1.018 (dùng cột 7)',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return Math.abs(evaluate(o, 9) - 1.018) < 1e-9;
    },
  },
  {
    name: 'evaluate 6 node → 1.1',
    expected: 1.1,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'H', 'H', 'H', 'H', 'D', 'D', 'D', 'D'];
      return evaluate(o, 3);
    },
  },
  {
    name: 'evaluate 0 node → -0.1',
    expected: -0.1,
    actual: () => {
      const o: Owner[] = Array(10).fill('D');
      return evaluate(o, 3);
    },
  },
  {
    name: 'evaluate r=0, a=3 → 0.03',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      return Math.abs(evaluate(o, 0) - 0.03) < 1e-9;
    },
  },

  // 4. Kết thúc ván và sao
  {
    name: 'Hết round 4 mà H < 6 -> Người bảo vệ thắng',
    expected: 'D',
    actual: () => {
      const o: Owner[] = ['H', 'H', 'H', 'H', 'H', 'D', 'D', 'D', 'D', 'D'];
      const hCount = countH(o);
      if (hCount >= 6) return 'H';
      if (hCount === 0) return 'D';
      return 'D';
    },
  },
  {
    name: 'hardStars đủ 5 nhánh (thắng; Bảo vệ thua round 4; Bảo vệ thua sớm; Hacker thua >= 5 node; Hacker thua < 5 node)',
    expected: true,
    actual: () => {
      const s1 = hardStars({
        studentRole: 'H',
        winner: 'H',
        roundsPlayed: 2,
        maxHackerNodes: 6,
      });
      const s2 = hardStars({
        studentRole: 'D',
        winner: 'H',
        roundsPlayed: 4,
        maxHackerNodes: 6,
      });
      const s3 = hardStars({
        studentRole: 'D',
        winner: 'H',
        roundsPlayed: 3,
        maxHackerNodes: 6,
      });
      const s4 = hardStars({
        studentRole: 'H',
        winner: 'D',
        roundsPlayed: 4,
        maxHackerNodes: 5,
      });
      const s5 = hardStars({
        studentRole: 'H',
        winner: 'D',
        roundsPlayed: 4,
        maxHackerNodes: 4,
      });
      return s1 === 3 && s2 === 2 && s3 === 1 && s4 === 2 && s5 === 1;
    },
  },

  // 5. Cân bằng Nash và thế đầu (round 1, rLeft = 3)
  {
    name: 'solve ma trận [[1,0],[0,1]] -> attackMix ≈ [0.5, 0.5] (±0.05)',
    expected: true,
    actual: () => {
      const res = solve(
        [
          [1, 0],
          [0, 1],
        ],
        500
      );
      return (
        Math.abs(res.attackMix[0] - 0.5) <= 0.05 &&
        Math.abs(res.attackMix[1] - 0.5) <= 0.05
      );
    },
  },
  {
    name: 'Thế đầu (round 1, rLeft = 3): EV [0.62, 0.74], tỉ trọng split >= 0.85, tỉ trọng recover [0.05, 0.30]',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const A = legalAttacks(o);
      const D = legalDefenses(o);
      const M: number[][] = Array.from({ length: A.length }, () =>
        Array(D.length).fill(0)
      );
      for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < D.length; j++) {
          M[i][j] = evaluate(resolve(o, A[i], D[j]), 3);
        }
      }
      const { attackMix, defenseMix } = solve(M, 300);
      let ev = 0;
      for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < D.length; j++) {
          ev += M[i][j] * attackMix[i] * defenseMix[j];
        }
      }
      let splitWeight = 0;
      for (let i = 0; i < A.length; i++) {
        if (attackKind(A[i]) === 'split') splitWeight += attackMix[i];
      }
      let recWeight = 0;
      for (let j = 0; j < D.length; j++) {
        if (D[j].kind === 'recover') recWeight += defenseMix[j];
      }
      return (
        ev >= 0.62 &&
        ev <= 0.74 &&
        splitWeight >= 0.85 &&
        recWeight >= 0.05 &&
        recWeight <= 0.3
      );
    },
  },

  // 6. Thói quen
  {
    name: 'decay nhân 0.8',
    expected: true,
    actual: () => {
      const h: Habits = {
        hacker: { split: 10, stack: 5 },
        defender: { spread: 20, stack: 10, recover: 5 },
      };
      const dec = decayHabits(h, 0.8);
      return (
        Math.abs(dec.hacker.split - 8) < 1e-9 &&
        Math.abs(dec.hacker.stack - 4) < 1e-9 &&
        Math.abs(dec.defender.spread - 16) < 1e-9 &&
        Math.abs(dec.defender.stack - 8) < 1e-9 &&
        Math.abs(dec.defender.recover - 4) < 1e-9
      );
    },
  },
  {
    name: 'record chỉ tăng đúng kiểu',
    expected: true,
    actual: () => {
      let h = initialHabits();
      h = recordHabit(h, 'H', 'split');
      h = recordHabit(h, 'D', 'recover');
      return (
        h.hacker.split === 1 &&
        h.hacker.stack === 0 &&
        h.defender.spread === 0 &&
        h.defender.stack === 0 &&
        h.defender.recover === 1
      );
    },
  },
  {
    name: 'predict chuẩn hóa về tổng 1',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const h = initialHabits();
      const predH = predict(o, h, 'H');
      const sumH = predH.moveProbs.reduce((s, p) => s + p, 0);
      const predD = predict(o, h, 'D');
      const sumD = predD.moveProbs.reduce((s, p) => s + p, 0);
      return Math.abs(sumH - 1) < 1e-9 && Math.abs(sumD - 1) < 1e-9;
    },
  },
  {
    name: 'λ = 0 khi obs = 0; λ = 0.6 khi n ≥ 5',
    expected: true,
    actual: () => {
      const h0 = initialHabits();
      const l0 = lambda(h0, 'H');
      const h5: Habits = {
        hacker: { split: 3, stack: 2 },
        defender: { spread: 0, stack: 0, recover: 0 },
      };
      const l5 = lambda(h5, 'H');
      return l0 === 0 && Math.abs(l5 - 0.6) < 1e-9;
    },
  },

  // 7. Bot
  {
    name: 'decideBot cùng seed, cùng input → cùng nước',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const h = initialHabits();
      const d1 = decideBot({
        owner: o,
        round: 1,
        maxRounds: 4,
        botRole: 'H',
        difficulty: 'smart',
        habits: h,
        rng: createMulberry32(42),
      });
      const d2 = decideBot({
        owner: o,
        round: 1,
        maxRounds: 4,
        botRole: 'H',
        difficulty: 'smart',
        habits: h,
        rng: createMulberry32(42),
      });
      return JSON.stringify(d1) === JSON.stringify(d2);
    },
  },
  {
    name: 'Bot khôn làm Người bảo vệ, habits.hacker.stack = 10 (200 lần): tỉ lệ chọn recover ≥ 50%',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const h: Habits = {
        hacker: { split: 0, stack: 10 },
        defender: { spread: 0, stack: 0, recover: 0 },
      };
      let countRec = 0;
      const rng = createMulberry32(12345);
      for (let i = 0; i < 200; i++) {
        const d = decideBot({
          owner: o,
          round: 1,
          maxRounds: 4,
          botRole: 'D',
          difficulty: 'smart',
          habits: h,
          rng,
        });
        if ('kind' in d.move && d.move.kind === 'recover') countRec++;
      }
      return countRec / 200 >= 0.5;
    },
  },
  {
    name: 'Bot khôn làm Người bảo vệ, habits toàn 0 (200 lần): tỉ lệ chọn recover ≤ 30%',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const h = initialHabits();
      let countRec = 0;
      const rng = createMulberry32(12345);
      for (let i = 0; i < 200; i++) {
        const d = decideBot({
          owner: o,
          round: 1,
          maxRounds: 4,
          botRole: 'D',
          difficulty: 'smart',
          habits: h,
          rng,
        });
        if ('kind' in d.move && d.move.kind === 'recover') countRec++;
      }
      return countRec / 200 <= 0.3;
    },
  },
  {
    name: 'Mọi nước bot trả về đều nằm trong legalAttacks / legalDefenses',
    expected: true,
    actual: () => {
      const o: Owner[] = ['H', 'H', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];
      const A = legalAttacks(o);
      const D = legalDefenses(o);
      const rng = createMulberry32(999);
      for (let i = 0; i < 50; i++) {
        const bH = decideBot({
          owner: o,
          round: 1,
          maxRounds: 4,
          botRole: 'H',
          difficulty: 'smart',
          habits: initialHabits(),
          rng,
        });
        const bD = decideBot({
          owner: o,
          round: 1,
          maxRounds: 4,
          botRole: 'D',
          difficulty: 'smart',
          habits: initialHabits(),
          rng,
        });
        const inA = A.some(
          (m) =>
            m[0] === (bH.move as AttackMove)[0] &&
            m[1] === (bH.move as AttackMove)[1]
        );
        const inD = D.some((m) => {
          if (
            m.kind === 'recover' &&
            'kind' in bD.move &&
            bD.move.kind === 'recover'
          ) {
            return m.node === bD.move.node;
          }
          if (
            m.kind === 'protect' &&
            'kind' in bD.move &&
            bD.move.kind === 'protect'
          ) {
            return (
              m.shields[0] === bD.move.shields[0] &&
              m.shields[1] === bD.move.shields[1]
            );
          }
          return false;
        });
        if (!inA || !inD) return false;
      }
      return true;
    },
  },
  {
    name: 'simulateGames 150 ván, seed 42: Smart H [0.80, 0.97], Smart D [0.58, 0.86], Smart D - Medium D >= 0.15',
    expected: true,
    actual: () => {
      const seed = 42;
      const winSmartH = simulateGames({
        botRole: 'H',
        difficulty: 'smart',
        games: 150,
        seed,
      });
      const winSmartD = simulateGames({
        botRole: 'D',
        difficulty: 'smart',
        games: 150,
        seed,
      });
      const winMediumD = simulateGames({
        botRole: 'D',
        difficulty: 'medium',
        games: 150,
        seed,
      });
      return (
        winSmartH >= 0.8 &&
        winSmartH <= 0.97 &&
        winSmartD >= 0.58 &&
        winSmartD <= 0.86 &&
        winSmartD - winMediumD >= 0.15
      );
    },
  },

  // 7. Dễ và Trung bình
  {
    name: 'maxPercentWithK(…, 2) = 43',
    expected: 43,
    actual: () => maxPercentWithK(GAME_CONFIG.lesson5.easyPowers, 2),
  },
  {
    name: 'minNodesToWin = 3',
    expected: 3,
    actual: () => minNodesToWin(GAME_CONFIG.lesson5.easyPowers, 51),
  },
  {
    name: 'minPercentWithK(…, 7) = 42',
    expected: 42,
    actual: () => minPercentWithK(GAME_CONFIG.lesson5.easyPowers, 7),
  },
  {
    name: 'checkEasyTask đủ các nhánh ở mục 3',
    expected: true,
    actual: () => {
      const p = GAME_CONFIG.lesson5.easyPowers;
      const t1_pass = checkEasyTask(1, p, [0, 1, 2]);
      const t1_fail = checkEasyTask(1, p, [0, 1]);
      const t2_pass = checkEasyTask(2, p, [0, 1, 2]);
      const t2_more = checkEasyTask(2, p, [0, 1, 2, 3]);
      const t2_two = checkEasyTask(2, p, [0, 1]);
      const t2_three_low = checkEasyTask(2, p, [7, 8, 9]);
      const t2_other = checkEasyTask(2, p, [0]);
      const t3_pass = checkEasyTask(3, p, [3, 4, 5, 6, 7, 8, 9]);
      const t3_not7 = checkEasyTask(3, p, [0, 1, 2]);
      const t3_high = checkEasyTask(3, p, [0, 1, 2, 3, 4, 5, 6]);

      return (
        t1_pass.ok &&
        !t1_fail.ok &&
        t2_pass.ok &&
        !t2_more.ok &&
        t2_more.reason === 'Thắng rồi, nhưng thử ít node hơn xem!' &&
        !t2_two.ok &&
        t2_two.reason === 'Hai node mạnh nhất cũng chỉ được 43%, chưa đủ.' &&
        !t2_three_low.ok &&
        t2_three_low.reason === 'Chưa đủ 51%, thử đổi sang node mạnh hơn.' &&
        !t2_other.ok &&
        t3_pass.ok &&
        !t3_not7.ok &&
        t3_not7.reason === 'Hacker cần giữ đúng 7 node.' &&
        !t3_high.ok &&
        t3_high.reason ===
          '7 node này mạnh quá, đổi node mạnh về phía Người bảo vệ.'
      );
    },
  },
  {
    name: 'Đáp án Trung bình A–1–D, B–2–E, C–3–F',
    expected: true,
    actual: () => {
      return (
        MEDIUM_PAIRS_A['A'] === '1' &&
        MEDIUM_PAIRS_A['B'] === '2' &&
        MEDIUM_PAIRS_A['C'] === '3' &&
        MEDIUM_PAIRS_B['A'] === 'D' &&
        MEDIUM_PAIRS_B['B'] === 'E' &&
        MEDIUM_PAIRS_B['C'] === 'F'
      );
    },
  },

  // 8. Đặt và gỡ quân (addPiece & removePieceAt)
  {
    name: 'addPiece([8], 2, [2, 8]) → [2, 8]',
    expected: [2, 8],
    actual: () => addPiece([8], 2, [2, 8]),
  },
  {
    name: 'addPiece([8], 8, [2, 8]) → [8, 8]',
    expected: [8, 8],
    actual: () => addPiece([8], 8, [2, 8]),
  },
  {
    name: 'addPiece([2, 8], 8, [2, 8]) → [2, 8] (đã đủ 2)',
    expected: [2, 8],
    actual: () => addPiece([2, 8], 8, [2, 8]),
  },
  {
    name: 'addPiece([8], 5, [2, 8]) → [8] (node không hợp lệ)',
    expected: [8],
    actual: () => addPiece([8], 5, [2, 8]),
  },
  {
    name: 'removePieceAt([8, 8], 0) → [8]',
    expected: [8],
    actual: () => removePieceAt([8, 8], 0),
  },
];
