import { describe, expect, it } from 'vitest';
import { combine } from '@so-chung/core/lessons/bai-4/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { CLIMB_ROUNDS, CLIMB_SPEC } from './climbConfig';
import {
  addCoins,
  advanceRound,
  climbMedal,
  climbScore,
  createClimbGame,
  generateTree,
  grabAt,
  grabWindow,
  handleCenter,
  isMismatch,
  jump,
  makeTree,
  mutateCode,
  nextCenter,
  nodeLabel,
  shortCode,
  stepClimb,
  swayPeriod,
  type ClimbState,
} from './climbLogic';

/** Số chữ số khác nhau giữa hai mã cùng độ dài. */
const diffDigits = (a: string, b: string) => a.split('').filter((c, i) => c !== b[i]).length;

/** Thời điểm sớm nhất ≥ `from` mà bật lên thì ở đỉnh tay nắm `side` của tầng trên ở gần người chơi (|x| ≤ ngưỡng). */
function timeToJump(s: ClimbState, side: 'left' | 'right', from: number, within: number): number {
  const r = CLIMB_ROUNDS[s.round];
  for (let t = from; t < from + 2 * swayPeriod(r.speed) + 1; t += 0.001) {
    const c = nextCenter(s, t + CLIMB_SPEC.jumpPeak);
    const x = side === 'left' ? c - CLIMB_SPEC.halfGap : c + CLIMB_SPEC.halfGap;
    if (Math.abs(x) <= within) return t;
  }
  throw new Error('no window');
}

/** Chờ tới lúc `t` rồi bật, rồi chờ qua đỉnh; trả về các sự kiện. */
function jumpAt(s: ClimbState, t: number) {
  if (t > s.time) stepClimb(s, t - s.time);
  expect(jump(s)).toBe(true);
  return stepClimb(s, CLIMB_SPEC.jumpPeak + 0.01);
}

const EXAMPLE = [3, 7, 5, 2, 6, 1, 4, 8];

describe('bảng test của spec 08, Màn 12', () => {
  it('ca 1: lá [3,7,5,2,6,1,4,8], đổi T8 thành 9: gốc 4878/4879; T1234 422/422; T5678 658/659; T56 61/61; T78 48/49; T7 4/4; T8 8/9', () => {
    const t = makeTree(EXAMPLE, 7, 9);
    expect(t.depth).toBe(3);
    const pair = (k: number, i: number) => [t.book[k][i], t.now[k][i]];
    expect(pair(0, 0)).toEqual([4878, 4879]);
    expect(pair(1, 0)).toEqual([422, 422]); // T1234
    expect(pair(1, 1)).toEqual([658, 659]); // T5678
    expect(pair(2, 2)).toEqual([61, 61]); // T56
    expect(pair(2, 3)).toEqual([48, 49]); // T78
    expect(pair(3, 6)).toEqual([4, 4]); // T7
    expect(pair(3, 7)).toEqual([8, 9]); // T8
    // dựng bằng combine của Bài 4 (không viết lại công thức)
    expect(t.book[2][3]).toBe(combine(4, 8));
    expect(nodeLabel(t, 1, 1)).toEqual({ book: '658', now: '659' });
  });

  it('ca 2: sinh 500 cây mỗi vòng: trên đường từ gốc tới lá tráo, mỗi tầng đúng một nhánh lệch; mọi nút ngoài đường đều khớp', () => {
    for (const round of CLIMB_ROUNDS) {
      for (let seed = 1; seed <= 500; seed++) {
        const t = generateTree(createMulberry32(seed), round);
        expect(t.leaves).toHaveLength(round.leaves);
        expect(t.depth).toBe(round.depth);
        for (const d of [...t.leaves, ...t.tamperedLeaves]) expect(d >= 1 && d <= 9).toBe(true);
        const changed = t.leaves.map((d, i) => (d !== t.tamperedLeaves[i] ? i : -1)).filter((i) => i >= 0);
        expect(changed).toEqual([t.tamperedIndex]);
        for (let k = 0; k <= t.depth; k++) {
          const onPath = t.tamperedIndex >> (t.depth - k);
          for (let i = 0; i < 2 ** k; i++) expect(isMismatch(t, k, i), `vòng ${round.depth} seed ${seed} tầng ${k} nút ${i}`).toBe(i === onPath);
        }
        // mỗi nút trên đường có đúng một con lệch
        for (let k = 0; k < t.depth; k++) {
          const i = t.tamperedIndex >> (t.depth - k);
          expect(Number(isMismatch(t, k + 1, 2 * i)) + Number(isMismatch(t, k + 1, 2 * i + 1))).toBe(1);
        }
      }
    }
  });

  it('ca 3: mã rút gọn của nhánh lệch khác 1–2 chữ số so với số trong sổ và luôn khác; nút khớp trùng mã (500 cây mỗi vòng có mã)', () => {
    for (const round of CLIMB_ROUNDS.filter((r) => r.codes)) {
      for (let seed = 1; seed <= 500; seed++) {
        const t = generateTree(createMulberry32(seed), round);
        for (let k = 0; k <= t.depth; k++) {
          for (let i = 0; i < 2 ** k; i++) {
            const { book, now } = nodeLabel(t, k, i);
            expect(book).toBe(shortCode(t.book[k][i]));
            expect(book).toMatch(/^\d{4}$/);
            expect(now).toMatch(/^\d{4}$/);
            if (isMismatch(t, k, i)) {
              expect(now).not.toBe(book);
              expect([1, 2]).toContain(diffDigits(book, now));
            } else expect(now).toBe(book);
          }
        }
      }
    }
    // vòng 1–2 hiện giá trị thật
    const t1 = generateTree(createMulberry32(5), CLIMB_ROUNDS[0]);
    expect(t1.bookCode).toBeNull();
    expect(nodeLabel(t1, 0, 0).book).toBe(String(t1.book[0][0]));
  });

  it('ca 4: tay cách tay nắm 0,5 khi tầm với là 0,6 thì nắm được (cả hai bên); cách 0,61 thì không', () => {
    // tay trái ở x = c − 1,5; tay phải ở x = c + 1,5
    expect(grabAt(1.0, 0.6)).toBe('left'); // x trái = −0,5
    expect(grabAt(1.5, 0.6)).toBe('left'); // x trái = 0
    expect(grabAt(-1.0, 0.6)).toBe('right'); // x phải = 0,5
    expect(grabAt(0.89, 0.6)).toBeNull(); // x trái = −0,61
    expect(grabAt(0, 0.6)).toBeNull();
  });

  it('ca 5: nắm nhầm nhánh khớp: "ngõ cụt", ở lại tầng cũ, mất 1 tim, khóa bật 1 giây', () => {
    const s = createClimbGame(11);
    const wrong = isMismatch(s.tree, 1, 0) ? 'right' : 'left';
    const t = timeToJump(s, wrong, 0, 0.1);
    const ev = jumpAt(s, t);
    expect(ev.map((e) => e.kind)).toEqual(['deadEnd']);
    expect(s.level).toBe(0);
    expect(s.hearts).toBe(2);
    // khóa 1 giây kể từ đỉnh
    expect(jump(s)).toBe(false);
    stepClimb(s, t + CLIMB_SPEC.jumpPeak + 1 - s.time + 1e-6);
    expect(jump(s)).toBe(true);
  });

  it('ca 6: không nắm được gì: giữ nguyên tầng, tim không đổi, khóa bật 1 giây', () => {
    const s = createClimbGame(12);
    // bật lúc tâm cặp tay nắm ở giữa: hai tay nắm cách người chơi 1,5
    let t = 0;
    while (Math.abs(nextCenter(s, t + CLIMB_SPEC.jumpPeak)) > 0.05) t += 0.001;
    const ev = jumpAt(s, t);
    expect(ev.map((e) => e.kind)).toEqual(['miss']);
    expect(s.level).toBe(0);
    expect(s.hearts).toBe(3);
    expect(jump(s)).toBe(false);
  });
});

describe('bước B3: cặp tay nắm trượt', () => {
  it('c(t) luôn trong [−1,5; 1,5], tốc độ đúng của vòng; trong mỗi chu kỳ cả tay trái lẫn tay phải đều có lúc |x| ≤ tầm với (cả 4 vòng)', () => {
    for (const r of CLIMB_ROUNDS) {
      const T = swayPeriod(r.speed);
      for (const phase of [0, 1.3, 2.9, 5.7]) {
        let left = 0;
        let right = 0;
        const dt = 0.0005;
        for (let t = 0; t < T; t += dt) {
          const c = handleCenter(t, r.speed, phase);
          expect(c).toBeGreaterThanOrEqual(-1.5 - 1e-9);
          expect(c).toBeLessThanOrEqual(1.5 + 1e-9);
          const g = grabAt(c, r.reach);
          if (g === 'left') left += dt;
          if (g === 'right') right += dt;
          const v = Math.abs(handleCenter(t + 1e-4, r.speed, phase) - c) / 1e-4;
          expect(Math.abs(v - r.speed) < 1e-6 || v < r.speed).toBe(true); // ở chỗ quay đầu vận tốc đổi dấu
        }
        // cửa sổ nắm được mỗi chu kỳ đúng như grabWindow (2 × tầm với / tốc độ)
        expect(left).toBeCloseTo(grabWindow(r), 2);
        expect(right).toBeCloseTo(grabWindow(r), 2);
        expect(grabWindow(r)).toBeCloseTo((2 * r.reach) / r.speed, 9);
      }
    }
  });

  it('hai tay nắm cách nhau 3 > 2 × tầm với nên không bao giờ nắm được cả hai', () => {
    for (const r of CLIMB_ROUNDS) expect(2 * CLIMB_SPEC.halfGap).toBeGreaterThan(2 * r.reach);
  });

  it('bật khi đang bay hay khi không còn chơi thì bỏ qua', () => {
    const s = createClimbGame(3);
    expect(jump(s)).toBe(true);
    expect(jump(s)).toBe(false);
    s.phase = 'lost';
    expect(stepClimb(s, 1)).toEqual([]);
  });
});

/** Bot canh đúng: bật lúc tay nắm của nhánh lệch sẽ ở ngay trên đầu ở đỉnh cú bật. */
function playPerfect(seed: number) {
  const s = createClimbGame(seed);
  let guard = 0;
  while (s.phase !== 'won' && s.phase !== 'lost' && guard++ < 200) {
    if (s.phase === 'roundDone') {
      advanceRound(s);
      continue;
    }
    const side = isMismatch(s.tree, s.level + 1, 2 * s.index) ? 'left' : 'right';
    const reach = CLIMB_ROUNDS[s.round].reach;
    jumpAt(s, timeToJump(s, side, Math.max(s.time, s.lockUntil), reach * 0.5));
  }
  return s;
}

describe('bước B3: bot canh đúng và điểm', () => {
  it('bot canh đúng leo hết 4 vòng, không mất tim, với 300 seed', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const s = playPerfect(seed);
      expect(s.phase, `seed ${seed}`).toBe('won');
      expect(s.roundsDone).toBe(4);
      expect(s.hearts).toBe(3);
    }
  });

  it('nắm được lá lệch ở tầng trên cùng là xong vòng; xong vòng 4 là thắng; hết tim thì kết thúc', () => {
    const s = createClimbGame(21);
    for (let r = 0; r < 4; r++) {
      expect(s.round).toBe(r);
      expect(s.tree.depth).toBe(CLIMB_ROUNDS[r].depth);
      for (let k = 0; k < s.tree.depth; k++) {
        const side = isMismatch(s.tree, s.level + 1, 2 * s.index) ? 'left' : 'right';
        const ev = jumpAt(s, timeToJump(s, side, Math.max(s.time, s.lockUntil), 0.1));
        expect(ev[0]).toEqual({ kind: 'up', level: k + 1, index: s.index, coins: 2, lostCoins: 0 });
      }
      expect(s.index).toBe(s.tree.tamperedIndex);
      expect(s.phase).toBe(r < 3 ? 'roundDone' : 'won');
      if (r < 3) expect(advanceRound(s)).toBe(true);
    }
    expect(advanceRound(s)).toBe(false);

    const l = createClimbGame(22);
    for (let h = 3; h >= 1; h--) {
      const wrong = isMismatch(l.tree, 1, 0) ? 'right' : 'left';
      const ev = jumpAt(l, timeToJump(l, wrong, Math.max(l.time, l.lockUntil), 0.1));
      expect(ev[0].kind).toBe('deadEnd');
      if (h === 1) expect(ev.map((e) => e.kind)).toEqual(['deadEnd', 'lost']);
    }
    expect(l.phase).toBe('lost');
    expect(l.hearts).toBe(0);
    expect(jump(l)).toBe(false);
  });

  it('điểm: 4 vòng, 10 đồng, 2 tim → 510; mốc 250 / 400 / 520', () => {
    expect(climbScore({ roundsDone: 4, coins: 10, hearts: 2 })).toBe(510);
    const s = createClimbGame(1);
    addCoins(s, 3);
    addCoins(s);
    addCoins(s, -5);
    expect(s.coins).toBe(4);
    expect(CLIMB_SPEC.medals).toEqual([250, 400, 520]);
    expect(climbMedal(249)).toBe(0);
    expect(climbMedal(250)).toBe(1);
    expect(climbMedal(400)).toBe(2);
    expect(climbMedal(510)).toBe(2);
    expect(climbMedal(520)).toBe(3);
  });

  it('cùng seed thì cùng cây (và cùng pha tay nắm); khác seed thì (gần như) khác', () => {
    const a = createClimbGame(2026);
    const b = createClimbGame(2026);
    expect(a.tree).toEqual(b.tree);
    expect(a.phases).toEqual(b.phases);
    const trees = new Set<string>();
    for (let seed = 1; seed <= 50; seed++) trees.add(JSON.stringify(createClimbGame(seed).tree));
    expect(trees.size).toBeGreaterThanOrEqual(49);
  });

  it('mutateCode: mã toàn chữ số giống nhau thì đổi một chữ số', () => {
    const rng = createMulberry32(9);
    for (let i = 0; i < 200; i++) {
      const m = mutateCode('0000', rng);
      expect(diffDigits('0000', m)).toBe(1);
    }
  });
});

/** Chơi hết ván, canh đúng mọi lần trừ một lần sai ở tầng `atLevel` của vòng `atRound` (`kind`: ngõ cụt hay trượt). */
function playWithOneSlip(seed: number, atRound: number, atLevel: number, kind: 'deadEnd' | 'miss' | null) {
  const s = createClimbGame(seed);
  let slipped = kind === null;
  let guard = 0;
  while (s.phase !== 'won' && s.phase !== 'lost' && guard++ < 200) {
    if (s.phase === 'roundDone') {
      advanceRound(s);
      continue;
    }
    const good = isMismatch(s.tree, s.level + 1, 2 * s.index) ? 'left' : 'right';
    const from = Math.max(s.time, s.lockUntil);
    if (!slipped && s.round === atRound && s.level === atLevel) {
      slipped = true;
      if (kind === 'deadEnd') {
        jumpAt(s, timeToJump(s, good === 'left' ? 'right' : 'left', from, 0.1));
      } else {
        let t = from;
        while (Math.abs(nextCenter(s, t + CLIMB_SPEC.jumpPeak)) > 0.05) t += 0.001;
        jumpAt(s, t);
      }
      continue;
    }
    jumpAt(s, timeToJump(s, good, from, CLIMB_ROUNDS[s.round].reach * 0.5));
  }
  return s;
}

describe('bước B4: tiền đồng', () => {
  it('mỗi khoảng giữa hai tầng có 2 đồng, tối đa 36 đồng; leo hoàn hảo → 586 điểm', () => {
    expect(CLIMB_SPEC.coinsPerGap * CLIMB_ROUNDS.reduce((a, r) => a + r.depth, 0)).toBe(36);
    for (const seed of [1, 7, 42]) {
      const s = playWithOneSlip(seed, 0, 0, null);
      expect(s.coins).toBe(36);
      expect(climbScore(s)).toBe(586);
    }
  });

  it('một lần ngõ cụt → mất 2 đồng của khoảng đó và 1 tim: 534 điểm', () => {
    const s = playWithOneSlip(5, 2, 3, 'deadEnd');
    expect(s.phase).toBe('won');
    expect(s.coins).toBe(34);
    expect(s.hearts).toBe(2);
    expect(climbScore(s)).toBe(534);
  });

  it('một lần trượt → mất 2 đồng của khoảng đó, không mất tim: 584 điểm', () => {
    const s = playWithOneSlip(6, 1, 0, 'miss');
    expect(s.coins).toBe(34);
    expect(s.hearts).toBe(3);
    expect(climbScore(s)).toBe(584);
  });

  it('sự kiện lên tầng báo số đồng nhặt được và số đồng mất; sai nhiều lần ở cùng tầng chỉ mất 2 đồng của khoảng đó', () => {
    const s = createClimbGame(8);
    const good = isMismatch(s.tree, 1, 0) ? 'left' : 'right';
    for (let k = 0; k < 2; k++) {
      let t = Math.max(s.time, s.lockUntil);
      while (Math.abs(nextCenter(s, t + CLIMB_SPEC.jumpPeak)) > 0.05) t += 0.001;
      jumpAt(s, t);
    }
    const ev = jumpAt(s, timeToJump(s, good, Math.max(s.time, s.lockUntil), 0.1));
    expect(ev[0]).toMatchObject({ kind: 'up', level: 1, coins: 0, lostCoins: 2 });
    expect(s.coins).toBe(0);
    // tầng mới: lần đầu leo qua thì nhặt lại được
    const good2 = isMismatch(s.tree, 2, 2 * s.index) ? 'left' : 'right';
    expect(jumpAt(s, timeToJump(s, good2, Math.max(s.time, s.lockUntil), 0.1))[0]).toMatchObject({ kind: 'up', coins: 2, lostCoins: 0 });
    expect(s.coins).toBe(2);
  });
});
