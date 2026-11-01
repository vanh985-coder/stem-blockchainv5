import { describe, expect, it } from 'vitest';
import { HUONG_DAN_GAME, fmt, hintText } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { CLIMB_SPEC } from './climbConfig';
import { advanceRound, createClimbGame, jump, setMove, stepClimb, tickClimb, type ClimbState } from './climbLogic';
import { hintFor } from './climbHint';

const h = HUONG_DAN_GAME[12].nhac;
const say = (s: Parameters<typeof hintFor>[0]) => fmt(hintText(12, hintFor(s)));
const ALLOWED = new Set<string>(Object.values(h));

/** Ván ở trạng thái ngẫu nhiên: đi và nhảy bừa, đôi khi sang vòng khác. */
function randomState(seed: number): ClimbState {
  const rng = createMulberry32(seed * 104729 + 3);
  const s = createClimbGame(seed);
  const steps = Math.floor(rng() * 400);
  for (let i = 0; i < steps && s.phase !== 'lost'; i++) {
    if (s.phase === 'roundDone') {
      if (rng() < 0.5) advanceRound(s);
      else break;
    }
    if (rng() < 0.05) jump(s);
    if (rng() < 0.1) setMove(s, ([-1, 0, 1] as const)[Math.floor(rng() * 3)]);
    stepClimb(s, 0.02 + rng() * 0.1);
  }
  return s;
}

describe('màn 12: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: so phép ghép, lái trên không, làm lại, còn một tim, tầng cuối, xong vòng, hết ván', () => {
    const s = createClimbGame(1);
    expect(hintFor(s)).toEqual(['soSanh']);
    expect(say(s)).toBe(fmt(h.soSanh));
    jump(s);
    stepClimb(s, 0.1);
    expect(hintFor(s)).toEqual(['laiTrenKhong']);
    s.player.grounded = true;
    s.mode = 'crack';
    expect(hintFor(s)).toEqual(['lamLai']);
    s.mode = 'free';
    s.hearts = 1;
    expect(hintFor(s)).toEqual(['motTim']);
    s.hearts = 3;
    s.level = s.tree.depth - 1; // tầng ngay dưới gốc: các bậc lựa chọn phía trên là gốc
    expect(hintFor(s)).toEqual(['tangGoc']);
    s.phase = 'roundDone';
    expect(hintFor(s)).toEqual(['xongVong']);
    s.phase = 'lost';
    expect(hintFor(s)).toEqual(['hetVan']);
  });

  it('200 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, không có số nào của đáp án, không chỉ bậc nào', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomState(seed);
      const text = hintText(12, hintFor(s));
      expect(ALLOWED.has(text), `seed ${seed}: ${text}`).toBe(true);
      for (const k of hintFor(s)) expect(Object.keys(h), `seed ${seed}`).toContain(k);
      for (const v of s.choices.map((c) => String(c.value))) expect(text.replace('nhân 10', ''), `seed ${seed}`).not.toContain(v);
      expect(text, `seed ${seed}`).not.toMatch(/bậc (bên )?(trái|phải|giữa)/);
    }
  });

  it('mọi câu nhắc của màn 12 không chứa con số nào của đáp án (chỉ có số của luật, như 10)', () => {
    for (const text of ALLOWED) for (const n of text.match(/\d+/g) ?? []) expect(['10']).toContain(n);
  });
});

describe('màn 12: tạm dừng thật', () => {
  it('tickClimb khi tạm dừng: không có gì đổi qua nhiều bước dt (đồng hồ, bậc trượt, người chơi đang bay)', () => {
    const s = createClimbGame(11);
    s.round = 2;
    s.time = 3.2;
    expect(jump(s)).toBe(true);
    stepClimb(s, 0.1);
    const before = JSON.stringify({ ...s, rng: undefined });
    for (let i = 0; i < 500; i++) expect(tickClimb(s, 0.05, true)).toEqual([]);
    expect(JSON.stringify({ ...s, rng: undefined })).toBe(before);
    // không tạm dừng thì đồng hồ chạy
    tickClimb(s, 1, false);
    expect(s.time).toBeCloseTo(4.3, 6);
    expect(s.slideClock).toBeGreaterThan(CLIMB_SPEC.reducedSlideScale * 0.1);
  });
});
