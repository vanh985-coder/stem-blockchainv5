import { describe, expect, it } from 'vitest';
import { HUONG_DAN_GAME, fmt, hintText } from '@so-chung/core';
import { createMulberry32 } from '@so-chung/core/lib/rng';
import { createClimbGame, jump, stepClimb, tickClimb, advanceRound, type ClimbState } from './climbLogic';
import { LOOK_SECONDS, hintFor } from './climbHint';

const h = HUONG_DAN_GAME[12].nhac;
const say = (s: Parameters<typeof hintFor>[0]) => fmt(hintText(12, hintFor(s)));
const ALLOWED = new Set<string>(Object.values(h));

/** Ván ở trạng thái ngẫu nhiên: bật bừa vài lần ở giờ ngẫu nhiên, đôi khi sang vòng khác. */
function randomState(seed: number): ClimbState {
  const rng = createMulberry32(seed * 104729 + 3);
  const s = createClimbGame(seed);
  const steps = Math.floor(rng() * 160);
  for (let i = 0; i < steps && s.phase !== 'lost'; i++) {
    if (s.phase === 'roundDone') {
      if (rng() < 0.5) advanceRound(s);
      else break;
    }
    if (rng() < 0.08) jump(s);
    stepClimb(s, 0.05 + rng() * 0.3);
  }
  return s;
}

describe('màn 12: câu nhắc của nút "?" (hintFor)', () => {
  it('đúng câu theo trạng thái: mới lên tầng thì so Sổ và Nay, sau đó canh giờ, còn một tim, tầng lá', () => {
    const s = createClimbGame(1);
    expect(hintFor(s)).toEqual(['soSanh']);
    expect(say(s)).toBe('So Sổ và Nay trên 2 đèn lồng phía trên, chọn cái có hai số khác nhau.');
    s.time = s.arrivedAt + LOOK_SECONDS + 0.1;
    expect(hintFor(s)).toEqual(['canGio']);
    expect(say(s)).toBe('Chờ đèn lồng đó tới ngay trên đầu rồi chạm (máy tính: Space).');
    s.hearts = 1;
    expect(hintFor(s)).toEqual(['motTim']);
    expect(hintText(12, hintFor(s))).toBe(h.motTim);
    s.level = s.tree.depth - 1; // tầng ngay dưới lá: cặp đèn lồng phía trên là hai chiếc lá
    expect(hintFor(s)).toEqual(['tangLa']);
    expect(say(s)).toBe('Đây là tầng lá: nắm chiếc lá bị tráo để bắt Tí!');
    s.phase = 'roundDone';
    expect(hintFor(s)).toEqual(['xongVong']);
    s.phase = 'lost';
    expect(hintFor(s)).toEqual(['hetVan']);
  });

  it('200 trạng thái ngẫu nhiên: câu nhắc luôn thuộc danh sách có sẵn, không có số nào, không nói đèn lồng trái hay phải, tầng hay số của đáp án', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const s = randomState(seed);
      const text = hintText(12, hintFor(s));
      expect(ALLOWED.has(text), `seed ${seed}: ${text}`).toBe(true);
      for (const k of hintFor(s)) expect(Object.keys(h), `seed ${seed}`).toContain(k);
      expect(text, `seed ${seed}`).not.toMatch(/\d{2,}/);
      expect(text, `seed ${seed}`).not.toMatch(/bên trái|bên phải|tay nắm|trái|phải/);
      // chỉ tầng lá mới nói tầng lá
      expect(text === h.tangLa, `seed ${seed}`).toBe(s.phase === 'playing' && s.level + 1 >= s.tree.depth);
    }
  });

  it('mọi câu nhắc của màn 12 không có số của đáp án (chỉ số chỉ số đèn lồng của luật: "2 đèn lồng")', () => {
    for (const text of ALLOWED) for (const n of text.match(/\d+/g) ?? []) expect(n).toBe('2');
  });
});

describe('màn 12: tạm dừng thật', () => {
  it('tickClimb khi tạm dừng: không có gì đổi qua nhiều bước dt (đồng hồ của vòng, tay nắm, cú bật đang bay)', () => {
    const s = createClimbGame(11);
    s.time = 3.2;
    expect(jump(s)).toBe(true);
    const before = JSON.stringify({ ...s, rng: undefined });
    for (let i = 0; i < 500; i++) expect(tickClimb(s, 0.05, true)).toEqual([]);
    expect(JSON.stringify({ ...s, rng: undefined })).toBe(before);
    expect(s.time).toBe(3.2);
    expect(s.peakAt).not.toBeNull();
    // không tạm dừng thì đồng hồ chạy và cú bật được xét
    tickClimb(s, 1, false);
    expect(s.time).toBeCloseTo(4.2, 6);
    expect(s.peakAt).toBeNull();
  });
});
