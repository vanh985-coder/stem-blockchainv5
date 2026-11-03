import { describe, expect, it } from 'vitest';
import { combine } from '@so-chung/core/lessons/bai-4/logic';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { CLIMB_MAX_SCORE, CLIMB_SPEC } from './climbConfig';
import {
  advanceRound,
  buildTiers,
  choiceBaseX,
  choiceValues,
  choiceX,
  climbMedal,
  climbScore,
  createClimbGame,
  createPracticeGame,
  generateTree,
  isLeftChild,
  jump,
  makeTree,
  nodeValue,
  nodeX,
  overlapX,
  setMove,
  setSlow,
  siblingValue,
  siblingX,
  slideOffset,
  stepClimb,
  tickClimb,
  tierY,
  tri,
  type ClimbEvent,
  type ClimbState,
} from './climbLogic';

/** Chạy `seconds` giây theo khung 1/60 và gom sự kiện. */
function run(s: ClimbState, seconds: number): ClimbEvent[] {
  const out: ClimbEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) out.push(...stepClimb(s, 1 / 60));
  return out;
}
const kinds = (e: readonly ClimbEvent[]) => e.map((x) => x.kind);

/** Đặt người chơi ngay dưới một bậc lựa chọn rồi nhảy thẳng lên (bậc đứng yên ở vòng 1). */
function jumpOnto(s: ClimbState, choiceIndex: number): ClimbEvent[] {
  const target = choiceX(s, s.choices[choiceIndex]);
  s.player.x = Math.max(-CLIMB_SPEC.bounds, Math.min(CLIMB_SPEC.bounds, target));
  s.player.grounded = true;
  s.player.y = tierY(s.level);
  // đứng lơ lửng trên không thì rơi; nhảy ngay để thân ở đúng x lúc đáp
  s.player.on = 0;
  expect(jump(s)).toBe(true);
  return run(s, 2.6);
}

describe('cây và giá trị nút (Bài 4)', () => {
  it('lá [3,7,5,2,6,1,4,8], đổi lá thứ 8 thành 9: gốc 4878 / 4879 và các nút khớp bảng spec', () => {
    const t = makeTree([3, 7, 5, 2, 6, 1, 4, 8], 7, 9);
    expect(t.depth).toBe(3);
    expect([t.book[3][0], t.now[3][0]]).toEqual([4878, 4879]);
    expect([t.book[2][0], t.now[2][0]]).toEqual([422, 422]);
    expect([t.book[2][1], t.now[2][1]]).toEqual([658, 659]);
    expect([t.book[1][2], t.now[1][2]]).toEqual([61, 61]);
    expect([t.book[1][3], t.now[1][3]]).toEqual([48, 49]);
    expect([t.book[0][6], t.now[0][6]]).toEqual([4, 4]);
    expect([t.book[0][7], t.now[0][7]]).toEqual([8, 9]);
  });

  it('công thức ghép dùng combine của Bài 4: nút = combine(trái, phải), nên đổi chỗ là ra số khác', () => {
    const t = makeTree([3, 7, 5, 2], 1, 8);
    expect(t.now[1]).toEqual([combine(3, 8), combine(5, 2)]);
    expect(combine(3, 8)).toBe(38);
    expect(combine(8, 3)).not.toBe(38);
  });

  it('sinh 500 cây: lá 1–9, đúng một lá bị tráo, nút lệch đúng là các nút trên đường từ lá đó tới gốc, gốc luôn lệch', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = createMulberry32(seed);
      for (const n of [4, 8, 16]) {
        const t = generateTree(rng, n);
        expect(t.leaves.every((d) => d >= 1 && d <= 9)).toBe(true);
        expect(t.leaves.filter((d, i) => d !== t.tamperedLeaves[i])).toHaveLength(1);
        for (let k = 0; k <= t.depth; k++) {
          t.book[k].forEach((v, i) => {
            const onPath = i === t.tamperedIndex >> k;
            expect(v !== t.now[k][i]).toBe(onPath);
          });
        }
      }
    }
  });

  it('bậc anh em của nút trên đường có cùng giá trị trong sổ và hiện tại; nút trái/phải theo chỉ số chẵn/lẻ', () => {
    const t = makeTree([3, 7, 5, 2, 6, 1, 4, 8], 3, 9);
    for (let k = 0; k < t.depth; k++) {
      const i = t.tamperedIndex >> k;
      expect(siblingValue(t, k)).toBe(t.book[k][i ^ 1]);
      expect(isLeftChild(t, k)).toBe(i % 2 === 0);
      expect(nodeX(t, k)).toBe(isLeftChild(t, k) ? -CLIMB_SPEC.pairX : CLIMB_SPEC.pairX);
      expect(siblingX(t, k)).toBe(-nodeX(t, k));
    }
    expect(nodeValue(t, 0)).toBe(9);
  });
});

describe('các bậc lựa chọn', () => {
  it('đúng một bậc ghi combine(trái, phải) theo đúng thứ tự trái–phải của hai nút; bậc nhiễu khác nhau và khác đáp án', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = createMulberry32(seed);
      for (const count of [2, 3]) {
        const t = generateTree(rng, 16);
        const tiers = buildTiers(t, count, rng);
        expect(tiers).toHaveLength(t.depth);
        tiers.forEach((tier, k) => {
          expect(tier.options).toHaveLength(count);
          expect(tier.options[0]).toBe(combine(tier.left, tier.right));
          expect(tier.options[0]).toBe(t.now[k + 1][t.tamperedIndex >> (k + 1)]);
          expect(new Set(tier.options).size).toBe(count);
        });
      }
    }
  });

  it('thứ tự trái–phải theo vị trí hai nút: nút con trái đứng trái, con phải đứng phải', () => {
    const t = makeTree([3, 7, 5, 2], 1, 8); // lá 1 là con phải của nút 0 tầng 1
    const tiers = buildTiers(t, 2, createMulberry32(1));
    expect([tiers[0].left, tiers[0].right]).toEqual([3, 8]);
    expect(tiers[0].options[0]).toBe(38);
    expect([tiers[1].left, tiers[1].right]).toEqual([38, 52]);
  });

  it('bậc nhiễu lấy từ: đảo thứ tự, trái + phải, số đúng lệch đúng 1 chữ số', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const left = 38;
      const right = 52;
      const [correct, ...rest] = choiceValues(left, right, 3, createMulberry32(seed));
      expect(correct).toBe(432);
      for (const v of rest) {
        if (v === combine(right, left)) seen.add('swap');
        else if (v === left + right) seen.add('sum');
        else {
          const a = String(correct);
          const b = String(v);
          expect(b.length).toBe(a.length);
          expect([...a].filter((ch, i) => ch !== b[i])).toHaveLength(1);
          seen.add('digit');
        }
      }
      expect(rest).toContain(combine(right, left)); // 3 lựa chọn luôn có bậc đảo thứ tự
    }
    expect([...seen].sort()).toEqual(['digit', 'sum', 'swap']);
  });

  it('hai nút bằng nhau (đảo thứ tự ra đúng đáp án): vẫn đủ bậc nhiễu khác nhau', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const v = choiceValues(5, 5, 3, createMulberry32(seed));
      expect(v[0]).toBe(55);
      expect(new Set(v).size).toBe(3);
    }
  });
});

describe('hình học', () => {
  it('sóng tam giác nằm trong [−1; 1], trượt không quá biên độ, và vòng 1 đứng yên', () => {
    for (let u = -9; u < 9; u += 0.37) expect(Math.abs(tri(u))).toBeLessThanOrEqual(1);
    for (let c = 0; c < 20; c += 0.13) expect(Math.abs(slideOffset(1.4, c, 1.7))).toBeLessThanOrEqual(CLIMB_SPEC.slideAmplitude + 1e-9);
    expect(slideOffset(0, 5, 1)).toBe(0);
  });
  it('hai bậc kề nhau không chồng nhau dù đang trượt (2 lựa chọn và 3 lựa chọn)', () => {
    for (const n of [2, 3]) {
      const xs = CLIMB_SPEC.choiceX[n];
      for (let i = 0; i + 1 < xs.length; i++) {
        expect(xs[i + 1] - xs[i] - 2 * CLIMB_SPEC.slideAmplitude).toBeGreaterThan(CLIMB_SPEC.stepWidth);
      }
    }
  });
  it('phần giao theo trục x', () => {
    expect(overlapX(0, 0)).toBeCloseTo(2 * CLIMB_SPEC.playerHalf);
    expect(overlapX(5, 0)).toBeLessThan(0);
    expect(overlapX(CLIMB_SPEC.stepWidth / 2, 0)).toBeCloseTo(CLIMB_SPEC.playerHalf);
  });
  it('cú nhảy vừa tới tầng trên: đỉnh cao hơn khoảng cách tầng nhưng chưa tới tầng thứ hai', () => {
    expect(CLIMB_SPEC.jumpApex).toBeGreaterThan(CLIMB_SPEC.gap);
    expect(CLIMB_SPEC.jumpApex).toBeLessThan(2 * CLIMB_SPEC.gap);
    const s = createClimbGame(3);
    jump(s);
    let top = 0;
    for (let i = 0; i < 120; i++) {
      stepClimb(s, 1 / 60);
      top = Math.max(top, s.player.y);
    }
    expect(top - tierY(0)).toBeCloseTo(CLIMB_SPEC.jumpApex, 1);
  });
});

describe('ván chơi: luật nhảy', () => {
  it('bắt đầu: vòng 1 (8 lá, 2 lựa chọn), 3 tim, đứng trên bậc của lá bị tráo, bên cạnh có bậc anh em', () => {
    const s = createClimbGame(11);
    expect(s.tree.depth).toBe(3);
    expect(s.choices).toHaveLength(2);
    expect(s.hearts).toBe(3);
    expect(s.level).toBe(0);
    expect(s.player).toMatchObject({ x: nodeX(s.tree, 0), y: 0, grounded: true });
    expect(s.choices.filter((c) => c.correct)).toHaveLength(1);
  });

  it('nhảy lên đúng bậc: bậc đó thành nút hiện tại, hiện bậc anh em và các lựa chọn tầng trên', () => {
    const s = createClimbGame(5);
    const before = s.choices.map((c) => c.value);
    const ev = jumpOnto(s, s.choices.findIndex((c) => c.correct));
    expect(kinds(ev)).toEqual(['up']);
    expect(s.level).toBe(1);
    expect(s.hearts).toBe(3);
    expect(s.player.y).toBe(tierY(1));
    expect(s.player.x).toBe(nodeX(s.tree, 1));
    expect(s.choices).toHaveLength(2);
    expect(s.choices.map((c) => c.value)).not.toEqual(before);
    expect(s.choices.find((c) => c.correct)!.value).toBe(s.tiers[1].options[0]);
  });

  it('leo hết cây: lên tới gốc thì xong vòng, gốc em tính ra khác gốc trong sổ nên lộ lá giả', () => {
    const s = createClimbGame(8);
    let last: ClimbEvent[] = [];
    for (let k = 0; k < s.tree.depth; k++) last = jumpOnto(s, s.choices.findIndex((c) => c.correct));
    expect(s.level).toBe(s.tree.depth);
    expect(s.phase).toBe('roundDone');
    expect(s.roundsDone).toBe(1);
    const done = last.find((e) => e.kind === 'roundDone');
    expect(done).toMatchObject({ mismatch: true, rootBook: s.tree.book[s.tree.depth][0], rootNow: s.tree.now[s.tree.depth][0] });
    expect(s.rootRevealed).toBe(true);
    expect(s.choices).toHaveLength(0);
  });

  it('nhảy vào bậc sai: bậc nứt 0,4 giây rồi biến mất HẲN, rơi về bậc vừa đứng, mất 1 tim; các bậc còn lại giữ nguyên chỗ (không đổi chỗ)', () => {
    const s = createClimbGame(5);
    const values = s.choices.map((c) => c.value).sort();
    const wrong = s.choices.findIndex((c) => !c.correct);
    const slotsBefore = s.choices.map((c) => c.slot);
    jumpOnto(s, wrong);
    expect(s.hearts).toBe(2);
    expect(s.mistakes).toBe(1);
    expect(s.level).toBe(0);
    expect(s.mode).toBe('free');
    expect(s.player.y).toBe(tierY(0));
    expect(s.choices.map((c) => c.value).sort()).toEqual(values);
    // giữ nguyên chỗ: không đổi chỗ khi làm lại tầng
    expect(s.choices.map((c) => c.slot)).toEqual(slotsBefore);
    // bậc sai biến mất hẳn (crack 0), bậc đúng còn nguyên
    expect(s.choices[wrong].crack).toBe(0);
    expect(s.choices.filter((c) => c.correct).every((c) => c.crack === null)).toBe(true);
  });

  it('chuỗi sự kiện khi nhầm: wrong → (0,4 giây) vanish → rơi → retry; đứng yên trên bậc nứt đúng 0,4 giây', () => {
    const s = createClimbGame(5);
    const wrong = s.choices.findIndex((c) => !c.correct);
    s.player.x = choiceX(s, s.choices[wrong]);
    jump(s);
    const ev: ClimbEvent[] = [];
    let wrongAt = -1;
    let vanishAt = -1;
    for (let i = 0; i < 400; i++) {
      const e = stepClimb(s, 1 / 120);
      ev.push(...e);
      if (e.some((x) => x.kind === 'wrong')) wrongAt = i;
      if (e.some((x) => x.kind === 'vanish')) vanishAt = i;
    }
    expect(kinds(ev)).toEqual(['wrong', 'vanish', 'retry']);
    expect((vanishAt - wrongAt) / 120).toBeCloseTo(CLIMB_SPEC.crackSeconds, 1);
  });

  it('nhầm lần cuối (hết tim): rơi về xong thì thua, điểm theo số vòng đã xong', () => {
    const s = createClimbGame(5);
    s.hearts = 1;
    const ev = jumpOnto(s, s.choices.findIndex((c) => !c.correct));
    expect(kinds(ev)).toEqual(['wrong', 'vanish', 'lost']);
    expect(s.phase).toBe('lost');
    expect(s.hearts).toBe(0);
    expect(climbScore(s)).toBe(0);
  });

  it('nhảy hụt (không chạm bậc nào): về bậc cũ, không mất tim, khóa nhảy 0,6 giây', () => {
    const s = createClimbGame(5);
    s.player.x = 0; // giữa hai bậc lựa chọn (±2,1) và ngoài hai bậc đứng
    s.player.x = nodeX(s.tree, 0);
    expect(jump(s)).toBe(true);
    const ev = run(s, 1.5);
    expect(kinds(ev)).toEqual(['miss']);
    expect(s.hearts).toBe(3);
    expect(s.player.grounded).toBe(true);
    expect(s.level).toBe(0);
    const lockedAt = s.lockUntil;
    expect(lockedAt - (s.time - 1.5)).toBeGreaterThan(0);
    // đang khóa: không nhảy được
    s.time = lockedAt - 0.1;
    expect(jump(s)).toBe(false);
    s.time = lockedAt + 0.01;
    expect(jump(s)).toBe(true);
  });

  it('khóa sau nhảy hụt dài đúng 0,6 giây', () => {
    const s = createClimbGame(5);
    jump(s);
    let missTime = -1;
    for (let i = 0; i < 300 && missTime < 0; i++) if (stepClimb(s, 1 / 120).some((e) => e.kind === 'miss')) missTime = s.time;
    expect(s.lockUntil - missTime).toBeCloseTo(CLIMB_SPEC.missLock, 2);
  });

  it('bước ra khỏi mép bậc: rơi về bậc cũ, không mất tim, khóa nhảy 0,6 giây', () => {
    const s = createClimbGame(5);
    const x0 = s.player.x;
    setMove(s, x0 < 0 ? -1 : 1);
    const ev: ClimbEvent[] = [];
    while (!ev.some((e) => e.kind === 'fell')) ev.push(...stepClimb(s, 1 / 60));
    setMove(s, 0);
    ev.push(...run(s, 1));
    expect(kinds(ev)).toEqual(['fell']);
    expect(s.hearts).toBe(3);
    expect(s.player).toMatchObject({ y: 0, grounded: true });
    expect(Math.abs(s.player.x - x0)).toBeLessThan(0.1);
    expect(s.lockUntil - (s.time - 1)).toBeCloseTo(CLIMB_SPEC.missLock, 1);
  });

  it('giữ phím khi đang bay thì lái được trên không', () => {
    const s = createClimbGame(5);
    const x0 = s.player.x;
    jump(s);
    setMove(s, 1);
    run(s, 0.3);
    expect(s.player.grounded).toBe(false);
    expect(s.player.x - x0).toBeGreaterThan(1);
  });

  it('chỉ đáp xuống bậc khi đang rơi: bay lên xuyên qua bậc phía trên không bị chặn', () => {
    const s = createClimbGame(5);
    s.player.x = choiceX(s, s.choices[0]);
    jump(s);
    for (let i = 0; i < 40; i++) stepClimb(s, 1 / 120);
    expect(s.level).toBe(0);
    expect(s.hearts).toBe(3);
  });

  it('tạm dừng: không có gì đổi (đồng hồ, bậc trượt, người chơi) và không có sự kiện', () => {
    const s = createClimbGame(5);
    s.round = 1;
    jump(s);
    setMove(s, 1);
    run(s, 0.2);
    const snap = JSON.stringify({ t: s.time, c: s.slideClock, p: s.player, ch: s.choices });
    expect(tickClimb(s, 1, true)).toEqual([]);
    expect(JSON.stringify({ t: s.time, c: s.slideClock, p: s.player, ch: s.choices })).toBe(snap);
    tickClimb(s, 0.1, false);
    expect(s.time).toBeGreaterThan(JSON.parse(snap).t);
  });

  it('không phụ thuộc bước dt: cùng thao tác, dt 1/30 hay 1/144 cho cùng kết quả', () => {
    const play = (dt: number) => {
      const s = createClimbGame(5);
      s.player.x = choiceX(s, s.choices.find((c) => c.correct)!);
      jump(s);
      for (let t = 0; t < 1.2; t += dt) stepClimb(s, dt);
      return [s.level, s.hearts];
    };
    expect(play(1 / 30)).toEqual(play(1 / 144));
  });
});

describe('vòng, bậc trượt, điểm, mốc', () => {
  it('3 vòng: 8 lá 2 lựa chọn đứng yên; 8 lá 2 lựa chọn trượt; 16 lá 3 lựa chọn trượt nhanh hơn', () => {
    const [a, b, c] = CLIMB_SPEC.rounds;
    expect([a.leaves, a.choices, a.slide]).toEqual([8, 2, 0]);
    expect([b.leaves, b.choices]).toEqual([8, 2]);
    expect(b.slide).toBeGreaterThan(0);
    expect([c.leaves, c.choices]).toEqual([16, 3]);
    expect(c.slide).toBeGreaterThan(b.slide);
  });

  it('advanceRound: chỉ khi xong vòng; vòng sau có cây mới, giữ tim, về lại tầng lá', () => {
    const s = createClimbGame(2);
    expect(advanceRound(s)).toBe(false);
    for (let k = 0; k < s.tree.depth; k++) jumpOnto(s, s.choices.findIndex((c) => c.correct));
    s.hearts = 2;
    expect(advanceRound(s)).toBe(true);
    expect(s.round).toBe(1);
    expect(s.level).toBe(0);
    expect(s.hearts).toBe(2);
    expect(s.tree.depth).toBe(3);
    expect(s.phase).toBe('playing');
    for (let k = 0; k < s.tree.depth; k++) jumpOnto(s, s.choices.findIndex((c) => c.correct) );
  });

  it('vòng 2 và 3: bậc lựa chọn trượt qua lại theo đồng hồ; "Giảm chuyển động" thì chậm đi một nửa', () => {
    const fast = createClimbGame(4);
    fast.round = 2;
    const slow = createClimbGame(4);
    slow.round = 2;
    setSlow(slow, true);
    fast.player.move = 0;
    // giữ người chơi đứng yên: chỉ xem đồng hồ trượt
    run(fast, 1);
    run(slow, 1);
    expect(slow.slideClock).toBeCloseTo(fast.slideClock * CLIMB_SPEC.reducedSlideScale, 3);
    const c = fast.choices[0];
    const x0 = choiceX(fast, c);
    run(fast, 0.5);
    expect(choiceX(fast, c)).not.toBeCloseTo(x0, 3);
    expect(Math.abs(choiceX(fast, c) - choiceBaseX(fast.choices.length, c.slot))).toBeLessThanOrEqual(CLIMB_SPEC.slideAmplitude + 1e-9);
  });

  it('điểm = số vòng xong × 100 + tim còn × 50, tối đa 450', () => {
    expect(climbScore({ roundsDone: 3, hearts: 3 })).toBe(450);
    expect(CLIMB_MAX_SCORE).toBe(450);
    expect(climbScore({ roundsDone: 2, hearts: 0 })).toBe(200);
    expect(climbScore({ roundsDone: 3, hearts: 1 })).toBe(350);
    expect(climbScore({ roundsDone: 3, hearts: 2 })).toBe(400);
  });

  it('mốc theo nghĩa: Đồng 200 = xong 2 vòng; Bạc 350 = xong 3 vòng nhầm ≤ 2 lần; Vàng 450 = không nhầm lần nào', () => {
    expect(CLIMB_SPEC.medals).toEqual([200, 350, 450]);
    expect(climbMedal(climbScore({ roundsDone: 1, hearts: 0 }))).toBe(0);
    expect(climbMedal(climbScore({ roundsDone: 2, hearts: 0 }))).toBe(1);
    for (const mistakes of [1, 2]) expect(climbMedal(climbScore({ roundsDone: 3, hearts: 3 - mistakes }))).toBe(2);
    expect(climbMedal(climbScore({ roundsDone: 3, hearts: 3 }))).toBe(3);
  });

  it('cùng seed thì cùng cây, cùng lựa chọn', () => {
    const a = createClimbGame(77);
    const b = createClimbGame(77);
    expect(a.tree).toEqual(b.tree);
    expect(a.tiers).toEqual(b.tiers);
    expect(a.choices).toEqual(b.choices);
    expect(createClimbGame(78).tree).not.toEqual(a.tree);
  });
});

describe('cây mẫu của phần hướng dẫn', () => {
  it('4 lá [3,7,5,2], lá thứ hai bị tráo thành 8; không tính vào ván thật; xong thì thắng', () => {
    const s = createPracticeGame();
    expect(s.practice).toBe(true);
    expect(s.tree.leaves).toEqual([3, 7, 5, 2]);
    expect(s.tree.tamperedLeaves).toEqual([3, 8, 5, 2]);
    expect(s.tree.depth).toBe(2);
    expect(s.choices).toHaveLength(2);
    for (let k = 0; k < 2; k++) jumpOnto(s, s.choices.findIndex((c) => c.correct));
    expect(s.phase).toBe('won');
    expect(s.roundsDone).toBe(0);
    expect(s.rootRevealed).toBe(true);
  });
});

describe('hồi quy: nhảy sai rồi nhảy đúng (mọi vòng)', () => {
  /** Vòng `round` của ván seed 5: tới vòng đó bằng cách leo đúng các vòng trước (bậc đứng yên ở vòng 1, trượt ở vòng 2, 3 nên ép về đứng yên để dựng đúng x). */
  function atRound(round: number): ClimbState {
    const s = createClimbGame(5);
    for (let r = 0; r < round; r++) {
      s.tree = s.tree;
      while (s.phase === 'playing') {
        const ci = s.choices.findIndex((c) => c.correct);
        s.slideClock = 0;
        jumpOnto(s, ci);
      }
      expect(s.phase).toBe('roundDone');
      advanceRound(s);
    }
    expect(s.round).toBe(round);
    return s;
  }
  const wrongThenUp = (s: ClimbState, wrongs: number): void => {
    const slotsKeep = s.choices.map((c) => c.slot);
    for (let k = 0; k < wrongs; k++) {
      s.slideClock = 0;
      const wi = s.choices.findIndex((c) => !c.correct && c.crack === null);
      const ev = kinds(jumpOnto(s, wi));
      expect(ev).toContain('wrong');
      expect(ev).toContain('retry');
      expect(s.mode).toBe('free');
      expect(s.level).toBe(0);
      // mọi bậc sai đã nhảy trúng biến mất hẳn; bậc còn lại (kể cả bậc đúng) vẫn nguyên và không đổi chỗ
      expect(s.choices.filter((c) => !c.correct && c.crack === 0).length).toBe(k + 1);
      expect(s.choices.filter((c) => c.correct).every((c) => c.crack === null)).toBe(true);
      expect(s.choices.map((c) => c.slot)).toEqual(slotsKeep);
    }
    const level = s.level;
    s.slideClock = 0;
    const ci = s.choices.findIndex((c) => c.correct);
    const ev = kinds(jumpOnto(s, ci));
    expect(ev).toContain('up');
    expect(ev).not.toContain('wrong');
    expect(s.level).toBe(level + 1);
  };

  for (const round of [0, 1, 2]) {
    it(`vòng ${round + 1}: sai 1 lần rồi nhảy đúng thì lên tầng`, () => wrongThenUp(atRound(round), 1));
    // vòng 1, 2 chỉ có 2 bậc nên chỉ sai được 1 lần (bậc sai biến mất, còn đúng bậc đúng); vòng 3 có 3 bậc nên sai được 2 lần
    if (round === 2) it(`vòng ${round + 1}: sai 2 lần rồi nhảy đúng thì lên tầng`, () => wrongThenUp(atRound(round), 2));
    it(`vòng ${round + 1}: sai ở mọi tầng, mỗi tầng sau đó nhảy đúng đều lên được tới gốc`, () => {
      const s = atRound(round);
      let guard = 0;
      while (s.phase === 'playing' && s.hearts > 0 && guard++ < 40) {
        const before = s.level;
        s.slideClock = 0;
        const wi = s.choices.findIndex((c) => !c.correct && c.crack === null);
        if (s.hearts > 1 && wi >= 0) jumpOnto(s, wi);
        s.slideClock = 0;
        const ev = kinds(jumpOnto(s, s.choices.findIndex((c) => c.correct)));
        expect(ev).toContain('up');
        expect(s.level).toBe(before + 1);
      }
      expect(['roundDone', 'won']).toContain(s.phase);
    });
  }
});

describe('bậc nứt mờ dần theo đồng hồ nứt', () => {
  it('crack của bậc sai giảm từ crackSeconds về 0 cùng crackLeft, rồi bậc biến mất và rơi', () => {
    const s = createClimbGame(5);
    jumpOnto(s, s.choices.findIndex((c) => !c.correct));
    // jumpOnto chạy 2,6 giây: đã nứt, biến mất, rơi và làm lại tầng. Làm lại từ đầu để quan sát giữa chừng.
    const t = createClimbGame(5);
    const wi = t.choices.findIndex((c) => !c.correct);
    t.player.x = choiceX(t, t.choices[wi]);
    t.player.on = 0;
    expect(jump(t)).toBe(true);
    let guard = 0;
    while (t.mode !== 'crack' && guard++ < 600) stepClimb(t, 1 / 120);
    expect(t.mode).toBe('crack');
    const bad = t.choices[wi];
    expect(bad.crack).toBeCloseTo(CLIMB_SPEC.crackSeconds, 5);
    run(t, 0.2);
    expect(bad.crack).toBeGreaterThan(0);
    expect(bad.crack).toBeLessThan(CLIMB_SPEC.crackSeconds);
    expect(bad.crack).toBeCloseTo(t.crackLeft, 5);
    run(t, 0.25);
    expect(['fall', 'free']).toContain(t.mode);
    if (t.mode === 'fall') expect(bad.crack).toBe(0);
  });
});

describe('luật mới: bậc sai biến mất hẳn tới hết tầng, bậc còn lại giữ chỗ', () => {
  function atRound3(): ClimbState {
    const s = createClimbGame(5);
    for (let r = 0; r < 2; r++) {
      while (s.phase === 'playing') {
        s.slideClock = 0;
        jumpOnto(s, s.choices.findIndex((c) => c.correct));
      }
      advanceRound(s);
    }
    expect(s.round).toBe(2);
    expect(s.choices.length).toBe(3);
    return s;
  }

  it('vòng 3: sai 2 lần thì chỉ còn đúng bậc đúng, các bậc đã mất không còn bị chạm, vị trí và pha trượt không đổi', () => {
    const s = atRound3();
    s.hearts = 3;
    const keep = s.choices.map((c) => ({ slot: c.slot, phase: c.phase, value: c.value }));
    for (let k = 0; k < 2; k++) {
      s.slideClock = 0;
      const wi = s.choices.findIndex((c) => !c.correct && c.crack === null);
      expect(wi).toBeGreaterThanOrEqual(0);
      expect(kinds(jumpOnto(s, wi))).toContain('wrong');
      expect(s.mode).toBe('free');
    }
    expect(s.hearts).toBe(1);
    expect(s.choices.map((c) => ({ slot: c.slot, phase: c.phase, value: c.value }))).toEqual(keep);
    expect(s.choices.filter((c) => c.crack === null).length).toBe(1);
    expect(s.choices.find((c) => c.crack === null)!.correct).toBe(true);
    // nhảy lên đúng chỗ bậc đã biến mất: không đáp được (không thêm lỗi, không mất tim), rơi về như nhảy hụt
    s.slideClock = 0;
    const gone = s.choices.findIndex((c) => c.crack === 0);
    const ev = kinds(jumpOnto(s, gone));
    expect(ev).not.toContain('wrong');
    expect(ev).not.toContain('up');
    expect(s.hearts).toBe(1);
    expect(s.mistakes).toBe(2);
    // bậc còn lại là bậc đúng: nhảy lên thì lên tầng
    s.slideClock = 0;
    const left = s.choices.findIndex((c) => c.crack === null);
    s.player.grounded = true;
    s.lockUntil = 0;
    expect(kinds(jumpOnto(s, left))).toContain('up');
    expect(s.level).toBe(1);
    // tầng mới: các bậc tạo lại đủ, không bậc nào biến mất
    expect(s.choices.length).toBe(3);
    expect(s.choices.every((c) => c.crack === null)).toBe(true);
  });

  it('vòng 2 (hai bậc, trượt): sai một lần thì còn bậc đúng đứng nguyên chỗ gốc, vẫn trượt như cũ', () => {
    const s = createClimbGame(7);
    while (s.phase === 'playing') {
      s.slideClock = 0;
      jumpOnto(s, s.choices.findIndex((c) => c.correct));
    }
    advanceRound(s);
    expect(s.round).toBe(1);
    s.slideClock = 0;
    const survivor = s.choices.findIndex((c) => c.correct);
    const before = { slot: s.choices[survivor].slot, phase: s.choices[survivor].phase };
    const wi = s.choices.findIndex((c) => !c.correct);
    jumpOnto(s, wi);
    expect(s.choices[wi].crack).toBe(0);
    expect({ slot: s.choices[survivor].slot, phase: s.choices[survivor].phase }).toEqual(before);
    // vẫn trượt: độ lệch đổi theo đồng hồ
    const x0 = choiceX(s, s.choices[survivor]);
    s.slideClock += 0.5;
    expect(choiceX(s, s.choices[survivor])).not.toBeCloseTo(x0, 3);
  });
});
