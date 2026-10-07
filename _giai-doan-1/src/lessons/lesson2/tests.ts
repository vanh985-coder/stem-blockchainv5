import {
  isValidProposal,
  generateEasy,
  generateMedium,
} from './logic';
import {
  settleRound,
  pAccept3,
  evCheat,
  updateBeliefs,
  tiDecide,
  hardStars,
  chiCreate,
  makeCheatPage,
  simulateGames,
  summarizePlayer,
  HistoryItem,
} from './bots';
import { pageCode } from '../../lib/chain';
import { createMulberry32 } from '../../lib/rng';
import { GAME_CONFIG } from '../../config/gameConfig';

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

export const tests: { name: string; expected: unknown; actual: () => unknown }[] = [
  // 1. Kiểm tra đơn vị isValidProposal
  {
    name: 'L2.T1: isValidProposal(57, {57, 36, 50}) === "ok"',
    expected: 'ok',
    actual: () => isValidProposal(57, { prevCode: 57, content: 36, code: 50 }),
  },
  {
    name: 'L2.T2: isValidProposal(57, {57, 36, 51}) === "wrong-code"',
    expected: 'wrong-code',
    actual: () => isValidProposal(57, { prevCode: 57, content: 36, code: 51 }),
  },
  {
    name: 'L2.T3: isValidProposal(57, {62, 36, 60}) === "prev-mismatch"',
    expected: 'prev-mismatch',
    actual: () => isValidProposal(57, { prevCode: 62, content: 36, code: 60 }),
  },

  // 2. Kiểm tính chất qua 50 seed: generateEasy
  {
    name: 'L2.T4: generateEasy thỏa mãn tính chất qua 50 seed',
    expected: true,
    actual: () => {
      const offsets = GAME_CONFIG.lesson2.easy.wrongOffsets;
      for (let s = 1; s <= 50; s++) {
        const rng = createMulberry32(s * 1000 + 7);
        const data = generateEasy(rng);
        if (data.rounds.length !== 5) return false;

        const validRounds = data.rounds.filter((r) => r.isValid).length;
        if (validRounds !== 2 && validRounds !== 3) return false;

        let lastCode = data.startPages[1].code;
        for (const round of data.rounds) {
          const correct = pageCode(lastCode, round.content);
          if (round.isValid) {
            if (round.code !== correct) return false;
            if (isValidProposal(lastCode, { prevCode: lastCode, content: round.content, code: round.code }) !== 'ok') {
              return false;
            }
            lastCode = round.code;
          } else {
            if (round.code === correct) return false;
            if (round.code < 0 || round.code > 99) return false;
            const diff = Math.abs(round.code - correct);
            if (!(offsets as readonly number[]).includes(diff)) return false;
            if (isValidProposal(lastCode, { prevCode: lastCode, content: round.content, code: round.code }) !== 'wrong-code') {
              return false;
            }
          }
        }
      }
      return true;
    },
  },

  // 3. Kiểm tính chất qua 50 seed: generateMedium
  {
    name: 'L2.T5: generateMedium thỏa mãn phân bổ kind và logic qua 50 seed',
    expected: true,
    actual: () => {
      for (let s = 1; s <= 50; s++) {
        const rng = createMulberry32(s * 2000 + 13);
        const data = generateMedium(rng);
        if (data.rounds.length !== 5) return false;

        const valids = data.rounds.filter((r) => r.kind === 'valid').length;
        const wrongCodes = data.rounds.filter((r) => r.kind === 'wrong-code').length;
        const tampereds = data.rounds.filter((r) => r.kind === 'tampered').length;

        if (valids !== 2) return false;
        if (wrongCodes < 1 || tampereds < 1) return false;
        if (wrongCodes + tampereds !== 3) return false;

        let currentLedger = [...data.startPages];
        for (const round of data.rounds) {
          const myLast3 = currentLedger.slice(-3);
          const myLastCode = myLast3[myLast3.length - 1].code;
          const status = isValidProposal(myLastCode, round.proposal);

          if (round.kind === 'valid') {
            if (status !== 'ok') return false;
            currentLedger.push(round.proposal);
          } else if (round.kind === 'wrong-code') {
            if (status !== 'wrong-code') return false;
          } else {
            if (status !== 'prev-mismatch') return false;
          }
        }
      }
      return true;
    },
  },

  // 4. Kiểm tra các ca test settleRound
  {
    name: 'L2.T6: settleRound("binh", "valid", 2 agree)',
    expected: true,
    actual: () => {
      const res = settleRound('binh', 'valid', { em: 'agree', chi: 'agree', ti: 'reject' });
      return (
        res.accepted === true &&
        res.deltas.binh === 10 &&
        res.deltas.em === 2 &&
        res.deltas.chi === 2 &&
        res.deltas.ti === 0
      );
    },
  },
  {
    name: 'L2.T7: settleRound("binh", "valid", 1 agree -> rejected)',
    expected: true,
    actual: () => {
      const res = settleRound('binh', 'valid', { em: 'agree', chi: 'reject', ti: 'reject' });
      return (
        res.accepted === false &&
        res.deltas.binh === 0 &&
        res.deltas.em === 2 &&
        res.deltas.chi === 0 &&
        res.deltas.ti === 0
      );
    },
  },
  {
    name: 'L2.T8: settleRound("ti", "cheat", 1 agree -> rejected)',
    expected: true,
    actual: () => {
      const res = settleRound('ti', 'cheat', { em: 'reject', binh: 'reject', chi: 'agree' });
      return (
        res.accepted === false &&
        res.deltas.ti === -30 &&
        res.deltas.em === 2 &&
        res.deltas.binh === 2 &&
        res.deltas.chi === -15
      );
    },
  },
  {
    name: 'L2.T9: settleRound("ti", "cheat", 2 agree -> accepted)',
    expected: true,
    actual: () => {
      const res = settleRound('ti', 'cheat', { em: 'agree', binh: 'reject', chi: 'agree' });
      return (
        res.accepted === true &&
        res.deltas.ti === 40 &&
        res.deltas.em === -15 &&
        res.deltas.binh === 2 &&
        res.deltas.chi === -15
      );
    },
  },
  {
    name: 'L2.T10: settleRound("chi", "miscalc", 3 agree -> accepted)',
    expected: true,
    actual: () => {
      const res = settleRound('chi', 'miscalc', { em: 'agree', binh: 'agree', ti: 'agree' });
      return (
        res.accepted === true &&
        res.deltas.chi === 0 &&
        res.deltas.em === -15 &&
        res.deltas.binh === -15 &&
        res.deltas.ti === -15
      );
    },
  },
  {
    name: 'L2.T11: settleRound("chi", "miscalc", 1 agree -> rejected)',
    expected: true,
    actual: () => {
      const res = settleRound('chi', 'miscalc', { em: 'reject', binh: 'reject', ti: 'agree' });
      return (
        res.accepted === false &&
        res.deltas.chi === -30 &&
        res.deltas.em === 2 &&
        res.deltas.binh === 2 &&
        res.deltas.ti === -15
      );
    },
  },

  // 5. Xác suất & EV
  {
    name: 'L2.T12: pAccept3 & evCheat([1/3, 1/5, 1/3]) -> 0.2 & -16',
    expected: true,
    actual: () => {
      const p = pAccept3([1 / 3, 1 / 5, 1 / 3]);
      const ev = evCheat(p);
      return round4(p) === 0.2 && round2(ev) === -16;
    },
  },
  {
    name: 'L2.T13: pAccept3 & evCheat([0.5, 0.5, 0.5]) -> 0.5 & 5',
    expected: true,
    actual: () => {
      const p = pAccept3([0.5, 0.5, 0.5]);
      const ev = evCheat(p);
      return round4(p) === 0.5 && round2(ev) === 5;
    },
  },
  {
    name: 'L2.T14: pAccept3 & evCheat([0.6, 0.6, 0.6]) -> 0.648 & 15.36',
    expected: true,
    actual: () => {
      const p = pAccept3([0.6, 0.6, 0.6]);
      const ev = evCheat(p);
      return round4(p) === 0.648 && round2(ev) === 15.36;
    },
  },

  // 6. updateBeliefs
  {
    name: 'L2.T15: updateBeliefs cập nhật đúng α và β',
    expected: true,
    actual: () => {
      const initial = { em: [1, 2] as [number, number], binh: [1, 4] as [number, number], chi: [1, 2] as [number, number] };
      const updated = updateBeliefs(initial, { em: 'agree', binh: 'reject', chi: 'agree' });
      return (
        updated.em[0] === 2 &&
        updated.em[1] === 2 &&
        updated.binh[0] === 1 &&
        updated.binh[1] === 5 &&
        updated.chi[0] === 2 &&
        updated.chi[1] === 2 &&
        initial.em[0] === 1 // Kiểm tra tính bất biến (immutability)
      );
    },
  },

  // 7. tiDecide
  {
    name: 'L2.T16: tiDecide lượt đầu luôn cheat với lý do "first"',
    expected: true,
    actual: () => {
      const beliefs = { em: [1, 2] as [number, number], binh: [1, 4] as [number, number], chi: [1, 2] as [number, number] };
      const d = tiDecide({ isFirstTurn: true, beliefs, rng: () => 0.5 });
      return d.cheat === true && d.reason === 'first';
    },
  },
  {
    name: 'L2.T17: tiDecide các lượt sau với priors ban đầu',
    expected: true,
    actual: () => {
      const beliefs = { em: [1, 2] as [number, number], binh: [1, 4] as [number, number], chi: [1, 2] as [number, number] };
      const dHonest = tiDecide({ isFirstTurn: false, beliefs, rng: () => 0.99 });
      const dGamble = tiDecide({ isFirstTurn: false, beliefs, rng: () => 0.01 });
      return (
        dHonest.cheat === false &&
        dHonest.reason === 'honest' &&
        dGamble.cheat === true &&
        dGamble.reason === 'gamble'
      );
    },
  },
  {
    name: 'L2.T18: tiDecide khi ev > 10 chọn cheat với lý do "ev"',
    expected: true,
    actual: () => {
      const beliefs = { em: [6, 4] as [number, number], binh: [6, 4] as [number, number], chi: [6, 4] as [number, number] };
      const d = tiDecide({ isFirstTurn: false, beliefs, rng: () => 0.99 });
      return d.cheat === true && d.reason === 'ev';
    },
  },

  // 8. hardStars
  {
    name: 'L2.T19: hardStars tính đúng số sao',
    expected: true,
    actual: () => {
      const c1 = hardStars({ em: 130, binh: 132, chi: 103, ti: 76 }, false) === 3;
      const c2 = hardStars({ em: 130, binh: 132, chi: 103, ti: 76 }, true) === 2;
      const c3 = hardStars({ em: 100, binh: 132, chi: 120, ti: 76 }, false) === 2;
      const c4 = hardStars({ em: 95, binh: 132, chi: 120, ti: 76 }, false) === 1;
      return c1 && c2 && c3 && c4;
    },
  },

  // 9. Kiểm tra qua 50 seed: chiCreate & makeCheatPage
  {
    name: 'L2.T20: chiCreate khi miscalc luôn lệch, makeCheatPage luôn cho đề không hợp lệ',
    expected: true,
    actual: () => {
      for (let s = 1; s <= 50; s++) {
        const rng = createMulberry32(s * 3000 + 41);
        const correctCode = Math.floor(rng() * 100);
        // Kiểm tra chiCreate
        for (let i = 0; i < 20; i++) {
          const res = chiCreate(correctCode, rng);
          if (res.truth === 'miscalc' && res.code === correctCode) {
            return false;
          }
        }

        // Kiểm tra makeCheatPage
        const lastCode = Math.floor(rng() * 100);
        const content = 1 + Math.floor(rng() * 99);
        const cheatPage = makeCheatPage(lastCode, content, rng);
        if (isValidProposal(lastCode, cheatPage) === 'ok') {
          return false;
        }
      }
      return true;
    },
  },

  // 10. Mô phỏng 2000 ván
  {
    name: 'L2.T21: simulateGames(2000, 1, "honest") nằm trong khoảng lý thuyết',
    expected: true,
    actual: () => {
      const res = simulateGames(2000, 1, 'honest');
      const emOk = res.avg.em >= 124 && res.avg.em <= 140;
      const tiOk = res.avg.ti >= 68 && res.avg.ti <= 84;
      const rateOk = res.tiStrictLastRate >= 0.75 && res.tiStrictLastRate <= 0.90;
      return emOk && tiOk && rateOk;
    },
  },
  {
    name: 'L2.T22: simulateGames(2000, 1, "cheatOnce") nằm trong khoảng lý thuyết',
    expected: true,
    actual: () => {
      const res = simulateGames(2000, 1, 'cheatOnce');
      return res.avg.em >= 100 && res.avg.em <= 120;
    },
  },

  // 11. summarizePlayer
  {
    name: 'L2.T23: summarizePlayer(H, "em", "Em")',
    expected: 'Em làm thật 2 lượt: tạo trang +20, bỏ phiếu +2.',
    actual: () => {
      const H: HistoryItem[] = [
        { creator: 'em', truth: 'valid', accepted: true, deltas: { em: 10, binh: 2, chi: 2, ti: 2 } },
        { creator: 'ti', truth: 'cheat', accepted: false, deltas: { ti: -30, em: 2, binh: 2, chi: -15 } },
        { creator: 'em', truth: 'valid', accepted: true, deltas: { em: 10, binh: 2, chi: 2, ti: 2 } },
      ];
      return summarizePlayer(H, 'em', 'Em');
    },
  },
  {
    name: 'L2.T24: summarizePlayer(H, "ti", "Tí")',
    expected: 'Tí gian 1 lần (bị bắt 1): tạo trang \u221230, bỏ phiếu +4.',
    actual: () => {
      const H: HistoryItem[] = [
        { creator: 'em', truth: 'valid', accepted: true, deltas: { em: 10, binh: 2, chi: 2, ti: 2 } },
        { creator: 'ti', truth: 'cheat', accepted: false, deltas: { ti: -30, em: 2, binh: 2, chi: -15 } },
        { creator: 'em', truth: 'valid', accepted: true, deltas: { em: 10, binh: 2, chi: 2, ti: 2 } },
      ];
      return summarizePlayer(H, 'ti', 'Tí');
    },
  },
  {
    name: 'L2.T25: summarizePlayer(H, "binh", "Bình")',
    expected: 'Bình không tạo trang: bỏ phiếu +6.',
    actual: () => {
      const H: HistoryItem[] = [
        { creator: 'em', truth: 'valid', accepted: true, deltas: { em: 10, binh: 2, chi: 2, ti: 2 } },
        { creator: 'ti', truth: 'cheat', accepted: false, deltas: { ti: -30, em: 2, binh: 2, chi: -15 } },
        { creator: 'em', truth: 'valid', accepted: true, deltas: { em: 10, binh: 2, chi: 2, ti: 2 } },
      ];
      return summarizePlayer(H, 'binh', 'Bình');
    },
  },
  {
    name: 'L2.T26: summarizePlayer([{ creator: "chi", skipped: true }], "chi", "Chi")',
    expected: 'Chi bỏ lượt 1 lần: tạo trang 0, bỏ phiếu 0.',
    actual: () => summarizePlayer([{ creator: 'chi', skipped: true }], 'chi', 'Chi'),
  },
  {
    name: 'L2.T27: summarizePlayer([{ creator: "ti", truth: "cheat", accepted: true, deltas: { ti: 40, ... } }], "ti", "Tí")',
    expected: 'Tí gian 1 lần (lọt 1): tạo trang +40, bỏ phiếu 0.',
    actual: () =>
      summarizePlayer(
        [{ creator: 'ti', truth: 'cheat', accepted: true, deltas: { ti: 40, em: -15, binh: 2, chi: -15 } }],
        'ti',
        'Tí'
      ),
  },
];
